/**
 * Build-time sitemap (pure Node, no Vite).
 * Extracts product slugs from catalog sources and writes public/sitemap.xml.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://smartzone.pk";

const TOP_LEVEL_CATEGORIES = [
  "Development Boards",
  "Engineering Services",
  "Accessories",
  "Camera Solutions",
  "IoT Solutions",
  "Robotics",
  "PCB Assembly Line",
  "Smart Boards",
  "Tuya Smart Sensors",
  "Smart Home Automation",
  "IoT Sensors",
  "Tuya Sensors",
  "Gateways",
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc, priority, changefreq = "weekly") {
  const today = new Date().toISOString().slice(0, 10);
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function extractSlugs(filePath) {
  const text = readFileSync(filePath, "utf8");
  const slugs = new Set();
  const re = /slug\s*:\s*["'`]([^"'`]+)["'`]/g;
  let match;
  while ((match = re.exec(text))) {
    const slug = match[1].trim();
    if (
      slug &&
      !slug.startsWith("mock-") &&
      !slug.startsWith("test-") &&
      !slug.startsWith("demo-")
    ) {
      slugs.add(slug);
    }
  }
  return slugs;
}

const entries = [
  urlEntry(`${SITE}/`, "1.0", "daily"),
  urlEntry(`${SITE}/products`, "0.9", "daily"),
  urlEntry(`${SITE}/iot-solutions`, "0.9", "weekly"),
  urlEntry(`${SITE}/iot-sensors`, "0.95", "weekly"),
  urlEntry(`${SITE}/smart-home`, "0.95", "weekly"),
  urlEntry(`${SITE}/zigbee-sensors`, "0.95", "weekly"),
  urlEntry(`${SITE}/wifi-sensors`, "0.95", "weekly"),
  urlEntry(`${SITE}/mqtt-sensors`, "0.95", "weekly"),
  urlEntry(`${SITE}/tuya-sensors`, "0.95", "weekly"),
  urlEntry(`${SITE}/iot-devices`, "0.95", "weekly"),
  urlEntry(`${SITE}/automations`, "0.95", "weekly"),
];

for (const category of TOP_LEVEL_CATEGORIES) {
  const qs = new URLSearchParams({ category });
  entries.push(urlEntry(`${SITE}/products?${qs.toString()}`, "0.7"));
}

const slugFiles = [
  join(root, "src/lib/tuya-catalog-data.ts"),
  join(root, "src/lib/mock-catalog.ts"),
];

const seen = new Set();
for (const file of slugFiles) {
  try {
    for (const slug of extractSlugs(file)) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      entries.push(urlEntry(`${SITE}/products/${encodeURIComponent(slug)}`, "0.6"));
    }
  } catch (err) {
    console.warn(`[seo] skip ${file}:`, err instanceof Error ? err.message : err);
  }
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

const out = join(root, "public", "sitemap.xml");
writeFileSync(out, xml, "utf8");
console.log(`[seo] wrote ${out} (${entries.length} URLs, ${seen.size} products)`);
