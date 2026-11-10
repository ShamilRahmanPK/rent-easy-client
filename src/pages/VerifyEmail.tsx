import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthShell } from "../components/AuthShell";
import { Alert, Spinner } from "../components/ui";
import { usePageTitle } from "../lib/hooks";

export default function VerifyEmail() {
  usePageTitle("Verify email");
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { refresh, user } = useAuth();
  const [state, setState] = useState<"working" | "done" | "failed">(token ? "working" : "failed");
  const [message, setMessage] = useState(token ? "" : "This link is missing its token. Open the link from your email again.");
  const started = useRef(false);

  useEffect(() => {
    // The link works once, so make sure React's double-run in development does not use it twice.
    if (!token || started.current) return;
    started.current = true;
    api
      .post("/auth/verify-email", { token })
      .then(() => {
        setState("done");
        return refresh();
      })
      .catch((error) => {
        setState("failed");
        setMessage(errorMessage(error));
      });
  }, [token, refresh]);

  return (
    <AuthShell title="Email verification">
      {state === "working" && <Spinner />}
      {state === "done" && (
        <div className="stack">
          <Alert kind="ok">Your email address is verified.</Alert>
          <Link className="btn" to={user ? "/" : "/login"}>{user ? "Continue" : "Sign in"}</Link>
        </div>
      )}
      {state === "failed" && (
        <div className="stack">
          <Alert>{message}</Alert>
          <p className="muted">Links work once and expire after 24 hours. Sign in and use "Resend verification email" for a new one.</p>
          <Link className="btn btn--ghost" to="/login">Go to sign in</Link>
        </div>
      )}
    </AuthShell>
  );
}
