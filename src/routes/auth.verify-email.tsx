import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { SmartZoneLogo } from "@/components/site/SmartZoneLogo";
import { CheckEmailPanel } from "@/components/site/CheckEmailPanel";
import { SetNewPasswordForm } from "@/components/site/SetNewPasswordForm";
import { consumeAuthNext, safeInternalPath } from "@/lib/auth-redirect";
import { loginIntentFromPath, resolvePostLoginPath } from "@/lib/post-login";
import { markPasswordRecovery } from "@/lib/password-recovery";
import {
  clearPendingVerification,
  persistPendingVerification,
  readPendingVerification,
  verifyEmailCode,
  verifyEmailError,
  isAuthSendCooldown,
  type EmailVerifyPurpose,
} from "@/lib/verify-email";
import { supabase } from "@/integrations/supabase/client";
import { sendSmartZoneRecoveryEmail, sendSmartZoneSignupEmail } from "@/api/auth-mail";

export const Route = createFileRoute("/auth/verify-email")({
  head: () => ({
    meta: [{ title: "Verify Email — SmartZone — IT Solutions, Smart Automation & Electronics" }],
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const pending = useMemo(() => readPendingVerification(), []);
  const email = (search.email || pending?.email || "").trim().toLowerCase();
  const purpose: EmailVerifyPurpose =
    search.purpose === "recovery" || pending?.purpose === "recovery" ? "recovery" : "signup";
  const [busy, setBusy] = useState(false);
  const [recoveryVerified, setRecoveryVerified] = useState(false);

  const afterSignup = async () => {
    clearPendingVerification();
    const next = consumeAuthNext() || safeInternalPath(search.redirect);
    const intent = loginIntentFromPath(next);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast.success("Email verified. Sign in to continue.");
      navigate({
        to: intent === "vendor" ? "/vendor/auth" : "/auth",
        search: { tab: "signin" },
      });
      return;
    }
    const dest = await resolvePostLoginPath({ intent, explicitNext: next });
    navigate({ to: dest as "/", resetScroll: true });
  };

  const onVerifyCode = async (code: string) => {
    if (!email) return toast.error("Enter your email on the previous screen first.");
    if (code.trim().length < 6) return toast.error("Enter the 6-digit code from your email");
    setBusy(true);
    const { error } = await verifyEmailCode(email, code, purpose === "recovery" ? "recovery" : "signup");
    setBusy(false);
    if (error) return toast.error(verifyEmailError(error.message, purpose));
    toast.success(purpose === "recovery" ? "Verified — set your new password" : "Email verified — welcome to SmartZone");
    if (purpose === "recovery") {
      markPasswordRecovery();
      clearPendingVerification();
      setRecoveryVerified(true);
      return;
    }
    await afterSignup();
  };

  const onResend = async () => {
    if (!email) return toast.error("Enter your email on the previous screen first.");
    persistPendingVerification(email, purpose);
    if (purpose === "recovery") {
      const result = await sendSmartZoneRecoveryEmail({ data: { email } });
      if (!result.ok) {
        const quiet =
          isAuthSendCooldown(result.error) ||
          /2036|destination|email binding|cloudflare blocked/i.test(result.error);
        toast[quiet ? "message" : "error"](verifyEmailError(result.error, "recovery"));
        return;
      }
      toast.success("A new reset email is on its way. Check inbox and Spam.");
      return;
    }
    const result = await sendSmartZoneSignupEmail({ data: { email } });
    if (!result.ok) {
      toast.error(verifyEmailError(result.error, "signup"));
      return;
    }
    if (result.alreadyVerified) {
      toast.success("This email is already verified. Sign in to continue.");
      navigate({ to: "/auth", search: { tab: "signin" } });
      return;
    }
    toast.success("A new verification email is on its way. Check inbox and Spam.");
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10 sm:py-14 bg-slate-50/50">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Link to="/" aria-label="SmartZone Home">
            <SmartZoneLogo size="md" showTagline={true} />
          </Link>
        </div>
        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-[var(--shadow-elevated)]">
          {email && recoveryVerified && purpose === "recovery" ? (
            <SetNewPasswordForm />
          ) : email ? (
            <CheckEmailPanel
              email={email}
              purpose={purpose}
              busy={busy}
              onVerifyCode={(code) => void onVerifyCode(code)}
              onResend={onResend}
              onChangeEmail={() =>
                navigate({
                  to: purpose === "recovery" ? "/auth/forgot-password" : "/auth",
                  search: { tab: purpose === "recovery" ? "signin" : "signup" },
                })
              }
            />
          ) : (
            <div className="space-y-3 text-center">
              <h1 className="text-xl font-bold">Verify your email</h1>
              <p className="text-sm text-muted-foreground">
                Start from Sign Up or Forgot password so we know which email to verify.
              </p>
              <Link to="/auth" search={{ tab: "signup" }} className="text-sm font-semibold text-[#0052B4] hover:underline">
                Go to Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
