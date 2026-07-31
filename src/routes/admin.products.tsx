import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { Plus, Pencil, Trash2, Search, ExternalLink, ImageOff } from "lucide-react";
import {
  MOCK_PRODUCTS,
  saveLocalProduct,
  deleteLocalProduct,
  initializeMockProductsOnClient,
  syncServerProducts,
} from "@/lib/mock-products";
import {
  ImageOptimizerUploader,
  MultiImageOptimizerUploader,
} from "@/components/ui/ImageOptimizerUploader";
import {
  TechnicalSpecsEditor,
  TechSpecItem,
  TechnicalSpecsData,
} from "@/components/product/TechnicalSpecsEditor";

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

function withTimeout<T>(promise: any, ms = 800): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout of 800ms exceeded"));
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

const isCustomSpec = ([k]: [string, any]) => k !== "protocol" && k !== "power" && k !== "ecosystem";

function AdminProducts() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterAvail, setFilterAvail] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      initializeMockProductsOnClient();
      await syncServerProducts();
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await withTimeout(
            supabase.from("products").select("*").order("created_at", { ascending: false }),
            1500,
          );
          if (!error && data) {
            // Combine DB items with local-only mock/custom items
            const localOnly = MOCK_PRODUCTS.filter(
              (lp) => !data.some((d) => d.id === lp.id || d.slug === lp.slug),
            );
            return [...localOnly, ...data];
          }
        } catch {
          /* fallback */
        }
      }
      return [...MOCK_PRODUCTS];
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
      return true;
    });
  }, [data, search, filterCat, filterAvail]);

  const allCategories = useMemo(
    () => [...new Set((data ?? []).map((p) => p.category))].sort(),
    [data],
  );

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title is required");

    const parsedPrice =
      typeof form.price_pkr === "number" ? form.price_pkr : Number(form.price_pkr);
    if (!parsedPrice || isNaN(parsedPrice) || parsedPrice <= 0) {
      return toast.error("Please enter a valid price (PKR) greater than 0");
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

    const targetId = form.id || `mock-${Date.now()}`;
    const localProduct = {
      ...payload,
      id: targetId,
      rating: (form as any).rating || 4.5,
      gallery_urls: form.gallery_urls || [],
    };

    // 1. Instantly save in local storage & memory
    saveLocalProduct(localProduct as any);

    // 2. If Supabase is configured, sync to database
    if (isSupabaseConfigured()) {
      if (form.id) {
        try {
          const { error } = await withTimeout(
            supabase.from("products").update(payload).eq("id", form.id),
            1500,
          );
          if (error) console.warn("Supabase product update error:", error);
        } catch (err: any) {
          console.warn("Supabase update failed, saved locally:", err);
        }
      } else {
        try {
          const { data, error } = await withTimeout(
            supabase.from("products").insert(payload).select("id").maybeSingle(),
            1500,
          );
          if (!error && data?.id) {
            saveLocalProduct({ ...localProduct, id: data.id } as any);
          }
        } catch (err: any) {
          console.warn("Supabase insert failed, saved locally:", err);
        }
      }
    }

    toast.success(form.id ? "Product updated successfully!" : "Product created successfully!");
    setOpen(false);
    setForm(EMPTY);

    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["vendor-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["all-products"] });
    qc.invalidateQueries({ queryKey: ["product"] });
    qc.invalidateQueries({ queryKey: ["related"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product permanently?")) return;
    deleteLocalProduct(id);
    if (isSupabaseConfigured()) {
      try {
        await withTimeout(supabase.from("products").delete().eq("id", id), 1500);
      } catch (err) {
        console.warn("Supabase delete failed:", err);
      }
    }
    toast.success("Product deleted successfully");
    qc.invalidateQueries({ queryKey: ["admin-products"] });
    qc.invalidateQueries({ queryKey: ["vendor-products"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["all-products"] });
    qc.invalidateQueries({ queryKey: ["product"] });
    qc.invalidateQueries({ queryKey: ["related"] });
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="Products"
        description={`${data?.length ?? 0} total SKUs in catalog.`}
        actions={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) setForm(EMPTY);
            }}
          >
            <DialogTrigger asChild>
              <Button className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-1" /> Add product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{form.id ? "Edit" : "Add"} product</DialogTitle>
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
                    onPrimaryImageChange={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
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
              <Button onClick={save} className="w-full min-h-[44px]">
                {form.id ? "Save changes" : "Create product"}
              </Button>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title, category, manufacturer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-full sm:w-48">
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
          <SelectTrigger className="w-full sm:w-40">
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
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="rounded-xl border bg-card py-12 text-center text-muted-foreground">
          No products match your filters.
        </div>
      )}

      {filtered.length > 0 && (
        <ResponsiveScroll>
          <table className="w-full text-sm min-w-[680px]">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-3 font-semibold">Product</th>
                <th className="p-3 font-semibold">Category</th>
                <th className="p-3 font-semibold">Price</th>
                <th className="p-3 font-semibold">Stock</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const avail = AVAIL_LABELS[p.availability] ?? AVAIL_LABELS.in_stock;
                return (
                  <tr key={p.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-md border bg-muted overflow-hidden flex items-center justify-center">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ImageOff className="h-4 w-4 text-muted-foreground/40" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium line-clamp-1">{p.title}</div>
                          <div className="text-xs text-muted-foreground">{p.manufacturer}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">{p.category}</td>
                    <td className="p-3 tabular-nums font-medium">
                      {fmtPKR(Number(p.price_pkr))}
                      {Number(p.discount_pct) > 0 && (
                        <Badge
                          variant="outline"
                          className="ml-1.5 text-[10px] text-emerald-600 border-emerald-500/20"
                        >
                          −{p.discount_pct}%
                        </Badge>
                      )}
                    </td>
                    <td
                      className={`p-3 tabular-nums font-medium ${p.stock < 15 ? "text-amber-600" : ""}`}
                    >
                      {p.stock}
                      {p.stock < 15 && <span className="text-[10px] ml-1">⚠</span>}
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 border font-medium ${avail.className}`}
                      >
                        {avail.label}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => {
                            const specs = (
                              p.specs && typeof p.specs === "object" ? p.specs : {}
                            ) as Record<string, string>;
                            const tags = Array.isArray(p.tags) ? p.tags : [];
                            const protocol =
                              specs.protocol ||
                              tags.find((t) =>
                                /zigbee|wifi|matter|bluetooth|lora|z-wave/i.test(t),
                              ) ||
                              "";
                            const power = specs.power || "";
                            const ecosystem = specs.ecosystem || "";

                            const customSpecs = Object.entries(specs)
                              .filter(isCustomSpec)
                              .map(([key, value]) => ({ key, value: String(value) }));

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
                              power,
                              ecosystem,
                              tags: tags.join(", "),
                              customSpecs,
                            });
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title="View product page"
                        >
                          <Link to="/products/$slug" params={{ slug: p.slug || p.id }}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => del(p.id)}
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
      )}

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {data?.length ?? 0} products.
      </p>
    </div>
  );
}
