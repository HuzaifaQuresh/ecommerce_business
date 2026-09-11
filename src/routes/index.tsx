import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchHomeProducts } from "@/api/products";
import { ProductCard, type Product } from "@/components/site/ProductCard";
import { HomeHotSelling, HomeShopByCategories, HomeTopBrands } from "@/components/site/HomeShowcases";
import { HomeHeroSlider } from "@/components/site/HomeHeroSlider";
import { HomePromoPair } from "@/components/site/HomePromoPair";
import { HomeSolutionsStrip } from "@/components/site/HomeSolutionsStrip";
import { HomeSectionHeader } from "@/components/site/HomeSectionHeader";
import { fetchSiteSettings, SITE_SETTINGS_QUERY_KEY, SITE_SETTINGS_STALE_MS } from "@/api/settings";
import { catalogHomeKey } from "@/lib/catalog-version";
import { DEFAULT_META } from "@/lib/seo";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) => {
    const [, products] = await Promise.all([
      queryClient.ensureQueryData({
        queryKey: SITE_SETTINGS_QUERY_KEY,
        staleTime: SITE_SETTINGS_STALE_MS,
        queryFn: fetchSiteSettings,
      }),
      queryClient.ensureQueryData({
        queryKey: catalogHomeKey(),
        staleTime: 60_000,
        queryFn: async () => {
          try {
            return (await fetchHomeProducts(24)) as Product[];
          } catch {
            return [] as Product[];
          }
        },
      }),
    ]);
    return Array.isArray(products) ? products : [];
  },
  head: () => ({
    meta: [
      { title: DEFAULT_META.title },
      { name: "description", content: DEFAULT_META.description },
      { name: "keywords", content: DEFAULT_META.keywords },
      { property: "og:title", content: DEFAULT_META.ogTitle },
      { property: "og:description", content: DEFAULT_META.ogDescription },
      { property: "og:url", content: "https://smartzone.pk/" },
    ],
    links: [{ rel: "canonical", href: "https://smartzone.pk/" }],
  }),
  component: Index,
});

function Index() {
  const loaderData = Route.useLoaderData();
  const { data: products } = useQuery({
    queryKey: catalogHomeKey(),
    queryFn: async () => {
      try {
        return (await fetchHomeProducts(24)) as Product[];
      } catch {
        return [] as Product[];
      }
    },
    initialData: loaderData,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const list: Product[] = (Array.isArray(products) ? products : Array.isArray(loaderData) ? loaderData : []).filter(
    (p): p is Product => Boolean(p && typeof p === "object" && typeof p.id === "string" && p.id),
  );
  const featuredProducts = list.slice(0, 8);
  const justForYouProducts = list.slice(0, 12);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12">
      <h1 className="sr-only">
        SmartZone Pakistan — smart home, IoT sensors, Zigbee, WiFi, MQTT &amp; Tuya devices at
        smartzone.pk
      </h1>

      <HomeHeroSlider />

      <HomeShopByCategories products={list} />

      <HomePromoPair />

      {featuredProducts.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
          <HomeSectionHeader
            className="px-0 pt-0 pb-3 sm:pb-4"
            title="Featured Products"
            subtitle="Ready to ship across Pakistan."
            action={
              <Link
                to="/products"
                className="text-xs font-bold text-[#0052B4] hover:underline inline-flex items-center gap-1"
              >
                Shop all <ChevronRight className="h-4 w-4" />
              </Link>
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {featuredProducts.map((p, idx) => (
              <ProductCard key={p.id} p={p} priority={idx < 6} />
            ))}
          </div>
        </section>
      ) : null}

      <HomeHotSelling products={list} />
      <HomeTopBrands products={list} />

      {/* Just For You (Main Catalog Recommendation Section) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
        <HomeSectionHeader
          className="px-0 pt-0 pb-4"
          title="Just For You"
          subtitle="Based on popular demand in Pakistan."
          action={
            <Link
              to="/products"
              className="text-xs font-bold text-[#0052B4] hover:underline inline-flex items-center gap-1"
            >
              See All Catalog <ChevronRight className="h-4 w-4" />
            </Link>
          }
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {justForYouProducts.map((p, idx) => (
            <ProductCard key={p.id} p={p} priority={idx < 4} />
          ))}
        </div>
      </section>

      <HomeSolutionsStrip />

      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-10 mb-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold text-[#0B192C] sm:text-xl">
            SmartZone Pakistan — IoT sensors, smart home & automations
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Search for <strong>SmartZone</strong>, <strong>smartzone pk</strong>,{" "}
            <strong>IoT sensor</strong>, <strong>Zigbee sensors</strong>,{" "}
            <strong>WiFi sensors</strong>, <strong>MQTT sensors</strong>,{" "}
            <strong>Tuya sensor Pakistan</strong>, or <strong>IoT devices Pakistan</strong> —
            you are in the right place. Shop hardware on smartzone.pk or book a smart home
            automation install.
          </p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
            <Link to="/iot-sensors" className="text-[#0052B4] hover:underline">
              IoT sensors
            </Link>
            <Link to="/smart-home" className="text-[#0052B4] hover:underline">
              Smart home
            </Link>
            <Link
              to="/products"
              search={{ category: "Tuya Smart Sensors" }}
              className="text-[#0052B4] hover:underline"
            >
              Tuya sensors
            </Link>
            <Link to="/iot-solutions" className="text-[#0052B4] hover:underline">
              IoT solutions
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
