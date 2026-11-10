import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useCurrency } from "../lib/currency";
import { useAuth } from "../auth/AuthContext";
import { initials, timeAgo } from "../lib/format";
import type { NotificationItem, Page, User } from "../lib/types";
import { useToast } from "./Toast";

export const BRAND = "RentEasy";

// Sign-in style pages are a single focused card, so they have no footer.
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

// Server notifications carry short paths. This turns them into real screens for the signed-in person.
export function resolveLink(link: string | null, isStaff: boolean): string | null {
  if (!link) return null;
  const property = /^\/properties\/([^/]+)$/.exec(link);
  if (property) return isStaff ? `/admin/properties/${property[1]}` : `/owner/properties/${property[1]}`;
  if (link.startsWith("/admin/rent-requests")) return "/admin/rent-requests";
  if (link.startsWith("/settings/notifications")) return "/account?tab=notifications";
  return link;
}

function useOutsideClose<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const handler = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) return event.key === "Escape" && onClose();
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [onClose]);
  return ref;
}

function NotificationBell() {
  const { isStaff } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(() => setOpen(false));

  // The bell count refreshes every 30 seconds.
  const count = useQuery({
    queryKey: ["notifications", "count"],
    queryFn: () => api.get<{ unreadCount: number }>("/notifications/unread-count"),
    refetchInterval: 30_000,
  });
  const list = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: () => api.get<Page<NotificationItem>>("/notifications", { pageSize: 8 }),
    enabled: open,
  });

  const refreshAll = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const readAll = useMutation({ mutationFn: () => api.post("/notifications/read-all"), onSuccess: refreshAll });
  const readOne = useMutation({ mutationFn: (id: string) => api.patch(`/notifications/${id}/read`), onSuccess: refreshAll });

  const unread = count.data?.unreadCount ?? 0;

  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="iconbtn" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && <span className="badge">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="menu">
          <div className="menu__head">
            <b>Notifications</b>
            <button type="button" className="link small" disabled={unread === 0} onClick={() => readAll.mutate()}>
              Mark all read
            </button>
          </div>
          <div className="menu__scroll">
            {list.isLoading && <p className="muted small" style={{ padding: 16 }}>Loading…</p>}
            {list.data?.items.length === 0 && <p className="muted" style={{ padding: 16 }}>You have no notifications yet.</p>}
            {list.data?.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`menu__item${item.read ? "" : " unread"}`}
                onClick={() => {
                  if (!item.read) readOne.mutate(item.id);
                  setOpen(false);
                  const target = resolveLink(item.link, isStaff);
                  if (target) navigate(target);
                }}
              >
                <b>{item.title}</b>
                <span className="muted small">{item.message}</span>
                <div className="muted small">{timeAgo(item.createdAt)}</div>
              </button>
            ))}
          </div>
          <Link to="/notifications" className="menu__item small" onClick={() => setOpen(false)} style={{ textAlign: "center" }}>
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

