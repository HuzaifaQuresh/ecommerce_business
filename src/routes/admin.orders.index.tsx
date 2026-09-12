import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteOrder, fetchOrders, updateOrderStatus } from "@/api/orders";
import { supabase } from "@/integrations/supabase/client";
import { fmtPKR } from "@/lib/format";
import { formatDeliveryDate, type OrderStatus } from "@/lib/order-fulfillment";
import { paymentMethodLabel, recalculateOrderTotal } from "@/lib/order-payment";
import { DashboardPageHeader, ResponsiveScroll } from "@/components/site/PageLayout";
import { OrderStatusSelect } from "@/components/orders/OrderStatusSelect";
import { Eye, Search, Trash2 } from "lucide-react";
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

export const Route = createFileRoute("/admin/orders/")({
  component: Orders,
});

const ALL_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

function Orders() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
    total: number;
  } | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("public:orders_admin_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
          queryClient.invalidateQueries({ queryKey: ["orders"] });
        },
      )
      .subscribe();

    const handleOrdersUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    };
    window.addEventListener("nexus-orders-update", handleOrdersUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("nexus-orders-update", handleOrdersUpdate);
    };
  }, [queryClient]);

  const { data } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => fetchOrders(),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteOrder(id),
    onSuccess: () => {
      toast.success("Order deleted from the log");
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not delete order");
    },
  });

  const changeStatus = async (orderId: string, status: OrderStatus) => {
    setSavingId(orderId);
    try {
      await updateOrderStatus(orderId, status);
      toast.success("Order status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setSavingId(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((o) => {
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      if (q) {
        const haystack = [
          o.customer_name,
          o.phone,
          o.id,
          o.city,
          o.address,
          o.payment_method,
          paymentMethodLabel(o.payment_method),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [data, search, filterStatus]);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Orders"
        description="Change dispatch status inline. Delete removes the order log permanently. Open Details for payment breakdown, tracking, and print."
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, phone, order ID, payment…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="block md:hidden space-y-4">
        {filtered.map((o) => {
          const calc = recalculateOrderTotal(o);
          return (
            <div key={o.id} className="bg-card border rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  #{o.id.slice(0, 8).toUpperCase()}
                </span>
                <OrderStatusSelect
                  value={o.status}
                  disabled={savingId === o.id}
                  onChange={(status) => changeStatus(o.id, status)}
                />
              </div>
              <div>
                <div className="font-medium text-foreground">{o.customer_name}</div>
                <div className="text-xs text-muted-foreground">{o.phone}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Pay: {paymentMethodLabel(o.payment_method)}
                  {Number(o.payment_fee_pkr) > 0
                    ? ` · fee ${fmtPKR(Number(o.payment_fee_pkr))}`
                    : ""}
                </div>
              </div>
              <div className="text-xs text-muted-foreground border-t pt-2 space-y-1">
                <div>
                  <span className="font-medium text-foreground">Ship to:</span> {o.address}, {o.city}
                </div>
                <div>
                  <span className="font-medium text-foreground">Est. Delivery:</span>{" "}
                  {formatDeliveryDate((o as any).expected_delivery_at, (o as any).delivery_method)}
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t gap-2">
                <div>
                  <span className="text-xs text-muted-foreground">Total:</span>{" "}
                  <span className="font-semibold text-foreground">{fmtPKR(calc.stored)}</span>
                  {!calc.matches ? (
                    <span className="block text-[10px] text-amber-700">
                      Calc {fmtPKR(calc.expected)}
                    </span>
                  ) : null}
                </div>
                <div className="flex gap-1.5">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin/orders/$orderId" params={{ orderId: o.id }}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Details
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/40"
                    disabled={remove.isPending}
                    onClick={() =>
                      setPendingDelete({
                        id: o.id,
                        name: o.customer_name,
                        total: Number(o.total_pkr),
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        {!filtered.length && (
          <div className="p-10 text-center text-muted-foreground bg-card border rounded-xl">
            {search || filterStatus !== "all" ? "No orders match your filters." : "No orders yet."}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        <ResponsiveScroll>
          <table className="w-full text-sm min-w-[1040px]">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-3 font-semibold">Order</th>
                <th className="p-3 font-semibold">Customer</th>
                <th className="p-3 font-semibold">Ship to</th>
                <th className="p-3 font-semibold">Payment</th>
                <th className="p-3 font-semibold">Est. delivery</th>
                <th className="p-3 font-semibold">Total</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const calc = recalculateOrderTotal(o);
                return (
                  <tr key={o.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-mono text-xs">{o.id.slice(0, 8).toUpperCase()}</td>
                    <td className="p-3">
                      <div className="font-medium">{o.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{o.phone}</div>
                    </td>
                    <td className="p-3 text-xs max-w-[200px]">
                      <div className="line-clamp-2">{o.address}</div>
                      <div className="text-muted-foreground">
                        {o.city}
                        {(o as any).province ? `, ${(o as any).province}` : ""}
                      </div>
                    </td>
                    <td className="p-3 text-xs">
                      <div className="font-medium text-foreground">
                        {paymentMethodLabel(o.payment_method)}
                      </div>
                      <div className="text-muted-foreground mt-0.5 space-y-0.5">
                        {Number(o.tax_pkr) > 0 ? <div>Tax {fmtPKR(Number(o.tax_pkr))}</div> : null}
                        {Number(o.payment_fee_pkr) > 0 ? (
                          <div>Fee {fmtPKR(Number(o.payment_fee_pkr))}</div>
                        ) : null}
                        {Number(o.discount_pkr) > 0 ? (
                          <div>−{fmtPKR(Number(o.discount_pkr))} disc.</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-3 text-xs whitespace-nowrap">
                      {formatDeliveryDate(
                        (o as any).expected_delivery_at,
                        (o as any).delivery_method,
                      )}
                    </td>
                    <td className="p-3 font-semibold tabular-nums">
                      <div>{fmtPKR(calc.stored)}</div>
                      {!calc.matches ? (
                        <div className="text-[10px] font-normal text-amber-700">
                          Expected {fmtPKR(calc.expected)}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <OrderStatusSelect
                        value={o.status}
                        disabled={savingId === o.id}
                        onChange={(status) => changeStatus(o.id, status)}
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1.5">
                        <Button asChild variant="outline" size="sm">
                          <Link to="/admin/orders/$orderId" params={{ orderId: o.id }}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Details
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/40 hover:bg-destructive/10"
                          disabled={remove.isPending}
                          onClick={() =>
                            setPendingDelete({
                              id: o.id,
                              name: o.customer_name,
                              total: Number(o.total_pkr),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-muted-foreground">
                    {search || filterStatus !== "all"
                      ? "No orders match your filters."
                      : "No orders yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ResponsiveScroll>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete order from log?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes order{" "}
              <span className="font-mono font-semibold">
                #{pendingDelete?.id.slice(0, 8).toUpperCase()}
              </span>{" "}
              for <strong>{pendingDelete?.name}</strong> ({fmtPKR(pendingDelete?.total ?? 0)}). Line
              items are removed and reserved stock is restored when applicable. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending || !pendingDelete}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) remove.mutate(pendingDelete.id);
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
