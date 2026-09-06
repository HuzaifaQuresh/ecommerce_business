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
import { useSiteSettings } from "@/hooks/useSiteSettings";
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
  Check,
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
  "Smart Door Locks": ShieldCheck,
  "Smart Control Panels": Layers,
  "Smart Switches": Zap,
  "Smart Sockets & Plugs": Plug,
  "Smart Curtain Systems": Home,
  "Smart Thermostats": Gauge,
  "Smart Circuit Breakers": Zap,
  "Smart Security Cameras": Camera,
  "Smart Video Doorbells": Camera,
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
    name: "Smart Home",
    description:
      "Smart locks, control panels, wall switches, sockets, curtain motors & security cameras.",
    subs: [
      "Smart Door Locks",
      "Smart Control Panels",
      "Smart Switches",
      "Smart Sockets & Plugs",
      "Smart Curtain Systems",
      "Smart Thermostats",
      "Smart Security Cameras",
      "Smart Video Doorbells",
    ],
    color:
      "from-cyan-50/10 to-primary/5 border-slate-200/60 hover:border-primary/45 hover:bg-primary/5",
    iconBg: "bg-primary/10 text-primary border border-primary/20",
    icon: Home,
  },
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
    title: "SMARTZONE",
    subtitle: "PAKISTAN'S PREMIER IT & AUTOMATION PARTNER",
    heading: "We Are Best IT Services Provider For Your Business",
    desc: "A secure and reliable IT infrastructure is essential to the success of any business. We specialize in client service and are glad to help with any IT-related issues you may have.",
    bg: "from-[#0B192C] via-[#0F2C59] to-[#0052B4] text-white",
    badge: "Official Distributor",
    badgeColor: "bg-[#00A3E0]/20 text-[#00A3E0] border-[#00A3E0]/40",
    link: "/iot-solutions",
    buttonText: "CONTACT US",
  },
  {
    title: "SMART HOME & AUTOMATION",
    subtitle: "TUYA & INDUSTRIAL SENSORS",
    heading: "Advanced PLCs, Instrumentation & Smart Systems",
    desc: "Transform your operations with industry 4.0 automation, wireless IoT sensors, and certified enterprise deployments.",
    bg: "from-[#0B192C] via-[#0F2C59] to-[#0052B4] text-white",
    bgImage:
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=75&fm=webp",
    badge: "Top Rated",
    badgeColor: "bg-[#FF7A00]/20 text-[#FF7A00] border-[#FF7A00]/40",
    link: "/products",
    buttonText: "EXPLORE CATALOG",
  },
  {
    title: "ENTERPRISE INFRASTRUCTURE",
    subtitle: "PANEL BUILDERS & POWER SOLUTIONS",
    heading: "Inverter Drives, Relays & Engineering Hardware",
    desc: "Direct nationwide delivery across Pakistan with technical support, warranty, and commercial invoicing.",
    bg: "from-[#0B192C] via-[#0F2C59] to-[#0052B4] text-white",
    badge: "GST Invoices",
    badgeColor: "bg-[#00A3E0]/20 text-[#00A3E0] border-[#00A3E0]/40",
    link: "/iot-solutions",
    buttonText: "GET A QUOTE",
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
      <span className="bg-[#070F1A] text-white font-bold px-2 py-1 rounded min-w-8 text-center border border-white/10">
        {pad(timeLeft.hours)}
      </span>
      <span className="font-bold text-white">:</span>
      <span className="bg-[#070F1A] text-white font-bold px-2 py-1 rounded min-w-8 text-center border border-white/10">
        {pad(timeLeft.minutes)}
      </span>
      <span className="font-bold text-white">:</span>
      <span className="bg-[#070F1A] text-white font-bold px-2 py-1 rounded min-w-8 text-center border border-white/10">
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
    bg: "bg-orange-50 text-[#FF7A00] border border-orange-200",
    link: "#flash-sale",
  },
  {
    label: "Safe Shipping",
    desc: "Cash on Delivery",
    icon: Truck,
    bg: "bg-blue-50 text-[#0052B4] border border-blue-200",
    link: "/products",
  },
  {
    label: "B2B Bulk",
    desc: "Official Quotes & GST",
    icon: Cpu,
    bg: "bg-cyan-50 text-[#00A3E0] border border-cyan-200",
    link: "/iot-solutions",
  },
  {
    label: "IoT Solutions",
    desc: "Engineering Deployments",
    icon: Factory,
    bg: "bg-slate-100 text-[#0B192C] border border-slate-200",
    link: "/iot-solutions",
  },
];

