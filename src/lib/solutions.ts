import type { LucideIcon } from "lucide-react";
import {
  Droplets,
  Factory,
  Flame,
  Headset,
  Home,
  Lock,
  Radio,
  ShieldCheck,
  Thermometer,
  Truck,
  Video,
  Zap,
} from "lucide-react";

export type SolutionPackage = {
  icon: LucideIcon;
  title: string;
  desc: string;
  tags: string[];
};

export type SensorCatalogItem = {
  icon: LucideIcon;
  name: string;
  tech: string;
  use: string;
  color: string;
  shopCategory?: string;
};

export const SOLUTIONS: SolutionPackage[] = [
  {
    icon: Home,
    title: "Whole-Home Smart Automation",
    desc: "Unify lighting, climate, entertainment, and motorized shades into a single voice & smartphone interface.",
    tags: ["Zigbee 3.0", "Tuya Cloud", "Apple HomeKit & Google Home"],
  },
  {
    icon: ShieldCheck,
    title: "Active Security & Surveillance",
    desc: "AI-powered cameras with real-time human detection, smart locks, and immediate local siren/SMS alerts.",
    tags: ["2K CCTV", "Smart Deadbolts", "Intrusion Detection"],
  },
  {
    icon: Flame,
    title: "Fire, Gas & Safety Interlock",
    desc: "Smoke and LPG/NG detection tied to solenoid cutoff, local siren, and owner SMS — sized for villas, kitchens, and plant rooms.",
    tags: ["Solenoid Valves", "LPG/NG Sensors", "SMS Alerts"],
  },
  {
    icon: Video,
    title: "ANPR Gate & Barrier Control",
    desc: "Plate capture, confidence thresholds, and guard override for societies, factories, and campus gates — with an audit trail.",
    tags: ["ANPR", "Barrier", "Guard console"],
  },
  {
    icon: Radio,
    title: "Remote Telecom Tower Surveillance",
    desc: "4G/LoRa-backed PTZ + intrusion + power monitoring across unmanned tower sites.",
    tags: ["PTZ", "LoRaWAN", "Power Sensors"],
  },
  {
    icon: Factory,
    title: "Industrial SCADA & PLC Integration",
    desc: "Siemens / Weintek stacks integrated with custom dashboards and edge gateways.",
    tags: ["PLC", "SCADA", "Modbus"],
  },
  {
    icon: Truck,
    title: "Fleet & Cold-Chain Telemetry",
    desc: "GPS + temperature loggers with geofencing and tamper alerts.",
    tags: ["GPS", "Telemetry"],
  },
];

export const ADDON_SUITES: (SolutionPackage & { image: string })[] = [
  {
    icon: Truck,
    title: "Fleet & Cold-Chain Telemetry",
    desc: "GPS + temperature loggers with geofencing and tamper alerts — distinct from site CCTV and plant PLC jobs.",
    tags: ["GPS", "Telemetry", "Cold-chain"],
    image:
      "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1400&q=75&fm=webp",
  },
  {
    icon: Headset,
    title: "AMC & Remote Support",
    desc: "Post-handover checks on NVR/PLC, spare SKUs from the same catalog, and warranty handling — not a new installation line.",
    tags: ["AMC", "Remote", "Spares"],
    image:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1400&q=75&fm=webp",
  },
];

export const SENSORS_CATALOG: SensorCatalogItem[] = [
  {
    icon: Thermometer,
    name: "Climate Multi-Sensor",
    tech: "Temperature · Humidity · Lux",
    use: "Feeds AC, heater, and motorized blind routines from room conditions.",
    color: "bg-[#0052B4]/10 text-[#0052B4] border-[#0052B4]/15",
    shopCategory: "Tuya Sensors",
  },
  {
    icon: Zap,
    name: "Power Monitor",
    tech: "CT Clamp",
    use: "Live voltage, current, and kWh for a circuit, floor, or small plant.",
    color: "bg-[#FF7A00]/10 text-[#FF7A00] border-[#FF7A00]/20",
    shopCategory: "Smart Circuit Breakers",
  },
  {
    icon: Droplets,
    name: "Water Leak Sensor",
    tech: "Conductive probe",
    use: "Under-sink and plant-room flood alert before a pump or valve scene runs.",
    color: "bg-sky-50 text-sky-700 border-sky-100",
    shopCategory: "Tuya Smart Sensors",
  },
  {
    icon: Lock,
    name: "Door & Window Contact",
    tech: "Zigbee Reed Switch",
    use: "Entry events for lighting scenes by day — not a full ANPR or biometric gate.",
    color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    shopCategory: "Tuya Smart Sensors",
  },
];
