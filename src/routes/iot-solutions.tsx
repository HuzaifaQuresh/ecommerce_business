import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Send,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageContainer } from "@/components/site/PageLayout";
import { IotAboutVisual, IotSolutionBands, IotSolutionsHeroBackdrop } from "@/components/site/IotSolutionBands";
import { HomeSectionBadge, HomeSectionHeader } from "@/components/site/HomeSectionHeader";
import { submitInboxLead } from "@/api/inbox";
import { ADDON_SUITES, SOLUTIONS } from "@/lib/solutions";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  contactEmailFromSettings,
  officeAddressFromSettings,
} from "@/lib/storefront-contact";

export const Route = createFileRoute("/iot-solutions")({
  head: () => ({
    meta: [
      {
        title: "IoT Solutions & Smart Home Automations Pakistan | SmartZone",
      },
      {
        name: "description",
        content:
          "SmartZone IoT solutions — smart home automations, Zigbee/WiFi/MQTT sensors, Tuya installs, CCTV and industrial IoT in Islamabad & Pakistan. Book a survey on smartzone.pk.",
      },
      {
        name: "keywords",
        content:
          "smartzone, smartzone pk, iot sensor, smart home, zigbee sensors, automations, MQTT sensors, wifi sensors, tuya sensor Pakistan, iot devices Pakistan",
      },
      {
        property: "og:title",
        content: "IoT Solutions & Smart Home Automations Pakistan | SmartZone",
      },
      {
        property: "og:description",
        content:
          "Custom IoT installs for homes, offices, and industry — sensors, automations, and hardware from smartzone.pk.",
      },
      { property: "og:url", content: "https://smartzone.pk/iot-solutions" },
    ],
    links: [{ rel: "canonical", href: "https://smartzone.pk/iot-solutions" }],
  }),
  component: Solutions,
});

const EMPTY = {
  name: "",
  company: "",
  email: "",
  phone: "",
  solution: "",
  message: "",
};

const STACK = ["Hikvision", "Dahua", "ZKTeco", "Tuya", "Siemens", "NVIDIA Jetson"];

function ConsultationForm({
  defaultSolution = "",
  onClose,
  compact,
  idPrefix = "iot",
}: {
  defaultSolution?: string;
  onClose?: () => void;
  compact?: boolean;
  idPrefix?: string;
}) {
  const { data: settings } = useSiteSettings();
  const contactEmail = contactEmailFromSettings(settings);
  const [form, setForm] = useState({ ...EMPTY, solution: defaultSolution });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setForm((prev) => ({ ...prev, solution: defaultSolution || prev.solution }));
  }, [defaultSolution]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.email.includes("@") || !form.solution) {
      toast.error("Name, email, and solution are required");
      return;
    }
    setBusy(true);
    try {
      await submitInboxLead({
        data: {
          source: "iot_lead",
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.solution || "IoT consultation",
          message: form.message.trim() || "Please contact me about this IoT solution.",
          company: form.company.trim(),
          phone: form.phone.trim(),
          solution: form.solution,
        },
      });
      setDone(true);
    } catch {
      toast.error(`Could not submit. Email ${contactEmail} or use WhatsApp.`);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 className="mb-4 h-14 w-14 text-emerald-600" />
        <h3 className="text-xl font-bold text-[#0B192C]">Request received</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          We will contact <strong className="text-foreground">{form.email}</strong>
          {form.phone ? ` / ${form.phone}` : ""} within one business day.
        </p>
        {onClose ? (
          <Button className="mt-6 min-h-[44px] bg-[#0B192C] hover:bg-[#0F2C59]" onClick={onClose}>
            Close
          </Button>
        ) : (
          <Button
            className="mt-6 min-h-[44px] bg-[#0B192C] hover:bg-[#0F2C59]"
            onClick={() => {
              setDone(false);
              setForm({ ...EMPTY });
            }}
          >
            Send another request
          </Button>
        )}
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`${idPrefix}-name`}>Full name *</Label>
          <Input
            id={`${idPrefix}-name`}
            autoComplete="name"
            placeholder="Muhammad Huzaifa"
            className="mt-1.5 min-h-[44px]"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-company`}>Company / site</Label>
          <Input
            id={`${idPrefix}-company`}
            placeholder="Residence, society, or plant name"
            className="mt-1.5 min-h-[44px]"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-email`}>Email *</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="mt-1.5 min-h-[44px]"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-phone`}>Phone / WhatsApp</Label>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            autoComplete="tel"
            placeholder="+92 332 3059259"
            className="mt-1.5 min-h-[44px]"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Solution of interest *</Label>
        <Select value={form.solution} onValueChange={(v) => setForm({ ...form, solution: v })}>
          <SelectTrigger className="mt-1.5 min-h-[44px]">
            <SelectValue placeholder="Select a solution…" />
          </SelectTrigger>
          <SelectContent>
            {SOLUTIONS.map((s) => (
              <SelectItem key={s.title} value={s.title}>
                {s.title}
              </SelectItem>
            ))}
            {ADDON_SUITES.filter((s) => !SOLUTIONS.some((p) => p.title === s.title)).map((s) => (
              <SelectItem key={s.title} value={s.title}>
                {s.title}
              </SelectItem>
            ))}
            <SelectItem value="Custom">Custom / other IoT project</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-brief`}>Project brief</Label>
        <Textarea
          id={`${idPrefix}-brief`}
          placeholder="Site size, cameras/gates needed, PLC make, or timeline…"
          rows={compact ? 3 : 4}
          className="mt-1.5"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>
      <Button type="submit" className="w-full min-h-[48px] bg-[#FF7A00] hover:bg-[#E56E00] text-white" disabled={busy}>
        {busy ? (
          "Submitting…"
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Request a site survey
          </>
        )}
      </Button>
    </form>
  );
}

