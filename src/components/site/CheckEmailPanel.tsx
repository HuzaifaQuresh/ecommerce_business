import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmailVerifyPurpose } from "@/lib/verify-email";

const RESEND_SECONDS = 60;

export function CheckEmailPanel({
  email,
  purpose,
  busy,
  onVerifyCode,
  onResend,
  onChangeEmail,
}: {
  email: string;
  purpose: EmailVerifyPurpose;
  busy?: boolean;
  onVerifyCode: (code: string) => void;
  onResend: () => Promise<void> | void;
  onChangeEmail?: () => void;
}) {
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);
  const isRecovery = purpose === "recovery";

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => setCooldown((n) => n - 1), 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    await onResend();
    setCooldown(RESEND_SECONDS);
  };

  return (
    <div className="space-y-5">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#0052B4]/10 text-[#0052B4]">
        <Mail className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#FF7A00]">
          {isRecovery ? "Password reset" : "Email verification"}
        </p>
        <h1 className="text-xl font-bold text-[#0B192C] mt-1">Check your email</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          We sent a {isRecovery ? "6-digit password reset code" : "6-digit verification code"} to{" "}
          <strong className="text-foreground">{email}</strong>
          {isRecovery
            ? ". Enter the 6-digit code from the email (also in the subject: Your SmartZone reset code is). Then set a new password."
            : ". Enter the code here, or open the email and tap Confirm email. You cannot sign in until this mailbox is verified."}
        </p>
      </div>

      <div className="rounded-lg border bg-slate-50 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
        <p className="font-semibold text-[#0B192C] mb-1">Didn’t see it?</p>
        Wait about a minute, then check <span className="font-medium">Spam</span> and{" "}
        <span className="font-medium">Promotions</span>. Search Gmail for{" "}
        <span className="font-medium">SmartZone</span>
        {isRecovery ? (
          <>
            {" "}
            or <span className="font-medium">reset</span>
          </>
        ) : (
          <>
            {" "}
            or <span className="font-medium">Confirm your SmartZone email</span>
          </>
        )}
        . Do not tap Resend until the timer ends.
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email-otp" className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          {isRecovery ? "6-digit verification code" : "6-digit code from the email"}
        </Label>
        <Input
          id="email-otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••••"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={(e) => {
            if (e.key === "Enter") onVerifyCode(otp);
          }}
          className="tracking-[0.35em] text-center text-lg font-semibold h-12"
        />
      </div>

      <Button
        type="button"
        onClick={() => onVerifyCode(otp)}
        disabled={busy || otp.trim().length < 6}
        className="w-full min-h-[48px] text-base font-semibold bg-[#FF7A00] hover:bg-[#E56E00] text-white"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying…
          </>
        ) : isRecovery ? (
          "Verify and set password"
        ) : (
          "Verify email"
        )}
      </Button>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy || cooldown > 0}
          className="text-[#0052B4] font-bold hover:underline disabled:opacity-50 disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
        </button>
        {onChangeEmail ? (
          <button type="button" onClick={onChangeEmail} className="text-muted-foreground hover:underline">
            Use a different email
          </button>
        ) : (
          <Link to="/auth" search={{ tab: isRecovery ? "signin" : "signup" }} className="text-muted-foreground hover:underline">
            Back to Sign In
          </Link>
        )}
      </div>
    </div>
  );
}
