/**
 * NexusIoT product taxonomy — top-level departments and subcategories.
 * Products may use either a top-level or leaf category string in `products.category`.
 */

export type CategoryNode = {
  name: string;
  children?: string[];
};

export const CATEGORY_CATALOG: CategoryNode[] = [
  {
    name: "3D Printers",
    children: ["3D Printer", "Filaments", "Parts & Accessories", "3D Printing Services"],
  },
  {
    name: "Components",
    children: [
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
    ],
  },
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
    children: ["PCB Design", "PCB Fabrication", "PCB Assembly"],
  },
  {
    name: "Industrial Automation",
    children: [
      "Programmable Logic Controller (PLC)",
      "Human Machine Interface (HMI)",
      "PLC Expansion Module",
      "HVAC System",
      "Electrical Parts",
    ],
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
    name: "Phoenix Contact",
    children: ["Redundancy Module", "Surge Protection Filters", "Relay Module"],
  },
  {
    name: "Power Modules",
    children: ["Inverters", "DC Power Supplies", "Buck / Boost Converters"],
  },
  {
    name: "Robotics",
    children: ["Motors", "Parts & Accessories", "Quadcopter Kits", "Robotic Kits"],
  },
  {
    name: "Sensors",
    children: [
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
    ],
  },
  {
    name: "Smart Home",
    children: [
      "Thermostat",
      "Artificial Assistant",
      "Smart Switch",
      "Smart Cameras",
      "Smart Lighting",
      "Gateways",
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
  {
    name: "Tools",
    children: [
      "Function Generators",
      "Multimeters",
      "Oscilloscopes",
      "Power Supplies",
      "PCB Drill Machines",
      "Soldering Stations",
      "Microscope",
      "Debugger / Programmer",
      "Other Tools",
    ],
  },
  {
    name: "Custom Boards",
    children: [],
  },
  {
    name: "Consumer Electronics",
    children: [],
  },
  {
    name: "Printers",
    children: [],
  },
  {
    name: "Personal Safety",
    children: [],
  },
  {
    name: "Motherboard",
    children: [],
  },
];

/** Legacy DB category values → parent department for filtering */
export const LEGACY_CATEGORY_PARENT: Record<string, string> = {
  "Tuya Sensors": "Sensors",
  Gateways: "Smart Home",
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

export function getParentCategory(label: string): string {
  return parentByLabel.get(label) ?? label;
}

export function isTopLevelCategory(label: string): boolean {
  return TOP_LEVEL_CATEGORIES.includes(label);
}

/** All DB `category` values that match a shop filter (parent or leaf). */
export function getCategoryFilterValues(filter: string): string[] {
  const node = CATEGORY_CATALOG.find((c) => c.name === filter);
  if (node) {
    const values = new Set<string>([filter, ...(node.children ?? [])]);
    for (const [legacy, parent] of Object.entries(LEGACY_CATEGORY_PARENT)) {
      if (parent === filter) values.add(legacy);
    }
    return [...values];
  }
  return [filter];
}

export function productMatchesCategory(productCategory: string, filter?: string): boolean {
  if (!filter) return true;
  if (productCategory === filter) return true;
  if (getParentCategory(productCategory) === filter) return true;
  if (LEGACY_CATEGORY_PARENT[productCategory] === filter) return true;
  return false;
}

export function findCatalogNode(name: string): CategoryNode | undefined {
  return (
    CATEGORY_CATALOG.find((c) => c.name === name) ??
    CATEGORY_CATALOG.find((c) => c.children?.includes(name))
  );
}
