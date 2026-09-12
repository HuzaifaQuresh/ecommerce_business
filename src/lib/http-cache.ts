import { SECURITY_HEADERS } from "@/lib/canonical";
import { SITE_ORIGIN } from "@/lib/seo";

/** Short CDN cache + SWR for public HTML — cuts TTFB without freezing catalog forever. */
const HTML_PUBLIC = {
  "Cache-Control": "public, max-age=0, s-maxage=180, stale-while-revalidate=600",
  "CDN-Cache-Control": "public, max-age=180, stale-while-revalidate=600",
  "Cloudflare-CDN-Cache-Control": "public, max-age=180, stale-while-revalidate=600",
} as const;

const HTML_PRIVATE = {
  "Cache-Control": "private, no-cache, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Cloudflare-CDN-Cache-Control": "no-store",
} as const;

const ASSET_IMMUTABLE = {
  "Cache-Control": "public, max-age=31536000, immutable",
  "CDN-Cache-Control": "public, max-age=31536000, immutable",
  "Cloudflare-CDN-Cache-Control": "public, max-age=31536000, immutable",
} as const;

/** Never cache missing hashed assets — a brief deploy race was poisoning CDN with HTML 404s. */
const ASSET_MISS = {
  "Cache-Control": "no-store",
  "CDN-Cache-Control": "no-store",
  "Cloudflare-CDN-Cache-Control": "no-store",
} as const;

const STATIC_ICON = "public, max-age=604800, stale-while-revalidate=2592000";

const PRIVATE_HTML_PREFIXES = [
  "/admin",
  "/account",
  "/auth",
  "/vendor",
  "/checkout",
  "/cart",
  "/setup",
];

function isHashedAssetPath(pathname: string) {
  return (
    pathname.startsWith("/assets/") ||
    /\/[^/]+\.[a-f0-9]{8,}\.(js|css|woff2?|png|svg|webp|avif|jpg|jpeg)$/i.test(pathname)
  );
}

function isPrivateHtmlPath(pathname: string) {
  return PRIVATE_HTML_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function setHeaders(response: Response, patch: Record<string, string>) {
  try {
    for (const [key, value] of Object.entries(patch)) {
      response.headers.set(key, value);
    }
    return response;
  } catch {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(patch)) {
      headers.set(key, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

function withSecurity(response: Response): Response {
  return setHeaders(response, SECURITY_HEADERS);
}

function withCanonicalHint(request: Request, response: Response): Response {
  try {
    const url = new URL(request.url);
    if (url.hostname !== "smartzone.pk" && url.hostname !== "www.smartzone.pk") {
      return response;
    }
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/";
    const canonical = path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${path}`;
    const existing = response.headers.get("Link") || "";
    if (existing.includes('rel="canonical"')) return response;
    const link = `<${canonical}>; rel="canonical"`;
    return setHeaders(response, {
      Link: existing ? `${existing}, ${link}` : link,
    });
  } catch {
    return response;
  }
}

/**
 * HTML: short CDN SWR on public pages (TTFB/FCP).
 * Private/app shells stay no-store. Hashed assets stay immutable.
 */
export function applyHttpCachePolicy(request: Request, response: Response): Response {
  if (!request || !response) return response;
  const pathname = new URL(request.url).pathname;
  const contentType = response.headers.get("content-type") ?? "";

  if (
    pathname === "/favicon.ico" ||
    pathname === "/favicon.svg" ||
    pathname === "/favicon-16x16.png" ||
    pathname === "/favicon-32x32.png" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/apple-touch-icon.svg" ||
    pathname === "/icon-192.png" ||
    pathname === "/icon-512.png" ||
    pathname === "/smartzone-logo.png" ||
    pathname === "/smartzone-logo.svg"
  ) {
    return withSecurity(setHeaders(response, { "Cache-Control": STATIC_ICON }));
  }

  // Hashed /assets/* must never pick up HTML public-cache rules (even on 404 shells).
  if (isHashedAssetPath(pathname)) {
    if (response.status >= 400) {
      return withSecurity(setHeaders(response, ASSET_MISS));
    }
    return withSecurity(setHeaders(response, ASSET_IMMUTABLE));
  }

  if (!contentType.includes("text/html")) {
    return withSecurity(response);
  }

  const policy = isPrivateHtmlPath(pathname) ? HTML_PRIVATE : HTML_PUBLIC;
  return withSecurity(withCanonicalHint(request, setHeaders(response, policy)));
}
