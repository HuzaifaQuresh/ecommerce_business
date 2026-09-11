"""Generate src/lib/tuya-catalog-data.ts from extracted TYSH 2026 JSON files."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / "src" / "lib" / "tuya-catalog-data.ts"
USD_TO_PKR = 280

IMAGES = {
    "Smart Door Locks": "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&auto=format&fit=crop&q=80",
    "Smart Control Panels": "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&auto=format&fit=crop&q=80",
    "Smart Switches": "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&auto=format&fit=crop&q=80",
    "Smart Sockets & Plugs": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80",
    "Smart Curtain Systems": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&q=80",
    "Smart Thermostats": "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&auto=format&fit=crop&q=80",
    "Smart Circuit Breakers": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
    "Gateways": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80",
    "Tuya Smart Sensors": "https://images.unsplash.com/photo-1557597774-9d273bdfea9d?w=800&auto=format&fit=crop&q=80",
    "Smart Security Cameras": "https://images.unsplash.com/photo-1557597774-9d273bdfea9d?w=800&auto=format&fit=crop&q=80",
    "Smart Video Doorbells": "https://images.unsplash.com/photo-1558002038-1055907df827?w=800&auto=format&fit=crop&q=80",
    "Mounting Hardware": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&auto=format&fit=crop&q=80",
    "Battery": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&auto=format&fit=crop&q=80",
}

SKIP_TYPE_RE = re.compile(
    r"ic card|lock body|dry battery|no\.5|no\.7|optional\)",
    re.I,
)


def pick_usd(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        m = re.search(r"[\d.]+", value.replace(",", ""))
        return float(m.group(0)) if m else None
    if isinstance(value, dict):
        preferred = [
            "tuya_wifi",
            "wifi",
            "tuya_ble",
            "tuya_wifi_ble",
            "1gang",
            "pc",
            "metal",
            "basic",
            "single_finger",
            "3mp",
            "2mp",
        ]
        for key in preferred:
            if key in value:
                picked = pick_usd(value[key])
                if picked:
                    return picked
        nums = []
        for nested in value.values():
            picked = pick_usd(nested)
            if picked:
                nums.append(picked)
        return min(nums) if nums else None
    if isinstance(value, list):
        nums = [pick_usd(v) for v in value]
        nums = [n for n in nums if n]
        return min(nums) if nums else None
    return None


def map_category(typ: str, model: str) -> str:
    t = (typ or "").lower()
    m = model.lower()
    if any(k in t for k in ("lock stand",)):
        return "Mounting Hardware"
    if any(k in t for k in ("doorbell", "intercom", "video doorbell")):
        return "Smart Video Doorbells"
    if any(k in t for k in ("camera", "nvr", "recorder")):
        return "Smart Security Cameras"
    if re.search(r"^battery(\s|\(|$)|lithium battery|dry battery", t) and "camera" not in t and "lock" not in t:
        return "Battery"
    if any(k in t for k in ("thermostat", "trv", "gas", "humidity", "temperature")):
        return "Smart Thermostats"
    if any(k in t for k in ("breaker", "circuit")):
        return "Smart Circuit Breakers"
    if any(k in t for k in ("gateway", "ir remote", "hub")):
        return "Gateways"
    if any(k in t for k in ("sensor", "alarm", "pir", "door contact", "water leak", "smoke")):
        return "Tuya Smart Sensors"
    if any(k in t for k in ("curtain", "track", "tubular", "roller", "motor")) and "lock" not in t:
        return "Smart Curtain Systems"
    if any(k in t for k in ("socket", "plug", "power strip")):
        return "Smart Sockets & Plugs"
    if any(k in t for k in ("switch", "dimmer", "module", "scene", "gang")):
        return "Smart Switches"
    if any(k in t for k in ("control panel", "inch")):
        return "Smart Control Panels"
    if any(k in t for k in ("lock", "padlock", "deadbolt", "rim", "cabinet", "sliding")):
        return "Smart Door Locks"
    if m.startswith("tysh-cm") or m.startswith("tysh-ck"):
        return "Smart Security Cameras"
    if m.startswith("tysh-c") and re.search(r"tysh-c\d", m):
        return "Smart Video Doorbells"
    if m.startswith("tysh-st") or m.startswith("tysh-sv"):
        return "Smart Thermostats"
    if m.startswith("tysh-cb"):
        return "Smart Circuit Breakers"
    if m.startswith("tysh-ah") or m.startswith("tysh-aw") or m.startswith("tysh-az"):
        return "Tuya Smart Sensors"
    if m.startswith("tysh-ccs") or m.startswith("tysh-cs"):
        return "Smart Control Panels"
    return "Smart Home Automation"


def slugify(value: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return s[:80]


def ts_str(value: str) -> str:
    return json.dumps(str(value), ensure_ascii=False)


def flatten_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return "; ".join(flatten_text(v) for v in value if v)
    if isinstance(value, dict):
        return "; ".join(f"{k}: {flatten_text(v)}" for k, v in value.items() if v not in (None, "", []))
    return str(value).strip()


def build_specs(raw: dict) -> dict[str, str]:
    skip = {"model", "type", "usd_price", "highlights", "extras", "usd", "_usd"}
    specs: dict[str, str] = {}
    if raw.get("model"):
        specs["Model"] = str(raw["model"])
    highlights = flatten_text(raw.get("highlights"))
    if highlights:
        specs["Highlights"] = highlights[:240]
    labels = {
        "unlock_way": "Unlock Methods",
        "optional_features": "Optional Features",
        "optional_network": "Connectivity",
        "material": "Material",
        "battery": "Battery",
        "front_panel_size": "Front Panel",
        "rear_panel_size": "Rear Panel",
        "mortise": "Mortise",
        "color": "Color",
        "protocol": "Protocol",
        "wireless_type": "Wireless",
        "voltage": "Voltage",
        "current": "Current",
        "size": "Size",
        "screen_size": "Screen",
        "gang": "Gangs",
        "resolution": "Resolution",
        "ip_rating": "IP Rating",
        "functions": "Functions",
        "power_supply": "Power",
        "storage": "Storage",
        "angle": "Viewing Angle",
    }
    for key, label in labels.items():
        text = flatten_text(raw.get(key))
        if text:
            specs[label] = text[:220]
    extras = flatten_text(raw.get("extras"))
    if extras:
        specs["Notes"] = extras[:220]
    for key, value in raw.items():
        if key in skip or key in labels:
            continue
        if key.lower().replace("_", "").replace(" ", "") in {"usd", "usdprice"}:
            continue
        text = flatten_text(value)
        if text and len(text) < 180:
            specs[key.replace("_", " ").title()] = text
    return specs


def should_skip(raw: dict, usd: float | None) -> bool:
    model = str(raw.get("model") or "")
    typ = str(raw.get("type") or "")
    if not model.startswith("TYSH-") and "lock stand" not in typ.lower():
        return True
    if SKIP_TYPE_RE.search(typ) or SKIP_TYPE_RE.search(model):
        return True
    if usd is None or usd < 3:
        return True
    return False


def load_items() -> list[dict]:
    files = sorted(ROOT.glob("tysh-pages*.json"))
    items: list[dict] = []
    for path in files:
        if path.name.endswith(".min.json"):
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            items.extend(data)
        print(f"loaded {path.name}: {len(data) if isinstance(data, list) else '?'} rows")
    return items


def emit_product(raw: dict, usd: float) -> str:
    model = str(raw["model"]).strip()
    typ = flatten_text(raw.get("type")) or "Tuya Smart Device"
    category = map_category(typ, model)
    pid = slugify(model)
    title = f"Tuya {model} {typ} - WiFi"
    if len(title) > 90:
        title = f"Tuya {model} {typ}"[:90]
    color = flatten_text(raw.get("color")) or None
    highlights = flatten_text(raw.get("highlights"))
    desc = (
        f"{typ} from the official TYSH / Tuya 2026 catalogue. "
        f"{highlights + '. ' if highlights else ''}"
        f"Works with Tuya Smart and Smart Life. Factory FOB converted at {USD_TO_PKR} PKR/USD."
    )
    protocol = flatten_text(raw.get("protocol") or raw.get("optional_network") or raw.get("wireless_type")) or "WiFi 2.4GHz"
    specs = build_specs(raw)
    specs["protocol"] = protocol
    if flatten_text(raw.get("battery") or raw.get("power_supply") or raw.get("voltage")):
        specs["power"] = flatten_text(raw.get("battery") or raw.get("power_supply") or raw.get("voltage"))
    specs["ecosystem"] = "Tuya Smart / Smart Life / Alexa / Google"
    tags = ["Tuya", "TYSH", category]
    if "lock" in typ.lower():
        tags.append("Smart Lock")
    image = IMAGES.get(category, IMAGES["Smart Door Locks"])
    price = int(round(usd * USD_TO_PKR))
    stock = 28 if usd >= 40 else 40
    rating = 4.8 if usd >= 40 else 4.6
    lines = [
        "  {",
        f"    id: {ts_str(pid)},",
        f"    title: {ts_str(title)},",
        f"    slug: {ts_str(pid)},",
        f"    category: {ts_str(category)},",
        f"    price_pkr: {price},",
        f"    stock: {stock},",
        "    discount_pct: 0,",
        f"    rating: {rating},",
        '    availability: "in_stock",',
        '    manufacturer: "TYSH / Tuya Smart",',
        f"    color: {ts_str(color) if color else 'null'},",
        f"    image_url: {ts_str(image)},",
        f"    gallery_urls: [{ts_str(image)}],",
        f"    description: {ts_str(desc)},",
        "    specs: {",
    ]
    for key, value in specs.items():
        lines.append(f"      {ts_str(key)}: {ts_str(value)},")
    lines.append("    },")
    lines.append(f"    tags: {json.dumps(tags, ensure_ascii=False)},")
    lines.append("  },")
    return "\n".join(lines)


def main() -> None:
    items = load_items()
    seen: dict[str, dict] = {}
    skipped = 0
    for raw in items:
        if not isinstance(raw, dict):
            continue
        usd = pick_usd(raw.get("usd_price"))
        if should_skip(raw, usd):
            skipped += 1
            continue
        model = str(raw["model"]).strip()
        if model not in seen:
            seen[model] = raw
            seen[model]["_usd"] = usd
    products = list(seen.values())
    products.sort(key=lambda r: (map_category(flatten_text(r.get("type")), r["model"]), r["model"]))
    chunks = [emit_product(raw, raw["_usd"]) for raw in products]
    header = """import type { ProductRow } from "@/types/commerce";

/**
 * Official TYSH / Tuya Smart Product Catalogue 2026
 * Sourced from Guangdong Mingshen Smart Information Technology Co., LTD
 * Converted to PKR (exchange rate 280 PKR / USD)
 */
export const TUYA_PRODUCTS: ProductRow[] = [
"""
    OUT.write_text(header + "\n".join(chunks) + "\n];\n", encoding="utf-8")
    print(f"wrote {OUT} products={len(products)} skipped={skipped} bytes={OUT.stat().st_size}")


if __name__ == "__main__":
    main()
