import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { saveLocalProduct } from "@/lib/mock-products";

import {
  ImageOptimizerUploader,
  MultiImageOptimizerUploader,
} from "@/components/ui/ImageOptimizerUploader";

import {
  TechnicalSpecsEditor,
  TechSpecItem,
  TechnicalSpecsData,
} from "@/components/product/TechnicalSpecsEditor";

const productSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  price_pkr: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z
      .number({ invalid_type_error: "Price must be a valid number" })
      .min(1, "Price must be greater than 0"),
  ),
  stock: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 50 : Number(val)),
    z
      .number({ invalid_type_error: "Stock must be a valid number" })
      .min(0, "Stock cannot be negative"),
  ),
  image_url: z.string().optional().or(z.literal("")),
  gallery_urls: z.array(z.string()).optional(),
  manufacturer: z.string().optional(),
  color: z.string().optional(),
  availability: z.enum(["in_stock", "on_demand", "coming_soon", "obsolete"]),
  discount_pct: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 0 : Number(val)),
    z.number().min(0).max(100).optional(),
  ),
});

type ProductValues = z.infer<typeof productSchema>;

export function ProductEditor({
  vendorId,
  product,
  open,
  onOpenChange,
}: {
  vendorId: string;
  product?: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [techSpecs, setTechSpecs] = useState<TechnicalSpecsData>({
    protocol: "Zigbee 3.0",
    power: "12V DC / Battery",
    ecosystem: "Tuya Smart / Smart Life",
    tags: "zigbee, smart-home",
    customSpecs: [
      { key: "Working Temperature", value: "-10°C to 55°C" },
      { key: "Operating Voltage", value: "12V DC / 3V Battery" },
      { key: "Warranty", value: "12 months manufacturer" },
    ],
  });

  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: product?.title || "",
      description: product?.description || "",
      category: product?.category || "Components",
      price_pkr: product?.price_pkr ?? ("" as any),
      stock: product?.stock ?? 50,
      image_url: product?.image_url || "",
      gallery_urls: product?.gallery_urls || [],
      manufacturer: product?.manufacturer || "",
      color: product?.color || "",
      availability: product?.availability || "in_stock",
      discount_pct: product?.discount_pct ?? ("" as any),
    },
  });

  // reset form when product changes
  useEffect(() => {
    if (product) {
      const specs = (
        product.specs && typeof product.specs === "object" ? product.specs : {}
      ) as Record<string, string>;
      const tags = Array.isArray(product.tags) ? product.tags : [];
      const protocol =
        specs.protocol ||
        tags.find((t) => /zigbee|wifi|matter|bluetooth|lora|z-wave/i.test(t)) ||
        "";
      const power = specs.power || "";
      const ecosystem = specs.ecosystem || "";

      const customSpecs = Object.entries(specs)
        .filter(([k]) => k !== "protocol" && k !== "power" && k !== "ecosystem")
        .map(([key, value]) => ({ key, value: String(value) }));

      setTechSpecs({
        protocol,
        power,
        ecosystem,
        tags: tags.join(", "),
        customSpecs,
      });

      form.reset({
        title: product.title || "",
        description: product.description || "",
        category: product.category || "Components",
        price_pkr: product.price_pkr ?? ("" as any),
        stock: product.stock ?? 50,
        image_url: product.image_url || "",
        gallery_urls: product.gallery_urls || [],
        manufacturer: product.manufacturer || "",
        color: product.color || "",
        availability: product.availability || "in_stock",
        discount_pct: product.discount_pct ?? ("" as any),
      });
    } else {
      setTechSpecs({
        protocol: "Zigbee 3.0",
        power: "12V DC / Battery",
        ecosystem: "Tuya Smart / Smart Life",
        tags: "zigbee, smart-home",
        customSpecs: [
          { key: "Working Temperature", value: "-10°C to 55°C" },
          { key: "Operating Voltage", value: "12V DC / 3V Battery" },
          { key: "Warranty", value: "12 months manufacturer" },
        ],
      });
      form.reset({
        title: "",
        description: "",
        category: "Components",
        price_pkr: "" as any,
        stock: 50,
        image_url: "",
        gallery_urls: [],
        manufacturer: "",
        color: "",
        availability: "in_stock",
        discount_pct: "" as any,
      });
    }
  }, [product, form]);

  const onSubmit = async (values: ProductValues) => {
    if (!vendorId) return toast.error("Vendor ID is missing");
    setLoading(true);

    try {
      const slug = values.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");

      const specsObj: Record<string, string> = {};
      if (techSpecs.protocol.trim()) specsObj.protocol = techSpecs.protocol.trim();
      if (techSpecs.power.trim()) specsObj.power = techSpecs.power.trim();
      if (techSpecs.ecosystem.trim()) specsObj.ecosystem = techSpecs.ecosystem.trim();
      (techSpecs.customSpecs || []).forEach((item) => {
        if (item.key.trim() && item.value.trim()) {
          specsObj[item.key.trim()] = item.value.trim();
        }
      });

      const tagsArr = techSpecs.tags
        ? techSpecs.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const payload = {
        ...values,
        gallery_urls: values.gallery_urls || [],
        vendor_id: vendorId,
        specs: specsObj,
        tags: tagsArr,
      };

      const targetId = product?.id || `mock-${Date.now()}`;
      const newSlug = product?.slug || `${slug}-${Math.floor(Math.random() * 10000)}`;

      const localProduct = {
        id: targetId,
        title: payload.title || "",
        slug: newSlug,
        description: payload.description || "",
        category: payload.category || "Components",
        price_pkr: Number(payload.price_pkr) || 0,
        stock: Number(payload.stock) || 50,
        image_url: payload.image_url || "",
        gallery_urls: payload.gallery_urls || [],
        manufacturer: payload.manufacturer || "",
        discount_pct: Number(payload.discount_pct) || 0,
        availability: payload.availability || "in_stock",
        rating: product?.rating || 4.5,
        color: payload.color || "",
        vendor_id: vendorId || "demo-vendor",
        specs: specsObj,
        tags: tagsArr,
      };

      // Always save locally so client catalog receives it immediately
      saveLocalProduct(localProduct as any);

      if (product?.id) {
        // Edit
        try {
          const { error } = await supabase
            .from("products")
            .update(payload)
            .eq("id", product.id)
            .eq("vendor_id", vendorId);
          if (error) console.warn("Supabase update error:", error);
        } catch (err: any) {
          console.warn("Supabase update failed, saved locally:", err);
        }
        toast.success("Product updated successfully");
      } else {
        // Add
        try {
          const { data, error } = await supabase
            .from("products")
            .insert({ ...payload, slug: newSlug })
            .select("id")
            .maybeSingle();
          if (!error && data?.id) {
            saveLocalProduct({ ...localProduct, id: data.id } as any);
          }
        } catch (err: any) {
          console.warn("Supabase insert failed, saved locally:", err);
        }
        toast.success("Product added successfully");
      }

      qc.invalidateQueries({ queryKey: ["vendor-products"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["all-products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["related"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Update your product details and multiple gallery images below."
              : "Fill in details and upload multiple images to list a new product."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Title</Label>
              <Input {...form.register("title")} placeholder="e.g. Smart Wi-Fi Plug" />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Description</Label>
              <Textarea {...form.register("description")} placeholder="Describe the product..." />
            </div>

            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label>Category</Label>
              <Input {...form.register("category")} placeholder="e.g. Smart Home" />
              {form.formState.errors.category && (
                <p className="text-xs text-destructive">{form.formState.errors.category.message}</p>
              )}
            </div>

            <div className="col-span-2 space-y-2">
              <MultiImageOptimizerUploader
                primaryImage={form.watch("image_url") || ""}
                onPrimaryImageChange={(url) =>
                  form.setValue("image_url", url, { shouldValidate: true })
                }
                galleryImages={form.watch("gallery_urls") || []}
                onGalleryImagesChange={(urls) =>
                  form.setValue("gallery_urls", urls, { shouldValidate: true })
                }
                label="Product Images & Multi-Angle Gallery"
                description="Upload multiple images for this product. Automatically converts files to WebP."
              />
              {form.formState.errors.image_url && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.image_url.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Price (PKR)</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 2500"
                {...form.register("price_pkr")}
              />
              {form.formState.errors.price_pkr && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.price_pkr.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Stock</Label>
              <Input type="number" min="0" placeholder="e.g. 50" {...form.register("stock")} />
              {form.formState.errors.stock && (
                <p className="text-xs text-destructive">{form.formState.errors.stock.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Manufacturer (Optional)</Label>
              <Input {...form.register("manufacturer")} />
            </div>

            <div className="space-y-2">
              <Label>Color (Optional)</Label>
              <Input {...form.register("color")} />
            </div>

            <div className="space-y-2">
              <Label>Availability</Label>
              <Select
                value={form.watch("availability")}
                onValueChange={(val: any) => form.setValue("availability", val)}
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

            <div className="space-y-2">
              <Label>Discount % (Optional)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 10"
                {...form.register("discount_pct")}
              />
            </div>

            <div className="col-span-2">
              <TechnicalSpecsEditor value={techSpecs} onChange={setTechSpecs} />
            </div>
          </div>

          <div className="flex justify-end pt-4 gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
