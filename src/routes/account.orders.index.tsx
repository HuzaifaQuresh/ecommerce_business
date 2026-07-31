import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchOrdersWithItems } from "@/api/orders";
import { useAuth } from "@/hooks/useAuth";
import { fmtPKR } from "@/lib/format";
import { formatDeliveryDate } from "@/lib/order-fulfillment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, SectionCard } from "@/components/site/PageLayout";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import {
  Package,
  ShoppingBag,
  ChevronRight,
  Calendar,
  MapPin,
  Search,
  ArrowRight,
  Filter,
} from "lucide-react";

export const Route = createFileRoute("/account/orders/")({
  component: AccountOrders,
});

function AccountOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lookupQuery, setLookupQuery] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["my-orders-full", user?.id, user?.email],
    enabled: true,
    queryFn: () => fetchOrdersWithItems(user ? { userId: user.id, email: user.email } : undefined),
  });

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;
    const clean = lookupQuery.trim();
    navigate({ to: "/account/orders/$orderId", params: { orderId: clean } });
  };

  const filteredOrders = (data ?? []).filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    const matchId = o.id.toLowerCase().includes(q);
    const matchEmail = o.email?.toLowerCase().includes(q);
    const matchName = o.customer_name?.toLowerCase().includes(q);
    const matchItems = o.items.some((i) => i.title.toLowerCase().includes(q));
    return matchId || matchEmail || matchName || matchItems;
  });

  return (
    <div className="space-y-6">
      {/* Quick Lookup / Tracking Bar */}
      <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Track Order by Order ID
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Have an Order ID from receipt or email? Enter it below to check instant tracking
              status.
            </p>
          </div>
        </div>
        <form onSubmit={handleTrackSubmit} className="flex gap-2">
          <Input
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            placeholder="Enter Order ID (e.g. ord-12345 or ORD-ABCD1234)"
            className="flex-1 min-h-[42px]"
          />
          <Button type="submit" size="default" className="gap-2 shrink-0">
            Track <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 rounded-xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : !data?.length ? (
        <EmptyState
          icon={Package}
          title={user ? "No past orders found" : "No orders found on this device"}
          description={
            user
              ? "When you place an order, your order history and tracking details will appear here."
              : "Use the track order bar above or sign in to sync your order history."
          }
          action={
            <Button asChild>
              <Link to="/products">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Browse catalog
              </Link>
            </Button>
          }
        />
      ) : (
        <SectionCard
          title={`Order history (${filteredOrders.length}${data.length !== filteredOrders.length ? ` of ${data.length}` : ""})`}
        >
          {/* Filters for multi-order lists */}
          {data.length > 1 && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4 pb-3 border-b">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={filterQuery}
                  onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Filter by product name, ID..."
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {["all", "pending", "processing", "dispatched", "delivered", "cancelled"].map(
                  (st) => (
                    <Button
                      key={st}
                      type="button"
                      variant={statusFilter === st ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatusFilter(st)}
                      className="capitalize text-xs h-8 px-2.5"
                    >
                      {st}
                    </Button>
                  ),
                )}
              </div>
            </div>
          )}

          {!filteredOrders.length ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No orders match your filter criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((o) => (
                <Link
                  key={o.id}
                  to="/account/orders/$orderId"
                  params={{ orderId: o.id }}
                  className="block rounded-xl border bg-background p-4 sm:p-5 hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground font-semibold">
                          #{o.id.slice(0, 10).toUpperCase()}
                        </span>
                        <OrderStatusBadge status={o.status} />
                      </div>
                      <p className="font-semibold text-lg mt-2">{fmtPKR(Number(o.total_pkr))}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {o.items.length} item{o.items.length !== 1 ? "s" : ""}
                        {o.items[0] && ` · ${o.items[0].title}${o.items.length > 1 ? "…" : ""}`}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Est. {formatDeliveryDate(o.expected_delivery_at, o.delivery_method)}
                        </span>
                        {(o.city || o.province) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {o.city}
                            {o.province ? `, ${o.province}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0 self-center" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
