import { Link } from "@tanstack/react-router";
import { Heart, Trash2, ShoppingCart, ShoppingBag } from "lucide-react";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { fmtPKR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { optimizeProductImageUrl } from "@/lib/product-image";

export function WishlistDrawer() {
  const { items, drawerOpen, setDrawerOpen, removeWishlist, clearWishlist } = useWishlist();
  const { add } = useCart();

  const handleAddToCart = (i: (typeof items)[0]) => {
    add({
      id: i.id,
      title: i.title,
      price_pkr: i.price_pkr,
      image_url: i.image_url,
      slug: i.slug,
    });
    toast.success(`Added "${i.title}" to cart`);
  };

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 py-4 border-b flex flex-row items-center justify-between">
          <SheetTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500 fill-rose-500" /> Saved Wishlist ({items.length}
            )
          </SheetTitle>
          {items.length > 0 && (
            <button
              onClick={clearWishlist}
              className="text-xs text-muted-foreground hover:text-destructive transition mr-6"
            >
              Clear all
            </button>
          )}
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 grid place-items-center text-center p-8">
            <div>
              <Heart className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="mt-3 font-medium text-foreground">Your wishlist is empty</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Save items you like by clicking the ❤️ Wishlist icon on any product.
              </p>
              <Button className="mt-5" onClick={() => setDrawerOpen(false)} asChild>
                <Link to="/products">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Explore products
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary/30 transition shadow-sm"
                >
                  <Link
                    to="/products/$slug"
                    params={{ slug: i.slug }}
                    onClick={() => setDrawerOpen(false)}
                    className="h-16 w-16 rounded-lg bg-muted border overflow-hidden shrink-0 block"
                  >
                    <img
                      src={optimizeProductImageUrl(i.image_url, "card")}
                      alt={i.title}
                      className="h-full w-full object-cover"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      to="/products/$slug"
                      params={{ slug: i.slug }}
                      onClick={() => setDrawerOpen(false)}
                      className="block text-sm font-medium line-clamp-1 hover:text-primary transition-colors"
                    >
                      {i.title}
                    </Link>
                    <p className="text-sm text-primary font-bold mt-0.5">{fmtPKR(i.price_pkr)}</p>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddToCart(i)}
                        className="h-7 text-xs gap-1.5 px-2.5"
                      >
                        <ShoppingCart className="h-3.5 w-3.5 text-primary" /> Add to Cart
                      </Button>

                      <button
                        onClick={() => removeWishlist(i.id)}
                        className="p-1 text-muted-foreground hover:text-destructive transition"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t p-4 space-y-2 bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Wishlist items are saved in your browser for easy access anytime.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setDrawerOpen(false)}
                asChild
              >
                <Link to="/products">Continue Shopping</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
