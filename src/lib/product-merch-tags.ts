/** Merchandising flags stored on product.tags for featured / hot-selling. */

export const FEATURED_TAG = "featured";
export const HOT_SELLING_TAG = "hot-selling";

export function normalizeProductTags(tags: string[] | string | null | undefined): string[] {
  if (Array.isArray(tags)) {
    return tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

export function hasProductTag(tags: string[] | string | null | undefined, tag: string) {
  return normalizeProductTags(tags).includes(tag.toLowerCase());
}

export function toggleProductTag(
  tags: string[] | string | null | undefined,
  tag: string,
  enabled: boolean,
): string[] {
  const next = new Set(normalizeProductTags(tags));
  const key = tag.toLowerCase();
  if (enabled) next.add(key);
  else next.delete(key);
  return [...next];
}
