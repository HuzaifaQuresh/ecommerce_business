import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { AuthProvider } from "@/hooks/useAuth";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CartDrawer } from "@/components/site/CartDrawer";
import { WishlistDrawer } from "@/components/site/WishlistDrawer";
import { MobileStoreNav } from "@/components/site/MobileStoreNav";
import { WhatsAppWidget } from "@/components/site/WhatsAppWidget";
import { TrafficBeacon } from "@/components/site/TrafficBeacon";
import { GoogleAnalytics } from "@/components/site/GoogleAnalytics";
import { ScrollReset, SCROLL_RESET_BOOT_SCRIPT } from "@/components/site/ScrollReset";
import { AUTH_BOOT_SCRIPT } from "@/lib/auth-url-snapshot";
import { CATALOG_BOOT_SCRIPT } from "@/lib/catalog-version";
import { Toaster } from "@/components/ui/sonner";
import { ensureTuyaCatalogLoaded, initializeMockProductsOnClient } from "@/lib/mock-products";
import { fetchSiteSettings, SITE_SETTINGS_QUERY_KEY, SITE_SETTINGS_STALE_MS } from "@/api/settings";
import {
  DEFAULT_META,
  absoluteUrl,
  canonicalLink,
  ldJsonScript,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const detail = error?.message?.trim() || (error ? String(error) : "");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        {detail ? (
          <pre className="mt-3 max-h-32 overflow-auto rounded-md border bg-muted/60 px-3 py-2 text-left text-[11px] leading-snug text-muted-foreground whitespace-pre-wrap">
            {detail}
          </pre>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: SITE_SETTINGS_QUERY_KEY,
      staleTime: SITE_SETTINGS_STALE_MS,
      queryFn: fetchSiteSettings,
    }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#FF7A00" },
      { name: "robots", content: "index,follow,max-image-preview:large" },
      { title: DEFAULT_META.title },
      { name: "description", content: DEFAULT_META.description },
      { name: "keywords", content: DEFAULT_META.keywords },
      { property: "og:site_name", content: "SmartZone" },
      { property: "og:locale", content: "en_PK" },
      { property: "og:title", content: DEFAULT_META.ogTitle },
      { property: "og:description", content: DEFAULT_META.ogDescription },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/") },
      { property: "og:image", content: absoluteUrl("/og-image.svg") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: DEFAULT_META.ogTitle },
      { name: "twitter:description", content: DEFAULT_META.ogDescription },
      { name: "twitter:image", content: absoluteUrl("/og-image.svg") },
    ],
    links: [
      canonicalLink("/"),
      { rel: "preconnect", href: "https://images.unsplash.com" },
      { rel: "dns-prefetch", href: "https://images.unsplash.com" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "shortcut icon", href: "/favicon.ico" },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [ldJsonScript(organizationJsonLd()), ldJsonScript(websiteJsonLd())],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: AUTH_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: CATALOG_BOOT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: SCROLL_RESET_BOOT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const vendorPublic = path === "/vendor/auth" || path === "/vendor/apply";
  const isDashboard = path.startsWith("/admin") || (path.startsWith("/vendor") && !vendorPublic);
  const hideStoreChrome = isDashboard || vendorPublic;

  useEffect(() => {
    const loadCatalog = () => {
      void ensureTuyaCatalogLoaded().then(() => initializeMockProductsOnClient());
    };
    const idle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(loadCatalog, { timeout: 2000 })
        : window.setTimeout(loadCatalog, 400);
    return () => {
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle as number);
      else clearTimeout(idle as number);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
              {!hideStoreChrome && <Header />}
              {!hideStoreChrome && (
                <div
                  className="shrink-0"
                  style={{ height: "var(--sz-header-height, 7.5rem)" }}
                  aria-hidden
                />
              )}
              <ScrollReset />
              <main className={hideStoreChrome ? "min-h-screen" : "min-h-[60vh] storefront-main"}>
                <Outlet />
              </main>
              {!hideStoreChrome && <Footer />}
              {!hideStoreChrome && <MobileStoreNav />}
              {!hideStoreChrome && <WhatsAppWidget />}
              <CartDrawer />
              <WishlistDrawer />
              <TrafficBeacon />
              <GoogleAnalytics />
              <Toaster richColors position="top-right" />
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
