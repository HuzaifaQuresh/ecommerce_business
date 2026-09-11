import { parseJsonSetting } from "@/lib/checkout-totals";

export const HOME_PROMO_BANNERS_KEY = "home_promo_banners";
export const HOME_SOLUTIONS_KEY = "home_solutions";

export function parseHideText(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === 1 || raw === "1";
}

export type PromoSlide = {
  image_url: string;
  title: string;
  link: string;
  button_text: string;
  hide_text: boolean;
};

export type PromoPairConfig = {
  delay_sec: number;
  left: PromoSlide[];
  right: PromoSlide[];
};

export type HomeSolutionItem = {
  badge: string;
  title: string;
  desc: string;
  image_url: string;
  button_text: string;
  link: string;
  hide_text: boolean;
};

export type HomeSolutionsConfig = {
  delay_sec: number;
  items: HomeSolutionItem[];
};

export function clampDelaySec(value: unknown, fallback = 4): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(20, Math.max(2, Math.round(n)));
}

export function emptyPromoSlide(): PromoSlide {
  return {
    image_url: "",
    title: "SmartZone offer",
    link: "/products",
    button_text: "SHOP NOW",
    hide_text: false,
  };
}

export function emptyHomeSolution(): HomeSolutionItem {
  return {
    badge: "Solution",
    title: "New SmartZone solution",
    desc: "Describe the deployment package. Add a photo — this card rotates on the homepage.",
    image_url: "",
    button_text: "GET A QUOTE",
    link: "/iot-solutions",
    hide_text: false,
  };
}

export const DEFAULT_PROMO_PAIR: PromoPairConfig = {
  delay_sec: 4,
  left: [
    {
      title: "Smart Home & Tuya Catalog",
      link: "/products",
      button_text: "SHOP NOW",
      hide_text: false,
      image_url:
        "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1200&q=75&fm=webp",
    },
    {
      title: "Enterprise IoT Hardware",
      link: "/products",
      button_text: "SHOP NOW",
      hide_text: false,
      image_url:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=75&fm=webp",
    },
  ],
  right: [
    {
      title: "CCTV & AI Surveillance",
      link: "/products?category=Smart%20Security%20Cameras",
      button_text: "SHOP NOW",
      hide_text: false,
      image_url:
        "https://images.unsplash.com/photo-1557597774-9d273bdfea9d?auto=format&fit=crop&w=1200&q=75&fm=webp",
    },
    {
      title: "Industrial PLC & Automation",
      link: "/iot-solutions",
      button_text: "SHOP NOW",
      hide_text: false,
      image_url:
        "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=75&fm=webp",
    },
  ],
};

export const DEFAULT_HOME_SOLUTIONS: HomeSolutionsConfig = {
  delay_sec: 5,
  items: [
    {
      badge: "Smart Home",
      title: "Whole-Home Automation",
      desc: "Lighting, climate, curtains, and locks on one Tuya / Zigbee stack — villa and apartment ready.",
      image_url:
        "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1400&q=75&fm=webp",
      button_text: "PLAN A HOME",
      link: "/iot-solutions",
      hide_text: false,
    },
    {
      badge: "CCTV",
      title: "AI Surveillance Packages",
      desc: "Hikvision / Dahua cameras with human detect, NVR, and active deterrence — sized for homes and sites.",
      image_url:
        "https://images.unsplash.com/photo-1557597774-9d273bdfea9d?auto=format&fit=crop&w=1400&q=75&fm=webp",
      button_text: "CCTV PACKAGES",
      link: "/products?category=Smart%20Security%20Cameras",
      hide_text: false,
    },
    {
      badge: "Access",
      title: "Sliding & Swing Gate Automation",
      desc: "Gate motors, photocells, remotes, and ANPR override — villas, factories, and society gates.",
      image_url:
        "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1400&q=75&fm=webp",
      button_text: "GATE SYSTEMS",
      link: "/iot-solutions",
      hide_text: false,
    },
    {
      badge: "Industrial",
      title: "PLC, SCADA & Telemetry",
      desc: "Siemens / Weintek panels, edge gateways, and dashboards for plants and unmanned sites.",
      image_url:
        "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1400&q=75&fm=webp",
      button_text: "INDUSTRIAL QUOTE",
      link: "/iot-solutions",
      hide_text: false,
    },
    {
      badge: "Perimeter",
      title: "Electric Fence & Perimeter",
      desc: "Energizers, sirens, and camera overlay for plots, factories, and farm boundaries.",
      image_url:
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1400&q=75&fm=webp",
      button_text: "SAFETY SYSTEMS",
      link: "/iot-solutions",
      hide_text: false,
    },
  ],
};

