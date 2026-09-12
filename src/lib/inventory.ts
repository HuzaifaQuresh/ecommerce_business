import { supabase } from "@/integrations/supabase/client";
import {
  getMockProductBySlug,
  MOCK_PRODUCTS,
  saveLocalProduct,
} from "@/lib/mock-products";
import type { ProductRow } from "@/types/commerce";

export type InventoryLine = { slug: string; quantity: number };

function isSupabaseConfigured() {
  const url = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  if (
    url.includes("placeholder") ||
    url.includes("your-supabase-id") ||
    url.includes("xyz") ||
    !url.startsWith("https://")
  ) {
    return false;
  }
  return true;
}

function normalizeLines(items: InventoryLine[]): InventoryLine[] {
  const merged = new Map<string, number>();
  for (const item of items) {
    const slug = String(item.slug ?? "").trim();
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    if (!slug || qty <= 0) continue;
    merged.set(slug, (merged.get(slug) ?? 0) + qty);
  }
  return [...merged.entries()].map(([slug, quantity]) => ({ slug, quantity }));
}

/** Stock lines that must be decremented (in_stock only). */
export function stockEnforcedLines(
  items: { product_slug?: string | null; slug?: string; quantity: number }[],
): InventoryLine[] {
  const lines: InventoryLine[] = [];
  for (const item of items) {
    const slug = String(item.product_slug || item.slug || "").trim();
    if (!slug) continue;
    const product = getMockProductBySlug(slug);
    const availability = product?.availability || "in_stock";
    if (availability !== "in_stock") continue;
    lines.push({ slug, quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)) });
  }
  return normalizeLines(lines);
}

export async function fetchInventoryMap(slugs?: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!isSupabaseConfigured()) return map;
  try {
    let query = supabase.from("product_inventory").select("slug, stock");
    if (slugs?.length) {
      query = query.in("slug", slugs);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("fetchInventoryMap:", error.message);
      return map;
    }
    for (const row of data ?? []) {
      if (row?.slug) map.set(String(row.slug), Number(row.stock) || 0);
    }
  } catch (err) {
    console.warn("fetchInventoryMap failed:", err);
  }
  return map;
}

/** Seed missing inventory rows from catalog so first-come decrement has a baseline. */
export async function ensureInventoryForProducts(
  products: { slug: string; stock: number; availability?: string }[],
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const candidates = products.filter(
    (p) => p.slug && (p.availability ?? "in_stock") === "in_stock",
  );
  if (!candidates.length) return;

  const existing = await fetchInventoryMap(candidates.map((p) => p.slug));
  const missing = candidates.filter((p) => !existing.has(p.slug));
  if (!missing.length) return;

  // Cap burst size to avoid flooding RPC on cold start
  const batch = missing.slice(0, 80);
  await Promise.all(
    batch.map((p) =>
      supabase
        .rpc("ensure_inventory_row", {
          p_slug: p.slug,
          p_stock: Math.max(0, Number(p.stock) || 0),
        })
        .then(({ error }) => {
          if (error) console.warn("ensure_inventory_row", p.slug, error.message);
        }),
    ),
  );
}

export function applyInventoryToProduct<T extends { slug: string; stock: number; availability: string }>(
  product: T,
  inventory: Map<string, number>,
): T {
  if (product.availability !== "in_stock") return product;
  if (!inventory.has(product.slug)) return product;
  const stock = Math.max(0, inventory.get(product.slug) ?? 0);
  return { ...product, stock };
}

/** Merge live inventory into a product list (admin + storefront helpers). */
export async function mergeProductsWithInventory<T extends { slug: string; stock: number; availability: string }>(
  products: T[],
): Promise<T[]> {
  if (!products.length) return products;
  await ensureInventoryForProducts(products);
  const inventory = await fetchInventoryMap(products.map((p) => p.slug));
  return products.map((p) => applyInventoryToProduct(p, inventory));
}

