import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import { Alert, DescriptionList, Field, FileDrop, PageHeader, Tabs } from "../components/ui";
import { ROLE_LABEL, formatDateTime, idTypeOptions, initials } from "../lib/format";
import { usePageTitle } from "../lib/hooks";
import type { User } from "../lib/types";

const emptyToNull = (value: string) => (value.trim() === "" ? null : value.trim());

function useSaveProfile() {
  const { refresh } = useAuth();
  const toast = useToast();
  return useMutation({
    mutationFn: (changes: Record<string, unknown>) => api.patch<User>("/users/me", changes),
    onSuccess: async () => {
      await refresh();
      toast.success("Saved");
    },
    onError: toast.error,
  });
}

function ProfileTab({ user }: { user: User }) {
  const save = useSaveProfile();
  const toast = useToast();
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    fullName: user.fullName,
    phone: user.phone ?? "",
    dateOfBirth: user.dateOfBirth ?? "",
    address: user.address ?? "",
    city: user.city ?? "",
    country: user.country ?? "",
  });
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const avatar = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("avatar", file);
      return api.post("/users/me/avatar", body);
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Photo updated");
    },
    onError: toast.error,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({
      fullName: form.fullName.trim(),
      phone: emptyToNull(form.phone),
      dateOfBirth: emptyToNull(form.dateOfBirth),
      address: emptyToNull(form.address),
      city: emptyToNull(form.city),
      country: emptyToNull(form.country),
    });
  };

  return (
    <form className="stack stack--lg" onSubmit={submit}>
      <div className="row" style={{ gap: 20 }}>
        <div className="avatar avatar--lg">{user.avatarUrl ? <img src={user.avatarUrl} alt="Your profile" /> : initials(user.fullName)}</div>
        <div style={{ maxWidth: 320, flex: 1 }}>
          <FileDrop accept="image/jpeg,image/png,image/webp" busy={avatar.isPending} label="Change photo (JPG, PNG or WebP, up to 2 MB)" onFiles={(files) => avatar.mutate(files[0])} />
        </div>
      </div>
      <div className="grid-2">
        <Field label="Full name">{(id) => <input id={id} className="input" required value={form.fullName} onChange={set("fullName")} />}</Field>
        <Field label="Email" hint={user.emailVerified ? "Verified" : "Not verified yet"}>{(id) => <input id={id} className="input" value={user.email} readOnly />}</Field>
        <Field label="Mobile number" hint="With country code, for example +63 917 123 4567">{(id) => <input id={id} className="input" type="tel" value={form.phone} onChange={set("phone")} />}</Field>
        <Field label="Date of birth" hint="Owners and tenants must be 18 or older">{(id) => <input id={id} className="input" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />}</Field>
        <Field label="Address">{(id) => <input id={id} className="input" value={form.address} onChange={set("address")} />}</Field>
        <Field label="City">{(id) => <input id={id} className="input" value={form.city} onChange={set("city")} />}</Field>
        <Field label="Country">{(id) => <input id={id} className="input" value={form.country} onChange={set("country")} />}</Field>
      </div>
      <div><button type="submit" className="btn" disabled={save.isPending || !form.fullName.trim()}>{save.isPending ? "Saving…" : "Save profile"}</button></div>
    </form>
  );
}

function IdentityTab({ user }: { user: User }) {
  const save = useSaveProfile();
  const toast = useToast();
  const { refresh } = useAuth();
  const [idType, setIdType] = useState(user.idType ?? "");
  const [idNumber, setIdNumber] = useState(user.idNumber ?? "");

  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("document", file);
      return api.post("/users/me/id-document", body);
    },
    onSuccess: async () => {
      await refresh();
      toast.success("ID document uploaded");
    },
    onError: toast.error,
  });

  const complete = Boolean(user.idType && user.idNumber && user.idDocumentFileId);

  return (
    <div className="stack stack--lg">
      {complete ? <Alert kind="ok">Your identity details are complete. You can list properties and request homes.</Alert> : (
        <Alert kind="warn">Owners and tenants must have an ID on file. Add the ID type, the number and a copy of the document to list a property or request a home.</Alert>
      )}
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate({ idType: idType || null, idNumber: emptyToNull(idNumber) });
        }}
      >
        <div className="grid-2">
          <Field label="ID type">
            {(id) => (
              <select id={id} className="select" value={idType} onChange={(event) => setIdType(event.target.value)}>
                <option value="">Select…</option>
                {idTypeOptions(user.idType).map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            )}
          </Field>
          <Field label="ID number" hint="Only you and our admins can see this.">{(id) => <input id={id} className="input" value={idNumber} onChange={(event) => setIdNumber(event.target.value)} />}</Field>
        </div>
        <div><button type="submit" className="btn" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save ID details"}</button></div>
      </form>
      <div className="stack stack--sm">
        <h3>ID document</h3>
        {user.idDocumentFileId && (
          <p>On file. <a className="link" href={`/api/files/${user.idDocumentFileId}/download`}>Download your copy</a></p>
        )}
        <FileDrop accept="application/pdf,image/jpeg,image/png" busy={upload.isPending} label={user.idDocumentFileId ? "Replace the document (PDF, JPG or PNG, up to 10 MB)" : "Upload your ID (PDF, JPG or PNG, up to 10 MB)"} onFiles={(files) => upload.mutate(files[0])} />
        <p className="muted small">This file is private. It is never shown on the public site.</p>
      </div>
    </div>
  );
}

