import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";
import { LayoutDashboard, Package, ShoppingBag, BarChart3, Store } from "lucide-react";
import type { AppRole } from "@/types/commerce";

export const Route = createFileRoute("/vendor")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    const list = (roles ?? []).map((r) => r.role as AppRole);
    const isVendor = list.includes("vendor");
    const isStaff = list.some((r) => r === "admin" || r === "super_admin");
    if (!isVendor && !isStaff) throw redirect({ to: "/" });
    const { data: vendor } = await supabase
      .from("vendors")
      .select("id,shop_name")
      .eq("user_id", session.user.id)
      .maybeSingle();
    return {
      vendorId: vendor?.id ?? null,
      shopName: vendor?.shop_name ?? "Vendor Workspace",
      roles: list,
      email: session.user.email,
    };
  },
  component: VendorLayout,
});

const NAV: NavItem[] = [
  { to: "/vendor", label: "Overview", icon: LayoutDashboard, exact: true, group: "Overview" },
  { to: "/vendor/products", label: "My Products", icon: Package, group: "Catalog" },
  { to: "/vendor/orders", label: "Orders", icon: ShoppingBag, group: "Catalog" },
  { to: "/vendor/analytics", label: "Analytics", icon: BarChart3, group: "Insights" },
  { to: "/vendor/settings", label: "Shop Profile", icon: Store, group: "Account" },
];

function VendorLayout() {
  const { shopName, roles, email } = Route.useRouteContext();
  return (
    <DashboardShell
      title={shopName}
      subtitle="Vendor partner workspace"
      variant="vendor"
      nav={NAV}
      userEmail={email}
      userRoles={roles}
    >
      <Outlet />
    </DashboardShell>
  );
}
