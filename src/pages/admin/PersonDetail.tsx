import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../../components/Toast";
import { Alert, ConfirmModal, DescriptionList, Empty, Field, Modal, PageHeader, Spinner, StatusTag } from "../../components/ui";
import { ROLE_LABEL, formatDateTime, idTypeLabel, initials } from "../../lib/format";
import { usePageTitle } from "../../lib/hooks";
import type { Role, User } from "../../lib/types";

export default function PersonDetail() {
  const { id = "" } = useParams();
  const { user: me, isSuperAdmin } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [statusChange, setStatusChange] = useState<"Suspended" | "Deactivated" | "Active" | null>(null);
  const [note, setNote] = useState("");
  const [roleChange, setRoleChange] = useState<{ role: Role; grant: boolean } | null>(null);

  const query = useQuery({ queryKey: ["person", id], queryFn: () => api.get<User>(`/users/${id}`), retry: false });
  const person = query.data;
  usePageTitle(person?.fullName ?? "Person");

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["person", id] });
    queryClient.invalidateQueries({ queryKey: ["people"] });
  };
  const changeStatus = useMutation({
    mutationFn: () => api.patch(`/users/${id}/status`, { status: statusChange, ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: () => {
      toast.success("Account updated. The person was notified.");
      setStatusChange(null);
      setNote("");
      refresh();
    },
    onError: toast.error,
  });
  const changeRole = useMutation({
    mutationFn: () => (roleChange!.grant ? api.post(`/users/${id}/roles`, { role: roleChange!.role }) : api.delete(`/users/${id}/roles/${roleChange!.role}`)),
    onSuccess: () => {
      toast.success("Roles updated. The person was notified.");
      setRoleChange(null);
      refresh();
    },
    onError: (error) => {
      setRoleChange(null);
      toast.error(error);
    },
  });

  if (query.isLoading) return <Spinner />;
  if (query.isError || !person) return <div className="container page"><Empty title="Person not found" /></div>;

  const isSelf = me?.id === person.id;
  const targetIsStaff = person.roles.includes("admin") || person.roles.includes("super_admin");
  // The server enforces these rules too. The screen only hides what would be refused.
  const mayManage = !isSelf && (isSuperAdmin || !targetIsStaff);
  const manageable: Role[] = isSuperAdmin ? ["tenant", "owner", "admin", "super_admin"] : ["tenant"];

  return (
    <div className="container page">
      <p className="small" style={{ marginBottom: 12 }}><Link className="link" to="/admin/people">← All people</Link></p>
      <PageHeader
        eyebrow={`Account ${person.userId}`}
        title={person.fullName}
        subtitle={person.email}
        actions={<><StatusTag value={person.status} /><span className={`tag ${person.emailVerified ? "tag--ok" : "tag--pending"}`}>{person.emailVerified ? "Email verified" : "Email not verified"}</span></>}
      />
      <div className="review">
        <div className="stack stack--lg">
          <div className="panel stack">
            <div className="row" style={{ gap: 16 }}>
              <div className="avatar avatar--lg">{person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : initials(person.fullName)}</div>
              <div className="muted small">Joined {formatDateTime(person.createdAt)}<br />Last sign-in {formatDateTime(person.lastLoginAt)}</div>
            </div>
            <DescriptionList rows={[["Mobile", person.phone], ["Date of birth", person.dateOfBirth], ["Address", [person.address, person.city, person.country].filter(Boolean).join(", ") || null], ["Properties owned", person.propertyCount], ["Active tenancies", person.activeTenancies]]} />
          </div>
          <div className="panel stack">
            <h3>Identity</h3>
            <DescriptionList rows={[["ID type", idTypeLabel(person.idType)], ["ID number", person.idNumber], ["ID document", person.idDocumentFileId ? <a key="d" className="link" href={`/api/files/${person.idDocumentFileId}/download`}>Download</a> : "Not uploaded"]]} />
            <p className="muted small">Only the person and admins can see these details.</p>
          </div>
        </div>

        <aside className="stack">
          <div className="panel stack">
            <h3>Roles</h3>
            <div className="row" style={{ gap: 6 }}>{person.roles.map((role) => <span key={role} className={`tag${role === "user" ? "" : " tag--brand"}`}>{ROLE_LABEL[role]}</span>)}</div>
            {isSelf && <p className="muted small">You cannot change your own account here.</p>}
            {!isSelf && !mayManage && <p className="muted small">Only a super admin can change an admin account.</p>}
            {mayManage && (
              <ul className="docs">
                {manageable.map((role) => {
                  const has = person.roles.includes(role);
                  return (
                    <li key={role}>
                      <span>{ROLE_LABEL[role]}</span>
                      <button type="button" className={`link small${has ? " link--danger" : ""}`} onClick={() => setRoleChange({ role, grant: !has })}>{has ? "Remove" : "Add"}</button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="muted small">Everyone keeps the base User role. Owners are made automatically when their first property is approved.</p>
          </div>

          {mayManage && (
            <div className="panel stack">
              <h3>Account status</h3>
              {person.status === "Active" ? (
                <div className="row">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStatusChange("Suspended")}>Suspend</button>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => setStatusChange("Deactivated")}>Deactivate</button>
                </div>
              ) : (
                <button type="button" className="btn btn--sm" onClick={() => setStatusChange("Active")}>Reactivate account</button>
              )}
              <p className="muted small">Suspending or deactivating signs the person out everywhere at once. Their data is kept.</p>
            </div>
          )}
        </aside>
      </div>

      {statusChange && (
        <Modal title={statusChange === "Active" ? "Reactivate this account" : `${statusChange === "Suspended" ? "Suspend" : "Deactivate"} this account`} onClose={() => setStatusChange(null)}>
          <form className="stack" onSubmit={(event) => { event.preventDefault(); changeStatus.mutate(); }}>
            <Alert kind="warn">{person.fullName} will be told by email and in the app.</Alert>
            <Field label="Note to the person (optional)">{(fid) => <textarea id={fid} className="textarea" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />}</Field>
            <div className="row row--end">
              <button type="button" className="btn btn--ghost" onClick={() => setStatusChange(null)}>Cancel</button>
              <button type="submit" className={`btn${statusChange === "Deactivated" ? " btn--danger" : ""}`} disabled={changeStatus.isPending}>{changeStatus.isPending ? "Saving…" : "Confirm"}</button>
            </div>
          </form>
        </Modal>
      )}
      {roleChange && (
        <ConfirmModal
          title={roleChange.grant ? `Add the ${ROLE_LABEL[roleChange.role]} role?` : `Remove the ${ROLE_LABEL[roleChange.role]} role?`}
          confirmLabel={roleChange.grant ? "Add role" : "Remove role"}
          danger={!roleChange.grant}
          busy={changeRole.isPending}
          message={<p>{person.fullName} will be told by email and in the app.</p>}
          onConfirm={() => changeRole.mutate()}
          onClose={() => setRoleChange(null)}
        />
      )}
    </div>
  );
}
