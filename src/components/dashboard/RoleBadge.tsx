import type { AppRole } from "@/types/commerce";
import { ROLE_CATALOG } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function RoleBadge({
  role,
  size = "md",
  className,
}: {
  role: AppRole;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = ROLE_CATALOG[role];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium capitalize",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-0.5 text-xs",
        meta.badgeClass,
        className,
      )}
    >
      {meta.shortLabel}
    </span>
  );
}
