import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchProducts } from "@/api/products";
import { MOCK_PRODUCTS } from "@/lib/mock-products";
import { ProductCard, type Product } from "@/components/site/ProductCard";
import { CATEGORIES } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Camera,
  Cpu,
  Home,
  Radio,
  Wifi,
  Factory,
  Zap,
  Bot,
  ArrowRight,
  ShieldCheck,
  Truck,
  Headset,
  Printer,
  Wrench,
  CircuitBoard,
  Layers,
  Plug,
  Gauge,
  ChevronRight,
  Clock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: ["all-products"],
      queryFn: async () => {
        try {
          const data = await fetchProducts();
          return data as Product[];
        } catch {
          return MOCK_PRODUCTS as Product[];
        }
      },
    }),
  component: Index,
});

const CAT_ICONS: Record<string, LucideIcon> = {
  "3D Printers": Printer,
  Components: Cpu,
  "Development Boards": CircuitBoard,
  "Engineering Services": Layers,
  "Industrial Automation": Factory,
  "PCB Assembly Line": Layers,
  "Phoenix Contact": Plug,
  "Power Modules": Zap,
  Robotics: Bot,
  Sensors: Gauge,
  "Smart Home": Home,
  "Smart Boards": CircuitBoard,
  Tools: Wrench,
  "Custom Boards": Cpu,
  "Consumer Electronics": Radio,
  Printers: Printer,
  "Personal Safety": ShieldCheck,
  Motherboard: CircuitBoard,
};

const HOME_FEATURED_CATEGORIES = [
  {
    name: "Development Boards",
    description: "Arduino, Raspberry Pi, ESP32 & AI microcontrollers.",
    subs: [
      "Raspberry Pi",
      "ESP32 / MCU Boards",
      "Arduino Compatible",
      "Artificial Intelligence Boards",
    ],
    color:
      "from-cyan-50/10 to-primary/5 border-slate-200/60 hover:border-primary/45 hover:bg-primary/5",
    iconBg: "bg-primary/10 text-primary border border-primary/20",
    icon: CircuitBoard,
  },
  {
    name: "Components",
    description: "Semiconductors, connectors, passives & active ICs.",
    subs: ["Integrated Circuit", "Connectors", "Battery", "Converters"],
    color:
      "from-sky-50/10 to-primary/5 border-slate-200/60 hover:border-primary/45 hover:bg-primary/5",
    iconBg: "bg-primary/10 text-primary border border-primary/20",
    icon: Cpu,
  },
  {
    name: "Sensors",
    description: "Precision measurements for environmental & IoT nodes.",
    subs: ["Environmental Sensors", "Temperature Sensors", "Tuya Sensors", "Biometric Sensors"],
    color:
      "from-teal-50/10 to-primary/5 border-slate-200/60 hover:border-primary/45 hover:bg-primary/5",
    iconBg: "bg-primary/10 text-primary border border-primary/20",
    icon: Gauge,
  },
  {
    name: "Industrial Automation",
    description: "PLC systems, HMIs, smart switching & HVAC parts.",
    subs: [
      "Programmable Logic Controller (PLC)",
      "Human Machine Interface (HMI)",
      "PLC Expansion Module",
    ],
    color:
      "from-cyan-50/10 to-primary/5 border-slate-200/60 hover:border-primary/45 hover:bg-primary/5",
    iconBg: "bg-primary/10 text-primary border border-primary/20",
    icon: Factory,
  },
  {
    name: "Robotics",
    description: "Stepper motors, servo controllers & quadcopter kits.",
    subs: ["Motors", "Quadcopter Kits", "Robotic Kits", "Parts & Accessories"],
    color:
      "from-sky-50/10 to-primary/5 border-slate-200/60 hover:border-primary/45 hover:bg-primary/5",
    iconBg: "bg-primary/10 text-primary border border-primary/20",
    icon: Bot,
  },
  {
    name: "3D Printers",
    description: "Rapid prototyping filaments, parts & print services.",
    subs: ["3D Printer", "Filaments", "Parts & Accessories", "3D Printing Services"],
    color:
      "from-teal-50/10 to-primary/5 border-slate-200/60 hover:border-primary/45 hover:bg-primary/5",
    iconBg: "bg-primary/10 text-primary border border-primary/20",
    icon: Printer,
  },
];

