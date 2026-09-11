import { supabase } from "@/integrations/supabase/client";
import { ROLE_CATALOG, normalizeRole } from "@/lib/roles";
import type { AppRole } from "@/types/commerce";

export type StaffUser = {
  user_id: string;
  role: AppRole;
  name: string;
  email: string;
  phone: string | null;
  created_at?: string;
  is_disabled: boolean;
};

export type StaffRemovalMode = "disable" | "restore" | "delete";

function asRole(value: unknown): AppRole {
  return normalizeRole(String(value ?? "")) ?? "user";
}

function rpcError(error: { message?: string } | null | undefined, fallback: string) {
  const message = error?.message?.trim();
  return new Error(message || fallback);
}

export async function listStaffUsers(): Promise<StaffUser[]> {
  const { data, error } = await supabase.rpc("staff_list_users");
  if (error) throw rpcError(error, "Could not load users");
  if (!Array.isArray(data)) return [];

  return data.map((row: any) => ({
    user_id: String(row.user_id),
    email: String(row.email ?? ""),
    name: String(row.full_name || row.email || `User ${String(row.user_id).slice(0, 8)}`),
    phone: row.phone ? String(row.phone) : null,
    role: asRole(row.role),
    created_at: row.created_at ? String(row.created_at) : undefined,
    is_disabled: Boolean(row.is_disabled),
  }));
}

export async function removeStaffUser(userId: string, mode: StaffRemovalMode) {
  const { data, error } = await supabase.rpc("admin_remove_user", {
    _target_user_id: userId,
    _mode: mode,
  });
  if (error) throw rpcError(error, "Could not update this account");
  if (data && typeof data === "object" && "ok" in (data as object) && (data as { ok?: boolean }).ok === false) {
    throw new Error((data as { error?: string }).error || "Could not update this account");
  }
}

export async function assignUserRole(userId: string, role: AppRole) {
  if (!(role in ROLE_CATALOG)) throw new Error("Invalid role");
  const { data, error } = await supabase.rpc("admin_assign_role", {
    _target_user_id: userId,
    _new_role: role,
  });
  if (error) throw rpcError(error, "Could not update role");
  if (data && typeof data === "object" && "ok" in (data as object) && (data as { ok?: boolean }).ok === false) {
    throw new Error((data as { error?: string }).error || "Could not update role");
  }
}

export async function assignRoleByEmail(email: string, role: AppRole) {
  const cleaned = email.trim().toLowerCase();
  if (!cleaned) throw new Error("Enter an email address");
  const { data, error } = await supabase.rpc("staff_assign_role_by_email", {
    _email: cleaned,
    _new_role: role,
  });
  if (error) throw rpcError(error, "Could not update role");
  if (data && typeof data === "object" && "ok" in (data as object) && (data as { ok?: boolean }).ok === false) {
    throw new Error((data as { error?: string }).error || "Could not update role");
  }
  return data as { user_id?: string; old_role?: string; new_role?: string } | null;
}
