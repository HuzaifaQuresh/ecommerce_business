/** Site-wide SEO helpers for SmartZone (smartzone.pk). */

export const SITE_ORIGIN = "https://smartzone.pk";
export const SITE_NAME = "SmartZone";

/** High-intent queries we want Google to associate with smartzone.pk */
export const TARGET_SEARCH_KEYWORDS = [
  "smartzone",
  "smartzone pk",
  "smartzone.pk",
  "iot sensor",
  "iot sensors",
  "iot devices Pakistan",
  "smart home",
  "smart home Pakistan",
  "zigbee sensors",
  "automations",
  "home automation",
  "MQTT sensors",
  "wifi sensors",
  "tuya sensor Pakistan",
  "tuya sensors",
  "tuya smart life",
] as const;

export const DEFAULT_META = {
  title: "SmartZone (smartzone.pk) | Smart Home, IoT Sensors & Devices Pakistan",
  description:
    "SmartZone (smartzone.pk) — buy IoT sensors, Zigbee sensors, WiFi & MQTT sensors, Tuya sensors, and smart home automations in Pakistan. Blue Area, Islamabad. COD nationwide.",
  ogTitle: "SmartZone Pakistan | IoT Sensors, Smart Home & Tuya Devices",
  ogDescription:
    "Official smartzone.pk store for IoT devices, Zigbee/WiFi/MQTT sensors, Tuya smart home, CCTV and automation hardware across Pakistan.",
  keywords: TARGET_SEARCH_KEYWORDS.join(", "),
};

export const SEO_TOPIC_LINKS: {
  label: string;
  to: string;
  search?: Record<string, string>;
  hash?: string;
}[] = [
  { label: "SmartZone PK", to: "/" },
  { label: "IoT Sensors Pakistan", to: "/iot-sensors" },
  { label: "Smart Home", to: "/smart-home" },
  { label: "Automations", to: "/automations" },
  { label: "Zigbee Sensors", to: "/zigbee-sensors" },
  { label: "WiFi Sensors", to: "/wifi-sensors" },
  { label: "MQTT Sensors", to: "/mqtt-sensors" },
  { label: "Tuya Sensors Pakistan", to: "/tuya-sensors" },
  { label: "IoT Devices Pakistan", to: "/iot-devices" },
  { label: "Smart Home Automation", to: "/products", search: { category: "Smart Home Automation" } },
  { label: "IoT Solutions Install", to: "/iot-solutions" },
];

const CATEGORY_SEO: Record<string, { title: string; description: string }> = {
  "Tuya Smart Sensors": {
    title: "Tuya Sensors Pakistan | Zigbee, WiFi & IoT Sensors | SmartZone",
    description:
      "Buy Tuya sensors in Pakistan at smartzone.pk — Zigbee sensors, WiFi sensors, temperature, motion, door/window and gas sensors with COD.",
  },
  "Tuya Sensors": {
    title: "Tuya Sensors Pakistan | SmartZone (smartzone.pk)",
    description:
      "Shop Tuya sensor Pakistan catalog — Zigbee & WiFi IoT sensors for smart home automations. Official SmartZone pricing in PKR.",
  },
  "IoT Sensors": {
    title: "IoT Sensors Pakistan | Zigbee, WiFi, MQTT | SmartZone",
    description:
      "IoT sensor devices in Pakistan — Zigbee sensors, WiFi sensors and MQTT-ready nodes for home and industrial automations at SmartZone.",
  },
  "Smart Home Automation": {
    title: "Smart Home Automations Pakistan | Tuya & Zigbee | SmartZone",
    description:
      "Smart home automation kits and devices in Pakistan — scenes, Zigbee sensors, WiFi controls and Tuya Smart Life gear from SmartZone.",
  },
  "IoT Solutions": {
    title: "IoT Devices Pakistan | Sensors, Gateways & Automation | SmartZone",
    description:
      "IoT devices Pakistan — sensors, gateways, smart switches and industrial IoT hardware. Shop smartzone.pk with nationwide delivery.",
  },
  Gateways: {
    title: "Zigbee & WiFi IoT Gateways Pakistan | SmartZone",
    description:
      "Tuya Zigbee gateways and WiFi hubs for MQTT/cloud automations. Buy IoT gateways in Pakistan at SmartZone.",
  },
};

