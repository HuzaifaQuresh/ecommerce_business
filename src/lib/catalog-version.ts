/** Bump this whenever the public catalog must invalidate browser + query caches. */
export const CATALOG_STORAGE_VERSION = "smartzone_v9_product_upsert";
export const CATALOG_QUERY_VERSION = "v9";

export function catalogListKey(category?: string) {
  return ["products", CATALOG_QUERY_VERSION, category || "all"] as const;
}

export function catalogHomeKey() {
  return ["home-products", CATALOG_QUERY_VERSION] as const;
}

export function catalogProductKey(slug: string) {
  return ["product", CATALOG_QUERY_VERSION, slug] as const;
}

export function catalogRelatedKey(category: string, productId: string) {
  return ["related", CATALOG_QUERY_VERSION, category, productId] as const;
}

/**
 * Runs in <head> before React hydrates so stale nexus_local_products
 * (old test SKUs, full catalog dumps) cannot paint on first refresh.
 */
export const CATALOG_BOOT_SCRIPT = `(function(){try{var v=${JSON.stringify(CATALOG_STORAGE_VERSION)};if(localStorage.getItem("smartzone_catalog_version")===v)return;localStorage.removeItem("nexus_local_products");localStorage.setItem("smartzone_catalog_version",v);}catch(e){}})();`;
