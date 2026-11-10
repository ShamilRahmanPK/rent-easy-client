import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import { Empty, PageHeader, Spinner, StatusTag } from "../components/ui";
import { formatDate, formatMoney } from "../lib/format";
import { useCurrency } from "../lib/currency";
import { usePageTitle } from "../lib/hooks";
import type { Page, RentRequest, Tenancy } from "../lib/types";

export default function MyRentals() {
  usePageTitle("My rentals");
  const { user } = useAuth();
  const currency = useCurrency();
  const toast = useToast();
  const queryClient = useQueryClient();

  const tenancies = useQuery({ queryKey: ["tenancies", "mine"], queryFn: () => api.get<Page<Tenancy>>("/tenancies", { pageSize: 50 }) });
  const requests = useQuery({ queryKey: ["rent-requests", "mine"], queryFn: () => api.get<Page<RentRequest>>("/rent-requests", { pageSize: 50 }) });

  const cancel = useMutation({
    mutationFn: (id: string) => api.post(`/rent-requests/${id}/cancel`),
    onSuccess: () => {
      toast.success("Request cancelled");
      queryClient.invalidateQueries({ queryKey: ["rent-requests"] });
    },
    onError: toast.error,
  });

  // The server also lists tenancies of the properties a person owns; keep only the ones where they are the tenant.
  const mine = tenancies.data?.items.filter((item) => !item.tenant || item.tenant.id === user?.id) ?? [];
  const myRequests = requests.data?.items.filter((item) => !item.requester || item.requester.id === user?.id) ?? [];

  return (
    <div className="container page">
      <PageHeader eyebrow="Account" title="My rentals" subtitle="Homes you rent and the requests you have sent." />
      <div className="stack stack--lg">
        <section className="stack">
          <h2 style={{ fontSize: 24 }}>My tenancies</h2>
          {tenancies.isLoading && <Spinner />}
          {tenancies.data && mine.length === 0 && <Empty title="You are not renting a home yet"><p>Browse residences and send a request.</p><p style={{ marginTop: 14 }}><Link className="btn" to="/homes">Browse homes</Link></p></Empty>}
          {mine.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Home</th><th>Started</th><th>Ended</th><th>Status</th></tr></thead>
                <tbody>
                  {mine.map((item) => (
                    <tr key={item.id}>
                      <td><span className="title">{item.property.name}</span><br /><span className="muted small">Unit {item.unit.unitNumber}</span></td>
                      <td>{formatDate(item.startDate)}</td>
                      <td>{formatDate(item.endDate)}</td>
                      <td><StatusTag value={item.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="stack">
          <h2 style={{ fontSize: 24 }}>My requests</h2>
          {requests.isLoading && <Spinner />}
          {requests.data && myRequests.length === 0 && <Empty title="No requests yet">Open a residence and choose "Request to rent".</Empty>}
          {myRequests.length > 0 && (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Home</th><th>Rent</th><th>Sent</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {myRequests.map((item) => (
                    <tr key={item.id}>
                      <td><span className="title">{item.property.name}</span><br /><span className="muted small">Unit {item.unit.unitNumber}</span></td>
                      <td className="nowrap">{formatMoney(item.unit.monthlyRent, currency)}</td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td><StatusTag value={item.status} />{item.decisionNote && <div className="muted small" style={{ marginTop: 4 }}>{item.decisionNote}</div>}</td>
                      <td className="right">{item.status === "Pending" && <button type="button" className="link link--danger small" disabled={cancel.isPending} onClick={() => cancel.mutate(item.id)}>Cancel request</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
