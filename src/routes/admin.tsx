import { createFileRoute, Outlet } from "@tanstack/react-router";
import { DashboardShell, type NavItem } from "@/components/dashboard/DashboardShell";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings,
  Ticket,
  BarChart3,
  Users,
  Inbox,
} from "lucide-react";
export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, roles, isSuperAdmin: isSuper } = useAuth();
  const email = user?.email;
  const nav: NavItem[] = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true, group: "Overview" },
    { to: "/admin/products", label: "Products", icon: Package, group: "Commerce" },
    { to: "/admin/orders", label: "Orders", icon: ShoppingBag, group: "Commerce" },
    { to: "/admin/inbox", label: "Inbox", icon: Inbox, group: "Commerce" },
    { to: "/admin/vouchers", label: "Vouchers", icon: Ticket, group: "Commerce" },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3, group: "Insights" },
    { to: "/admin/settings", label: "Settings", icon: Settings, group: "Platform" },
  ];
  if (isSuper) {
    nav.push({ to: "/admin/users", label: "Users & Roles", icon: Users, group: "Platform" });
  }

  return (
    <RequireAuth roles={["admin", "super_admin"]}>
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
    </RequireAuth>
  );
}
