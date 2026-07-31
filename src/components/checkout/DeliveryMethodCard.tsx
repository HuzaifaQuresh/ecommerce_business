import { Label } from "@/components/ui/label";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { fmtPKR } from "@/lib/format";
import type { DeliveryMethod } from "@/types/commerce";
import { MapPin, Rocket, Store } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof MapPin> = {
  standard: MapPin,
  express: Rocket,
  pickup: Store,
};

export function DeliveryMethodCard({
  method,
  selected,
  displayCharge,
}: {
  method: DeliveryMethod;
  selected?: boolean;
  displayCharge: number;
}) {
  const Icon = ICONS[method.id] ?? MapPin;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 transition-colors cursor-pointer",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/40",
      )}
    >
      <RadioGroupItem value={method.id} id={`del-${method.id}`} className="mt-1" />
      <Label htmlFor={`del-${method.id}`} className="flex-1 cursor-pointer font-normal space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold">{method.label}</span>
          </div>
          <span className="text-sm font-semibold tabular-nums shrink-0">
            {displayCharge === 0 ? "Free" : fmtPKR(displayCharge)}
          </span>
        </div>
        {method.description && (
          <p className="text-xs text-muted-foreground">{method.description}</p>
        )}
        {method.eta && <p className="text-xs text-primary/80">{method.eta}</p>}
      </Label>
    </div>
  );
}
