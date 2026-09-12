import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Facebook, Instagram, Linkedin, Youtube, Twitter } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SmartZoneLogo } from "@/components/site/SmartZoneLogo";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { cleanSetting, toWhatsAppDigits } from "@/lib/whatsapp";
import {
  contactEmailFromSettings,
  officeAddressFromSettings,
  officeMapsUrlFromSettings,
  socialLinksFromSettings,
  visibleSocials,
  type SocialNetwork,
} from "@/lib/storefront-contact";

const COMPANY_LINKS = [
  { to: "/products", label: "All Smart Products" },
  { to: "/iot-sensors", label: "IoT Sensors Pakistan" },
  { to: "/smart-home", label: "Smart Home" },
  { to: "/automations", label: "Automations" },
  { to: "/iot-solutions", hash: "about", label: "IoT Solutions Install" },
  { to: "/iot-solutions", hash: "quote", label: "Request a Business Quote" },
  { to: "/auth", label: "Customer Account" },
  { to: "/vendor/auth", label: "Seller Center" },
  { to: "/account/orders", label: "Track My Order" },
];

const SEO_SHOP_LINKS = [
  { to: "/zigbee-sensors", label: "Zigbee sensors" },
  { to: "/wifi-sensors", label: "WiFi sensors" },
  { to: "/mqtt-sensors", label: "MQTT sensors" },
  { to: "/tuya-sensors", label: "Tuya sensor Pakistan" },
  { to: "/iot-devices", label: "IoT devices Pakistan" },
  { to: "/", label: "SmartZone (smartzone.pk)" },
] as const;

const SOCIAL_ICONS: Record<SocialNetwork, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  twitter: Twitter,
};

export function Footer() {
  const { data: settings } = useSiteSettings();
  const email = contactEmailFromSettings(settings);
  const phone =
    cleanSetting(settings?.contact_phone) ||
    cleanSetting(settings?.whatsapp_number, "+92 332 3059259") ||
    "+92 332 3059259";
  const tel = `+${toWhatsAppDigits(phone)}`;
  const address = officeAddressFromSettings(settings);
  const mapsUrl = officeMapsUrlFromSettings(settings);
  const socials = visibleSocials(socialLinksFromSettings(settings));

  return (
    <footer className="mt-12 sm:mt-20 bg-[#0B192C] text-slate-300 relative">
      {/* Brand Gradient Accent Bar matching the SmartZone Logo (Cyan -> Deep Blue -> Logo Arrow Orange) */}
      <div className="h-1 w-full bg-gradient-to-r from-[#00A3E0] via-[#0052B4] to-[#FF7A00]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 sm:pt-14 pb-8 grid gap-8 sm:gap-10 grid-cols-1 md:grid-cols-4">
        {/* Brand */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <SmartZoneLogo size="md" dark />
          </div>
          <p className="text-sm text-slate-300 max-w-lg leading-relaxed">
            SmartZone (smartzone.pk) is Pakistan&apos;s smart home, IoT sensors, and electronics
            store — Zigbee, WiFi, MQTT and Tuya sensors, automations, CCTV, and custom IoT
            deployments from Blue Area, Islamabad.
          </p>

          {/* Contact */}
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#FF7A00] shrink-0" />
              <a
                href={`mailto:${email}`}
                className="hover:text-[#00A3E0] transition-colors text-slate-300"
              >
                {email}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#FF7A00] shrink-0" />
              <a
                href={`tel:${tel}`}
                className="hover:text-[#00A3E0] transition-colors text-slate-300"
              >
                {phone}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-[#FF7A00] shrink-0 mt-0.5" />
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#00A3E0] transition-colors text-slate-300"
                >
                  {address}
                </a>
              ) : (
                <span className="text-slate-300">{address}</span>
              )}
            </li>
          </ul>

          {socials.length > 0 ? (
            <div className="flex gap-3 pt-1">
              {socials.map(({ id, href, label }) => {
                const Icon = SOCIAL_ICONS[id];
                return (
                  <a
                    key={id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid h-9 w-9 place-items-center rounded-lg bg-[#0F2C59] hover:bg-[#FF7A00] hover:text-white transition-colors text-slate-300 border border-white/5"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Company */}
        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00A3E0]" />
            Quick Links
          </h4>
          <ul className="space-y-2.5 text-sm">
            {COMPANY_LINKS.map(({ to, label, hash }) => (
              <li key={label}>
                <Link
                  to={to}
                  hash={hash}
                  className="hover:text-[#FF7A00] transition-colors block text-slate-300"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#FF7A00]" />
            Shop topics
          </h4>
          <ul className="space-y-2.5 text-sm">
            {SEO_SHOP_LINKS.map((item) => (
              <li key={item.label}>
                <Link
                  to={item.to}
                  search={"search" in item ? item.search : undefined}
                  className="hover:text-[#FF7A00] transition-colors block text-slate-300"
                >
                  {item.label}
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
