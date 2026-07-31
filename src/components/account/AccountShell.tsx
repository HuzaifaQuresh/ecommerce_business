import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { User2, Package, LayoutDashboard, Store, ShoppingBag, LogIn, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RoleBadge } from "@/components/dashboard/RoleBadge";
import { QuickActionCard } from "@/components/dashboard/QuickActionCard";
import { primaryRole, ROLE_CATALOG } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BASE_NAV: { to: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { to: "/account", label: "Profile", icon: User2, exact: true },
  { to: "/account/orders", label: "Orders", icon: Package },
];

export function AccountShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, roles, isAdmin, isSuperAdmin, isVendor } = useAuth();
  const primary = primaryRole(roles);
  const meta = ROLE_CATALOG[primary];

  if (!user) {
    return (
      <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-6 rounded-xl border bg-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary text-xl font-bold shrink-0">
              <Search className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Order Tracking & History</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Viewing order details as guest. Sign in or register to sync orders across your
                devices.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="gap-2 shrink-0">
            <Link to="/auth">
              <LogIn className="h-4 w-4" />
              Sign In / Register
            </Link>
          </Button>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary text-xl font-bold shrink-0">
              {(user?.email?.[0] ?? "U").toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Account</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{user?.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {roles.length ? (
                  roles.map((r) => <RoleBadge key={r} role={r} />)
                ) : (
                  <RoleBadge role="user" />
                )}
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            Signed in as <span className="font-medium text-foreground">{meta.label}</span>. Manage
            your profile and orders, or jump to a workspace below.
          </p>
        </div>
      </div>

      {(isAdmin || isVendor) && (
        <div className="mb-6 sm:mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Workspaces
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {isAdmin && (
              <QuickActionCard
                to="/admin"
                label={isSuperAdmin ? "Super Admin" : "Admin Console"}
                description="Products, orders, vouchers, analytics & settings"
                icon={LayoutDashboard}
                highlight={isSuperAdmin}
              />
            )}
            {isVendor && (
              <QuickActionCard
                to="/vendor"
                label="Vendor Workspace"
                description="SKU inventory, orders & shop profile"
                icon={Store}
              />
            )}
            <QuickActionCard
              to="/products"
              label="Storefront"
              description="Browse the IoT catalog"
              icon={ShoppingBag}
            />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[220px_1fr] gap-6 lg:gap-8">
        <aside className="space-y-4">
          <nav
            className="flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0"
            aria-label="Account sections"
          >
            {BASE_NAV.map(({ to, label, icon: Icon, exact }) => {
              const active = exact ? path === to : path.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium whitespace-nowrap min-h-[44px] transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card hover:bg-muted border-border",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
