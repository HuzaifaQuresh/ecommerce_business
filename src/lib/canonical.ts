import { SITE_ORIGIN } from "@/lib/seo";

const CANONICAL_HOST = "smartzone.pk";

/** Paths that should keep a trailing slash (none for this store — trailingSlash: never). */
const SKIP_TRAILING_REDIRECT = new Set(["/", ""]);

/**
 * Force https://smartzone.pk (no www, no trailing slash except root).
 * Returns a 301 Response when a redirect is required, otherwise null.
 */
export function canonicalRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();
  let needsRedirect = false;

  // Prefer apex domain (www → smartzone.pk)
  if (host === `www.${CANONICAL_HOST}`) {
    url.hostname = CANONICAL_HOST;
    needsRedirect = true;
  }

  // Workers / local may see http on the edge URL — only redirect when Host is production
  if (
    (host === CANONICAL_HOST || host === `www.${CANONICAL_HOST}`) &&
    url.protocol === "http:"
  ) {
    url.protocol = "https:";
    needsRedirect = true;
  }

  // Strip trailing slash (except homepage)
  if (
    url.pathname.length > 1 &&
    url.pathname.endsWith("/") &&
    !SKIP_TRAILING_REDIRECT.has(url.pathname)
  ) {
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    needsRedirect = true;
  }

  if (!needsRedirect) return null;

  // Preserve path/search/hash on canonical host
  const target = new URL(url.pathname + url.search + url.hash, SITE_ORIGIN);
  if (host === `www.${CANONICAL_HOST}` || host === CANONICAL_HOST) {
    target.hostname = CANONICAL_HOST;
    target.protocol = "https:";
  }

  return new Response(null, {
    status: 301,
    headers: {
      Location: target.toString(),
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
