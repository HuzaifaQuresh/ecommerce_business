import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOrders } from "@/api/orders";
import { fmtPKR } from "@/lib/format";
import { formatDeliveryDate } from "@/lib/order-fulfillment";
import { DashboardPageHeader, ResponsiveScroll } from "@/components/site/PageLayout";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { MOCK_ORDERS } from "@/lib/mock-data";
import { Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/orders/")({
  component: Orders,
});

const ALL_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

function Orders() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      try {
        const list = await fetchOrders();
        if (list.length) return list;
      } catch {
        /* demo */
      }
      return MOCK_ORDERS;
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((o) => {
      if (filterStatus !== "all" && o.status !== filterStatus) return false;
      if (q) {
        const haystack = [o.customer_name, o.phone, o.id, o.city, o.address]
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
        description="Shipping addresses, line items, dispatch status, and expected delivery dates."
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, phone, order ID…"
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

      <ResponsiveScroll>
        <table className="w-full text-sm min-w-[900px]">
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
            {filtered.map((o) => (
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
                <td className="p-3 text-xs whitespace-nowrap">
                  {formatDeliveryDate((o as any).expected_delivery_at, (o as any).delivery_method)}
                </td>
                <td className="p-3 font-semibold tabular-nums">{fmtPKR(Number(o.total_pkr))}</td>
                <td className="p-3">
                  <OrderStatusBadge status={o.status} />
                </td>
                <td className="p-3">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/admin/orders/$orderId" params={{ orderId: o.id }}>
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Details
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="p-10 text-center text-muted-foreground">
                  {search || filterStatus !== "all"
                    ? "No orders match your filters."
                    : "No orders yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </ResponsiveScroll>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {data?.length ?? 0} orders.
      </p>
    </div>
  );
}