function AccountMenu({ user }: { user: User }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose<HTMLDivElement>(() => setOpen(false));

  return (
    <div className="menu-wrap" ref={ref}>
      <button type="button" className="avatar" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials(user.fullName)}
      </button>
      {open && (
        <div className="menu menu--narrow">
          <div className="menu__head" style={{ display: "block" }}>
            <b>{user.fullName}</b>
            <div className="muted small">ID {user.userId}</div>
          </div>
          <Link to="/account" className="menu__item" onClick={() => setOpen(false)}>My profile</Link>
          <Link to="/my-rentals" className="menu__item" onClick={() => setOpen(false)}>My rentals</Link>
          <Link to="/notifications" className="menu__item" onClick={() => setOpen(false)}>Notifications</Link>
          <button
            type="button"
            className="menu__item"
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate("/");
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function VerifyBanner({ user }: { user: User }) {
  const toast = useToast();
  const resend = useMutation({
    mutationFn: () => api.post("/auth/resend-verification"),
    onSuccess: () => toast.success("Verification email sent. Check your inbox."),
    onError: toast.error,
  });
  if (user.emailVerified) return null;
  return (
    <div className="banner" role="status">
      <div className="container row row--between">
        <span>Please verify your email address to list a property or request a home.</span>
        <button type="button" className="link" disabled={resend.isPending} onClick={() => resend.mutate()}>
          {resend.isPending ? "Sending…" : "Resend verification email"}
        </button>
      </div>
    </div>
  );
}

export function Layout() {
  const { user, isStaff } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <>
      <a href="#main" className="sr-only">Skip to content</a>
      <header className="mast">
        <div className="container mast__bar">
          <button type="button" className="iconbtn mast__menu" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <Link to="/" className="mast__brand">{BRAND}</Link>
          <nav className={`mast__nav${menuOpen ? " open" : ""}`} aria-label="Main">
            <NavLink to="/homes">Homes</NavLink>
            <NavLink to={user ? "/owner/properties" : "/list"}>For owners</NavLink>
            {user && <NavLink to="/my-rentals">My rentals</NavLink>}
            {isStaff && <NavLink to="/admin">Admin</NavLink>}
            <NavLink to="/list" className="mast__mobile-only">List your property</NavLink>
            {!user && <NavLink to="/register" className="mast__mobile-only">Create account</NavLink>}
          </nav>
          <div className="mast__tools">
            <Link to="/list" className="btn btn--sm hide-sm">List your property</Link>
            {user ? (
              <>
                <NotificationBell />
                <AccountMenu user={user} />
              </>
            ) : (
              <Link to="/login" className="link small">Sign in</Link>
            )}
          </div>
        </div>
      </header>
      {user && <VerifyBanner user={user} />}
      <main id="main">
        <Outlet />
      </main>
      {!AUTH_PATHS.some((path) => location.pathname.startsWith(path)) && <SiteFooter />}
    </>
  );
}

function SiteFooter() {
  const { user } = useAuth();
  const currency = useCurrency();
  const filters = useQuery({ queryKey: ["public", "filters"], queryFn: () => api.get<{ cityCounts: { city: string; count: number }[] }>("/public/filters"), staleTime: 5 * 60_000 });
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <div className="footer__brand">{BRAND}</div>
            <p>Homes to rent across the Philippines, checked by our team before they are listed. Prices are in {currency}.</p>
          </div>
          <div>
            <h4>Browse homes</h4>
            <ul>
              <li><Link to="/homes">All homes</Link></li>
              {filters.data?.cityCounts.slice(0, 4).map((row) => <li key={row.city}><Link to={`/homes?city=${encodeURIComponent(row.city)}`}>Homes in {row.city}</Link></li>)}
            </ul>
          </div>
          <div>
            <h4>For owners</h4>
            <ul>
              <li><Link to="/list">List your property</Link></li>
              <li><Link to={user ? "/owner/properties" : "/login"}>My properties</Link></li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              {user ? (
                <>
                  <li><Link to="/account">My profile</Link></li>
                  <li><Link to="/my-rentals">My rentals</Link></li>
                  <li><Link to="/notifications">Notifications</Link></li>
                </>
              ) : (
                <>
                  <li><Link to="/login">Sign in</Link></li>
                  <li><Link to="/register">Create account</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>
        <div className="footer__bottom">© {new Date().getFullYear()} {BRAND}. All prices are in {currency}.</div>
      </div>
    </footer>
  );
}

export function SubNav({ items }: { items: { to: string; label: string; end?: boolean; count?: number }[] }) {
  return (
    <div className="subnav">
      <div className="container" role="navigation" aria-label="Section">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            {item.label}
            {item.count ? <span className="count">{item.count}</span> : null}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export function AdminLayout() {
  const { isSuperAdmin } = useAuth();
  const queue = useQuery({
    queryKey: ["admin", "counts"],
    queryFn: async () => {
      const [pending, requests] = await Promise.all([
        api.get<Page<unknown>>("/properties", { queue: "pending", pageSize: 1 }),
        api.get<Page<unknown>>("/rent-requests", { status: "Pending", pageSize: 1 }),
      ]);
      return { pending: pending.total, requests: requests.total };
    },
    refetchInterval: 60_000,
  });

  return (
    <>
      <SubNav
        items={[
          { to: "/admin", label: "Review desk", end: true, count: queue.data?.pending },
          { to: "/admin/properties", label: "Properties" },
          { to: "/admin/rent-requests", label: "Rent requests", count: queue.data?.requests },
          { to: "/admin/tenancies", label: "Tenancies" },
          { to: "/admin/people", label: "People" },
          { to: "/admin/announcements", label: "Announcements" },
          { to: "/admin/audit", label: "Audit log" },
          ...(isSuperAdmin ? [{ to: "/admin/settings", label: "Settings" }] : []),
        ]}
      />
      <Outlet />
    </>
  );
}

export function OwnerLayout() {
  return (
    <>
      <SubNav
        items={[
          { to: "/owner/properties", label: "My properties", end: true },
          { to: "/list", label: "List a property" },
        ]}
      />
      <Outlet />
    </>
  );
}
