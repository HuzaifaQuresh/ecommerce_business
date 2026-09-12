import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";

export type CartItem = {
  id: string;
  title: string;
  price_pkr: number;
  image_url: string | null;
  quantity: number;
  slug: string;
  /** Max purchasable units when known (in_stock). */
  maxStock?: number;
};

export type AddToCartOptions = {
  /** Defaults to true — slide-out cart opens after add. */
  openDrawer?: boolean;
  /** Cap quantity for first-come stock (omit for on_demand). */
  maxStock?: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "quantity">, qty?: number, options?: AddToCartOptions) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  justAddedId: string | null;
};

const Ctx = createContext<CartCtx | null>(null);

const CART_BASE = "nexus_cart_v1";
const GUEST_KEY = `${CART_BASE}:guest`;

function storageKey(userId: string | null) {
  return userId ? `${CART_BASE}:u:${userId}` : GUEST_KEY;
}

function readCart(key: string): CartItem[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(key: string, items: CartItem[]) {
  localStorage.setItem(key, JSON.stringify(items));
}

function mergeCarts(a: CartItem[], b: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const item of [...a, ...b]) {
    const prev = map.get(item.id);
    if (!prev) {
      map.set(item.id, { ...item });
      continue;
    }
    const qty = prev.quantity + item.quantity;
    const max =
      typeof prev.maxStock === "number"
        ? prev.maxStock
        : typeof item.maxStock === "number"
          ? item.maxStock
          : undefined;
    map.set(item.id, {
      ...prev,
      ...item,
      quantity: max !== undefined ? Math.min(qty, max) : qty,
      maxStock: max,
    });
  }
  return [...map.values()];
}

/** One-time: old shared cart key → guest bucket so accounts no longer share it. */
function migrateLegacySharedCart() {
  try {
    const legacy = localStorage.getItem(CART_BASE);
    if (!legacy) return;
    if (!localStorage.getItem(GUEST_KEY)) {
      localStorage.setItem(GUEST_KEY, legacy);
    }
    localStorage.removeItem(CART_BASE);
  } catch {
    /* ignore */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [justAddedAt, setJustAddedAt] = useState(0);

  // Reload cart whenever the signed-in account changes (or becomes guest).
  useEffect(() => {
    if (typeof window === "undefined" || authLoading) return;

    migrateLegacySharedCart();

    if (userId) {
      const userCart = readCart(storageKey(userId));
      const guestCart = readCart(GUEST_KEY);
      const merged = guestCart.length ? mergeCarts(userCart, guestCart) : userCart;
      if (guestCart.length) {
        writeCart(storageKey(userId), merged);
        writeCart(GUEST_KEY, []);
      }
      setItems(merged);
    } else {
      setItems(readCart(GUEST_KEY));
    }
    setHydrated(true);
  }, [userId, authLoading]);

  useEffect(() => {
    if (!hydrated || authLoading || typeof window === "undefined") return;
    writeCart(storageKey(userId), items);
  }, [items, hydrated, userId, authLoading]);

  useEffect(() => {
    if (!justAddedAt) return;
    const t = window.setTimeout(() => setJustAddedId(null), 2800);
    return () => window.clearTimeout(t);
  }, [justAddedAt]);

  const add: CartCtx["add"] = useCallback((item, qty = 1, options) => {
    const amount = Math.max(1, qty);
    const max =
      typeof options?.maxStock === "number"
        ? Math.max(0, Math.floor(options.maxStock))
        : typeof item.maxStock === "number"
          ? Math.max(0, Math.floor(item.maxStock))
          : undefined;

    setItems((prev) => {
      const ex = prev.find((p) => p.id === item.id);
      if (ex) {
        const nextQty = ex.quantity + amount;
        const capped = max !== undefined ? Math.min(nextQty, max) : nextQty;
        return prev.map((p) =>
          p.id === item.id
            ? {
                ...p,
                quantity: Math.max(1, capped),
                maxStock: max ?? p.maxStock,
                slug: item.slug || p.slug,
              }
            : p,
        );
      }
      const initial = max !== undefined ? Math.min(amount, max) : amount;
      if (max !== undefined && max < 1) return prev;
      return [
        ...prev,
        {
          ...item,
          quantity: Math.max(1, initial),
          maxStock: max,
        },
      ];
    });
    setJustAddedId(item.id);
    setJustAddedAt(Date.now());
    if (options?.openDrawer !== false) setDrawerOpen(true);
  }, []);

  const remove = useCallback((id: string) => setItems((p) => p.filter((i) => i.id !== id)), []);
  const setQty = useCallback((id: string, qty: number) => {
    if (qty < 1) {
      setItems((p) => p.filter((i) => i.id !== id));
      return;
    }
    setItems((p) =>
      p.map((i) => {
        if (i.id !== id) return i;
        const max = typeof i.maxStock === "number" ? i.maxStock : undefined;
        const next = max !== undefined ? Math.min(qty, max) : qty;
        return { ...i, quantity: next };
      }),
    );
  }, []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: items.reduce((s, i) => s + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.quantity * i.price_pkr, 0),
      add,
      remove,
      setQty,
      clear,
      drawerOpen,
      setDrawerOpen,
      justAddedId,
    }),
    [items, add, remove, setQty, clear, drawerOpen, justAddedId],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside CartProvider");
  return v;
}
