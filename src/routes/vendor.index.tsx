import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { WorkspaceBanner } from "@/components/dashboard/WorkspaceBanner";
import {
  Package,
  ShoppingBag,
  AlertTriangle,
  DollarSign,
  BarChart3,
  Store,
  ArrowRight,
} from "lucide-react";
import { fmtPKR } from "@/lib/format";
import { DashboardPageHeader, SectionCard } from "@/components/site/PageLayout";
import { DEMO_VENDOR_ID, getVendorMockProducts } from "@/lib/mock-data";
import { fetchOrdersWithItems } from "@/api/orders";
import { DASHBOARD_THEME } from "@/lib/dashboard-theme";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/vendor/")({ component: VendorDashboard });

function VendorDashboard() {
  const { vendorId } = Route.useRouteContext();
  const { roles } = useAuth();
  const theme = DASHBOARD_THEME.vendor;

  const { data } = useQuery({
    queryKey: ["vendor-stats", vendorId],
    queryFn: async () => {
      const vid = vendorId ?? DEMO_VENDOR_ID;
      let orderCount = 0;
      let vendorProductsList = [];
      try {
        const { data: products, error } = await supabase
          .from("products")
          .select("id,title,stock,price_pkr")
          .eq("vendor_id", vid);
        if (!error && products?.length) {
          vendorProductsList = products;
        }
      } catch {
        // ignore
      }

      if (vendorProductsList.length === 0) {
        vendorProductsList = getVendorMockProducts(vid);
      }

      const low = vendorProductsList.filter((p) => p.stock < 15);
      const inventoryValue = vendorProductsList.reduce(
        (s, p) => s + Number(p.price_pkr) * p.stock,
        0,
      );

      try {
        const productIds = vendorProductsList.map((p) => p.id);
        const allOrders = await fetchOrdersWithItems();
        const vendorOrders = allOrders.filter((o) =>
          o.items.some((item) => item.product_id && productIds.includes(item.product_id)),
        );
        orderCount = vendorOrders.length;
      } catch (err) {
        console.warn("Failed to fetch vendor stats order count:", err);
      }

      return {
        count: vendorProductsList.length,
        low,
        inventoryValue,
        products: vendorProductsList,
        orderCount,
      };
    },
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <WorkspaceBanner
        variant="vendor"
        roles={roles}
        title="Vendor Operations"
        icon={Store}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/products">
              View catalog
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        }
      />

      <DashboardPageHeader
        title="Overview"
        description="Monitor SKU inventory, stock risk, and order activity for your shop."
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="My SKUs"
          value={data?.count ?? 0}
          icon={Package}
          accentClass={`bg-primary/10 ${theme.kpiIcon}`}
          hint="Assigned products"
        />
        <StatCard
          label="Inventory value"
          value={fmtPKR(data?.inventoryValue ?? 0)}
          icon={DollarSign}
          accentClass={`bg-primary/10 ${theme.kpiIcon}`}
          hint="PKR at list price"
        />
        <StatCard
          label="Low stock"
          value={data?.low.length ?? 0}
          icon={AlertTriangle}
          accentClass="bg-amber-500/10 text-amber-600"
          hint="Under 15 units"
        />
        <StatCard
          label="Orders"
          value={data?.orderCount ?? "—"}
          icon={ShoppingBag}
          accentClass={`bg-primary/10 ${theme.kpiIcon}`}
          hint="Containing your products"
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Quick actions
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickActionCard
            to="/vendor/products"
            label="My Products"
            description="Stock & pricing"
            icon={Package}
          />
          <QuickActionCard
            to="/vendor/orders"
            label="Orders"
            description="Customer order log"
            icon={ShoppingBag}
          />
          <QuickActionCard
            to="/vendor/analytics"
            label="Analytics"
            description="SKU performance"
            icon={BarChart3}
          />
          <QuickActionCard
            to="/vendor/settings"
            label="Shop Profile"
            description="Name & commission"
            icon={Store}
          />
        </div>
      </div>

      {data?.low && data.low.length > 0 && (
        <SectionCard title="Restock priority">
          <ul className="divide-y">
            {data.low.slice(0, 6).map((p) => (
              <li key={p.id} className="flex justify-between py-3 first:pt-0 last:pb-0 text-sm">
                <span className="font-medium truncate pr-4">{p.title}</span>
                <span className="text-amber-600 font-semibold tabular-nums">{p.stock} units</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="link" size="sm" className="mt-3 px-0">
            <Link to="/vendor/products">Update stock →</Link>
          </Button>
        </SectionCard>
      )}

      {!vendorId && (
        <div className="rounded-xl border border-dashed bg-muted/30 p-4 sm:p-5 text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Demo mode.</strong> Showing sample catalog (
          {data?.count ?? 0} SKUs). A super admin can assign the vendor role in Admin → Users &
          Roles to link your live shop record.
        </div>
      )}
    </div>
  );
}
