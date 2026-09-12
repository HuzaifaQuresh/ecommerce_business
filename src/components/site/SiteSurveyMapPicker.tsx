import { useEffect, useId, useRef, useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MapPinValue = {
  lat: number;
  lng: number;
};

type Props = {
  value: MapPinValue | null;
  onChange: (value: MapPinValue | null) => void;
  className?: string;
  /** Default center — Islamabad */
  defaultCenter?: MapPinValue;
};

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

declare global {
  interface Window {
    L?: any;
  }
}

function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.L) return Promise.resolve(window.L);

  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }

  const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      if (window.L) resolve(window.L);
      existing.addEventListener("load", () => resolve(window.L));
      existing.addEventListener("error", () => reject(new Error("Leaflet failed to load")));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.body.appendChild(script);
  });
}

export function SiteSurveyMapPicker({
  value,
  onChange,
  className,
  defaultCenter = { lat: 33.6844, lng: 73.0479 },
}: Props) {
  const mapId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: any;

    void (async () => {
      try {
        const L = await loadLeaflet();
        if (cancelled || !containerRef.current) return;

        const start = value ?? defaultCenter;
        map = L.map(containerRef.current, {
          scrollWheelZoom: false,
          attributionControl: true,
        }).setView([start.lat, start.lng], value ? 16 : 12);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        }).addTo(map);

        const setMarker = (lat: number, lng: number) => {
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else {
            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);
            markerRef.current.on("dragend", () => {
              const p = markerRef.current.getLatLng();
              onChange({ lat: p.lat, lng: p.lng });
            });
          }
        };

        if (value) setMarker(value.lat, value.lng);

        map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
          setMarker(e.latlng.lat, e.latlng.lng);
          onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        mapRef.current = map;
        setReady(true);
        setTimeout(() => map.invalidateSize(), 80);
      } catch {
        if (!cancelled) setError("Map could not load. You can still type the address.");
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // Init once — value sync handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.L || !value) return;
    const L = window.L;
    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]);
    } else {
      markerRef.current = L.marker([value.lat, value.lng], { draggable: true }).addTo(mapRef.current);
      markerRef.current.on("dragend", () => {
        const p = markerRef.current.getLatLng();
        onChange({ lat: p.lat, lng: p.lng });
      });
    }
    mapRef.current.setView([value.lat, value.lng], Math.max(mapRef.current.getZoom(), 15));
  }, [value, ready, onChange]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported in this browser.");
      return;
    }
    setGeoBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onChange(next);
        setGeoBusy(false);
      },
      () => {
        setError("Could not read your location. Allow permission or pin the map manually.");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-[#FF7A00]" />
          Tap the map to drop a pin (optional)
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            onClick={useMyLocation}
            disabled={geoBusy}
          >
            <Crosshair className="h-3.5 w-3.5 mr-1.5" />
            {geoBusy ? "Locating…" : "Use my location"}
          </Button>
          {value ? (
            <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => onChange(null)}>
              Clear pin
            </Button>
          ) : null}
        </div>
      </div>
      <div
        id={`sz-map-${mapId}`}
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-lg border border-[#E2E8F0] bg-slate-100 z-0"
      />
      {value ? (
        <p className="text-[11px] font-mono text-muted-foreground">
          Pin: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      ) : null}
      {error ? <p className="text-xs text-amber-700">{error}</p> : null}
    </div>
  );
}
