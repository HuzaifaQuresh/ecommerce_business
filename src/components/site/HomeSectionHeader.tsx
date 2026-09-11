import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HomeSectionHeader({
  badge,
  title,
  subtitle,
  action,
  dark = false,
  className,
}: {
  badge?: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center gap-1.5",
        dark ? "px-4 sm:px-6 pt-5 sm:pt-6 pb-4" : "px-4 sm:px-5 pt-4 sm:pt-5 pb-3",
        className,
      )}
    >
      {badge}
      <h2
        className={cn(
          "font-black tracking-tight",
          dark ? "text-lg sm:text-2xl text-white mt-0.5" : "text-base sm:text-xl text-[#0B192C] mt-0.5",
        )}
      >
        {title}
      </h2>
      {subtitle ? (
        <p
          className={cn(
            "text-xs sm:text-sm max-w-xl leading-relaxed",
            dark ? "text-slate-400 mt-0.5" : "text-slate-500",
          )}
        >
          {subtitle}
        </p>
      ) : null}
      {action ? <div className="mt-0.5">{action}</div> : null}
    </div>
  );
}

export function HomeSectionBadge({
  children,
  tone = "orange",
  dark = false,
}: {
  children: ReactNode;
  tone?: "orange" | "blue";
  dark?: boolean;
}) {
  const orange = dark
    ? "text-[#FF7A00] bg-[#FF7A00]/15"
    : "text-[#FF7A00] bg-[#FF7A00]/10";
  const blue = dark
    ? "text-[#00A3E0] bg-[#00A3E0]/15"
    : "text-[#0052B4] bg-[#0052B4]/8";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full",
        tone === "blue" ? blue : orange,
      )}
    >
      {children}
    </span>
  );
}
