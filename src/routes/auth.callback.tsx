/**
 * /auth/callback
 * Handles Supabase Auth redirects:
 *  - Google OAuth
 *  - Email confirmation
 *  - Password reset
 *  - Magic link / OTP
 */
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { consumeAuthNext, safeInternalPath } from "@/lib/auth-redirect";
import { ensureAuthProfile } from "@/lib/auth-profile";
import { googleAuthError } from "@/lib/google-auth";
import { establishSessionFromUrl, isRecoveryRedirect, markPasswordRecovery } from "@/lib/password-recovery";
import { clearPendingVerification, readPendingVerification } from "@/lib/verify-email";
import { getBootAuthParams } from "@/lib/auth-url-snapshot";
import { loginIntentFromPath, resolvePostLoginPath } from "@/lib/post-login";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing you in… — SmartZone" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const [status, setStatus] = useState<"processing" | "error" | "done">("processing");
  const [message, setMessage] = useState("Connecting your account…");
  const pending = readPendingVerification();
  const emailFlow =
    search.type === "signup" ||
    search.type === "email" ||
    search.type === "magiclink" ||
    pending?.purpose === "signup";
  const recoveryFlow = search.type === "recovery" || pending?.purpose === "recovery";
  const boot = getBootAuthParams();
  const oauthReturn =
    Boolean(search.code || boot.get("code") || boot.get("access_token")) &&
    !search.type &&
    !emailFlow &&
    !recoveryFlow;

  const finish = useCallback(
    (type: string) => {
      if (isRecoveryRedirect(type) || type === "recovery" || recoveryFlow) {
        setMessage("Email verified — set a new password…");
        setStatus("done");
        clearPendingVerification();
        setTimeout(() => navigate({ to: "/auth/reset-password", search: { tab: "signin" } }), 600);
        return;
      }
      setMessage(
        oauthReturn ? "Google connected — opening your account…" : "Email verified — signing you in…",
      );
      setStatus("done");
      clearPendingVerification();
      setTimeout(async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          const next = consumeAuthNext() || safeInternalPath(search.redirect);
          navigate({
            to: loginIntentFromPath(next) === "vendor" ? "/vendor/auth" : "/auth",
            search: { tab: "signin" },
          });
          return;
        }
        await ensureAuthProfile(session.user);
        const next = consumeAuthNext() || safeInternalPath(search.redirect);
        const dest = await resolvePostLoginPath({
          intent: loginIntentFromPath(next),
          explicitNext: next,
        });
        navigate({ to: dest as "/", resetScroll: true });
      }, 500);
    },
    [navigate, oauthReturn, recoveryFlow, search.redirect],
  );

  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (oauthReturn) setMessage("Signing you in with Google…");
    else if (recoveryFlow) setMessage("Verifying your password reset email…");
    else setMessage("Verifying your email…");

    const stop = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") markPasswordRecovery();
    });

    void (async () => {
      const result = await establishSessionFromUrl();
      await new Promise((resolve) => setTimeout(resolve, 150));
      stop.data.subscription.unsubscribe();
      if (result.error && !result.hasSession) {
        setStatus("error");
        setMessage(googleAuthError(result.error));
        return;
      }
      if (!result.hasSession) {
        setStatus("error");
        setMessage(
          oauthReturn
            ? "Google sign-in did not complete. Please try Continue with Google again."
            : "This verification link is invalid or has expired. Request a new email and try again.",
        );
        return;
      }
      finish(result.type);
    })();
  }, [finish, oauthReturn, recoveryFlow]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center rounded-2xl border bg-card p-10 shadow-lg">
        {status === "processing" && (
          <>
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
            <p className="font-semibold text-lg">
              {oauthReturn ? "Google sign-in" : recoveryFlow ? "Reset verification" : "Email verification"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
          </>
        )}
        {status === "done" && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
            <p className="font-semibold text-lg">Signed in</p>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="font-semibold text-lg">Sign-in failed</p>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
            <div className="flex flex-col gap-2 mt-6">
              <Button onClick={() => navigate({ to: "/auth", search: { tab: "signin" } })}>
                Back to Sign In
              </Button>
              <Button variant="outline" onClick={() => navigate({ to: "/auth", search: { tab: "signup" } })}>
                Create an account
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
