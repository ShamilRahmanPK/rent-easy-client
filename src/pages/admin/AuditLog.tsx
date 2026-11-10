import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Empty, PageHeader, Pagination, Spinner } from "../../components/ui";
import { formatDateTime } from "../../lib/format";
import { useDebounced, usePageTitle } from "../../lib/hooks";
import type { AuditEntry, Page } from "../../lib/types";

const ENTITIES = ["User", "Property", "Unit", "Tenancy", "RentRequest", "FileAsset", "Announcement", "SystemSetting", "EmailTemplate", "MailJob"];

export default function AuditLog() {
  usePageTitle("Audit log");
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const debouncedAction = useDebounced(action);

  const list = useQuery({
    queryKey: ["audit", { debouncedAction, entity, from, to, page }],
    queryFn: () => api.get<Page<AuditEntry>>("/audit-logs", { action: debouncedAction, entity, from: from ? `${from}T00:00:00Z` : undefined, to: to ? `${to}T23:59:59Z` : undefined, page, pageSize: 25 }),
    placeholderData: (previous) => previous,
  });

  return (
    <div className="container page">
      <PageHeader eyebrow="Admin" title="Audit log" subtitle="Who changed what, and when. Approvals, rejections, role changes, suspensions and settings are all recorded." />
      <div className="stack">
        <div className="row">
          <input className="input" aria-label="Action" placeholder="Action, for example property.approve" style={{ maxWidth: 280 }} value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} />
          <select className="select" aria-label="Record type" style={{ width: 180 }} value={entity} onChange={(event) => { setEntity(event.target.value); setPage(1); }}>
            <option value="">All record types</option>
            {ENTITIES.map((item) => <option key={item}>{item}</option>)}
          </select>
          <input className="input" type="date" aria-label="From date" style={{ width: 160 }} value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} />
          <input className="input" type="date" aria-label="To date" style={{ width: 160 }} value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
        </div>
        {list.isLoading && <Spinner />}
        {list.data && list.data.items.length === 0 && <Empty title="No entries match" />}
        {list.data && list.data.items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th><th></th></tr></thead>
              <tbody>
                {list.data.items.map((entry) => (
                  <Fragment key={entry.id}>
                    <tr>
                      <td className="nowrap small">{formatDateTime(entry.createdAt)}</td>
                      <td>{entry.actor?.fullName ?? <span className="muted">System</span>}<br /><span className="muted small">{entry.actor?.email}</span></td>
                      <td><span className="code">{entry.action}</span></td>
                      <td>{entry.entity}<br /><span className="muted small mono">{entry.entityId?.slice(0, 12)}</span></td>
                      <td className="right">{Boolean(entry.before || entry.after) && <button type="button" className="link small" onClick={() => setOpen(open === entry.id ? null : entry.id)}>{open === entry.id ? "Hide" : "Details"}</button>}</td>
                    </tr>
                    {open === entry.id && (
                      <tr>
                        <td colSpan={5}>
                          <div className="grid-2">
                            {entry.before != null && <div><div className="label">Before</div><pre className="jsonbox">{JSON.stringify(entry.before, null, 2)}</pre></div>}
                            {entry.after != null && <div><div className="label">After</div><pre className="jsonbox">{JSON.stringify(entry.after, null, 2)}</pre></div>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onPage={setPage} />}
      </div>
    </div>
  );
}
