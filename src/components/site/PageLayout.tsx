import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "max-w-3xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-[100rem]",
} as const;

export function PageContainer({
  children,
  className,
  size = "xl",
}: {
  children: ReactNode;
  className?: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 py-6 sm:py-8", SIZES[size], className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm sm:text-base text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: { label: string; to?: string; search?: Record<string, string | undefined> }[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "text-sm text-muted-foreground mb-4 flex flex-wrap items-center gap-x-1.5 gap-y-1",
        className,
      )}
    >
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden className="text-muted-foreground/60">
              /
            </span>
          )}
          {item.to ? (
            <Link
              to={item.to}
              search={item.search as never}
              className="hover:text-primary transition-colors line-clamp-1 max-w-[12rem] sm:max-w-none"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground line-clamp-1 max-w-[14rem] sm:max-w-md">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function SectionCard({
  children,
  className,
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <section
      className={cn("rounded-xl border bg-card p-4 sm:p-6 shadow-[var(--shadow-card)]", className)}
    >
      {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
      {children}
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 text-center">
      {Icon && <Icon className="h-14 w-14 sm:h-16 sm:w-16 text-muted-foreground/25" />}
      <h2 className="mt-4 text-xl sm:text-2xl font-bold">{title}</h2>
      {description && <p className="mt-2 text-sm text-muted-foreground max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ResponsiveScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card overflow-x-auto -mx-0 sm:mx-0", className)}>
      <div className="min-w-[640px] sm:min-w-0">{children}</div>
    </div>
  );
}

export function DashboardPageHeader({
  title,
  description,
  actions,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
}) {
  return (
    <header className="mb-6 sm:mb-8">
      {breadcrumbs}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </header>
  );
}
