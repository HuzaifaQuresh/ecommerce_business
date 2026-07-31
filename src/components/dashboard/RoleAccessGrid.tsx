import { Link } from "@tanstack/react-router";
import type { AppRole } from "@/types/commerce";
import { ROLE_CATALOG, ROLE_ORDER } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export function RoleAccessGrid({
  compact,
  highlight,
  className,
}: {
  compact?: boolean;
  highlight?: AppRole;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-3",
        compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2",
        className,
      )}
    >
      {ROLE_ORDER.map((role) => {
        const meta = ROLE_CATALOG[role];
        const Icon = meta.icon;
        const active = highlight === role;
        return (
          <div
            key={role}
            className={cn(
              "rounded-xl border bg-card/80 p-4 transition-shadow",
              active && "ring-2 ring-primary border-primary/40 shadow-md",
              compact ? "p-3" : "p-4 sm:p-5",
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "grid place-items-center rounded-lg shrink-0",
                  compact ? "h-9 w-9" : "h-10 w-10",
                  role === "super_admin" && "bg-amber-500/15 text-amber-600",
                  role === "admin" && "bg-sky-500/15 text-sky-600",
                  role === "vendor" && "bg-emerald-500/15 text-emerald-600",
                  role === "user" && "bg-slate-500/15 text-slate-600",
                )}
              >
                <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className={cn("font-semibold", compact ? "text-sm" : "text-base")}>
                  {meta.label}
                </h3>
                <p className={cn("text-muted-foreground mt-0.5", compact ? "text-xs" : "text-sm")}>
                  {meta.description}
                </p>
              </div>
            </div>
            <ul
              className={cn(
                "mt-3 space-y-1 text-muted-foreground",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {meta.access.slice(0, compact ? 3 : 5).map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-primary shrink-0">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            {meta.dashboardPath && !compact && (
              <Link
                to={meta.dashboardPath}
                className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-primary hover:underline"
              >
                Open area <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}
