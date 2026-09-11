import { hasProductTag, FEATURED_TAG } from "@/lib/product-merch-tags";

const HOME_FEATURED_MIX = [
  "Smart Door Locks",
  "Smart Control Panels",
  "Smart Switches",
  "Smart Security Cameras",
  "Smart Video Doorbells",
  "Smart Curtain Systems",
  "Tuya Smart Sensors",
  "Smart Sockets & Plugs",
  "Gateways",
];

/** Round-robin mix so homepage never shows only the first catalog category. */
export function pickHomeFeaturedProducts<T extends { id: string; category: string }>(
  products: T[],
  limit = 24,
): T[] {
  const buckets = new Map<string, T[]>();
  for (const product of products) {
    const list = buckets.get(product.category) ?? [];
    list.push(product);
    buckets.set(product.category, list);
  }
  const preferred = HOME_FEATURED_MIX.filter((category) => buckets.has(category));
  const extra = [...buckets.keys()].filter((category) => !preferred.includes(category));
  const cats = [...preferred, ...extra];
  const picked: T[] = [];
  const used = new Set<string>();
  let i = 0;
  while (picked.length < limit && cats.length) {
    const idx = i % cats.length;
    const category = cats[idx];
    const bucket = buckets.get(category);
    const next = bucket?.shift();
    if (next && !used.has(next.id)) {
      picked.push(next);
      used.add(next.id);
    }
    if (!bucket?.length) {
      cats.splice(idx, 1);
      continue;
    }
    i += 1;
  }
  return picked;
}

/** Prefer admin-marked featured SKUs; fall back to category mix. */
export function pickHomeFeaturedProductsWithFlags<
  T extends { id: string; category: string; tags?: string[] | null },
>(products: T[], limit = 24): T[] {
  const marked = products.filter((p) => hasProductTag(p.tags, FEATURED_TAG));
  if (!marked.length) return pickHomeFeaturedProducts(products, limit);
  const rest = pickHomeFeaturedProducts(
    products.filter((p) => !hasProductTag(p.tags, FEATURED_TAG)),
    Math.max(0, limit - marked.length),
  );
  return [...marked, ...rest].slice(0, limit);
}
