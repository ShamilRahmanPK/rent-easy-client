import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useToast } from "../../components/Toast";
import { ConfirmModal, Empty, Field, Modal, PageHeader, Pagination, Spinner, StatusTag, Tabs } from "../../components/ui";
import { formatDate, formatMoney } from "../../lib/format";
import { useCurrency } from "../../lib/currency";
import { useDebounced, usePageTitle } from "../../lib/hooks";
import type { Page, Property, Tenancy, User } from "../../lib/types";

function LinkTenantModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const currency = useCurrency();
  const [personSearch, setPersonSearch] = useState("");
  const [propertySearch, setPropertySearch] = useState("");
  const [person, setPerson] = useState<User | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const people = useDebounced(personSearch);
  const properties = useDebounced(propertySearch);

  const peopleList = useQuery({ queryKey: ["people", "pick", people], queryFn: () => api.get<Page<User>>("/users", { q: people, status: "Active", pageSize: 6 }), enabled: people.length >= 2 && !person });
  const propertyList = useQuery({ queryKey: ["properties", "pick", properties], queryFn: () => api.get<Page<Property>>("/properties", { q: properties, approval: "Approved", pageSize: 6 }), enabled: properties.length >= 2 && !propertyId });
  const detail = useQuery({ queryKey: ["property", propertyId], queryFn: () => api.get<Property>(`/properties/${propertyId}`), enabled: !!propertyId });
  const vacant = detail.data?.units?.filter((unit) => unit.status === "Vacant") ?? [];

  const link = useMutation({
    mutationFn: () => api.post("/tenancies", { unitId, tenantId: person!.id, startDate }),
    onSuccess: () => {
      toast.success("Tenant linked to the unit");
      onDone();
    },
    onError: toast.error,
  });

  return (
    <Modal title="Link a tenant to a unit" onClose={onClose}>
      <form className="stack" onSubmit={(event) => { event.preventDefault(); link.mutate(); }}>
        <div className="stack stack--sm">
          <span className="label">Person</span>
          {person ? (
            <div className="row row--between panel" style={{ padding: 12 }}><span>{person.fullName} · {person.userId} · {person.email}</span><button type="button" className="link small" onClick={() => setPerson(null)}>Change</button></div>
          ) : (
            <>
              <input className="input" aria-label="Search people" placeholder="Search by name, email or ID number…" value={personSearch} onChange={(event) => setPersonSearch(event.target.value)} />
              {peopleList.data?.items.map((item) => (
                <button key={item.id} type="button" className="menu__item" style={{ border: "1px solid var(--line)" }} onClick={() => setPerson(item)}><b>{item.fullName}</b><span className="muted small">{item.userId} · {item.email}</span></button>
              ))}
              {peopleList.data?.items.length === 0 && <p className="muted small">No one found.</p>}
            </>
          )}
        </div>
        <div className="stack stack--sm">
          <span className="label">Property</span>
          {propertyId && detail.data ? (
            <div className="row row--between panel" style={{ padding: 12 }}><span>{detail.data.name} · {detail.data.code}</span><button type="button" className="link small" onClick={() => { setPropertyId(""); setUnitId(""); }}>Change</button></div>
          ) : (
            <>
              <input className="input" aria-label="Search properties" placeholder="Search approved properties…" value={propertySearch} onChange={(event) => setPropertySearch(event.target.value)} />
              {propertyList.data?.items.map((item) => (
                <button key={item.id} type="button" className="menu__item" style={{ border: "1px solid var(--line)" }} onClick={() => setPropertyId(item.id)}><b>{item.name}</b><span className="muted small">{item.address.city} · {item.totalUnits} units</span></button>
              ))}
            </>
          )}
        </div>
        {propertyId && (
          <Field label="Vacant unit">
            {(id) => (
              <select id={id} className="select" required value={unitId} onChange={(event) => setUnitId(event.target.value)}>
                <option value="">{detail.isLoading ? "Loading…" : vacant.length ? "Select a unit…" : "No vacant units"}</option>
                {vacant.map((unit) => <option key={unit.id} value={unit.id}>{unit.unitNumber} · {formatMoney(unit.monthlyRent, currency)}</option>)}
              </select>
            )}
          </Field>
        )}
        <Field label="Starts on">{(id) => <input id={id} className="input" type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />}</Field>
        <p className="muted small">The person needs a verified email and an ID on file. They become a tenant, and they and the owner are notified.</p>
        <div className="row row--end">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={!person || !unitId || link.isPending}>{link.isPending ? "Linking…" : "Link tenant"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Tenancies() {
  usePageTitle("Tenancies");
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("Active");
  const [page, setPage] = useState(1);
  const [linking, setLinking] = useState(false);
  const [ending, setEnding] = useState<Tenancy | null>(null);

  const list = useQuery({
    queryKey: ["tenancies", "admin", status, page],
    queryFn: () => api.get<Page<Tenancy>>("/tenancies", { status: status === "all" ? undefined : status, page, pageSize: 15 }),
    placeholderData: (previous) => previous,
  });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["tenancies"] });
    queryClient.invalidateQueries({ queryKey: ["admin"] });
    queryClient.invalidateQueries({ queryKey: ["property"] });
  };
  const end = useMutation({
    mutationFn: (tenancy: Tenancy) => api.post(`/tenancies/${tenancy.id}/end`, {}),
    onSuccess: () => {
      toast.success("Tenancy ended. The unit is vacant again.");
      setEnding(null);
      refresh();
    },
    onError: (error) => {
      setEnding(null);
      toast.error(error);
    },
  });

  return (
    <div className="container page">
      <PageHeader eyebrow="Admin" title="Tenancies" subtitle="Who rents which unit." actions={<button type="button" className="btn" onClick={() => setLinking(true)}>Link a tenant</button>} />
      <div className="stack">
        <Tabs tabs={[{ id: "Active", label: "Active" }, { id: "Ended", label: "Ended" }, { id: "all", label: "All" }]} value={status} onChange={(id) => { setStatus(id); setPage(1); }} />
        {list.isLoading && <Spinner />}
        {list.data && list.data.items.length === 0 && <Empty title="No tenancies here" />}
        {list.data && list.data.items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Tenant</th><th>Unit</th><th>Started</th><th>Ended</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {list.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.tenant && <Link className="title" style={{ textDecoration: "none" }} to={`/admin/people/${item.tenant.id}`}>{item.tenant.fullName}</Link>}<br /><span className="muted small">{item.tenant?.email}</span></td>
                    <td>{item.property.name}<br /><span className="muted small">Unit {item.unit.unitNumber} · {item.unit.code}</span></td>
                    <td className="nowrap">{formatDate(item.startDate)}</td>
                    <td className="nowrap">{formatDate(item.endDate)}</td>
                    <td><StatusTag value={item.status} /></td>
                    <td className="right">{item.status === "Active" && <button type="button" className="link link--danger small" onClick={() => setEnding(item)}>End tenancy</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onPage={setPage} />}
      </div>
      {linking && <LinkTenantModal onClose={() => setLinking(false)} onDone={() => { setLinking(false); refresh(); }} />}
      {ending && <ConfirmModal title="End this tenancy?" danger confirmLabel="End tenancy" busy={end.isPending} message={<p>{ending.tenant?.fullName} will no longer be the tenant of unit {ending.unit.unitNumber}. The unit becomes vacant and the tenant role is removed if it is their only tenancy.</p>} onConfirm={() => end.mutate(ending)} onClose={() => setEnding(null)} />}
    </div>
  );
}
