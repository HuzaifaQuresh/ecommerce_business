import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearAuditLogs, deleteAuditLog, fetchAuditLogs } from "@/api/audit";
import {
  auditActionLabel,
  auditCategory,
  formatAuditSummary,
  type AuditLogRow,
} from "@/lib/audit";
import { fmtPKR } from "@/lib/format";
import { paymentMethodLabel } from "@/lib/order-payment";
import { DashboardPageHeader, EmptyState, ResponsiveScroll, SectionCard } from "@/components/site/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ClipboardList,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/audit")({
  component: AdminAuditPage,
});

const ACTION_FILTERS = [
  "all",
  "ORDER_STATUS_CHANGE",
  "ORDER_DELETE",
  "ORDER_TRACKING_UPDATE",
  "ROLE_CHANGE",
  "USER_DELETE",
  "USER_DISABLE",
  "USER_RESTORE",
  "AUDIT_CLEAR",
] as const;

function categoryBadge(action: string) {
  const cat = auditCategory(action);
  const styles: Record<string, string> = {
    orders: "bg-sky-100 text-sky-900 border-sky-200",
    users: "bg-violet-100 text-violet-900 border-violet-200",
    commerce: "bg-amber-100 text-amber-950 border-amber-200",
    system: "bg-slate-100 text-slate-800 border-slate-200",
  };
  return (
    <Badge variant="outline" className={cn("capitalize text-[10px]", styles[cat])}>
      {cat}
    </Badge>
  );
}

function metaBits(log: AuditLogRow) {
  const meta = log.metadata || {};
  const bits: string[] = [];
  if (typeof meta.customer_name === "string") bits.push(meta.customer_name);
  if (typeof meta.customer === "string") bits.push(meta.customer);
  if (typeof meta.email === "string") bits.push(meta.email);
  if (typeof meta.payment_method === "string") {
    bits.push(paymentMethodLabel(meta.payment_method));
  }
  if (meta.total_pkr != null && Number.isFinite(Number(meta.total_pkr))) {
    bits.push(fmtPKR(Number(meta.total_pkr)));
  }
  if (typeof meta.tracking_number === "string" && meta.tracking_number) {
    bits.push(`Track ${meta.tracking_number}`);
  }
  return bits;
}

function AdminAuditPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | "orders" | "users" | "commerce" | "system">(
    "all",
  );
  const [action, setAction] = useState<string>("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const audit = useQuery({
    queryKey: ["admin-audit-logs", category, action],
    queryFn: () =>
      fetchAuditLogs({
        limit: 200,
        category,
        action: action === "all" ? undefined : action,
      }),
    staleTime: 10_000,
  });

  useEffect(() => {
    const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    window.addEventListener("nexus-audit-update", refresh);
    return () => window.removeEventListener("nexus-audit-update", refresh);
  }, [qc]);

  const remove = useMutation({
    mutationFn: (id: string) => deleteAuditLog(id),
    onSuccess: () => {
      toast.success("Audit entry deleted");
      setPendingDelete(null);
      void qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      void qc.invalidateQueries({ queryKey: ["admin-users-audit"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete entry"),
  });

  const clearAll = useMutation({
    mutationFn: () => clearAuditLogs(),
    onSuccess: (count) => {
      toast.success(count ? `Cleared ${count} entries` : "Audit log already empty");
      setConfirmClear(false);
      void qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not clear audit log"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = audit.data ?? [];
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        formatAuditSummary(row),
        row.action,
        row.actor_role,
        row.entity_id,
        JSON.stringify(row.metadata ?? {}),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [audit.data, search]);

  const counts = useMemo(() => {
    const rows = audit.data ?? [];
    return {
      total: rows.length,
      orders: rows.filter((r) => auditCategory(r.action) === "orders").length,
      users: rows.filter((r) => auditCategory(r.action) === "users").length,
    };
  }, [audit.data]);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Audit trail"
        description="Immutable-style activity log for orders, payments metadata, roles, and destructive admin actions."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void audit.refetch()}
              disabled={audit.isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${audit.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/40"
              disabled={!filtered.length || clearAll.isPending}
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear all
            </Button>
          </div>
        }
      />

      <div className="grid sm:grid-cols-3 gap-3">
        <SectionCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Loaded</p>
          <p className="text-2xl font-bold tabular-nums mt-1">{counts.total}</p>
        </SectionCard>
        <SectionCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            Order events
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">{counts.orders}</p>
        </SectionCard>
        <SectionCard className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
            User events
          </p>
          <p className="text-2xl font-bold tabular-nums mt-1">{counts.users}</p>
        </SectionCard>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search summary, order ID, customer, payment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
          <SelectTrigger className="w-full lg:w-44">
            <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            <SelectItem value="orders">Orders & payment</SelectItem>
            <SelectItem value="users">Users & roles</SelectItem>
            <SelectItem value="commerce">Commerce</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-full lg:w-56">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_FILTERS.map((a) => (
              <SelectItem key={a} value={a}>
                {a === "all" ? "All actions" : auditActionLabel(a)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {audit.isError ? (
        <SectionCard>
          <p className="text-sm text-destructive">{(audit.error as Error).message}</p>
        </SectionCard>
      ) : !filtered.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No audit events yet"
          description="Status changes, order deletes, tracking updates, and role actions will appear here automatically."
        />
      ) : (
        <SectionCard className="p-0 overflow-hidden">
          <ResponsiveScroll>
            <table className="w-full text-sm min-w-[960px]">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="p-3 font-semibold">When</th>
                  <th className="p-3 font-semibold">Actor</th>
                  <th className="p-3 font-semibold">Event</th>
                  <th className="p-3 font-semibold">Details</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const bits = metaBits(log);
                  const orderId =
                    (typeof log.metadata?.order_id === "string" && log.metadata.order_id) ||
                    (log.entity_type === "order" ? log.entity_id : null);
                  return (
                    <tr key={log.id} className="border-t hover:bg-muted/20 align-top">
                      <td className="p-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString("en-PK", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold capitalize">
                          <Shield className="h-3.5 w-3.5 text-primary" />
                          {(log.actor_role || "system").replace(/_/g, " ")}
                        </div>
                      </td>
                      <td className="p-3 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {categoryBadge(log.action)}
                          <span className="text-xs font-semibold">{auditActionLabel(log.action)}</span>
                        </div>
                        {(log.old_role || log.new_role) && (
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {log.old_role || "—"} → {log.new_role || "—"}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-medium leading-snug">{formatAuditSummary(log)}</p>
                        {bits.length ? (
                          <p className="text-[11px] text-muted-foreground mt-1">{bits.join(" · ")}</p>
                        ) : null}
                        {orderId && log.action !== "ORDER_DELETE" ? (
                          <Link
                            to="/admin/orders/$orderId"
                            params={{ orderId }}
                            className="inline-block mt-1 text-[11px] font-semibold text-primary hover:underline"
                          >
                            Open order #{orderId.slice(0, 8).toUpperCase()}
                          </Link>
                        ) : null}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive"
                          disabled={remove.isPending}
                          onClick={() => setPendingDelete(log.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ResponsiveScroll>
        </SectionCard>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this audit entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Removes a single log row. Operational data (orders, users) is not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) remove.mutate(pendingDelete);
              }}
            >
              Delete entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the entire audit trail?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes loaded audit entries. A single AUDIT_CLEAR event will be
              written afterward for accountability.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearAll.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={clearAll.isPending}
              onClick={(e) => {
                e.preventDefault();
                clearAll.mutate();
              }}
            >
              {clearAll.isPending ? "Clearing…" : "Clear all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
