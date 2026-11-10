import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../api/client";
import { Empty, PageHeader, Pagination, Photo, Spinner, StatusTag } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { useDebounced, usePageTitle } from "../../lib/hooks";
import type { Page, Property } from "../../lib/types";
import { propertyState } from "../owner/MyProperties";

export default function AdminProperties() {
  usePageTitle("Properties");
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const q = useDebounced(search);
  const [page, setPage] = useState(1);
  const queue = params.get("queue") ?? "";
  const approval = params.get("approval") ?? "";
  const listing = params.get("listing") ?? "";

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  };

  const list = useQuery({
    queryKey: ["properties", "admin", { q, queue, approval, listing, page }],
    queryFn: () => api.get<Page<Property>>("/properties", { q, queue, approval, listing, page, pageSize: 15 }),
    placeholderData: (previous) => previous,
  });

  return (
    <div className="container page">
      <PageHeader eyebrow="Admin" title="Properties" subtitle="Every property on the platform." />
      <div className="stack">
        <div className="row">
          <div className="field grow" style={{ minWidth: 220 }}>
            <label htmlFor="p-search" className="sr-only">Search</label>
            <input id="p-search" className="input" placeholder="Search by name, city or street" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <select className="select" aria-label="Show" style={{ width: 200 }} value={queue ? "pending" : approval} onChange={(event) => { const v = event.target.value; const next = new URLSearchParams(params); next.delete("queue"); next.delete("approval"); if (v === "pending") next.set("queue", "pending"); else if (v) next.set("approval", v); setParams(next, { replace: true }); setPage(1); }}>
            <option value="">All approval states</option>
            <option value="pending">Waiting for review</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select className="select" aria-label="Listing" style={{ width: 170 }} value={listing} onChange={(event) => set("listing", event.target.value)}>
            <option value="">Any listing</option>
            <option value="Listed">Listed</option>
            <option value="Hidden">Hidden</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        {list.isLoading && <Spinner />}
        {list.data && list.data.items.length === 0 && <Empty title="No properties match" />}
        {list.data && list.data.items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th style={{ width: 90 }}></th><th>Property</th><th>Owner</th><th>Status</th><th>Units</th><th>Submitted</th><th></th></tr></thead>
              <tbody>
                {list.data.items.map((property) => {
                  const state = propertyState(property);
                  return (
                    <tr key={property.id}>
                      <td><div style={{ width: 72, height: 50, overflow: "hidden" }}><Photo file={property.coverPhoto} alt="" thumb /></div></td>
                      <td><Link to={`/admin/properties/${property.id}`} className="title" style={{ textDecoration: "none" }}>{property.name}</Link><br /><span className="muted small">{property.code} · {property.address.city}</span></td>
                      <td>{property.owner?.fullName}<br /><span className="muted small">{property.owner?.userId}</span></td>
                      <td><StatusTag value={state.kind} label={state.label} /></td>
                      <td>{property.totalUnits}</td>
                      <td className="nowrap">{formatDate(property.submittedAt)}</td>
                      <td className="right"><Link className="link small" to={`/admin/properties/${property.id}`}>Open</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onPage={setPage} />}
      </div>
    </div>
  );
}
