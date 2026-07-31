import { Label } from "@/components/ui/label";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { fmtPKR } from "@/lib/format";
import type { PaymentMethod } from "@/types/commerce";
import { Banknote, Building2, CreditCard, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Banknote> = {
  cod: Banknote,
  easypaisa: Smartphone,
  jazzcash: Smartphone,
  bank: Building2,
  card: CreditCard,
};

export function PaymentMethodCard({
  method,
  feePreview,
  selected,
}: {
  method: PaymentMethod;
  feePreview?: number;
  selected?: boolean;
}) {
  const Icon = ICONS[method.id] ?? CreditCard;
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 transition-colors cursor-pointer",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/40",
      )}
    >
      <RadioGroupItem value={method.id} id={`pay-${method.id}`} className="mt-1" />
      <Label htmlFor={`pay-${method.id}`} className="flex-1 cursor-pointer font-normal space-y-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold">{method.label}</span>
          {feePreview != null && feePreview > 0 && (
            <span className="text-xs text-muted-foreground">+{fmtPKR(feePreview)} fee</span>
          )}
        </div>
        {method.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">{method.description}</p>
        )}
      </Label>
    </div>
  );
}
