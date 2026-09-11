import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Package, Shield, Store } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { RoleBadge } from "@/components/dashboard/RoleBadge";
import { Button } from "@/components/ui/button";
import { primaryRole, ROLE_CATALOG } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function AccountWorkspaceCard() {
  const { roles, isAdmin, isSuperAdmin, isVendor } = useAuth();
  const primary = primaryRole(roles.length ? roles : ["user"]);
  const meta = ROLE_CATALOG[primary];
  const Icon = meta.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
        <div
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-lg",
            primary === "super_admin" && "bg-amber-500/15 text-amber-600",
            primary === "admin" && "bg-sky-500/15 text-sky-600",
            primary === "vendor" && "bg-emerald-500/15 text-emerald-600",
            primary === "user" && "bg-[#0B192C]/10 text-[#0B192C]",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{meta.label}</p>
            <RoleBadge role={primary} size="sm" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{meta.description}</p>
        </div>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {meta.access.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm text-muted-foreground"
          >
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF7A00]" />
            <span>{line.replace(/\s*\(\/admin\/users\)/, "")}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {isAdmin ? (
          <Button asChild className="min-h-[44px] bg-[#0B192C] hover:bg-[#0F2C59]">
            <Link to="/admin">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              {isSuperAdmin ? "Open Super Admin" : "Open Admin Console"}
            </Link>
          </Button>
        ) : null}
        {isVendor ? (
          <Button asChild variant={isAdmin ? "outline" : "default"} className="min-h-[44px]">
            <Link to="/vendor">
              <Store className="mr-2 h-4 w-4" />
              Open Vendor Workspace
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link to="/account/orders">
            <Package className="mr-2 h-4 w-4" />
            View orders
          </Link>
        </Button>
      </div>

      {isSuperAdmin ? (
        <p className="text-xs text-muted-foreground">
          Staff roles are assigned in{" "}
          <Link to="/admin/users" className="font-medium text-primary hover:underline">
            Admin → Users &amp; Roles
          </Link>
          . Do not share bootstrap or SQL grant links.
        </p>
      ) : null}

      {isAdmin && !isSuperAdmin ? (
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Need a higher role? Ask the Super Admin from Users &amp; Roles — self-promotion is
          disabled.
        </p>
      ) : null}
    </div>
  );
}
