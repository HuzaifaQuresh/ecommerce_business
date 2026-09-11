import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Flame, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfiniteMarquee } from "@/components/site/InfiniteMarquee";
import { ProductCard, type Product } from "@/components/site/ProductCard";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  catalogImagesByBrand,
  mergeShopCategories,
  mergeTopBrands,
  parseMerchOverrides,
  pickHotSelling,
  type ShopByCategoryItem,
  type ShopByCategoryOverride,
  type TopBrandOverride,
} from "@/lib/home-showcase";
import { optimizeProductImageUrl } from "@/lib/product-image";
import { HomeSectionBadge, HomeSectionHeader } from "@/components/site/HomeSectionHeader";

function ShowcaseSectionSkeleton({ chips = 8 }: { chips?: number }) {
  return (
    <div className="px-4 sm:px-5 pb-4 sm:pb-5">
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: chips }).map((_, i) => (
          <div key={i} className="flex w-[118px] sm:w-[132px] shrink-0 flex-col items-center gap-2.5 px-2 py-1">
            <span className="h-[78px] w-[78px] sm:h-[88px] sm:w-[88px] rounded-full border border-[#E2E8F0] bg-slate-100 animate-pulse" />
            <span className="h-3 w-20 rounded bg-slate-100 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryThumb({
  src,
  alt,
  Icon,
}: {
  src?: string | null;
  alt: string;
  Icon: ShopByCategoryItem["icon"];
}) {
  const photo = src ? optimizeProductImageUrl(src, "card") : "";
  if (!photo || !src) {
    return <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-[#0052B4]" strokeWidth={1.7} />;
  }
  return (
    <img
      key={photo}
      src={photo}
      alt={alt}
      className="h-full w-full object-cover"
      loading="eager"
      decoding="async"
      draggable={false}
    />
  );
}

export function HomeShopByCategories({ products: _products }: { products: Product[] }) {
  const { data: settings, isPending } = useSiteSettings();
  const merchReady = Boolean(settings) || !isPending;
  const items = useMemo(() => {
    if (!merchReady) return [];
    const admin = parseMerchOverrides<ShopByCategoryOverride>(settings?.home_shop_categories);
    // Featured-home SKUs share generic first-product photos across categories.
    // Only admin merch URLs are stable through refresh — never paint catalog fallback first.
    return mergeShopCategories(admin, {});
  }, [merchReady, settings?.home_shop_categories]);

  if (!merchReady) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden min-w-0">
          <HomeSectionHeader
            badge={
              <HomeSectionBadge>
                <Sparkles className="h-3 w-3" /> Tuya Smart Catalog
              </HomeSectionBadge>
            }
            title="Shop By Categories"
          />
          <ShowcaseSectionSkeleton />
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden min-w-0">
        <HomeSectionHeader
          badge={
            <HomeSectionBadge>
              <Sparkles className="h-3 w-3" /> Tuya Smart Catalog
            </HomeSectionBadge>
          }
          title="Shop By Categories"
          action={
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-[#0052B4] hover:text-[#0052B4]/80 hover:bg-blue-50 text-xs font-bold"
            >
              <Link to="/products">View All →</Link>
            </Button>
          }
        />

        <InfiniteMarquee
          items={items}
          getKey={(item) => `${item.label}::${item.category}::${item.image_url ?? ""}`}
          speed={56}
          className="pb-4 sm:pb-5"
          renderItem={(item) => {
            const Icon = item.icon;
            return (
              <Link
                to="/products"
                search={{ category: item.category } as never}
                className="group flex w-[118px] sm:w-[132px] shrink-0 flex-col items-center gap-2.5 px-2 py-1"
              >
                <span className="h-[78px] w-[78px] sm:h-[88px] sm:w-[88px] overflow-hidden rounded-full border border-[#E2E8F0] bg-slate-50 shadow-xs transition-all duration-300 group-hover:border-[#FF7A00]/50 group-hover:shadow-md grid place-items-center">
                  <CategoryThumb src={item.image_url} alt={item.label} Icon={Icon} />
                </span>
                <span className="text-center text-[11px] sm:text-xs font-semibold text-[#0B192C] leading-tight line-clamp-2 group-hover:text-[#0052B4] transition-colors">
                  {item.label}
                </span>
              </Link>
            );
          }}
        />
      </div>
    </section>
  );
}

export function HomeHotSelling({ products }: { products: Product[] }) {
  const items = useMemo(() => pickHotSelling(products, 6), [products]);
  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden min-w-0">
        <HomeSectionHeader
          badge={
            <HomeSectionBadge>
              <Flame className="h-3 w-3 fill-current" /> Best Movers
            </HomeSectionBadge>
          }
          title="Hot Selling 🔥"
          action={
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-[#0052B4] hover:text-[#0052B4]/80 hover:bg-blue-50 text-xs font-bold"
            >
              <Link to="/products">View All →</Link>
            </Button>
          }
        />
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {items.map((p, idx) => (
              <ProductCard key={p.id} p={p} priority={idx < 3} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomeTopBrands({ products }: { products: Product[] }) {
  const { data: settings, isPending } = useSiteSettings();
  const merchReady = Boolean(settings) || !isPending;
  const items = useMemo(() => {
    if (!merchReady) return [];
    const admin = parseMerchOverrides<TopBrandOverride>(settings?.home_top_brands);
    return mergeTopBrands(admin, catalogImagesByBrand(products));
  }, [merchReady, products, settings?.home_top_brands]);

  if (!merchReady) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden min-w-0">
          <HomeSectionHeader
            badge={<HomeSectionBadge tone="blue">Authorized Lines</HomeSectionBadge>}
            title="Top Brands"
          />
          <ShowcaseSectionSkeleton chips={6} />
        </div>
      </section>
    );
  }

  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden min-w-0">
        <HomeSectionHeader
          badge={<HomeSectionBadge tone="blue">Authorized Lines</HomeSectionBadge>}
          title="Top Brands"
          action={
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-[#0052B4] hover:text-[#0052B4]/80 hover:bg-blue-50 text-xs font-bold"
            >
              <Link to="/products">Shop Brands →</Link>
            </Button>
          }
        />

        <InfiniteMarquee
          items={items}
          getKey={(item) => item.name}
          reverse
          speed={52}
          pauseOnHover={false}
          className="pb-4 sm:pb-5"
          renderItem={(item) => {
            const logo = optimizeProductImageUrl(item.image_url, "card");
            const hasLogo = Boolean(item.image_url);
            return (
              <Link
                to="/products"
                search={{ brand: item.manufacturer } as never}
                className="flex w-[140px] sm:w-[160px] shrink-0 flex-col items-center gap-2 px-3 py-2"
              >
                <span className="sz-brand-logo-tile grid h-16 w-[128px] sm:h-[72px] sm:w-[140px] place-items-center rounded-xl border border-[#E2E8F0] bg-white overflow-hidden grayscale-0 opacity-100">
                  {hasLogo ? (
                    <img
                      src={logo}
                      alt={item.name}
                      className="h-full w-full object-contain p-2 grayscale-0 opacity-100"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-center">
                      <span className="block text-lg sm:text-xl font-black tracking-tight text-[#FF7A00]">
                        {item.initials}
                      </span>
                      <span className="block text-[10px] font-semibold text-[#0052B4] mt-0.5">
                        {item.name}
                      </span>
                    </span>
                  )}
                </span>
                {hasLogo ? (
                  <span className="text-[11px] font-semibold text-[#0B192C] text-center line-clamp-1">
                    {item.name}
                  </span>
                ) : null}
              </Link>
            );
          }}
        />
      </div>
    </section>
  );
}
