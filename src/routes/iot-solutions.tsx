import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Radio,
  Flame,
  Tv,
  Factory,
  Truck,
  Building2,
  ArrowRight,
  Send,
  CheckCircle2,
  Home,
  ShieldCheck,
  Lock,
  Video,
  Bell,
  Zap,
  Thermometer,
  Droplets,
  Sliders,
  Sparkles,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageContainer } from "@/components/site/PageLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/iot-solutions")({
  head: () => ({
    meta: [
      { title: "Enterprise & Smart Home IoT Solutions — NexusIoT" },
      {
        name: "description",
        content:
          "Advanced smart home automation, security solutions, intelligent sensors, and enterprise IoT package deployments.",
      },
    ],
  }),
  component: Solutions,
});

const SOLUTIONS = [
  {
    icon: Home,
    title: "Whole-Home Smart Automation",
    desc: "Unify lighting, climate, entertainment, and motorized shades into a single voice & smartphone interface.",
    tags: ["Zigbee 3.0", "Tuya Cloud", "Apple HomeKit & Google Home"],
  },
  {
    icon: ShieldCheck,
    title: "Active Security & Surveillance",
    desc: "AI-powered cameras with real-time human detection, smart locks, and immediate local siren/SMS alerts.",
    tags: ["2K CCTV", "Smart Deadbolts", "Intrusion Detection"],
  },
  {
    icon: Flame,
    title: "Integrated Fire & Gas Safety Smoke Cloud",
    desc: "Industrial-grade gas leakage and photoelectric smoke detectors wired to an automatic gas cutoff system.",
    tags: ["Solenoid Valves", "LPG/NG Gas Sensors", "Instant SMS Alerts"],
  },
  {
    icon: Radio,
    title: "Remote Telecom Tower Surveillance",
    desc: "4G/LoRa-backed PTZ + intrusion + power monitoring across unmanned tower sites.",
    tags: ["PTZ", "LoRaWAN", "Power Sensors"],
  },
  {
    icon: Factory,
    title: "Industrial SCADA & PLC Integration",
    desc: "Siemens / Weintek stacks integrated with custom dashboards and edge gateways.",
    tags: ["PLC", "SCADA", "Modbus"],
  },
  {
    icon: Truck,
    title: "Fleet & Cold-Chain Telemetry",
    desc: "GPS + temperature loggers with geofencing and tamper alerts.",
    tags: ["GPS", "Telemetry"],
  },
];

