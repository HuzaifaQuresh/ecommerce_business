import React, { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

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

const WISHLIST_BASE = "nexusiot_wishlist_v1";
const GUEST_KEY = `${WISHLIST_BASE}:guest`;

function storageKey(userId: string | null) {
  return userId ? `${WISHLIST_BASE}:u:${userId}` : GUEST_KEY;
}

function readWishlist(key: string): WishlistItem[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWishlist(key: string, items: WishlistItem[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

function mergeWishlists(a: WishlistItem[], b: WishlistItem[]): WishlistItem[] {
  const map = new Map<string, WishlistItem>();
  for (const item of [...a, ...b]) {
    map.set(item.id, item);
  }
  return [...map.values()];
}

function migrateLegacySharedWishlist() {
  try {
    const legacy = localStorage.getItem(WISHLIST_BASE);
    if (!legacy) return;
    if (!localStorage.getItem(GUEST_KEY)) {
      localStorage.setItem(GUEST_KEY, legacy);
    }
    localStorage.removeItem(WISHLIST_BASE);
  } catch {
    /* ignore */
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || authLoading) return;

    migrateLegacySharedWishlist();

    if (userId) {
      const userList = readWishlist(storageKey(userId));
      const guestList = readWishlist(GUEST_KEY);
      const merged = guestList.length ? mergeWishlists(userList, guestList) : userList;
      if (guestList.length) {
        writeWishlist(storageKey(userId), merged);
        writeWishlist(GUEST_KEY, []);
      }
      setItems(merged);
    } else {
      setItems(readWishlist(GUEST_KEY));
    }
    setHydrated(true);
  }, [userId, authLoading]);

  useEffect(() => {
    if (!hydrated || authLoading) return;
    try {
      writeWishlist(storageKey(userId), items);
    } catch (e) {
      console.warn("Failed to persist wishlist:", e);
    }
  }, [items, hydrated, userId, authLoading]);

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
