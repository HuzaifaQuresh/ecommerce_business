/**
 * SmartZone product taxonomy — top-level departments and subcategories.
 * Products may use either a top-level or leaf category string in `products.category`.
 */

export type CategoryNode = {
  name: string;
  children?: string[];
};

export const CATEGORY_CATALOG: CategoryNode[] = [
  {
    name: "Development Boards",
    children: [
      "Artificial Intelligence Boards",
      "Raspberry Pi",
      "Rock 5B+",
      "ESP32 / MCU Boards",
      "Arduino Compatible",
    ],
  },
  {
    name: "Engineering Services",
    children: [
      "Industrial Automation",
      "Programmable Logic Controller (PLC)",
      "Human Machine Interface (HMI)",
      "PLC Expansion Module",
      "HVAC System",
      "Electrical Parts",
      "PCB Design",
      "PCB Fabrication",
      "PCB Assembly",
    ],
  },
  {
    name: "Accessories",
    children: [
      "Components",
      "Sensors",
      "Antenna",
      "Battery",
      "Camera",
      "Capacitors",
      "Connectors",
      "Converters",
      "Diodes",
      "Flow Control Valve",
      "Heat Sink",
      "Inductors",
      "Integrated Circuit",
      "LCDs",
      "Light Emitting Diode (LED)",
      "Magnets",
      "Accelerometer / Gyroscope Sensors",
      "Biometric Sensors",
      "Current Sensors",
      "Environmental Sensors",
      "Temperature Sensors",
      "Level Sensors",
      "Flow Sensors",
      "Pressure Sensors",
      "Other Sensors",
      "Tuya Sensors",
      "Cables & Wires",
      "Enclosures & Cases",
      "Power Adapters",
      "Connectors & Terminals",
      "Mounting Hardware",
    ],
  },
  {
    name: "Camera Solutions",
    children: [
      "Smart Security Cameras",
      "Smart Video Doorbells",
      "AI Surveillance",
      "AI Cameras",
      "License Plate Recognition",
      "Face Recognition",
      "Intrusion Detection",
      "Loitering Detection",
      "Fire & Smoke Detection",
      "AI Video Analytics",
    ],
  },
  {
    name: "IoT Solutions",
    children: [
      "Smart Home Automation",
      "Smart Door Locks",
      "Smart Control Panels",
      "Smart Switches",
      "Smart Sockets & Plugs",
      "Smart Curtain Systems",
      "Smart Thermostats",
      "Smart Circuit Breakers",
      "Gateways",
      "Tuya Smart Sensors",
      "IoT Security Solutions",
      "Smart Parking",
      "IoT Sensors",
      "ANPR Gate Control",
      "Industrial Telemetry",
      "Cloud Monitoring Gateways",
    ],
  },
  {
    name: "Robotics",
    children: ["Motors", "Parts & Accessories", "Quadcopter Kits", "Robotic Kits"],
  },
  {
    name: "PCB Assembly Line",
    children: [
      "PLC Assembly Line",
      "HMI Assembly Line",
      "PLC Expansion Module",
      "HVAC System",
      "Electrical Parts",
    ],
  },
  {
    name: "Smart Boards",
    children: [
      "Arduino",
      "Raspberry Pi Boards",
      "Communication Modules",
      "FPGA",
      "Single Board Computer",
      "Power Module",
      "Prototype Board",
      "Switching Module",
      "Sensor Modules",
      "Trainer Boards",
    ],
  },
];

/** Shopper-facing labels that map onto a real `products.category` value. */
export const CATEGORY_ALIASES: Record<string, string> = {
  "Timer Switches": "Smart Switches",
  "Curtain/Gate Motors": "Smart Curtain Systems",
  "Smart Control Panel": "Smart Control Panels",
  "Wireless CCTV": "Smart Security Cameras",
  "Security Cameras": "Smart Security Cameras",
  "Voltage Protectors": "Electrical Parts",
  "Smart Wall Switches": "Smart Switches",
  "Lights & Sensors": "Tuya Sensors",
};

