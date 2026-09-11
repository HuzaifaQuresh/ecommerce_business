import type { ProductRow } from "@/types/commerce";
import {
  getServerProductsFn,
  saveServerProductFn,
  deleteServerProductFn,
} from "@/api/server-products";
import { CATALOG_STORAGE_VERSION } from "@/lib/catalog-version";

/** Base maker & industrial automation catalog */
const IMG = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600";
const IMG2 = "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600";
const IMG3 = "https://images.unsplash.com/photo-1558002038-1055907df827?w=600";

const BASE_HARDWARE_PRODUCTS: ProductRow[] = [
  {
    id: "mock-3",
    title: "Raspberry Pi 5 8GB Single Board Computer - Linux/WiFi",
    slug: "raspberry-pi-5-8gb",
    description: "Quad-core ARM Cortex-A76, 8GB RAM for edge AI & industrial IoT.",
    category: "Raspberry Pi",
    price_pkr: 32000,
    stock: 18,
    image_url: IMG,
    manufacturer: "Raspberry Pi",
    color: "Green",
    availability: "in_stock",
    discount_pct: 0,
    tags: ["sbc", "raspberry pi", "edge ai"],
    rating: 4.9,
    gallery_urls: [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600",
      "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600",
    ],
    specs: {
      protocol: "Wi-Fi 5 & Bluetooth 5.0",
      power: "5V 5A USB-C PD",
      ecosystem: "Raspberry Pi OS / Linux",
      Processor: "Broadcom BCM2712 2.4GHz Quad-Core",
      RAM: "8GB LPDDR4X",
    },
  },
  {
    id: "mock-4",
    title: "Espressif ESP32-WROOM-32D Development Board - WiFi/BLE",
    slug: "esp32-wroom-devkit",
    description: "Wi-Fi + BLE dual-core MCU for smart IoT prototyping.",
    category: "ESP32 / MCU Boards",
    price_pkr: 1450,
    stock: 200,
    image_url: IMG,
    manufacturer: "Espressif",
    color: "Black",
    availability: "in_stock",
    discount_pct: 20,
    tags: ["esp32", "microcontroller", "iot"],
    rating: 4.8,
    gallery_urls: [],
    specs: {
      protocol: "Wi-Fi 802.11 b/g/n & BLE 4.2",
      power: "5V Micro-USB / 3.3V Pin",
      ecosystem: "Arduino / ESP-IDF / Home Assistant",
      Chipset: "ESP32 Dual Core 240MHz",
      Flash: "4MB SPI Flash",
    },
  },
  {
    id: "mock-5",
    title: "SmartZone 8-Channel Isolated Relay Board - 5V/10A",
    slug: "relay-8ch-opto",
    description: "10A relay board with optical isolation for PLC & Arduino automation.",
    category: "Connectors",
    price_pkr: 1450,
    stock: 85,
    image_url: IMG,
    manufacturer: "Generic",
    color: "Blue",
    availability: "in_stock",
    discount_pct: 0,
    tags: ["relay", "automation"],
    rating: 4.5,
    gallery_urls: [],
    specs: {
      protocol: "GPIO Signal Trigger",
      power: "5V DC / 12V DC Input",
      ecosystem: "Universal / PLC / MCU",
      "Max Load": "250V AC 10A / 30V DC 10A",
    },
  },
  {
    id: "mock-6",
    title: "Siemens S7-1200 CPU 1214C Programmable Logic Controller - PROFINET",
    slug: "siemens-s7-1200",
    description: "Compact high-reliability PLC for factory & manufacturing automation.",
    category: "Programmable Logic Controller (PLC)",
    price_pkr: 145000,
    stock: 5,
    image_url: IMG,
    manufacturer: "Siemens",
    color: "Gray",
    availability: "in_stock",
    discount_pct: 0,
    tags: ["plc", "siemens", "industrial"],
    rating: 4.9,
    gallery_urls: [],
    specs: {},
    vendor_id: "demo-vendor",
  },
  {
    id: "mock-8",
    title: "Creality Ender 3 V3 SE High-Speed 3D Printer - FDM",
    slug: "creality-ender-3-v3",
    description: "Precision FDM 3D printer with auto-bed leveling for rapid prototyping.",
    category: "3D Printer",
    price_pkr: 89000,
    stock: 8,
    image_url: IMG2,
    manufacturer: "Creality",
    color: "Black",
    availability: "in_stock",
    discount_pct: 8,
    tags: ["3d", "printer", "prototyping"],
    rating: 4.4,
    gallery_urls: [],
    specs: {},
  },
  {
    id: "mock-9",
    title: "UNI-T UT61E+ True RMS Digital Multimeter - Industrial",
    slug: "uni-t-multimeter",
    description: "True RMS professional digital multimeter with capacitance & frequency test.",
    category: "Multimeters",
    price_pkr: 12500,
    stock: 24,
    image_url: IMG,
    manufacturer: "UNI-T",
    color: "Yellow",
    availability: "in_stock",
    discount_pct: 5,
    tags: ["tool", "meter", "electronics"],
    rating: 4.6,
    gallery_urls: [],
    specs: {},
  },
  {
    id: "mock-10",
    title: "SmartZone NEMA 17 1.8-Degree High-Torque Stepper Motor - 2-Phase",
    slug: "nema-17-stepper",
    description: "1.8° precision bipolar stepper motor for 3D printers and CNC machines.",
    category: "Motors",
    price_pkr: 3200,
    stock: 60,
    image_url: IMG2,
    manufacturer: "Generic",
    color: "Black",
    availability: "in_stock",
    discount_pct: 10,
    tags: ["motor", "stepper", "cnc"],
    rating: 4.3,
    gallery_urls: [],
    specs: {},
    vendor_id: "demo-vendor",
  },
  {
    id: "mock-11",
    title: "MeanWell NDR-240-24 24V 10A DIN-Rail Power Supply - Industrial",
    slug: "meanwell-24v-10a",
    description: "High-efficiency industrial DIN-rail power supply with short circuit protection.",
    category: "DC Power Supplies",
    price_pkr: 9800,
    stock: 40,
    image_url: IMG,
    manufacturer: "MeanWell",
    color: "Silver",
    availability: "in_stock",
    discount_pct: 0,
    tags: ["psu", "power supply", "industrial"],
    rating: 4.7,
    gallery_urls: [],
    specs: {},
  },
];

