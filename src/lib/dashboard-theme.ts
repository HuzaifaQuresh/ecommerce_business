import type { AppRole } from "@/types/commerce";

export type DashboardVariant = "super_admin" | "admin" | "vendor";

export function variantFromRoles(roles: AppRole[]): DashboardVariant {
  if (roles.includes("super_admin")) return "super_admin";
  if (roles.includes("admin")) return "admin";
  return "vendor";
}

export const DASHBOARD_THEME: Record<
  DashboardVariant,
  {
    label: string;
    tagline: string;
    sidebarClass: string;
    activeNavClass: string;
    accentText: string;
    accentBorder: string;
    kpiIcon: string;
    bannerClass: string;
  }
> = {
  super_admin: {
    label: "Super Admin",
    tagline: "Full platform control · users, vendors, payments",
    sidebarClass: "bg-white border-r border-amber-500/20",
    activeNavClass: "bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/25",
    accentText: "text-amber-600",
    accentBorder: "border-amber-500/30",
    kpiIcon: "text-amber-600",
    bannerClass:
      "border-amber-500/25 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent",
  },
  admin: {
    label: "Platform Admin",
    tagline: "Catalog, orders, vouchers & storefront operations",
    sidebarClass: "bg-white border-r border-sky-500/15",
    activeNavClass: "bg-sky-500 text-white shadow-sm shadow-sky-500/20",
    accentText: "text-sky-600",
    accentBorder: "border-sky-500/25",
    kpiIcon: "text-sky-600",
    bannerClass: "border-sky-500/20 bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent",
  },
  vendor: {
    label: "Vendor Workspace",
    tagline: "SKU inventory, orders & shop performance",
    sidebarClass: "bg-white border-r border-emerald-500/15",
    activeNavClass: "bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20",
    accentText: "text-emerald-600",
    accentBorder: "border-emerald-500/25",
    kpiIcon: "text-emerald-600",
    bannerClass:
      "border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent",
  },
};
