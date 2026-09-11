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
import type { ProductRow } from "@/types/commerce";

function filterMockProducts(opts?: { category?: string; limit?: number }) {
  let list = MOCK_PRODUCTS.filter((p) => !isDemoOrTestProduct(p));
  if (opts?.category) list = list.filter((p) => productMatchesCategory(p.category, opts.category));
  if (opts?.limit) list = list.slice(0, opts.limit);
  return list;
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

/**
 * Storefront catalog is in-code (TYSH + hardware). Do not block first paint on
 * Supabase or server-product sync — there is no products table, and empty/error
 * responses used to hide the whole catalog.
 */
export async function fetchProducts(opts?: { category?: string; limit?: number }) {
  await ensureTuyaCatalogLoaded();
  initializeMockProductsOnClient();
  return filterMockProducts(opts).map(toStorefrontProduct);
}

export async function fetchHomeProducts(limit = 24) {
  const list = await fetchProducts();
  return pickHomeFeaturedProductsWithFlags(list, limit);
}

export async function fetchProductBySlug(slug: string) {
  await ensureTuyaCatalogLoaded();
  initializeMockProductsOnClient();
  const product = getMockProductBySlug(slug || "");
  if (!product || isDemoOrTestProduct(product)) return null;
  return product;
}

export async function fetchRelatedProducts(category: string, excludeId: string, limit = 4) {
  await ensureTuyaCatalogLoaded();
  initializeMockProductsOnClient();
  return MOCK_PRODUCTS.filter(
    (p) =>
      p.id !== excludeId &&
      !isDemoOrTestProduct(p) &&
      productMatchesCategory(p.category, category),
  )
    .slice(0, limit)
    .map(toStorefrontProduct);
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

  const row = {
    ...rest,
    slug,
    gallery_urls: rest.gallery_urls ?? undefined,
    specs: rest.specs ?? undefined,
    ...(availability
      ? { availability: availability as "in_stock" | "on_demand" | "coming_soon" | "obsolete" }
      : {}),
  };

  try {
    if (id) {
      const { error } = await supabase.from("products").update(row).eq("id", id);
      if (error) console.warn("Supabase update product error:", error);
      return id;
    }
    const { data, error } = await supabase
      .from("products")
      .insert({ ...row, slug })
      .select("id")
      .single();
    if (!error && data?.id) {
      return data.id;
    }
  } catch (err) {
    console.warn("Supabase upsert product fallback:", err);
  }
  return fullLocal.id;
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
