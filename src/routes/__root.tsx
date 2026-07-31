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
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CartDrawer } from "@/components/site/CartDrawer";
import { WishlistDrawer } from "@/components/site/WishlistDrawer";
import { MobileStoreNav } from "@/components/site/MobileStoreNav";
import { Toaster } from "@/components/ui/sonner";
import { initializeMockProductsOnClient } from "@/lib/mock-products";

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
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
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0284c7" },
      { title: "NexusIoT — IoT Automation, Smart Home & Tuya Sensors in Pakistan" },
      {
        name: "description",
        content:
          "Pakistan's premier IoT, smart home and Tuya sensor platform. Cameras, gateways, dev boards, industrial automation and custom enterprise IoT deployments.",
      },
      {
        property: "og:title",
        content: "NexusIoT — IoT Automation, Smart Home & Tuya Sensors in Pakistan",
      },
      {
        property: "og:description",
        content:
          "Pakistan's premier IoT, smart home and Tuya sensor platform. Cameras, gateways, dev boards, industrial automation and custom enterprise IoT deployments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "NexusIoT — IoT Automation, Smart Home & Tuya Sensors in Pakistan",
      },
      {
        name: "twitter:description",
        content:
          "Pakistan's premier IoT, smart home and Tuya sensor platform. Cameras, gateways, dev boards, industrial automation and custom enterprise IoT deployments.",
      },
      { property: "og:image", content: "/og-image.svg" },
      { name: "twitter:image", content: "/og-image.svg" },
    ],
    links: [
      { rel: "preconnect", href: "https://images.unsplash.com" },
      { rel: "dns-prefetch", href: "https://images.unsplash.com" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
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
  const isDashboard = path.startsWith("/admin") || path.startsWith("/vendor");

  useEffect(() => {
    initializeMockProductsOnClient();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WishlistProvider>
        <CartProvider>
          {!isDashboard && <Header />}
          <main className={isDashboard ? "min-h-screen" : "min-h-[60vh] storefront-main"}>
            <Outlet />
          </main>
          {!isDashboard && <Footer />}
          {!isDashboard && <MobileStoreNav />}
          <CartDrawer />
          <WishlistDrawer />
          <Toaster richColors position="top-right" />
        </CartProvider>
      </WishlistProvider>
    </QueryClientProvider>
  );
}
