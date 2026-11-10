import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthShell, PasswordField, StrengthBar } from "../components/AuthShell";
import { useToast } from "../components/Toast";
import { Alert, Field } from "../components/ui";
import { usePageTitle } from "../lib/hooks";

export default function Register() {
  usePageTitle("Create account");
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const from = (location.state as { from?: string } | null)?.from;

  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const change = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, ...(key === "password" ? { confirm: undefined } : {}) }));
  };
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => change(key, event.target.value);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const found: typeof errors = {};
    if (!form.fullName.trim()) found.fullName = "Enter your full name";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) found.email = "Enter a valid email address";
    if (form.password.length < 8) found.password = "Use at least 8 characters";
    if (form.confirm !== form.password) found.confirm = "The passwords do not match";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      await register({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password, ...(form.phone.trim() ? { phone: form.phone.trim() } : {}) });
      toast.success("Account created. We sent you an email to verify your address.");
      navigate(from ?? "/", { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Rent a home or list your own property. It takes a minute.">
      <form className="stack" onSubmit={submit} noValidate>
        {error && <Alert>{error}</Alert>}
        <div className="grid-2">
          <Field label="Full name" error={errors.fullName}>{(id) => <input id={id} className="input" autoComplete="name" autoFocus value={form.fullName} onChange={set("fullName")} aria-invalid={errors.fullName ? true : undefined} />}</Field>
          <Field label="Email" error={errors.email}>{(id) => <input id={id} className="input" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={errors.email ? true : undefined} />}</Field>
        </div>
        <Field label="Mobile number (optional)" hint="With the country code, for example +63 917 123 4567">
          {(id) => <input id={id} className="input" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />}
        </Field>
        <div className="grid-2">
          <div className="stack stack--sm">
            <PasswordField label="Password" autoComplete="new-password" value={form.password} onChange={(value) => change("password", value)} error={errors.password} hint="At least 8 characters" />
            <StrengthBar password={form.password} />
          </div>
          <PasswordField label="Confirm password" autoComplete="new-password" value={form.confirm} onChange={(value) => change("confirm", value)} error={errors.confirm} />
        </div>
        <button className="btn btn--lg btn--block" type="submit" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        <p className="muted small" style={{ textAlign: "center" }}>We will email you a link to verify your address.</p>
        <div className="divider"><span>Already have an account?</span></div>
        <Link className="btn btn--ghost btn--block" to="/login" state={location.state}>Sign in</Link>
      </form>
    </AuthShell>
  );
}
