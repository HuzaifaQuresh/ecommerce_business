import { parseJsonSetting } from "@/lib/checkout-totals";
import { cleanSetting } from "@/lib/whatsapp";

export const DEFAULT_OFFICE_ADDRESS = "Blue Area, Islamabad, Pakistan";

export const DEFAULT_CONTACT_EMAIL = "info@smartzone.pk";

export const SOCIAL_KEYS = ["facebook", "instagram", "linkedin", "youtube", "twitter"] as const;

export type SocialNetwork = (typeof SOCIAL_KEYS)[number];

export type SocialLinks = Record<SocialNetwork, string>;

export const EMPTY_SOCIAL_LINKS: SocialLinks = {
  facebook: "",
  instagram: "",
  linkedin: "",
  youtube: "",
  twitter: "",
};

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  twitter: "X / Twitter",
};

export function normalizeHttpUrl(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function parseSocialLinks(value: unknown): SocialLinks {
  const once = parseJsonSetting<unknown>(value, {});
  const raw =
    typeof once === "string" ? parseJsonSetting<Record<string, unknown>>(once, {}) : once;
  const map = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    facebook: cleanSetting(map.facebook),
    instagram: cleanSetting(map.instagram),
    linkedin: cleanSetting(map.linkedin),
    youtube: cleanSetting(map.youtube),
    twitter: cleanSetting(map.twitter),
  };
}

function unwrapText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("{") && trimmed.endsWith("}"))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === "string" && parsed.trim()) return parsed.trim();
      } catch {
        /* keep stripped text */
      }
    }
    return cleanSetting(trimmed, fallback) || fallback;
  }
  return cleanSetting(value, fallback) || fallback;
}

export function officeAddressFromSettings(settings?: Record<string, unknown> | null): string {
  return unwrapText(settings?.office_address, DEFAULT_OFFICE_ADDRESS) || DEFAULT_OFFICE_ADDRESS;
}

export function officeMapsUrlFromSettings(settings?: Record<string, unknown> | null): string {
  const custom = normalizeHttpUrl(unwrapText(settings?.office_maps_url));
  if (custom) return custom;
  const address = officeAddressFromSettings(settings);
  if (!address) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function contactEmailFromSettings(settings?: Record<string, unknown> | null): string {
  return cleanSetting(settings?.contact_email, DEFAULT_CONTACT_EMAIL) || DEFAULT_CONTACT_EMAIL;
}

export function socialLinksFromSettings(settings?: Record<string, unknown> | null): SocialLinks {
  return parseSocialLinks(settings?.social_links);
}

export function visibleSocials(links: SocialLinks): { id: SocialNetwork; href: string; label: string }[] {
  return SOCIAL_KEYS.filter((id) => links[id]).map((id) => ({
    id,
    href: normalizeHttpUrl(links[id]),
    label: SOCIAL_LABELS[id],
  }));
}
