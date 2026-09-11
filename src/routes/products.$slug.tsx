import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchActiveVouchers } from "@/api/vouchers";
import { fetchProductBySlug } from "@/api/products";
import { catalogProductKey } from "@/lib/catalog-version";
import { useProduct } from "@/hooks/useProduct";
import { Button } from "@/components/ui/button";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchasePanel } from "@/components/product/ProductPurchasePanel";
import { ProductSpecTabs } from "@/components/product/ProductSpecTabs";
import { ProductReviews } from "@/components/site/ProductReviews";
import { RelatedProducts } from "@/components/site/RelatedProducts";
import { PageContainer, Breadcrumbs } from "@/components/site/PageLayout";
import { buildProductGalleryImages } from "@/lib/product-image";
import {
  absoluteUrl,
  canonicalLink,
  ldJsonScript,
  productJsonLd,
  productPageDescription,
  productPageTitle,
} from "@/lib/seo";
import type { ProductRow } from "@/types/commerce";

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ context: { queryClient }, params: { slug } }) => {
    try {
      if (!slug) return null;
      return await queryClient.ensureQueryData({
        queryKey: catalogProductKey(slug),
        staleTime: 60_000,
        queryFn: () => fetchProductBySlug(slug),
      });
    } catch {
      return null;
    }
  },
  head: ({ loaderData, params }) => {
    const product = loaderData as ProductRow | null | undefined;
    if (!product) {
      const slug = params.slug || "product";
      return {
        meta: [
          { title: `Product | SmartZone Pakistan` },
          { name: "description", content: "Browse smart hardware and IoT devices at SmartZone Pakistan." },
          { name: "robots", content: "noindex,follow" },
        ],
        links: [canonicalLink(`/products/${slug}`)],
      };
    }
    const title = productPageTitle(product.title);
    const description = productPageDescription(product);
    const url = absoluteUrl(`/products/${product.slug}`);
    const image = product.image_url || absoluteUrl("/og-image.svg");
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
        { property: "product:price:amount", content: String(Math.round(Number(product.price_pkr) || 0)) },
        { property: "product:price:currency", content: "PKR" },
      ],
      links: [canonicalLink(`/products/${product.slug}`)],
      scripts: [
        ldJsonScript(
          productJsonLd({
            title: product.title,
            slug: product.slug,
            description: product.description,
            image_url: product.image_url,
            price_pkr: product.price_pkr,
            availability: product.availability,
            manufacturer: product.manufacturer,
          }),
        ),
      ],
    };
  },
  component: ProductDetailPage,
  errorComponent: () => (
    <PageContainer size="md" className="py-20 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Unable to load product</h1>
      <p className="text-slate-500 text-sm mt-2">
        The requested product could not be loaded. Please try again or explore the catalog.
      </p>
      <Button asChild className="mt-6 font-bold">
        <Link to="/products">Explore All Products</Link>
      </Button>
    </PageContainer>
  ),
  notFoundComponent: () => (
    <PageContainer size="md" className="py-20 text-center">
      <h1 className="text-2xl font-bold">Product not found</h1>
      <Button asChild className="mt-4">
        <Link to="/products">Back to shop</Link>
      </Button>
    </PageContainer>
  ),
});

function ProductDetailPage() {
  const params = Route.useParams();
  const loaderData = Route.useLoaderData();
  const slug = params?.slug || "";
  const { product, reviews, related } = useProduct(slug, loaderData);

  const { data: vouchers } = useQuery({
    queryKey: ["vouchers-public"],
    queryFn: fetchActiveVouchers,
    staleTime: 120_000,
  });

  const productData = product.data ?? loaderData;

  if (!productData && (product.isLoading || product.isPending)) {
    return (
      <PageContainer>
        <div className="h-80 sm:h-96 animate-pulse bg-muted/50 rounded-xl" />
      </PageContainer>
    );
  }

  if (!productData) {
    return (
      <PageContainer size="md" className="py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Product not found</h1>
        <p className="text-slate-500 text-sm mt-2">
          The requested product could not be found or may have been updated.
        </p>
        <Button asChild className="mt-6 font-bold">
          <Link to="/products">Explore All Products</Link>
        </Button>
      </PageContainer>
    );
  }

  const data = productData;
  const gallery = buildProductGalleryImages(data.image_url, data.gallery_urls);

  const promoVoucher = vouchers?.[0] ?? null;

  return (
    <PageContainer>
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          {
            label: data.category || "Components",
            to: "/products",
            search: { category: data.category || undefined },
          },
          { label: data.title || "Product Details" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 lg:items-start">
        <div className="min-w-0 w-full lg:sticky lg:top-24 self-start">
          <ProductGallery title={data.title || "Product"} images={gallery} />
        </div>
        <div className="min-w-0">
          <ProductPurchasePanel product={data} activeVoucher={promoVoucher} />
        </div>
      </div>

      <ProductSpecTabs product={data} />

      <ProductReviews
        productId={data.id}
        avgRating={Number(data.rating) || 4.8}
        reviews={reviews.data ?? []}
      />

      <RelatedProducts
        category={data.category || "Components"}
        excludeId={data.id || ""}
        products={related.data}
        loading={related.isLoading}
      />
    </PageContainer>
  );
}