const BANNERS = [
  {
    title: "MEGA IOT & ELECTRONICS",
    subtitle: "PAKISTAN'S LARGEST CATALOG",
    heading: "Smart Home, PLCs & Custom IoT Nodes",
    desc: "Direct delivery across Pakistan with full technical support & testing certifications.",
    bg: "from-slate-900 via-slate-800 to-sky-950 text-white",
    badge: "100% Genuine Parts",
    link: "/products",
  },
  {
    title: "DEVELOPER HARDWARE",
    subtitle: "IN STOCK NOW",
    heading: "Original Raspberry Pi 5 & MCU Boards",
    desc: "Complete ESP32 kits, Arduino boards, and high-frequency RF modules with code samples.",
    bg: "from-sky-600 via-blue-500 to-primary text-white",
    bgImage:
      "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?auto=format&fit=crop&w=1000&q=75&fm=webp",
    badge: "Fast Dispatch",
    link: "/products?category=Development Boards",
  },
  {
    title: "ENTERPRISE AUTOMATION",
    subtitle: "BULK PROCUREMENT & SOLUTIONS",
    heading: "Siemens PLCs, HMIs & Transducers",
    desc: "Sourcing enterprise automation with 1-Year official warranty and bulk GST invoices.",
    bg: "from-neutral-900 via-slate-800 to-slate-900 text-white",
    badge: "Business Pricing",
    link: "/iot-solutions",
  },
];

function FlashSaleTimer() {
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 48, seconds: 35 });

  useEffect(() => {
    const countdownTimer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 3, minutes: 0, seconds: 0 };
        }
      });
    }, 1000);
    return () => clearInterval(countdownTimer);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex items-center gap-1 text-xs font-mono">
      <span className="bg-slate-950 text-white font-bold px-2 py-1 rounded min-w-8 text-center">
        {pad(timeLeft.hours)}
      </span>
      <span className="font-bold text-white">:</span>
      <span className="bg-slate-950 text-white font-bold px-2 py-1 rounded min-w-8 text-center">
        {pad(timeLeft.minutes)}
      </span>
      <span className="font-bold text-white">:</span>
      <span className="bg-slate-950 text-white font-bold px-2 py-1 rounded min-w-8 text-center">
        {pad(timeLeft.seconds)}
      </span>
    </div>
  );
}

const CHANNELS = [
  {
    label: "Flash Sale",
    desc: "Limited Hourly Offers",
    icon: Zap,
    bg: "bg-sky-100/70 text-primary border border-sky-200/50",
    link: "#flash-sale",
  },
  {
    label: "Safe Shipping",
    desc: "Cash on Delivery",
    icon: Truck,
    bg: "bg-teal-50 text-teal-600 border border-teal-100",
    link: "/products",
  },
  {
    label: "B2B Bulk",
    desc: "Official Quotes & GST",
    icon: Cpu,
    bg: "bg-sky-50 text-sky-700 border border-sky-100",
    link: "/iot-solutions",
  },
  {
    label: "IoT Solutions",
    desc: "Engineering Deployments",
    icon: Factory,
    bg: "bg-slate-100 text-slate-700 border border-slate-200",
    link: "/iot-solutions",
  },
];

