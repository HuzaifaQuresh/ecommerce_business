import { supabase } from "@/integrations/supabase/client";
import { normalizeRole } from "@/lib/roles";
import type { AppRole } from "@/types/commerce";

export const PLATFORM_OWNER_EMAILS = ["huzaifaqur67@gmail.com"];

export function isPlatformOwnerEmail(email?: string | null): boolean {
  return PLATFORM_OWNER_EMAILS.includes((email ?? "").trim().toLowerCase());
}

export function applyOwnerSuperAdmin(roles: AppRole[], email?: string | null): AppRole[] {
  const list = roles.length ? roles : (["user"] as AppRole[]);
  if (!isPlatformOwnerEmail(email) || list.includes("super_admin")) return list;
  return ["super_admin", ...list.filter((role) => role !== "user")];
}

export async function loadUserRoles(userId: string, email?: string | null): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) {
    console.error("[auth] failed to load roles", error.message);
    return applyOwnerSuperAdmin([], email);
  }
  const list = (data ?? [])
    .map((row) => normalizeRole(row.role as string))
    .filter((role): role is AppRole => role !== null);
  return applyOwnerSuperAdmin(list, email);
}
