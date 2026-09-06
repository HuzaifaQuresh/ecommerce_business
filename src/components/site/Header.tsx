import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Cpu,
  Search,
  ShoppingCart,
  Heart,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  ChevronDown,
  Crown,
  Store,
  User2,
  Settings,
  Package,
  Mail,
  MapPin,
  Phone,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
} from "lucide-react";
import { SmartZoneLogo } from "@/components/site/SmartZoneLogo";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CategoryTreeNav } from "@/components/site/CategoryTreeNav";
import { CategoryNavBar } from "@/components/site/CategoryNavBar";
import { RoleBadge } from "@/components/dashboard/RoleBadge";
import { primaryRole } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { ContactUsDialog } from "@/components/site/ContactUsDialog";
import { TrackOrderDialog } from "@/components/site/TrackOrderDialog";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function Header() {
  const { count, setDrawerOpen } = useCart();
  const { count: wishlistCount, setDrawerOpen: setWishlistOpen } = useWishlist();
  const { user, roles, isAdmin, isSuperAdmin, isVendor, signOut } = useAuth();
  const { data: settings } = useSiteSettings();
  const siteName = String(settings?.site_name ?? "SmartZone").replace(/"/g, "");
  const siteLogoUrl = settings?.site_logo ? String(settings.site_logo).replace(/"/g, "") : "";
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [q, setQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);

  useEffect(() => {
    if (!path.startsWith("/products")) setQ("");
  }, [path]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/products", search: { q, category: undefined, sort: undefined } as never });
    setMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  // Avatar: initials from email or name
  const initials = user?.email ? user.email.slice(0, 2).toUpperCase() : "?";

  const primary = roles.length ? primaryRole(roles) : "user";

  const avatarColor: Record<string, string> = {
    super_admin: "bg-amber-500",
    admin: "bg-sky-500",
    vendor: "bg-emerald-500",
    user: "bg-primary",
  };

  return (
    <header className="sticky top-0 z-50 bg-white text-slate-800 border-b border-[#E2E8F0] shadow-xs overflow-visible">
      {/* SmartZone Logo Brand Accent Bar (Cyan -> Deep Blue -> Logo Arrow Orange) */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[#00A3E0] via-[#0052B4] to-[#FF7A00]" />

      {/* Top Banner Bar - Solid Deep Navy */}
      <div className="bg-[#0B192C] text-slate-300 text-[11px] py-2 border-b border-white/10 hidden md:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex justify-between items-center">
          <div className="flex gap-6 items-center">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-[#00A3E0]" />
              <a
                href="mailto:info@smartzone.pk"
                className="hover:text-[#00A3E0] transition-colors font-medium"
              >
                info@smartzone.pk
              </a>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#FF7A00]" />
              <span className="text-slate-300 font-medium">
                Office F26, 1st Floor, Mid City Mall, Rawalpindi
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="hover:text-[#FF7A00] transition cursor-pointer font-medium"
            >
              Contact Us
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={() => setTrackOpen(true)}
              className="hover:text-[#FF7A00] transition cursor-pointer font-medium"
            >
              Track Order
            </button>
            <span className="text-slate-700">|</span>
            <div className="flex gap-2">
              <a
                href="#"
                className="h-5 w-5 rounded-full bg-[#0F2C59] hover:bg-[#FF7A00] flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                <Facebook className="h-3 w-3" />
              </a>
              <a
                href="#"
                className="h-5 w-5 rounded-full bg-[#0F2C59] hover:bg-[#FF7A00] flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                <Twitter className="h-3 w-3" />
              </a>
              <a
                href="#"
                className="h-5 w-5 rounded-full bg-[#0F2C59] hover:bg-[#FF7A00] flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                <Instagram className="h-3 w-3" />
              </a>
              <a
                href="#"
                className="h-5 w-5 rounded-full bg-[#0F2C59] hover:bg-[#FF7A00] flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                <Linkedin className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4">
          {/* Mobile menu trigger */}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-slate-700 hover:bg-slate-100 shrink-0"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-full max-w-xs p-0 flex flex-col [&>button]:hidden"
            >
              <div className="border-b px-4 py-4 flex items-center justify-between bg-white">
                <Link to="/" onClick={() => setMenuOpen(false)}>
                  <SmartZoneLogo size="md" />
                </Link>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="bg-[#FF7A00] hover:bg-[#E56E00] text-white p-2 rounded flex items-center justify-center transition shadow-xs"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-1 text-sm bg-white">
                {[
                  { to: "/", label: "HOME" },
                  { to: "/iot-solutions", label: "ABOUT US" },
                  { to: "/products", label: "SERVICES / PRODUCTS", hasChevron: true },
                  { to: "/iot-solutions", label: "PROJECTS" },
                  { to: "/products", label: "BLOG & NEWS" },
                  { to: "/cart", label: `CART${count > 0 ? ` (${count})` : ""}` },
                ].map(({ to, label, hasChevron }) => (
                  <Link
                    key={to + label}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 font-bold transition-colors uppercase tracking-wider text-xs",
                      path === to
                        ? "text-[#FF7A00] bg-[#FF7A00]/10"
                        : "text-slate-800 hover:text-[#FF7A00] hover:bg-slate-50",
                    )}
                  >
                    <span>{label}</span>
                    {hasChevron && <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                  </Link>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setContactOpen(true);
                  }}
                  className="w-full text-left flex items-center justify-between px-3 py-2.5 font-bold transition-colors uppercase tracking-wider text-xs text-slate-800 hover:text-[#FF7A00] hover:bg-slate-50"
                >
                  CONTACT US
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setTrackOpen(true);
                  }}
                  className="w-full text-left flex items-center justify-between px-3 py-2.5 font-bold transition-colors uppercase tracking-wider text-xs text-slate-800 hover:text-[#FF7A00] hover:bg-slate-50"
                >
                  TRACK MY ORDER
                </button>

                <p className="px-3 pt-6 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#0052B4]">
                  Browse Categories
                </p>
                <CategoryTreeNav onSelect={() => setMenuOpen(false)} />
              </nav>
              {user ? (
                <div className="border-t p-4 space-y-2 bg-slate-50">
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <div className="flex flex-wrap gap-1">
                    {roles.map((r) => (
                      <RoleBadge key={r} role={r} size="sm" />
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to="/account" onClick={() => setMenuOpen(false)}>
                        Account
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setMenuOpen(false);
                        handleSignOut();
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t p-4 space-y-2 bg-slate-50">
                  <Button
                    asChild
                    className="w-full text-white bg-[#FF7A00] hover:bg-[#E56E00] font-bold"
                    size="sm"
                  >
                    <Link to="/auth" onClick={() => setMenuOpen(false)}>
                      Sign in / Login
                    </Link>
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 min-w-0 group"
            aria-label="SmartZone Home"
          >
            <SmartZoneLogo size="md" />
          </Link>

          {/* Mobile Spacer to push right-side elements to the right */}
          <div className="flex-1 md:hidden" />

          {/* Desktop search */}
          <form onSubmit={submit} className="hidden md:flex flex-1 max-w-2xl min-w-0 items-stretch">
            <div className="relative flex flex-1 items-stretch">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search cameras, sensors, smart home, development boards..."
                  aria-label="Search products, cameras, sensors and dev boards"
                  className="h-10 w-full bg-slate-50 text-slate-900 pl-10 pr-4 rounded-l-md rounded-r-none border border-slate-200 focus-visible:ring-[#0052B4] focus-visible:border-[#0052B4] focus-visible:bg-white transition-colors text-xs sm:text-sm"
                />
              </div>
              <Button
                type="submit"
                className="h-10 rounded-l-none rounded-r-md bg-[#FF7A00] hover:bg-[#E56E00] px-6 text-white text-xs sm:text-sm font-bold shrink-0 shadow-xs transition-all border-0"
              >
                Search
              </Button>
            </div>
          </form>

          {/* Discuss Your Project Widget */}
          <div className="hidden xl:flex items-center gap-2.5 shrink-0 pl-2">
            <a
              href="tel:03125676066"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FF7A00] text-white shadow-xs hover:bg-[#E56E00] transition"
            >
              <Phone className="h-4 w-4" />
            </a>
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Discuss Your Project
              </p>
              <a
                href="tel:03125676066"
                className="text-xs font-bold text-[#0B192C] hover:text-[#FF7A00] transition"
              >
                03125676066
              </a>
            </div>
          </div>

          {/* Wishlist button */}
          <button
            type="button"
            onClick={() => setWishlistOpen(true)}
            className="relative hidden sm:inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 min-h-[44px] hover:bg-slate-100 transition text-slate-700"
            aria-label={`Wishlist, ${wishlistCount} items`}
          >
            <Heart className={cn("h-5 w-5", wishlistCount > 0 && "text-rose-500 fill-rose-500")} />
            <span className="hidden lg:inline text-sm">Wishlist</span>
            {wishlistCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 text-white text-[10px] font-bold px-1">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart button */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="relative hidden md:inline-flex items-center gap-2 rounded-md px-3 py-2 min-h-[44px] hover:bg-slate-100 transition text-slate-700"
            aria-label={`Cart, ${count} items`}
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="hidden lg:inline text-sm">Cart</span>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#FF7A00] text-white text-[10px] font-bold px-1">
                {count}
              </span>
            )}
          </button>

          {/* User menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition min-h-[44px] shrink-0 text-slate-700"
                >
                  <div
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-full text-white text-xs font-bold shrink-0",
                      avatarColor[primary] ?? "bg-[#0052B4]",
                    )}
                  >
                    {initials}
                  </div>
                  <span className="hidden sm:block text-sm max-w-[7rem] truncate">
                    {user.email?.split("@")[0]}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="pb-1">
                  <p className="text-sm font-semibold truncate">{user.email?.split("@")[0]}</p>
                  <p className="text-xs text-muted-foreground font-normal truncate">{user.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {roles.map((r) => (
                      <RoleBadge key={r} role={r} size="sm" />
                    ))}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate({ to: "/account" })}>
                  <User2 className="h-4 w-4 mr-2 shrink-0" /> My Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/account/orders" })}>
                  <Package className="h-4 w-4 mr-2 shrink-0" /> My Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setWishlistOpen(true)}>
                  <Heart className="h-4 w-4 mr-2 shrink-0 text-rose-500 fill-rose-500" /> Saved
                  Wishlist ({wishlistCount})
                </DropdownMenuItem>

                {isVendor && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/vendor" })}>
                    <Store className="h-4 w-4 mr-2 shrink-0" /> Vendor Dashboard
                  </DropdownMenuItem>
                )}

                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                      {isSuperAdmin ? (
                        <Crown className="h-4 w-4 mr-2 shrink-0 text-amber-500" />
                      ) : (
                        <LayoutDashboard className="h-4 w-4 mr-2 shrink-0" />
                      )}
                      {isSuperAdmin ? "Super Admin" : "Admin Dashboard"}
                    </DropdownMenuItem>
                    {isSuperAdmin && (
                      <DropdownMenuItem onClick={() => navigate({ to: "/admin/users" })}>
                        <Settings className="h-4 w-4 mr-2 shrink-0" /> Users & Roles
                      </DropdownMenuItem>
                    )}
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2 shrink-0" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              asChild
              size="sm"
              className="inline-flex shrink-0 text-xs sm:text-sm px-2.5 sm:px-4 bg-[#0052B4] hover:bg-[#003E8A] text-white font-semibold"
            >
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>

        {/* Mobile search */}
        <form onSubmit={submit} className="md:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="h-10 bg-slate-50 text-slate-900 pl-9 border border-slate-200 w-full"
            />
          </div>
        </form>
      </div>

      <CategoryNavBar />

      {contactOpen && <ContactUsDialog open={contactOpen} onOpenChange={setContactOpen} />}
      {trackOpen && <TrackOrderDialog open={trackOpen} onOpenChange={setTrackOpen} />}
    </header>
  );
}
