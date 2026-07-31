import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardPageHeader, SectionCard } from "@/components/site/PageLayout";
import { Eye, Star, Package, DollarSign, AlertTriangle, TrendingUp } from "lucide-react";
import { fmtPKR } from "@/lib/format";
import { DEMO_VENDOR_ID, getVendorMockProducts } from "@/lib/mock-data";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/vendor/analytics")({ component: VendorAnalytics });

function VendorAnalytics() {
  const { vendorId } = Route.useRouteContext();

  const { data } = useQuery({
    queryKey: ["vendor-analytics", vendorId],
    queryFn: async () => {
      const vid = vendorId ?? DEMO_VENDOR_ID;
      let rows: any[] = [];
      try {
        const { data: qData, error } = await supabase
          .from("products")
          .select("id,title,rating,stock,price_pkr,discount_pct,category")
          .eq("vendor_id", vid);
        if (!error && qData?.length) {
          rows = qData;
        }
      } catch {
        // ignore
      }

      if (rows.length === 0) {
        rows = getVendorMockProducts(vid);
      }

      const avgRating = rows.reduce((s, p) => s + Number(p.rating ?? 0), 0) / (rows.length || 1);
      const onSale = rows.filter((p) => p.discount_pct > 0).length;
      const inventoryValue = rows.reduce((s, p) => s + Number(p.price_pkr) * p.stock, 0);
      const lowStock = rows.filter((p) => p.stock < 15);
      const byCategory: Record<string, number> = {};
      for (const p of rows) byCategory[p.category] = (byCategory[p.category] ?? 0) + 1;

      return {
        skus: rows.length,
        avgRating,
        onSale,
        inventoryValue,
        lowStock,
        rows,
        byCategory,
      };
    },
  });

  const chartData = Object.entries(data?.byCategory ?? {}).map(([name, count]) => ({
    name,
    count,
  }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardPageHeader
        title="Analytics"
        description="SKU performance, inventory health, and catalog distribution."
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Active SKUs"
          value={data?.skus ?? 0}
          icon={Package}
          hint="Assigned products"
        />
        <StatCard
          label="Avg rating"
          value={`${(data?.avgRating ?? 0).toFixed(1)} ★`}
          icon={Star}
          hint="Across all SKUs"
        />
        <StatCard label="On promotion" value={data?.onSale ?? 0} icon={Eye} hint="With discount" />
        <StatCard
          label="Inventory value"
          value={fmtPKR(data?.inventoryValue ?? 0)}
          icon={DollarSign}
          hint="At list price"
        />
      </div>

      {(data?.lowStock?.length ?? 0) > 0 && (
        <SectionCard title="Low stock alert">
          <div className="flex items-center gap-2 text-amber-600 text-sm font-medium mb-3">
            <AlertTriangle className="h-4 w-4" />
            {data!.lowStock.length} SKU{data!.lowStock.length !== 1 ? "s" : ""} below 15 units —
            restock soon
          </div>
          <ul className="divide-y">
            {data!.lowStock.map((p) => (
              <li key={p.id} className="flex justify-between py-2.5 text-sm first:pt-0 last:pb-0">
                <span className="font-medium">{p.title}</span>
                <span className="text-amber-600 font-semibold tabular-nums">{p.stock} left</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {chartData.length > 0 && (
          <SectionCard title="SKUs by category">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 40, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    angle={-30}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name="SKUs"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        )}

        <SectionCard title="SKU performance table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 font-semibold">Product</th>
                  <th className="p-2 font-semibold text-right">Price</th>
                  <th className="p-2 font-semibold text-right">Stock</th>
                  <th className="p-2 font-semibold text-right">Rating</th>
                  <th className="p-2 font-semibold text-right">Disc %</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows ?? []).slice(0, 8).map((p) => (
                  <tr key={p.id} className="border-t hover:bg-muted/20">
                    <td className="p-2 font-medium line-clamp-1 max-w-[180px]">{p.title}</td>
                    <td className="p-2 text-right tabular-nums">{fmtPKR(Number(p.price_pkr))}</td>
                    <td
                      className={`p-2 text-right tabular-nums font-medium ${p.stock < 15 ? "text-amber-600" : ""}`}
                    >
                      {p.stock}
                    </td>
                    <td className="p-2 text-right">
                      {p.rating ? `${Number(p.rating).toFixed(1)} ★` : "—"}
                    </td>
                    <td className="p-2 text-right">
                      {p.discount_pct > 0 ? (
                        <span className="text-emerald-600">{p.discount_pct}%</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
                {data?.rows?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-muted-foreground">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-5 flex items-center gap-4">
        <TrendingUp className="h-8 w-8 text-primary shrink-0" />
        <div>
          <p className="font-semibold text-sm">Want full revenue & order analytics?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ask your platform admin to grant you access to the Admin Analytics module or pull
            reports from the Admin → Orders page.
          </p>
        </div>
      </div>
    </div>
  );
}
