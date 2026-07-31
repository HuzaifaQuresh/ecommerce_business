import { supabase } from "@/integrations/supabase/client";
import { getCategoryFilterValues, productMatchesCategory } from "@/lib/categories";
import {
  getMockProductBySlug,
  MOCK_PRODUCTS,
  initializeMockProductsOnClient,
  saveLocalProduct,
  deleteLocalProduct,
  syncServerProducts,
} from "@/lib/mock-products";
import type { ProductRow } from "@/types/commerce";

function filterMockProducts(opts?: { category?: string; limit?: number }) {
  let list = MOCK_PRODUCTS;
  if (opts?.category) list = list.filter((p) => productMatchesCategory(p.category, opts.category));
  if (opts?.limit) list = list.slice(0, opts.limit);
  return list;
}

const LIST_FIELDS =
  "id,title,slug,price_pkr,image_url,category,manufacturer,discount_pct,availability,rating,stock,color";

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

function withTimeout<T>(promise: Promise<T>, ms = 800): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout of ${ms}ms exceeded`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export async function fetchProducts(opts?: { category?: string; limit?: number }) {
  initializeMockProductsOnClient();
  await syncServerProducts();
  if (!isSupabaseConfigured()) {
    return filterMockProducts(opts);
  }
  try {
    let q = supabase.from("products").select(LIST_FIELDS);
    if (opts?.category) {
      const values = getCategoryFilterValues(opts.category);
      q = values.length === 1 ? q.eq("category", values[0]) : q.in("category", values);
    }
    const { data, error } = await withTimeout(q, 1500);
    if (!error && data) {
      const dbProducts = data as ProductRow[];
      // Merge locally created products that aren't in Supabase yet
      const localOnly = MOCK_PRODUCTS.filter(
        (lp) => !dbProducts.some((d) => d.id === lp.id || d.slug === lp.slug),
      );
      let combined = [...localOnly, ...dbProducts];
      if (opts?.category) {
        combined = combined.filter((p) => productMatchesCategory(p.category, opts.category));
      }
      if (opts?.limit) combined = combined.slice(0, opts.limit);
      return combined;
    }
  } catch {
    /* fallback to mock catalog */
  }
  return filterMockProducts(opts);
}

export async function fetchProductBySlug(slug: string) {
  initializeMockProductsOnClient();
  await syncServerProducts();
  if (!slug) return getMockProductBySlug("");

  // Check local catalog first (useful for freshly added local products)
  const localMatch = getMockProductBySlug(slug);

  if (!isSupabaseConfigured()) {
    return localMatch;
  }
  try {
    const { data, error } = await withTimeout(
      supabase.from("products").select("*").eq("slug", slug).maybeSingle(),
      1500,
    );
    if (!error && data) return data as ProductRow;

    const { data: dataById, error: errById } = await withTimeout(
      supabase.from("products").select("*").eq("id", slug).maybeSingle(),
      1500,
    );
    if (!errById && dataById) return dataById as ProductRow;
  } catch {
    /* fallback to demo catalog */
  }
  return localMatch;
}

export async function fetchRelatedProducts(category: string, excludeId: string, limit = 4) {
  if (!isSupabaseConfigured()) {
    return MOCK_PRODUCTS.filter(
      (p) => p.id !== excludeId && productMatchesCategory(p.category, category),
    ).slice(0, limit);
  }
  try {
    const { data, error } = await withTimeout(
      supabase
        .from("products")
        .select(LIST_FIELDS)
        .eq("category", category)
        .neq("id", excludeId)
        .limit(limit),
    );
    if (error) throw error;
    if (data?.length) return data as ProductRow[];
  } catch {
    /* mock */
  }
  return MOCK_PRODUCTS.filter(
    (p) => p.id !== excludeId && productMatchesCategory(p.category, category),
  ).slice(0, limit);
}

export async function upsertProduct(
  payload: Partial<ProductRow> & { title: string; category: string },
) {
  const { id, availability, ...rest } = payload;
  const slug =
    payload.slug ??
    payload.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const fullLocal: ProductRow = {
    id: id || `mock-${Date.now()}`,
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
