import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthShell, PasswordField } from "../components/AuthShell";
import { Alert, Field } from "../components/ui";
import { usePageTitle } from "../lib/hooks";
import { isStaffRole } from "../lib/format";

export default function Login() {
  usePageTitle("Sign in");
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      navigate(from ?? (isStaffRole(user.roles) ? "/admin" : "/"), { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to manage your listings, requests and rentals.">
      <form className="stack" onSubmit={submit} noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Email">
          {(id) => <input id={id} className="input" type="email" autoComplete="email" autoFocus value={email} onChange={(event) => setEmail(event.target.value)} />}
        </Field>
        <PasswordField label="Password" autoComplete="current-password" value={password} onChange={setPassword} action={<Link className="link small" to="/forgot-password">Forgot password?</Link>} />
        <button className="btn btn--lg btn--block" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <div className="divider"><span>New to RentEasy?</span></div>
        <Link className="btn btn--ghost btn--block" to="/register" state={location.state}>Create an account</Link>
      </form>
    </AuthShell>
  );
}
