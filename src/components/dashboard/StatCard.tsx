import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  accentClass,
  trend,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  accentClass?: string;
  trend?: { label: string; positive?: boolean };
}) {
  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-[var(--shadow-card)] hover:border-primary/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div
          className={cn("grid h-9 w-9 place-items-center rounded-lg bg-primary/10", accentClass)}
        >
          <Icon className={cn("h-4 w-4 text-primary", accentClass && "text-inherit")} />
        </div>
      </div>
      <div className="mt-3 text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">{value}</div>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      {trend && (
        <p
          className={cn(
            "text-xs mt-2 font-medium",
            trend.positive ? "text-emerald-600" : "text-muted-foreground",
          )}
        >
          {trend.label}
        </p>
      )}
    </div>
  );
}
