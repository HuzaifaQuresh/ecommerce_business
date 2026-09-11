import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtPKR } from "@/lib/format";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardPageHeader, SectionCard } from "@/components/site/PageLayout";
import {
  DollarSign,
  ShoppingBag,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getMockAnalytics } from "@/lib/mock-data";
import { fetchOrders } from "@/api/orders";
import { fetchTrafficStats } from "@/api/traffic";

export const Route = createFileRoute("/admin/analytics")({ component: AdminAnalytics });

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  processing: "#3b82f6",
  shipped: "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#ef4444",
};

function groupByMonth(orders: { created_at: string; total_pkr: number }[]) {
  const map: Record<string, { month: string; revenue: number; orders: number }> = {};
  for (const o of orders) {
    const d = new Date(o.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-PK", { month: "short", year: "2-digit" });
    if (!map[key]) map[key] = { month: label, revenue: 0, orders: 0 };
    map[key].revenue += Number(o.total_pkr);
    map[key].orders += 1;
  }
  return Object.values(map)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);
}

function AdminAnalytics() {
  const { data: traffic } = useQuery({
    queryKey: ["admin-traffic"],
    queryFn: () => fetchTrafficStats(),
    staleTime: 30_000,
    retry: 1,
  });

  const { data } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const orders = await fetchOrders();
      let productCategories: { category: string; id?: string; title?: string; vendor_id?: string | null; rating?: number | null }[] = [];
      let lineItems: { title: string; quantity: number; price_pkr: number; product_id: string | null }[] = [];
      try {
        const productsRes = await supabase.from("products").select("id,category,title,vendor_id,rating");
        productCategories = productsRes.data ?? [];
      } catch {
        /* catalog may still be local */
      }
      try {
        const itemsRes = await supabase
          .from("order_items")
          .select("title,quantity,price_pkr,product_id");
        lineItems = (itemsRes.data ?? []).map((row) => ({
          title: String(row.title),
          quantity: Number(row.quantity) || 0,
          price_pkr: Number(row.price_pkr) || 0,
          product_id: row.product_id,
        }));
      } catch {
        /* ignore */
      }
      // Local orders fallback for item sales
      if (!lineItems.length) {
        for (const o of orders as Array<{ items?: Array<{ title: string; quantity: number; price_pkr: number; product_id?: string | null }> }>) {
          for (const item of o.items ?? []) {
            lineItems.push({
              title: item.title,
              quantity: Number(item.quantity) || 0,
              price_pkr: Number(item.price_pkr) || 0,
              product_id: item.product_id ?? null,
            });
          }
        }
      }

      const byStatus: Record<string, number> = {};
      const byPayment: Record<string, { count: number; revenue: number }> = {};
      let revenue = 0;
      for (const o of orders) {
        revenue += Number(o.total_pkr);
        byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
        const pay = String(o.payment_method ?? "cod").toLowerCase();
        if (!byPayment[pay]) byPayment[pay] = { count: 0, revenue: 0 };
        byPayment[pay].count += 1;
        byPayment[pay].revenue += Number(o.total_pkr);
      }
      const byCat: Record<string, number> = {};
      for (const p of productCategories) byCat[p.category] = (byCat[p.category] ?? 0) + 1;
      const skuCount = productCategories.length || getMockAnalytics().products;
      const chart =
        Object.entries(byCat).map(([name, count]) => ({ name, count })).length > 0
          ? Object.entries(byCat).map(([name, count]) => ({ name, count }))
          : getMockAnalytics().chart;

      const productSales = new Map<string, { title: string; units: number; revenue: number }>();
      for (const item of lineItems) {
        const key = item.product_id || item.title;
        const row = productSales.get(key) ?? { title: item.title, units: 0, revenue: 0 };
        row.units += item.quantity;
        row.revenue += item.quantity * item.price_pkr;
        productSales.set(key, row);
      }
      const topProducts = [...productSales.values()]
        .sort((a, b) => b.units - a.units)
        .slice(0, 10);

      const categorySales = new Map<string, { units: number; revenue: number }>();
      const productCat = new Map(productCategories.map((p) => [p.id, p.category]));
      for (const item of lineItems) {
        const cat =
          (item.product_id && productCat.get(item.product_id)) ||
          "Uncategorized";
        const row = categorySales.get(cat) ?? { units: 0, revenue: 0 };
        row.units += item.quantity;
        row.revenue += item.quantity * item.price_pkr;
        categorySales.set(cat, row);
      }
      const topCategories = [...categorySales.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const vendorStats = new Map<
        string,
        { name: string; products: number; ratingSum: number; ratingCount: number }
      >();
      for (const p of productCategories) {
        if (!p.vendor_id) continue;
        const row = vendorStats.get(p.vendor_id) ?? {
          name: p.vendor_id.slice(0, 8),
          products: 0,
          ratingSum: 0,
          ratingCount: 0,
        };
        row.products += 1;
        if (typeof p.rating === "number" && Number.isFinite(p.rating)) {
          row.ratingSum += p.rating;
          row.ratingCount += 1;
        }
        vendorStats.set(p.vendor_id, row);
      }
      const topVendors = [...vendorStats.entries()]
        .map(([id, v]) => ({
          id,
          name: v.name,
          products: v.products,
          rating: v.ratingCount ? Number((v.ratingSum / v.ratingCount).toFixed(1)) : null,
        }))
        .sort((a, b) => b.products - a.products)
        .slice(0, 8);

      return {
        revenue,
        orderCount: orders.length,
        skuCount,
        byStatus,
        chart,
        monthly: groupByMonth(
          orders.map((o) => ({ created_at: o.created_at, total_pkr: Number(o.total_pkr) })),
        ),
        pieData: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        topProducts,
        topCategories,
        topVendors,
        payments: Object.entries(byPayment).map(([name, v]) => ({ name, ...v })),
      };
    },
  });

  const fulfillmentRate = useMemo(() => {
    if (!data?.byStatus) return 0;
    const delivered = data.byStatus.delivered ?? 0;
    const total = data.orderCount || 1;
    return Math.round((delivered / total) * 100);
  }, [data]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardPageHeader
        title="Analytics"
        description="Website visitors, revenue, order trends, and catalog breakdown."
      />

      <SectionCard title="Website traffic">
        <p className="text-sm text-muted-foreground -mt-2 mb-4">
          Unique people on the storefront (Pakistan date). Counting started after this tracker went
          live — older visits are not backfilled.
        </p>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatCard
            label="Visitors today"
            value={traffic?.today.uniques ?? 0}
            icon={Users}
            hint={`${traffic?.today.pageviews ?? 0} page views`}
          />
          <StatCard
            label="Last 7 days"
            value={traffic?.last7.uniques ?? 0}
            icon={Eye}
            hint={`${traffic?.last7.pageviews ?? 0} page views`}
          />
          <StatCard
            label="Last 30 days"
            value={traffic?.last30.uniques ?? 0}
            icon={Users}
            hint={`${traffic?.last30.pageviews ?? 0} page views`}
          />
          <StatCard
            label="All-time visitors"
            value={traffic?.allTime.uniques ?? 0}
            icon={Eye}
            hint={`${traffic?.allTime.pageviews ?? 0} page views`}
          />
        </div>
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Daily unique visitors vs page views — last 14 days
            </p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={traffic?.daily ?? []}
                  margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={32} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="uniques"
                    name="Unique visitors"
                    stroke="#FF7A00"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pageviews"
                    name="Page views"
                    stroke="#0052B4"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Top pages (14 days)</p>
            {(traffic?.topPaths?.length ?? 0) > 0 ? (
              <ul className="space-y-2">
                {(traffic?.topPaths ?? []).map((row) => (
                  <li
                    key={row.path}
                    className="flex items-center justify-between gap-3 text-sm border-b border-border/60 pb-2 last:border-0"
                  >
                    <span className="truncate font-medium">{row.path}</span>
                    <span className="tabular-nums text-muted-foreground shrink-0">{row.views}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Numbers appear here as customers browse the shop.
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Gross revenue"
          value={fmtPKR(data?.revenue ?? 0)}
          icon={DollarSign}
          hint="All orders"
        />
        <StatCard
          label="Total orders"
          value={data?.orderCount ?? 0}
          icon={ShoppingBag}
          hint="All statuses"
        />
        <StatCard
          label="Active SKUs"
          value={data?.skuCount ?? 0}
          icon={Package}
          hint="Listed products"
        />
        <StatCard
          label="Fulfillment rate"
          value={`${fulfillmentRate}%`}
          icon={TrendingUp}
          hint="Delivered / total"
          trend={
            fulfillmentRate >= 70
              ? { label: "Healthy", positive: true }
              : { label: "Needs attention", positive: false }
          }
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SectionCard title="Revenue & orders — last 6 months">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data?.monthly ?? []}
                  margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="rev"
                    orientation="left"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10 }}
                    width={40}
                  />
                  <YAxis
                    yAxisId="ord"
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fontSize: 10 }}
                    width={30}
                  />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "Revenue" ? fmtPKR(Number(value)) : value
                    }
                  />
                  <Legend />
                  <Line
                    yAxisId="rev"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    yAxisId="ord"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Order status breakdown">
          <div className="h-64 flex flex-col">
            <ResponsiveContainer width="100%" height="75%">
              <PieChart>
                <Pie
                  data={data?.pieData ?? []}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={35}
                >
                  {(data?.pieData ?? []).map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
              {(data?.pieData ?? []).map((e) => (
                <div key={e.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: STATUS_COLORS[e.name] ?? "#94a3b8" }}
                  />
                  {e.name} ({e.value})
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Products by category">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.chart ?? []} margin={{ top: 4, right: 8, bottom: 60, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={30} />
              <Tooltip />
              <Bar dataKey="count" name="SKUs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Top selling products" description="Units sold from order line items.">
          {(data?.topProducts?.length ?? 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-semibold">Product</th>
                    <th className="pb-2 font-semibold text-right">Units</th>
                    <th className="pb-2 font-semibold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topProducts ?? []).map((row) => (
                    <tr key={row.title} className="border-t">
                      <td className="py-2 pr-2 font-medium">{row.title}</td>
                      <td className="py-2 text-right tabular-nums">{row.units}</td>
                      <td className="py-2 text-right tabular-nums">{fmtPKR(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No line-item sales data yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Sales by category" description="Revenue grouped by product category.">
          {(data?.topCategories?.length ?? 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-semibold">Category</th>
                    <th className="pb-2 font-semibold text-right">Units</th>
                    <th className="pb-2 font-semibold text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topCategories ?? []).map((row) => (
                    <tr key={row.name} className="border-t">
                      <td className="py-2 pr-2 font-medium">{row.name}</td>
                      <td className="py-2 text-right tabular-nums">{row.units}</td>
                      <td className="py-2 text-right tabular-nums">{fmtPKR(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Category sales appear after orders with catalog links.</p>
          )}
        </SectionCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Payment mix" description="Orders grouped by checkout payment method.">
          {(data?.payments?.length ?? 0) > 0 ? (
            <ul className="space-y-2">
              {(data?.payments ?? []).map((row) => (
                <li
                  key={row.name}
                  className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 text-sm last:border-0"
                >
                  <span className="font-medium uppercase tracking-wide">{row.name.replace(/_/g, " ")}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {row.count} orders · {fmtPKR(row.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No payment data yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Top vendors" description="Catalog SKUs and average product rating by vendor.">
          {(data?.topVendors?.length ?? 0) > 0 ? (
            <ul className="space-y-2">
              {(data?.topVendors ?? []).map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 text-sm last:border-0"
                >
                  <span className="font-medium">Vendor {row.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {row.products} SKUs
                    {row.rating != null ? ` · ★ ${row.rating}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Vendor rankings appear when products are linked to vendor shops.
            </p>
          )}
        </SectionCard>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-amber-500 shrink-0" />
          <div>
            <div className="text-xl font-bold">{data?.byStatus?.pending ?? 0}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 shrink-0" />
          <div>
            <div className="text-xl font-bold">{data?.byStatus?.delivered ?? 0}</div>
            <div className="text-xs text-muted-foreground">Delivered</div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <XCircle className="h-8 w-8 text-red-500 shrink-0" />
          <div>
            <div className="text-xl font-bold">{data?.byStatus?.cancelled ?? 0}</div>
            <div className="text-xs text-muted-foreground">Cancelled</div>
          </div>
        </div>
      </div>
    </div>
  );
}
