export const fmtPKR = (n: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(n);

export {
  TOP_LEVEL_CATEGORIES as CATEGORIES,
  ALL_CATEGORY_LABELS,
  CATEGORY_CATALOG,
  productMatchesCategory,
  getCategoryFilterValues,
  getParentCategory,
  isTopLevelCategory,
} from "@/lib/categories";

export type { CategoryNode } from "@/lib/categories";

/** @deprecated Use TOP_LEVEL_CATEGORIES from categories — kept for imports */
export type Category = string;

export const AVAILABILITY_LABEL: Record<string, string> = {
  in_stock: "In Stock",
  on_demand: "Available on Demand",
  coming_soon: "Coming Soon",
  obsolete: "Obsolete",
};
