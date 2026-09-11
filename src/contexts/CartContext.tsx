import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string;
  title: string;
  price_pkr: number;
  image_url: string | null;
  quantity: number;
  slug: string;
};

export type AddToCartOptions = {
  /** Defaults to true — slide-out cart opens after add. */
  openDrawer?: boolean;
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
const KEY = "nexus_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [justAddedAt, setJustAddedAt] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setItems(Array.isArray(parsed) ? parsed : []);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, hydrated]);

  useEffect(() => {
    if (!justAddedAt) return;
    const t = window.setTimeout(() => setJustAddedId(null), 2800);
    return () => window.clearTimeout(t);
  }, [justAddedAt]);

  const add: CartCtx["add"] = useCallback((item, qty = 1, options) => {
    const amount = Math.max(1, qty);
    setItems((prev) => {
      const ex = prev.find((p) => p.id === item.id);
      if (ex) {
        return prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + amount } : p));
      }
      return [...prev, { ...item, quantity: amount }];
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
    setItems((p) => p.map((i) => (i.id === id ? { ...i, quantity: qty } : i)));
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
