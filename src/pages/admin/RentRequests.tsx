import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useToast } from "../../components/Toast";
import { Empty, Field, Modal, PageHeader, Pagination, Spinner, StatusTag, Tabs } from "../../components/ui";
import { formatDate, formatMoney } from "../../lib/format";
import { useCurrency } from "../../lib/currency";
import { usePageTitle } from "../../lib/hooks";
import type { Page, RentRequest } from "../../lib/types";

export default function RentRequests() {
  usePageTitle("Rent requests");
  const toast = useToast();
  const currency = useCurrency();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("Pending");
  const [page, setPage] = useState(1);
  const [deciding, setDeciding] = useState<{ request: RentRequest; action: "approve" | "reject" } | null>(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const list = useQuery({
    queryKey: ["rent-requests", "admin", status, page],
    queryFn: () => api.get<Page<RentRequest>>("/rent-requests", { status: status === "all" ? undefined : status, page, pageSize: 15 }),
    placeholderData: (previous) => previous,
  });

  const decide = useMutation({
    mutationFn: () => api.post(`/rent-requests/${deciding!.request.id}/decision`, deciding!.action === "approve" ? { action: "approve", startDate } : { action: "reject", ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: () => {
      toast.success(deciding!.action === "approve" ? "Approved. The person is now a tenant of the unit." : "Request rejected");
      setDeciding(null);
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["rent-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["tenancies"] });
    },
    onError: toast.error,
  });

  return (
    <div className="container page">
      <PageHeader eyebrow="Admin" title="Rent requests" subtitle="People who asked to rent a unit. Approving links them as the tenant." />
      <div className="stack">
        <Tabs tabs={[{ id: "Pending", label: "Pending" }, { id: "Approved", label: "Approved" }, { id: "Rejected", label: "Rejected" }, { id: "all", label: "All" }]} value={status} onChange={(id) => { setStatus(id); setPage(1); }} />
        {list.isLoading && <Spinner />}
        {list.data && list.data.items.length === 0 && <Empty title="No requests here" />}
        {list.data && list.data.items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Person</th><th>Unit</th><th>Rent</th><th>Sent</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.data.items.map((item) => (
                  <tr key={item.id}>
                    <td><Link className="title" style={{ textDecoration: "none" }} to={`/admin/people/${item.requester?.id}`}>{item.requester?.fullName}</Link><br /><span className="muted small">{item.requester?.email}</span>{item.message && <div className="small prewrap" style={{ marginTop: 4, maxWidth: 320 }}>“{item.message}”</div>}</td>
                    <td>{item.property.name}<br /><span className="muted small">Unit {item.unit.unitNumber}</span></td>
                    <td className="nowrap">{formatMoney(item.unit.monthlyRent, currency)}</td>
                    <td className="nowrap">{formatDate(item.createdAt)}</td>
                    <td><StatusTag value={item.status} />{item.decisionNote && <div className="muted small">{item.decisionNote}</div>}</td>
                    <td className="right nowrap">
                      {item.status === "Pending" && (
                        <span className="row row--end">
                          <button type="button" className="btn btn--sm" onClick={() => setDeciding({ request: item, action: "approve" })}>Approve</button>
                          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDeciding({ request: item, action: "reject" })}>Reject</button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onPage={setPage} />}
      </div>

      {deciding && (
        <Modal title={deciding.action === "approve" ? "Approve this request" : "Reject this request"} onClose={() => setDeciding(null)}>
          <form className="stack" onSubmit={(event) => { event.preventDefault(); decide.mutate(); }}>
            <p>{deciding.request.requester?.fullName} · {deciding.request.property.name}, unit {deciding.request.unit.unitNumber}</p>
            {deciding.action === "approve" ? (
              <>
                <Field label="Tenancy starts on">{(id) => <input id={id} className="input" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />}</Field>
                <p className="muted small">The unit becomes occupied, the person gets the tenant role, and both the tenant and the owner are notified. Other pending requests for this unit are cancelled.</p>
              </>
            ) : (
              <Field label="Note to the person (optional)">{(id) => <textarea id={id} className="textarea" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />}</Field>
            )}
            <div className="row row--end">
              <button type="button" className="btn btn--ghost" onClick={() => setDeciding(null)}>Cancel</button>
              <button type="submit" className={`btn${deciding.action === "reject" ? " btn--danger" : ""}`} disabled={decide.isPending}>{decide.isPending ? "Working…" : deciding.action === "approve" ? "Approve and link tenant" : "Reject request"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
