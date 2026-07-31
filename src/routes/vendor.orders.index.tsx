import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtPKR } from "@/lib/format";
import { formatDeliveryDate } from "@/lib/order-fulfillment";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { DashboardPageHeader, ResponsiveScroll } from "@/components/site/PageLayout";
import { MOCK_ORDERS, getVendorMockProducts } from "@/lib/mock-data";
import { fetchOrders, fetchOrdersWithItems } from "@/api/orders";
import { Eye, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/vendor/orders/")({ component: VendorOrders });

function VendorOrders() {
  const { vendorId } = Route.useRouteContext();

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-orders", vendorId],
    queryFn: async () => {
      try {
        if (vendorId) {
          // Find all product IDs belonging to this vendor
          let productIds: string[] = [];
          try {
            const { data: products, error } = await supabase
              .from("products")
              .select("id")
              .eq("vendor_id", vendorId);
            if (!error && products) {
              productIds = products.map((p) => p.id);
            }
          } catch {
            // ignore
          }

          // Fallback to mock products for vendor if database query fails or is empty
          if (productIds.length === 0) {
            productIds = getVendorMockProducts(vendorId).map((p) => p.id);
          }

          // Load all orders with items (seamlessly merges DB and Local Storage)
          const allOrders = await fetchOrdersWithItems();
          // Filter to only those containing this vendor's products
          return allOrders.filter((o) =>
            o.items.some((item) => item.product_id && productIds.includes(item.product_id)),
          );
        } else {
          // Staff preview — platform-wide with limit
          return await fetchOrders();
        }
      } catch (err) {
        console.warn("Error loading vendor orders:", err);
      }
      return MOCK_ORDERS;
    },
  });

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Orders"
        description={
          vendorId
            ? "Orders containing your catalog items (read-only)."
            : "Platform orders preview — assign vendor role to see your scoped orders."
        }
      />

      {isLoading ? (
        <div className="h-40 rounded-xl border bg-muted/30 animate-pulse" />
      ) : !data?.length ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center px-4">
          <ShoppingBag className="h-14 w-14 text-muted-foreground/25 mb-4" />
          <p className="font-semibold">No orders yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Orders containing your products will appear here once customers check out.
          </p>
        </div>
      ) : (
        <ResponsiveScroll>
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-3 font-semibold">Order</th>
                <th className="p-3 font-semibold">Customer</th>
                <th className="p-3 font-semibold">Ship to</th>
                <th className="p-3 font-semibold">Est. delivery</th>
                <th className="p-3 font-semibold">Total</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((o) => (
                <tr key={o.id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-mono text-xs">{o.id.slice(0, 8).toUpperCase()}</td>
                  <td className="p-3">
                    <div className="font-medium">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{o.phone}</div>
                  </td>
                  <td className="p-3 text-xs max-w-[180px]">
                    <div className="line-clamp-1">{o.address}</div>
                    <div className="text-muted-foreground">
                      {o.city}
                      {o.province ? `, ${o.province}` : ""}
                    </div>
                  </td>
                  <td className="p-3 text-xs whitespace-nowrap">
                    {formatDeliveryDate(
                      (o as any).expected_delivery_at,
                      (o as any).delivery_method,
                    )}
                  </td>
                  <td className="p-3 font-semibold tabular-nums">{fmtPKR(Number(o.total_pkr))}</td>
                  <td className="p-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="p-3">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/vendor/orders/$orderId" params={{ orderId: o.id }}>
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveScroll>
      )}
    </div>
  );
}
