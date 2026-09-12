import { supabase } from "@/integrations/supabase/client";
import type { AuditLogRow } from "@/lib/audit";
import { writeAuditEvent } from "@/lib/audit";

export type FetchAuditOptions = {
  limit?: number;
  action?: string;
  category?: "all" | "orders" | "users" | "commerce" | "system";
  search?: string;
};

const ORDER_ACTIONS = ["ORDER_STATUS_CHANGE", "ORDER_DELETE", "ORDER_TRACKING_UPDATE"];
const USER_ACTIONS = ["ROLE_CHANGE", "USER_DISABLE", "USER_RESTORE", "USER_DELETE"];
const COMMERCE_ACTIONS = ["PRODUCT_UPDATE", "VOUCHER_UPDATE", "INBOX_DELETE", "SETTINGS_UPDATE"];

function categoryActions(category: FetchAuditOptions["category"]): string[] | null {
  if (!category || category === "all") return null;
  if (category === "orders") return ORDER_ACTIONS;
  if (category === "users") return USER_ACTIONS;
  if (category === "commerce") return COMMERCE_ACTIONS;
  return ["AUDIT_CLEAR", "SETTINGS_UPDATE"];
}

export async function fetchAuditLogs(opts: FetchAuditOptions = {}): Promise<AuditLogRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const actions = categoryActions(opts.category);

  try {
    let q = supabase
      .from("audit_logs" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (opts.action && opts.action !== "all") {
      q = q.eq("action", opts.action);
    } else if (actions) {
      q = q.in("action", actions);
    }

    const { data, error } = await q;
    if (error) throw error;

    let rows = (data ?? []) as AuditLogRow[];
    const search = opts.search?.trim().toLowerCase();
    if (search) {
      rows = rows.filter((row) => {
        const hay = [
          row.action,
          row.summary,
          row.actor_role,
          row.old_role,
          row.new_role,
          row.entity_id,
          row.entity_type,
          JSON.stringify(row.metadata ?? {}),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(search);
      });
    }
    return rows;
  } catch {
    if (typeof window === "undefined") return [];
    try {
      const raw = JSON.parse(localStorage.getItem("nexus_audit_logs") || "[]") as AuditLogRow[];
      return Array.isArray(raw) ? raw.slice(0, limit) : [];
    } catch {
      return [];
    }
  }
}

export async function deleteAuditLog(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("audit_logs" as any)
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data?.length) {
    // Local fallback
    if (typeof window !== "undefined") {
      const raw = JSON.parse(localStorage.getItem("nexus_audit_logs") || "[]") as AuditLogRow[];
      localStorage.setItem(
        "nexus_audit_logs",
        JSON.stringify(raw.filter((r) => r.id !== id)),
      );
      window.dispatchEvent(new Event("nexus-audit-update"));
      return;
    }
    throw new Error("Delete blocked — check admin permissions.");
  }
}

export async function clearAuditLogs(): Promise<number> {
  const { data, error } = await supabase
    .from("audit_logs" as any)
    .delete()
    .not("id", "is", null)
    .select("id");
  if (error) throw error;
  const count = data?.length ?? 0;

  if (typeof window !== "undefined") {
    localStorage.setItem("nexus_audit_logs", "[]");
    window.dispatchEvent(new Event("nexus-audit-update"));
  }

  if (count > 0) {
    await writeAuditEvent({
      action: "AUDIT_CLEAR",
      entityType: "audit",
      summary: `Cleared ${count} audit log entr${count === 1 ? "y" : "ies"}`,
      metadata: { cleared: count },
    });
  }

  return count;
}
