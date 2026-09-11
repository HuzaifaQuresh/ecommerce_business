import { useSiteSettings } from "@/hooks/useSiteSettings";
import { resolvePromoPair } from "@/lib/home-rotators";
import { PromoBannerCard, RotatingPromoSlot } from "@/components/site/RotatingPromo";

export function HomePromoPair() {
  const { data: settings, isPending } = useSiteSettings();
  const merchReady = Boolean(settings) || !isPending;
  if (!merchReady) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-[200px] sm:h-[240px] lg:h-[280px] rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-[200px] sm:h-[240px] lg:h-[280px] rounded-lg bg-slate-100 animate-pulse" />
        </div>
      </section>
    );
  }
  const pair = resolvePromoPair(settings);
  const delayMs = pair.delay_sec * 1000;
  if (!pair.left.length && !pair.right.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pair.left.length ? (
          <RotatingPromoSlot
            slides={pair.left}
            delayMs={delayMs}
            className="h-[200px] sm:h-[240px] lg:h-[280px] rounded-lg"
            renderSlide={(slide) => (
              <div className="absolute inset-0">
                <PromoBannerCard {...slide} />
              </div>
            )}
          />
        ) : null}
        {pair.right.length ? (
          <RotatingPromoSlot
            slides={pair.right}
            delayMs={delayMs}
            offsetMs={900}
            className="h-[200px] sm:h-[240px] lg:h-[280px] rounded-lg"
            renderSlide={(slide) => (
              <div className="absolute inset-0">
                <PromoBannerCard {...slide} />
              </div>
            )}
          />
        ) : null}
      </div>
    </section>
  );
}
