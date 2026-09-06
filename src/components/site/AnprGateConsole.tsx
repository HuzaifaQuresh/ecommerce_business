import { useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Car,
  Camera,
  RotateCcw,
  Check,
  Flag,
  Lock,
  Unlock,
  Terminal,
  FileText,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface ScanRecord {
  id: string;
  timestamp: string;
  vehicleNo: string;
  originalOcrPlate: string;
  correctedPlate?: string;
  confidence: number; // e.g. 74 (%)
  status: "auto_opened" | "pending_guard" | "manually_corrected" | "confirmed";
  isMisread: boolean;
  cameraName: string;
  imageUrl: string;
  guardNotes?: string;
}

const INITIAL_SCANS: ScanRecord[] = [
  {
    id: "SCAN-1001",
    timestamp: "Just now",
    vehicleNo: "Civic X (White)",
    originalOcrPlate: "LEA-7861",
    confidence: 96,
    status: "auto_opened",
    isMisread: false,
    cameraName: "Gate 1 - Main Entrance",
    imageUrl:
      "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "SCAN-1002",
    timestamp: "2 mins ago",
    vehicleNo: "Toyota Corolla (Black)",
    originalOcrPlate: "ISB-542O", // 'O' instead of '0' due to glare
    confidence: 72, // Below threshold 85%
    status: "pending_guard",
    isMisread: false,
    cameraName: "Gate 2 - VIP Parking",
    imageUrl:
      "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "SCAN-1003",
    timestamp: "8 mins ago",
    vehicleNo: "Suzuki Alto (Silver)",
    originalOcrPlate: "RWP-9112",
    confidence: 91,
    status: "auto_opened",
    isMisread: false,
    cameraName: "Gate 1 - Main Entrance",
    imageUrl:
      "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=400&q=80",
  },
  {
    id: "SCAN-1004",
    timestamp: "15 mins ago",
    vehicleNo: "Honda Vezel (Blue)",
    originalOcrPlate: "KHI-330Z", // 'Z' instead of '2' due to shadow
    confidence: 65, // Below threshold 85%
    status: "pending_guard",
    isMisread: false,
    cameraName: "Gate 3 - Service Dock",
    imageUrl:
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80",
  },
];

export function AnprGateConsole() {
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(85);
  const [scans, setScans] = useState<ScanRecord[]>(INITIAL_SCANS);
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [editPlate, setEditPlate] = useState("");
  const [flagMisread, setFlagMisread] = useState(false);
  const [guardNotes, setGuardNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"live" | "audit">("live");

  // Open inspection modal for pending or any scan
  const handleInspect = (scan: ScanRecord) => {
    setSelectedScan(scan);
    setEditPlate(scan.correctedPlate || scan.originalOcrPlate);
    setFlagMisread(scan.isMisread);
    setGuardNotes(scan.guardNotes || "");
  };

  // Submit guard correction / confirmation
  const handleSaveCorrection = () => {
    if (!selectedScan) return;
    const isCorrected =
      editPlate.trim().toUpperCase() !== selectedScan.originalOcrPlate.toUpperCase();

    const updatedScans = scans.map((s) => {
      if (s.id === selectedScan.id) {
        return {
          ...s,
          correctedPlate: editPlate.trim().toUpperCase(),
          status: isCorrected ? ("manually_corrected" as const) : ("confirmed" as const),
          isMisread: flagMisread || isCorrected,
          guardNotes: guardNotes.trim(),
        };
      }
      return s;
    });

    setScans(updatedScans);
    toast.success(
      isCorrected
        ? `Plate corrected to ${editPlate.toUpperCase()} & flagged for AI team!`
        : `Plate read confirmed successfully. Barrier opened.`,
    );
    setSelectedScan(null);
  };

  // Simulate incoming live car scan
  const handleSimulateScan = (lowConfidence: boolean) => {
    const randomPlates = ["LHR-9921", "ISB-8801", "RWP-1234", "PST-5562", "QUE-4019"];
    const plate = randomPlates[Math.floor(Math.random() * randomPlates.length)];
    const glitchPlate = lowConfidence ? plate.replace(/[0-9]/, "O") : plate;
    const conf = lowConfidence
      ? Math.floor(Math.random() * 20) + 55
      : Math.floor(Math.random() * 10) + 88;

    const newScan: ScanRecord = {
      id: `SCAN-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: "Just now",
      vehicleNo: lowConfidence ? "Commercial Van (Muddy Plate)" : "Sedan (Clean Plate)",
      originalOcrPlate: glitchPlate,
      confidence: conf,
      status: conf >= confidenceThreshold ? "auto_opened" : "pending_guard",
      isMisread: false,
      cameraName: "Gate 1 - Main Entrance",
      imageUrl:
        "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=400&q=80",
    };

    setScans([newScan, ...scans]);
    if (conf >= confidenceThreshold) {
      toast.success(`Vehicle ${glitchPlate} (${conf}% confidence) -> Barrier Auto-Opened!`);
    } else {
      toast.warning(
        `Low OCR confidence (${conf}% < ${confidenceThreshold}%). Barrier locked for guard review!`,
      );
    }
  };

  const pendingCount = scans.filter(
    (s) => s.status === "pending_guard" || s.confidence < confidenceThreshold,
  ).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden my-12">
      {/* Header */}
      <div className="bg-[#0F172A] text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#FF6B00]/20 text-[#FF8040] border border-[#FF6B00]/30 text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" /> SmartZone ANPR AI Gate Engine
            </span>
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full">
              Live Barrier Controller
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Smart Number Plate Recognition & Guard Intervention Console
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Meets strict security compliance: OCR reads below the configured confidence threshold
            require guard confirmation/correction without overwriting original AI data, flagging
            misreads for the AI training team.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <Button
            size="sm"
            variant={activeTab === "live" ? "default" : "outline"}
            onClick={() => setActiveTab("live")}
            className={
              activeTab === "live"
                ? "bg-[#FF6B00] hover:bg-[#EA580C] text-white"
                : "border-slate-700 text-slate-300 hover:bg-slate-800"
            }
          >
            Live Gate Queue{" "}
            {pendingCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant={activeTab === "audit" ? "default" : "outline"}
            onClick={() => setActiveTab("audit")}
            className={
              activeTab === "audit"
                ? "bg-[#FF6B00] hover:bg-[#EA580C] text-white"
                : "border-slate-700 text-slate-300 hover:bg-slate-800"
            }
          >
            AI Training & Audit Log
          </Button>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-[#1E293B] text-slate-200 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#FF6B00]" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              OCR Confidence Threshold:{" "}
              <span className="text-[#FF8040] font-black">{confidenceThreshold}%</span>
            </span>
          </div>
          <div className="w-36 sm:w-48">
            <Slider
              value={[confidenceThreshold]}
              onValueChange={(val) => setConfidenceThreshold(val[0])}
              min={50}
              max={95}
              step={1}
              className="cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSimulateScan(true)}
            className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-xs font-semibold"
          >
            Simulate Low-Confidence Read (Glare)
          </Button>
          <Button
            size="sm"
            onClick={() => handleSimulateScan(false)}
            className="bg-[#FF6B00] hover:bg-[#EA580C] text-white text-xs font-semibold"
          >
            Simulate Normal Vehicle Scan
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6 sm:p-8 bg-slate-50 min-h-[400px]">
        {activeTab === "live" ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Barrier Status
                  </span>
                  <div className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />{" "}
                    Automated / Secured
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Unlock className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Pending Guard Review
                  </span>
                  <div className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                    {pendingCount} Vehicles Awaiting Confirmation
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    AI Training Queue
                  </span>
                  <div className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                    {scans.filter((s) => s.isMisread).length} Misread Flags Logged
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-red-50 text-red-600">
                  <Flag className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Queue Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Real-Time Vehicle Plate Scans & Gate Interventions
                </h3>
                <span className="text-xs text-slate-500">Showing latest camera detections</span>
              </div>

              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Camera / Time</th>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">OCR Read (Original)</th>
                      <th className="py-3 px-4">Confidence</th>
                      <th className="py-3 px-4">Corrected Plate</th>
                      <th className="py-3 px-4">Status & Barrier</th>
                      <th className="py-3 px-4 text-right">Guard Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {scans.map((scan) => {
                      const isLowConfidence = scan.confidence < confidenceThreshold;
                      return (
                        <tr key={scan.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{scan.cameraName}</div>
                            <div className="text-[10px] text-slate-400">{scan.timestamp}</div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-800">
                            {scan.vehicleNo}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold bg-slate-100 px-2 py-1 rounded text-slate-950 border border-slate-300">
                              {scan.originalOcrPlate}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-black text-xs px-2 py-0.5 rounded-full ${
                                  scan.confidence >= confidenceThreshold
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800 animate-pulse"
                                }`}
                              >
                                {scan.confidence}%
                              </span>
                              {isLowConfidence && (
                                <span className="text-[10px] text-amber-600 font-semibold">
                                  &lt; {confidenceThreshold}% threshold
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {scan.correctedPlate ? (
                              <span className="font-mono font-bold bg-[#FF6B00]/10 text-[#FF6B00] px-2 py-1 rounded border border-[#FF6B00]/30">
                                {scan.correctedPlate}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">None (Unchanged)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {scan.confidence >= confidenceThreshold &&
                            scan.status === "auto_opened" ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Auto-Opened
                              </span>
                            ) : scan.correctedPlate ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                                <Check className="h-3.5 w-3.5" /> Corrected & Opened
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 animate-bounce">
                                <Lock className="h-3.5 w-3.5" /> Barrier Locked (Review Req.)
                              </span>
                            )}
                            {scan.isMisread && (
                              <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                                <Flag className="h-3 w-3" /> Misread Flagged
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              size="sm"
                              variant={
                                isLowConfidence && !scan.correctedPlate ? "default" : "outline"
                              }
                              onClick={() => handleInspect(scan)}
                              className={
                                isLowConfidence && !scan.correctedPlate
                                  ? "bg-[#FF6B00] hover:bg-[#EA580C] text-white font-bold text-xs shadow-sm"
                                  : "text-slate-700 hover:bg-slate-100 text-xs"
                              }
                            >
                              {scan.correctedPlate || scan.confidence >= confidenceThreshold
                                ? "Inspect / Edit"
                                : "Guard Review Required"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* AI Training & Audit Log Tab */
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    AI Team OCR Correction Dataset & Audit Trail
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Requirement 3 enforced: Original OCR values are strictly retained alongside
                    corrected values without overwriting. Flagged misreads feed the automated model
                    training pipeline.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    toast.success("Exported OCR training dataset (JSON / CSV) for AI team!")
                  }
                  className="text-xs"
                >
                  Export Dataset for AI Team
                </Button>
              </div>

              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Scan ID</th>
                      <th className="py-3 px-4">Original AI OCR Read</th>
                      <th className="py-3 px-4">Guard Corrected Value</th>
                      <th className="py-3 px-4">Confidence</th>
                      <th className="py-3 px-4">AI Misread Status</th>
                      <th className="py-3 px-4">Guard Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                    {scans.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{s.id}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold bg-slate-100 text-slate-900 px-2 py-0.5 rounded border">
                            {s.originalOcrPlate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {s.correctedPlate ? (
                            <span className="font-mono font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                              {s.correctedPlate}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">
                              No correction (Matches original)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">{s.confidence}%</td>
                        <td className="py-3 px-4">
                          {s.isMisread ? (
                            <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 inline-flex items-center gap-1">
                              <Flag className="h-3 w-3" /> Flagged for AI Retraining
                            </span>
                          ) : (
                            <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Standard Read
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{s.guardNotes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Guard Inspection & Correction Modal */}
      {selectedScan && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-[10px] font-bold text-[#FF6B00] uppercase tracking-widest block">
                  Gate Guard Manual Intervention
                </span>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Verify Number Plate ({selectedScan.id})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScan(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Vehicle image & details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-xl border">
              <div className="rounded-lg overflow-hidden bg-slate-900 aspect-16/9 relative border">
                <img
                  src={selectedScan.imageUrl}
                  alt="Vehicle capture"
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-x-2 bottom-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-white text-center">
                  OCR Confidence: {selectedScan.confidence}%
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block font-semibold">Camera Location:</span>
                  <span className="font-bold text-slate-800">{selectedScan.cameraName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Vehicle Type:</span>
                  <span className="font-bold text-slate-800">{selectedScan.vehicleNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 block font-semibold">Original AI OCR Read:</span>
                  <span className="font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300 inline-block mt-0.5">
                    {selectedScan.originalOcrPlate}
                  </span>
                </div>
              </div>
            </div>

            {/* Warning if below threshold */}
            {selectedScan.confidence < confidenceThreshold && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-3 text-amber-800 text-xs">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block mb-0.5">
                    Low Confidence Read ({selectedScan.confidence}% &lt; {confidenceThreshold}%)
                  </strong>
                  Barrier is locked. Guard must confirm or correct the plate number before opening
                  the barrier.
                </div>
              </div>
            )}

            {/* Correction Form */}
            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="plateInput"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block"
                >
                  Corrected / Confirmed Number Plate
                </Label>
                <Input
                  id="plateInput"
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value)}
                  className="font-mono text-lg font-black tracking-widest uppercase"
                  placeholder="e.g. ISB-5420"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Original OCR value{" "}
                  <span className="font-mono font-bold text-slate-800">
                    {selectedScan.originalOcrPlate}
                  </span>{" "}
                  will be retained in audit logs.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="misreadCheck"
                  checked={flagMisread}
                  onChange={(e) => setFlagMisread(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                />
                <label
                  htmlFor="misreadCheck"
                  className="text-xs font-bold text-slate-800 select-none cursor-pointer"
                >
                  Flag as Misread / OCR Error (Send to AI Training Team for Model Retraining)
                </label>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 block">
                  Guard Notes (Optional)
                </Label>
                <Input
                  value={guardNotes}
                  onChange={(e) => setGuardNotes(e.target.value)}
                  placeholder="e.g. Glare from headlight / mud on plate"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedScan(null)}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCorrection}
                className="bg-[#FF6B00] hover:bg-[#EA580C] text-white font-bold text-xs px-6"
              >
                Confirm & Open Barrier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