function parseUnknown(value: unknown): unknown {
  if (value == null || value === "") return null;
  const once = parseJsonSetting<unknown>(value, null);
  if (once == null) return null;
  return typeof once === "string" ? parseJsonSetting<unknown>(once, null) : once;
}

function normalizePromoSlide(raw: Partial<PromoSlide> | null | undefined): PromoSlide | null {
  if (!raw || typeof raw !== "object") return null;
  const image_url = String(raw.image_url ?? "").trim();
  const title = String(raw.title ?? "").trim();
  if (!image_url && !title) return null;
  return {
    image_url,
    title: title || "SmartZone",
    link: String(raw.link ?? "").trim() || "/products",
    button_text: String(raw.button_text ?? "").trim() || "SHOP NOW",
    hide_text: parseHideText(raw.hide_text),
  };
}

function normalizeSolution(raw: Partial<HomeSolutionItem> | null | undefined): HomeSolutionItem | null {
  if (!raw || typeof raw !== "object") return null;
  const title = String(raw.title ?? "").trim();
  const image_url = String(raw.image_url ?? "").trim();
  if (!title && !image_url) return null;
  return {
    badge: String(raw.badge ?? "").trim() || "Solution",
    title: title || "SmartZone Solution",
    desc: String(raw.desc ?? "").trim(),
    image_url,
    button_text: String(raw.button_text ?? "").trim() || "LEARN MORE",
    link: String(raw.link ?? "").trim() || "/iot-solutions",
    hide_text: parseHideText(raw.hide_text),
  };
}

export function defaultPromoPair(): PromoPairConfig {
  return {
    delay_sec: DEFAULT_PROMO_PAIR.delay_sec,
    left: DEFAULT_PROMO_PAIR.left.map((s) => ({ ...s })),
    right: DEFAULT_PROMO_PAIR.right.map((s) => ({ ...s })),
  };
}

export function defaultHomeSolutions(): HomeSolutionsConfig {
  return {
    delay_sec: DEFAULT_HOME_SOLUTIONS.delay_sec,
    items: DEFAULT_HOME_SOLUTIONS.items.map((s) => ({ ...s })),
  };
}

export function resolvePromoPair(settings?: Record<string, unknown> | null): PromoPairConfig {
  const raw = parseUnknown(settings?.home_promo_banners);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaultPromoPair();
  const obj = raw as Partial<PromoPairConfig>;
  const left = Array.isArray(obj.left)
    ? (obj.left.map((s) => normalizePromoSlide(s)).filter(Boolean) as PromoSlide[])
    : [];
  const right = Array.isArray(obj.right)
    ? (obj.right.map((s) => normalizePromoSlide(s)).filter(Boolean) as PromoSlide[])
    : [];
  if (!left.length && !right.length) return defaultPromoPair();
  return {
    delay_sec: clampDelaySec(obj.delay_sec, 4),
    left,
    right,
  };
}

export function resolveHomeSolutions(settings?: Record<string, unknown> | null): HomeSolutionsConfig {
  const raw = parseUnknown(settings?.home_solutions);
  if (!raw || typeof raw !== "object") return defaultHomeSolutions();
  if (Array.isArray(raw)) {
    const items = raw.map((s) => normalizeSolution(s as Partial<HomeSolutionItem>)).filter(Boolean) as HomeSolutionItem[];
    return { delay_sec: 5, items: items.length ? items : defaultHomeSolutions().items };
  }
  const obj = raw as Partial<HomeSolutionsConfig>;
  const items = Array.isArray(obj.items)
    ? (obj.items.map((s) => normalizeSolution(s)).filter(Boolean) as HomeSolutionItem[])
    : [];
  if (!items.length) return defaultHomeSolutions();
  return { delay_sec: clampDelaySec(obj.delay_sec, 5), items };
}
