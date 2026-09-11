import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { resolveIotPageBands, type IotPageBand } from "@/lib/iot-page-bands";
import { RotatingPromoSlot } from "@/components/site/RotatingPromo";
import { optimizeProductImageUrl } from "@/lib/product-image";
import { HomeSectionBadge, HomeSectionHeader } from "@/components/site/HomeSectionHeader";
import { cn } from "@/lib/utils";

function toSlides(images: string[], title: string, link = "#") {
  return images.filter(Boolean).map((image_url) => ({ image_url, title, link }));
}

function PhotoFrame({
  image_url,
  alt,
  className,
}: {
  image_url: string;
  alt: string;
  className?: string;
}) {
  const photo = image_url ? optimizeProductImageUrl(image_url, "banner") : "";
  return (
    <div className={cn("absolute inset-0 bg-[#071018]", className)}>
      {photo ? (
        <img src={photo} alt={alt} className="h-full w-full object-contain object-center" />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-[#0B192C] to-[#0052B4]" />
      )}
    </div>
  );
}

function PhotoSlot({
  images,
  title,
  delayMs,
  offsetMs = 0,
  className,
  showDots = false,
}: {
  images: string[];
  title: string;
  delayMs: number;
  offsetMs?: number;
  className?: string;
  showDots?: boolean;
}) {
  const slides = toSlides(images, title);
  if (!slides.length) return <div className={cn("bg-[#0B192C]", className)} />;

  return (
    <RotatingPromoSlot
      slides={slides}
      delayMs={delayMs}
      offsetMs={offsetMs}
      showDots={showDots}
      className={cn("h-full min-h-[140px]", className)}
      renderSlide={(slide) => <PhotoFrame image_url={slide.image_url} alt={title} />}
    />
  );
}

function useIotPageConfig() {
  const { data: settings } = useSiteSettings();
  return resolveIotPageBands(settings);
}

function allBandPhotos(config: ReturnType<typeof resolveIotPageBands>) {
  return config.bands.flatMap((band) => band.images.filter(Boolean));
}

export function IotSolutionsHero({ children }: { children: ReactNode }) {
  const config = useIotPageConfig();
  const photos = allBandPhotos(config);

  return (
    <section className="relative overflow-hidden bg-[#0B192C] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,122,0,0.16),_transparent_42%),radial-gradient(ellipse_at_bottom_left,_rgba(0,82,180,0.22),_transparent_50%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:gap-12 lg:py-20">
        <div className="order-2 lg:order-1">{children}</div>
        <div className="order-1 h-[240px] overflow-hidden rounded-2xl border border-white/10 sm:h-[340px] lg:order-2 lg:h-[460px]">
          <PhotoSlot
            images={photos}
            title="SmartZone IoT solutions"
            delayMs={config.delay_sec * 1000}
            className="h-full"
          />
        </div>
      </div>
    </section>
  );
}

export function IotAboutVisual() {
  const config = useIotPageConfig();
  const photos = allBandPhotos(config).slice(0, 8);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <PhotoSlot
        images={photos}
        title="SmartZone deployments"
        delayMs={config.delay_sec * 1000}
        offsetMs={400}
        className="h-[220px] sm:h-[280px]"
      />
    </div>
  );
}

export function IotSolutionsHeroBackdrop() {
  const config = useIotPageConfig();
  const photos = allBandPhotos(config);
  if (!photos.length) return null;
  return (
    <PhotoSlot
      images={photos}
      title="SmartZone solutions"
      delayMs={config.delay_sec * 1000}
      className="absolute inset-0"
    />
  );
}

function CardActions({
  band,
  onQuote,
}: {
  band: IotPageBand;
  onQuote: (title: string) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button
        size="sm"
        className="bg-[#FF7A00] font-bold text-white hover:bg-[#E56E00]"
        onClick={() => onQuote(band.title)}
      >
        {band.button_text} <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
      <Button size="sm" variant="outline" asChild>
        <Link to="/products" search={{ category: band.shop_category } as never}>
          Products
        </Link>
      </Button>
    </div>
  );
}

/** One layout for every solution band: single photo frame + optional text (hide_text). */
function SolutionBandCard({
  band,
  delayMs,
  offsetMs,
  onQuote,
}: {
  band: IotPageBand;
  delayMs: number;
  offsetMs: number;
  onQuote: (title: string) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xs">
      <PhotoSlot
        images={band.images}
        title={band.title}
        delayMs={delayMs}
        offsetMs={offsetMs}
        className="h-[240px] sm:h-[280px]"
      />
      {band.hide_text ? null : (
        <div className="p-5 sm:p-6">
          <span className="w-fit rounded border border-[#FF7A00]/30 bg-[#FF7A00]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FF7A00]">
            {band.badge}
          </span>
          <h3 className="mt-2 text-lg font-black leading-tight text-[#0B192C]">{band.title}</h3>
          {band.desc ? (
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{band.desc}</p>
          ) : null}
          <CardActions band={band} onQuote={onQuote} />
        </div>
      )}
    </article>
  );
}

export function IotSolutionBands({ onQuote }: { onQuote: (title: string) => void }) {
  const config = useIotPageConfig();
  const bands = config.bands.filter((band) => band.title.trim());
  if (!bands.length) return null;
  const delayMs = config.delay_sec * 1000;

  return (
    <section id="projects" className="scroll-mt-24 bg-slate-50 pt-10 pb-8 sm:pt-12 sm:pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <HomeSectionHeader
          className="px-0 pb-5 pt-0"
          badge={<HomeSectionBadge>Deployment lines</HomeSectionBadge>}
          title="Industrial, camera & IoT solutions"
          subtitle="Each card is one photo frame — extra images rotate in the same slot."
        />

        <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {bands.map((band, index) => (
            <SolutionBandCard
              key={`${band.title}-${index}`}
              band={band}
              delayMs={delayMs}
              offsetMs={index * 650}
              onQuote={onQuote}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
