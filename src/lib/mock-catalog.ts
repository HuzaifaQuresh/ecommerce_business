import type { ProductRow } from "@/types/commerce";
import {
  getServerProductsFn,
  saveServerProductFn,
  deleteServerProductFn,
} from "@/api/server-products";

/** Small demo catalog when Supabase is empty — not a full fill, just enough to browse. */
const IMG = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600";
const IMG2 = "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600";
const IMG3 = "https://images.unsplash.com/photo-1558002038-1055907df827?w=600";

const STATIC_MOCK_PRODUCTS: ProductRow[] = [
  {
    id: "mock-1",
    title: "Tuya Zigbee Motion Sensor PIR",
    slug: "tuya-zigbee-pir",
    description: "Battery PIR motion sensor with Zigbee 3.0 mesh.",
    category: "Temperature Sensors",
    price_pkr: 1850,
    stock: 120,
    image_url: IMG2,
    manufacturer: "Tuya",
    color: "White",
    availability: "in_stock",
    discount_pct: 25,
    tags: ["sensor", "zigbee"],
    rating: 4.5,
    gallery_urls: [
      "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=600",
      "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600",
    ],
    specs: {
      protocol: "Zigbee 3.0",
      power: "3V (2× AAA)",
      ecosystem: "Tuya Smart / Smart Life",
      "Working Temperature": "-10°C to 55°C",
      "Detection Range": "Up to 8 meters",
    },
  },
  {
    id: "mock-2",
    title: "Tuya Smart Wi-Fi Dome Camera 4MP",
    slug: "tuya-wifi-dome-4mp",
    description: "Indoor dome camera with night vision and app alerts.",
    category: "Smart Cameras",
    price_pkr: 8500,
    stock: 42,
    image_url: IMG3,
    manufacturer: "Tuya",
    color: "White",
    availability: "in_stock",
    discount_pct: 15,
    tags: ["camera", "wifi"],
    rating: 4.6,
    gallery_urls: [
      "https://images.unsplash.com/photo-1558002038-1055907df827?w=600",
      "https://images.unsplash.com/photo-1551808525-51a94da548ce?w=600",
    ],
    specs: {
      protocol: "Wi-Fi 2.4GHz",
      power: "12V DC / 1A Adapter",
      ecosystem: "Tuya Smart / Smart Life",
      Resolution: "2560 x 1440 (4MP)",
      "Night Vision": "IR Cut Up to 15m",
    },
  },
  {
    id: "mock-3",
    title: "Raspberry Pi 5 — 8GB",
    slug: "raspberry-pi-5-8gb",
    description: "Quad-core ARM Cortex-A76, 8GB RAM.",
    category: "Raspberry Pi",
    price_pkr: 32000,
    stock: 18,
    image_url: IMG,
    manufacturer: "Raspberry Pi",
    color: "Green",
    availability: "in_stock",
    discount_pct: 0,
    tags: ["sbc"],
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
    title: "ESP32-WROOM-32 DevKit",
    slug: "esp32-wroom-devkit",
    description: "Wi-Fi + BLE MCU for IoT prototyping.",
    category: "ESP32 / MCU Boards",
    price_pkr: 1450,
    stock: 200,
    image_url: IMG,
    manufacturer: "Espressif",
    color: "Black",
    availability: "in_stock",
    discount_pct: 20,
    tags: ["esp32"],
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
    title: "8-Channel Relay Module",
    slug: "relay-8ch-opto",
    description: "10A relay board with optocoupler isolation.",
    category: "Connectors",
    price_pkr: 1450,
    stock: 85,
    image_url: IMG,
    manufacturer: "Generic",
    color: "Blue",
    availability: "in_stock",
    discount_pct: 0,
    tags: ["relay"],
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
    title: "Siemens S7-1200 CPU 1214C",
    slug: "siemens-s7-1200",
    description: "Compact PLC for industrial automation.",
    category: "Programmable Logic Controller (PLC)",
    price_pkr: 145000,
    stock: 5,
    image_url: IMG,
    manufacturer: "Siemens",
    color: "Gray",
    availability: "in_stock",
    discount_pct: 0,
    tags: ["plc"],
    rating: 4.9,
    gallery_urls: [],
    specs: {},
    vendor_id: "demo-vendor",
  },
  {
    id: "mock-7",
    title: "Tuya Zigbee Gateway Hub Pro",
    slug: "tuya-zigbee-gateway-pro",
    description: "Zigbee 3.0 hub for up to 128 devices.",
    category: "Gateways",
    price_pkr: 7900,
    stock: 32,
    image_url: IMG3,
    manufacturer: "Tuya",
    color: "Black",
    availability: "in_stock",
    discount_pct: 12,
    tags: ["gateway"],
    rating: 4.7,
    gallery_urls: [],
    specs: {},
  },
  {
    id: "mock-8",
    title: "Creality Ender 3 V3 SE",
    slug: "creality-ender-3-v3",
    description: "Entry-level FDM 3D printer.",
    category: "3D Printer",
    price_pkr: 89000,
    stock: 8,
    image_url: IMG2,
    manufacturer: "Creality",
    color: "Black",
    availability: "in_stock",
    discount_pct: 8,
    tags: ["3d"],
    rating: 4.4,
    gallery_urls: [],
    specs: {},
  },
  {
    id: "mock-9",
    title: "UNI-T Digital Multimeter",
    slug: "uni-t-multimeter",
    description: "True RMS bench-friendly DMM.",
    category: "Multimeters",
    price_pkr: 12500,
    stock: 24,
    image_url: IMG,
    manufacturer: "UNI-T",
    color: "Yellow",
    availability: "in_stock",
    discount_pct: 5,
    tags: ["tool"],
    rating: 4.6,
    gallery_urls: [],
    specs: {},
  },
  {
    id: "mock-10",
    title: "NEMA 17 Stepper Motor",
    slug: "nema-17-stepper",
    description: "1.8° stepper for CNC and robotics.",
    category: "Motors",
    price_pkr: 3200,
    stock: 60,
    image_url: IMG2,
    manufacturer: "Generic",
    color: "Black",
    availability: "in_stock",
    discount_pct: 10,
    tags: ["motor"],
    rating: 4.3,
    gallery_urls: [],
    specs: {},
    vendor_id: "demo-vendor",
  },
  {
    id: "mock-11",
    title: "Mean Well 24V 10A PSU",
    slug: "meanwell-24v-10a",
    description: "Industrial DIN-rail power supply.",
    category: "DC Power Supplies",
    price_pkr: 9800,
    stock: 40,
    image_url: IMG,
    manufacturer: "MeanWell",
    color: "Silver",
    availability: "in_stock",
    discount_pct: 0,
    tags: ["psu"],
    rating: 4.7,
    gallery_urls: [],
    specs: {},
  },
  {
    id: "mock-12",
    title: "4-Gang Smart Wi-Fi Switch",
    slug: "wifi-switch-4gang",
    description: "Glass touch wall switch, neutral required.",
    category: "Smart Switch",
    price_pkr: 5400,
    stock: 55,
    image_url: IMG3,
    manufacturer: "Tuya",
    color: "Black",
    availability: "in_stock",
    discount_pct: 10,
    tags: ["switch"],
    rating: 4.5,
    gallery_urls: [],
    specs: {},
  },
];

