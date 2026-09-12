import { supabase } from "@/integrations/supabase/client";
import { productMatchesCategory } from "@/lib/categories";
import {
  getMockProductBySlug,
  MOCK_PRODUCTS,
  initializeMockProductsOnClient,
  saveLocalProduct,
  deleteLocalProduct,
  ensureTuyaCatalogLoaded,
  isDemoOrTestProduct,
} from "@/lib/mock-products";
import { pickHomeFeaturedProductsWithFlags } from "@/lib/home-featured";
import {
  applyInventoryToProduct,
  ensureInventoryForProducts,
  fetchInventoryMap,
  upsertInventoryStock,
} from "@/lib/inventory";
import type { ProductRow } from "@/types/commerce";

function filterByOpts(list: ProductRow[], opts?: { category?: string; limit?: number }) {
  let next = list.filter((p) => !isDemoOrTestProduct(p));
  if (opts?.category) next = next.filter((p) => productMatchesCategory(p.category, opts.category));
  if (opts?.limit) next = next.slice(0, opts.limit);
  return next;
}

/** Compact card payload — no description/specs/gallery, so SSR HTML stays light. */
export function toStorefrontProduct(p: ProductRow) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    price_pkr: Number(p.price_pkr) || 0,
    image_url: p.image_url,
    category: p.category,
    manufacturer: p.manufacturer,
    discount_pct: Number(p.discount_pct) || 0,
    availability: p.availability,
    rating: p.rating,
    stock: Number(p.stock) || 0,
    color: p.color,
    tags: p.tags ?? null,
  };
}

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

function normalizeDbProduct(row: Record<string, unknown>): ProductRow {
  const specsRaw = row.specs;
  const specs =
    specsRaw && typeof specsRaw === "object" && !Array.isArray(specsRaw)
      ? (specsRaw as Record<string, string>)
      : {};
  return {
    id: String(row.id ?? ""),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? ""),
    description: (row.description as string | null) ?? "",
    category: String(row.category ?? "Components"),
    price_pkr: Number(row.price_pkr) || 0,
    stock: Number(row.stock) || 0,
    image_url: (row.image_url as string | null) ?? null,
    gallery_urls: Array.isArray(row.gallery_urls) ? (row.gallery_urls as string[]) : [],
    manufacturer: (row.manufacturer as string | null) ?? null,
    color: (row.color as string | null) ?? null,
    availability: String(row.availability ?? "in_stock"),
    discount_pct: Number(row.discount_pct) || 0,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    rating: row.rating == null ? 4.5 : Number(row.rating),
    specs,
    vendor_id: (row.vendor_id as string | null) ?? null,
    created_at: row.created_at ? String(row.created_at) : undefined,
  };
}

/** Admin/DB products win over built-in Tuya/mock catalog when slug/id matches. */
async function fetchDbProducts(): Promise<ProductRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !Array.isArray(data)) {
      if (error) console.warn("Supabase products fetch:", error.message);
      return [];
    }
    return data.map((row) => normalizeDbProduct(row as Record<string, unknown>));
  } catch (err) {
    console.warn("Supabase products fetch failed:", err);
    return [];
  }
}

function mergeCatalog(builtin: ProductRow[], db: ProductRow[]): ProductRow[] {
  const bySlug = new Map<string, ProductRow>();
  const byId = new Map<string, ProductRow>();

  for (const p of builtin) {
    if (!p?.slug) continue;
    bySlug.set(p.slug, p);
    if (p.id) byId.set(p.id, p);
  }

  // DB / admin rows override catalog (price, stock, images, new SKUs)
  for (const p of db) {
    if (!p?.slug) continue;
    const prev = bySlug.get(p.slug) || (p.id ? byId.get(p.id) : undefined);
    const merged = prev
      ? {
          ...prev,
          ...p,
          description: p.description || prev.description,
          image_url: p.image_url || prev.image_url,
          gallery_urls: p.gallery_urls?.length ? p.gallery_urls : prev.gallery_urls,
          specs: p.specs && Object.keys(p.specs).length ? p.specs : prev.specs,
          tags: p.tags?.length ? p.tags : prev.tags,
        }
      : p;
    bySlug.set(p.slug, merged);
    if (merged.id) byId.set(merged.id, merged);
  }

  return Array.from(bySlug.values());
}

async function loadMergedCatalog(): Promise<ProductRow[]> {
  await ensureTuyaCatalogLoaded();
  initializeMockProductsOnClient();
  const db = await fetchDbProducts();
  return mergeCatalog(MOCK_PRODUCTS as ProductRow[], db);
}

