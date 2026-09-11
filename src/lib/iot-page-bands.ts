import { parseJsonSetting } from "@/lib/checkout-totals";
import { clampDelaySec, parseHideText } from "@/lib/home-rotators";

export const IOT_PAGE_BANDS_KEY = "iot_page_bands";

export type IotPageBand = {
  badge: string;
  title: string;
  desc: string;
  shop_category: string;
  button_text: string;
  images: string[];
  hide_text: boolean;
};

export type IotPageBandsConfig = {
  delay_sec: number;
  bands: IotPageBand[];
};

export function emptyIotPageBand(): IotPageBand {
  return {
    badge: "Solution",
    title: "New SmartZone line",
    desc: "Describe this deployment line. Upload photos — they rotate in one frame on the card.",
    shop_category: "IoT Solutions",
    button_text: "GET A QUOTE",
    images: [""],
    hide_text: false,
  };
}

export const DEFAULT_IOT_PAGE_BANDS: IotPageBandsConfig = {
  delay_sec: 5,
  bands: [
    {
      badge: "IoT",
      title: "IoT & Smart Home Solutions",
      desc: "Tuya / Zigbee lighting, climate, curtains, sockets, and control panels — villa and apartment stacks with load-shedding backup in mind.",
      shop_category: "Smart Home Automation",
      button_text: "PLAN A HOME",
      hide_text: false,
      images: [
        "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1600&q=75&fm=webp",
        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=75&fm=webp",
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=75&fm=webp",
      ],
    },
    {
      badge: "Camera",
      title: "Camera & AI Surveillance",
      desc: "Hikvision / Dahua NVRs, human detect, active deterrence, and video doorbells — sized for homes, societies, and sites.",
      shop_category: "Smart Security Cameras",
      button_text: "CCTV PACKAGES",
      hide_text: false,
      images: [
        "https://images.unsplash.com/photo-1557597774-9d273bdfea9d?auto=format&fit=crop&w=1600&q=75&fm=webp",
        "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?auto=format&fit=crop&w=1600&q=75&fm=webp",
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1600&q=75&fm=webp",
      ],
    },
    {
      badge: "Industrial",
      title: "Industrial PLC, SCADA & Telemetry",
      desc: "Siemens / Weintek panels, Modbus edge gateways, and operator dashboards for plants, panel builders, and unmanned sites.",
      shop_category: "Industrial Automation",
      button_text: "INDUSTRIAL QUOTE",
      hide_text: false,
      images: [
        "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1600&q=75&fm=webp",
        "https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=1600&q=75&fm=webp",
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=75&fm=webp",
      ],
    },
    {
      badge: "Access",
      title: "ANPR Gates & Access Control",
      desc: "Plate capture, barrier motors, ZKTeco biometrics, and guard override with an audit trail for societies and factories.",
      shop_category: "License Plate Recognition",
      button_text: "GATE SYSTEMS",
      hide_text: false,
      images: [
        "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1600&q=75&fm=webp",
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=75&fm=webp",
        "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1600&q=75&fm=webp",
      ],
    },
    {
      badge: "Safety",
      title: "Fire, Gas & Safety Interlock",
      desc: "Smoke and LPG/NG detection tied to solenoid cutoff, local siren, and owner SMS — villas, kitchens, and plant rooms.",
      shop_category: "Tuya Smart Sensors",
      button_text: "SAFETY SYSTEMS",
      hide_text: false,
      images: [
        "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&w=1600&q=75&fm=webp",
        "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1600&q=75&fm=webp",
        "https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=1600&q=75&fm=webp",
      ],
    },
    {
      badge: "Remote",
      title: "Tower Sites & Edge Telemetry",
      desc: "4G/LoRa-backed PTZ, intrusion, and power monitoring for unmanned towers, cold-chain, and remote plants.",
      shop_category: "Industrial Automation",
      button_text: "REMOTE SITES",
      hide_text: false,
      images: [
        "https://images.unsplash.com/photo-1544197150-b99a5804f08d?auto=format&fit=crop&w=1600&q=75&fm=webp",
        "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1600&q=75&fm=webp",
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=75&fm=webp",
      ],
    },
  ],
};

function parseUnknown(value: unknown): unknown {
  if (value == null || value === "") return null;
  const once = parseJsonSetting<unknown>(value, null);
  if (once == null) return null;
  return typeof once === "string" ? parseJsonSetting<unknown>(once, null) : once;
}

function normalizeBand(raw: Partial<IotPageBand> | null | undefined): IotPageBand | null {
  if (!raw || typeof raw !== "object") return null;
  const title = String(raw.title ?? "").trim();
  const extra = String((raw as { image_url?: string }).image_url ?? "").trim();
  const images = Array.isArray(raw.images)
    ? raw.images.map((url) => String(url ?? "").trim()).filter(Boolean)
    : extra
      ? [extra]
      : [];
  if (!title && !images.length) return null;
  return {
    badge: String(raw.badge ?? "").trim() || "Solution",
    title: title || "SmartZone Solution",
    desc: String(raw.desc ?? "").trim(),
    shop_category: String(raw.shop_category ?? "").trim() || "IoT Solutions",
    button_text: String(raw.button_text ?? "").trim() || "GET A QUOTE",
    images,
    hide_text: parseHideText((raw as { hide_text?: unknown }).hide_text),
  };
}

export function defaultIotPageBands(): IotPageBandsConfig {
  return {
    delay_sec: DEFAULT_IOT_PAGE_BANDS.delay_sec,
    bands: DEFAULT_IOT_PAGE_BANDS.bands.map((band) => ({
      ...band,
      images: [...band.images],
    })),
  };
}

export function resolveIotPageBands(
  settings?: Record<string, unknown> | null,
): IotPageBandsConfig {
  const raw = parseUnknown(settings?.iot_page_bands);
  if (!raw || typeof raw !== "object") return defaultIotPageBands();
  if (Array.isArray(raw)) {
    const bands = raw.map((row) => normalizeBand(row as Partial<IotPageBand>)).filter(Boolean) as IotPageBand[];
    return { delay_sec: 5, bands: bands.length ? bands : defaultIotPageBands().bands };
  }
  const obj = raw as Partial<IotPageBandsConfig>;
  const bands = Array.isArray(obj.bands)
    ? (obj.bands.map((row) => normalizeBand(row)).filter(Boolean) as IotPageBand[])
    : [];
  if (!bands.length) return defaultIotPageBands();
  return { delay_sec: clampDelaySec(obj.delay_sec, 5), bands };
}
