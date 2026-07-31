import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";

export type WishlistItem = {
  id: string;
  title: string;
  price_pkr: number;
  image_url?: string | null;
  slug: string;
  category?: string;
};

type WishlistContextType = {
  items: WishlistItem[];
  wishlistIds: string[];
  isWishlisted: (id: string) => boolean;
  toggleWishlist: (item: WishlistItem) => void;
  removeWishlist: (id: string) => void;
  clearWishlist: () => void;
  count: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "nexusiot_wishlist_v1";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to persist wishlist:", e);
    }
  }, [items]);

  const wishlistIds = items.map((i) => i.id);

  const isWishlisted = (id: string) => items.some((i) => i.id === id);

  const toggleWishlist = (item: WishlistItem) => {
    if (isWishlisted(item.id)) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.info(`Removed "${item.title}" from wishlist`);
    } else {
      setItems((prev) => [...prev, item]);
      toast.success(`Added "${item.title}" to wishlist ❤️`);
    }
  };

  const removeWishlist = (id: string) => {
    const item = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (item) {
      toast.info(`Removed "${item.title}" from wishlist`);
    }
  };

  const clearWishlist = () => {
    setItems([]);
    toast.info("Wishlist cleared");
  };

  return (
    <WishlistContext.Provider
      value={{
        items,
        wishlistIds,
        isWishlisted,
        toggleWishlist,
        removeWishlist,
        clearWishlist,
        count: items.length,
        drawerOpen,
        setDrawerOpen,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return ctx;
}
