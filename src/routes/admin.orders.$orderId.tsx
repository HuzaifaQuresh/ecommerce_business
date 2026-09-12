import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  deleteOrder,
  fetchOrderWithItems,
  updateOrderItemFulfillment,
  updateOrderStatus,
  updateOrderTracking,
} from "@/api/orders";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { ItemFulfillmentStatus, OrderStatus } from "@/lib/order-fulfillment";
import { fmtPKR } from "@/lib/format";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/orders/$orderId")({
  component: AdminOrderDetail,
});

const STATUSES: OrderStatus[] = ["pending", "processing", "shipped", "delivered", "cancelled"];

function AdminOrderDetail() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => fetchOrderWithItems(orderId),
  });

  const remove = useMutation({
    mutationFn: () => deleteOrder(orderId),
    onSuccess: () => {
      toast.success("Order deleted from the log");
      void qc.invalidateQueries({ queryKey: ["admin-orders"] });
      void qc.invalidateQueries({ queryKey: ["orders"] });
      void navigate({ to: "/admin/orders" });
    },
    onError: (error: Error) => toast.error(error.message || "Could not delete order"),
  });

  const onItemStatus = async (itemId: string, status: string) => {
    try {
      await updateOrderItemFulfillment(itemId, status as ItemFulfillmentStatus);
      toast.success("Line item updated");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  if (isLoading || !data) {
    return <div className="h-40 rounded-xl border bg-muted/30 animate-pulse" />;
  }

  const adminSlot = (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:p-5 space-y-4">
      <h3 className="font-semibold">Admin controls</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Order status</Label>
          <Select
            value={data.status}
            onValueChange={async (v) => {
              await updateOrderStatus(data.id, v as OrderStatus);
              toast.success("Order status updated");
              refetch();
              qc.invalidateQueries({ queryKey: ["admin-orders"] });
            }}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tracking number</Label>
          <form
            className="flex gap-2 mt-1.5"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await updateOrderTracking(data.id, {
                tracking_number: String(fd.get("tracking")),
              });
              toast.success("Tracking saved");
              refetch();
            }}
          >
            <Input
              name="tracking"
              defaultValue={data.tracking_number ?? ""}
              placeholder="NX-TRK-…"
            />
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Update each product line status above (pending → dispatched → in transit → delivered).
      </p>
      <div className="pt-2 border-t border-amber-500/20">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/40 hover:bg-destructive/10"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete order from log
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <OrderDetailView
        order={data}
        backTo="/admin/orders"
        backLabel="Back to orders"
        showAdminControls
        onItemStatusChange={onItemStatus}
        adminSlot={adminSlot}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently remove{" "}
              <span className="font-mono font-semibold">#{data.id.slice(0, 8).toUpperCase()}</span>{" "}
              for <strong>{data.customer_name}</strong> ({fmtPKR(Number(data.total_pkr))}). This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                remove.mutate();
              }}
            >
              {remove.isPending ? "Deleting…" : "Delete order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
