import { Link } from "@tanstack/react-router";
import { Cpu, Mail, MapPin, Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

const COMPANY_LINKS = [
  { to: "/iot-solutions", label: "Enterprise Solutions" },
  { to: "/products", label: "Product Catalog" },
  { to: "/iot-solutions", label: "Request a Quote" },
  { to: "/auth", label: "Sign In / Sign Up" },
  { to: "/account/orders", label: "Order Tracking" },
];

export function Footer() {
  return (
    <footer className="mt-12 sm:mt-20 bg-slate-50 border-t border-slate-200 text-slate-600">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 sm:pt-14 pb-8 grid gap-8 sm:gap-10 grid-cols-1 md:grid-cols-3">
        {/* Brand */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground shrink-0">
              <Cpu className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold text-slate-800 tracking-tight">NexusIoT</span>
          </div>
          <p className="text-sm text-slate-500 max-w-lg leading-relaxed">
            Pakistan's premier IoT automation platform — from a single Tuya sensor to complete
            enterprise deployments across telecom, industrial, and smart home sectors.
          </p>

          {/* Contact */}
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <a href="mailto:sales@nexusiot.pk" className="hover:text-primary transition-colors">
                sales@nexusiot.pk
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>Islamabad, Pakistan</span>
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
                className="grid h-9 w-9 place-items-center rounded-lg bg-slate-200/60 hover:bg-primary hover:text-white transition-colors text-slate-500"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-slate-800 font-semibold mb-4 text-sm uppercase tracking-wide">
            Company
          </h4>
          <ul className="space-y-2.5 text-sm">
            {COMPANY_LINKS.map(({ to, label }) => (
              <li key={label}>
                <Link to={to} className="hover:text-primary transition-colors block">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-200 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-2 sm:justify-between text-xs text-slate-400">
          <span>
            © {new Date().getFullYear()} NexusIoT. All rights reserved. · Islamabad, Pakistan
          </span>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>PKR pricing</span>
            <span>GST inclusive</span>
            <span>Secure checkout</span>
            <span>Pan-Pakistan shipping</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
