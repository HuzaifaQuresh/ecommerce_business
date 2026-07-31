import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Cpu, LogOut, Menu, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DashboardUserPanel } from "@/components/dashboard/DashboardUserPanel";
import { DASHBOARD_THEME, type DashboardVariant } from "@/lib/dashboard-theme";
import type { AppRole } from "@/types/commerce";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  group?: string;
};

function NavLinks({
  nav,
  path,
  onNavigate,
  vertical,
  activeNavClass,
}: {
  nav: NavItem[];
  path: string;
  onNavigate?: () => void;
  vertical?: boolean;
  activeNavClass: string;
}) {
  const groups = [...new Set(nav.map((n) => n.group ?? "Menu"))];

  if (!vertical) {
    return (
      <nav className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {nav.map((n) => {
          const active = n.exact ? path === n.to : path.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors min-h-[44px] whitespace-nowrap shrink-0",
                active ? activeNavClass : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <n.icon className="h-4 w-4 shrink-0" />
              {n.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-1.5">
            {group}
          </p>
          <div className="flex flex-col gap-0.5">
            {nav
              .filter((n) => (n.group ?? "Menu") === group)
              .map((n) => {
                const active = n.exact ? path === n.to : path.startsWith(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[44px]",
                      active
                        ? activeNavClass
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <n.icon className="h-4 w-4 shrink-0 opacity-90" />
                    {n.label}
                  </Link>
                );
              })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function DashboardShell({
  title,
  subtitle,
  variant = "admin",
  nav,
  backTo = "/",
  backLabel = "Back to storefront",
  userEmail,
  userRoles = [],
  children,
}: {
  title: string;
  subtitle?: string;
  variant?: DashboardVariant;
  nav: NavItem[];
  backTo?: string;
  backLabel?: string;
  userEmail?: string | null;
  userRoles?: AppRole[];
  children: React.ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const theme = DASHBOARD_THEME[variant];

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/auth" });
  };

  const sidebar = (
    <>
      <Link
        to={backTo}
        onClick={() => setOpen(false)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-5"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        <span className="truncate">{backLabel}</span>
      </Link>

      <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-200">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground shrink-0">
          <Cpu className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-sm tracking-tight text-slate-900 truncate">NexusIoT</div>
          <div
            className={cn("text-[10px] font-semibold uppercase tracking-wider", theme.accentText)}
          >
            {theme.label}
          </div>
        </div>
      </div>

      <div className="mb-5">
        <div className="font-semibold text-slate-900 truncate">{title}</div>
        {(subtitle || theme.tagline) && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{subtitle ?? theme.tagline}</p>
        )}
      </div>

      <NavLinks
        nav={nav}
        path={path}
        onNavigate={() => setOpen(false)}
        vertical
        activeNavClass={theme.activeNavClass}
      />

      <DashboardUserPanel
        email={userEmail}
        roles={userRoles}
        onSignOut={onSignOut}
        className="px-0"
      />

      <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Systems operational
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[minmax(0,260px)_1fr] bg-slate-50">
      <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 border-b bg-white border-slate-200 text-slate-800 px-4 h-14 shrink-0">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-700 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className={cn(
              "w-full max-w-[280px] text-slate-800 border-slate-200 p-0",
              theme.sidebarClass,
            )}
          >
            <SheetHeader className="border-b border-slate-200 px-4 py-4 text-left">
              <SheetTitle className="text-slate-800 text-base">Command Center</SheetTitle>
            </SheetHeader>
            <div className="p-4 flex flex-col h-[calc(100%-4rem)] overflow-y-auto">{sidebar}</div>
          </SheetContent>
        </Sheet>
        <span className="font-semibold truncate flex-1">{title}</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-900 shrink-0"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </header>

      <aside
        className={cn(
          "hidden lg:flex flex-col p-5 sticky top-0 h-screen shrink-0",
          theme.sidebarClass,
        )}
      >
        {sidebar}
      </aside>

      <div className="hidden md:flex lg:hidden bg-slate-50 text-slate-800 px-4 py-2 border-b border-slate-200 shrink-0">
        <NavLinks nav={nav} path={path} activeNavClass={theme.activeNavClass} />
      </div>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
