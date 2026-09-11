import type { LucideIcon } from "lucide-react";
import {
  Camera,
  Gauge,
  Home,
  Layers,
  Lightbulb,
  Lock,
  Plug,
  Radio,
  Shield,
  ShieldCheck,
  Thermometer,
  ToggleLeft,
  Wifi,
  Zap,
} from "lucide-react";
import { parseJsonSetting } from "@/lib/checkout-totals";

export const HOME_SHOP_CATEGORIES_KEY = "home_shop_categories";
export const HOME_TOP_BRANDS_KEY = "home_top_brands";

export type ShopByCategoryItem = {
  label: string;
  category: string;
  icon: LucideIcon;
  image_url?: string | null;
};

export type TopBrandItem = {
  name: string;
  manufacturer: string;
  initials: string;
  image_url?: string | null;
};

export type ShopByCategoryOverride = {
  label?: string;
  category: string;
  image_url?: string | null;
};

export type TopBrandOverride = {
  name?: string;
  manufacturer: string;
  initials?: string;
  image_url?: string | null;
};

/** First-run seed only. After admin save, the stored list is the source of truth. */
export const SHOP_BY_CATEGORIES: ShopByCategoryItem[] = [
  { label: "Smart Control Panel", category: "Smart Control Panels", icon: Layers },
  { label: "Curtain/Gate Motors", category: "Smart Curtain Systems", icon: Home },
  { label: "Timer Switches", category: "Smart Switches", icon: Zap },
  { label: "Voltage Protectors", category: "Electrical Parts", icon: Shield },
  { label: "Smart Circuit Breakers", category: "Smart Circuit Breakers", icon: Gauge },
  { label: "Smart Door Locks", category: "Smart Door Locks", icon: Lock },
  { label: "Smart Wall Switches", category: "Smart Switches", icon: ToggleLeft },
  { label: "Smart Sockets & Plugs", category: "Smart Sockets & Plugs", icon: Plug },
  { label: "Wireless CCTV", category: "Smart Security Cameras", icon: Camera },
  { label: "Smart Security Cameras", category: "Smart Security Cameras", icon: Camera },
  { label: "Tuya Smart Sensors", category: "Tuya Smart Sensors", icon: Radio },
  { label: "Lights & Sensors", category: "Tuya Sensors", icon: Lightbulb },
  { label: "Gateways", category: "Gateways", icon: Wifi },
  { label: "Smart Video Doorbells", category: "Smart Video Doorbells", icon: ShieldCheck },
  { label: "Smart Thermostats", category: "Smart Thermostats", icon: Thermometer },
];

/** First-run seed only. After admin save, the stored list is the source of truth. */
export const TOP_BRANDS: TopBrandItem[] = [
  { name: "Tuya Smart", manufacturer: "TYSH / Tuya Smart", initials: "TS" },
  { name: "TYSH", manufacturer: "TYSH / Tuya Smart", initials: "TY" },
  { name: "Raspberry Pi", manufacturer: "Raspberry Pi", initials: "RP" },
  { name: "Espressif", manufacturer: "Espressif", initials: "ES" },
  { name: "Siemens", manufacturer: "Siemens", initials: "SI" },
  { name: "Creality", manufacturer: "Creality", initials: "CR" },
  { name: "UNI-T", manufacturer: "UNI-T", initials: "UT" },
  { name: "MeanWell", manufacturer: "MeanWell", initials: "MW" },
];

export function defaultShopCategoryOverrides(): ShopByCategoryOverride[] {
  return SHOP_BY_CATEGORIES.map((item) => ({
    label: item.label,
    category: item.category,
    image_url: "",
  }));
}

/** SWST shop-by-category chips mapped onto SmartZone catalog names. Same labels replace; extras append. */
const SHOP_CATEGORY_REPLACEMENTS: Record<string, string> = {
  "security cameras": "Wireless CCTV",
  "security camera": "Wireless CCTV",
};

export function mergeSwstShopCategories(
  existing: ShopByCategoryOverride[],
): ShopByCategoryOverride[] {
  const seed = defaultShopCategoryOverrides();
  const seedByLabel = new Map(seed.map((item) => [item.label.toLowerCase(), item]));
  const next = existing.map((row) => {
    const key = row.label?.trim().toLowerCase() ?? "";
    const replacement = SHOP_CATEGORY_REPLACEMENTS[key];
    if (!replacement) return row;
    const mapped = seedByLabel.get(replacement.toLowerCase());
    return {
      ...row,
      label: replacement,
      category: mapped?.category ?? row.category,
    };
  });
  const have = new Set(next.map((row) => row.label?.trim().toLowerCase()).filter(Boolean));
  for (const item of seed) {
    const key = item.label.toLowerCase();
    if (have.has(key)) continue;
    next.push({ ...item });
    have.add(key);
  }
  return next;
}

