import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Empty, Spinner } from "./ui";

interface Props {
  // "staff" means admin or super admin. "super" means super admin only.
  need?: "staff" | "super" | "owner";
}

export function RequireAuth({ need }: Props) {
  const { user, loading, isStaff, isSuperAdmin, has } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  const allowed = need === "staff" ? isStaff : need === "super" ? isSuperAdmin : true;
  // Owner pages are open to anyone signed in: a user becomes an owner by submitting a property.
  if (need === "owner" && !(has("owner") || has("user"))) return <Navigate to="/" replace />;

  if (!allowed) {
    return (
      <div className="container page">
        <Empty title="You do not have access to this page">Ask a super admin if you think this is a mistake.</Empty>
      </div>
    );
  }
  return <Outlet />;
}
