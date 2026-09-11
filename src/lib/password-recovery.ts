import { supabase } from "@/integrations/supabase/client";
import { getAuthRedirectTo } from "@/lib/auth-redirect";
import { AUTH_RECOVERY_FLAG, getBootAuthParams, snapshotAuthRedirectParams, authHrefFromParams, clearAuthBootSnapshot } from "@/lib/auth-url-snapshot";
import { asEmailOtpType, verifyEmailTokenHash } from "@/lib/verify-email";

export const RECOVERY_FLAG = AUTH_RECOVERY_FLAG;
const RECOVERY_TTL_MS = 60 * 60 * 1000;

export function getPasswordResetRedirectTo(): string {
  return getAuthRedirectTo("/auth/reset-password");
}

export function markPasswordRecovery() {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECOVERY_FLAG, String(Date.now()));
}

export function clearPasswordRecovery() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECOVERY_FLAG);
  sessionStorage.removeItem(RECOVERY_FLAG);
  clearAuthBootSnapshot();
}

export function isPasswordRecoveryPending(): boolean {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(RECOVERY_FLAG) === "1") return true;
  const raw = localStorage.getItem(RECOVERY_FLAG);
  if (!raw) return false;
  const ts = Number(raw);
  if (!Number.isFinite(ts) || Date.now() - ts > RECOVERY_TTL_MS) {
    localStorage.removeItem(RECOVERY_FLAG);
    return false;
  }
  return true;
}

export function readAuthRedirectParams(): URLSearchParams {
  snapshotAuthRedirectParams();
  const params = getBootAuthParams();
  if (typeof window === "undefined") return params;
  const search = window.location.search.replace(/^\?/, "");
  const hash = window.location.hash.replace(/^#/, "");
  for (const [key, value] of new URLSearchParams(search)) params.set(key, value);
  for (const [key, value] of new URLSearchParams(hash)) params.set(key, value);
  return params;
}

export function isRecoveryRedirect(type?: string | null): boolean {
  return type === "recovery" || isPasswordRecoveryPending();
}

export async function establishSessionFromUrl(): Promise<{
  type: string;
  error?: string;
  hasSession: boolean;
}> {
  const params = readAuthRedirectParams();
  const type = params.get("type") || "";
  const errorDesc = params.get("error_description") || params.get("error");
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const token = params.get("token");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token") || "";

  if (type === "recovery") markPasswordRecovery();

  if (errorDesc) {
    return {
      type,
      hasSession: false,
      error: decodeURIComponent(errorDesc.replace(/\+/g, " ")),
    };
  }

  if (tokenHash) {
    const { error } = await verifyEmailTokenHash(tokenHash, asEmailOtpType(type || "recovery"));
    if (error) return { type, hasSession: false, error: error.message };
  } else if (token && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: asEmailOtpType(type),
    });
    if (error) return { type, hasSession: false, error: error.message };
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(authHrefFromParams(params));
    if (error) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return { type, hasSession: false, error: error.message };
    }
  } else if (accessToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) return { type, hasSession: false, error: error.message };
  } else {
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  const { data } = await supabase.auth.getSession();
  const resolvedType = type || (isPasswordRecoveryPending() ? "recovery" : "");
  if (resolvedType === "recovery" && data.session) markPasswordRecovery();
  return { type: resolvedType, hasSession: Boolean(data.session) };
}
