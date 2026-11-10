import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { AuthShell } from "../components/AuthShell";
import { Alert, Field } from "../components/ui";
import { usePageTitle } from "../lib/hooks";

export default function ForgotPassword() {
  usePageTitle("Forgot password");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we will send you a link that works for one hour.">
      {sent ? (
        <div className="stack">
          <Alert kind="ok">If that email has an account, a reset link is on its way. Check your inbox and spam folder.</Alert>
          <Link className="btn btn--ghost" to="/login">Back to sign in</Link>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          {error && <Alert>{error}</Alert>}
          <Field label="Email">
            {(id) => <input id={id} className="input input--line" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />}
          </Field>
          <button className="btn" type="submit" disabled={busy || !email}>{busy ? "Sending…" : "Send reset link"}</button>
          <div className="auth__links"><Link className="link" to="/login">Back to sign in</Link></div>
        </form>
      )}
    </AuthShell>
  );
}
