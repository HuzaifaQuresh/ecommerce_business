import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Cpu,
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
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SmartZoneLogo } from "@/components/site/SmartZoneLogo";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
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
import { initialsFromDisplayName, shortDisplayName } from "@/lib/auth-profile";
import { cn } from "@/lib/utils";
import { ContactUsDialog } from "@/components/site/ContactUsDialog";
import { TrackOrderDialog } from "@/components/site/TrackOrderDialog";
import { HeaderSearch } from "@/components/site/HeaderSearch";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  contactEmailFromSettings,
  officeAddressFromSettings,
  officeMapsUrlFromSettings,
  socialLinksFromSettings,
  visibleSocials,
  type SocialNetwork,
} from "@/lib/storefront-contact";
import { OPEN_CONTACT_EVENT } from "@/lib/storefront-link";

const HEADER_SOCIAL_ICONS: Record<SocialNetwork, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  twitter: Twitter,
};

export function Header() {
  const { count, setDrawerOpen } = useCart();
  const { count: wishlistCount, setDrawerOpen: setWishlistOpen } = useWishlist();
  const { user, displayName, roles, isAdmin, isSuperAdmin, isVendor, signOut } = useAuth();
  const { data: settings } = useSiteSettings();
  const siteName = String(settings?.site_name ?? "SmartZone").replace(/"/g, "");
  const siteLogoUrl = settings?.site_logo ? String(settings.site_logo).replace(/"/g, "") : "";
  const contactEmail = contactEmailFromSettings(settings);
  const officeAddress = officeAddressFromSettings(settings);
  const officeMapsUrl = officeMapsUrlFromSettings(settings);
  const headerSocials = visibleSocials(socialLinksFromSettings(settings));
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [trackOpen, setTrackOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const sync = () => {
      document.documentElement.style.setProperty("--sz-header-height", `${el.offsetHeight}px`);
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--sz-header-height");
    };
  }, []);

  useEffect(() => {
    const onOpenContact = () => setContactOpen(true);
    window.addEventListener(OPEN_CONTACT_EVENT, onOpenContact);
    return () => window.removeEventListener(OPEN_CONTACT_EVENT, onOpenContact);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const initials = initialsFromDisplayName(displayName);
  const headerName = shortDisplayName(displayName);

  const primary = roles?.length ? primaryRole(roles) : "user";

  const avatarColor: Record<string, string> = {
    super_admin: "bg-amber-500",
    admin: "bg-sky-500",
    vendor: "bg-emerald-500",
    user: "bg-primary",
  };

  return (
    <header
      ref={headerRef}
      className="fixed top-0 left-0 right-0 z-50 bg-white text-slate-800 border-b border-[#E2E8F0] shadow-xs overflow-visible"
    >
      {/* SmartZone Logo Brand Accent Bar (Cyan -> Deep Blue -> Logo Arrow Orange) */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[#00A3E0] via-[#0052B4] to-[#FF7A00]" />

      {/* Top Banner Bar - Solid Deep Navy */}
      <div className="bg-[#0B192C] text-slate-300 text-[11px] py-2 border-b border-white/10 hidden md:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex justify-between items-center">
          <div className="flex gap-6 items-center">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-[#00A3E0]" />
              <a
                href={`mailto:${contactEmail}`}
                className="hover:text-[#00A3E0] transition-colors font-medium"
              >
                {contactEmail}
              </a>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-[#FF7A00] shrink-0" />
              {officeMapsUrl ? (
                <a
                  href={officeMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 font-medium truncate max-w-[28rem] hover:text-[#00A3E0] transition-colors"
                >
                  {officeAddress}
                </a>
              ) : (
                <span className="text-slate-300 font-medium truncate max-w-[28rem]">
                  {officeAddress}
                </span>
              )}
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
            {headerSocials.length > 0 ? (
              <>
                <span className="text-slate-700">|</span>
                <div className="flex gap-2">
                  {headerSocials.map(({ id, href, label }) => {
                    const Icon = HEADER_SOCIAL_ICONS[id];
                    return (
                      <a
                        key={id}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={label}
                        className="h-5 w-5 rounded-full bg-[#0F2C59] hover:bg-[#FF7A00] flex items-center justify-center text-slate-300 hover:text-white transition"
                      >
                        <Icon className="h-3 w-3" />
                      </a>
                    );
                  })}
                </div>
              </>
            ) : null}
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
                  { to: "/iot-solutions", hash: "about", label: "ABOUT US" },
                  { to: "/products", label: "SERVICES / PRODUCTS", hasChevron: true },
                  { to: "/iot-solutions", hash: "projects", label: "PROJECTS" },
                  { to: "/iot-solutions", label: "IOT SOLUTIONS" },
                  { to: "/cart", label: `CART${count > 0 ? ` (${count})` : ""}` },
                ].map(({ to, label, hasChevron, hash }) => (
                  <Link
                    key={to + label}
                    to={to}
                    hash={hash}
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
                  <p className="text-sm font-semibold truncate">{displayName}</p>
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
                    <Link to="/auth" resetScroll onClick={() => setMenuOpen(false)}>
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

          <HeaderSearch variant="desktop" />

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
                  <span className="hidden sm:block text-sm max-w-[9rem] truncate font-medium">
                    {headerName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="pb-1">
                  <p className="text-sm font-semibold truncate">{displayName}</p>
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
              <Link to="/auth" resetScroll>
                Sign in
              </Link>
            </Button>
          )}
        </div>

        <div className="md:hidden pb-3">
          <HeaderSearch variant="mobile" />
        </div>
      </div>

      <CategoryNavBar />

      {contactOpen && <ContactUsDialog open={contactOpen} onOpenChange={setContactOpen} />}
      {trackOpen && <TrackOrderDialog open={trackOpen} onOpenChange={setTrackOpen} />}
    </header>
  );
}
