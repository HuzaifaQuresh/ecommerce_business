import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useSiteSettings } from "@/hooks/useSiteSettings";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function readGaId(settings?: Record<string, unknown> | null): string {
  const fromSettings = String(settings?.google_analytics_id ?? settings?.ga_measurement_id ?? "")
    .replace(/^"|"$/g, "")
    .trim();
  if (fromSettings && /^G-[A-Z0-9]+$/i.test(fromSettings)) return fromSettings;
  const fromEnv = String(import.meta.env.VITE_GA_MEASUREMENT_ID ?? "").trim();
  if (fromEnv && /^G-[A-Z0-9]+$/i.test(fromEnv)) return fromEnv;
  return "";
}

function ensureGtag(gaId: string) {
  if (typeof document === "undefined") return;
  if (document.getElementById("sz-ga4")) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer?.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", gaId, {
    anonymize_ip: true,
    send_page_view: false,
  });

  const script = document.createElement("script");
  script.id = "sz-ga4";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  document.head.appendChild(script);
}

/** Loads GA4 when Admin setting or VITE_GA_MEASUREMENT_ID is set; tracks SPA navigations. */
export function GoogleAnalytics() {
  const { data: settings } = useSiteSettings();
  const gaId = readGaId(settings);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.searchStr });

  useEffect(() => {
    if (!gaId) return;
    ensureGtag(gaId);
  }, [gaId]);

  useEffect(() => {
    if (!gaId || typeof window === "undefined" || !window.gtag) return;
    const pagePath = `${pathname}${search || ""}`;
    window.gtag("event", "page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [gaId, pathname, search]);

  return null;
}
