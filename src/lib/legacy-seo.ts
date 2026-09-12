import { SITE_ORIGIN } from "@/lib/seo";

function redirect301(location: string): Response {
  return new Response(null, {
    status: 301,
    headers: {
      Location: location,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

function gone410(): Response {
  return new Response("Gone", {
    status: 410,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

/**
 * Map legacy WordPress / WooCommerce URLs (and crashy PHP paths) so Google
 * stops seeing Soft 404 / Duplicate / 5xx on the old URL inventory.
 */
export function legacySeoRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const path = url.pathname;
  const lower = path.toLowerCase();

  if (
    lower === "/feed" ||
    lower.startsWith("/feed/") ||
    lower === "/comments/feed" ||
    lower.startsWith("/comments/feed/")
  ) {
    return gone410();
  }

  // Dead PHP / WP endpoints → 410 (better than Worker 5xx)
  if (
    lower.endsWith(".php") ||
    lower.startsWith("/wp-admin") ||
    lower.startsWith("/wp-content") ||
    lower.startsWith("/wp-includes") ||
    lower.startsWith("/wp-json") ||
    lower.includes("/wp-login")
  ) {
    return gone410();
  }

  // WooCommerce / WP query URLs on any path (usually homepage)
  const productSlug = url.searchParams.get("product")?.trim();
  if (productSlug) {
    const slug = encodeURIComponent(productSlug.replace(/\s+/g, "-").toLowerCase());
    return redirect301(`${SITE_ORIGIN}/products/${slug}`);
  }

  if (url.searchParams.has("product_cat") || url.searchParams.has("product_tag")) {
    return redirect301(`${SITE_ORIGIN}/products`);
  }

  if (url.searchParams.has("p") || url.searchParams.has("page_id") || url.searchParams.has("attachment_id")) {
    return redirect301(`${SITE_ORIGIN}/`);
  }

  if (url.searchParams.has("s")) {
    const q = (url.searchParams.get("s") || "").trim();
    const target = q
      ? `${SITE_ORIGIN}/products?q=${encodeURIComponent(q)}`
      : `${SITE_ORIGIN}/products`;
    return redirect301(target);
  }

  if (url.searchParams.has("post_type") && url.searchParams.get("post_type") === "product") {
    return redirect301(`${SITE_ORIGIN}/products`);
  }

  // Path aliases
  if (lower === "/shop" || lower.startsWith("/shop/")) {
    return redirect301(`${SITE_ORIGIN}/products`);
  }
  if (lower.startsWith("/product-category/") || lower.startsWith("/product-tag/")) {
    return redirect301(`${SITE_ORIGIN}/products`);
  }
  if (lower === "/cart/" || lower === "/my-account" || lower === "/my-account/") {
    return redirect301(`${SITE_ORIGIN}/account`);
  }
  if (lower.startsWith("/page/")) {
    return redirect301(`${SITE_ORIGIN}/`);
  }

  // /product/:slug → /products/:slug (server 301, not client Navigate)
  const productAlias = lower.match(/^\/product\/([^/]+)\/?$/);
  if (productAlias?.[1]) {
    return redirect301(`${SITE_ORIGIN}/products/${encodeURIComponent(productAlias[1])}`);
  }

  return null;
}
