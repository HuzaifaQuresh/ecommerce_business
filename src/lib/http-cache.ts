import { SECURITY_HEADERS } from "@/lib/canonical";

const HTML_REVALIDATE = {
  "Cache-Control": "private, no-cache, must-revalidate",
  "CDN-Cache-Control": "no-store",
  "Cloudflare-CDN-Cache-Control": "no-store",
} as const;

const ASSET_IMMUTABLE = "public, max-age=31536000, immutable";

function isHashedAssetPath(pathname: string) {
  return (
    pathname.startsWith("/assets/") ||
    /\/[^/]+\.[a-f0-9]{8,}\.(js|css|woff2?|png|svg|webp|avif|jpg|jpeg)$/i.test(pathname)
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

/**
 * HTML revalidates so catalog updates are not stuck behind Cloudflare.
 * Also attaches HSTS + baseline security headers on every response.
 */
export function applyHttpCachePolicy(request: Request, response: Response): Response {
  if (!request || !response) return response;
  const pathname = new URL(request.url).pathname;
  const contentType = response.headers.get("content-type") ?? "";

  if (isHashedAssetPath(pathname) && !contentType.includes("text/html")) {
    const cached = response.headers.get("Cache-Control")
      ? response
      : setHeaders(response, { "Cache-Control": ASSET_IMMUTABLE });
    return withSecurity(cached);
  }

  if (!contentType.includes("text/html")) {
    return withSecurity(response);
  }

  return withSecurity(setHeaders(response, HTML_REVALIDATE));
}