export function defaultTopBrandOverrides(): TopBrandOverride[] {
  return TOP_BRANDS.map((item) => ({
    name: item.name,
    manufacturer: item.manufacturer,
    initials: item.initials,
    image_url: "",
  }));
}

function iconForCategory(category: string, label?: string): LucideIcon {
  return (
    SHOP_BY_CATEGORIES.find((item) => item.label === label || item.category === category)?.icon ??
    Layers
  );
}

/** `null` = never saved (use seed). `[]` = admin deleted every row. */
export function parseMerchOverrides<T>(value: unknown): T[] | null {
  if (value == null || value === "") return null;
  const once = parseJsonSetting<unknown>(value, null);
  if (once == null) return null;
  const twice = typeof once === "string" ? parseJsonSetting<unknown>(once, null) : once;
  if (!Array.isArray(twice)) return null;
  return twice as T[];
}

export function catalogImageByCategory(
  products: { category: string; image_url?: string | null }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  const used = new Set<string>();
  for (const p of products) {
    const url = p.image_url?.trim();
    if (!p.category || !url || map[p.category] || used.has(url)) continue;
    map[p.category] = url;
    used.add(url);
  }
  return map;
}

export function catalogImagesByBrand(
  products: { manufacturer?: string | null; image_url?: string | null }[],
): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const p of products) {
    const brand = p.manufacturer?.trim();
    const url = p.image_url?.trim();
    if (!brand || !url) continue;
    const list = (map[brand] ??= []);
    if (!list.includes(url)) list.push(url);
  }
  return map;
}

export function catalogImageByBrand(
  products: { manufacturer?: string | null; image_url?: string | null }[],
): Record<string, string> {
  const grouped = catalogImagesByBrand(products);
  const map: Record<string, string> = {};
  for (const [brand, urls] of Object.entries(grouped)) {
    if (urls[0]) map[brand] = urls[0];
  }
  return map;
}

export function mergeShopCategories(
  admin: ShopByCategoryOverride[] | null,
  catalogImages: Record<string, string>,
): ShopByCategoryItem[] {
  const source = admin ?? defaultShopCategoryOverrides();
  const used = new Set<string>();
  return source
    .filter((item) => item.category?.trim())
    .map((item) => {
      const category = item.category.trim();
      const merch = item.image_url?.trim() || "";
      const fallback = catalogImages[category]?.trim() || "";
      const image_url = merch || (fallback && !used.has(fallback) ? fallback : null);
      if (image_url) used.add(image_url);
      return {
        label: item.label?.trim() || category,
        category,
        icon: iconForCategory(category, item.label?.trim()),
        image_url,
      };
    });
}

export function brandInitials(name: string): string {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "SZ";
  return parts
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

export function mergeTopBrands(
  admin: TopBrandOverride[] | null,
  catalogImages: Record<string, string> | Record<string, string[]> = {},
): TopBrandItem[] {
  const usage = new Map<string, number>();
  const nextCatalogImage = (manufacturer: string): string | null => {
    const entry = catalogImages[manufacturer];
    const urls = Array.isArray(entry) ? entry : entry ? [entry] : [];
    if (!urls.length) return null;
    const index = usage.get(manufacturer) ?? 0;
    usage.set(manufacturer, index + 1);
    return urls[index % urls.length] ?? null;
  };

  const source = admin ?? defaultTopBrandOverrides();
  return source
    .filter((item) => item.name?.trim())
    .map((item) => {
      const name = item.name!.trim();
      const manufacturer = item.manufacturer?.trim() || name;
      return {
        name,
        manufacturer,
        initials: item.initials?.trim() || brandInitials(name),
        image_url: item.image_url?.trim() || nextCatalogImage(manufacturer),
      };
    });
}

export function pickHotSelling<
  T extends {
    id: string;
    availability: string;
    stock: number;
    discount_pct: number;
    rating: number | null;
    tags?: string[] | null;
  },
>(products: T[], limit = 6): T[] {
  const inStock = products.filter((p) => p.availability === "in_stock" && p.stock > 0);
  const marked = inStock.filter((p) =>
    Array.isArray(p.tags)
      ? p.tags.some((t) => String(t).toLowerCase() === "hot-selling")
      : false,
  );
  const scored = [...(marked.length ? marked : inStock)].sort((a, b) => {
    const score = (p: T) =>
      (Array.isArray(p.tags) && p.tags.some((t) => String(t).toLowerCase() === "hot-selling")
        ? 40
        : 0) +
      (p.discount_pct > 0 ? 24 : 0) +
      (p.rating ?? 4) * 8;
    return score(b) - score(a);
  });
  return scored.slice(0, limit);
}