let tuyaCatalogLoaded = false;
let tuyaCatalogLoading: Promise<void> | null = null;
const builtinCatalog: ProductRow[] = [...BASE_HARDWARE_PRODUCTS];

export const STATIC_MOCK_PRODUCTS: ProductRow[] = builtinCatalog;
export const MOCK_PRODUCTS: ProductRow[] = [...builtinCatalog];

const isBrowser = typeof window !== "undefined";
const productById = new Map<string, ProductRow>();
const productBySlug = new Map<string, ProductRow>();

function isUserProduct(product: ProductRow) {
  return Boolean(product.id?.startsWith("user-"));
}

/** Demo seed SKUs and leftover test rows must never reach the public storefront. */
export function isDemoOrTestProduct(product: ProductRow) {
  const id = (product.id || "").toLowerCase();
  if (id.startsWith("mock-") || id.startsWith("test-") || id.startsWith("demo-")) return true;
  if (product.vendor_id === "demo-vendor") return true;
  const tags = (product.tags ?? []).map((tag) => String(tag).toLowerCase());
  return tags.includes("demo") || tags.includes("test") || tags.includes("placeholder");
}

function rebuildLookupIndexes() {
  productById.clear();
  productBySlug.clear();
  for (const product of MOCK_PRODUCTS) {
    if (product.id) {
      productById.set(product.id, product);
      productById.set(product.id.toLowerCase(), product);
    }
    const slug = (product.slug || "").toLowerCase().trim();
    if (slug) productBySlug.set(slug, product);
  }
}

function purgeStaleCatalogStorage() {
  if (!isBrowser) return;
  try {
    if (localStorage.getItem("smartzone_catalog_version") === CATALOG_STORAGE_VERSION) return;
    localStorage.removeItem("nexus_local_products");
    localStorage.setItem("smartzone_catalog_version", CATALOG_STORAGE_VERSION);
  } catch {
    /* ignore quota / private mode */
  }
}

function readUserProducts(): ProductRow[] {
  if (!isBrowser) return [];
  purgeStaleCatalogStorage();
  const val = localStorage.getItem("nexus_local_products");
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed)
      ? parsed.filter((product: ProductRow) => isUserProduct(product) && !isDemoOrTestProduct(product))
      : [];
  } catch {
    return [];
  }
}

function persistableProducts() {
  return MOCK_PRODUCTS.filter((product) => isUserProduct(product) && !isDemoOrTestProduct(product));
}

