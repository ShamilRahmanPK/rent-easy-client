import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../../api/client";
import { useToast } from "../../components/Toast";
import { Alert, Empty, Field, Modal, PageHeader, Pagination, Spinner, StatusTag, Tabs } from "../../components/ui";
import { formatDateTime } from "../../lib/format";
import { usePageTitle } from "../../lib/hooks";
import type { EmailSettings, EmailTemplate, MailLogEntry, Page } from "../../lib/types";

function EmailTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["settings", "email"], queryFn: () => api.get<EmailSettings>("/settings/email") });
  const [form, setForm] = useState({ host: "", port: "465", encryption: "ssl", username: "", password: "", fromName: "RentEasy", fromAddress: "", replyTo: "", adminAlertEmail: "" });
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; mode?: string; error?: string } | null>(null);

  useEffect(() => {
    if (!settings.data) return;
    const data = settings.data;
    setForm({ host: data.host, port: String(data.port), encryption: data.encryption, username: data.username, password: "", fromName: data.fromName, fromAddress: data.fromAddress, replyTo: data.replyTo, adminAlertEmail: data.adminAlertEmail });
  }, [settings.data]);

  const save = useMutation({
    mutationFn: () => api.put("/settings/email", { ...form, port: Number(form.port), ...(form.password ? { password: form.password } : {}) }),
    onSuccess: () => {
      toast.success("Email settings saved");
      queryClient.invalidateQueries({ queryKey: ["settings", "email"] });
    },
    onError: toast.error,
  });
  const test = useMutation({
    mutationFn: async () => {
      try {
        return await api.post<{ ok: boolean; mode?: string; error?: string }>("/settings/email/test", testTo.trim() ? { to: testTo.trim() } : {});
      } catch (error) {
        return { ok: false, error: errorMessage(error) };
      }
    },
    onSuccess: setTestResult,
  });

  if (settings.isLoading) return <Spinner />;
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <div className="stack stack--lg" style={{ maxWidth: 820 }}>
      <form className="panel stack" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <h3>Outgoing email (SMTP)</h3>
        <p className="muted">All emails are sent through this mail server. Use a mailbox on your own domain, and add SPF, DKIM and DMARC records so messages do not land in spam.</p>
        <div className="grid-2">
          <Field label="SMTP host">{(id) => <input id={id} className="input" required placeholder="smtp.yourdomain.com" value={form.host} onChange={set("host")} />}</Field>
          <Field label="Port">{(id) => <input id={id} className="input" required inputMode="numeric" value={form.port} onChange={set("port")} />}</Field>
          <Field label="Encryption" hint="Use SSL on port 465 or STARTTLS on port 587.">
            {(id) => <select id={id} className="select" value={form.encryption} onChange={set("encryption")}><option value="ssl">SSL</option><option value="starttls">STARTTLS</option></select>}
          </Field>
          <Field label="Username">{(id) => <input id={id} className="input" required autoComplete="off" value={form.username} onChange={set("username")} />}</Field>
          <Field label="Password" hint={settings.data?.passwordSet ? "A password is saved. Leave empty to keep it." : "Required"}>
            {(id) => <input id={id} className="input" type="password" autoComplete="new-password" placeholder={settings.data?.passwordSet ? "••••••••" : ""} value={form.password} onChange={set("password")} />}
          </Field>
          <Field label="From name">{(id) => <input id={id} className="input" required value={form.fromName} onChange={set("fromName")} />}</Field>
          <Field label="From address">{(id) => <input id={id} className="input" type="email" required placeholder="noreply@yourdomain.com" value={form.fromAddress} onChange={set("fromAddress")} />}</Field>
          <Field label="Reply-to address (optional)">{(id) => <input id={id} className="input" type="email" value={form.replyTo} onChange={set("replyTo")} />}</Field>
          <Field label="Failure alert address (optional)" hint="Told when an email cannot be delivered after all retries.">{(id) => <input id={id} className="input" type="email" value={form.adminAlertEmail} onChange={set("adminAlertEmail")} />}</Field>
        </div>
        <div><button type="submit" className="btn" disabled={save.isPending || (!settings.data?.passwordSet && !form.password)}>{save.isPending ? "Saving…" : "Save email settings"}</button></div>
      </form>

      <div className="panel stack">
        <h3>Send a test email</h3>
        <div className="row">
          <div className="field grow" style={{ minWidth: 220 }}>
            <label htmlFor="test-to" className="sr-only">Send to</label>
            <input id="test-to" className="input" type="email" placeholder="Leave empty to send to yourself" value={testTo} onChange={(event) => setTestTo(event.target.value)} />
          </div>
          <button type="button" className="btn btn--ghost" disabled={test.isPending} onClick={() => { setTestResult(null); test.mutate(); }}>{test.isPending ? "Sending…" : "Send test email"}</button>
        </div>
        {testResult?.ok && <Alert kind="ok">{testResult.mode === "console" ? "Test email printed in the server terminal (the server is in console mode, so nothing was sent)." : "Test email sent. Check the inbox."}</Alert>}
        {testResult && !testResult.ok && <Alert>{testResult.error}</Alert>}
        <p className="muted small">Save your settings first. The test uses the saved values.</p>
      </div>
    </div>
  );
}

function WordingTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["settings", "templates"], queryFn: () => api.get<EmailTemplate[]>("/settings/email-templates") });
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const open = (template: EmailTemplate) => {
    setEditing(template);
    setSubject(template.subject);
    setBody(template.bodyHtml);
    setError("");
  };
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["settings", "templates"] });
  const save = useMutation({
    mutationFn: () => api.put(`/settings/email-templates/${editing!.key}`, { subject, bodyHtml: body }),
    onSuccess: () => {
      toast.success("Wording saved");
      setEditing(null);
      refresh();
    },
    onError: (caught) => setError(errorMessage(caught)),
  });
  const reset = useMutation({
    mutationFn: () => api.delete(`/settings/email-templates/${editing!.key}`),
    onSuccess: () => {
      toast.success("Back to the default wording");
      setEditing(null);
      refresh();
    },
    onError: (caught) => setError(errorMessage(caught)),
  });

  return (
    <div className="stack">
      <p className="muted" style={{ maxWidth: 70 + "ch" }}>Change the wording of any email without a new release. Placeholders such as {"{{name}}"} are replaced with real values when the email is sent.</p>
      {list.isLoading && <Spinner />}
      {list.data && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Email</th><th>Subject</th><th>Type</th><th></th></tr></thead>
            <tbody>
              {list.data.map((template) => (
                <tr key={template.key}>
                  <td><span className="code">{template.key}</span> {template.customised && <span className="tag tag--brand">Edited</span>}</td>
                  <td>{template.subject}</td>
                  <td><span className="tag">{template.essential ? "Always sent" : "Updates"}</span></td>
                  <td className="right"><button type="button" className="link small" onClick={() => open(template)}>Edit wording</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <Modal title={`Edit: ${editing.key}`} onClose={() => setEditing(null)} wide>
          <form className="stack" onSubmit={(event) => { event.preventDefault(); setError(""); save.mutate(); }}>
            {error && <Alert>{error}</Alert>}
            <Field label="Subject">{(id) => <input id={id} className="input" required maxLength={200} value={subject} onChange={(event) => setSubject(event.target.value)} />}</Field>
            <Field label="Body (HTML)" hint={editing.placeholders.length ? `Placeholders you can use: ${editing.placeholders.map((name) => `{{${name}}}`).join(", ")}` : "This email has no placeholders."}>
              {(id) => <textarea id={id} className="textarea" required style={{ minHeight: 240, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }} value={body} onChange={(event) => setBody(event.target.value)} />}
            </Field>
            <div className="row row--between">
              <span>{editing.customised && <button type="button" className="link link--danger small" disabled={reset.isPending} onClick={() => reset.mutate()}>Reset to the default wording</button>}</span>
              <span className="row">
                <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save wording"}</button>
              </span>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function MailLogTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ["settings", "mail-log", status, to, page],
    queryFn: () => api.get<Page<MailLogEntry>>("/settings/mail-log", { status, to, page, pageSize: 20 }),
    placeholderData: (previous) => previous,
    refetchInterval: 15_000,
  });
  const retry = useMutation({
    mutationFn: (id: string) => api.post(`/settings/mail-log/${id}/retry`),
    onSuccess: () => {
      toast.success("Queued to send again");
      queryClient.invalidateQueries({ queryKey: ["settings", "mail-log"] });
    },
    onError: toast.error,
  });

  return (
    <div className="stack">
      <div className="row">
        <input className="input" aria-label="Recipient" placeholder="Search by recipient" style={{ maxWidth: 260 }} value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} />
        <select className="select" aria-label="Status" style={{ width: 160 }} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">Any status</option>
          <option value="Queued">Queued</option>
          <option value="Sent">Sent</option>
          <option value="Failed">Failed</option>
        </select>
      </div>
      {list.isLoading && <Spinner />}
      {list.data && list.data.items.length === 0 && <Empty title="No emails yet" />}
      {list.data && list.data.items.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Recipient</th><th>Subject</th><th>Status</th><th>When</th><th></th></tr></thead>
            <tbody>
              {list.data.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.toEmail}</td>
                  <td>{item.subject}<br /><span className="muted small code">{item.template}</span></td>
                  <td><StatusTag value={item.status} />{item.status !== "Sent" && item.attempts > 0 && <div className="muted small">Attempt {item.attempts}</div>}{item.lastError && <div className="small" style={{ color: "var(--danger)", maxWidth: 260 }}>{item.lastError}</div>}</td>
                  <td className="nowrap small">{formatDateTime(item.sentAt ?? item.createdAt)}</td>
                  <td className="right">{item.status === "Failed" && <button type="button" className="link small" disabled={retry.isPending} onClick={() => retry.mutate(item.id)}>Try again</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list.data && <Pagination page={list.data.page} totalPages={list.data.totalPages} total={list.data.total} onPage={setPage} />}
    </div>
  );
}

function GeneralTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const general = useQuery({ queryKey: ["settings", "general"], queryFn: () => api.get<{ currency: string }>("/settings/general") });
  const [currency, setCurrency] = useState("PHP");
  useEffect(() => { if (general.data) setCurrency(general.data.currency); }, [general.data]);
  const save = useMutation({
    mutationFn: () => api.put("/settings/general", { currency }),
    onSuccess: () => {
      toast.success("Currency saved");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["public"] });
    },
    onError: toast.error,
  });
  return (
    <form className="panel stack" style={{ maxWidth: 480 }} onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <h3>Currency</h3>
      <Field label="Currency code" hint="Three letters, for example PHP. Shown on every price.">{(id) => <input id={id} className="input" maxLength={3} required value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />}</Field>
      <div><button type="submit" className="btn" disabled={save.isPending || currency.length !== 3}>{save.isPending ? "Saving…" : "Save"}</button></div>
    </form>
  );
}

export default function Settings() {
  usePageTitle("Settings");
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "email";
  return (
    <div className="container page">
      <PageHeader eyebrow="Super admin" title="Settings" subtitle="Email, wording, delivery and currency." />
      <div className="stack stack--lg">
        <Tabs tabs={[{ id: "email", label: "Email server" }, { id: "wording", label: "Email wording" }, { id: "log", label: "Mail log" }, { id: "general", label: "General" }]} value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} />
        {tab === "email" && <EmailTab />}
        {tab === "wording" && <WordingTab />}
        {tab === "log" && <MailLogTab />}
        {tab === "general" && <GeneralTab />}
      </div>
    </div>
  );
}
