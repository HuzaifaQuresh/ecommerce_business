import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { resolveHeroSlides, type HomeHeroSlide } from "@/lib/home-banners";
import { optimizeProductImageUrl } from "@/lib/product-image";
import { openContactDialog, parseStorefrontLink } from "@/lib/storefront-link";

function slideKey(slide: HomeHeroSlide, index: number) {
  return `${index}-${slide.title}-${slide.heading}-${slide.image_url}`.slice(0, 160);
}

function HeroCta({
  slide,
  className,
  fullBleed = false,
}: {
  slide: HomeHeroSlide;
  className?: string;
  fullBleed?: boolean;
}) {
  const parsed = parseStorefrontLink(slide.link);
  const label = slide.button_text || slide.heading || slide.title;

  if (fullBleed) {
    if (parsed.kind === "contact") {
      return (
        <button
          type="button"
          className="absolute inset-0 z-10"
          aria-label={label}
          onClick={() => openContactDialog()}
        />
      );
    }
    if (parsed.kind === "external") {
      return <a href={parsed.href} className="absolute inset-0 z-10" aria-label={label} />;
    }
    return (
      <Link
        to={parsed.to as never}
        search={parsed.search as never}
        hash={parsed.hash}
        className="absolute inset-0 z-10"
        aria-label={label}
      />
    );
  }

  if (parsed.kind === "contact") {
    return (
      <Button type="button" size="sm" className={className} onClick={() => openContactDialog()}>
        {slide.button_text}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    );
  }

  if (parsed.kind === "external") {
    return (
      <Button asChild size="sm" className={className}>
        <a href={parsed.href}>
          {slide.button_text}
          <ArrowRight className="ml-2 h-4 w-4" />
        </a>
      </Button>
    );
  }

  return (
    <Button asChild size="sm" className={className}>
      <Link to={parsed.to as never} search={parsed.search as never} hash={parsed.hash}>
        {slide.button_text}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </Button>
  );
}

export function HomeHeroSlider() {
  const { data: settings, isPending } = useSiteSettings();
  const merchReady = Boolean(settings) || !isPending;
  const slides = merchReady ? resolveHeroSlides(settings) : [];
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setCurrent((prev) => (slides.length ? prev % slides.length : 0));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length, paused]);

  if (!merchReady) {
    return (
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="relative rounded-lg overflow-hidden border border-slate-200/50 shadow-sm h-[240px] sm:h-[340px] lg:h-[440px] bg-[#071018] animate-pulse" />
      </section>
    );
  }

  if (!slides.length) return null;

  const go = (index: number) => {
    setCurrent((index + slides.length) % slides.length);
  };

  const ctaClass =
    "bg-[#FF7A00] hover:bg-[#E56E00] text-white font-bold px-6 sm:px-8 py-2.5 rounded-md shadow-lg hover:-translate-y-0.5 transition uppercase tracking-wider text-xs sm:text-sm border-0";

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 sm:pt-6">
      <div
        className="relative rounded-lg overflow-hidden border border-slate-200/50 shadow-sm h-[240px] sm:h-[340px] lg:h-[440px] bg-[#071018]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {slides.map((slide, index) => {
          const active = index === current;
          const photo = slide.image_url ? optimizeProductImageUrl(slide.image_url, "banner") : "";
          return (
            <article
              key={slideKey(slide, index)}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-in-out",
                active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
              )}
              aria-hidden={!active}
            >
              {photo && (active || Math.abs(index - current) <= 1) ? (
                <img
                  key={photo}
                  src={photo}
                  alt={slide.heading || slide.title || "SmartZone banner"}
                  width={1200}
                  height={675}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  draggable={false}
                  loading={active ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={active && index === current ? "high" : "low"}
                />
              ) : photo ? null : (
                <div className="absolute inset-0 bg-gradient-to-r from-[#0B192C] via-[#0F2C59] to-[#0052B4]" />
              )}
              {slide.hide_text ? (
                <HeroCta slide={slide} fullBleed />
              ) : (
                <>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 sm:h-44 bg-gradient-to-t from-[#0B192C]/90 via-[#0B192C]/35 to-transparent" />

                  <div className="relative z-10 h-full p-5 sm:p-8 lg:p-10 flex flex-col justify-end">
                    <div className="max-w-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        {slide.badge ? (
                          <span className="backdrop-blur-md text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border bg-[#FF7A00]/20 text-[#FF7A00] border-[#FF7A00]/40">
                            {slide.badge}
                          </span>
                        ) : null}
                        <span className="text-white/90 text-[10px] sm:text-xs font-bold tracking-wider uppercase">
                          {slide.title}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-3xl lg:text-[2.15rem] font-black text-white mt-3 leading-tight tracking-tight">
                        {slide.heading}
                      </h2>
                      {slide.desc ? (
                        <p className="text-white/85 text-xs sm:text-sm mt-3 leading-relaxed hidden sm:block max-w-lg">
                          {slide.desc}
                        </p>
                      ) : null}
                      <div className="mt-5 sm:mt-7">
                        <HeroCta slide={slide} className={ctaClass} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </article>
          );
        })}

        {slides.length > 1 ? (
          <>
            <div className="absolute bottom-4 right-6 z-20 flex gap-2">
              {slides.map((slide, idx) => (
                <button
                  key={slideKey(slide, idx)}
                  type="button"
                  onClick={() => go(idx)}
                  className={cn(
                    "h-1.5 sm:h-2 rounded-full transition-all duration-300",
                    idx === current ? "w-6 bg-white" : "w-1.5 sm:w-2 bg-white/40",
                  )}
                  aria-label={`Go to banner ${idx + 1}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
