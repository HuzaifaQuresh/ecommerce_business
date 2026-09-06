import { cn } from "@/lib/utils";
import { SmartZoneEmblem } from "@/components/site/SmartZoneEmblem";

export interface SmartZoneLogoProps {
  className?: string;
  showTagline?: boolean;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  dark?: boolean;
}

export function SmartZoneLogo({
  className,
  showTagline = true,
  showText = true,
  size = "md",
  dark = false,
}: SmartZoneLogoProps) {
  const iconSizes = {
    sm: "w-9 h-9",
    md: "w-11 h-11 sm:w-12 sm:h-12",
    lg: "w-14 h-14 sm:w-16 sm:h-16",
    xl: "w-20 h-20 sm:w-24 sm:h-24",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg sm:text-xl",
    lg: "text-2xl sm:text-3xl",
    xl: "text-3xl sm:text-4xl",
  };

  const taglineSizes = {
    sm: "text-[9px]",
    md: "text-[10px] sm:text-[11px]",
    lg: "text-xs sm:text-sm",
    xl: "text-sm",
  };

  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none group", className)}>
      {/* Official SmartZone Shield-Cart "SZ" Logo Emblem */}
      <div className={cn("relative shrink-0 flex items-center justify-center", iconSizes[size])}>
        <SmartZoneEmblem className="w-full h-full object-contain drop-shadow-sm transition-transform group-hover:scale-105" />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <div
            className={cn("font-black tracking-tight flex items-baseline gap-0.5", textSizes[size])}
          >
            <span
              className={cn(
                "font-black tracking-tight",
                dark ? "text-[#38BDF8]" : "text-[#0077B6]",
              )}
            >
              Smart
            </span>
            <span className="font-black tracking-tight text-[#FF7A00]">Zone</span>
          </div>
          {showTagline && (
            <span
              className={cn(
                "font-medium tracking-wide whitespace-nowrap",
                taglineSizes[size],
                dark ? "text-slate-300" : "text-slate-500",
              )}
            >
              Best Tech, Best Future
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const WorldLinksLogo = SmartZoneLogo;
