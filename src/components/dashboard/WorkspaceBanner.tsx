import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardVariant } from "@/lib/dashboard-theme";
import { DASHBOARD_THEME } from "@/lib/dashboard-theme";
import { RoleBadge } from "@/components/dashboard/RoleBadge";
import type { AppRole } from "@/types/commerce";

export function WorkspaceBanner({
  variant,
  roles,
  title,
  description,
  icon: Icon,
  actions,
}: {
  variant: DashboardVariant;
  roles: AppRole[];
  title: string;
  description?: string;
  icon: LucideIcon;
  actions?: React.ReactNode;
}) {
  const theme = DASHBOARD_THEME[variant];
  const primaryRole =
    variant === "super_admin" ? "super_admin" : variant === "admin" ? "admin" : "vendor";

  return (
    <div className={cn("rounded-xl border p-4 sm:p-5", theme.bannerClass)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div
            className={cn(
              "grid h-12 w-12 place-items-center rounded-xl border shrink-0",
              theme.accentBorder,
              "bg-slate-950/50",
            )}
          >
            <Icon className={cn("h-6 w-6", theme.accentText)} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">{title}</h2>
              <RoleBadge role={primaryRole} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">{description ?? theme.tagline}</p>
            {roles.length > 1 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {roles.map((r) => (
                  <RoleBadge key={r} role={r} size="sm" />
                ))}
              </div>
            )}
          </div>
        </div>
        {actions}
      </div>
    </div>
  );
}