function persistUserProducts() {
  if (!isBrowser) return;
  try {
    localStorage.setItem("nexus_local_products", JSON.stringify(persistableProducts()));
    localStorage.setItem("smartzone_catalog_version", CATALOG_STORAGE_VERSION);
  } catch (e) {
    console.warn("Catalog localStorage skipped:", e);
  }
}

function rebuildCatalog(userProducts: ProductRow[] = readUserProducts()) {
  MOCK_PRODUCTS.length = 0;
  MOCK_PRODUCTS.push(...userProducts, ...builtinCatalog);
  rebuildLookupIndexes();
}

rebuildLookupIndexes();

export async function ensureTuyaCatalogLoaded() {
  if (tuyaCatalogLoaded) return;
  if (tuyaCatalogLoading) {
    await tuyaCatalogLoading;
    return;
  }
  tuyaCatalogLoading = (async () => {
    const { TUYA_PRODUCTS } = await import("@/lib/tuya-catalog-data");
    const seen = new Set(builtinCatalog.map((p) => p.id));
    for (const product of TUYA_PRODUCTS) {
      if (!seen.has(product.id)) {
        builtinCatalog.push(product);
        seen.add(product.id);
      }
    }
    tuyaCatalogLoaded = true;
    rebuildCatalog();
    persistUserProducts();
  })();
  await tuyaCatalogLoading;
}

let isLoadedFromLocalStorage = false;
export function initializeMockProductsOnClient(force = false) {
  if (!isBrowser) return;
  if (isLoadedFromLocalStorage && !force) return;
  try {
    rebuildCatalog(readUserProducts());
    persistUserProducts();
    isLoadedFromLocalStorage = true;
  } catch (e) {
    console.error("Failed to load local products:", e);
    rebuildCatalog([]);
    isLoadedFromLocalStorage = true;
  }
}

export async function syncServerProducts() {
  initializeMockProductsOnClient();
  try {
    const serverProducts = await Promise.race([
      getServerProductsFn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Server products timeout")), 600);
      }),
    ]);
    if (Array.isArray(serverProducts) && serverProducts.length > 0) {
      for (const sp of serverProducts) {
        if (isDemoOrTestProduct(sp)) continue;
        const idx = MOCK_PRODUCTS.findIndex(
          (p) => p.id === sp.id || (sp.slug && p.slug === sp.slug),
        );
        if (idx >= 0) {
          MOCK_PRODUCTS[idx] = sp;
        } else {
          MOCK_PRODUCTS.unshift(sp);
        }
      }
      rebuildLookupIndexes();
      persistUserProducts();
    }
  } catch (e) {
    console.warn("Could not sync server products:", e);
  }
  return MOCK_PRODUCTS;
}

export function saveLocalProduct(product: ProductRow) {
  initializeMockProductsOnClient();
  const targetId = product.id || `user-${Date.now()}`;
  const normalizedProduct = { ...product, id: targetId };

  const index = MOCK_PRODUCTS.findIndex(
    (p) => p.id === targetId || (product.slug && p.slug === product.slug),
  );
  if (index >= 0) {
    MOCK_PRODUCTS[index] = normalizedProduct;
  } else {
    MOCK_PRODUCTS.unshift(normalizedProduct);
  }
  rebuildLookupIndexes();
  persistUserProducts();

  // Persist to server so other devices receive this product immediately
  saveServerProductFn({ data: normalizedProduct as any }).catch((err) => {
    console.warn("Server save error:", err);
  });

  return normalizedProduct;
}

export function deleteLocalProduct(id: string) {
  initializeMockProductsOnClient();
  const index = MOCK_PRODUCTS.findIndex((p) => p.id === id || p.slug === id);
  if (index >= 0) {
    MOCK_PRODUCTS.splice(index, 1);
    rebuildLookupIndexes();
    persistUserProducts();
  }

  // Delete from server so other devices reflect deletion
  deleteServerProductFn({ data: { id } }).catch((err) => {
    console.warn("Server delete error:", err);
  });
}

export function getMockProductBySlug(slug: string) {
  initializeMockProductsOnClient();
  if (!slug || !MOCK_PRODUCTS.length) return null;

  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug).toLowerCase().trim();
  } catch {
    decoded = slug.toLowerCase().trim();
  }

  const cleanSlug = decoded.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    productBySlug.get(decoded) ||
    productById.get(decoded) ||
    productBySlug.get(cleanSlug) ||
    productById.get(slug) ||
    productBySlug.get(slug.toLowerCase()) ||
    null
  );
}

export const MOCK_PRODUCT_COUNT = MOCK_PRODUCTS.length;
