import { useId, useState, type ReactNode } from "react";
import { useCurrency } from "../lib/currency";

const points = (currency: string) => [
  { title: "Verified owners", text: "Every owner is identity-checked before they can list." },
  { title: "Reviewed listings", text: "Our team approves each home before it goes live." },
  { title: `Clear prices in ${currency}`, text: "Rent, deposit and terms, all on one page." },
];

// One balanced card for every sign-in style page: a short brand panel and the form beside it.
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const currency = useCurrency();
  return (
    <div className="authpage">
      <div className="authbox">
        <aside className="authside" aria-label="Why RentEasy">
          <div className="authside__brand">RentEasy</div>
          <div>
            <h2>Homes that are checked before they are listed.</h2>
            <ul>
              {points(currency).map((point) => (
                <li key={point.title}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d9b46a" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9.5" /><path d="M8 12.5l2.7 2.7L16 9.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <div><b>{point.title}</b><span>{point.text}</span></div>
                </li>
              ))}
            </ul>
          </div>
          <svg className="authside__skyline" viewBox="0 0 400 110" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
            <g fill="#f3efe3" opacity="0.08">
              <rect x="10" y="60" width="50" height="50" /><rect x="68" y="30" width="60" height="80" /><rect x="136" y="70" width="46" height="40" /><rect x="190" y="12" width="66" height="98" /><rect x="264" y="52" width="52" height="58" /><rect x="324" y="74" width="44" height="36" />
            </g>
          </svg>
        </aside>
        <div className="authmain stack stack--lg">
          <div>
            <h1>{title}</h1>
            {subtitle && <p className="muted" style={{ marginTop: 6 }}>{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// A password box with a show/hide button. The label row can hold an extra link, such as "Forgot password?".
export function PasswordField({ label, value, onChange, autoComplete, hint, error, action, autoFocus }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string; hint?: string; error?: string; action?: ReactNode; autoFocus?: boolean }) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="field">
      <div className="labelrow">
        <label htmlFor={id}>{label}</label>
        {action}
      </div>
      <div className="pwfield">
        <input id={id} className="input" type={shown ? "text" : "password"} autoComplete={autoComplete} autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={error ? true : undefined} />
        <button type="button" className="pwfield__toggle" aria-pressed={shown} aria-label={shown ? "Hide password" : "Show password"} onClick={() => setShown((value) => !value)}>
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}

// 0 = empty, 1 = weak, 2 = fair, 3 = strong. A guide only: the server enforces the real rule (8 characters).
export function passwordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (password.length < 8) return 1;
  return score >= 4 ? 3 : score >= 3 ? 2 : 1;
}

export function StrengthBar({ password }: { password: string }) {
  const level = passwordStrength(password);
  if (level === 0) return null;
  const labels = ["", "Weak", "Fair", "Strong"];
  return (
    <div className="strength" data-level={level} aria-live="polite">
      <span><i /><i /><i /></span>
      <small>{labels[level]}</small>
    </div>
  );
}
