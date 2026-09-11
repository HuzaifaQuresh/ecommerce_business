import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Tag, Loader2 } from "lucide-react";
import { fetchProducts } from "@/api/products";
import { ALL_CATEGORY_LABELS } from "@/lib/categories";
import { catalogListKey } from "@/lib/catalog-version";
import { fmtPKR } from "@/lib/format";
import { optimizeProductImageUrl } from "@/lib/product-image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SearchProduct = Awaited<ReturnType<typeof fetchProducts>>[number] & {
  tags?: string[];
};

type SuggestItem =
  | { kind: "product"; product: SearchProduct }
  | { kind: "category"; name: string }
  | { kind: "all"; query: string };

function scoreProduct(product: SearchProduct, needle: string): number {
  const title = product.title.toLowerCase();
  const category = (product.category ?? "").toLowerCase();
  const maker = (product.manufacturer ?? "").toLowerCase();
  const tags = (product.tags ?? []).join(" ").toLowerCase();
  if (title.startsWith(needle)) return 100;
  if (title.includes(needle)) return 80;
  if (maker.includes(needle)) return 55;
  if (category.includes(needle)) return 45;
  if (tags.includes(needle)) return 35;
  return 0;
}

function highlight(text: string, needle: string) {
  if (!needle) return text;
  const idx = text.toLowerCase().indexOf(needle);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#FF7A00]/15 text-inherit rounded-sm px-0.5">
        {text.slice(idx, idx + needle.length)}
      </mark>
      {text.slice(idx + needle.length)}
    </>
  );
}

export function HeaderSearch({ variant }: { variant: "desktop" | "mobile" }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searchReady, setSearchReady] = useState(false);
  const rootRef = useRef<HTMLFormElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: catalogListKey(),
    queryFn: () => fetchProducts(),
    staleTime: 30_000,
    enabled: searchReady,
  });

  const catalog = data ?? [];
  const needle = q.trim().toLowerCase();

  useEffect(() => {
    if (!path.startsWith("/products")) setQ("");
  }, [path]);

  useEffect(() => {
    const onDoc = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const items = useMemo<SuggestItem[]>(() => {
    if (needle.length < 1) return [];
    const products = catalog
      .map((product) => ({ product, score: scoreProduct(product, needle) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ product }) => ({ kind: "product" as const, product }));

    const categories = ALL_CATEGORY_LABELS.filter((name) => name.toLowerCase().includes(needle))
      .slice(0, 4)
      .map((name) => ({ kind: "category" as const, name }));

    return [...categories, ...products, { kind: "all", query: q.trim() }];
  }, [catalog, needle, q]);

  const goSearch = (query = q.trim()) => {
    setOpen(false);
    navigate({
      to: "/products",
      search: { q: query || undefined, category: undefined, sort: undefined } as never,
    });
  };

  const goItem = (item: SuggestItem) => {
    setOpen(false);
    if (item.kind === "product") {
      navigate({ to: "/products/$slug", params: { slug: item.product.slug } });
      return;
    }
    if (item.kind === "category") {
      navigate({
        to: "/products",
        search: { category: item.name, q: undefined, sort: undefined } as never,
      });
      return;
    }
    goSearch(item.query);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = items[active];
    if (open && item) goItem(item);
    else goSearch();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || items.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showPanel = open && needle.length >= 1;

  return (
    <form
      ref={rootRef}
      onSubmit={onSubmit}
      className={cn(
        "relative",
        variant === "desktop" ? "hidden md:flex flex-1 max-w-2xl min-w-0 items-stretch" : "md:hidden",
      )}
    >
      <div className="relative flex flex-1 items-stretch">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              setActive(0);
            }}
            onFocus={() => {
              setSearchReady(true);
              if (q.trim()) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            placeholder={
              variant === "desktop"
                ? "Search cameras, sensors, smart home, development boards..."
                : "Search products…"
            }
            aria-label="Search products, cameras, sensors and dev boards"
            aria-autocomplete="list"
            aria-expanded={showPanel}
            role="combobox"
            autoComplete="off"
            className={cn(
              "h-10 w-full bg-slate-50 text-slate-900 pl-10 border border-slate-200 focus-visible:ring-[#0052B4] focus-visible:border-[#0052B4] focus-visible:bg-white transition-colors text-xs sm:text-sm",
              variant === "desktop" ? "pr-4 rounded-l-md rounded-r-none" : "pr-4",
            )}
          />
        </div>
        {variant === "desktop" && (
          <Button
            type="submit"
            className="h-10 rounded-l-none rounded-r-md bg-[#FF7A00] hover:bg-[#E56E00] px-6 text-white text-xs sm:text-sm font-bold shrink-0 shadow-xs transition-all border-0"
          >
            Search
          </Button>
        )}
      </div>

      {showPanel && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-[80] mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(11,25,44,0.16)]"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <span>Suggestions</span>
            {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          </div>
          <ul className="max-h-[min(22rem,60vh)] overflow-y-auto py-1">
            {items.length === 1 && items[0].kind === "all" && (
              <li className="px-4 py-6 text-sm text-center text-slate-500">
                No matching products. Press Enter to search the catalog.
              </li>
            )}
            {items.map((item, index) => {
              const selected = index === active;
              if (item.kind === "category") {
                return (
                  <li key={`cat-${item.name}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => goItem(item)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm",
                        selected ? "bg-[#0052B4]/8" : "hover:bg-slate-50",
                      )}
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-[#0052B4] shrink-0">
                        <Tag className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-800">
                          {highlight(item.name, needle)}
                        </span>
                        <span className="block text-[11px] text-slate-500">Category</span>
                      </span>
                    </button>
                  </li>
                );
              }
              if (item.kind === "product") {
                const p = item.product;
                return (
                  <li key={p.id}>
                    <Link
                      role="option"
                      aria-selected={selected}
                      to="/products/$slug"
                      params={{ slug: p.slug }}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5",
                        selected ? "bg-[#0052B4]/8" : "hover:bg-slate-50",
                      )}
                    >
                      <img
                        src={optimizeProductImageUrl(p.image_url, "thumb")}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-800 truncate">
                          {highlight(p.title, needle)}
                        </span>
                        <span className="block text-[11px] text-slate-500 truncate">
                          {p.category}
                          {p.manufacturer ? ` · ${p.manufacturer}` : ""}
                        </span>
                      </span>
                      <span className="text-xs font-bold text-[#0052B4] shrink-0">
                        {fmtPKR(p.price_pkr)}
                      </span>
                    </Link>
                  </li>
                );
              }
              return (
                <li key="all">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => goItem(item)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm border-t",
                      selected ? "bg-[#FF7A00]/10" : "hover:bg-slate-50",
                    )}
                  >
                    <Search className="h-4 w-4 text-[#FF7A00] shrink-0" />
                    <span>
                      Search all results for <span className="font-semibold">“{item.query}”</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </form>
  );
}