function Index() {
  const loaderData = Route.useLoaderData();
  const { data: settings } = useSiteSettings();
  const customHeroBanner = settings?.hero_banner
    ? String(settings.hero_banner).replace(/"/g, "")
    : "";
  const dynamicBanners = [
    ...(customHeroBanner
      ? [
          {
            title: "FEATURED OFFER",
            subtitle: settings?.site_name ? `${settings.site_name} EXCLUSIVE` : "STORE EXCLUSIVE",
            heading: "Next-Gen IoT & Smart Hardware",
            desc: "High-performance components and development kits with lightning-fast delivery across Pakistan.",
            bg: "from-[#0B192C] via-[#0F2C59] to-[#0052B4] text-white",
            bgImage: customHeroBanner,
            badge: "Admin Configured",
            badgeColor: "bg-[#00A3E0]/20 text-[#00A3E0] border-[#00A3E0]/40",
            link: "/products",
            buttonText: "EXPLORE NOW",
          },
        ]
      : []),
    ...BANNERS,
  ];

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
      setCurrentSlide((prev) => (prev + 1) % dynamicBanners.length);
    }, 5000);
    return () => clearInterval(slideTimer);
  }, [dynamicBanners.length]);

  const list = products || MOCK_PRODUCTS;

  // Filter for Flash Sale (Top Discounted Items)
  const flashSaleProducts = [...list]
    .filter((p) => p.availability === "in_stock")
    .sort((a, b) => b.discount_pct - a.discount_pct)
    .slice(0, 8);

  // Filter for Just For You (Active Items)
  const justForYouProducts = [...list].slice(0, 12);

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-12">
      {/* Hero Section (Full Width Banner Layout) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="w-full lg:h-[390px]">
          {/* Promotional Slider Banner */}
          <div className="w-full flex flex-col h-full">
            <div className="relative rounded-lg overflow-hidden border border-slate-200/50 shadow-sm aspect-[16/9] lg:aspect-auto h-full bg-[#0B192C] flex-1">
              {dynamicBanners.map((banner, index) => {
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
                            backgroundImage: `linear-gradient(to right, rgba(11, 25, 44, 0.95) 0%, rgba(15, 44, 89, 0.75) 50%, rgba(0, 82, 180, 0.3) 100%), url(${banner.bgImage})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {}
                    }
                  >
                    {/* Glowing Accent Orb */}
                    <div className="absolute right-1/4 top-1/4 w-72 h-72 rounded-full bg-[#00A3E0]/20 blur-3xl pointer-events-none" />

                    {/* Tech Graphic Background Accent */}
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 w-72 h-72 hidden md:flex items-center justify-center opacity-[0.08] pointer-events-none select-none">
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
                        <span
                          className={cn(
                            "backdrop-blur-md text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border",
                            banner.badgeColor ||
                              "bg-[#00A3E0]/20 text-[#00A3E0] border-[#00A3E0]/40",
                          )}
                        >
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
                          className="bg-[#FF7A00] hover:bg-[#E56E00] text-white font-bold px-6 sm:px-8 py-2.5 rounded-md shadow-lg hover:-translate-y-0.5 transition uppercase tracking-wider text-xs sm:text-sm border-0"
                        >
                          <Link to={banner.link}>
                            {banner.buttonText || "Shop Now"}{" "}
                            <ArrowRight className="ml-2 h-4 w-4" />
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
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden">
          {/* Flash Sale Header */}
          <div className="bg-[#0B192C] border-b border-[#0F2C59] px-4 py-3 sm:py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-1.5 font-black text-sm sm:text-lg tracking-tight uppercase italic bg-[#FF7A00] text-white px-3 py-1 rounded shadow-xs">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 fill-current animate-bounce" /> FLASH SALE
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300 hidden sm:inline">
                  ON SALE NOW | ENDING IN:
                </span>
                <FlashSaleTimer />
              </div>
            </div>
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="bg-white/10 hover:bg-[#FF7A00] hover:text-white text-slate-200 border border-white/20 font-bold shrink-0 transition"
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
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-[#FF7A00] uppercase tracking-wider bg-[#FF7A00]/10 px-2.5 py-0.5 rounded-full">
                <Sparkles className="h-3 w-3" /> Certified & Tested
              </span>
              <h2 className="text-base sm:text-xl font-black text-[#0B192C] mt-1 tracking-tight">
                Shop By Category
              </h2>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-[#0052B4] hover:text-[#0052B4]/80 hover:bg-blue-50 text-xs font-bold self-start sm:self-auto -ml-3 sm:ml-0"
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
                  className="group relative flex items-center gap-3 bg-slate-50/40 hover:bg-[#0052B4]/5 border border-[#E2E8F0] rounded-xl p-3 shadow-xs hover:shadow-md hover:border-[#0052B4]/40 transition-all duration-300"
                >
                  <div className="p-2.5 rounded-lg bg-[#0052B4]/10 text-[#0052B4] group-hover:bg-[#0052B4] group-hover:text-white transition-all duration-300 shrink-0">
                    <Icon className="h-4.5 w-4.5" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-[#0B192C] group-hover:text-[#0052B4] transition-colors leading-snug line-clamp-2">
                      {cat.name}
                    </h3>
                    <span className="text-[9px] text-slate-400 group-hover:text-[#0052B4] font-bold tracking-wider uppercase mt-0.5 block transition-colors">
                      Browse →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* About SmartZone Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-8">
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-10 shadow-xs overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div>
                <span className="text-[#FF7A00] text-xs sm:text-sm font-black uppercase tracking-widest block mb-2">
                  ABOUT SMARTZONE
                </span>
                <h2 className="text-2xl sm:text-4xl font-black text-[#0B192C] tracking-tight leading-tight">
                  Years of Experience in Providing{" "}
                  <span className="relative inline-block text-[#0B192C] border-b-4 border-[#FF7A00] pb-0.5">
                    IT Solutions
                  </span>
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                Having served customers for over a decade, SmartZone has established itself as
                Pakistan&apos;s leading IT services provider, offering comprehensive, integrated
                solutions across a wide range of IT-related disciplines.
              </p>

              {/* 6 Key Capabilities Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                {[
                  "Supply of hardware & software",
                  "24/7 Support",
                  "Remote maintenance",
                  "IT-Monitoring",
                  "Fast on-site service",
                  "Quick Tips and Advice",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-[#0052B4] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-[#0B192C]">{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#FF7A00] hover:bg-[#E56E00] text-white font-bold px-8 py-3 rounded-md shadow-md hover:shadow-lg transition-all tracking-wider uppercase text-xs sm:text-sm border-0"
                >
                  <Link to="/iot-solutions">MORE ABOUT US</Link>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-xl border border-[#0F2C59] bg-[#0B192C] aspect-4/3 flex items-center justify-center p-6 text-white group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0052B4]/40 via-[#0F2C59]/90 to-[#0B192C] z-0" />
                <img
                  src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80"
                  alt="SmartZone IT and Automation"
                  className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-35 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="relative z-10 space-y-4 text-center">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FF7A00] text-white shadow-xl mx-auto ring-4 ring-[#FF7A00]/30">
                    <Cpu className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      World Class Tech & Support
                    </h3>
                    <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                      Custom tailored industrial computing, sensors, network gateways, and server
                      racks for modern enterprises.
                    </p>
                  </div>
                  <div className="flex justify-center gap-3 text-[11px] font-bold text-slate-300 pt-1">
                    <span className="bg-[#00A3E0]/20 text-[#00A3E0] px-2.5 py-1 rounded-full border border-[#00A3E0]/30">
                      10+ Yrs Exp
                    </span>
                    <span className="bg-[#FF7A00]/20 text-[#FF7A00] px-2.5 py-1 rounded-full border border-[#FF7A00]/30">
                      Nationwide
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Just For You (Main Catalog Recommendation Section) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-[#0B192C] tracking-tight uppercase">
              Just For You
            </h2>
            <p className="text-slate-500 text-xs">Based on popular demand in Pakistan.</p>
          </div>
          <Link
            to="/products"
            className="text-xs font-bold text-[#0052B4] hover:underline flex items-center gap-1"
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
