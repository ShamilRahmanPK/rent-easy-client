import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { Alert, Empty, PageHeader, Pagination, Photo, Spinner, StatusTag } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { usePageTitle } from "../../lib/hooks";
import type { Page, Property } from "../../lib/types";

export function propertyState(property: Pick<Property, "approvalStatus" | "submittedAt" | "listingStatus">): { label: string; kind: string } {
  if (property.listingStatus === "Archived") return { label: "Archived", kind: "Archived" };
  if (property.approvalStatus === "Approved") return { label: property.listingStatus, kind: property.listingStatus };
  if (property.approvalStatus === "Rejected") return { label: "Needs changes", kind: "Rejected" };
  return property.submittedAt ? { label: "In review", kind: "Pending" } : { label: "Draft", kind: "Draft" };
}

export default function MyProperties() {
  usePageTitle("My properties");
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ["properties", "mine", page], queryFn: () => api.get<Page<Property>>("/properties", { page, pageSize: 10 }), placeholderData: (previous) => previous });

  return (
    <div className="container page">
      <PageHeader eyebrow="For owners" title="My properties" subtitle="List a property, add its units and follow its approval." actions={<Link to="/list" className="btn">List a property</Link>} />
      {list.isLoading && <Spinner />}
      {list.isError && <Alert>We could not load your properties.</Alert>}
      {list.data && list.data.items.length === 0 && (
        <Empty title="You have not listed a property yet">
          <p>Add the details, photos and ownership papers. An admin reviews every property before it goes live.</p>
          <p style={{ marginTop: 16 }}><Link to="/list" className="btn">List your first property</Link></p>
        </Empty>
      )}
      {list.data && list.data.items.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th style={{ width: 96 }}></th><th>Property</th><th>Status</th><th>Units</th><th>Added</th><th></th></tr></thead>
            <tbody>
              {list.data.items.map((property) => {
                const state = propertyState(property);
                return (
                  <tr key={property.id}>
                    <td><div style={{ width: 80, height: 56, overflow: "hidden" }}><Photo file={property.coverPhoto} alt="" thumb /></div></td>
                    <td><Link to={`/owner/properties/${property.id}`} className="title" style={{ textDecoration: "none" }}>{property.name}</Link><br /><span className="muted small">{property.code} · {property.address.city}</span></td>
                    <td><StatusTag value={state.kind} label={state.label} /></td>
                    <td>{property.totalUnits}</td>
                    <td>{formatDate(property.createdAt)}</td>
                    <td className="right nowrap"><span className="row row--end" style={{ gap: 14 }}>{(state.kind === "Draft" || state.kind === "Rejected") && <Link className="link small" to={`/list/${property.id}?step=${property.photos.length < 3 ? 2 : 3}`}>Continue listing</Link>}<Link className="link small" to={`/owner/properties/${property.id}`}>Manage</Link></span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onPage={setPage} />}
    </div>
  );
}
