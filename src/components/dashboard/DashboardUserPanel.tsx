import { Link } from "@tanstack/react-router";
import type { AppRole } from "@/types/commerce";
import { dashboardLinks } from "@/lib/roles";
import { RoleBadge } from "@/components/dashboard/RoleBadge";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardUserPanel({
  email,
  roles,
  onSignOut,
  className,
}: {
  email?: string | null;
  roles: AppRole[];
  onSignOut?: () => void;
  className?: string;
}) {
  const links = dashboardLinks(roles).filter((l) => !l.to.startsWith("/account"));

  return (
    <div className={cn("mt-auto pt-5 border-t border-slate-200", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Signed in
      </p>
      {email && <p className="text-sm text-slate-700 truncate font-medium mb-2">{email}</p>}
      {roles.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {roles.map((r) => (
            <RoleBadge key={r} role={r} size="sm" />
          ))}
        </div>
      )}
      {links.length > 0 && (
        <div className="flex flex-col gap-1 mb-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors truncate flex items-center gap-1.5"
            >
              <l.icon className="h-3 w-3 shrink-0" />
              {l.label}
            </Link>
          ))}
        </div>
      )}
      {onSignOut && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start text-slate-500 hover:text-slate-800 hover:bg-slate-100 h-9 px-2"
          onClick={onSignOut}
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          Sign out
        </Button>
      )}
    </div>
  );
}
