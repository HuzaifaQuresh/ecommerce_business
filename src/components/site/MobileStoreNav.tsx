import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, ShoppingCart, User2, Heart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/products", label: "Shop", icon: LayoutGrid },
  { to: "/cart", label: "Cart", icon: ShoppingCart },
] as const;

export function MobileStoreNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { count, setDrawerOpen } = useCart();
  const { count: wishlistCount, setDrawerOpen: setWishlistOpen } = useWishlist();
  const { user } = useAuth();

  const accountTo = user ? "/account" : "/auth";
  const accountLabel = user ? "Account" : "Sign in";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 w-full z-50 border-t bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around">
        {NAV.map(({ to, label, icon: Icon, ...rest }) => {
          const exact = "exact" in rest && rest.exact;
          const active = exact ? path === to : path === to || path.startsWith(`${to}/`);
          const isCart = to === "/cart";

          if (isCart) {
            return (
              <button
                key={to}
                type="button"
                onClick={() => setDrawerOpen(true)}
                className={cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors",
                  path === "/cart" ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
                {count > 0 && (
                  <span className="absolute top-1 right-[calc(50%-1.25rem)] grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>
            );
          }

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors min-h-[44px]",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setWishlistOpen(true)}
          className="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
        >
          <Heart className={cn("h-5 w-5", wishlistCount > 0 && "text-rose-500 fill-rose-500")} />
          Wishlist
          {wishlistCount > 0 && (
            <span className="absolute top-1 right-[calc(50%-1.25rem)] grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
              {wishlistCount > 9 ? "9+" : wishlistCount}
            </span>
          )}
        </button>

        <Link
          to={accountTo}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors min-h-[44px]",
            path.startsWith("/account") || path === "/auth"
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <User2 className="h-5 w-5" />
          {accountLabel}
        </Link>
      </div>
    </nav>
  );
}
