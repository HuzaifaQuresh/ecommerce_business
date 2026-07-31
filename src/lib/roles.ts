import type { AppRole } from "@/types/commerce";
import type { LucideIcon } from "lucide-react";
import { Crown, LayoutDashboard, Shield, ShoppingBag, Store, User2 } from "lucide-react";

export type RoleMeta = {
  role: AppRole;
  label: string;
  shortLabel: string;
  description: string;
  access: string[];
  dashboardPath: string | null;
  icon: LucideIcon;
  badgeClass: string;
};

export const ROLE_CATALOG: Record<AppRole, RoleMeta> = {
  super_admin: {
    role: "super_admin",
    label: "Super Admin",
    shortLabel: "Super Admin",
    description: "Full platform control including user roles, vendors, and all admin modules.",
    access: [
      "Everything in Admin",
      "Users & Roles (/admin/users)",
      "Vendor records & commissions",
      "Site settings & payment methods",
    ],
    dashboardPath: "/admin",
    icon: Crown,
    badgeClass: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  },
  admin: {
    role: "admin",
    label: "Platform Admin",
    shortLabel: "Admin",
    description: "Manage catalog, orders, vouchers, analytics, and storefront settings.",
    access: [
      "Dashboard & analytics",
      "Products CRUD",
      "Order queue & status",
      "Vouchers & promotions",
      "Site settings",
    ],
    dashboardPath: "/admin",
    icon: Shield,
    badgeClass: "bg-sky-500/15 text-sky-700 border-sky-500/30 dark:text-sky-300",
  },
  vendor: {
    role: "vendor",
    label: "Vendor",
    shortLabel: "Vendor",
    description: "Operate your assigned SKU catalog, track inventory, and view order activity.",
    access: [
      "Vendor dashboard",
      "My products & stock",
      "Order log (read-only)",
      "SKU analytics",
      "Shop profile",
    ],
    dashboardPath: "/vendor",
    icon: Store,
    badgeClass: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  },
  user: {
    role: "user",
    label: "Customer",
    shortLabel: "Customer",
    description: "Browse the IoT storefront, checkout, and manage your account.",
    access: ["Shop catalog & product detail", "Cart & checkout", "Profile & order history"],
    dashboardPath: "/account",
    icon: User2,
    badgeClass: "bg-slate-500/15 text-slate-700 border-slate-500/30 dark:text-slate-300",
  },
};

export const ROLE_ORDER: AppRole[] = ["super_admin", "admin", "vendor", "user"];

export function primaryRole(roles: AppRole[]): AppRole {
  for (const r of ROLE_ORDER) {
    if (roles.includes(r)) return r;
  }
  return "user";
}

export function dashboardLinks(roles: AppRole[]) {
  const links: { to: string; label: string; icon: LucideIcon }[] = [];
  if (roles.includes("super_admin") || roles.includes("admin")) {
    links.push({
      to: "/admin",
      label: roles.includes("super_admin") ? "Super Admin" : "Admin",
      icon: LayoutDashboard,
    });
  }
  if (roles.includes("vendor")) {
    links.push({ to: "/vendor", label: "Vendor", icon: Store });
  }
  links.push({ to: "/account", label: "My Account", icon: User2 });
  if (
    !roles.includes("user") &&
    !roles.includes("vendor") &&
    !roles.includes("admin") &&
    !roles.includes("super_admin")
  ) {
    links.push({ to: "/products", label: "Shop", icon: ShoppingBag });
  }
  return links;
}

export function slugifyShop(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "vendor-shop";
}
