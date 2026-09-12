/** Strip huge base64 / data-URI media from site_settings so SSR HTML stays small (TTFB/FCP). */

const DATA_URI_RE = /data:image\/[a-z0-9+.-]+;base64,/i;
const HEAVY_KEY_RE = /banner|hero|image|logo|photo|avatar|icon|og_/i;
const MAX_PLAIN_CHARS = 12_000;

function looksLikeDataUri(value: string): boolean {
  const trimmed = value.trim().replace(/^"+|"+$/g, "");
  return DATA_URI_RE.test(trimmed) || trimmed.startsWith("data:image/");
}

function scrubJsonMedia(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    const scrubbed = scrubUnknown(parsed);
    return JSON.stringify(scrubbed);
  } catch {
    return looksLikeDataUri(raw) ? "" : raw.slice(0, MAX_PLAIN_CHARS);
  }
}

function scrubUnknown(value: unknown): unknown {
  if (typeof value === "string") {
    if (looksLikeDataUri(value) || value.length > MAX_PLAIN_CHARS) {
      return looksLikeDataUri(value) ? "" : value.slice(0, MAX_PLAIN_CHARS);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(scrubUnknown);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "string" && looksLikeDataUri(v)) {
        out[k] = "";
        continue;
      }
      out[k] = scrubUnknown(v);
    }
    return out;
  }
  return value;
}

/**
 * Remove embedded data-URI images from settings maps before they enter React Query / SSR.
 * Keeps http(s) CDN URLs intact.
 */
export function sanitizeSiteSettings(
  map: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!map) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(map)) {
    if (typeof value === "string") {
      if (looksLikeDataUri(value)) {
        out[key] = HEAVY_KEY_RE.test(key) ? "" : scrubJsonMedia(value);
        continue;
      }
      if (value.length > MAX_PLAIN_CHARS && (value.includes("{") || value.includes("["))) {
        out[key] = scrubJsonMedia(value);
        continue;
      }
      if (value.length > MAX_PLAIN_CHARS && HEAVY_KEY_RE.test(key)) {
        out[key] = "";
        continue;
      }
      out[key] = value;
      continue;
    }
    out[key] = scrubUnknown(value);
  }
  return out;
}

/** Drop data-URI product/hero image URLs so browsers don't download megabyte strings. */
export function sanitizeImageUrl(url: string | null | undefined): string {
  const clean = (url || "").trim();
  if (!clean || looksLikeDataUri(clean)) return "";
  return clean;
}
