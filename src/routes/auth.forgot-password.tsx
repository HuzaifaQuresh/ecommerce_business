import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { persistPendingVerification, verifyEmailCode, verifyEmailError, isAuthSendCooldown } from "@/lib/verify-email";
import { markPasswordRecovery } from "@/lib/password-recovery";
import { sendSmartZoneRecoveryEmail } from "@/api/auth-mail";
import { SetNewPasswordForm } from "@/components/site/SetNewPasswordForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { SmartZoneLogo } from "@/components/site/SmartZoneLogo";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({
    meta: [{ title: "Reset Password — SmartZone — IT Solutions, Smart Automation & Electronics" }],
  }),
  component: ForgotPassword,
});

type Step = "email" | "code" | "password";

function StepDots({ step }: { step: Step }) {
  const n = step === "email" ? 1 : step === "code" ? 2 : 3;
  const labels = ["Email", "Verify", "New password"];
  return (
    <ol className="mb-6 grid grid-cols-3 gap-2">
      {labels.map((label, i) => {
        const idx = i + 1;
        const active = idx === n;
        const done = idx < n;
        return (
          <li key={label} className="min-w-0">
            <div className={`h-1.5 rounded-full ${done || active ? "bg-[#FF7A00]" : "bg-slate-200"}`} />
            <p
              className={`mt-1.5 truncate text-[11px] font-semibold ${
                active ? "text-[#0B192C]" : done ? "text-[#FF7A00]" : "text-muted-foreground"
              }`}
            >
              {idx}. {label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setInterval(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearInterval(id);
  }, [resendIn]);

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    const e = email.trim().toLowerCase();
    if (!e) return toast.error("Enter your email address");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      return toast.error("Enter a valid email address");
    }
    setBusy(true);
    persistPendingVerification(e, "recovery");
    try {
      const result = await sendSmartZoneRecoveryEmail({ data: { email: e } });
      if (!result.ok) {
        const canContinue =
          result.delivered === false ||
          isAuthSendCooldown(result.error) ||
          /user not found|unable to find|2036|destination|email binding|cloudflare blocked/i.test(
            result.error,
          );
        if (canContinue) {
          toast.message(
            result.delivered === false
              ? "Code created, but the inbox may delay. Check Spam, or wait a minute and resend."
              : isAuthSendCooldown(result.error)
                ? verifyEmailError(result.error)
                : "If this email is registered, a 6-digit code is on its way. Check inbox and Spam.",
          );
          setStep("code");
          setResendIn(60);
          return;
        }
        toast.error(verifyEmailError(result.error));
        return;
      }
      toast.success("Check your inbox — 6-digit code is in the email subject and body.");
      setStep("code");
      setResendIn(60);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event?: FormEvent) => {
    event?.preventDefault();
    const e = email.trim().toLowerCase();
    if (otp.trim().length < 6) return toast.error("Enter the 6-digit code from your email");
    setBusy(true);
    const { error } = await verifyEmailCode(e, otp, "recovery");
    setBusy(false);
    if (error) return toast.error(verifyEmailError(error.message));
    markPasswordRecovery();
    toast.success("Verified — set your new password");
    setStep("password");
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 bg-slate-50/50">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <Link to="/" aria-label="SmartZone Home">
            <SmartZoneLogo size="md" showTagline={true} />
          </Link>
        </div>

        <div className="rounded-2xl border bg-card p-6 sm:p-8 shadow-[var(--shadow-elevated)]">
          {step !== "password" ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 mb-4 text-muted-foreground hover:text-foreground"
            >
              <Link to="/auth" search={{ tab: "signin" }}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Sign In
              </Link>
            </Button>
          ) : null}

          <StepDots step={step} />

          {step === "email" ? (
            <>
              <h1 className="text-2xl font-bold text-[#0B192C]">Forgot your password?</h1>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                Enter the email you signed up with. We send a 6-digit code in the email — then you
                set a new password.
              </p>

              <form className="mt-6 space-y-4" onSubmit={(ev) => void sendCode(ev)}>
                <div>
                  <Label htmlFor="reset-email" className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email address
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(ev) => setEmail(ev.target.value)}
                    className="mt-1.5 h-12"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full min-h-[48px] bg-[#FF7A00] hover:bg-[#E56E00] text-white"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending 6-digit code…
                    </>
                  ) : (
                    "Send 6-digit code"
                  )}
                </Button>
              </form>
            </>
          ) : null}

          {step === "code" ? (
            <>
              <h1 className="text-2xl font-bold text-[#0B192C]">Enter your code</h1>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                We sent a 6-digit code to <strong className="text-foreground">{email}</strong>. Open
                the email — the code is in the subject line{" "}
                <strong className="text-foreground">Your SmartZone reset code is</strong> and in the
                message body.
              </p>
              <div className="mt-4 rounded-lg border bg-slate-50 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
                Check Spam and Promotions. Search Gmail for{" "}
                <span className="font-medium text-foreground">SmartZone reset code</span>. Wait for
                the timer before resending.
              </div>
              <form className="mt-6 space-y-4" onSubmit={(ev) => void verifyCode(ev)}>
                <div>
                  <Label htmlFor="reset-otp" className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> 6-digit verification code
                  </Label>
                  <Input
                    id="reset-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="••••••"
                    value={otp}
                    onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, "").slice(0, 8))}
                    className="mt-1.5 tracking-[0.35em] text-center text-lg font-semibold h-12"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={busy || otp.trim().length < 6}
                  className="w-full min-h-[48px] bg-[#FF7A00] hover:bg-[#E56E00] text-white"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…
                    </>
                  ) : (
                    "Verify code"
                  )}
                </Button>
              </form>
              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  disabled={busy || resendIn > 0}
                  onClick={() => void sendCode()}
                  className="text-[#0052B4] font-bold hover:underline disabled:opacity-50"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                  }}
                  className="text-muted-foreground hover:underline"
                >
                  Use a different email
                </button>
              </div>
            </>
          ) : null}

          {step === "password" ? <SetNewPasswordForm /> : null}
        </div>
      </div>
    </div>
  );
}
