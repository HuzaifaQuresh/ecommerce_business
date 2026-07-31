import { supabase } from "@/integrations/supabase/client";
import { getMockReviewsForProduct } from "@/lib/mock-data";
import type { ProductReview } from "@/types/commerce";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(val: any): boolean {
  if (typeof val !== "string") return false;
  return UUID_REGEX.test(val);
}

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

export async function fetchProductReviews(productId: string) {
  const local = getLocalReviews(productId);
  if (!isUUID(productId)) {
    const merged = [...local];
    const mocks = getMockReviewsForProduct(productId);
    for (const mr of mocks) {
      if (!merged.some((r) => r.id === mr.id)) {
        merged.push(mr);
      }
    }
    return merged;
  }

  try {
    const { data, error } = await withTimeout(
      supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
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
    return merged;
  } catch {
    const merged = [...local];
    const mocks = getMockReviewsForProduct(productId);
    for (const mr of mocks) {
      if (!merged.some((r) => r.id === mr.id)) {
        merged.push(mr);
      }
    }
    return merged;
  }
}

export async function submitProductReview(input: {
  product_id: string;
  customer_name: string;
  rating: number;
  body: string;
  user_id?: string | null;
}) {
  const newReview: ProductReview = {
    id: "rev-" + Math.random().toString(36).substring(2, 11),
    product_id: input.product_id,
    customer_name: input.customer_name,
    rating: input.rating,
    body: input.body,
    verified: !!input.user_id,
    created_at: new Date().toISOString(),
  };

  if (!isUUID(input.product_id)) {
    saveLocalReview(input.product_id, newReview);
    return;
  }

  try {
    const { error } = await supabase.from("product_reviews").insert({
      product_id: input.product_id,
      customer_name: input.customer_name,
      rating: input.rating,
      body: input.body,
      verified: !!input.user_id,
      user_id: input.user_id,
    });
    if (error) throw error;
    saveLocalReview(input.product_id, newReview);
  } catch (err) {
    console.warn("Supabase submitProductReview failed, falling back to local storage:", err);
    saveLocalReview(input.product_id, newReview);
  }
}