export function categorySeo(category: string): { title: string; description: string } | null {
  const key = category.trim();
  return CATEGORY_SEO[key] ?? null;
}

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return `${SITE_ORIGIN}/`;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function clipMeta(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function productPageTitle(title: string): string {
  const name = title.trim() || "Smart Device";
  const base = `${name} Price in Pakistan | ${SITE_NAME}`;
  return base.length <= 65 ? base : clipMeta(`${name} | ${SITE_NAME}`, 60);
}

export function productPageDescription(input: {
  title: string;
  category?: string | null;
  manufacturer?: string | null;
  price_pkr?: number | null;
  description?: string | null;
}): string {
  const price =
    typeof input.price_pkr === "number" && Number.isFinite(input.price_pkr) && input.price_pkr > 0
      ? ` From PKR ${Math.round(input.price_pkr).toLocaleString("en-PK")}.`
      : "";
  const brand = input.manufacturer ? ` by ${input.manufacturer}` : "";
  const cat = input.category ? ` in ${input.category}` : "";
  const blurb = (input.description || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const lead = blurb
    ? blurb
    : `Buy ${input.title}${brand}${cat} online at SmartZone Pakistan.${price} Fast shipping & COD.`;
  return clipMeta(lead.includes("SmartZone") ? lead : `${lead}${price} Shop at SmartZone.`);
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness", "ElectronicsStore"],
    name: SITE_NAME,
    alternateName: ["SmartZone Pakistan", "smartzone.pk", "Smart Zone", "Smartzone PK"],
    url: SITE_ORIGIN,
    logo: absoluteUrl("/smartzone-logo.svg"),
    image: absoluteUrl("/og-image.svg"),
    email: "info@smartzone.pk",
    telephone: "+92-332-3059259",
    description: DEFAULT_META.description,
    keywords: DEFAULT_META.keywords,
    knowsAbout: [...TARGET_SEARCH_KEYWORDS],
    address: {
      "@type": "PostalAddress",
      streetAddress: "Blue Area",
      addressLocality: "Islamabad",
      addressRegion: "Islamabad Capital Territory",
      addressCountry: "PK",
    },
    areaServed: [
      { "@type": "City", name: "Islamabad" },
      { "@type": "City", name: "Rawalpindi" },
      { "@type": "Country", name: "Pakistan" },
    ],
    sameAs: [] as string[],
  };
}

/** Helps Google map brand/domain queries (smartzone.pk) to the official homepage. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: ["SmartZone Pakistan", "smartzone.pk", "Smartzone PK"],
    url: SITE_ORIGIN,
    description: DEFAULT_META.description,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_ORIGIN}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function productJsonLd(input: {
  title: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  price_pkr?: number | null;
  availability?: string | null;
  manufacturer?: string | null;
}) {
  const url = absoluteUrl(`/products/${input.slug}`);
  const availability =
    input.availability === "in_stock"
      ? "https://schema.org/InStock"
      : input.availability === "coming_soon"
        ? "https://schema.org/PreOrder"
        : input.availability === "obsolete"
          ? "https://schema.org/Discontinued"
          : "https://schema.org/LimitedAvailability";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.title,
    description: clipMeta(
      (input.description || `${input.title} available at SmartZone Pakistan.`).replace(/<[^>]+>/g, " "),
      300,
    ),
    sku: input.slug,
    brand: input.manufacturer
      ? { "@type": "Brand", name: input.manufacturer }
      : { "@type": "Brand", name: SITE_NAME },
    image: input.image_url ? [input.image_url] : [absoluteUrl("/placeholder-product.svg")],
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "PKR",
      price: String(Math.max(0, Math.round(Number(input.price_pkr) || 0))),
      availability,
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

export function collectionPageJsonLd(input: {
  name: string;
  description: string;
  urlPath: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.urlPath),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_ORIGIN },
    about: [...TARGET_SEARCH_KEYWORDS],
  };
}

export function ldJsonScript(data: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(data),
  };
}

export function canonicalLink(path: string) {
  return { rel: "canonical", href: absoluteUrl(path) };
}

export function robotsTxt(): string {
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /account
Disallow: /account/
Disallow: /auth
Disallow: /auth/
Disallow: /vendor
Disallow: /vendor/
Disallow: /checkout
Disallow: /cart
Disallow: /setup
Disallow: /403

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
}

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const body = entries
    .map((entry) => {
      const parts = [`    <loc>${escapeXml(entry.loc)}</loc>`];
      if (entry.lastmod) parts.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      if (entry.changefreq) parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      if (typeof entry.priority === "number") {
        parts.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      }
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}
