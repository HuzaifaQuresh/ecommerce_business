import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/site/PageLayout";
import {
  DEFAULT_META,
  absoluteUrl,
  canonicalLink,
  collectionPageJsonLd,
  ldJsonScript,
} from "@/lib/seo";

const TITLE = "IoT Sensors Pakistan | Zigbee, WiFi, MQTT & Tuya | SmartZone";
const DESCRIPTION =
  "Buy IoT sensors in Pakistan at smartzone.pk — Zigbee sensors, WiFi sensors, MQTT sensors, and Tuya sensors for smart home & industrial automations. COD nationwide.";

const FAQ = [
  {
    q: "Where can I buy IoT sensors in Pakistan?",
    a: "SmartZone (smartzone.pk) sells IoT sensors in Pakistan with PKR pricing and COD on eligible orders, plus optional install support from Islamabad.",
  },
  {
    q: "Do you stock Zigbee sensors and WiFi sensors?",
    a: "Yes. SmartZone carries Zigbee sensors and WiFi sensors under Tuya Smart Sensors and related IoT categories for home and site automations.",
  },
  {
    q: "Can I get MQTT sensors or MQTT-ready IoT devices?",
    a: "Yes. Browse IoT Solutions and gateways on smartzone.pk for MQTT-friendly nodes and edge setups, or request a site survey for custom wiring.",
  },
  {
    q: "Is SmartZone the same as smartzone pk / smartzone.pk?",
    a: "Yes. SmartZone, smartzone pk, and smartzone.pk all refer to the official SmartZone store and IoT practice in Pakistan.",
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

export const Route = createFileRoute("/iot-sensors")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "iot sensor, iot sensors, zigbee sensors, wifi sensors, MQTT sensors, tuya sensor Pakistan, iot devices Pakistan, smartzone, smartzone pk",
      },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: absoluteUrl("/iot-sensors") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [canonicalLink("/iot-sensors")],
    scripts: [
      ldJsonScript(
        collectionPageJsonLd({
          name: TITLE,
          description: DESCRIPTION,
          urlPath: "/iot-sensors",
        }),
      ),
      ldJsonScript(faqJsonLd()),
    ],
  }),
  component: IotSensorsPage,
});

const TOPICS = [
  {
    id: "zigbee",
    title: "Zigbee sensors",
    body: "Low-power Zigbee sensors for doors, motion, climate, and leak detection — pair with a Tuya Zigbee gateway for reliable mesh automations.",
    to: "/zigbee-sensors" as const,
  },
  {
    id: "wifi",
    title: "WiFi sensors",
    body: "WiFi sensors that talk directly to the cloud or Smart Life app — ideal when you need fast install without a separate hub.",
    to: "/wifi-sensors" as const,
  },
  {
    id: "mqtt",
    title: "MQTT sensors",
    body: "MQTT-friendly IoT sensor nodes and gateways for on-prem dashboards, Jetson edge, and industrial telemetry where cloud round-trip is optional.",
    to: "/mqtt-sensors" as const,
  },
  {
    id: "tuya",
    title: "Tuya sensors Pakistan",
    body: "Official Tuya / TYSH sensor SKUs priced in PKR at SmartZone — temperature, humidity, PIR, gas, smoke, and contact sensors for villas and sites.",
    to: "/tuya-sensors" as const,
  },
] as const;

function IotSensorsPage() {
  return (
    <PageContainer>
      <p className="text-xs font-bold uppercase tracking-widest text-[#FF7A00]">
        SmartZone · smartzone.pk
      </p>
      <h1 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight text-[#0B192C] sm:text-4xl">
        IoT sensors in Pakistan — Zigbee, WiFi, MQTT & Tuya
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
        Looking for an <strong>IoT sensor</strong>, <strong>Zigbee sensors</strong>,{" "}
        <strong>WiFi sensors</strong>, <strong>MQTT sensors</strong>, or a{" "}
        <strong>Tuya sensor in Pakistan</strong>? SmartZone stocks catalog hardware and can
        commission the same devices on live sites from Islamabad / Rawalpindi.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button className="bg-[#FF7A00] text-white hover:bg-[#E56E00]" asChild>
          <Link to="/products" search={{ category: "Tuya Smart Sensors" }}>
            Shop Tuya sensors <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/products" search={{ category: "IoT Solutions" }}>
            Browse IoT devices
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/iot-solutions">IoT install & survey</Link>
        </Button>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {TOPICS.map((topic) => (
          <article
            key={topic.id}
            id={topic.id}
            className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
          >
            <h2 className="text-lg font-bold text-[#0B192C]">{topic.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{topic.body}</p>
            <Link
              to={topic.to}
              className="mt-3 inline-flex text-sm font-semibold text-[#0052B4] hover:underline"
            >
              Open guide →
            </Link>
          </article>
        ))}
      </div>

      <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
        <h2 className="text-xl font-bold text-[#0B192C]">Why buy IoT devices from SmartZone?</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>Pakistan PKR pricing with COD on eligible orders.</li>
          <li>
            Same desk for <strong>iot devices Pakistan</strong> catalog buys and full automation
            installs.
          </li>
          <li>
            Brand home: <strong>SmartZone</strong> / <strong>smartzone pk</strong> at{" "}
            <a href="https://smartzone.pk" className="font-semibold text-[#0052B4] hover:underline">
              smartzone.pk
            </a>
            .
          </li>
        </ul>
        <p className="mt-4 text-xs text-slate-500">
          Related:{" "}
          <Link to="/smart-home" className="text-[#0052B4] hover:underline">
            smart home automations
          </Link>
          {" · "}
          <Link to="/" className="text-[#0052B4] hover:underline">
            {DEFAULT_META.ogTitle}
          </Link>
        </p>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-xl font-bold text-[#0B192C]">Common searches we answer</h2>
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
