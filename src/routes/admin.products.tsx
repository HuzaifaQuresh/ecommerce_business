import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { fmtPKR, CATEGORY_CATALOG } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardPageHeader, ResponsiveScroll } from "@/components/site/PageLayout";
import { toast } from "sonner";
import { mergeProductsWithInventory, upsertInventoryStock } from "@/lib/inventory";
import { CATALOG_QUERY_VERSION } from "@/lib/catalog-version";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  ImageOff,
  Package,
  AlertTriangle,
  Tag,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  X,
  Flame,
  Star,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { optimizeProductImageUrl } from "@/lib/product-image";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MOCK_PRODUCTS,
  saveLocalProduct,
  deleteLocalProduct,
  initializeMockProductsOnClient,
  syncServerProducts,
} from "@/lib/mock-products";
import { MultiImageOptimizerUploader } from "@/components/ui/ImageOptimizerUploader";
import { TechnicalSpecsEditor, TechSpecItem } from "@/components/product/TechnicalSpecsEditor";
import { ProductImportModal } from "@/components/admin/ProductImportModal";
import {
  FEATURED_TAG,
  HOT_SELLING_TAG,
  hasProductTag,
  toggleProductTag,
} from "@/lib/product-merch-tags";

export const Route = createFileRoute("/admin/products")({ component: AdminProducts });

type Form = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  price_pkr: number | "";
  stock: number | "";
  image_url: string;
  gallery_urls: string[];
  manufacturer: string;
  discount_pct: number | "";
  availability: string;
  protocol: string;
  power: string;
  ecosystem: string;
  tags: string;
  customSpecs: TechSpecItem[];
};

const EMPTY: Form = {
  title: "",
  slug: "",
  description: "",
  category: "Components",
  price_pkr: "",
  stock: 50,
  image_url: "",
  gallery_urls: [],
  manufacturer: "",
  discount_pct: "",
  availability: "in_stock",
  protocol: "Zigbee 3.0",
  power: "12V DC / Battery",
  ecosystem: "Tuya Smart / Smart Life",
  tags: "zigbee, smart-home",
  customSpecs: [
    { key: "Working Temperature", value: "-10°C to 55°C" },
    { key: "Operating Voltage", value: "12V DC / 3V Battery" },
    { key: "Warranty", value: "12 months manufacturer" },
  ],
};

const AVAIL_LABELS: Record<string, { label: string; className: string }> = {
  in_stock: {
    label: "In stock",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  },
  on_demand: { label: "On demand", className: "bg-sky-500/10 text-sky-700 border-sky-500/20" },
  coming_soon: {
    label: "Coming soon",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
  obsolete: { label: "Obsolete", className: "bg-muted text-muted-foreground border-border" },
};

function withTimeout<T>(promise: any, ms = 12000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (res: any) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err: any) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function isDbProductId(id?: string | null) {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function invalidateStorefrontCatalog(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["admin-products"] });
  qc.invalidateQueries({ queryKey: ["vendor-products"] });
  qc.invalidateQueries({ queryKey: ["products"] });
  qc.invalidateQueries({ queryKey: ["home-products"] });
  qc.invalidateQueries({ queryKey: ["all-products"] });
  qc.invalidateQueries({ queryKey: ["product"] });
  qc.invalidateQueries({ queryKey: ["related"] });
  // Versioned catalog keys used by the public storefront
  qc.invalidateQueries({ queryKey: ["products", CATALOG_QUERY_VERSION] });
  qc.invalidateQueries({ queryKey: ["home-products", CATALOG_QUERY_VERSION] });
  qc.invalidateQueries({ queryKey: ["product", CATALOG_QUERY_VERSION] });
  qc.invalidateQueries({ queryKey: ["related", CATALOG_QUERY_VERSION] });
}

const isCustomSpec = ([k]: [string, any]) => k !== "protocol" && k !== "power" && k !== "ecosystem";

const PAGE_SIZE = 20;
const LOW_STOCK_QTY = 15;

function listPrice(price: number, discount: number): number | null {
  if (!discount || discount <= 0 || discount >= 100) return null;
  return Math.round(price / (1 - discount / 100));
}

