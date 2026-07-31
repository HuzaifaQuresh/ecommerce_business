import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchOrderWithItems } from "@/api/orders";
import { OrderDetailView } from "@/components/orders/OrderDetailView";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/account/orders/$orderId")({
  component: AccountOrderDetail,
});

function AccountOrderDetail() {
  const { orderId } = Route.useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => fetchOrderWithItems(orderId),
  });

  if (isLoading) {
    return <div className="h-40 rounded-xl border bg-muted/30 animate-pulse" />;
  }

  if (isError || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Order not found.</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/account/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  return <OrderDetailView order={data} backTo="/account/orders" backLabel="Back to orders" />;
}
