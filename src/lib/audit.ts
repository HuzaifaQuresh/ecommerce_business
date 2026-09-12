import { supabase } from "@/integrations/supabase/client";
import { loadUserRoles } from "@/lib/auth-roles";

export type AuditAction =
  | "ROLE_CHANGE"
  | "USER_DISABLE"
  | "USER_RESTORE"
  | "USER_DELETE"
  | "ORDER_STATUS_CHANGE"
  | "ORDER_DELETE"
  | "ORDER_TRACKING_UPDATE"
  | "PRODUCT_UPDATE"
  | "SETTINGS_UPDATE"
  | "INBOX_DELETE"
  | "VOUCHER_UPDATE"
  | "AUDIT_CLEAR";

export type AuditEntityType =
  | "order"
  | "user"
  | "product"
  | "settings"
  | "inbox"
  | "voucher"
  | "audit"
  | "system";

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_role: string;
  target_user_id: string | null;
  action: string;
  old_role: string | null;
  new_role: string | null;
  entity_type: string | null;
  entity_id: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type WriteAuditInput = {
  action: AuditAction | string;
  oldValue?: string | null;
  newValue?: string | null;
  targetUserId?: string | null;
  entityType?: AuditEntityType | string;
  entityId?: string | null;
  summary?: string;
  metadata?: Record<string, unknown>;
};

const ACTION_LABELS: Record<string, string> = {
  ROLE_CHANGE: "Role change",
  USER_DISABLE: "Account disabled",
  USER_RESTORE: "Account restored",
  USER_DELETE: "Account deleted",
  ORDER_STATUS_CHANGE: "Order status",
  ORDER_DELETE: "Order deleted",
  ORDER_TRACKING_UPDATE: "Tracking updated",
  PRODUCT_UPDATE: "Product updated",
  SETTINGS_UPDATE: "Settings updated",
  INBOX_DELETE: "Inbox message deleted",
  VOUCHER_UPDATE: "Voucher updated",
  AUDIT_CLEAR: "Audit log cleared",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatAuditSummary(log: AuditLogRow): string {
  if (log.summary?.trim()) return log.summary.trim();

  const meta = log.metadata || {};
  const email = typeof meta.email === "string" ? meta.email : "";
  const orderId =
    typeof meta.order_id === "string"
      ? meta.order_id
      : log.entity_id || "";
  const shortOrder = orderId ? `#${orderId.slice(0, 8).toUpperCase()}` : "";

  switch (log.action) {
    case "ROLE_CHANGE":
      return `Role ${log.old_role || "?"} → ${log.new_role || "?"}${email ? ` · ${email}` : ""}`;
    case "USER_DISABLE":
      return `Disabled login${email ? ` · ${email}` : ""}`;
    case "USER_RESTORE":
      return `Restored access${email ? ` · ${email}` : ""}`;
    case "USER_DELETE":
      return `Deleted account${email ? ` · ${email}` : ""}`;
    case "ORDER_STATUS_CHANGE":
      return `Order ${shortOrder} status ${log.old_role || "?"} → ${log.new_role || "?"}`;
    case "ORDER_DELETE":
      return `Deleted order ${shortOrder}${typeof meta.customer === "string" ? ` · ${meta.customer}` : ""}`;
    case "ORDER_TRACKING_UPDATE":
      return `Tracking updated on ${shortOrder}`;
    default:
      return auditActionLabel(log.action);
  }
}

export function auditCategory(action: string): "orders" | "users" | "commerce" | "system" {
  if (action.startsWith("ORDER_")) return "orders";
  if (action.startsWith("USER_") || action === "ROLE_CHANGE") return "users";
  if (action === "PRODUCT_UPDATE" || action === "VOUCHER_UPDATE" || action === "INBOX_DELETE") {
    return "commerce";
  }
  return "system";
}

/**
 * Write a professional audit event. Never throws to callers — logging must not break ops.
 */
export async function writeAuditEvent(input: WriteAuditInput): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let actorRole = "admin";
    if (user?.id) {
      try {
        const roles = await loadUserRoles(user.id, user.email);
        if (roles.includes("super_admin")) actorRole = "super_admin";
        else if (roles.includes("admin")) actorRole = "admin";
        else if (roles[0]) actorRole = roles[0];
      } catch {
        /* keep default */
      }
    }

    const summary =
      input.summary ||
      formatAuditSummary({
        id: "",
        actor_id: user?.id ?? null,
        actor_role: actorRole,
        target_user_id: input.targetUserId ?? null,
        action: input.action,
        old_role: input.oldValue ?? null,
        new_role: input.newValue ?? null,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        summary: null,
        metadata: input.metadata ?? {},
        created_at: new Date().toISOString(),
      });

    const row = {
      actor_id: user?.id ?? null,
      actor_role: actorRole,
      target_user_id: input.targetUserId ?? null,
      action: input.action,
      old_role: input.oldValue ?? null,
      new_role: input.newValue ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      summary,
      metadata: input.metadata ?? {},
    };

    const { error } = await supabase.from("audit_logs" as any).insert(row);
    if (error) {
      // Local fallback for offline / mock
      if (typeof window !== "undefined") {
        const existing = JSON.parse(localStorage.getItem("nexus_audit_logs") || "[]");
        localStorage.setItem(
          "nexus_audit_logs",
          JSON.stringify([
            {
              id: crypto.randomUUID(),
              ...row,
              created_at: new Date().toISOString(),
            },
            ...existing,
          ].slice(0, 500)),
        );
        window.dispatchEvent(new Event("nexus-audit-update"));
      }
      console.warn("audit write failed", error.message);
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("nexus-audit-update"));
    }
  } catch (err) {
    console.warn("audit write skipped", err);
  }
}
