const STORE_ORIGIN = "https://smartzone.pk";

function normalizeAuthPath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function isLocalAuthHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** After Google / email links, always return to the live store except during `npm run dev`. */
export function getAuthRedirectTo(path = "/auth/callback"): string {
  const next = normalizeAuthPath(path);
  if (typeof window === "undefined") return `${STORE_ORIGIN}${next}`;
  const localDev = !import.meta.env.PROD && isLocalAuthHost(window.location.hostname);
  if (localDev) return `${window.location.origin}${next}`;
  return `${STORE_ORIGIN}${next}`;
}

const AUTH_NEXT_KEY = "sz_auth_next";

export function safeInternalPath(path?: string | null): string | null {
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (path.startsWith("/auth")) return null;
  return path;
}

export function rememberAuthNext(path?: string | null) {
  if (typeof window === "undefined") return;
  const fromQuery = new URLSearchParams(window.location.search).get("redirect");
  const next = safeInternalPath(path) || safeInternalPath(fromQuery);
  if (next) sessionStorage.setItem(AUTH_NEXT_KEY, next);
  else sessionStorage.removeItem(AUTH_NEXT_KEY);
}

export function consumeAuthNext(): string | null {
  if (typeof window === "undefined") return null;
  const next = safeInternalPath(sessionStorage.getItem(AUTH_NEXT_KEY));
  sessionStorage.removeItem(AUTH_NEXT_KEY);
  return next;
}
