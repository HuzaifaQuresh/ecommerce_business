import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Facebook, Instagram, Linkedin, Youtube } from "lucide-react";
import { SmartZoneLogo } from "@/components/site/SmartZoneLogo";

const COMPANY_LINKS = [
  { to: "/products", label: "All Smart Products" },
  { to: "/iot-solutions", label: "Smart Home & Automation" },
  { to: "/iot-solutions", label: "Request a Business Quote" },
  { to: "/auth", label: "Customer Account" },
  { to: "/account/orders", label: "Track My Order" },
];

export function Footer() {
  return (
    <footer className="mt-12 sm:mt-20 bg-[#0B192C] text-slate-300 relative">
      {/* Brand Gradient Accent Bar matching the SmartZone Logo (Cyan -> Deep Blue -> Logo Arrow Orange) */}
      <div className="h-1 w-full bg-gradient-to-r from-[#00A3E0] via-[#0052B4] to-[#FF7A00]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 sm:pt-14 pb-8 grid gap-8 sm:gap-10 grid-cols-1 md:grid-cols-3">
        {/* Brand */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <SmartZoneLogo size="md" dark />
          </div>
          <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
            SmartZone is Pakistan's premier smart automation, IoT devices, and electronics platform.
            Delivering cutting-edge smart home automation, security cameras, smart switches,
            sensors, and custom enterprise IoT deployments.
          </p>

          {/* Contact */}
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#FF7A00] shrink-0" />
              <a
                href="mailto:sales@smartzone.pk"
                className="hover:text-[#00A3E0] transition-colors text-slate-300"
              >
                sales@smartzone.pk
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#FF7A00] shrink-0" />
              <a
                href="tel:+923323059259"
                className="hover:text-[#00A3E0] transition-colors text-slate-300"
              >
                +92 332 3059259 / +92 51 8431111
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-[#FF7A00] shrink-0 mt-0.5" />
              <span className="text-slate-300">
                Office F26, 1st Floor, Mid City Mall, Rawalpindi / Islamabad, Pakistan
              </span>
            </li>
          </ul>

          {/* Social */}
          <div className="flex gap-3 pt-1">
            {[
              { Icon: Facebook, href: "#", label: "Facebook" },
              { Icon: Instagram, href: "#", label: "Instagram" },
              { Icon: Linkedin, href: "#", label: "LinkedIn" },
              { Icon: Youtube, href: "#", label: "YouTube" },
            ].map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-lg bg-[#0F2C59] hover:bg-[#FF7A00] hover:text-white transition-colors text-slate-300 border border-white/5"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00A3E0]" />
            Quick Links
          </h4>
          <ul className="space-y-2.5 text-sm">
            {COMPANY_LINKS.map(({ to, label }) => (
              <li key={label}>
                <Link
                  to={to}
                  className="hover:text-[#FF7A00] transition-colors block text-slate-300"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-2 sm:justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} SmartZone. All rights reserved.</span>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400">
            <span className="text-[#00A3E0] font-medium">PKR Official Pricing</span>
            <span>Commercial Invoices</span>
            <span>Secure Delivery</span>
            <span>Nationwide Coverage</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
