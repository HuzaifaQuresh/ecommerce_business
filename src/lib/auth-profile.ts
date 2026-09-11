import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function metaString(meta: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function isEmailLikeHandle(value: string, email?: string | null): boolean {
  const v = value.trim();
  if (!v) return true;
  if (v.includes("@")) return true;
  const local = email?.split("@")[0]?.trim().toLowerCase() ?? "";
  return Boolean(local) && v.toLowerCase() === local;
}

function metadataDisplayName(user: User): string {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const given = metaString(meta, "given_name");
  const family = metaString(meta, "family_name");
  const combined = [given, family].filter(Boolean).join(" ");
  const fromMeta = metaString(meta, "full_name", "name", "display_name") || combined;
  if (fromMeta) return fromMeta;
  for (const identity of user.identities ?? []) {
    const data = (identity.identity_data ?? {}) as Record<string, unknown>;
    const idGiven = metaString(data, "given_name");
    const idFamily = metaString(data, "family_name");
    const idName =
      metaString(data, "full_name", "name", "display_name") || [idGiven, idFamily].filter(Boolean).join(" ");
    if (idName) return idName;
  }
  return "";
}

/** Storefront name — never the email or email prefix. */
export function displayNameFromUser(user: User | null | undefined, profileName?: string | null): string {
  if (!user) return "";
  const candidates = [profileName, metadataDisplayName(user)];
  for (const raw of candidates) {
    const name = (raw || "").replace(/\s+/g, " ").trim();
    if (name && !isEmailLikeHandle(name, user.email)) return name;
  }
  return "Customer";
}

export function shortDisplayName(fullName: string): string {
  const first = String(fullName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0];
  return first || "Customer";
}

export function initialsFromDisplayName(name: string): string {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "SZ";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Creates/updates the storefront profile after email or Google sign-in. */
export async function ensureAuthProfile(user: User | null | undefined) {
  if (!user) return;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fromMeta = metadataDisplayName(user);
  const realName = fromMeta && !isEmailLikeHandle(fromMeta, user.email) ? fromMeta : "";
  const avatarUrl = metaString(meta, "avatar_url", "picture") || null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  const existingName = String(existing?.full_name ?? "").trim();
  const keepExisting = existingName && !isEmailLikeHandle(existingName, user.email);
  const fullName = realName || (keepExisting ? existingName : null);

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      ...(fullName ? { full_name: fullName } : {}),
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: "id" },
  );
  if (error) {
    console.warn("[auth] profile sync skipped:", error.message);
  }
}

export async function loadProfileDisplayName(userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return String(data?.full_name ?? "").trim();
}
