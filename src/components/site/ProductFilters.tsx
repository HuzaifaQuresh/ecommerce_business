import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FilterX, SlidersHorizontal } from "lucide-react";
import { CATEGORIES, AVAILABILITY_LABEL, getParentCategory } from "@/lib/format";
import { CategoryTreeNav } from "@/components/site/CategoryTreeNav";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ProductFilterState = {
  price: [number, number];
  avail: string;
  manufacturers: string[];
};

type ProductFiltersProps = {
  category?: string;
  q?: string;
  filters: ProductFilterState;
  setPrice: (v: [number, number]) => void;
  setAvail: (v: string) => void;
  setManufacturers: Dispatch<SetStateAction<string[]>>;
  allManufacturers: string[];
  onReset: () => void;
  onCategorySelect?: () => void;
  /** Mobile sheet open state */
  sheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
  className?: string;
};

function countActiveFilters({ price, avail, manufacturers }: ProductFilterState) {
  let n = 0;
  if (price[0] > 0 || price[1] < 1_500_000) n++;
  if (avail !== "all") n++;
  if (manufacturers.length) n += manufacturers.length;
  return n;
}

export function ProductCategoryChips({
  category,
  q,
  className,
}: {
  category?: string;
  q?: string;
  className?: string;
}) {
  const navigate = useNavigate();
  const setCategory = (c?: string) =>
    navigate({ to: "/products", search: { ...(q ? { q } : {}), category: c, sort: undefined } });

  return (
    <div className={cn("lg:hidden -mx-4 px-4", className)}>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin [scrollbar-width:thin]">
        <button
          type="button"
          onClick={() => setCategory(undefined)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
            !category
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card hover:bg-muted",
          )}
        >
          All
        </button>
        {CATEGORIES.map((c) => {
          const active = category === c || (!!category && getParentCategory(category) === c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProductFiltersPanel({
  category,
  q,
  filters,
  setPrice,
  setAvail,
  setManufacturers,
  allManufacturers,
  onReset,
  className,
  onCategorySelect,
}: Omit<ProductFiltersProps, "sheetOpen" | "onSheetOpenChange">) {
  const { price, avail, manufacturers } = filters;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Categories</h3>
        <CategoryTreeNav category={category} q={q} onSelect={onCategorySelect} />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Price Range (PKR)</h3>
        <Slider
          value={price}
          onValueChange={(v) => setPrice([v[0], v[1]] as [number, number])}
          min={0}
          max={1500000}
          step={500}
        />
        <div className="mt-3 flex justify-between text-xs text-muted-foreground tabular-nums">
          <span>{price[0].toLocaleString()}</span>
          <span>{price[1].toLocaleString()}+</span>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Availability</h3>
        <RadioGroup
          value={avail}
          onValueChange={setAvail}
          className="grid grid-cols-2 gap-2 sm:grid-cols-1"
        >
          {[["all", "All"], ...Object.entries(AVAILABILITY_LABEL)].map(([v, l]) => (
            <div key={v} className="flex items-center gap-2">
              <RadioGroupItem value={v} id={`panel-av-${v}`} />
              <Label htmlFor={`panel-av-${v}`} className="text-sm font-normal cursor-pointer">
                {l}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {allManufacturers.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3">Manufacturer</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {allManufacturers.map((m) => (
              <div key={m} className="flex items-center gap-2">
                <Checkbox
                  id={`panel-mf-${m}`}
                  checked={manufacturers.includes(m)}
                  onCheckedChange={(v) =>
                    setManufacturers((prev) => (v ? [...prev, m] : prev.filter((x) => x !== m)))
                  }
                />
                <Label
                  htmlFor={`panel-mf-${m}`}
                  className="text-sm font-normal cursor-pointer truncate"
                >
                  {m}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={onReset}>
        <FilterX className="h-4 w-4 mr-1" /> Reset Filters
      </Button>
    </div>
  );
}

export function ProductFiltersMobileSheet({
  category,
  q,
  filters,
  setPrice,
  setAvail,
  setManufacturers,
  allManufacturers,
  onReset,
  open,
  onOpenChange,
}: ProductFiltersProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const active = countActiveFilters(filters);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden shrink-0 gap-1.5">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
          {active > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {active}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-sm flex flex-col gap-0 p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ProductFiltersPanel
            category={category}
            q={q}
            filters={filters}
            setPrice={setPrice}
            setAvail={setAvail}
            setManufacturers={setManufacturers}
            allManufacturers={allManufacturers}
            onReset={() => {
              onReset();
              onOpenChange(false);
            }}
            onCategorySelect={() => onOpenChange(false)}
          />
        </div>
        <div className="border-t p-4">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Show results
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