/**
 * Storefront catalog = built-in TYSH/hardware + admin Supabase products.
 * Live stock overlays from product_inventory when present.
 */
export async function fetchProducts(opts?: { category?: string; limit?: number }) {
  const merged = await loadMergedCatalog();
  const base = filterByOpts(merged, opts);
  await ensureInventoryForProducts(base);
  const inventory = await fetchInventoryMap(base.map((p) => p.slug));
  return base.map((p) => toStorefrontProduct(applyInventoryToProduct(p, inventory)));
}

export async function fetchHomeProducts(limit = 24) {
  const list = await fetchProducts();
  return pickHomeFeaturedProductsWithFlags(list, limit);
}

export async function fetchProductBySlug(slug: string) {
  const key = (slug || "").trim();
  if (!key) return null;

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.from("products").select("*").eq("slug", key).maybeSingle();
      if (!error && data) {
        const product = normalizeDbProduct(data as Record<string, unknown>);
        if (!isDemoOrTestProduct(product)) {
          await ensureInventoryForProducts([product]);
          const inventory = await fetchInventoryMap([product.slug]);
          return applyInventoryToProduct(product, inventory);
        }
      }
    } catch (err) {
      console.warn("Supabase product-by-slug failed:", err);
    }
  }

  await ensureTuyaCatalogLoaded();
  initializeMockProductsOnClient();
  const product = getMockProductBySlug(key);
  if (!product || isDemoOrTestProduct(product)) return null;
  await ensureInventoryForProducts([product]);
  const inventory = await fetchInventoryMap([product.slug]);
  return applyInventoryToProduct(product, inventory);
}

export async function fetchRelatedProducts(category: string, excludeId: string, limit = 4) {
  const merged = await loadMergedCatalog();
  const related = merged
    .filter(
      (p) =>
        p.id !== excludeId &&
        !isDemoOrTestProduct(p) &&
        productMatchesCategory(p.category, category),
    )
    .slice(0, limit);
  await ensureInventoryForProducts(related);
  const inventory = await fetchInventoryMap(related.map((p) => p.slug));
  return related.map((p) => toStorefrontProduct(applyInventoryToProduct(p, inventory)));
}

export async function upsertProduct(
  payload: Partial<ProductRow> & { title: string; category: string },
) {
  await ensureTuyaCatalogLoaded();
  const { id, availability, ...rest } = payload;
  const slug =
    payload.slug ??
    payload.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const fullLocal: ProductRow = {
    id: id || `user-${Date.now()}`,
    title: payload.title,
    slug,
    description: payload.description || "",
    category: payload.category,
    price_pkr: Number(payload.price_pkr) || 0,
    stock: Number(payload.stock) || 0,
    image_url: payload.image_url || "",
    manufacturer: payload.manufacturer || "",
    discount_pct: Number(payload.discount_pct) || 0,
    availability: (availability || "in_stock") as any,
    rating: payload.rating || 4.5,
    gallery_urls: payload.gallery_urls || [],
    specs: payload.specs || {},
    tags: payload.tags || [],
  };

  saveLocalProduct(fullLocal);

  if (!isSupabaseConfigured()) {
    return fullLocal.id;
  }

  try {
    await upsertInventoryStock(slug, Number(payload.stock) || 0);
  } catch (err) {
    console.warn("Inventory upsert:", err);
  }

  try {
    const row = {
      ...rest,
      slug,
      gallery_urls: rest.gallery_urls ?? undefined,
      specs: rest.specs ?? undefined,
      ...(availability
        ? { availability: availability as "in_stock" | "on_demand" | "coming_soon" | "obsolete" }
        : {}),
      ...(id && !String(id).startsWith("mock-") && !String(id).startsWith("user-") && isUuid(id)
        ? { id }
        : {}),
    };

    const { data, error } = await supabase
      .from("products")
      .upsert(row, { onConflict: "slug" })
      .select("id")
      .maybeSingle();

    if (error) {
      console.warn("Supabase upsert product error:", error);
      throw error;
    }
    if (!data?.id) {
      throw new Error("Product was not saved (0 rows). Check admin login / RLS.");
    }
    return data.id;
  } catch (err) {
    console.warn("Supabase upsert product fallback:", err);
  }
  return fullLocal.id;
}

function isUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function deleteProduct(id: string) {
  deleteLocalProduct(id);
  if (isSupabaseConfigured()) {
    try {
      await supabase.from("products").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase delete product fallback:", e);
    }
  }
}
