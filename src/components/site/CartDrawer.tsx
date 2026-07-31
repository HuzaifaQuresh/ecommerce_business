import { Link } from "@tanstack/react-router";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { fmtPKR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function CartDrawer() {
  const { items, drawerOpen, setDrawerOpen, setQty, remove, subtotal } = useCart();

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" /> Your Cart ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 grid place-items-center text-center p-8">
            <div>
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="mt-3 text-muted-foreground">Your cart is empty</p>
              <Button className="mt-4" onClick={() => setDrawerOpen(false)} asChild>
                <Link to="/products">Browse products</Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((i) => (
                <div key={i.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                  {i.image_url && (
                    <img
                      src={i.image_url}
                      alt={i.title}
                      className="h-16 w-16 rounded object-cover shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{i.title}</p>
                    <p className="text-sm text-primary font-semibold mt-1">{fmtPKR(i.price_pkr)}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center border rounded">
                        <button
                          onClick={() => setQty(i.id, i.quantity - 1)}
                          className="px-2 py-1 hover:bg-muted"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-3 text-sm">{i.quantity}</span>
                        <button
                          onClick={() => setQty(i.id, i.quantity + 1)}
                          className="px-2 py-1 hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        onClick={() => remove(i.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t p-5 space-y-3 bg-muted/40">
              <div className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span className="text-primary">{fmtPKR(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Shipping calculated at checkout.</p>
              <Button asChild className="w-full" onClick={() => setDrawerOpen(false)}>
                <Link to="/checkout">Checkout</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full"
                onClick={() => setDrawerOpen(false)}
              >
                <Link to="/cart">View full cart</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