/** Legacy DB category values → parent department for filtering */
export const LEGACY_CATEGORY_PARENT: Record<string, string> = {
  "3D Printer": "Accessories",
  Filaments: "Accessories",
  "3D Printing Services": "Accessories",
  "Tuya Sensors": "IoT Solutions",
  "Tuya Smart Sensors": "IoT Solutions",
  "Smart Door Locks": "IoT Solutions",
  "Smart Door Lock": "IoT Solutions",
  "Smart Control Panels": "IoT Solutions",
  "Smart Control Panel": "IoT Solutions",
  "Smart Switches": "IoT Solutions",
  "Smart Switch": "IoT Solutions",
  "Timer Switches": "IoT Solutions",
  "Curtain/Gate Motors": "IoT Solutions",
  "Smart Sockets & Plugs": "IoT Solutions",
  "Smart Socket": "IoT Solutions",
  "Smart Plugs": "IoT Solutions",
  "Smart Curtain Systems": "IoT Solutions",
  "Smart Curtain System": "IoT Solutions",
  "Smart Thermostats": "IoT Solutions",
  "Smart Thermostat": "IoT Solutions",
  "Smart Circuit Breakers": "IoT Solutions",
  "Circuit Breaker": "IoT Solutions",
  "Smart Security Cameras": "Camera Solutions",
  "Security Cameras": "Camera Solutions",
  "Wireless CCTV": "Camera Solutions",
  "Smart Cameras": "Camera Solutions",
  "Smart Video Doorbells": "Camera Solutions",
  "Smart Video Doorbell": "Camera Solutions",
  Gateways: "IoT Solutions",
  Components: "Accessories",
  Sensors: "Accessories",
  "Industrial Automation": "Engineering Services",
  "Programmable Logic Controller (PLC)": "Engineering Services",
  "Human Machine Interface (HMI)": "Engineering Services",
  "PLC Expansion Module": "Engineering Services",
  "HVAC System": "Engineering Services",
  "Electrical Parts": "Engineering Services",
  Antenna: "Accessories",
  Battery: "Accessories",
  Camera: "Accessories",
  Capacitors: "Accessories",
  Connectors: "Accessories",
  Converters: "Accessories",
  Diodes: "Accessories",
  "Flow Control Valve": "Accessories",
  "Heat Sink": "Accessories",
  Inductors: "Accessories",
  "Integrated Circuit": "Accessories",
  LCDs: "Accessories",
  "Light Emitting Diode (LED)": "Accessories",
  Magnets: "Accessories",
  "Accelerometer / Gyroscope Sensors": "Accessories",
  "Biometric Sensors": "Accessories",
  "Current Sensors": "Accessories",
  "Environmental Sensors": "Accessories",
  "Temperature Sensors": "Accessories",
  "Level Sensors": "Accessories",
  "Flow Sensors": "Accessories",
  "Pressure Sensors": "Accessories",
  "Other Sensors": "Accessories",
};

/** Top-level names (header chips, home grid) */
export const TOP_LEVEL_CATEGORIES = CATEGORY_CATALOG.map((c) => c.name);

/** Flat list: every top-level + subcategory (admin selects, search) */
export const ALL_CATEGORY_LABELS: string[] = CATEGORY_CATALOG.flatMap((c) =>
  c.children?.length ? [c.name, ...c.children] : [c.name],
);

const parentByLabel = new Map<string, string>();

for (const node of CATEGORY_CATALOG) {
  parentByLabel.set(node.name, node.name);
  for (const child of node.children ?? []) {
    parentByLabel.set(child, node.name);
  }
}

for (const [legacy, parent] of Object.entries(LEGACY_CATEGORY_PARENT)) {
  parentByLabel.set(legacy, parent);
}

for (const [alias, resolved] of Object.entries(CATEGORY_ALIASES)) {
  parentByLabel.set(alias, parentByLabel.get(resolved) ?? resolved);
}

export function getParentCategory(label: string): string {
  return parentByLabel.get(label) ?? label;
}

export function isTopLevelCategory(label: string): boolean {
  return TOP_LEVEL_CATEGORIES.includes(label);
}

export function resolveCategoryFilter(filter: string): string {
  return CATEGORY_ALIASES[filter] ?? filter;
}

/** All DB `category` values that match a shop filter (parent or leaf). */
export function getCategoryFilterValues(filter: string): string[] {
  const resolved = resolveCategoryFilter(filter);
  const node = CATEGORY_CATALOG.find((c) => c.name === resolved);
  if (node) {
    const values = new Set<string>([resolved, filter, ...(node.children ?? [])]);
    for (const [legacy, parent] of Object.entries(LEGACY_CATEGORY_PARENT)) {
      if (parent === resolved || parent === filter) values.add(legacy);
    }
    return [...values];
  }
  const values = new Set<string>([resolved]);
  if (resolved !== filter) values.add(filter);
  return [...values];
}

export function productMatchesCategory(productCat: string, filter: string): boolean {
  if (!productCat) return false;
  if (productCat === filter) return true;
  const filterValues = getCategoryFilterValues(filter);
  return filterValues.includes(productCat);
}
