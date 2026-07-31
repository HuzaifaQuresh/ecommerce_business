import { useQuery } from "@tanstack/react-query";
import { fetchRelatedProducts } from "@/api/products";
import { ProductCard, type Product } from "./ProductCard";

export function RelatedProducts({
  category = "Components",
  excludeId = "",
  products,
  loading,
}: {
  category?: string;
  excludeId?: string;
  products?: Product[];
  loading?: boolean;
}) {
  const safeCategory = category || "Components";
  const safeExcludeId = excludeId || "";

  const { data: fetched, isLoading } = useQuery({
    queryKey: ["related", safeCategory, safeExcludeId],
    queryFn: () => fetchRelatedProducts(safeCategory, safeExcludeId),
    enabled: products === undefined && !!safeCategory,
  });

  const data = products ?? fetched;
  if (loading || isLoading) {
    return (
      <section className="mt-10 sm:mt-12">
        <h2 className="text-xl sm:text-2xl font-bold mb-5">Related IoT Products</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (!data || data.length === 0) return null;

  return (
    <section className="mt-10 sm:mt-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 mb-5">
        <h2 className="text-xl sm:text-2xl font-bold">Related IoT Solutions</h2>
        <span className="text-sm text-muted-foreground">More from {safeCategory}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {data.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