function AdminProducts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterAvail, setFilterAvail] = useState("all");
  const [filterStock, setFilterStock] = useState<"all" | "low">("all");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toggleMerch = async (product: any, tag: string) => {
    const enabled = !hasProductTag(product.tags, tag);
    const nextTags = toggleProductTag(product.tags, tag, enabled);
    const updated = { ...product, tags: nextTags };
    saveLocalProduct(updated);
    if (isSupabaseConfigured()) {
      try {
        const targetId = isDbProductId(product.id)
          ? product.id
          : (
              await supabase.from("products").select("id").eq("slug", product.slug).maybeSingle()
            ).data?.id;
        if (!targetId) throw new Error("Product not in database yet — open and Save once first");
        const { data, error } = await withTimeout<any>(
          supabase
            .from("products")
            .update({ tags: nextTags })
            .eq("id", targetId)
            .select("id")
            .maybeSingle(),
          12000,
        );
        if (error) throw error;
        if (!data?.id) throw new Error("Tag update blocked — sign in as admin and retry");
      } catch (err: any) {
        toast.error(err?.message || "Could not update tags in database");
        return;
      }
    }
    toast.success(
      enabled
        ? tag === FEATURED_TAG
          ? "Marked as Featured"
          : "Marked as Hot selling"
        : tag === FEATURED_TAG
          ? "Removed from Featured"
          : "Removed from Hot selling",
    );
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      initializeMockProductsOnClient();
      await syncServerProducts();
      let list: typeof MOCK_PRODUCTS = [...MOCK_PRODUCTS];
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await withTimeout(
            supabase.from("products").select("*").order("updated_at", { ascending: false }),
            12000,
          );
          if (!error && Array.isArray(data) && data.length > 0) {
            // DB wins by slug/id — never keep a stale mock-* row when a live row exists
            const dbBySlug = new Map(data.map((d: any) => [d.slug, d]));
            const localOnly = MOCK_PRODUCTS.filter(
              (lp) => !dbBySlug.has(lp.slug) && !data.some((d: any) => d.id === lp.id),
            );
            list = [...data, ...localOnly] as typeof MOCK_PRODUCTS;
          }
        } catch {
          /* fallback */
        }
      }
      // Live first-come stock overlay (product_inventory by slug)
      return mergeProductsWithInventory(list);
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((p) => {
      if (
        q &&
        !p.title.toLowerCase().includes(q) &&
        !p.category.toLowerCase().includes(q) &&
        !(p.manufacturer ?? "").toLowerCase().includes(q)
      )
        return false;
      if (filterCat !== "all" && p.category !== filterCat) return false;
      if (filterAvail !== "all" && p.availability !== filterAvail) return false;
      if (filterStock === "low" && !(Number(p.stock) < LOW_STOCK_QTY)) return false;
      return true;
    });
  }, [data, search, filterCat, filterAvail, filterStock]);

  useEffect(() => {
    setPage(1);
  }, [search, filterCat, filterAvail, filterStock]);

  const stats = useMemo(() => {
    const list = data ?? [];
    return {
      total: list.length,
      inStock: list.filter((p) => p.availability === "in_stock").length,
      lowStock: list.filter((p) => Number(p.stock) < LOW_STOCK_QTY).length,
      onSale: list.filter((p) => Number(p.discount_pct) > 0).length,
    };
  }, [data]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const filtersOn = filterCat !== "all" || filterAvail !== "all" || filterStock !== "all" || search.trim();

  const allCategories = useMemo(
    () => [...new Set((data ?? []).map((p) => p.category))].sort(),
    [data],
  );

  const fillForm = (p: (typeof filtered)[number]) => {
    const specs = (p.specs && typeof p.specs === "object" ? p.specs : {}) as Record<string, string>;
    const tags = Array.isArray(p.tags) ? p.tags : [];
    const protocol =
      specs.protocol ||
      tags.find((t) => /zigbee|wifi|matter|bluetooth|lora|z-wave/i.test(t)) ||
      "";
    setForm({
      id: p.id,
      title: p.title || "",
      slug: p.slug || "",
      description: p.description || "",
      category: p.category || "Components",
      price_pkr: p.price_pkr ?? "",
      stock: p.stock ?? 50,
      image_url: p.image_url || "",
      gallery_urls: p.gallery_urls || [],
      manufacturer: p.manufacturer || "",
      discount_pct: p.discount_pct ?? "",
      availability: p.availability || "in_stock",
      protocol,
      power: specs.power || "",
      ecosystem: specs.ecosystem || "",
      tags: tags.join(", "),
      customSpecs: Object.entries(specs)
        .filter(isCustomSpec)
        .map(([key, value]) => ({ key, value: String(value) })),
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    setSaving(true);
    try {

    const parsedPrice =
      typeof form.price_pkr === "number" ? form.price_pkr : Number(form.price_pkr);
    if (!parsedPrice || isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Please enter a valid price (PKR) greater than 0");
      return;
    }

    const parsedStock =
      typeof form.stock === "number"
        ? form.stock
        : form.stock === ""
          ? 50
          : Number(form.stock) || 0;

    const parsedDiscount =
      typeof form.discount_pct === "number" ? form.discount_pct : Number(form.discount_pct) || 0;

    const slug =
      form.slug.trim() ||
      form.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    const specsObj: Record<string, string> = {};
    if (form.protocol.trim()) specsObj.protocol = form.protocol.trim();
    if (form.power.trim()) specsObj.power = form.power.trim();
    if (form.ecosystem.trim()) specsObj.ecosystem = form.ecosystem.trim();
    (form.customSpecs || []).forEach((item) => {
      if (item.key.trim() && item.value.trim()) {
        specsObj[item.key.trim()] = item.value.trim();
      }
    });

    const tagsArr = form.tags
      ? form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const payload = {
      title: form.title.trim(),
      slug,
      description: form.description.trim() || null,
      category: form.category || "Components",
      price_pkr: parsedPrice,
      stock: parsedStock,
      manufacturer: form.manufacturer.trim() || null,
      discount_pct: parsedDiscount,
      image_url: form.image_url.trim() || null,
      gallery_urls: form.gallery_urls || [],
      availability: (form.availability || "in_stock") as
        "in_stock" | "on_demand" | "coming_soon" | "obsolete",
      specs: specsObj,
      tags: tagsArr,
    };

    let savedId = form.id || `user-${Date.now()}`;
    let dbSynced = !isSupabaseConfigured();

    // 1. Live inventory (first-come source of truth by slug)
    try {
      await upsertInventoryStock(slug, parsedStock);
    } catch (err) {
      console.warn("Inventory upsert failed:", err);
    }

    // 2. Persist to Supabase products (source of truth for storefront)
    // Catalog SKUs use mock-* ids — always upsert by unique slug so edits actually land in DB.
    // Verify with .select() because RLS can silently update 0 rows without an error.
    if (isSupabaseConfigured()) {
      try {
        const row = {
          ...payload,
          ...(isDbProductId(form.id) ? { id: form.id } : {}),
        };

        const { data: saved, error } = await withTimeout<any>(
          supabase
            .from("products")
            .upsert(row, { onConflict: "slug" })
            .select("id, slug, updated_at")
            .maybeSingle(),
          15000,
        );

        if (error) throw error;
        if (!saved?.id) {
          throw new Error(
            "Save blocked by database permissions. Sign out/in as admin (or super admin) and try again.",
          );
        }

        savedId = saved.id;
        dbSynced = true;
      } catch (err: any) {
        console.error("Supabase product save failed:", err);
        const msg = err?.message || "Could not save product to database";
        toast.error(msg);
        setSaving(false);
        return;
      }
    }

    const localProduct = {
      ...payload,
      id: savedId,
      rating: (form as any).rating || 4.5,
      gallery_urls: form.gallery_urls || [],
    };
    saveLocalProduct(localProduct as any);

    if (dbSynced) {
      toast.success(form.id ? "Product updated on smartzone.pk" : "Product created on smartzone.pk");
    } else {
      toast.success(form.id ? "Product updated locally" : "Product created locally");
    }
    setOpen(false);
    setForm(EMPTY);
    invalidateStorefrontCatalog(qc);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    deleteLocalProduct(id);
    if (isSupabaseConfigured()) {
      try {
        if (isDbProductId(id)) {
          const { error } = await withTimeout(supabase.from("products").delete().eq("id", id), 12000);
          if (error) throw error;
        } else {
          // Built-in catalog ids aren't in DB — try slug delete if present in list
          const match = (data ?? []).find((p) => p.id === id);
          if (match?.slug) {
            await withTimeout(supabase.from("products").delete().eq("slug", match.slug), 12000);
          }
        }
      } catch (err: any) {
        console.warn("Supabase delete failed:", err);
        toast.error(err?.message || "Could not delete from database");
      }
    }
    toast.success("Product deleted successfully");
    invalidateStorefrontCatalog(qc);
  };

  const start = filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Catalog"
        description="Manage SmartZone SKUs, pricing, stock, and storefront visibility."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ProductImportModal
              onImportComplete={() => {
                qc.invalidateQueries({ queryKey: ["admin-products"] });
                qc.invalidateQueries({ queryKey: ["vendor-products"] });
                qc.invalidateQueries({ queryKey: ["products"] });
                qc.invalidateQueries({ queryKey: ["all-products"] });
              }}
            />
            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) setForm(EMPTY);
              }}
            >
              <DialogTrigger asChild>
                <Button className="min-h-[44px] bg-[#0B192C] hover:bg-[#0F2C59]">
                  <Plus className="h-4 w-4 mr-1.5" /> Add product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {form.id ? "Edit SKU" : "New SKU"}
                  </DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    {form.id
                      ? "Update listing, media, and technical specs."
                      : "Create a catalog item for the SmartZone storefront."}
                  </p>
                </DialogHeader>

                {/* Image preview */}
                {form.image_url && (
                  <div className="rounded-lg border overflow-hidden h-32 bg-muted flex items-center justify-center">
                    <img
                      src={form.image_url}
                      alt=""
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label>Title *</Label>
                    <Input
                      value={form.title || ""}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Tuya Zigbee PIR Motion Sensor"
                    />
                  </div>
                  <div>
                    <Label>Slug (auto-generated)</Label>
                    <Input
                      value={form.slug || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                        })
                      }
                      placeholder="leave blank to auto-generate"
                    />
                  </div>
                  <div>
                    <Label>Manufacturer</Label>
                    <Input
                      value={form.manufacturer || ""}
                      onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                      placeholder="Tuya, Hikvision…"
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={form.category || "Components"}
                      onValueChange={(v) => setForm({ ...form, category: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {CATEGORY_CATALOG.map((dept) => (
                          <SelectGroup key={dept.name}>
                            <SelectLabel>{dept.name}</SelectLabel>
                            <SelectItem value={dept.name}>{dept.name} (all)</SelectItem>
                            {(dept.children ?? []).map((sub) => (
                              <SelectItem key={sub} value={sub}>
                                {sub}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Availability</Label>
                    <Select
                      value={form.availability || "in_stock"}
                      onValueChange={(v) => setForm({ ...form, availability: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                        <SelectItem value="on_demand">On Demand</SelectItem>
                        <SelectItem value="coming_soon">Coming Soon</SelectItem>
                        <SelectItem value="obsolete">Obsolete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Price (PKR) *</Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="e.g. 2500"
                      value={form.price_pkr}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm({ ...form, price_pkr: v === "" ? "" : Number(v) });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Stock qty</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 50"
                      value={form.stock}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm({ ...form, stock: v === "" ? "" : Number(v) });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Discount %</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g. 10"
                      value={form.discount_pct}
                      onChange={(e) => {
                        const v = e.target.value;
                        setForm({ ...form, discount_pct: v === "" ? "" : Number(v) });
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <MultiImageOptimizerUploader
                      primaryImage={form.image_url || ""}
                      onPrimaryImageChange={(url) =>
                        setForm((prev) => ({ ...prev, image_url: url }))
                      }
                      galleryImages={form.gallery_urls || []}
                      onGalleryImagesChange={(urls) =>
                        setForm((prev) => ({ ...prev, gallery_urls: urls }))
                      }
                      label="Product Images & Multi-Angle Gallery"
                      description="Upload & compress multiple product photos to WebP format or provide CDN URLs."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description || ""}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      rows={3}
                      placeholder="Product description…"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TechnicalSpecsEditor
                      value={{
                        protocol: form.protocol,
                        power: form.power,
                        ecosystem: form.ecosystem,
                        tags: form.tags,
                        customSpecs: form.customSpecs,
                      }}
                      onChange={(ts) =>
                        setForm((prev) => ({
                          ...prev,
                          protocol: ts.protocol,
                          power: ts.power,
                          ecosystem: ts.ecosystem,
                          tags: ts.tags,
                          customSpecs: ts.customSpecs,
                        }))
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={() => void save()}
                  disabled={saving}
                  className="w-full min-h-[44px] bg-[#FF7A00] hover:bg-[#E56E00] text-white font-semibold"
                >
                  {saving ? "Saving…" : form.id ? "Save changes" : "Create product"}
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <button type="button" className="text-left" onClick={() => { setFilterAvail("all"); setFilterStock("all"); }}>
          <StatCard label="Total SKUs" value={stats.total} icon={Package} hint="Live catalog" />
        </button>
        <button type="button" className="text-left" onClick={() => { setFilterAvail("in_stock"); setFilterStock("all"); }}>
          <StatCard
            label="In stock"
            value={stats.inStock}
            icon={Warehouse}
            hint="Available to sell"
            accentClass="bg-emerald-500/10 text-emerald-600"
          />
        </button>
        <button type="button" className="text-left" onClick={() => { setFilterStock("low"); setFilterAvail("all"); }}>
          <StatCard
            label="Low stock"
            value={stats.lowStock}
            icon={AlertTriangle}
            hint={`Below ${LOW_STOCK_QTY} units`}
            accentClass="bg-amber-500/10 text-amber-600"
          />
        </button>
        <StatCard
          label="On sale"
          value={stats.onSale}
          icon={Tag}
          hint="Discounted listings"
          accentClass="bg-orange-500/10 text-[#FF7A00]"
        />
      </div>

      <div className="rounded-xl border bg-card p-3 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, brand, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-full lg:w-56 h-10">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {allCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAvail} onValueChange={setFilterAvail}>
            <SelectTrigger className="w-full lg:w-44 h-10">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="in_stock">In stock</SelectItem>
              <SelectItem value="on_demand">On demand</SelectItem>
              <SelectItem value="coming_soon">Coming soon</SelectItem>
              <SelectItem value="obsolete">Obsolete</SelectItem>
            </SelectContent>
          </Select>
          {filtersOn ? (
            <Button
              type="button"
              variant="ghost"
              className="h-10"
              onClick={() => {
                setSearch("");
                setFilterCat("all");
                setFilterAvail("all");
                setFilterStock("all");
              }}
            >
              <X className="h-4 w-4 mr-1.5" /> Clear
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Showing {start}–{end} of {filtered.length}
          {filtered.length !== stats.total ? ` (filtered from ${stats.total})` : ""} SKUs
          {filterStock === "low" ? " · low stock only" : ""}.
        </p>
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="rounded-xl border bg-card py-16 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-semibold text-[#0B192C]">No SKUs match these filters</p>
          <p className="text-sm text-muted-foreground mt-1">Adjust search or clear filters to see the catalog.</p>
        </div>
      )}

      {filtered.length > 0 && (
        <>
          <div className="md:hidden space-y-3">
            {paged.map((p) => {
              const avail = AVAIL_LABELS[p.availability] ?? AVAIL_LABELS.in_stock;
              const original = listPrice(Number(p.price_pkr), Number(p.discount_pct));
              return (
                <div key={p.id} className="rounded-xl border bg-card p-3 shadow-xs">
                  <div className="flex gap-3">
                    <div className="h-16 w-16 rounded-lg border bg-slate-50 overflow-hidden shrink-0">
                      {p.image_url ? (
                        <img
                          src={optimizeProductImageUrl(p.image_url, "thumb")}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full grid place-items-center">
                          <ImageOff className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#0B192C] line-clamp-2">{p.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {p.manufacturer || "SmartZone"} · {p.category}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-sm font-black tabular-nums">{fmtPKR(Number(p.price_pkr))}</span>
                        {original ? (
                          <span className="text-[11px] text-slate-400 line-through">{fmtPKR(original)}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] rounded-full px-2 py-0.5 border font-semibold", avail.className)}>
                        {avail.label}
                      </span>
                      <span className={cn("text-xs tabular-nums", Number(p.stock) < LOW_STOCK_QTY && "text-amber-600 font-semibold")}>
                        Qty {p.stock}
                      </span>
                      {p.availability === "in_stock" ? (
                        <span
                          className="text-[9px] uppercase tracking-wide font-semibold text-emerald-700/80"
                          title="Live inventory (first-come)"
                        >
                          Live
                        </span>
                      ) : null}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn("h-8 w-8", hasProductTag(p.tags, FEATURED_TAG) && "text-amber-500")}
                        title="Featured on homepage"
                        onClick={() => void toggleMerch(p, FEATURED_TAG)}
                      >
                        <Star className={cn("h-3.5 w-3.5", hasProductTag(p.tags, FEATURED_TAG) && "fill-current")} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn("h-8 w-8", hasProductTag(p.tags, HOT_SELLING_TAG) && "text-orange-600")}
                        title="Hot selling"
                        onClick={() => void toggleMerch(p, HOT_SELLING_TAG)}
                      >
                        <Flame className={cn("h-3.5 w-3.5", hasProductTag(p.tags, HOT_SELLING_TAG) && "fill-current")} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => fillForm(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button asChild size="icon" variant="ghost" className="h-8 w-8">
                        <Link to="/products/$slug" params={{ slug: p.slug || p.id }}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDeleteId(p.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block">
            <ResponsiveScroll>
              <table className="w-full text-sm min-w-[880px]">
                <thead className="bg-[#0B192C] text-white text-left">
                  <tr>
                    <th className="p-3 text-[11px] font-bold uppercase tracking-wider">Product</th>
                    <th className="p-3 text-[11px] font-bold uppercase tracking-wider">Brand</th>
                    <th className="p-3 text-[11px] font-bold uppercase tracking-wider">Category</th>
                    <th className="p-3 text-[11px] font-bold uppercase tracking-wider">Price</th>
                    <th className="p-3 text-[11px] font-bold uppercase tracking-wider">Stock</th>
                    <th className="p-3 text-[11px] font-bold uppercase tracking-wider">Status</th>
                    <th className="p-3 text-[11px] font-bold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((p) => {
                    const avail = AVAIL_LABELS[p.availability] ?? AVAIL_LABELS.in_stock;
                    const original = listPrice(Number(p.price_pkr), Number(p.discount_pct));
                    const low = Number(p.stock) < LOW_STOCK_QTY;
                    return (
                      <tr key={p.id} className="border-t hover:bg-sky-50/60 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-12 w-12 shrink-0 rounded-lg border bg-slate-50 overflow-hidden">
                              {p.image_url ? (
                                <img
                                  src={optimizeProductImageUrl(p.image_url, "thumb")}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full grid place-items-center">
                                  <ImageOff className="h-4 w-4 text-muted-foreground/40" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-[#0B192C] line-clamp-1">{p.title}</div>
                              <div className="text-[11px] text-muted-foreground font-mono truncate">
                                {p.slug || p.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-xs text-slate-600">{p.manufacturer || "—"}</td>
                        <td className="p-3 text-xs text-slate-600 max-w-[140px]">
                          <span className="line-clamp-2">{p.category}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold tabular-nums text-[#0B192C]">
                            {fmtPKR(Number(p.price_pkr))}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {original ? (
                              <span className="text-[11px] text-slate-400 line-through tabular-nums">
                                {fmtPKR(original)}
                              </span>
                            ) : null}
                            {Number(p.discount_pct) > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-[#FF7A00] border-[#FF7A00]/30 bg-[#FF7A00]/8"
                              >
                                −{p.discount_pct}%
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className={cn("p-3 tabular-nums font-semibold", low && "text-amber-600")}>
                          {p.stock}
                          {low ? (
                            <span className="block text-[10px] font-bold uppercase tracking-wide">Low</span>
                          ) : null}
                        </td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "text-[11px] rounded-full px-2.5 py-0.5 border font-semibold whitespace-nowrap",
                              avail.className,
                            )}
                          >
                            {avail.label}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className={cn("h-8 w-8", hasProductTag(p.tags, FEATURED_TAG) && "text-amber-500")}
                              title="Featured on homepage"
                              onClick={() => void toggleMerch(p, FEATURED_TAG)}
                            >
                              <Star className={cn("h-3.5 w-3.5", hasProductTag(p.tags, FEATURED_TAG) && "fill-current")} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className={cn("h-8 w-8", hasProductTag(p.tags, HOT_SELLING_TAG) && "text-orange-600")}
                              title="Hot selling"
                              onClick={() => void toggleMerch(p, HOT_SELLING_TAG)}
                            >
                              <Flame className={cn("h-3.5 w-3.5", hasProductTag(p.tags, HOT_SELLING_TAG) && "fill-current")} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Edit SKU"
                              onClick={() => fillForm(p)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              asChild
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="View storefront"
                            >
                              <Link to="/products/$slug" params={{ slug: p.slug || p.id }}>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Delete SKU"
                              onClick={() => setDeleteId(p.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ResponsiveScroll>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Page {safePage} of {pageCount}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((n) => Math.max(1, n - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage((n) => Math.min(pageCount, n + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this SKU?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the product from the catalog. Storefront listings that use this SKU will no longer show it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) void del(deleteId);
                setDeleteId(null);
              }}
            >
              Delete product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
