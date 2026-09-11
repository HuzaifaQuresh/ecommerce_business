import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function InfiniteMarquee<T>({
  items,
  getKey,
  renderItem,
  className,
  reverse = false,
  speed = 56,
  pauseOnHover = true,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  className?: string;
  reverse?: boolean;
  duration?: string;
  speed?: number;
  pauseOnHover?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track || items.length === 0) return;

    const direction = reverse ? -1 : 1;
    let half = 0;
    let armed = false;
    let dragging = false;
    let hovered = false;
    let didDrag = false;
    let lastX = 0;
    let moved = 0;
    let last = 0;
    let frame = 0;

    const measure = () => {
      const group = track.firstElementChild as HTMLElement | null;
      half = group?.offsetWidth ?? 0;
    };

    const paint = () => {
      if (half > 8) {
        offsetRef.current = ((offsetRef.current % half) + half) % half;
      }
      track.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
    };

    const onDown = (event: PointerEvent) => {
      armed = true;
      dragging = false;
      didDrag = false;
      lastX = event.clientX;
      moved = 0;
    };

    const onMove = (event: PointerEvent) => {
      if (!armed) return;
      const dx = event.clientX - lastX;
      lastX = event.clientX;
      moved += Math.abs(dx);
      if (moved > 6) {
        dragging = true;
        didDrag = true;
      }
      if (!dragging) return;
      offsetRef.current -= dx;
      paint();
    };

    const onUp = () => {
      armed = false;
      dragging = false;
      lastX = 0;
      moved = 0;
    };

    const onClick = (event: Event) => {
      if (!didDrag) return;
      event.preventDefault();
      event.stopPropagation();
      didDrag = false;
    };

    const tick = (now: number) => {
      if (!last) last = now;
      const dt = Math.min(now - last, 50);
      last = now;
      if (half <= 8) measure();
      if (half > 8 && !dragging && !hovered) {
        offsetRef.current += direction * ((speed * dt) / 1000);
      }
      paint();
      frame = requestAnimationFrame(tick);
    };

    const onEnter = () => {
      if (!pauseOnHover) return;
      hovered = true;
    };
    const onLeave = () => {
      if (!pauseOnHover) return;
      hovered = false;
      last = 0;
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(track);
    if (track.firstElementChild) ro.observe(track.firstElementChild);

    root.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    root.addEventListener("click", onClick, true);
    root.addEventListener("mouseenter", onEnter);
    root.addEventListener("mouseleave", onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      root.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      root.removeEventListener("click", onClick, true);
      root.removeEventListener("mouseenter", onEnter);
      root.removeEventListener("mouseleave", onLeave);
    };
  }, [items.length, reverse, speed, pauseOnHover]);

  return (
    <div ref={rootRef} className={cn("sz-marquee", className)}>
      <div ref={trackRef} className="sz-marquee-track">
        {[0, 1].map((copy) => (
          <div key={copy} className="sz-marquee-group" aria-hidden={copy === 1}>
            {items.map((item) => (
              <div key={`${copy}-${getKey(item)}`} className="shrink-0">
                {renderItem(item)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
