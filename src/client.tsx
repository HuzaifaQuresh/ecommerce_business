import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";

/** After a deploy, stale tabs can request hashed chunks that 404 briefly. Hard-reload once. */
if (typeof window !== "undefined") {
  const reloadOnce = () => {
    try {
      const key = "sz:chunk-reload";
      const last = Number(sessionStorage.getItem(key) || "0");
      if (Date.now() - last < 15_000) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    reloadOnce();
  });
}

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  );
});
