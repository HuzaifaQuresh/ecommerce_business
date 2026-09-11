import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { resolveHomeSolutions } from "@/lib/home-rotators";
import { RotatingPromoSlot } from "@/components/site/RotatingPromo";
import { optimizeProductImageUrl } from "@/lib/product-image";
import { HomeSectionBadge, HomeSectionHeader } from "@/components/site/HomeSectionHeader";

export function HomeSolutionsStrip() {
  const { data: settings, isPending } = useSiteSettings();
  const merchReady = Boolean(settings) || !isPending;
  if (!merchReady) return null;
  const config = resolveHomeSolutions(settings);
  const items = config.items.filter((item) => item.title.trim());
  if (!items.length) return null;
  const delayMs = config.delay_sec * 1000;

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-10 sm:mt-14 mb-4">
      <div className="rounded-xl overflow-hidden border border-[#0F2C59] bg-[#0B192C] shadow-sm">
        <HomeSectionHeader
          dark
          badge={
            <HomeSectionBadge dark>
              <Sparkles className="h-3 w-3" /> Engineered Deployments
            </HomeSectionBadge>
          }
          title="Solutions"
          subtitle="Turnkey packages for homes, sites, and industry — CCTV, automation, gates, and PLC."
          action={
            <Button
              asChild
              size="sm"
              className="bg-[#FF7A00] hover:bg-[#E56E00] text-white font-bold"
            >
              <Link to="/iot-solutions">
                All solutions <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          }
        />

        <div className="px-4 sm:px-6 pb-4">
          <RotatingPromoSlot
            slides={items.map((item) => ({
              image_url: item.image_url,
              title: item.title,
              link: item.link,
            }))}
            delayMs={delayMs}
            className="h-[260px] sm:h-[320px] lg:h-[380px] rounded-lg"
            renderSlide={(_slide, _active, index) => {
              const item = items[index] ?? items[0];
              const photo = item.image_url ? optimizeProductImageUrl(item.image_url, "banner") : "";
              return (
                <div className="absolute inset-0 rounded-lg overflow-hidden bg-[#071018]">
                  {photo ? (
                    <img
                      src={photo}
                      alt={item.title}
                      className="absolute inset-0 h-full w-full object-contain object-center"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-[#071018] to-[#0052B4]" />
                  )}
                  {item.hide_text ? (
                    <Link to={item.link as never} className="absolute inset-0 z-10" aria-label={item.title} />
                  ) : (
                    <>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 sm:h-36 bg-gradient-to-t from-[#0B192C]/90 via-[#0B192C]/30 to-transparent" />
                  <div className="relative z-10 h-full p-5 sm:p-8 flex flex-col justify-end">
                    <span className="w-fit text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border bg-[#FF7A00]/20 text-[#FF7A00] border-[#FF7A00]/40">
                      {item.badge}
                    </span>
                    <h3 className="text-white font-black text-xl sm:text-3xl mt-2.5 leading-tight drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)]">
                      {item.title}
                    </h3>
                    {item.desc ? (
                      <p className="text-white/85 text-xs sm:text-sm mt-2 leading-relaxed hidden sm:block max-w-xl">
                        {item.desc}
                      </p>
                    ) : null}
                    <Link
                      to={item.link as never}
                      className="mt-4 inline-flex w-fit items-center bg-[#FF7A00] hover:bg-[#E56E00] text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-md"
                    >
                      {item.button_text} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </div>
                    </>
                  )}
                </div>
              );
            }}
          />
        </div>

        <div className="px-4 sm:px-6 pb-5 sm:pb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => {
            const photo = item.image_url ? optimizeProductImageUrl(item.image_url, "banner") : "";
            return (
              <Link
                key={item.title}
                to={item.link as never}
                className="group rounded-lg overflow-hidden border border-white/10 bg-[#071018] hover:border-[#FF7A00]/50 transition"
              >
                <div className="relative h-36 sm:h-40 overflow-hidden bg-[#071018]">
                  {photo ? (
                    <img
                      src={photo}
                      alt=""
                      className="h-full w-full object-contain object-center"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#0F2C59] to-[#0052B4]" />
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#071018]/80 to-transparent" />
                </div>
                {item.hide_text ? null : (
                <div className="p-3.5 pt-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[#FF7A00]">
                    {item.badge}
                  </p>
                  <h4 className="text-white font-bold text-sm mt-0.5 leading-snug group-hover:text-[#00A3E0] transition">
                    {item.title}
                  </h4>
                  <span className="mt-2 inline-flex w-fit items-center rounded-md bg-[#FF7A00] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white group-hover:bg-[#E56E00]">
                    {item.button_text} →
                  </span>
                </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
