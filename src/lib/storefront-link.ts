/** Parse storefront CTA hrefs for TanStack Link (path + search + hash). */

export type StorefrontLink =
  | { kind: "external"; href: string }
  | { kind: "contact" }
  | {
      kind: "internal";
      to: string;
      search?: Record<string, string>;
      hash?: string;
    };

export const OPEN_CONTACT_EVENT = "sz:open-contact";

export function openContactDialog() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_CONTACT_EVENT));
}

export function parseStorefrontLink(link: string): StorefrontLink {
  const raw = (link || "").trim();
  if (!raw) return { kind: "internal", to: "/products" };
  if (raw === "#contact" || raw === "/contact" || raw.toLowerCase() === "contact") {
    return { kind: "contact" };
  }
  if (/^https?:\/\//i.test(raw) || raw.startsWith("//")) {
    return { kind: "external", href: raw.startsWith("//") ? `https:${raw}` : raw };
  }

  const hashIdx = raw.indexOf("#");
  const hash = hashIdx >= 0 ? raw.slice(hashIdx + 1).trim() || undefined : undefined;
  const withoutHash = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
  const qIdx = withoutHash.indexOf("?");
  let pathname = (qIdx >= 0 ? withoutHash.slice(0, qIdx) : withoutHash).trim() || "/";
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  // Normalize trailing slash so history matches trailingSlash: 'never'
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);

  const search: Record<string, string> = {};
  if (qIdx >= 0) {
    new URLSearchParams(withoutHash.slice(qIdx + 1)).forEach((value, key) => {
      search[key] = value;
    });
  }

  return {
    kind: "internal",
    to: pathname,
    search: Object.keys(search).length ? search : undefined,
    hash,
  };
}
