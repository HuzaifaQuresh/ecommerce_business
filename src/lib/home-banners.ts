import { parseJsonSetting } from "@/lib/checkout-totals";
import { parseHideText } from "@/lib/home-rotators";

export const HOME_HERO_SLIDES_KEY = "home_hero_slides";

export type HomeHeroSlide = {
  badge: string;
  title: string;
  heading: string;
  desc: string;
  image_url: string;
  button_text: string;
  link: string;
  hide_text: boolean;
};

export const DEFAULT_HERO_SLIDES: HomeHeroSlide[] = [
  {
    badge: "Official Distributor",
    title: "SMARTZONE",
    heading: "We Are Best IT Services Provider For Your Business",
    desc: "A secure and reliable IT infrastructure is essential to the success of any business. We specialize in client service and are glad to help with any IT-related issues you may have.",
    image_url: "",
    button_text: "CONTACT US",
    link: "#contact",
    hide_text: false,
  },
  {
    badge: "Top Rated",
    title: "SMART HOME & AUTOMATION",
    heading: "Advanced PLCs, Instrumentation & Smart Systems",
    desc: "Transform your operations with industry 4.0 automation, wireless IoT sensors, and certified enterprise deployments.",
    image_url:
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1400&q=75&fm=webp",
    button_text: "EXPLORE CATALOG",
    link: "/products",
    hide_text: false,
  },
  {
    badge: "GST Invoices",
    title: "ENTERPRISE INFRASTRUCTURE",
    heading: "Inverter Drives, Relays & Engineering Hardware",
    desc: "Direct nationwide delivery across Pakistan with technical support, warranty, and commercial invoicing.",
    image_url: "",
    button_text: "GET A QUOTE",
    link: "/iot-solutions#quote",
    hide_text: false,
  },
];

export function emptyHeroSlide(): HomeHeroSlide {
  return {
    badge: "Featured",
    title: "SMARTZONE",
    heading: "New homepage banner",
    desc: "Add a photo and copy. This slide appears on smartzone.pk after you save.",
    image_url: "",
    button_text: "SHOP NOW",
    link: "/products",
    hide_text: false,
  };
}

export function defaultHeroSlides(): HomeHeroSlide[] {
  return DEFAULT_HERO_SLIDES.map((slide) => ({ ...slide }));
}

function unwrapSettingString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      try {
        const parsed = JSON.parse(trimmed);
        return typeof parsed === "string" ? parsed : trimmed.slice(1, -1);
      } catch {
        return trimmed.replace(/^"+|"+$/g, "");
      }
    }
    return trimmed;
  }
  return String(value).replace(/^"+|"+$/g, "");
}

function normalizeSlide(raw: Partial<HomeHeroSlide> | null | undefined): HomeHeroSlide | null {
  if (!raw || typeof raw !== "object") return null;
  const heading = String(raw.heading ?? "").trim();
  const title = String(raw.title ?? "").trim();
  const image_url = String(raw.image_url ?? "").trim();
  if (!heading && !title && !image_url) return null;
  return {
    badge: String(raw.badge ?? "").trim() || "SmartZone",
    title: title || "SMARTZONE",
    heading: heading || title || "SmartZone",
    desc: String(raw.desc ?? "").trim(),
    image_url,
    button_text: String(raw.button_text ?? "").trim() || "SHOP NOW",
    link: String(raw.link ?? "").trim() || "/products",
    hide_text: parseHideText(raw.hide_text),
  };
}

/** `null` = never saved. `[]` = admin deleted every slide. */
export function parseHeroSlides(value: unknown): HomeHeroSlide[] | null {
  if (value == null || value === "") return null;
  const once = parseJsonSetting<unknown>(value, null);
  if (once == null) return null;
  const twice = typeof once === "string" ? parseJsonSetting<unknown>(once, null) : once;
  if (!Array.isArray(twice)) return null;
  return twice.map((item) => normalizeSlide(item as Partial<HomeHeroSlide>)).filter(Boolean) as HomeHeroSlide[];
}

export function resolveHeroSlides(settings?: Record<string, unknown> | null): HomeHeroSlide[] {
  const saved = parseHeroSlides(settings?.home_hero_slides);
  if (saved) return saved;
  const legacyImage = unwrapSettingString(settings?.hero_banner);
  if (legacyImage) {
    const seeded = defaultHeroSlides();
    seeded[0] = { ...seeded[0], image_url: legacyImage };
    return seeded;
  }
  return defaultHeroSlides();
}
