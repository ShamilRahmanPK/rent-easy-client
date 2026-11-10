import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { AuthShell } from "../components/AuthShell";
import { Alert, Field } from "../components/ui";
import { usePageTitle } from "../lib/hooks";

export default function ResetPassword() {
  usePageTitle("Choose a new password");
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirm) return setError("The two passwords do not match");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthShell title="Choose a new password">
        <Alert>This link is missing its token. Open the link from your email again, or request a new one.</Alert>
        <Link className="btn btn--ghost" to="/forgot-password">Request a new link</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="You will be signed out on all other devices.">
      {done ? (
        <div className="stack">
          <Alert kind="ok">Your password was changed. You can sign in now.</Alert>
          <Link className="btn" to="/login">Sign in</Link>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          {error && <Alert>{error}</Alert>}
          <Field label="New password" hint="At least 8 characters">
            {(id) => <input id={id} className="input input--line" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />}
          </Field>
          <Field label="Confirm new password">
            {(id) => <input id={id} className="input input--line" type="password" autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} />}
          </Field>
          <button className="btn" type="submit" disabled={busy || password.length < 8 || !confirm}>{busy ? "Saving…" : "Save password"}</button>
        </form>
      )}
    </AuthShell>
  );
}
