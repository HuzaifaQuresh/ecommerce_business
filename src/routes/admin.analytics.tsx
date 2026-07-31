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
import { getMockAnalytics, MOCK_ORDERS } from "@/lib/mock-data";

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
  const { data } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      try {
        const [ordersRes, productsRes] = await Promise.all([
          supabase.from("orders").select("total_pkr,status,created_at").order("created_at"),
          supabase.from("products").select("category"),
        ]);
        if ((productsRes.data?.length ?? 0) > 0) {
          const orders = ordersRes.data ?? [];
          const byStatus: Record<string, number> = {};
          let revenue = 0;
          for (const o of orders) {
            revenue += Number(o.total_pkr);
            byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
          }
          const byCat: Record<string, number> = {};
          for (const p of productsRes.data ?? []) byCat[p.category] = (byCat[p.category] ?? 0) + 1;
          return {
            revenue,
            orderCount: orders.length,
            skuCount: productsRes.data?.length ?? 0,
            byStatus,
            chart: Object.entries(byCat).map(([name, count]) => ({ name, count })),
            monthly: groupByMonth(
              orders.map((o) => ({ created_at: o.created_at, total_pkr: Number(o.total_pkr) })),
            ),
            pieData: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
          };
        }
      } catch {
        /* demo */
      }
      const m = getMockAnalytics();
      const mockOrders = MOCK_ORDERS.map((o) => ({
        created_at: o.created_at,
        total_pkr: Number(o.total_pkr),
        status: o.status,
      }));
      const byStatus: Record<string, number> = {};
      for (const o of mockOrders) byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
      return {
        revenue: m.revenue,
        orderCount: m.orders,
        skuCount: m.products,
        byStatus,
        chart: m.chart,
        monthly: groupByMonth(mockOrders),
        pieData: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
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
        description="Revenue, order trends, and catalog breakdown."
      />

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
