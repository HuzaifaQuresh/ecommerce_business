import { useLayoutEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

const SCROLL_CACHE_KEY = "tsr-scroll-restoration-v1_3";

function hasInPageHash() {
  return typeof window !== "undefined" && window.location.hash.length > 1;
}

function pinToTop() {
  if (typeof window === "undefined" || hasInPageHash()) return;
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

/** Stops refresh/hydration from restoring an old scroll offset (page jumping to the footer). */
export function ScrollReset() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const prevPath = useRef(pathname);

  useLayoutEffect(() => {
    try {
      history.scrollRestoration = "manual";
    } catch {
      /* ignore */
    }

    const nav = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav?.type === "reload" && !hasInPageHash()) {
      try {
        sessionStorage.removeItem(SCROLL_CACHE_KEY);
      } catch {
        /* ignore */
      }
      pinToTop();
      requestAnimationFrame(pinToTop);
    }
  }, []);

  useLayoutEffect(() => {
    if (prevPath.current === pathname) {
      if (pathname === "/auth" || pathname.startsWith("/auth/")) pinToTop();
      return;
    }
    prevPath.current = pathname;
    if (hasInPageHash()) return;
    pinToTop();
    requestAnimationFrame(pinToTop);
  }, [pathname]);

  return null;
}

export const SCROLL_RESET_BOOT_SCRIPT = `(function(){try{history.scrollRestoration="manual"}catch(e){}var h=location.hash&&location.hash.length>1;if(h)return;var n=performance.getEntriesByType&&performance.getEntriesByType("navigation")[0];if(n&&n.type==="reload"){try{sessionStorage.removeItem("${SCROLL_CACHE_KEY}")}catch(e){}window.scrollTo(0,0)}})();`;
