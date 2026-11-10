import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { resolveLink } from "../components/Layout";
import { useToast } from "../components/Toast";
import { Empty, PageHeader, Pagination, Spinner, Tabs } from "../components/ui";
import { timeAgo } from "../lib/format";
import { usePageTitle } from "../lib/hooks";
import type { NotificationItem, Page } from "../lib/types";

export default function Notifications() {
  usePageTitle("Notifications");
  const { isStaff } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);

  const list = useQuery({
    queryKey: ["notifications", "page", filter, page],
    queryFn: () => api.get<Page<NotificationItem> & { unreadCount: number }>("/notifications", { page, pageSize: 15, unread: filter === "unread" ? "true" : undefined }),
    placeholderData: (previous) => previous,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
  const readAll = useMutation({ mutationFn: () => api.post("/notifications/read-all"), onSuccess: refresh, onError: toast.error });
  const readOne = useMutation({ mutationFn: (id: string) => api.patch(`/notifications/${id}/read`), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/notifications/${id}`), onSuccess: refresh, onError: toast.error });

  return (
    <div className="container page">
      <PageHeader
        eyebrow="Account"
        title="Notifications"
        subtitle={list.data ? `${list.data.unreadCount} unread` : undefined}
        actions={<button type="button" className="btn btn--ghost btn--sm" disabled={!list.data?.unreadCount || readAll.isPending} onClick={() => readAll.mutate()}>Mark all as read</button>}
      />
      <div className="stack">
        <Tabs tabs={[{ id: "all", label: "All" }, { id: "unread", label: "Unread" }]} value={filter} onChange={(id) => { setFilter(id); setPage(1); }} />
        {list.isLoading && <Spinner />}
        {list.data && list.data.items.length === 0 && <Empty title={filter === "unread" ? "You are all caught up" : "No notifications yet"}>Updates about your properties, rentals and account will appear here.</Empty>}
        {list.data && list.data.items.length > 0 && (
          <div className="panel panel--flush">
            {list.data.items.map((item) => {
              const target = resolveLink(item.link, isStaff);
              return (
                <div key={item.id} className={`notif${item.read ? " read" : ""}`}>
                  <span className="dot" aria-label={item.read ? "Read" : "Unread"} />
                  <div>
                    <b>{item.title}</b>
                    <p>{item.message}</p>
                    <div className="small muted">{timeAgo(item.createdAt)}</div>
                  </div>
                  <div className="row">
                    {target && (
                      <button type="button" className="link small" onClick={() => { if (!item.read) readOne.mutate(item.id); navigate(target); }}>Open</button>
                    )}
                    {!item.read && <button type="button" className="link small" onClick={() => readOne.mutate(item.id)}>Mark read</button>}
                    <button type="button" className="link link--danger small" onClick={() => remove.mutate(item.id)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onPage={setPage} />}
      </div>
    </div>
  );
}
