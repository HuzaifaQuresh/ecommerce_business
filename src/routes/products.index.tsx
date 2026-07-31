import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { fetchProducts } from "@/api/products";
import { ProductCard, type Product } from "@/components/site/ProductCard";
import {
  ProductCategoryChips,
  ProductFiltersMobileSheet,
  ProductFiltersPanel,
} from "@/components/site/ProductFilters";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Grid3x3, List } from "lucide-react";
import { getParentCategory, isTopLevelCategory } from "@/lib/format";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  sort: z.enum(["position", "name", "price-asc", "price-desc", "rating"]).optional(),
});

export const Route = createFileRoute("/products/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { category } }) => ({ category }),
  loader: ({ context: { queryClient }, deps: { category } }) =>
    queryClient.ensureQueryData({
      queryKey: ["products", category],
      queryFn: async () => {
        const data = await fetchProducts({ category });
        return data as (Product & { color?: string | null })[];
      },
    }),
  head: () => ({
    meta: [
      { title: "Shop IoT Hardware & Tuya Sensors — NexusIoT" },
      {
        name: "description",
        content: "Browse cameras, sensors, gateways, dev boards and industrial automation gear.",
      },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { q, category, sort } = Route.useSearch();
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData();

  const [view, setView] = useState<"grid" | "list">("grid");
  const [price, setPrice] = useState<[number, number]>([0, 1500000]);
  const [avail, setAvail] = useState<string>("all");
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filterState = useMemo(
    () => ({ price, avail, manufacturers }),
    [price, avail, manufacturers],
  );

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", category],
    queryFn: async () => {
      const data = await fetchProducts({ category });
      return data as (Product & { color?: string | null })[];
    },
    initialData: loaderData,
  });

  const allManufacturers = useMemo(
    () =>
      Array.from(new Set((products ?? []).map((p) => p.manufacturer).filter(Boolean))) as string[],
    [products],
  );

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (q) {
      const needle = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(needle) ||
          p.category.toLowerCase().includes(needle) ||
          (p.manufacturer ?? "").toLowerCase().includes(needle),
      );
    }
    list = list.filter((p) => p.price_pkr >= price[0] && p.price_pkr <= price[1]);
    if (avail !== "all") list = list.filter((p) => p.availability === avail);
    if (manufacturers.length)
      list = list.filter((p) => manufacturers.includes(p.manufacturer ?? ""));

    const s = sort ?? "position";
    return [...list].sort((a, b) => {
      switch (s) {
        case "name":
          return a.title.localeCompare(b.title);
        case "price-asc":
          return a.price_pkr - b.price_pkr;
        case "price-desc":
          return b.price_pkr - a.price_pkr;
        case "rating":
          return (b.rating ?? 0) - (a.rating ?? 0);
        default:
          return 0;
      }
    });
  }, [products, q, price, avail, manufacturers, sort]);

  const reset = () => {
    setPrice([0, 1500000]);
    setAvail("all");
    setManufacturers([]);
    navigate({ to: "/products", search: {} });
  };

  const filterPanelProps = {
    category,
    q,
    filters: filterState,
    setPrice,
    setAvail,
    setManufacturers,
    allManufacturers,
    onReset: reset,
  };

  return (
    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">
          {category
            ? isTopLevelCategory(category)
              ? category
              : `${getParentCategory(category)} — ${category}`
            : "All Products"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {q ? (
            <>
              Results for "<span className="text-foreground font-medium">{q}</span>" —{" "}
            </>
          ) : null}
          {filtered.length} item{filtered.length !== 1 && "s"}
        </p>
      </div>

      <ProductCategoryChips category={category} q={q} className="mb-4" />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,260px)_1fr] gap-6 lg:gap-8">
        <aside className="hidden lg:block lg:sticky lg:top-32 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <ProductFiltersPanel {...filterPanelProps} />
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <ProductFiltersMobileSheet
                {...filterPanelProps}
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
              />
              <div className="flex items-center gap-1 rounded-md border p-0.5">
                <Button
                  size="icon"
                  variant={view === "grid" ? "default" : "ghost"}
                  className="h-8 w-8"
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant={view === "list" ? "default" : "ghost"}
                  className="h-8 w-8"
                  onClick={() => setView("list")}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm text-muted-foreground shrink-0">Sort</span>
              <Select
                value={sort ?? "position"}
                onValueChange={(v) =>
                  navigate({ to: "/products", search: { q, category, sort: v as typeof sort } })
                }
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="position">Position</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 sm:h-72 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-lg border bg-card p-8 sm:p-12 text-center">
              <p className="text-muted-foreground">No products match your filters.</p>
              <Button className="mt-4" onClick={reset}>
                Reset filters
              </Button>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} p={p} view="list" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
