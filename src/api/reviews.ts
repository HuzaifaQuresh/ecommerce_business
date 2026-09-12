import { supabase } from "@/integrations/supabase/client";
import { getMockReviewsForProduct } from "@/lib/mock-data";
import type { ProductReview } from "@/types/commerce";

function getLocalReviews(productId: string): ProductReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`nexus_local_reviews_${productId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalReview(productId: string, review: ProductReview) {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalReviews(productId);
    localStorage.setItem(`nexus_local_reviews_${productId}`, JSON.stringify([review, ...list]));
  } catch (err) {
    console.error("Failed to save local review", err);
  }
}

function withTimeout<T>(promise: PromiseLike<T>, ms = 12000): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout of ${ms}ms exceeded`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export async function fetchProductReviews(productId: string) {
  const local = getLocalReviews(productId);
  const key = String(productId || "").trim();
  if (!key) return local;

  try {
    const { data, error } = await withTimeout(
      supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", key)
        .order("created_at", { ascending: false }),
    );
    if (error) throw error;

    const dbReviews = (data ?? []) as ProductReview[];
    const merged = [...local];
    for (const dbr of dbReviews) {
      if (!merged.some((r) => r.id === dbr.id)) {
        merged.push(dbr);
      }
    }
    if (merged.length) return merged;
  } catch {
    /* fall through to mocks */
  }

  const merged = [...local];
  const mocks = getMockReviewsForProduct(key);
  for (const mr of mocks) {
    if (!merged.some((r) => r.id === mr.id)) {
      merged.push(mr);
    }
  }
  return merged;
}

export async function submitProductReview(input: {
  product_id: string;
  customer_name: string;
  rating: number;
  body: string;
  user_id?: string | null;
}) {
  const productId = String(input.product_id || "").trim();
  if (!productId) throw new Error("Product is required for a review");

  const newReview: ProductReview = {
    id: "rev-" + Math.random().toString(36).substring(2, 11),
    product_id: productId,
    customer_name: input.customer_name,
    rating: input.rating,
    body: input.body,
    verified: !!input.user_id,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("product_reviews")
      .insert({
        product_id: productId,
        customer_name: input.customer_name,
        rating: input.rating,
        body: input.body,
        verified: !!input.user_id,
        user_id: input.user_id || null,
      })
      .select("id, created_at")
      .maybeSingle();
    if (error) throw error;
    if (data?.id) {
      newReview.id = data.id;
      if (data.created_at) newReview.created_at = data.created_at;
    }
    saveLocalReview(productId, newReview);
  } catch (err) {
    console.warn("Supabase submitProductReview failed, falling back to local storage:", err);
    saveLocalReview(productId, newReview);
  }
}