function scrollToHash(hash: string) {
  const id = hash.replace(/^#/, "");
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Solutions() {
  const navigate = useNavigate();
  const hash = useRouterState({ select: (s) => s.location.hash });
  const { data: settings } = useSiteSettings();
  const contactEmail = contactEmailFromSettings(settings);
  const officeAddress = officeAddressFromSettings(settings);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState("");

  useEffect(() => {
    if (!hash) return;
    const t = window.setTimeout(() => scrollToHash(hash), 80);
    return () => window.clearTimeout(t);
  }, [hash]);

  const openQuote = (title = "") => {
    setSelectedSolution(title);
    setDialogOpen(true);
  };

  const goToSiteSurvey = () => {
    openQuote();
    void navigate({ to: "/iot-solutions", hash: "quote", replace: true });
    window.setTimeout(() => scrollToHash("quote"), 100);
  };

  return (
    <>
      <section className="relative min-h-[420px] overflow-hidden bg-[#071018] text-white sm:min-h-[500px]">
        <IotSolutionsHeroBackdrop />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 sm:h-64 bg-gradient-to-t from-[#0B192C]/92 via-[#0B192C]/40 to-transparent" />
        <div className="relative z-10 mx-auto flex min-h-[420px] max-w-7xl flex-col justify-end px-4 py-16 sm:min-h-[500px] sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF7A00]">
            Engineering deployments · Islamabad / Rawalpindi · Nationwide
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl">
            IoT, CCTV and industrial automation — designed, installed, supported
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            SmartZone is a working command-center practice: Tuya smart home, Hikvision/Dahua
            surveillance, ANPR barriers, ZKTeco access, and PLC/SCADA on the shop floor. Hardware
            from the catalog, commissioning by our engineers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="min-h-[48px] bg-[#FF7A00] px-6 text-white hover:bg-[#E56E00]"
              onClick={goToSiteSurvey}
            >
              Request a site survey <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="min-h-[48px] border-white/25 bg-white/5 px-6 text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link to="/products" search={{ category: "IoT Solutions" }}>
                Shop IoT hardware
              </Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-2">
            {STACK.map((name) => (
              <span
                key={name}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="scroll-mt-24 border-b border-slate-100 bg-white py-10 sm:py-12">
        <PageContainer className="py-0">
          <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#FF7A00]">About us</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#0B192C] sm:text-4xl">
                One team for catalog hardware and live sites
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Buy a lock or a camera from the store, or brief us for a full villa, society gate,
                or plant. We specify the BOM, install it, and keep spare SKUs on the same platform
                so operations is not stuck waiting on grey-market parts.
              </p>
              <ul className="space-y-3">
                {[
                  "Residential: scenes, climate, curtains, and biometric entry with UPS-aware design.",
                  "Security: NVR/CCTV, smart locks, smoke/gas interlock, SMS to listed owners.",
                  "Industrial: PLC/HMI, Modbus gateways, ANPR barriers, and Jetson edge where AI is on-site.",
                ].map((line) => (
                  <li key={line} className="flex gap-3 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7A00]" />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="flex items-start gap-2 pt-2 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0052B4]" />
                {officeAddress}
              </p>
            </div>
            <div className="lg:col-span-5 space-y-3">
              <IotAboutVisual />
            </div>
          </div>
        </PageContainer>
      </section>

      <IotSolutionBands onQuote={openQuote} />

      <section id="suites" className="scroll-mt-24 border-t border-slate-200/80 bg-slate-50 pt-8 pb-12 sm:pt-10 sm:pb-16">
        <PageContainer className="py-0">
          <HomeSectionHeader
            className="px-0 pb-5 pt-0"
            badge={<HomeSectionBadge>Add-on suites</HomeSectionBadge>}
            title="What is not already in the photo cards"
            subtitle="Home, CCTV, industrial, gates, fire/gas, and tower jobs are quoted from the cards above. These two are extra."
          />
          <div className="grid gap-4 md:grid-cols-2">
            {ADDON_SUITES.map(({ icon: Icon, title, desc, tags, image }) => (
              <article
                key={title}
                className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-xs"
              >
                <div className="relative h-[240px] bg-[#071018] sm:h-[280px]">
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-contain object-center"
                  />
                </div>
                <div className="p-5 sm:p-6">
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-[#FF7A00] text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-black leading-tight text-[#0B192C]">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-medium text-slate-600"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="mt-4 bg-[#FF7A00] font-bold text-white hover:bg-[#E56E00]"
                    onClick={() => openQuote(title)}
                  >
                    Get a quote <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section id="quote" className="scroll-mt-24 bg-[#0B192C] py-12 text-white sm:py-16">
        <PageContainer className="py-0">
          <div className="grid items-start gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-[#FF7A00]">
                Business quote
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Tell us the site. We’ll send a survey slot.
              </h2>
              <p className="text-sm leading-relaxed text-slate-300">
                Leads land in the SmartZone inbox. Share the site details and we’ll confirm a survey
                slot by email.
              </p>
              <p className="text-sm">
                <a href={`mailto:${contactEmail}`} className="text-[#00A3E0] hover:underline">
                  {contactEmail}
                </a>
              </p>
            </div>
            <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-white p-5 text-[#0B192C] sm:p-7">
              <ConsultationForm />
            </div>
          </div>
        </PageContainer>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0B192C]">
              {selectedSolution ? `Quote: ${selectedSolution}` : "Speak with an engineer"}
            </DialogTitle>
            <DialogDescription>
              We reply on email or WhatsApp within one business day.
            </DialogDescription>
          </DialogHeader>
          <ConsultationForm
            defaultSolution={selectedSolution}
            onClose={() => setDialogOpen(false)}
            compact
            idPrefix="iot-dialog"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
