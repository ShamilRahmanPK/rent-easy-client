import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Alert, Empty, Field, Modal, PageHeader, Pagination, Spinner, StatusTag } from "../../components/ui";
import { ROLE_LABEL, formatDate } from "../../lib/format";
import { useDebounced, usePageTitle } from "../../lib/hooks";
import type { Page, Role, User } from "../../lib/types";
import { errorMessage } from "../../api/client";

function StaffModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ fullName: "", email: "", role: "admin" });
  const [error, setError] = useState("");
  const create = useMutation({
    mutationFn: () => api.post("/users/staff", form),
    onSuccess: () => {
      toast.success("Account created. They received an email to set their password.");
      queryClient.invalidateQueries({ queryKey: ["people"] });
      onClose();
    },
    onError: (caught) => setError(errorMessage(caught)),
  });

  return (
    <Modal title="Add an admin" onClose={onClose}>
      <form className="stack" onSubmit={(event) => { event.preventDefault(); setError(""); create.mutate(); }}>
        {error && <Alert>{error}</Alert>}
        <Field label="Full name">{(id) => <input id={id} className="input" required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />}</Field>
        <Field label="Email">{(id) => <input id={id} className="input" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />}</Field>
        <Field label="Role" hint="Super admins can also manage admins, settings and email wording.">
          {(id) => (
            <select id={id} className="select" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
          )}
        </Field>
        <p className="muted small">They get an email with a link, valid for 72 hours, to choose their own password.</p>
        <div className="row row--end">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create account"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function People() {
  usePageTitle("People");
  const { isSuperAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);

  const list = useQuery({
    queryKey: ["people", { q, role, status, page }],
    queryFn: () => api.get<Page<User>>("/users", { q, role, status, page, pageSize: 20 }),
    placeholderData: (previous) => previous,
  });

  return (
    <div className="container page">
      <PageHeader eyebrow="Admin" title="People" subtitle="Everyone with an account." actions={isSuperAdmin ? <button type="button" className="btn" onClick={() => setAdding(true)}>Add an admin</button> : undefined} />
      <div className="stack">
        <div className="row">
          <div className="field grow" style={{ minWidth: 220 }}>
            <label htmlFor="u-search" className="sr-only">Search</label>
            <input id="u-search" className="input" placeholder="Search by name, email or account ID" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>
          <select className="select" aria-label="Role" style={{ width: 170 }} value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}>
            <option value="">All roles</option>
            {(Object.keys(ROLE_LABEL) as Role[]).map((key) => <option key={key} value={key}>{ROLE_LABEL[key]}</option>)}
          </select>
          <select className="select" aria-label="Status" style={{ width: 170 }} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">Any status</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Deactivated">Deactivated</option>
          </select>
        </div>
        {list.isLoading && <Spinner />}
        {list.data && list.data.items.length === 0 && <Empty title="No one matches" />}
        {list.data && list.data.items.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>ID</th><th>Name</th><th>Roles</th><th>Status</th><th>Joined</th><th></th></tr></thead>
              <tbody>
                {list.data.items.map((person) => (
                  <tr key={person.id}>
                    <td className="mono">{person.userId}</td>
                    <td><Link to={`/admin/people/${person.id}`} className="title" style={{ textDecoration: "none" }}>{person.fullName}</Link><br /><span className="muted small">{person.email}{!person.emailVerified && " · not verified"}</span></td>
                    <td><span className="row" style={{ gap: 4 }}>{person.roles.map((item) => <span key={item} className={`tag${item === "user" ? "" : " tag--brand"}`}>{ROLE_LABEL[item]}</span>)}</span></td>
                    <td><StatusTag value={person.status} /></td>
                    <td className="nowrap">{formatDate(person.createdAt)}</td>
                    <td className="right"><Link className="link small" to={`/admin/people/${person.id}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onPage={setPage} />}
      </div>
      {adding && <StaffModal onClose={() => setAdding(false)} />}
    </div>
  );
}
