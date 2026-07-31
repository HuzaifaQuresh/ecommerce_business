import { createServerFn } from "@tanstack/react-start";
import fs from "node:fs";
import path from "node:path";
import type { ProductRow } from "@/types/commerce";

const DATA_FILE = path.join(process.cwd(), "nexus_server_products.json");

// In-memory cache on server
let serverProductsCache: ProductRow[] | null = null;

function loadServerProductsFromFile(): ProductRow[] {
  if (serverProductsCache !== null) return serverProductsCache;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        serverProductsCache = parsed;
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not read server products file, initializing empty:", err);
  }
  serverProductsCache = [];
  return serverProductsCache;
}

function persistServerProducts(products: ProductRow[]) {
  serverProductsCache = products;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(products, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write server products file:", err);
  }
}

export const getServerProductsFn = createServerFn({ method: "GET" }).handler(async () => {
  return loadServerProductsFromFile();
});

export const saveServerProductFn = createServerFn({ method: "POST" })
  .validator((product: ProductRow) => product)
  .handler(async ({ data: product }) => {
    const list = [...loadServerProductsFromFile()];
    const index = list.findIndex(
      (p) => p.id === product.id || (product.slug && p.slug === product.slug),
    );
    if (index >= 0) {
      list[index] = product;
    } else {
      list.unshift(product);
    }
    persistServerProducts(list);
    return list;
  });

export const deleteServerProductFn = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const list = loadServerProductsFromFile().filter((p) => p.id !== data.id && p.slug !== data.id);
    persistServerProducts(list);
    return list;
  });
