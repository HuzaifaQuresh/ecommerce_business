import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { fetchProducts } from "@/api/products";
import { catalogListKey } from "@/lib/catalog-version";
import { categorySeo } from "@/lib/seo";
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
import { PageBackButton } from "@/components/site/PageLayout";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  sort: z.enum(["position", "name", "price-asc", "price-desc", "rating"]).optional(),
});

const PAGE_SIZE = 24;

export const Route = createFileRoute("/products/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search: { category } }) => ({ category }),
  loader: ({ context: { queryClient }, deps: { category } }) =>
    queryClient.ensureQueryData({
      queryKey: catalogListKey(category),
      staleTime: 60_000,
      queryFn: async () => {
        const data = await fetchProducts({ category, limit: PAGE_SIZE });
        return data as (Product & { color?: string | null })[];
      },
    }),
  head: ({ match }) => {
    const category = typeof match.search.category === "string" ? match.search.category : "";
    const brand = typeof match.search.brand === "string" ? match.search.brand : "";
    const mapped = category ? categorySeo(category) : null;
    const focus = [brand, category].filter(Boolean).join(" ") || "Smart Hardware, Tuya IoT & CCTV";
    const title =
      mapped?.title ||
      (category || brand
        ? `${focus} in Pakistan | SmartZone`
        : "IoT Devices & Smart Home Sensors Pakistan | SmartZone");
    const description =
      mapped?.description ||
      (category || brand
        ? `Shop ${focus} online at SmartZone Pakistan (smartzone.pk). Smart home, Zigbee/WiFi sensors, and industrial IoT with COD.`
        : "Buy IoT devices, Zigbee sensors, WiFi & MQTT sensors, Tuya sensors and smart home automations in Pakistan at smartzone.pk.");
    const canonicalPath =
      category && !brand
        ? `/products?category=${encodeURIComponent(category)}`
        : "/products";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        {
          name: "keywords",
          content:
            "smartzone, smartzone pk, iot sensor, smart home, zigbee sensors, automations, MQTT sensors, wifi sensors, tuya sensor Pakistan, iot devices Pakistan",
        },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `https://smartzone.pk${canonicalPath}` },
        ...(brand || match.search.q || match.search.sort
          ? [{ name: "robots", content: "noindex,follow" }]
          : []),
      ],
      links: [{ rel: "canonical", href: `https://smartzone.pk${canonicalPath}` }],
    };
  },
  component: ProductsPage,
});

function ProductsPage() {
  const { q, category, sort, brand } = Route.useSearch();
  const navigate = useNavigate();
  const loaderData = Route.useLoaderData();
  const queryClient = useQueryClient();

  const [view, setView] = useState<"grid" | "list">("grid");
  const [price, setPrice] = useState<[number, number]>([0, 1500000]);
  const [avail, setAvail] = useState<string>("all");
  const [manufacturers, setManufacturers] = useState<string[]>(() => (brand ? [brand] : []));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (brand) setManufacturers([brand]);
  }, [brand]);

  const filterState = useMemo(
    () => ({ price, avail, manufacturers }),
    [price, avail, manufacturers],
  );

  const { data: products, isLoading } = useQuery({
    queryKey: catalogListKey(category),
    queryFn: async () => {
      const data = await fetchProducts({ category });
      return data as (Product & { color?: string | null })[];
    },
    initialData: loaderData,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const loadFullCatalog = () => {
      void queryClient.prefetchQuery({
        queryKey: catalogListKey(category),
        queryFn: async () => {
          const data = await fetchProducts({ category });
          return data as (Product & { color?: string | null })[];
        },
      });
    };
    const idle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(loadFullCatalog, { timeout: 1800 })
        : window.setTimeout(loadFullCatalog, 400);
    return () => {
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle as number);
      else clearTimeout(idle as number);
    };
  }, [category, queryClient]);

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

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, category, sort, brand, price, avail, manufacturers]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

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
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,260px)_1fr] gap-6 lg:gap-8">
        <aside className="hidden lg:block lg:sticky lg:top-32 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
          <ProductFiltersPanel {...filterPanelProps} />
        </aside>

        <div className="min-w-0">
          <ProductCategoryChips category={category} q={q} className="mb-4 sm:hidden" />

          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border bg-card p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <PageBackButton />
              <ProductFiltersMobileSheet
                {...filterPanelProps}
                open={filtersOpen}
                onOpenChange={setFiltersOpen}
              />
              <div>
                <h1 className="text-base sm:text-lg font-bold leading-tight">
                  {category
                    ? isTopLevelCategory(category)
                      ? category
                      : `${getParentCategory(category)} — ${category}`
                    : "All Products"}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {q ? (
                    <>
                      Results for "<span className="text-foreground font-medium">{q}</span>" —{" "}
                    </>
                  ) : null}
                  {filtered.length} product{filtered.length !== 1 && "s"} found
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-md border p-0.5 bg-background">
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

              <Select
                value={sort ?? "position"}
                onValueChange={(v) =>
                  navigate({
                    to: "/products",
                    search: { q, category, brand, sort: v as typeof sort },
                  })
                }
              >
                <SelectTrigger className="w-full sm:w-44 h-9">
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

          {isLoading && !products?.length ? (
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
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {visible.map((p, idx) => (
                  <ProductCard key={p.id} p={p} priority={idx < 6} />
                ))}
              </div>
              {hasMore ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    className="font-bold"
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  >
                    Load more ({filtered.length - visible.length} remaining)
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {visible.map((p, idx) => (
                  <ProductCard key={p.id} p={p} view="list" priority={idx < 4} />
                ))}
              </div>
              {hasMore ? (
                <div className="mt-6 flex justify-center">
                  <Button
                    variant="outline"
                    className="font-bold"
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  >
                    Load more ({filtered.length - visible.length} remaining)
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
