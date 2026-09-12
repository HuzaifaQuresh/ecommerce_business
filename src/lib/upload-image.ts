import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

const BUCKET = "product-images";
const DATA_URI_RE = /^data:image\/[a-z0-9+.-]+;base64,/i;

function extFromMime(mime: string): string {
  if (mime.includes("webp")) return "webp";
  if (mime.includes("png")) return "png";
  if (mime.includes("avif")) return "avif";
  if (mime.includes("gif")) return "gif";
  return "jpg";
}

function safeName(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "image"
  );
}

export function isDataUri(url: string | null | undefined): boolean {
  return Boolean(url && DATA_URI_RE.test(url.trim()));
}

export async function dataUriToBlob(dataUri: string): Promise<Blob> {
  const res = await fetch(dataUri);
  if (!res.ok) throw new Error("Could not read image data");
  return res.blob();
}

function isAuthExpiryError(message: string): boolean {
  return /exp["']?\s*claim|timestamp check failed|jwt expired|invalid jwt|session.*expired|not authenticated|unauthorized|401/i.test(
    message,
  );
}

/**
 * Ensure we have a non-expired access token before Storage uploads.
 * Stale local sessions commonly produce: "exp" claim timestamp check failed.
 */
async function ensureFreshSession(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Please sign in again, then upload the image.");
  }

  const expiresAt = session.expires_at ?? 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const needsRefresh = !expiresAt || expiresAt <= nowSec + 90;

  if (needsRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      throw new Error("Session expired. Sign in again, then re-upload the image.");
    }
    return;
  }

  // Proactively validate with Auth — catches clock skew / revoked tokens early
  const { error: userError } = await supabase.auth.getUser();
  if (userError && isAuthExpiryError(userError.message)) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      throw new Error("Session expired. Sign in again, then re-upload the image.");
    }
  }
}

/**
 * Upload a compressed image blob to Supabase Storage and return a public HTTPS URL.
 * Base64 data-URIs must never be persisted in site_settings.
 */
export async function uploadImageBlob(
  blob: Blob,
  opts?: { folder?: string; fileName?: string },
): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured — cannot upload images");
  }

  await ensureFreshSession();

  const folder = (opts?.folder || "merch").replace(/^\/+|\/+$/g, "");
  const mime = blob.type || "image/webp";
  const ext = extFromMime(mime);
  const base = safeName(opts?.fileName || `img-${Date.now()}`);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}.${ext}`;

  const attemptUpload = async () =>
    supabase.storage.from(BUCKET).upload(path, blob, {
      cacheControl: "31536000",
      upsert: false,
      contentType: mime,
    });

  let { error } = await attemptUpload();

  if (error && isAuthExpiryError(error.message)) {
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !data.session?.access_token) {
      throw new Error("Session expired. Sign in again, then re-upload the image.");
    }
    ({ error } = await attemptUpload());
  }

  if (error) {
    if (isAuthExpiryError(error.message)) {
      throw new Error("Session expired. Sign in again, then re-upload the image.");
    }
    throw new Error(error.message || "Image upload failed");
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error("Upload succeeded but public URL is missing");
  }
  return data.publicUrl;
}

/** Walk settings payloads and convert any embedded data-URIs into CDN URLs. */
export async function materializeDataUrisInValue(value: unknown): Promise<unknown> {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!isDataUri(trimmed)) return value;
    const blob = await dataUriToBlob(trimmed);
    return uploadImageBlob(blob, { folder: "merch", fileName: "settings-image" });
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      out.push(await materializeDataUrisInValue(item));
    }
    return out;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = await materializeDataUrisInValue(v);
    }
    return out;
  }
  return value;
}
