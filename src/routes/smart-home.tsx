import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/site/PageLayout";
import {
  absoluteUrl,
  canonicalLink,
  collectionPageJsonLd,
  ldJsonScript,
} from "@/lib/seo";

const TITLE = "Smart Home Automations Pakistan | Tuya, Zigbee & WiFi | SmartZone";
const DESCRIPTION =
  "Smart home and automations in Pakistan — Tuya scenes, Zigbee sensors, WiFi controls, smart switches and panels. Shop at smartzone.pk or book a SmartZone survey.";

const FAQ = [
  {
    q: "Where can I buy smart home devices in Pakistan?",
    a: "Shop smart home kits, sensors, switches, and panels at SmartZone on smartzone.pk, with optional full-home automation install.",
  },
  {
    q: "Do you offer smart home automations and scenes?",
    a: "Yes. SmartZone supports Tuya / Smart Life automations for lighting, climate, curtains, locks, and sensor-triggered scenes.",
  },
] as const;

function faqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export const Route = createFileRoute("/smart-home")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "smart home, smart home Pakistan, automations, home automation, zigbee sensors, tuya sensor Pakistan, smartzone, smartzone pk, iot devices Pakistan",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: absoluteUrl("/smart-home") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [canonicalLink("/smart-home")],
    scripts: [
      ldJsonScript(
        collectionPageJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          urlPath: "/smart-home",
        }),
      ),
      ldJsonScript(faqJsonLd()),
    ],
  }),
  component: SmartHomePage,
});

function SmartHomePage() {
  return (
    <PageContainer>
      <p className="text-xs font-bold uppercase tracking-widest text-[#FF7A00]">
        SmartZone · smartzone.pk
      </p>
      <h1 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight text-[#0B192C] sm:text-4xl">
        Smart home & automations in Pakistan
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
        Build <strong>smart home</strong> scenes with Tuya / Smart Life — lighting, climate,
        curtains, locks, and <strong>automations</strong> driven by Zigbee or WiFi sensors. SmartZone
        sells the hardware on <strong>smartzone.pk</strong> and installs full stacks for homes and
        offices.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button className="bg-[#FF7A00] text-white hover:bg-[#E56E00]" asChild>
          <Link to="/products" search={{ category: "Smart Home Automation" }}>
            Shop smart home <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/iot-sensors">IoT & Zigbee sensors</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/iot-solutions" hash="quote">
            Request site survey
          </Link>
        </Button>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Sensors that trigger scenes",
            body: "Motion, door, climate, and leak sensors feed automations — lights, AC, and alerts without a separate DIY stack.",
            to: "/iot-sensors" as const,
          },
          {
            title: "Control panels & switches",
            body: "Wall panels, smart switches, and sockets for daily control — works with Tuya cloud or local gateway setups.",
            search: { category: "Smart Control Panels" },
          },
          {
            title: "End-to-end install",
            body: "Need more than a box of devices? Our IoT solutions team designs UPS-aware homes and society deployments.",
            to: "/iot-solutions" as const,
          },
        ].map((card) => (
          <article
            key={card.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
          >
            <h2 className="text-lg font-bold text-[#0B192C]">{card.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
            {"search" in card && card.search ? (
              <Link
                to="/products"
                search={card.search}
                className="mt-3 inline-flex text-sm font-semibold text-[#0052B4] hover:underline"
              >
                Browse catalog →
              </Link>
            ) : (
              <Link
                to={card.to!}
                className="mt-3 inline-flex text-sm font-semibold text-[#0052B4] hover:underline"
              >
                Learn more →
              </Link>
            )}
          </article>
        ))}
      </div>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-bold text-[#0B192C]">Smart home FAQ</h2>
        {FAQ.map((item) => (
          <div key={item.q} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-[#0B192C]">{item.q}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.a}</p>
          </div>
        ))}
      </section>
    </PageContainer>
  );
}