const SENSORS_CATALOG = [
  {
    icon: Flame,
    name: "Tuya Smart Smoke Detector",
    tech: "Photoelectric Sensor",
    use: "Detects slow-smoldering fires and sounds an 85dB alarm, simultaneously triggering mobile push and SMS notifications.",
    color: "bg-red-50 text-red-600 border-red-100",
  },
  {
    icon: Droplets,
    name: "Gas Leakage & LPG Detector",
    tech: "Catalytic Combustion",
    use: "Continuously monitors LPG/Methane levels and automatically commands a smart valve to cut off the main gas line.",
    color: "bg-orange-50 text-orange-600 border-orange-100",
  },
  {
    icon: Thermometer,
    name: "Precision Climate Multi-Sensor",
    tech: "Sensirion SHT30",
    use: "Highly accurate temperature, humidity, and ambient lux monitoring to trigger intelligent AC, heater, and smart blind routines.",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    icon: Zap,
    name: "Intelligent Power Monitor",
    tech: "Bi-directional CT Clamp",
    use: "Monitors real-time voltage, current, and accumulated kWh of your entire home or facility with full diagnostic analytics.",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    icon: Lock,
    name: "Zigbee Door & Window Contact",
    tech: "Magnetic Reed Switch",
    use: "Super low-latency entry monitoring. Triggers welcoming lights during the day, and activates instant sirens during security arm state.",
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    icon: Video,
    name: "AI Human-Detection PIR Sensor",
    tech: "Passive Infrared + Thermal",
    use: "Avoids false alerts from pets or light shifts. Recognizes warm human motion to activate cameras and sirens.",
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
];

const EMPTY = {
  name: "",
  company: "",
  email: "",
  phone: "",
  solution: "",
  message: "",
};

function ConsultationForm({
  defaultSolution = "",
  onClose,
}: {
  defaultSolution?: string;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY, solution: defaultSolution });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.solution) {
      toast.error("Name, email, and solution are required");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("site_settings").upsert({
        key: `lead_${Date.now()}`,
        value: JSON.stringify({
          type: "consultation",
          ...form,
          submitted_at: new Date().toISOString(),
        }),
      });
      if (error) {
        console.warn("Lead save failed:", error.message);
      }
      setDone(true);
    } catch {
      toast.error("Could not submit — please email us directly at sales@nexusiot.pk");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <CheckCircle2 className="h-14 w-14 text-emerald-600 mb-4" />
        <h3 className="text-xl font-bold">Request received!</h3>
        <p className="text-muted-foreground mt-2 max-w-xs">
          Our team will contact you at <strong>{form.email}</strong> within 24 hours.
        </p>
        <Button className="mt-6" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Full name *</Label>
          <Input
            placeholder="Muhammad Huzaifa"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <Label>Company / Organization</Label>
          <Input
            placeholder="Homeowner or Enterprise Name"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
          />
        </div>
        <div>
          <Label>Email *</Label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            placeholder="+92 332 3059259"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Solution of interest *</Label>
        <Select value={form.solution} onValueChange={(v) => setForm({ ...form, solution: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Select a solution…" />
          </SelectTrigger>
          <SelectContent>
            {SOLUTIONS.map((s) => (
              <SelectItem key={s.title} value={s.title}>
                {s.title}
              </SelectItem>
            ))}
            <SelectItem value="Custom">Custom / Other IoT Project</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Project brief & requirements</Label>
        <Textarea
          placeholder="Briefly describe your home size, specific security concerns, or scale of enterprise deployment..."
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>
      <Button className="w-full min-h-[48px]" onClick={handleSubmit} disabled={busy}>
        {busy ? (
          "Submitting…"
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Request consultation
          </>
        )}
      </Button>
    </div>
  );
}

function Solutions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSolution, setSelectedSolution] = useState("");

  const openQuote = (title = "") => {
    setSelectedSolution(title);
    setDialogOpen(true);
  };

  return (
    <>
      {/* Immersive Hero Header */}
      <section className="relative overflow-hidden bg-slate-950 text-white py-16 sm:py-24">
        {/* Ambient Dark Tech Background Image overlay */}
        <div className="absolute inset-0 z-0 opacity-45">
          <img
            src="https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1600&q=80"
            alt="Smart Home Tech Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 mb-6">
              <Sparkles className="h-3 w-3 animate-pulse" /> Custom IoT Engineering
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Smart Home & <br />
              <span className="text-primary">Enterprise IoT</span> Solutions
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 leading-relaxed max-w-2xl">
              From sophisticated villa automation systems with voice controls, to nationwide remote
              telecom tower surveillance — we engineer custom intelligent environments that are
              secure, efficient, and beautifully responsive.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white min-h-[48px] px-8 text-base shadow-lg shadow-primary/20"
                onClick={() => openQuote("Whole-Home Smart Automation")}
              >
                Explore Smart Homes <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="secondary"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 min-h-[48px] px-8 text-base font-medium"
                onClick={() => openQuote()}
              >
                Speak to an Engineer
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Home Section */}
      <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
        <PageContainer>
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">
                Luxurious Automation
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Intelligent Living: Smart Home Environments
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Step into a modern lifestyle where your environment works with you. NexusIoT crafts
                world-class residential smart setups designed for Pakistan's luxury residences. Keep
                your space beautifully illuminated, climate-optimized, and totally secure.
              </p>
              <ul className="space-y-4">
                {[
                  "Adaptive Ambient Lighting: Synchronize soft dimmers, accent colors, and custom scenes with the local sunset.",
                  "Smart AC & Heat Management: Self-regulating climate control that saves power based on room occupancy.",
                  "Voice-Controlled Everything: Native offline and cloud voice triggers through Alexa, Siri, and Google Home.",
                  "Automated Curtains & Blinds: Programmed window treatments that roll down automatically in high heat.",
                ].map((item, idx) => {
                  const [title, desc] = item.split(": ");
                  return (
                    <li key={idx} className="flex gap-3">
                      <div className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-slate-700">
                        <strong className="text-slate-900">{title}:</strong> {desc}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="pt-4">
                <Button
                  className="bg-slate-900 hover:bg-slate-800 text-white min-h-[48px]"
                  onClick={() => openQuote("Whole-Home Smart Automation")}
                >
                  Configure My Smart Home <Sliders className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="lg:col-span-7 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80"
                    alt="Elegant Living Room Lighting"
                    className="w-full h-48 object-cover hover:scale-105 transition duration-500"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=600&q=80"
                    alt="Modern Home Interface"
                    className="w-full h-64 object-cover hover:scale-105 transition duration-500"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="rounded-2xl overflow-hidden shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80"
                    alt="Secure Smart Door Lock"
                    className="w-full h-64 object-cover hover:scale-105 transition duration-500"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden shadow-md">
                  <img
                    src="https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=600&q=80"
                    alt="Smart Home Entertainment"
                    className="w-full h-48 object-cover hover:scale-105 transition duration-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Advanced Security & Video Solutions */}
      <section className="py-16 sm:py-24 bg-slate-50 border-b border-slate-100">
        <PageContainer>
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=1000&q=80"
                  alt="High-definition Smart Camera Surveillance"
                  className="w-full h-[450px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs uppercase font-semibold tracking-wider text-red-400">
                      AI Active Threat Deterrence
                    </span>
                  </div>
                  <h4 className="text-lg font-bold">Smart Video Guard</h4>
                  <p className="text-xs text-slate-300">
                    Real-time video analytics trigger powerful floodlights and automated sirens the
                    moment an unauthorized human steps past your property line.
                  </p>
                </div>
              </div>
            </div>
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <span className="text-xs font-bold text-primary uppercase tracking-widest">
                Active Deterrence & Safety
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Enterprise & Residential Security Systems
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Legacy security only records crimes; NexusIoT active solutions deter them before
                they occur. Connect intelligent cameras, biometric smart deadbolts, and
                environmental detectors into a unified safety shield.
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-slate-900 text-sm">Biometric Smart Entry</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Never lose keys again. Access your home or commercial zone via facial
                    recognition, encrypted RFID cards, temporary PINs, or your smartphone.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-slate-900 text-sm">Intelligent AI CCTV</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    2K/4K active PTZ security cameras with customized line-crossing, license plate
                    logs, and true day/night infrared matrices.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-slate-900 text-sm">Instant SMS Alerts</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    In emergencies like intrusion, fire, or gas detection, our automated cloud
                    dispatches immediate phone dialer and SMS calls to listed owners.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold text-slate-900 text-sm">Uninterruptible Power</h4>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Designed for Pakistan's grid conditions. Standard back-up batteries guarantee
                    seamless operation during load shedding.
                  </p>
                </div>
              </div>
              <div className="pt-4">
                <Button
                  className="bg-primary hover:bg-primary/90 text-white min-h-[48px]"
                  onClick={() => openQuote("Active Security & Surveillance")}
                >
                  Request Security Package <ShieldCheck className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Sensors Catalog Section */}
      <section className="py-16 sm:py-24 bg-white">
        <PageContainer>
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">
              Core Engineering Pieces
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Intelligent IoT Sensors & Actuators
            </h2>
            <p className="text-slate-600">
              The brains behind our custom automation. Every sensor is engineered with premium
              silicon and low-power wireless modules to ensure reliable operations in any building.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SENSORS_CATALOG.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.name}
                  className="p-6 rounded-2xl border border-slate-100 bg-white hover:border-slate-200 hover:shadow-lg transition duration-300 space-y-4 flex flex-col"
                >
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center border shrink-0 ${s.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-base leading-snug">{s.name}</h4>
                    </div>
                    <span className="inline-block text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                      {s.tech}
                    </span>
                    <p className="text-xs text-slate-500 leading-relaxed">{s.use}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </PageContainer>
      </section>

      {/* Solutions packages */}
      <section className="py-16 sm:py-24 bg-slate-50 border-t border-slate-100">
        <PageContainer>
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
            <span className="text-xs font-bold text-primary uppercase tracking-widest">
              Deployable Packages
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Ready-to-Deploy IoT Suites
            </h2>
            <p className="text-slate-600">
              Explore our standard pre-engineered deployment blueprints featuring proven local
              surveillance, industrial telemetry, and SCADA automation stacks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SOLUTIONS.map(({ icon: Icon, title, desc, tags }) => (
              <article
                key={title}
                className="group rounded-2xl border bg-white p-6 sm:p-8 hover:shadow-xl hover:border-primary/20 transition flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg leading-snug">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-6 mt-6 border-t border-slate-50">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-0 text-primary hover:bg-transparent text-sm font-semibold hover:text-primary/80 group-hover:translate-x-1 transition duration-200"
                    onClick={() => openQuote(title)}
                  >
                    Request blueprint & quote <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      {/* Quote Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-950">
              {selectedSolution
                ? `Quote Request: ${selectedSolution}`
                : "Speak with an IoT Specialist"}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-4">
            <ConsultationForm
              defaultSolution={selectedSolution}
              onClose={() => setDialogOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
