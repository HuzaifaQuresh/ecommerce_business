import type { User } from "@supabase/supabase-js";

export function isEmailConfirmed(user?: { email_confirmed_at?: string | null } | null) {
  return Boolean(user?.email_confirmed_at);
}

export function isTrustedOauthUser(
  user?: {
    identities?: Array<{ provider?: string }> | null;
    app_metadata?: Record<string, unknown> | null;
  } | null,
) {
  if (!user) return false;
  if ((user.identities ?? []).some((row) => row.provider && row.provider !== "email")) return true;
  const provider = String(user.app_metadata?.provider || "email").toLowerCase();
  if (provider && provider !== "email") return true;
  const providers = user.app_metadata?.providers;
  return Array.isArray(providers) && providers.some((item) => String(item).toLowerCase() !== "email");
}

/** Email/password accounts must verify before they can use the store. Google is already verified. */
export function needsEmailVerification(user?: User | null) {
  if (!user) return false;
  if (isTrustedOauthUser(user)) return false;
  return !isEmailConfirmed(user);
}
