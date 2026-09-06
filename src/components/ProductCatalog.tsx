import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProducts } from "@/api/products";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  SlidersHorizontal,
  Star,
  ShoppingCart,
  Eye,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { ProductRow } from "@/types/commerce";

interface ProductCatalogProps {
  initialCategory?: string;
  onProductClick?: (product: ProductRow) => void;
  className?: string;
}

export function ProductCatalog({
  initialCategory = "",
  onProductClick,
  className = "",
}: ProductCatalogProps) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [sortBy, setSortBy] = useState<string>("featured");
  const [maxPrice, setMaxPrice] = useState<number>(500000);
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Attempt direct Supabase query first
      const { data, error: sbError } = await supabase
        .from("products")
        .select("*")
        .order("title", { ascending: true });

      if (sbError) {
        console.warn(
          "Supabase products fetch warning, falling back to API helper:",
          sbError.message,
        );
        const fallbackData = await fetchProducts();
        setProducts(fallbackData as ProductRow[]);
      } else if (data && data.length > 0) {
        setProducts(data as ProductRow[]);
      } else {
        // If empty, use fetchProducts helper which merges mock/local
        const fallbackData = await fetchProducts();
        setProducts(fallbackData as ProductRow[]);
      }
    } catch (err: any) {
      console.error("Failed to load catalog:", err);
      setError(err?.message || "Failed to load product catalog");
      try {
        const fallbackData = await fetchProducts();
        setProducts(fallbackData as ProductRow[]);
      } catch {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Extract unique categories for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.manufacturer && p.manufacturer.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)),
      );
    }

    // Category filter
    if (selectedCategory && selectedCategory !== "all") {
      list = list.filter((p) => p.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Price filter
    list = list.filter((p) => (p.price_pkr ?? 0) <= maxPrice);

    // Availability filter
    if (availabilityFilter === "in_stock") {
      list = list.filter((p) => (p.stock ?? 0) > 0 || p.availability === "in_stock");
    } else if (availabilityFilter === "out_of_stock") {
      list = list.filter((p) => (p.stock ?? 0) === 0 && p.availability !== "in_stock");
    }

    // Sorting
    return list.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return (a.price_pkr ?? 0) - (b.price_pkr ?? 0);
        case "price-desc":
          return (b.price_pkr ?? 0) - (a.price_pkr ?? 0);
        case "rating":
          return (b.rating ?? 0) - (a.rating ?? 0);
        case "name":
          return (a.title ?? "").localeCompare(b.title ?? "");
        case "featured":
        default:
          return (b.discount_pct ?? 0) - (a.discount_pct ?? 0);
      }
    });
  }, [products, searchQuery, selectedCategory, sortBy, maxPrice, availabilityFilter]);

  const formatPKR = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("PKR", "Rs.");
  };

  return (
    <div className={`w-full max-w-7xl mx-auto px-4 py-8 space-y-6 ${className}`}>
      {/* Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Catalog</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Browse our verified IoT devices, sensors, gateways, and hardware modules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadProducts}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-card p-4 rounded-xl border shadow-sm">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Select */}
        <div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Select */}
        <div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured / Deals</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Availability Select */}
        <div>
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Availability</SelectItem>
              <SelectItem value="in_stock">In Stock Only</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active filters & results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
        <div>
          Showing <span className="font-semibold text-foreground">{filteredProducts.length}</span>{" "}
          of <span className="font-semibold text-foreground">{products.length}</span> products
        </div>
        {(searchQuery ||
          selectedCategory !== "all" ||
          sortBy !== "featured" ||
          availabilityFilter !== "all") && (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-primary"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSortBy("featured");
              setAvailabilityFilter("all");
            }}
          >
            Reset all filters
          </Button>
        )}
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-muted/60 animate-pulse border" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 border rounded-xl bg-card shadow-sm space-y-3">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h3 className="text-lg font-semibold">No products found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            We couldn't find any products matching your search criteria. Try adjusting your filters.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSortBy("featured");
              setAvailabilityFilter("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const inStock = (product.stock ?? 1) > 0 || product.availability === "in_stock";
            return (
              <Card
                key={product.id}
                className="group flex flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-card"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  <img
                    src={
                      product.image_url ||
                      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600"
                    }
                    alt={product.title}
                    className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {product.discount_pct && product.discount_pct > 0 ? (
                    <Badge className="absolute top-3 left-3 bg-red-600 text-white font-semibold">
                      -{product.discount_pct}%
                    </Badge>
                  ) : null}
                  <div className="absolute top-3 right-3">
                    <Badge
                      variant={inStock ? "secondary" : "destructive"}
                      className="text-[10px] font-medium shadow-sm"
                    >
                      {inStock ? "In Stock" : "Out of Stock"}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="p-4 pb-2 flex-1 space-y-1">
                  <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                    {product.category || product.manufacturer || "General"}
                  </div>
                  <h3
                    title={product.title}
                    className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 h-10 group-hover:text-primary transition-colors"
                  >
                    {product.title}
                  </h3>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-foreground">
                      {formatPKR(product.price_pkr ?? 0)}
                    </div>
                    {product.rating ? (
                      <div className="flex items-center gap-1 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                        <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        <span>{product.rating.toFixed(1)}</span>
                      </div>
                    ) : null}
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0 gap-2">
                  <Button
                    variant="default"
                    className="w-full h-9 text-xs font-medium gap-1.5"
                    onClick={() => {
                      if (onProductClick) {
                        onProductClick(product);
                      } else {
                        window.location.href = `/product/${product.slug || product.id}`;
                      }
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" /> View Details
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
