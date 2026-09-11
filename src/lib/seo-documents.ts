import { fetchProducts } from "@/api/products";
import { TOP_LEVEL_CATEGORIES } from "@/lib/categories";
import {
  SITE_ORIGIN,
  absoluteUrl,
  buildSitemapXml,
  robotsTxt,
  type SitemapEntry,
} from "@/lib/seo";

function xmlResponse(body: string, cacheSeconds = 3600): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": `public, max-age=${cacheSeconds}`,
    },
  });
}

function textResponse(body: string, contentType: string, cacheSeconds = 86400): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": `public, max-age=${cacheSeconds}`,
    },
  });
}

export function tryServeSeoDocument(request: Request): Response | null {
  const { pathname } = new URL(request.url);
  if (pathname === "/robots.txt") {
    return textResponse(robotsTxt(), "text/plain; charset=utf-8");
  }
  if (pathname === "/sitemap.xml") {
    return null; // async path — handled by serveSitemap
  }
  if (pathname === "/apple-touch-icon.png" || pathname === "/apple-touch-icon.png/") {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/favicon.svg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
  return null;
}

export async function serveSitemap(): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10);
  const entries: SitemapEntry[] = [
    { loc: absoluteUrl("/"), lastmod: today, changefreq: "daily", priority: 1 },
    { loc: absoluteUrl("/products"), lastmod: today, changefreq: "daily", priority: 0.9 },
    {
      loc: absoluteUrl("/iot-solutions"),
      lastmod: today,
      changefreq: "weekly",
      priority: 0.9,
    },
    {
      loc: absoluteUrl("/iot-sensors"),
      lastmod: today,
      changefreq: "weekly",
      priority: 0.95,
    },
    {
      loc: absoluteUrl("/smart-home"),
      lastmod: today,
      changefreq: "weekly",
      priority: 0.95,
    },
  ];

  for (const category of TOP_LEVEL_CATEGORIES) {
    const qs = new URLSearchParams({ category });
    entries.push({
      loc: `${SITE_ORIGIN}/products?${qs.toString()}`,
      lastmod: today,
      changefreq: "weekly",
      priority: 0.7,
    });
  }

  try {
    const products = await fetchProducts();
    const seen = new Set<string>();
    for (const product of products) {
      const slug = (product.slug || "").trim();
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      entries.push({
        loc: absoluteUrl(`/products/${encodeURIComponent(slug)}`),
        lastmod: today,
        changefreq: "weekly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.error("[seo] sitemap product list failed", err);
  }

  return xmlResponse(buildSitemapXml(entries), 3600);
}
