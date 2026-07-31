import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fmtPKR } from "@/lib/format";
import {
  Package,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Users,
  Settings,
  Ticket,
  BarChart3,
  Crown,
  Shield,
  ArrowRight,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { WorkspaceBanner } from "@/components/dashboard/WorkspaceBanner";
import { DashboardPageHeader, SectionCard } from "@/components/site/PageLayout";
import { getMockAnalytics, MOCK_ORDERS } from "@/lib/mock-data";
import { fetchOrders } from "@/api/orders";
import { DASHBOARD_THEME } from "@/lib/dashboard-theme";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const { isSuperAdmin: isSuper, roles } = useAuth();
  const variant = isSuper ? "super_admin" : "admin";
  const theme = DASHBOARD_THEME[variant];

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      // First, get all orders including local fallback
      let allOrders = MOCK_ORDERS;
      try {
        const list = await fetchOrders();
        if (list && list.length) {
          allOrders = list;
        }
      } catch (err) {
        console.warn("Error loading orders for admin dashboard:", err);
      }

      const totalRevenue = allOrders.reduce((s, x) => s + Number(x.total_pkr), 0);

      // Get low stock alerts and product counts from DB if possible
      let lowStockList: any[] = [];
      let totalProductCount = 120; // sensible fallback starting count
      try {
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true });
        if (count != null) {
          totalProductCount = count;
        }

        const { data: lowData } = await supabase
          .from("products")
          .select("id,title,stock")
          .lt("stock", 15)
          .order("stock")
          .limit(8);
        if (lowData) {
          lowStockList = lowData;
        }
      } catch {
        // ignore
      }

      // Merge or fallback to mock analytics if DB queries didn't yield results
      if (lowStockList.length === 0) {
        const m = getMockAnalytics();
        lowStockList = m.low;
        if (totalProductCount === 120) {
          totalProductCount = m.products;
        }
      }

      return {
        products: totalProductCount,
        orders: allOrders.length,
        revenue: totalRevenue,
        low: lowStockList,
        recent: allOrders.slice(0, 5).map((o) => ({
          id: o.id,
          total_pkr: o.total_pkr,
          status: o.status,
          customer_name: o.customer_name,
          created_at: o.created_at,
        })),
      };
    },
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <WorkspaceBanner
        variant={variant}
        roles={roles}
        title={isSuper ? "Super Admin Command Center" : "Platform Administration"}
        icon={isSuper ? Crown : Shield}
        actions={
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/products">
              View storefront
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        }
      />

      <DashboardPageHeader
        title="Overview"
        description="Real-time snapshot of catalog health, revenue, and fulfillment queue."
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Active SKUs"
          value={stats?.products ?? 0}
          icon={Package}
          accentClass={`bg-primary/10 ${theme.kpiIcon}`}
          hint="Listed on storefront"
        />
        <StatCard
          label="Orders"
          value={stats?.orders ?? 0}
          icon={ShoppingBag}
          accentClass={`bg-primary/10 ${theme.kpiIcon}`}
          hint="All statuses"
        />
        <StatCard
          label="Gross revenue"
          value={fmtPKR(stats?.revenue ?? 0)}
          icon={DollarSign}
          accentClass={`bg-primary/10 ${theme.kpiIcon}`}
          hint="PKR · platform total"
        />
        <StatCard
          label="Low stock"
          value={stats?.low.length ?? 0}
          icon={AlertTriangle}
          accentClass="bg-amber-500/10 text-amber-600"
          hint="Below 15 units"
          trend={
            (stats?.low.length ?? 0) > 0
              ? { label: "Requires restock attention", positive: false }
              : { label: "Inventory healthy", positive: true }
          }
        />
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Quick actions
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickActionCard
            to="/admin/products"
            label="Products"
            description="CRUD, pricing, stock & images"
            icon={Package}
          />
          <QuickActionCard
            to="/admin/orders"
            label="Orders"
            description="Addresses, dispatch & tracking"
            icon={ShoppingBag}
          />
          <QuickActionCard
            to="/admin/vouchers"
            label="Vouchers"
            description="Promo codes & discounts"
            icon={Ticket}
          />
          <QuickActionCard
            to="/admin/analytics"
            label="Analytics"
            description="Revenue & category trends"
            icon={BarChart3}
          />
          <QuickActionCard
            to="/admin/settings"
            label="Settings"
            description="Payments, tax & delivery"
            icon={Settings}
          />
          {isSuper && (
            <QuickActionCard
              to="/admin/users"
              label="Users & Roles"
              description="Assign admin, vendor, super_admin"
              icon={Users}
              highlight
              className="sm:col-span-2"
            />
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {stats?.low && stats.low.length > 0 && (
          <SectionCard title="Low stock alerts">
            <ul className="divide-y">
              {stats.low.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 text-sm"
                >
                  <span className="font-medium truncate pr-4">{p.title}</span>
                  <span className="text-amber-600 font-semibold tabular-nums shrink-0">
                    {p.stock} left
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild variant="link" size="sm" className="mt-3 px-0">
              <Link to="/admin/products">Manage inventory →</Link>
            </Button>
          </SectionCard>
        )}

        {stats?.recent && stats.recent.length > 0 && (
          <SectionCard title="Recent orders">
            <ul className="divide-y">
              {stats.recent.map((o) => (
                <li key={o.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    to="/admin/orders/$orderId"
                    params={{ orderId: o.id }}
                    className="flex items-center justify-between gap-3 text-sm hover:opacity-80 transition-opacity"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{o.customer_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="font-semibold tabular-nums">{fmtPKR(Number(o.total_pkr))}</p>
                      <OrderStatusBadge status={o.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Button asChild variant="link" size="sm" className="mt-3 px-0">
              <Link to="/admin/orders">View all orders →</Link>
            </Button>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
