import { useQuery } from "@tanstack/react-query";
import { fetchProductBySlug, fetchRelatedProducts } from "@/api/products";
import { fetchProductReviews } from "@/api/reviews";
import type { ProductRow } from "@/types/commerce";

export function useProduct(slug: string, initialData?: ProductRow | null) {
  const product = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug),
    enabled: !!slug,
    initialData: initialData ?? undefined,
  });

  const productId = product.data?.id;
  const category = product.data?.category;

  const reviews = useQuery({
    queryKey: ["reviews", productId],
    queryFn: () => (productId ? fetchProductReviews(productId) : Promise.resolve([])),
    enabled: !!productId,
  });

  const related = useQuery({
    queryKey: ["related", category, productId],
    queryFn: () =>
      category && productId ? fetchRelatedProducts(category, productId) : Promise.resolve([]),
    enabled: !!category && !!productId,
  });

  return { product, reviews, related };
}
