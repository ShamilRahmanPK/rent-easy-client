import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useToast } from "../../components/Toast";
import { Empty, Field, PageHeader, Pagination, Spinner } from "../../components/ui";
import { formatDateTime } from "../../lib/format";
import { usePageTitle } from "../../lib/hooks";
import type { Page } from "../../lib/types";

interface Announcement {
  id: string;
  title: string;
  message: string;
  audience: string;
  recipientCount: number;
  createdAt: string;
  sentBy: { fullName: string };
}

const AUDIENCE: Record<string, string> = { all: "Everyone", owners: "Owners", tenants: "Tenants" };

export default function Announcements() {
  usePageTitle("Announcements");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: "", message: "", audience: "all" });
  const [page, setPage] = useState(1);

  const history = useQuery({ queryKey: ["announcements", page], queryFn: () => api.get<Page<Announcement>>("/announcements", { page, pageSize: 10 }), placeholderData: (previous) => previous });
  const send = useMutation({
    mutationFn: () => api.post<Announcement>("/announcements", form),
    onSuccess: (sent) => {
      toast.success(`Announcement sent to ${sent.recipientCount} ${sent.recipientCount === 1 ? "person" : "people"}`);
      setForm({ title: "", message: "", audience: "all" });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
    },
    onError: toast.error,
  });

  return (
    <div className="container page">
      <PageHeader eyebrow="Admin" title="Announcements" subtitle="Send a notice to everyone, only owners, or only tenants. It arrives in the app and by email." />
      <div className="two-col">
        <form className="panel stack" onSubmit={(event) => { event.preventDefault(); send.mutate(); }}>
          <h3>New announcement</h3>
          <Field label="Audience">
            {(id) => (
              <select id={id} className="select" value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })}>
                {Object.entries(AUDIENCE).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            )}
          </Field>
          <Field label="Title">{(id) => <input id={id} className="input" required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />}</Field>
          <Field label="Message" hint="Up to 2,000 characters">{(id) => <textarea id={id} className="textarea" required maxLength={2000} style={{ minHeight: 140 }} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />}</Field>
          <p className="muted small">People who turned off update emails still get the in-app notice. This cannot be undone once sent.</p>
          <div><button type="submit" className="btn" disabled={send.isPending || !form.title.trim() || !form.message.trim()}>{send.isPending ? "Sending…" : "Send announcement"}</button></div>
        </form>

        <section className="stack">
          <h3>Sent</h3>
          {history.isLoading && <Spinner />}
          {history.data?.items.length === 0 && <Empty title="Nothing sent yet" />}
          {history.data?.items.map((item) => (
            <div key={item.id} className="panel stack stack--sm">
              <div className="row row--between"><b>{item.title}</b><span className="tag tag--brand">{AUDIENCE[item.audience] ?? item.audience}</span></div>
              <p className="prewrap muted">{item.message}</p>
              <div className="small muted">{formatDateTime(item.createdAt)} · {item.sentBy.fullName} · {item.recipientCount} recipients</div>
            </div>
          ))}
          {history.data && <Pagination page={history.data.page} totalPages={history.data.totalPages} total={history.data.total} onPage={setPage} />}
        </section>
      </div>
    </div>
  );
}