function Index() {
  const loaderData = Route.useLoaderData();
  // Query for all products
  const { data: products } = useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
      try {
        const data = await fetchProducts();
        return data as Product[];
      } catch {
        return MOCK_PRODUCTS as Product[];
      }
    },
    initialData: loaderData,
  });

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const slideTimer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % BANNERS.length);
    }, 5000);
    return () => clearInterval(slideTimer);
  }, []);

  const list = products || MOCK_PRODUCTS;

  // Filter for Flash Sale (Top Discounted Items)
  const flashSaleProducts = [...list]
    .filter((p) => p.availability === "in_stock")
    .sort((a, b) => b.discount_pct - a.discount_pct)
    .slice(0, 8);

  // Filter for Just For You (Active Items)
  const justForYouProducts = [...list].slice(0, 12);

  const SIDEBAR_CATEGORIES = [
    { name: "Development Boards", icon: CircuitBoard },
    { name: "Components", icon: Cpu },
    { name: "Sensors", icon: Gauge },
    { name: "Industrial Automation", icon: Factory },
    { name: "Robotics", icon: Bot },
    { name: "Smart Home", icon: Home },
    { name: "3D Printers", icon: Printer },
  ];

  return (
    <div className="bg-[#f4f4f6] min-h-screen pb-12">
      {/* Hero Section (Daraz Split Style Layout) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch lg:h-[390px]">
          {/* Left Vertical Categories Sidebar */}
          <div className="hidden lg:flex lg:col-span-3 bg-white rounded-lg border border-slate-200/60 p-4 shadow-sm flex-col justify-between h-full">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-3">
                IoT Categories
              </h3>
              <div className="space-y-0.5">
                {SIDEBAR_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <Link
                      key={cat.name}
                      to="/products"
                      search={{ category: cat.name } as never}
                      className="flex items-center justify-between px-2.5 py-2 rounded-md text-slate-700 hover:text-primary hover:bg-primary/5 font-semibold text-xs sm:text-sm transition duration-150 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4.5 w-4.5 text-slate-400 group-hover:text-primary shrink-0" />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition" />
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-slate-100 mt-2 pt-2 px-2">
              <Link
                to="/products"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                View All Categories <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Right Promotional Slider Banner */}
          <div className="lg:col-span-9 flex flex-col h-full">
            <div className="relative rounded-lg overflow-hidden border border-slate-200/50 shadow-sm aspect-[16/9] lg:aspect-auto h-full bg-slate-900 flex-1">
              {BANNERS.map((banner, index) => {
                const isActive = index === currentSlide;
                return (
                  <div
                    key={banner.title}
                    className={cn(
                      "absolute inset-0 p-6 sm:p-10 lg:p-12 flex flex-col justify-center transition-all duration-700 ease-in-out",
                      banner.bgImage ? "text-white" : cn("bg-gradient-to-r", banner.bg),
                      isActive
                        ? "opacity-100 scale-100 z-10"
                        : "opacity-0 scale-98 z-0 pointer-events-none",
                    )}
                    style={
                      banner.bgImage
                        ? {
                            backgroundImage: `linear-gradient(to right, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.7) 45%, rgba(15, 23, 42, 0.15) 100%), url(${banner.bgImage})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {}
                    }
                  >
                    {/* Glowing Accent Orb */}
                    <div className="absolute right-1/4 top-1/4 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

                    {/* Tech Graphic Background Accent */}
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-72 h-72 hidden md:flex items-center justify-center opacity-[0.07] pointer-events-none select-none">
                      <svg
                        className="w-full h-full text-white"
                        viewBox="0 0 100 100"
                        fill="none"
                        stroke="currentColor"
                      >
                        <circle cx="50" cy="50" r="40" strokeWidth="0.5" strokeDasharray="2 2" />
                        <circle cx="50" cy="50" r="30" strokeWidth="1" />
                        <circle cx="50" cy="50" r="20" strokeWidth="0.5" strokeDasharray="1 1" />
                        <path d="M50 0 V100 M0 50 H100" strokeWidth="0.25" />
                        <path
                          d="M15 15 L85 85 M15 85 L85 15"
                          strokeWidth="0.25"
                          strokeDasharray="2 2"
                        />
                      </svg>
                    </div>

                    <div className="max-w-xl relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="bg-white/20 backdrop-blur-md text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded text-white border border-white/10">
                          {banner.badge}
                        </span>
                        <span className="text-white/85 text-[10px] sm:text-xs font-bold tracking-wider uppercase">
                          {banner.title}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-3xl lg:text-4xl font-black text-white mt-3 leading-tight tracking-tight">
                        {banner.heading}
                      </h2>
                      <p className="text-white/85 text-xs sm:text-sm mt-3 leading-relaxed hidden sm:block max-w-lg">
                        {banner.desc}
                      </p>
                      <div className="mt-5 sm:mt-7">
                        <Button
                          asChild
                          size="sm"
                          className="bg-white hover:bg-slate-50 text-slate-900 font-bold px-5 sm:px-6 shadow-md hover:-translate-y-0.5 transition"
                        >
                          <Link to={banner.link}>
                            Shop Now <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Slider Dots */}
              <div className="absolute bottom-4 right-6 z-20 flex gap-2">
                {BANNERS.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={cn(
                      "h-1.5 sm:h-2 rounded-full transition-all duration-300",
                      idx === currentSlide ? "w-6 bg-white" : "w-1.5 sm:w-2 bg-white/40",
                    )}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Channels / Shortcuts Bar */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CHANNELS.map((item) => {
            const Icon = item.icon;
            const isHash = item.link.startsWith("#");
            const handleScroll = (e: React.MouseEvent) => {
              if (isHash) {
                e.preventDefault();
                const el = document.getElementById(item.link.substring(1));
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }
            };

            const ContentWrapper = (
              <div className="flex items-center gap-3 bg-white p-3.5 rounded-lg border border-slate-200/50 hover:shadow-sm hover:border-slate-300 transition duration-150 cursor-pointer group">
                <div className={cn("p-2.5 rounded-lg shrink-0", item.bg)}>
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight group-hover:text-primary transition">
                    {item.label}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            );

            return isHash ? (
              <a key={item.label} href={item.link} onClick={handleScroll}>
                {ContentWrapper}
              </a>
            ) : (
              <Link key={item.label} to={item.link as never}>
                {ContentWrapper}
              </Link>
            );
          })}
        </div>
      </section>

      {/* FLASH SALE Section (Daraz Ticking Style) */}
      <section id="flash-sale" className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
        <div className="bg-white rounded-lg border border-slate-200/60 shadow-sm overflow-hidden">
          {/* Flash Sale Header */}
          <div className="bg-gradient-to-r from-sky-600 via-primary to-blue-600 px-4 py-3 sm:py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1.5 font-black text-sm sm:text-lg tracking-tight uppercase italic bg-white text-primary px-3 py-1 rounded shadow-sm">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 fill-current animate-bounce" /> FLASH SALE
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-sky-50 hidden sm:inline">
                  ON SALE NOW | ENDING IN:
                </span>
                <FlashSaleTimer />
              </div>
            </div>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold shrink-0"
            >
              <Link to="/products">SHOP ALL DEALS →</Link>
            </Button>
          </div>

          {/* Flash Sale Grid */}
          <div className="p-4 bg-slate-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {flashSaleProducts.map((p, idx) => {
                return (
                  <div key={p.id} className="relative group">
                    <ProductCard p={p} priority={idx < 4} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Shop By Category Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
        <div className="bg-white rounded-lg border border-slate-200/60 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-primary uppercase tracking-wider bg-primary/10 px-2.5 py-0.5 rounded-full">
                <Sparkles className="h-3 w-3" /> Sourced & Insured
              </span>
              <h2 className="text-base sm:text-xl font-black text-slate-950 mt-1 tracking-tight">
                Shop By Category
              </h2>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-primary hover:text-primary/80 hover:bg-primary/5 text-xs font-bold self-start sm:self-auto -ml-3 sm:ml-0"
            >
              <Link to="/products">View All Departments →</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {HOME_FEATURED_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  to="/products"
                  search={{ category: cat.name } as never}
                  className="group relative flex items-center gap-3 bg-slate-50/40 hover:bg-primary/5 border border-slate-200/50 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-primary/40 transition-all duration-300"
                >
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0">
                    <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                      {cat.name}
                    </h3>
                    <span className="text-[9px] text-slate-400 group-hover:text-primary/90 font-bold tracking-wider uppercase mt-0.5 block transition-colors">
                      Browse →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Just For You (Main Catalog Recommendation Section) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-950 tracking-tight uppercase">
              Just For You
            </h2>
            <p className="text-slate-500 text-xs">Based on popular demand in Pakistan.</p>
          </div>
          <Link
            to="/products"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            See All Catalog <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {justForYouProducts.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* Trust Badges Footer Bar (Daraz Style) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-8">
        <div className="bg-white border border-slate-200/60 rounded-lg p-5 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: ShieldCheck,
              title: "100% Genuine Products",
              desc: "No copy or fake clones allowed.",
            },
            {
              icon: Truck,
              title: "Pan-Pakistan Cash On Delivery",
              desc: "Receive at door, inspect, pay.",
            },
            {
              icon: Headset,
              title: "Trained Support Specialists",
              desc: "Get setup configuration help.",
            },
            {
              icon: Cpu,
              title: "B2B Sourcing Network",
              desc: "GST Invoices, large volume discounts.",
            },
          ].map((badge, i) => {
            const Icon = badge.icon;
            return (
              <div key={i} className="flex gap-3">
                <div className="p-2 rounded-full bg-primary/5 text-primary shrink-0 h-10 w-10 grid place-items-center">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-950 leading-tight">
                    {badge.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{badge.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
