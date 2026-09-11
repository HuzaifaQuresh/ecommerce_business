import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectTo } from "@/lib/auth-redirect";
import { sendSmartZoneSignupEmail, type SendSignupResult } from "@/api/auth-mail";
import type { EmailOtpType } from "@supabase/supabase-js";

export { isEmailConfirmed, isTrustedOauthUser, needsEmailVerification } from "@/lib/email-verified";

export type EmailVerifyPurpose = "signup" | "recovery";

const PENDING_KEY = "sz_pending_verify";
const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

export function asEmailOtpType(type: string | null | undefined): EmailOtpType {
  if (type && OTP_TYPES.includes(type as EmailOtpType)) return type as EmailOtpType;
  return "signup";
}

export function persistPendingVerification(email: string, purpose: EmailVerifyPurpose) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    PENDING_KEY,
    JSON.stringify({ email: email.trim().toLowerCase(), purpose, at: Date.now() }),
  );
}

export function readPendingVerification(): { email: string; purpose: EmailVerifyPurpose } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string; purpose?: EmailVerifyPurpose; at?: number };
    if (!parsed.email || (parsed.purpose !== "signup" && parsed.purpose !== "recovery")) return null;
    if (parsed.at && Date.now() - parsed.at > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(PENDING_KEY);
      return null;
    }
    return { email: parsed.email, purpose: parsed.purpose };
  } catch {
    return null;
  }
}

export function clearPendingVerification() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_KEY);
}

export async function completeEmailSignup(email: string, userId?: string): Promise<SendSignupResult> {
  const address = email.trim().toLowerCase();
  persistPendingVerification(address, "signup");
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    /* still send the confirmation mail */
  }
  return sendSmartZoneSignupEmail({ data: { email: address, userId } });
}

export async function verifyEmailCode(email: string, token: string, type: EmailOtpType) {
  return supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: token.trim(),
    type,
  });
}

export async function verifyEmailTokenHash(tokenHash: string, type: EmailOtpType) {
  return supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });
}

export async function resendSignupEmail(email: string, userId?: string) {
  const result = await sendSmartZoneSignupEmail({ data: { email, userId } });
  if (!result.ok) return { data: null, error: { message: result.error } };
  return { data: {}, error: null };
}

export async function resendVerificationEmail(email: string, purpose: EmailVerifyPurpose) {
  const address = email.trim().toLowerCase();
  if (purpose === "recovery") {
    return supabase.auth.resetPasswordForEmail(address, {
      redirectTo: getAuthRedirectTo("/auth/reset-password"),
    });
  }
  return resendSignupEmail(address);
}

export async function sendLoginCode(email: string) {
  return supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      shouldCreateUser: false,
      emailRedirectTo: getAuthRedirectTo("/auth/callback"),
    },
  });
}

export function isAuthSendCooldown(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    m.includes("only request this after") ||
    m.includes("for security purposes") ||
    m.includes("rate limit") ||
    m.includes("over_email_send_rate_limit") ||
    m.includes("over_request_rate_limit")
  );
}

export function authSendCooldownSeconds(message: string): number | null {
  const match = (message || "").match(/after\s+(\d+)\s+second/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

export function verifyEmailError(message: string, purpose: EmailVerifyPurpose = "signup"): string {
  const kind = purpose === "recovery" ? "password reset" : "verification";
  const wait = authSendCooldownSeconds(message);
  if (wait && wait > 0) {
    return `A ${kind} email was already sent. Check inbox and Spam, or wait ${wait} seconds to request another.`;
  }
  const m = (message || "").toLowerCase();
  if (isAuthSendCooldown(message)) {
    return `A ${kind} email was already sent. Check inbox and Spam, or wait about a minute to request another.`;
  }
  if (m.includes("redirect")) {
    return "This site’s callback URL is not allow-listed yet. Add /auth/callback and /auth/reset-password in Supabase Auth → URL Configuration.";
  }
  if (m.includes("expired") || m.includes("invalid") || m.includes("otp_expired")) {
    return "That code or link has expired. Request a new email and try again.";
  }
  if (m.includes("user already registered")) {
    return "An account with this email already exists. Use Sign In, or Forgot password if you need access.";
  }
  if (
    m.includes("2036") ||
    m.includes("destination") ||
    m.includes("email binding") ||
    m.includes("recipient_not_allowed") ||
    m.includes("cloudflare blocked")
  ) {
    return `A ${kind} email is on its way. Check inbox and Spam, then wait a minute before requesting another.`;
  }
  return message || "Could not send the verification email. Try again.";
}
