import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { optimizeProductImageUrl } from "@/lib/product-image";

export function RotatingPromoSlot({
  slides,
  delayMs,
  offsetMs = 0,
  className,
  showDots = true,
  renderSlide,
}: {
  slides: { image_url: string; title: string; link: string; button_text?: string; hide_text?: boolean }[];
  delayMs: number;
  offsetMs?: number;
  className?: string;
  showDots?: boolean;
  renderSlide: (
    slide: { image_url: string; title: string; link: string; button_text?: string; hide_text?: boolean },
    active: boolean,
    index: number,
  ) => ReactNode;
}) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setCurrent((prev) => (slides.length ? prev % slides.length : 0));
  }, [slides.length]);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    const intervalMs = Math.max(2000, delayMs);
    let intervalId = 0;
    const startId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setCurrent((prev) => (prev + 1) % slides.length);
      }, intervalMs);
    }, Math.max(0, offsetMs));
    return () => {
      window.clearTimeout(startId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [slides.length, paused, delayMs, offsetMs]);

  if (!slides.length) return null;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, index) => (
        <div
          key={`${index}-${slide.title}`}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-in-out",
            index === current ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none",
          )}
        >
          {renderSlide(slide, index === current, index)}
        </div>
      ))}
      {showDots && slides.length > 1 ? (
        <div className="absolute bottom-3 right-3 z-20 flex gap-1.5">
          {slides.map((slide, idx) => (
            <button
              key={`${idx}-dot`}
              type="button"
              aria-label={`Show ${slide.title || `banner ${idx + 1}`}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === current ? "w-5 bg-white" : "w-1.5 bg-white/45",
              )}
              onClick={() => setCurrent(idx)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PromoBannerCard({
  image_url,
  title,
  link,
  button_text = "SHOP NOW",
  hide_text = false,
}: {
  image_url: string;
  title: string;
  link: string;
  button_text?: string;
  hide_text?: boolean;
}) {
  const photo = image_url ? optimizeProductImageUrl(image_url, "banner") : "";
  const inner = (
    <div className="relative h-full w-full overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#071018] group">
      {photo ? (
        <img
          src={photo}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B192C] to-[#0052B4]" />
      )}
      {hide_text ? null : (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0B192C]/85 via-[#0B192C]/25 to-transparent" />
          <div className="relative z-10 h-full flex flex-col justify-end p-3 sm:p-4">
            <p className="text-white font-black text-sm sm:text-base leading-tight tracking-tight max-w-[90%] drop-shadow-[0_1px_8px_rgba(0,0,0,0.65)]">
              {title}
            </p>
            <span className="mt-2 inline-flex w-fit items-center rounded-md bg-[#FF7A00] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white group-hover:bg-[#E56E00]">
              {button_text} →
            </span>
          </div>
        </>
      )}
    </div>
  );

  if (link.startsWith("http")) {
    return (
      <a href={link} target="_blank" rel="noreferrer" className="block h-full w-full">
        {inner}
      </a>
    );
  }

  return (
    <Link to={link as never} className="block h-full w-full">
      {inner}
    </Link>
  );
}
