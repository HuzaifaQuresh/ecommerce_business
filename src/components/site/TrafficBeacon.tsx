import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { recordVisit } from "@/api/traffic";

const SID_KEY = "sz_traffic_sid";

function sessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = sessionStorage.getItem(SID_KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SID_KEY, id);
    return id;
  } catch {
    return "";
  }
}

/** Records storefront page views. Admin/vendor routes are ignored server-side. */
export function TrafficBeacon() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const last = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (path.startsWith("/admin") || path.startsWith("/vendor")) return;
    if (last.current === path) return;
    last.current = path;
    if (navigator.webdriver) return;

    const sid = sessionId();
    if (!sid) return;
    void recordVisit({ data: { sessionId: sid, path } }).catch(() => {
      /* non-blocking */
    });
  }, [path]);

  return null;
}
