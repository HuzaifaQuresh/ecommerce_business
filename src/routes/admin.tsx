import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings,
  Ticket,
  BarChart3,
  Users,
} from "lucide-react";
import type { AppRole } from "@/types/commerce";

export const Route = createFileRoute("/admin")({
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
    const ok = list.some((r) => r === "admin" || r === "super_admin");
    if (!ok) throw redirect({ to: "/" });
    const isSuper = list.includes("super_admin");
    return {
      isSuper,
      roles: list,
      email: session.user.email,
    };
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { isSuper, roles, email } = Route.useRouteContext();
  const nav: NavItem[] = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true, group: "Overview" },
    { to: "/admin/products", label: "Products", icon: Package, group: "Commerce" },
    { to: "/admin/orders", label: "Orders", icon: ShoppingBag, group: "Commerce" },
    { to: "/admin/vouchers", label: "Vouchers", icon: Ticket, group: "Commerce" },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3, group: "Insights" },
    { to: "/admin/settings", label: "Settings", icon: Settings, group: "Platform" },
  ];
  if (isSuper) {
    nav.push({ to: "/admin/users", label: "Users & Roles", icon: Users, group: "Platform" });
  }

  return (
    <DashboardShell
      title={isSuper ? "Command Center" : "Admin Console"}
      subtitle={isSuper ? "Super admin · full platform access" : "Catalog, orders & storefront ops"}
      variant={isSuper ? "super_admin" : "admin"}
      nav={nav}
      userEmail={email}
      userRoles={roles}
    >
      <Outlet />
    </DashboardShell>
  );
}