export async function upsertInventoryStock(slug: string, stock: number): Promise<void> {
  const s = String(slug || "").trim();
  if (!s) return;
  const qty = Math.max(0, Math.floor(Number(stock) || 0));

  // Always update local catalog overlay
  const local = getMockProductBySlug(s);
  if (local) {
    saveLocalProduct({ ...local, stock: qty } as ProductRow);
  }

  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.rpc("upsert_inventory", { p_slug: s, p_stock: qty });
  if (error) {
    // Fallback direct upsert if RPC blocked for role
    const { error: e2 } = await supabase.from("product_inventory").upsert({
      slug: s,
      stock: qty,
      updated_at: new Date().toISOString(),
    });
    if (e2) console.warn("upsertInventoryStock:", error.message, e2.message);
  }
}

export async function decrementInventory(items: InventoryLine[]): Promise<void> {
  const lines = normalizeLines(items);
  if (!lines.length) return;

  if (!isSupabaseConfigured()) {
    for (const line of lines) {
      const product = getMockProductBySlug(line.slug);
      if (!product || product.availability !== "in_stock") continue;
      const next = Math.max(0, Number(product.stock) - line.quantity);
      if (Number(product.stock) < line.quantity) {
        throw new Error(`Insufficient stock for “${product.title}”. Only ${product.stock} left.`);
      }
      saveLocalProduct({ ...product, stock: next } as ProductRow);
    }
    return;
  }

  // Seed any missing rows from catalog before atomic decrement
  await ensureInventoryForProducts(
    lines.map((l) => {
      const p = getMockProductBySlug(l.slug);
      return {
        slug: l.slug,
        stock: Number(p?.stock) || 0,
        availability: p?.availability || "in_stock",
      };
    }),
  );

  const { error } = await supabase.rpc("decrement_inventory", {
    p_items: lines,
  });
  if (error) {
    const msg = error.message || "";
    const match = msg.match(/INSUFFICIENT_STOCK:([^\s]+)/);
    if (match?.[1]) {
      const slug = match[1];
      const product = getMockProductBySlug(slug);
      const inv = await fetchInventoryMap([slug]);
      const left = inv.get(slug) ?? product?.stock ?? 0;
      throw new Error(
        left > 0
          ? `“${product?.title || slug}” — only ${left} left. Another customer may have ordered first.`
          : `“${product?.title || slug}” is out of stock.`,
      );
    }
    throw new Error(msg || "Could not reserve stock for this order.");
  }

  // Refresh local overlays after successful decrement
  const map = await fetchInventoryMap(lines.map((l) => l.slug));
  for (const line of lines) {
    const product = getMockProductBySlug(line.slug);
    if (!product) continue;
    const stock = map.has(line.slug) ? map.get(line.slug)! : Math.max(0, Number(product.stock) - line.quantity);
    saveLocalProduct({ ...product, stock } as ProductRow);
  }
}

export async function restoreInventory(items: InventoryLine[]): Promise<void> {
  const lines = normalizeLines(items);
  if (!lines.length) return;

  if (!isSupabaseConfigured()) {
    for (const line of lines) {
      const product = getMockProductBySlug(line.slug);
      if (!product) continue;
      saveLocalProduct({
        ...product,
        stock: Math.max(0, Number(product.stock) + line.quantity),
      } as ProductRow);
    }
    return;
  }

  const { error } = await supabase.rpc("restore_inventory", { p_items: lines });
  if (error) console.warn("restoreInventory:", error.message);

  const map = await fetchInventoryMap(lines.map((l) => l.slug));
  for (const line of lines) {
    const product = getMockProductBySlug(line.slug);
    if (!product) continue;
    const stock = map.get(line.slug);
    if (typeof stock === "number") {
      saveLocalProduct({ ...product, stock } as ProductRow);
    }
  }
}

export async function getLiveStockBySlug(slug: string): Promise<number | null> {
  const s = String(slug || "").trim();
  if (!s) return null;
  const map = await fetchInventoryMap([s]);
  if (map.has(s)) return map.get(s)!;
  const product = getMockProductBySlug(s) || MOCK_PRODUCTS.find((p) => p.slug === s);
  return product ? Number(product.stock) || 0 : null;
}