export const MOCK_PRODUCTS: ProductRow[] = [...STATIC_MOCK_PRODUCTS];

const isBrowser = typeof window !== "undefined";

let isLoadedFromLocalStorage = false;
export function initializeMockProductsOnClient(force = false) {
  if (!isBrowser) return;
  if (isLoadedFromLocalStorage && !force) return;
  try {
    const val = localStorage.getItem("nexus_local_products");
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) {
        MOCK_PRODUCTS.length = 0;
        MOCK_PRODUCTS.push(...parsed);
      }
    } else {
      // Initialize with default static products in local storage
      localStorage.setItem("nexus_local_products", JSON.stringify(STATIC_MOCK_PRODUCTS));
    }
    isLoadedFromLocalStorage = true;
  } catch (e) {
    console.error("Failed to load local products:", e);
  }
}

export async function syncServerProducts() {
  initializeMockProductsOnClient();
  try {
    const serverProducts = await getServerProductsFn();
    if (Array.isArray(serverProducts) && serverProducts.length > 0) {
      for (const sp of serverProducts) {
        const idx = MOCK_PRODUCTS.findIndex(
          (p) => p.id === sp.id || (sp.slug && p.slug === sp.slug),
        );
        if (idx >= 0) {
          MOCK_PRODUCTS[idx] = sp;
        } else {
          MOCK_PRODUCTS.unshift(sp);
        }
      }
      if (isBrowser) {
        try {
          localStorage.setItem("nexus_local_products", JSON.stringify(MOCK_PRODUCTS));
        } catch {
          // ignore
        }
      }
    }
  } catch (e) {
    console.warn("Could not sync server products:", e);
  }
  return MOCK_PRODUCTS;
}

export function saveLocalProduct(product: ProductRow) {
  initializeMockProductsOnClient();
  const targetId = product.id || `mock-${Date.now()}`;
  const normalizedProduct = { ...product, id: targetId };

  const index = MOCK_PRODUCTS.findIndex(
    (p) => p.id === targetId || (product.slug && p.slug === product.slug),
  );
  if (index >= 0) {
    MOCK_PRODUCTS[index] = normalizedProduct;
  } else {
    MOCK_PRODUCTS.unshift(normalizedProduct);
  }
  if (isBrowser) {
    try {
      localStorage.setItem("nexus_local_products", JSON.stringify(MOCK_PRODUCTS));
    } catch (e) {
      console.error("Failed to save local product:", e);
    }
  }

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
    if (isBrowser) {
      try {
        localStorage.setItem("nexus_local_products", JSON.stringify(MOCK_PRODUCTS));
      } catch (e) {
        console.error("Failed to delete local product:", e);
      }
    }
  }

  // Delete from server so other devices reflect deletion
  deleteServerProductFn({ data: { id } }).catch((err) => {
    console.warn("Server delete error:", err);
  });
}

export function getMockProductBySlug(slug: string) {
  initializeMockProductsOnClient();
  if (!MOCK_PRODUCTS.length) return null;
  if (!slug) return MOCK_PRODUCTS[0];

  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug).toLowerCase().trim();
  } catch {
    decoded = slug.toLowerCase().trim();
  }

  const cleanSlug = decoded.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  let match = MOCK_PRODUCTS.find((p) => {
    const pSlug = (p.slug || "").toLowerCase();
    const pId = (p.id || "").toLowerCase();
    return (
      pSlug === decoded ||
      pId === decoded ||
      pSlug === cleanSlug ||
      p.slug === slug ||
      p.id === slug
    );
  });

  if (!match) {
    match = MOCK_PRODUCTS.find((p) => {
      const pSlug = (p.slug || "").toLowerCase();
      const pTitle = (p.title || "").toLowerCase();
      const pId = (p.id || "").toLowerCase();
      return (
        (pSlug && (pSlug.includes(decoded) || decoded.includes(pSlug))) ||
        (pTitle && (pTitle.includes(decoded) || decoded.includes(pTitle))) ||
        (pId && (pId.includes(decoded) || decoded.includes(pId)))
      );
    });
  }

  return match ?? MOCK_PRODUCTS[0];
}

export const MOCK_PRODUCT_COUNT = MOCK_PRODUCTS.length;
