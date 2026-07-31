import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuickActionCard({
  to,
  label,
  description,
  icon: Icon,
  highlight,
  className,
}: {
  to: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  highlight?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex flex-col rounded-xl border bg-card p-4 sm:p-5 transition-all hover:shadow-md hover:border-primary/30 min-h-[108px]",
        highlight && "border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-500/50",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn(
            "grid h-10 w-10 place-items-center rounded-lg shrink-0",
            highlight ? "bg-amber-500/15 text-amber-600" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
      </div>
      <div className="mt-3 font-semibold text-sm group-hover:text-primary transition-colors">
        {label}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      )}
    </Link>
  );
}
