import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Loader2, Sparkles, Tag } from "lucide-react";
import type { ProductRow } from "@/types/commerce";

interface ProductSearchBarProps {
  onResults?: (products: ProductRow[], query: string, category: string) => void;
  onSelectProduct?: (product: ProductRow) => void;
  className?: string;
  placeholder?: string;
}

export function ProductSearchBar({
  onResults,
  onSelectProduct,
  className = "",
  placeholder = "Search IoT devices, sensors, gateways by name or category...",
}: ProductSearchBarProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<ProductRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("category")
          .not("category", "is", null);

        if (!error && data) {
          const uniqueCats = Array.from(
            new Set(data.map((p) => p.category).filter(Boolean)),
          ) as string[];
          setCategories(uniqueCats);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    }
    fetchCategories();
  }, []);

  // Real-time Supabase query on query or category change
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        let dbQuery = supabase.from("products").select("*");

        if (query.trim()) {
          const searchTerm = `%${query.trim()}%`;
          dbQuery = dbQuery.or(
            `title.ilike.${searchTerm},description.ilike.${searchTerm},manufacturer.ilike.${searchTerm}`,
          );
        }

        if (category && category !== "all") {
          dbQuery = dbQuery.ilike("category", category);
        }

        const { data, error } = await dbQuery.limit(10);

        if (error) {
          console.error("Supabase search error:", error);
          setSuggestions([]);
          if (onResults) onResults([], query, category);
        } else {
          const results = (data || []) as ProductRow[];
          setSuggestions(results);
          if (onResults) onResults(results, query, category);
        }
      } catch (err) {
        console.error("Search query exception:", err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query, category, onResults]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    setQuery("");
    setCategory("all");
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className={`relative w-full ${className}`}>
      <div className="flex items-center gap-2 bg-card border rounded-xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="pl-9 pr-8 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm h-10 shadow-none"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!isSearching && query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Quick Filter Pill Selector */}
        <div className="hidden sm:flex items-center gap-1 border-l pl-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-muted/50 text-xs font-medium text-foreground rounded-lg px-2.5 py-2 border-0 outline-none cursor-pointer hover:bg-muted transition-colors"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Real-time dropdown suggestions */}
      {isOpen && (query.trim().length > 0 || category !== "all") && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover text-popover-foreground rounded-xl border shadow-xl z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2">
          <div className="p-2.5 border-b bg-muted/40 flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Real-time Supabase Results ({suggestions.length})
            </span>
            {category !== "all" && (
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Tag className="h-2.5 w-2.5" /> {category}
              </Badge>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y">
            {suggestions.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {isSearching ? "Searching Supabase..." : "No matching products found."}
              </div>
            ) : (
              suggestions.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    setIsOpen(false);
                    if (onSelectProduct) {
                      onSelectProduct(product);
                    } else {
                      window.location.href = `/product/${product.slug || product.id}`;
                    }
                  }}
                  className="flex items-center gap-3 p-3 hover:bg-muted/60 cursor-pointer transition-colors"
                >
                  <img
                    src={
                      product.image_url ||
                      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=100"
                    }
                    alt={product.title}
                    className="w-12 h-12 rounded-lg object-cover bg-muted shrink-0 border"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <h4
                      title={product.title}
                      className="text-sm font-semibold truncate text-foreground"
                    >
                      {product.title}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {product.category || "General"} • {product.manufacturer || "Verified OEM"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-primary">
                      Rs. {(product.price_pkr ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
