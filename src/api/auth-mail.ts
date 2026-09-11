import { createServerFn } from "@tanstack/react-start";
import type { User } from "@supabase/supabase-js";

const STORE_ORIGIN = "https://smartzone.pk";

export type SendRecoveryResult =
  | { ok: true }
  | { ok: false; error: string; delivered?: boolean };

export type SendSignupResult =
  | { ok: true; alreadyVerified?: boolean; oauth?: boolean }
  | { ok: false; error: string };

function isRecoverRateLimited(message: string): boolean {
  const m = (message || "").toLowerCase();
  return (
    m.includes("only request this after") ||
    m.includes("for security purposes") ||
    m.includes("rate limit") ||
    m.includes("over_email_send_rate_limit") ||
    m.includes("over_request_rate_limit")
  );
}

function isUnknownUser(message: string): boolean {
  const m = (message || "").toLowerCase();
  return m.includes("user not found") || m.includes("unable to find") || m.includes("user_not_found");
}

function isOauthMailbox(user: User): boolean {
  const provider = String(user.app_metadata?.provider || "email").toLowerCase();
  if (provider && provider !== "email") return true;
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.some((item) => String(item).toLowerCase() !== "email")) {
    return true;
  }
  return (user.identities ?? []).some((row) => row.provider && row.provider !== "email");
}

function isFreshAccount(user: User, hours = 6): boolean {
  const created = Date.parse(user.created_at || "");
  if (!Number.isFinite(created)) return true;
  return Date.now() - created < hours * 60 * 60 * 1000;
}

async function loadWorkerSupabaseEnv() {
  try {
    const { env } = await import("cloudflare:workers");
    const cf = env as { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string };
    if (cf.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = cf.SUPABASE_SERVICE_ROLE_KEY;
    }
    if (cf.SUPABASE_URL && !process.env.SUPABASE_URL) {
      process.env.SUPABASE_URL = cf.SUPABASE_URL;
    }
  } catch {
    /* local Node — .env already loaded */
  }
}

async function findAuthUserByEmail(email: string, userId?: string): Promise<User | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (userId) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (data.user?.email?.trim().toLowerCase() === email) return data.user;
  }

  for (let page = 1; page <= 8; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const found = (data.users || []).find((row) => row.email?.trim().toLowerCase() === email);
    if (found) return found;
    if ((data.users || []).length < 200) break;
  }
  return null;
}

/**
 * Password reset mail for any customer inbox.
 * Cloudflare Email Routing (EmailMessage) can only deliver to the admin Gmail
 * destination — it returns 2036 for customer addresses. GoTrue /recover
 * delivers to Gmail/Outlook via Supabase mailer (or custom SMTP).
 */
export const sendSmartZoneRecoveryEmail = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data }): Promise<SendRecoveryResult> => {
    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) return { ok: false, error: "Enter a valid email address" };

    await loadWorkerSupabaseEnv();

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${STORE_ORIGIN}/auth/reset-password`,
      });
      if (!error) return { ok: true };
      if (isUnknownUser(error.message)) return { ok: true };
      if (isRecoverRateLimited(error.message)) return { ok: false, error: error.message };
      return { ok: false, error: error.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send the reset email";
      if (isUnknownUser(message)) return { ok: true };
      return { ok: false, error: message };
    }
  });

/**
 * Signup confirmation for customer inboxes via GoTrue mailer (same path as recovery).
 * Also reverses Auth autoconfirm on a fresh email/password account so the user
 * cannot enter the store until they click Confirm or enter the 6-digit code.
 */
export const sendSmartZoneSignupEmail = createServerFn({ method: "POST" })
  .validator((d: { email: string; userId?: string }) => d)
  .handler(async ({ data }): Promise<SendSignupResult> => {
    const email = data.email.trim().toLowerCase();
    if (!email.includes("@")) return { ok: false, error: "Enter a valid email address" };

    await loadWorkerSupabaseEnv();

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const user = await findAuthUserByEmail(email, data.userId);
      if (!user?.id) return { ok: true };
      if (isOauthMailbox(user)) return { ok: true, oauth: true };

      const confirmed = Boolean(user.email_confirmed_at);
      const mailed = Boolean(user.confirmation_sent_at);
      if (confirmed && mailed) return { ok: true, alreadyVerified: true };
      if (confirmed && !mailed && !isFreshAccount(user)) return { ok: true, alreadyVerified: true };

      if (confirmed && !mailed) {
        const { error: holdError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          email_confirm: false,
        });
        if (holdError) return { ok: false, error: holdError.message };
      }

      const { error } = await supabaseAdmin.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${STORE_ORIGIN}/auth/callback` },
      });
      if (!error) return { ok: true };
      if (isUnknownUser(error.message)) return { ok: true };
      if (isRecoverRateLimited(error.message)) return { ok: false, error: error.message };
      const m = error.message.toLowerCase();
      if (m.includes("already") && m.includes("confirm")) return { ok: true, alreadyVerified: true };
      return { ok: false, error: error.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send the verification email";
      if (isUnknownUser(message)) return { ok: true };
      return { ok: false, error: message };
    }
  });
