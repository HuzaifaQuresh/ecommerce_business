import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchOrderWithItems, updateOrderItemFulfillment } from "@/api/orders";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getVendorMockProducts } from "@/lib/mock-data";

export const Route = createFileRoute("/vendor/orders/$orderId")({
  component: VendorOrderDetail,
});

function VendorOrderDetail() {
  const { orderId } = Route.useParams();
  const { vendorId } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendor-order-detail", orderId],
    queryFn: async () => {
      const order = await fetchOrderWithItems(orderId);
      if (!order) return null;
      if (vendorId) {
        // Filter out items that do not belong to this vendor
        let vendorProductIds = new Set<string>();
        try {
          const { data: vendorProducts } = await supabase
            .from("products")
            .select("id")
            .eq("vendor_id", vendorId);
          if (vendorProducts) {
            vendorProductIds = new Set(vendorProducts.map((p) => p.id));
          }
        } catch {
          // ignore
        }

        // Fallback to mock products if DB query is empty/fails
        if (vendorProductIds.size === 0) {
          const fallbackProducts = getVendorMockProducts(vendorId);
          vendorProductIds = new Set(fallbackProducts.map((p) => p.id));
        }

        order.items = order.items.filter((item) => vendorProductIds.has(item.product_id!));
      }
      return order;
    },
  });

  const updateItemStatus = useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: any }) => {
      await updateOrderItemFulfillment(itemId, status);
    },
    onSuccess: () => {
      toast.success("Item status updated");
      queryClient.invalidateQueries({ queryKey: ["vendor-order-detail", orderId] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update item status");
    },
  });

  if (isLoading) {
    return <div className="h-40 rounded-xl border bg-muted/30 animate-pulse" />;
  }

  if (isError || !data || data.items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Order not found or no items belong to you.</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/vendor/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <OrderDetailView
      order={data}
      backTo="/vendor/orders"
      backLabel="Back to vendor orders"
      showAdminControls={true}
      onItemStatusChange={(itemId, status) => {
        updateItemStatus.mutate({ itemId, status });
      }}
    />
  );
}
