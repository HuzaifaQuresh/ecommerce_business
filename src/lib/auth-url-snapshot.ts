/**
 * Capture auth redirect params before the router or supabase-js strip
 * `?code=` / `type=recovery` from the address bar.
 */
export const AUTH_RECOVERY_FLAG = "sz_password_recovery";
export const AUTH_BOOT_STORAGE = "sz_auth_boot_url";

let bootParams: URLSearchParams | null = null;

function mergeInto(target: URLSearchParams, raw: string) {
  const value = raw.replace(/^[?#]/, "");
  if (!value) return;
  for (const [key, next] of new URLSearchParams(value)) target.set(key, next);
}

export function snapshotAuthRedirectParams() {
  if (typeof window === "undefined") return;
  if (bootParams) return;
  bootParams = new URLSearchParams();
  try {
    const stored = sessionStorage.getItem(AUTH_BOOT_STORAGE);
    if (stored) {
      for (const part of stored.split("\n")) mergeInto(bootParams, part);
    }
  } catch {
    /* ignore */
  }
  mergeInto(bootParams, window.location.search);
  mergeInto(bootParams, window.location.hash);
  if (bootParams.get("type") === "recovery") {
    try {
      localStorage.setItem(AUTH_RECOVERY_FLAG, String(Date.now()));
    } catch {
      /* ignore */
    }
  }
  if (bootParams.get("code") || bootParams.get("token_hash") || bootParams.get("access_token")) {
    try {
      sessionStorage.setItem(AUTH_BOOT_STORAGE, `${window.location.search}\n${window.location.hash}`);
    } catch {
      /* ignore */
    }
  }
}

export function getBootAuthParams(): URLSearchParams {
  snapshotAuthRedirectParams();
  return new URLSearchParams(bootParams ?? undefined);
}

export function authHrefFromParams(params: URLSearchParams): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://smartzone.pk";
  const path = typeof window !== "undefined" ? window.location.pathname : "/auth/callback";
  const query = params.toString();
  return query ? `${origin}${path}?${query}` : `${origin}${path}`;
}

export function clearAuthBootSnapshot() {
  bootParams = null;
  try {
    sessionStorage.removeItem(AUTH_BOOT_STORAGE);
  } catch {
    /* ignore */
  }
}

/** Runs in <head> before React so PKCE `code` survives router search stripping. */
export const AUTH_BOOT_SCRIPT = `(function(){try{var q=location.search||"";var h=location.hash||"";if(!q&&!h)return;if(q.indexOf("code=")<0&&q.indexOf("type=recovery")<0&&q.indexOf("token_hash=")<0&&h.indexOf("access_token=")<0&&h.indexOf("type=recovery")<0)return;sessionStorage.setItem("${AUTH_BOOT_STORAGE}",q+"\\n"+h);if(q.indexOf("type=recovery")>=0||h.indexOf("type=recovery")>=0){localStorage.setItem("${AUTH_RECOVERY_FLAG}",String(Date.now()))}}catch(e){}})();`;

if (typeof window !== "undefined") snapshotAuthRedirectParams();
