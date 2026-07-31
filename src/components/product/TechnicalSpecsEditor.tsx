import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Cpu, Zap, Wifi, Tag, Sliders } from "lucide-react";

export interface TechSpecItem {
  key: string;
  value: string;
}

export interface TechnicalSpecsData {
  protocol: string;
  power: string;
  ecosystem: string;
  tags: string;
  customSpecs: TechSpecItem[];
}

interface Props {
  value: TechnicalSpecsData;
  onChange: (value: TechnicalSpecsData) => void;
}

const COMMON_PROTOCOLS = [
  "Zigbee 3.0",
  "Wi-Fi 2.4GHz",
  "Bluetooth 5.0 Mesh",
  "Matter",
  "LoRaWAN",
  "Z-Wave",
  "RS485 / Modbus",
  "Cellular 4G/LTE",
];

const COMMON_POWER = [
  "12V DC / Battery",
  "220V AC (50/60Hz)",
  "5V 2A USB-C",
  "3V (2× AAA Batteries)",
  "24V AC",
  "PoE (802.3af)",
];

const COMMON_ECOSYSTEMS = [
  "Tuya Smart / Smart Life",
  "Home Assistant",
  "Apple HomeKit",
  "Google Home",
  "Amazon Alexa",
  "MQTT / Custom",
];

const PRESET_SPECS = [
  { key: "Working Temperature", placeholder: "-10°C to 55°C" },
  { key: "Detection Range", placeholder: "Up to 8 meters" },
  { key: "Operating Voltage", placeholder: "12V DC / 3V Battery" },
  { key: "Ingress Protection", placeholder: "IP44 / IP65" },
  { key: "Wireless Frequency", placeholder: "2.4 GHz" },
  { key: "Warranty", placeholder: "12 months manufacturer" },
];

export function TechnicalSpecsEditor({ value, onChange }: Props) {
  const updateField = <K extends keyof TechnicalSpecsData>(
    field: K,
    val: TechnicalSpecsData[K],
  ) => {
    onChange({ ...value, [field]: val });
  };

  const addCustomSpecRow = (keyName = "", defaultVal = "") => {
    const list = [...(value.customSpecs || [])];
    list.push({ key: keyName, value: defaultVal });
    updateField("customSpecs", list);
  };

  const updateSpecRow = (index: number, key: string, val: string) => {
    const list = [...(value.customSpecs || [])];
    list[index] = { key, value: val };
    updateField("customSpecs", list);
  };

  const removeSpecRow = (index: number) => {
    const list = (value.customSpecs || []).filter((_, i) => i !== index);
    updateField("customSpecs", list);
  };

  return (
    <div className="space-y-4 rounded-xl border bg-muted/30 p-4 sm:p-5">
      <div className="flex items-center gap-2 font-semibold text-sm text-foreground pb-2 border-b">
        <Sliders className="h-4 w-4 text-primary" />
        <span>Technical Specifications & IoT Metadata</span>
      </div>

      {/* Primary IoT Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5 font-medium">
            <Wifi className="h-3.5 w-3.5 text-blue-500" />
            Wireless Protocol
          </Label>
          <Input
            list="tech-protocol-options"
            value={value.protocol}
            onChange={(e) => updateField("protocol", e.target.value)}
            placeholder="e.g. Zigbee 3.0"
            className="h-9 text-sm"
          />
          <datalist id="tech-protocol-options">
            {COMMON_PROTOCOLS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5 font-medium">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Power Supply
          </Label>
          <Input
            list="tech-power-options"
            value={value.power}
            onChange={(e) => updateField("power", e.target.value)}
            placeholder="e.g. 12V DC / Battery"
            className="h-9 text-sm"
          />
          <datalist id="tech-power-options">
            {COMMON_POWER.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5 font-medium">
            <Cpu className="h-3.5 w-3.5 text-purple-500" />
            Smart Ecosystem
          </Label>
          <Input
            list="tech-ecosystem-options"
            value={value.ecosystem}
            onChange={(e) => updateField("ecosystem", e.target.value)}
            placeholder="e.g. Tuya Smart / Smart Life"
            className="h-9 text-sm"
          />
          <datalist id="tech-ecosystem-options">
            {COMMON_ECOSYSTEMS.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Search Tags */}
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1.5 font-medium">
          <Tag className="h-3.5 w-3.5 text-emerald-500" />
          Search & Metadata Tags (Comma-separated)
        </Label>
        <Input
          value={value.tags}
          onChange={(e) => updateField("tags", e.target.value)}
          placeholder="e.g. zigbee, pir, motion, sensor, tuya"
          className="h-9 text-sm"
        />
      </div>

      {/* Custom Key-Value Technical Specs */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Technical Details & Parameters
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => addCustomSpecRow()}
          >
            <Plus className="h-3.5 w-3.5" /> Add Field
          </Button>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap gap-1.5 py-1">
          <span className="text-[11px] text-muted-foreground flex items-center mr-1">
            Quick Add:
          </span>
          {PRESET_SPECS.map((preset) => {
            const exists = (value.customSpecs || []).some(
              (s) => s.key.toLowerCase() === preset.key.toLowerCase(),
            );
            if (exists) return null;
            return (
              <Button
                key={preset.key}
                type="button"
                variant="secondary"
                size="sm"
                className="h-6 text-[11px] px-2 py-0"
                onClick={() => addCustomSpecRow(preset.key, preset.placeholder)}
              >
                + {preset.key}
              </Button>
            );
          })}
        </div>

        {/* Dynamic spec rows */}
        {(value.customSpecs || []).length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-1">
            No custom technical parameters added. Click "Add Field" or a quick preset above.
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {value.customSpecs.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={item.key}
                  onChange={(e) => updateSpecRow(idx, e.target.value, item.value)}
                  placeholder="Parameter (e.g. Working Temp)"
                  className="h-8 text-xs w-1/2"
                />
                <Input
                  value={item.value}
                  onChange={(e) => updateSpecRow(idx, item.key, e.target.value)}
                  placeholder="Value (e.g. -10°C to 55°C)"
                  className="h-8 text-xs w-1/2"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => removeSpecRow(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
