/** Keyword landing page configs for Google-intent URLs on smartzone.pk */

export type SeoKeywordLanding = {
  path: `/${string}`;
  title: string;
  description: string;
  keywords: string;
  h1: string;
  intro: string;
  productSearch?: { category: string };
  productCta: string;
  secondaryTo?: `/${string}`;
  secondaryLabel?: string;
  sections: { id: string; title: string; body: string }[];
  faq: { q: string; a: string }[];
  related: { label: string; to: `/${string}` }[];
};

export const SEO_KEYWORD_LANDINGS: SeoKeywordLanding[] = [
  {
    path: "/zigbee-sensors",
    title: "Zigbee Sensors Pakistan | Buy Zigbee IoT Sensors | SmartZone",
    description:
      "Buy Zigbee sensors in Pakistan at smartzone.pk — door, motion, temperature, leak & gas Zigbee sensors with Tuya gateway. COD nationwide from SmartZone.",
    keywords:
      "zigbee sensors, zigbee sensor Pakistan, zigbee iot, tuya zigbee, smartzone, iot sensor",
    h1: "Zigbee sensors in Pakistan",
    intro:
      "Shop Zigbee sensors for smart home and industrial automations — low-power mesh devices that pair with a Zigbee gateway (Tuya / Smart Life). SmartZone stocks PKR-priced Zigbee door, motion, climate, and leak sensors with COD on eligible orders.",
    productSearch: { category: "Tuya Smart Sensors" },
    productCta: "Shop Zigbee / Tuya sensors",
    secondaryTo: "/iot-sensors",
    secondaryLabel: "All IoT sensors",
    sections: [
      {
        id: "why-zigbee",
        title: "Why choose Zigbee sensors?",
        body: "Zigbee sensors use a mesh network: more devices improve coverage, battery life is long, and traffic stays off your WiFi. Ideal for villas, apartments, and multi-floor sites in Islamabad and across Pakistan.",
      },
      {
        id: "gateway",
        title: "Zigbee gateway required",
        body: "Most Zigbee sensors need a Tuya Zigbee hub or compatible gateway. SmartZone sells sensors and gateways together so automations work out of the box with the Smart Life app.",
      },
      {
        id: "use-cases",
        title: "Common Zigbee sensor use cases",
        body: "Door/window contacts for security scenes, PIR motion for lights, temperature/humidity for AC automations, water leak for pump alerts, and gas/smoke for safety notifications.",
      },
    ],
    faq: [
      {
        q: "Where can I buy Zigbee sensors in Pakistan?",
        a: "SmartZone on smartzone.pk sells Zigbee sensors with PKR pricing and COD on eligible orders, plus optional install from Islamabad.",
      },
      {
        q: "Do Zigbee sensors need WiFi?",
        a: "Sensors talk Zigbee to a hub; the hub connects to WiFi/internet for app control and cloud automations.",
      },
    ],
    related: [
      { label: "WiFi sensors", to: "/wifi-sensors" },
      { label: "MQTT sensors", to: "/mqtt-sensors" },
      { label: "Tuya sensors Pakistan", to: "/tuya-sensors" },
      { label: "Smart home & automations", to: "/smart-home" },
    ],
  },
  {
    path: "/wifi-sensors",
    title: "WiFi Sensors Pakistan | WiFi IoT Sensors | SmartZone",
    description:
      "Buy WiFi sensors in Pakistan — Tuya WiFi motion, door, climate and leak sensors that connect without a Zigbee hub. Shop smartzone.pk with COD.",
    keywords: "wifi sensors, wi-fi sensors Pakistan, tuya wifi sensor, iot sensor, smartzone",
    h1: "WiFi sensors in Pakistan",
    intro:
      "WiFi sensors connect directly to your router and the Smart Life / Tuya cloud — no separate Zigbee hub. Perfect when you want fast install for a few rooms or a shop floor.",
    productSearch: { category: "Tuya Smart Sensors" },
    productCta: "Shop WiFi / Tuya sensors",
    secondaryTo: "/zigbee-sensors",
    secondaryLabel: "Prefer Zigbee mesh?",
    sections: [
      {
        id: "when-wifi",
        title: "When WiFi sensors make sense",
        body: "Small homes, offices, and pop-up installs where you only need a handful of sensors and already have stable WiFi coverage.",
      },
      {
        id: "vs-zigbee",
        title: "WiFi vs Zigbee sensors",
        body: "WiFi = simpler start, uses router bandwidth. Zigbee = better for large mesh, longer battery, less WiFi congestion. SmartZone stocks both.",
      },
    ],
    faq: [
      {
        q: "Are WiFi sensors available in Pakistan?",
        a: "Yes. Browse Tuya Smart Sensors on smartzone.pk for WiFi motion, contact, climate, and leak devices priced in PKR.",
      },
    ],
    related: [
      { label: "Zigbee sensors", to: "/zigbee-sensors" },
      { label: "IoT sensors hub", to: "/iot-sensors" },
      { label: "Automations", to: "/automations" },
    ],
  },
  {
    path: "/mqtt-sensors",
    title: "MQTT Sensors Pakistan | MQTT IoT Devices | SmartZone",
    description:
      "MQTT sensors and MQTT-ready IoT devices in Pakistan — edge nodes, gateways and industrial telemetry for local dashboards. SmartZone smartzone.pk.",
    keywords:
      "MQTT sensors, mqtt iot Pakistan, mqtt gateway, iot devices Pakistan, smartzone",
    h1: "MQTT sensors & MQTT-ready IoT in Pakistan",
    intro:
      "Need MQTT sensors or MQTT-friendly nodes for on-prem dashboards, Jetson edge, Node-RED, or industrial SCADA? SmartZone supplies catalog hardware and custom wiring for local brokers — not only cloud apps.",
    productSearch: { category: "IoT Solutions" },
    productCta: "Browse IoT / MQTT hardware",
    secondaryTo: "/iot-solutions",
    secondaryLabel: "Request MQTT site survey",
    sections: [
      {
        id: "edge",
        title: "Edge & industrial MQTT",
        body: "Publish sensor telemetry to your own broker for low-latency alarms, plant floors, and AI camera pipelines without round-tripping every event to a public cloud.",
      },
      {
        id: "hybrid",
        title: "Hybrid Tuya + MQTT",
        body: "Many sites mix Tuya WiFi/Zigbee for rooms with MQTT gateways for critical lines. SmartZone designs both layers under one project desk.",
      },
    ],
    faq: [
      {
        q: "Do you sell MQTT sensors in Pakistan?",
        a: "Yes. Check IoT Solutions on smartzone.pk or book an IoT survey for MQTT-ready nodes, gateways, and integration support.",
      },
    ],
    related: [
      { label: "IoT devices Pakistan", to: "/iot-devices" },
      { label: "Zigbee sensors", to: "/zigbee-sensors" },
      { label: "IoT sensors", to: "/iot-sensors" },
    ],
  },
  {
    path: "/tuya-sensors",
    title: "Tuya Sensor Pakistan | Tuya Smart Sensors | SmartZone",
    description:
      "Buy Tuya sensor Pakistan stock at smartzone.pk — Tuya Zigbee & WiFi sensors, Smart Life compatible, PKR pricing and COD from SmartZone Islamabad.",
    keywords:
      "tuya sensor Pakistan, tuya sensors, tuya smart life, tuya zigbee, smartzone pk",
    h1: "Tuya sensors in Pakistan",
    intro:
      "Official-style Tuya / Smart Life sensors priced for Pakistan — temperature, humidity, PIR, door/window, gas, smoke, and leak. Pair with Tuya gateways and scenes for full smart home automations.",
    productSearch: { category: "Tuya Smart Sensors" },
    productCta: "Shop Tuya Smart Sensors",
    secondaryTo: "/smart-home",
    secondaryLabel: "Smart home kits",
    sections: [
      {
        id: "smart-life",
        title: "Works with Tuya Smart Life",
        body: "Configure sensors in the Smart Life app, build automations, and share access with family or facility staff — same stack used worldwide, localized by SmartZone.",
      },
      {
        id: "cod",
        title: "PKR pricing & COD",
        body: "No grey import guessing: catalog SKUs on smartzone.pk with nationwide delivery options and COD where available.",
      },
    ],
    faq: [
      {
        q: "Where to buy a Tuya sensor in Pakistan?",
        a: "Shop the Tuya Smart Sensors category on smartzone.pk (SmartZone) or visit our Islamabad desk for bundle advice.",
      },
    ],
    related: [
      { label: "Zigbee sensors", to: "/zigbee-sensors" },
      { label: "WiFi sensors", to: "/wifi-sensors" },
      { label: "Automations", to: "/automations" },
    ],
  },
  {
    path: "/iot-devices",
    title: "IoT Devices Pakistan | Sensors, Gateways & Kits | SmartZone",
    description:
      "IoT devices Pakistan — sensors, gateways, smart switches, relays and automation kits. Buy at smartzone.pk or deploy with SmartZone install teams.",
    keywords:
      "iot devices Pakistan, iot device, iot sensor, iot gateway Pakistan, smartzone",
    h1: "IoT devices in Pakistan",
    intro:
      "From single IoT sensors to full gateways and control panels — SmartZone is a one-stop store for IoT devices in Pakistan with catalog shipping and professional commissioning.",
    productSearch: { category: "IoT Solutions" },
    productCta: "Shop IoT devices",
    secondaryTo: "/iot-sensors",
    secondaryLabel: "IoT sensors guide",
    sections: [
      {
        id: "catalog",
        title: "Catalog + project hardware",
        body: "Buy off-the-shelf Tuya and IoT SKUs online, or request engineered boards, relays, and MQTT gateways for commercial sites.",
      },
      {
        id: "nationwide",
        title: "Nationwide reach",
        body: "Islamabad / Rawalpindi install desk plus shipping across Pakistan for approved orders.",
      },
    ],
    faq: [
      {
        q: "Who sells IoT devices in Pakistan?",
        a: "SmartZone (smartzone.pk) sells IoT devices, sensors, and automation hardware with optional site survey and install.",
      },
    ],
    related: [
      { label: "MQTT sensors", to: "/mqtt-sensors" },
      { label: "Tuya sensors", to: "/tuya-sensors" },
      { label: "IoT solutions install", to: "/iot-solutions" },
    ],
  },
  {
    path: "/automations",
    title: "Home Automations Pakistan | Smart Home Scenes | SmartZone",
    description:
      "Automations for smart home in Pakistan — Tuya scenes, Zigbee/WiFi sensor triggers, lighting, AC and security. Shop kits or book SmartZone install.",
    keywords:
      "automations, home automation Pakistan, smart home automations, tuya scenes, smartzone",
    h1: "Smart home automations in Pakistan",
    intro:
      "Automations turn sensors into action: lights on motion, AC on climate, alerts on door open, curtains on schedule. Build with Tuya Smart Life or ask SmartZone to commission whole-home scenes.",
    productSearch: { category: "Smart Home Automation" },
    productCta: "Shop automation kits",
    secondaryTo: "/smart-home",
    secondaryLabel: "Smart home overview",
    sections: [
      {
        id: "scenes",
        title: "Sensor-driven scenes",
        body: "Combine Zigbee or WiFi sensors with switches, sockets, and panels so rooms react without opening an app every time.",
      },
      {
        id: "commercial",
        title: "Home and light commercial",
        body: "Apartments, villas, shops, and small offices — same automation patterns, sized to your wiring and UPS reality.",
      },
    ],
    faq: [
      {
        q: "Can SmartZone set up automations for me?",
        a: "Yes. Buy devices on smartzone.pk or book an IoT / smart home survey for programmed scenes and handover training.",
      },
    ],
    related: [
      { label: "Smart home", to: "/smart-home" },
      { label: "Zigbee sensors", to: "/zigbee-sensors" },
      { label: "Tuya sensors", to: "/tuya-sensors" },
    ],
  },
];

export function seoLandingByPath(path: string): SeoKeywordLanding | undefined {
  return SEO_KEYWORD_LANDINGS.find((p) => p.path === path);
}

/** Static paths for sitemap / footer */
export const SEO_KEYWORD_PATHS = SEO_KEYWORD_LANDINGS.map((p) => p.path);