function SecurityTab({ user }: { user: User }) {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const change = useMutation({
    mutationFn: () => api.post("/auth/change-password", { currentPassword: form.currentPassword, newPassword: form.newPassword }),
    onSuccess: () => {
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password changed. Other devices were signed out.");
    },
    onError: toast.error,
  });
  const mismatch = form.confirm.length > 0 && form.confirm !== form.newPassword;

  return (
    <div className="stack stack--lg">
      <DescriptionList rows={[["Account ID", user.userId], ["Roles", user.roles.map((role) => ROLE_LABEL[role]).join(", ")], ["Last sign-in", formatDateTime(user.lastLoginAt)], ["Member since", formatDateTime(user.createdAt)]]} />
      <form
        className="stack"
        style={{ maxWidth: 420 }}
        onSubmit={(event) => {
          event.preventDefault();
          change.mutate();
        }}
      >
        <h3>Change password</h3>
        <Field label="Current password">{(id) => <input id={id} className="input" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />}</Field>
        <Field label="New password" hint="At least 8 characters">{(id) => <input id={id} className="input" type="password" autoComplete="new-password" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />}</Field>
        <Field label="Confirm new password" error={mismatch ? "The passwords do not match" : undefined}>{(id) => <input id={id} className="input" type="password" autoComplete="new-password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} />}</Field>
        <div><button type="submit" className="btn" disabled={change.isPending || !form.currentPassword || form.newPassword.length < 8 || mismatch}>{change.isPending ? "Saving…" : "Change password"}</button></div>
      </form>
    </div>
  );
}

function NotificationsTab({ user }: { user: User }) {
  const save = useSaveProfile();
  const [inApp, setInApp] = useState(user.notifications.inApp);
  const [email, setEmail] = useState(user.notifications.emailUpdates);
  useEffect(() => {
    setInApp(user.notifications.inApp);
    setEmail(user.notifications.emailUpdates);
  }, [user.notifications.inApp, user.notifications.emailUpdates]);

  return (
    <form
      className="stack"
      style={{ maxWidth: 560 }}
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ notifyInApp: inApp, notifyEmailUpdates: email });
      }}
    >
      <label className="check"><input type="checkbox" checked={inApp} onChange={(event) => setInApp(event.target.checked)} /> Show notifications in the app</label>
      <label className="check"><input type="checkbox" checked={email} onChange={(event) => setEmail(event.target.checked)} /> Email me about updates and announcements</label>
      <p className="muted small">Security and account emails (verification, password changes, role changes, suspensions and new sign-ins) are always sent. They protect your account and cannot be turned off.</p>
      <div><button type="submit" className="btn" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save preferences"}</button></div>
    </form>
  );
}

export default function Account() {
  usePageTitle("My profile");
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const tab = params.get("tab") ?? "profile";

  useEffect(() => {
    // Opening the profile is a good moment to make sure the details shown are current.
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  if (!user) return null;
  return (
    <div className="container page">
      <PageHeader eyebrow="Account" title="My profile" subtitle={`${user.fullName} · ID ${user.userId}`} />
      <div className="stack stack--lg">
        <Tabs
          tabs={[
            { id: "profile", label: "Details" },
            { id: "identity", label: "Identity" },
            { id: "security", label: "Password and security" },
            { id: "notifications", label: "Notifications" },
          ]}
          value={tab}
          onChange={(id) => setParams({ tab: id }, { replace: true })}
        />
        <div className="panel">
          {tab === "profile" && <ProfileTab key={user.updatedAt ?? "p"} user={user} />}
          {tab === "identity" && <IdentityTab user={user} />}
          {tab === "security" && <SecurityTab user={user} />}
          {tab === "notifications" && <NotificationsTab user={user} />}
        </div>
      </div>
    </div>
  );
}
