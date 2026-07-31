import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fmtPKR } from "@/lib/format";
import { getVendorMockProducts } from "@/lib/mock-data";
import { syncServerProducts } from "@/lib/mock-products";
import { DashboardPageHeader, ResponsiveScroll, EmptyState } from "@/components/site/PageLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Package, ExternalLink, AlertTriangle, Plus, Trash2, Edit } from "lucide-react";
import { ProductEditor } from "@/components/vendor/ProductEditor";

export const Route = createFileRoute("/vendor/products")({ component: VendorProducts });

function VendorProducts() {
  const { vendorId } = Route.useRouteContext();
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["vendor-products", vendorId],
    queryFn: async () => {
      await syncServerProducts();
      try {
        let q = supabase.from("products").select("*").order("created_at", { ascending: false });
        if (vendorId) q = q.eq("vendor_id", vendorId);
        const { data, error } = await q;
        if (error) throw error;
        if (data?.length) return data;
      } catch {
        /* demo */
      }
      return getVendorMockProducts(vendorId);
    },
  });

  const handleDelete = async (id: string) => {
    if (!vendorId) return toast.error("Cannot delete in demo mode");
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", id)
      .eq("vendor_id", vendorId);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    qc.invalidateQueries({ queryKey: ["vendor-products", vendorId] });
  };

  const handleAdd = () => {
    if (!vendorId) return toast.error("Cannot add in demo mode");
    setEditingProduct(null);
    setEditorOpen(true);
  };

  const handleEdit = (product: any) => {
    if (!vendorId) return toast.error("Cannot edit in demo mode");
    setEditingProduct(product);
    setEditorOpen(true);
  };

  const lowStock = (data ?? []).filter((p) => p.stock < 15).length;

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        title="My Products"
        description="Manage your product catalog, pricing, and stock."
        actions={
          <div className="flex items-center gap-3">
            {lowStock > 0 && (
              <Badge
                variant="outline"
                className="text-amber-600 border-amber-500/40 bg-amber-500/10"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {lowStock} low stock
              </Badge>
            )}
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </Button>
          </div>
        }
      />

      <ProductEditor
        vendorId={vendorId!}
        product={editingProduct}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />

      {isLoading ? (
        <div className="h-40 rounded-xl border bg-muted/30 animate-pulse" />
      ) : !data?.length ? (
        <EmptyState
          icon={Package}
          title="No products assigned"
          description="Click Add Product to start listing items."
          action={<Button onClick={handleAdd}>Add Product</Button>}
        />
      ) : (
        <ResponsiveScroll>
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-3 font-semibold">Product</th>
                <th className="p-3 font-semibold">Category</th>
                <th className="p-3 font-semibold">Price (PKR)</th>
                <th className="p-3 font-semibold">Stock</th>
                <th className="p-3 font-semibold">Status</th>
                <th className="p-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => {
                const isLow = p.stock < 15;
                return (
                  <tr key={p.id} className="border-t hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.title}
                            className="w-10 h-10 rounded object-cover bg-muted"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium line-clamp-1">{p.title}</div>
                          <div className="text-xs text-muted-foreground font-mono">{p.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{p.category}</td>
                    <td className="p-3">
                      <span className="tabular-nums">{fmtPKR(Number(p.price_pkr))}</span>
                    </td>
                    <td className="p-3">
                      <span className={isLow ? "text-amber-600 font-semibold" : "tabular-nums"}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                          p.availability === "in_stock"
                            ? "bg-emerald-500/10 text-emerald-700"
                            : isLow
                              ? "bg-amber-500/10 text-amber-700"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isLow
                          ? "Low stock"
                          : p.availability === "in_stock"
                            ? "In stock"
                            : p.availability}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => handleEdit(p)}
                        >
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="h-8 px-2">
                          <Link to="/products/$slug" params={{ slug: p.slug || p.id }}>
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </Link>
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

      {!vendorId && (
        <p className="text-sm text-muted-foreground bg-muted/50 border rounded-xl p-4">
          <strong className="text-foreground">Demo mode</strong> — showing sample catalog. A super
          admin can link your vendor account in Admin → Users & Roles to show your actual products.
        </p>
      )}
    </div>
  );
}
