import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Empty, PageHeader, Spinner } from "../../components/ui";
import { formatDate, timeAgo } from "../../lib/format";
import { usePageTitle } from "../../lib/hooks";
import type { AuditEntry, Page, Property, RentRequest, Tenancy, User } from "../../lib/types";

const ACTION_TEXT: Record<string, string> = {
  "property.submit": "submitted a property",
  "property.approve": "approved a property",
  "property.reject": "rejected a property",
  "property.create": "created a property",
  "rent_request.create": "sent a rent request",
  "rent_request.approve": "approved a rent request",
  "rent_request.reject": "rejected a rent request",
  "tenancy.create": "linked a tenant",
  "tenancy.end": "ended a tenancy",
  "user.register": "registered",
  "user.change_status": "changed an account status",
  "user.grant_role": "added a role",
  "user.revoke_role": "removed a role",
  "user.update_profile": "updated their profile",
  "user.upload_id_document": "uploaded an ID document",
  "user.password_change": "changed their password",
  "user.password_reset": "reset their password",
  "user.create_staff": "added an admin",
  "property.update": "edited a property",
  "property.listing": "changed a listing",
  "property.archive": "archived a property",
  "property.add_photos": "added property photos",
  "property.add_documents": "uploaded property documents",
  "unit.create": "added a unit",
  "unit.update": "edited a unit",
  "unit.status": "changed a unit's status",
  "unit.delete": "deleted a unit",
  "unit.add_photos": "added unit photos",
  "file.delete": "removed a file",
  "file.set_cover": "chose a cover photo",
  "announcement.send": "sent an announcement",
};

const describe = (action: string) => ACTION_TEXT[action] ?? action.replace(/[._]/g, " ");

export default function ReviewDesk() {
  usePageTitle("Review desk");

  const pending = useQuery({ queryKey: ["admin", "queue"], queryFn: () => api.get<Page<Property>>("/properties", { queue: "pending", pageSize: 8 }) });
  const requests = useQuery({ queryKey: ["admin", "requests"], queryFn: () => api.get<Page<RentRequest>>("/rent-requests", { status: "Pending", pageSize: 1 }) });
  const tenancies = useQuery({ queryKey: ["admin", "tenancies"], queryFn: () => api.get<Page<Tenancy>>("/tenancies", { status: "Active", pageSize: 1 }) });
  const people = useQuery({ queryKey: ["admin", "people"], queryFn: () => api.get<Page<User>>("/users", { pageSize: 1 }) });
  const activity = useQuery({ queryKey: ["admin", "activity"], queryFn: () => api.get<Page<AuditEntry>>("/audit-logs", { pageSize: 8 }) });

  return (
    <div className="container page">
      <PageHeader eyebrow="Admin" title="Review desk" subtitle="Properties submitted by owners, oldest first." />
      <div className="stack stack--lg">
        <div className="stats">
          <div className="stat"><b>{pending.data?.total ?? "-"}</b><span>Waiting for review</span></div>
          <div className="stat"><b>{requests.data?.total ?? "-"}</b><span>Rent requests</span></div>
          <div className="stat"><b>{tenancies.data?.total ?? "-"}</b><span>Active tenancies</span></div>
          <div className="stat"><b>{people.data?.total ?? "-"}</b><span>People</span></div>
        </div>

        <div className="two-col">
          <section className="stack">
            <h2 style={{ fontSize: 24 }}>Waiting for review</h2>
            {pending.isLoading && <Spinner />}
            {pending.data?.items.length === 0 && <Empty title="Nothing is waiting">New submissions will appear here.</Empty>}
            {pending.data && pending.data.items.length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Property</th><th>Owner</th><th>Submitted</th><th></th></tr></thead>
                  <tbody>
                    {pending.data.items.map((property) => (
                      <tr key={property.id}>
                        <td><Link to={`/admin/properties/${property.id}`} className="title" style={{ textDecoration: "none" }}>{property.name}</Link><br /><span className="muted small">{property.address.city} · {property.photos.length} photos</span></td>
                        <td>{property.owner?.fullName}</td>
                        <td className="nowrap">{formatDate(property.submittedAt)}</td>
                        <td className="right"><Link className="btn btn--sm" to={`/admin/properties/${property.id}`}>Review</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {pending.data && pending.data.total > pending.data.items.length && <Link className="link small" to="/admin/properties?queue=pending">See all {pending.data.total} waiting</Link>}
          </section>

          <section className="stack">
            <h2 style={{ fontSize: 24 }}>Recent activity</h2>
            <div className="panel panel--flush">
              {activity.isLoading && <Spinner />}
              {activity.data?.items.map((entry) => (
                <div key={entry.id} className="notif" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
                  <div>
                    <b>{entry.actor?.fullName ?? "System"}</b> {describe(entry.action)}
                    <div className="muted small">{timeAgo(entry.createdAt)}</div>
                  </div>
                </div>
              ))}
              {activity.data?.items.length === 0 && <p className="muted" style={{ padding: 16 }}>No activity yet.</p>}
            </div>
            <Link className="link small" to="/admin/audit">Open the audit log</Link>
          </section>
        </div>
      </div>
    </div>
  );
}
