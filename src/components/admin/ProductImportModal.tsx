import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  History,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";

interface ParsedProductRow {
  rowNumber: number;
  title: string;
  sku: string;
  category: string;
  subCategory?: string;
  manufacturer?: string;
  description?: string;
  price_pkr: number;
  discount_pct?: number;
  stock: number;
  image_url?: string;
  tags?: string;
  status?: string;
  isValid: boolean;
  errors: string[];
}

interface ImportLogItem {
  id: string;
  filename: string;
  total_rows: number;
  success_count: number;
  failed_count: number;
  status: string;
  created_at: string;
}

export function ProductImportModal({ onImportComplete }: { onImportComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    failed: number;
    errorsList: { row: number; sku: string; reason: string }[];
  } | null>(null);
  const [importHistory, setImportHistory] = useState<ImportLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch import history
  useEffect(() => {
    if (open) {
      fetchImportHistory();
    }
  }, [open]);

  const fetchImportHistory = async () => {
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from("import_logs" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
        if (!error && data) {
          setImportHistory(data as any);
          return;
        }
      }
      // Fallback to localStorage
      const local = JSON.parse(localStorage.getItem("nexus_import_logs") || "[]");
      setImportHistory(local);
    } catch (err) {
      console.error("Failed to load import logs", err);
    }
  };

  const downloadSampleTemplate = () => {
    const csvContent = [
      "Product Name,SKU,Category,Sub-category,Brand,Description,Price,Sale Price,Stock Quantity,Product Images,Status,Tags/Keywords",
      "Tuya Zigbee Smart Thermostat,TZ-TH-01,Climate Control,Thermostats,Tuya,Smart LCD temperature controller with Zigbee mesh.,4500,3999,75,https://images.unsplash.com/photo-1558002038-1055907df827?w=600,Active,thermostat,zigbee,climate",
      "Smart RGB LED Strip 5m,LED-RGB-5M,Lighting,Light Strips,Sonoff,WiFi RGB LED strip light with music sync and voice control.,2800,,150,https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600,Active,lighting,led,wifi",
      "Wireless Smart Video Doorbell,DB-WIFI-1080,Security Cameras,Video Doorbells,Tuya,1080p HD video doorbell with two-way audio and motion sensor.,12500,11200,30,https://images.unsplash.com/photo-1557324232-b8917d4c3dcb?w=600,Active,security,camera,doorbell",
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "product_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sample template downloaded successfully!");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validExtensions = [".csv", ".xlsx", ".xls"];
    const fileExt = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
    if (!validExtensions.includes(fileExt)) {
      toast.error("Please upload a valid .csv, .xlsx, or .xls file.");
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds 20MB limit.");
      return;
    }

    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = async (fileObj: File) => {
    setParsing(true);
    setImportSummary(null);
    try {
      const text = await fileObj.text();
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
      if (lines.length < 2) {
        toast.error("The uploaded file is empty or missing data rows.");
        setParsing(false);
        return;
      }

      // Simple CSV parser
      const parseCSVLine = (line: string) => {
        const result: string[] = [];
        let inQuotes = false;
        let current = "";
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
      const rows: ParsedProductRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (cols.length === 0 || cols.every((c) => !c)) continue;

        // Map columns (robust fallback matching)
        const getCol = (possibleNames: string[]) => {
          for (const name of possibleNames) {
            const idx = headers.findIndex((h) => h.includes(name));
            if (idx !== -1 && cols[idx] !== undefined) return cols[idx].replace(/^"|"$/g, "");
          }
          return "";
        };

        const title = getCol(["productname", "title", "name"]);
        const sku = getCol(["sku", "productcode", "code"]) || `SKU-${Date.now()}-${i}`;
        const category = getCol(["category"]) || "Components";
        const subCategory = getCol(["subcategory", "sub-category"]) || "";
        const manufacturer = getCol(["brand", "manufacturer"]) || "Tuya";
        const description = getCol(["description"]) || "";
        const priceStr = getCol(["price", "regularprice"]) || "0";
        const stockStr = getCol(["stock", "quantity", "stockquantity"]) || "50";
        const imageUrl =
          getCol(["image", "imageurl", "productimages"]) ||
          "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600";
        const tags = getCol(["tags", "keywords"]) || "smart-home";

        const price_pkr = parseFloat(priceStr.replace(/[^0-9.]/g, "")) || 0;
        const stock = parseInt(stockStr.replace(/[^0-9]/g, "")) || 0;

        const errors: string[] = [];
        if (!title) errors.push("Missing Product Name");
        if (!sku) errors.push("Missing SKU");
        if (price_pkr <= 0) errors.push("Invalid or zero price");
        if (stock < 0) errors.push("Invalid stock quantity");

        rows.push({
          rowNumber: i + 1,
          title,
          sku,
          category,
          subCategory,
          manufacturer,
          description,
          price_pkr,
          stock,
          image_url: imageUrl,
          tags,
          isValid: errors.length === 0,
          errors,
        });
      }

      setParsedRows(rows);
      setActiveTab("preview");
      toast.success(
        `Successfully parsed ${rows.length} rows (${rows.filter((r) => r.isValid).length} valid).`,
      );
    } catch (err) {
      console.error("Parse error", err);
      toast.error("Failed to parse file. Please verify format.");
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setProgress(10);

    let successCount = 0;
    let failedCount = 0;
    const errorsList: { row: number; sku: string; reason: string }[] = [];

    const existingProducts = JSON.parse(localStorage.getItem("nexus_local_products") || "[]");

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      if (!row.isValid) {
        failedCount++;
        errorsList.push({ row: row.rowNumber, sku: row.sku, reason: row.errors.join(", ") });
        continue;
      }

      try {
        // Upsert logic by SKU or title slug
        const slug = row.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const productPayload = {
          id: `prod-${Date.now()}-${i}`,
          title: row.title,
          slug,
          description: row.description || "Imported smart device item.",
          category: row.category,
          price_pkr: row.price_pkr,
          stock: row.stock,
          image_url: row.image_url,
          manufacturer: row.manufacturer,
          tags: row.tags.split(",").map((t) => t.trim()),
          availability: row.stock > 0 ? "in_stock" : "out_of_stock",
          updated_at: new Date().toISOString(),
        };

        if (isSupabaseConfigured) {
          // Check existing in Supabase
          const { data: existing } = await supabase
            .from("products")
            .select("id")
            .eq("slug", slug)
            .maybeSingle();

          if (existing) {
            await supabase.from("products").update(productPayload).eq("id", existing.id);
          } else {
            await supabase.from("products").insert([productPayload]);
          }
        }

        // Also save to localStorage
        const idx = existingProducts.findIndex((p: any) => p.slug === slug || p.sku === row.sku);
        if (idx !== -1) {
          existingProducts[idx] = { ...existingProducts[idx], ...productPayload };
        } else {
          existingProducts.unshift(productPayload);
        }

        successCount++;
      } catch (err: any) {
        failedCount++;
        errorsList.push({
          row: row.rowNumber,
          sku: row.sku,
          reason: err.message || "Database insert error",
        });
      }

      setProgress(Math.round(((i + 1) / parsedRows.length) * 90) + 10);
    }

    localStorage.setItem("nexus_local_products", JSON.stringify(existingProducts));

    // Log import
    const newLog: ImportLogItem = {
      id: "log-" + Date.now(),
      filename: file?.name || "products_import.csv",
      total_rows: parsedRows.length,
      success_count: successCount,
      failed_count: failedCount,
      status: "completed",
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      await supabase.from("import_logs" as any).insert([newLog]);
    } else {
      const localLogs = JSON.parse(localStorage.getItem("nexus_import_logs") || "[]");
      localStorage.setItem("nexus_import_logs", JSON.stringify([newLog, ...localLogs]));
    }

    setImporting(false);
    setProgress(100);
    setImportSummary({
      total: parsedRows.length,
      success: successCount,
      failed: failedCount,
      errorsList,
    });
    setActiveTab("summary");
    toast.success(`Import completed: ${successCount} imported/updated, ${failedCount} failed.`);
    onImportComplete();
    fetchImportHistory();
  };

  const downloadErrorReport = () => {
    if (!importSummary || importSummary.errorsList.length === 0) return;
    const csvContent = [
      "Row Number,SKU,Error Reason",
      ...importSummary.errorsList.map((e) => `${e.row},"${e.sku}","${e.reason}"`),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "import_error_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Error report downloaded.");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Import Products (Excel/CSV)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Bulk Product Import (Excel & CSV)
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="upload">1. Upload & Template</TabsTrigger>
            <TabsTrigger value="preview" disabled={parsedRows.length === 0}>
              2. Preview ({parsedRows.length})
            </TabsTrigger>
            <TabsTrigger value="summary" disabled={!importSummary}>
              3. Summary Report
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              Import History
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: UPLOAD */}
          <TabsContent value="upload" className="space-y-6 pt-4">
            <div className="bg-muted/40 border border-dashed rounded-xl p-8 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg">Upload Product Spreadsheet</h3>
                <p className="text-sm text-muted-foreground">
                  Supports .csv, .xlsx, and .xls files up to 20MB with automatic SKU upsert logic.
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={parsing}
                  className="gap-2"
                >
                  {parsing ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {parsing ? "Parsing File..." : "Select File"}
                </Button>
              </div>
              {file && (
                <p className="text-xs text-emerald-600 font-medium">
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="border rounded-xl p-6 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Need a template to start?</h4>
                  <p className="text-xs text-muted-foreground">
                    Download our sample CSV template pre-configured with correct headers, pricing,
                    stock, and sample rows.
                  </p>
                </div>
                <Button variant="outline" onClick={downloadSampleTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download Sample Template
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: PREVIEW */}
          <TabsContent value="preview" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Data Preview & Validation</h3>
                <p className="text-xs text-muted-foreground">
                  Reviewing {parsedRows.length} rows. Valid rows will be created or updated by SKU.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  {parsedRows.filter((r) => r.isValid).length} Valid
                </Badge>
                <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                  {parsedRows.filter((r) => !r.isValid).length} Errors
                </Badge>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/80 sticky top-0 text-left">
                  <tr>
                    <th className="p-2.5 font-semibold">Row</th>
                    <th className="p-2.5 font-semibold">Status</th>
                    <th className="p-2.5 font-semibold">Product Title</th>
                    <th className="p-2.5 font-semibold">SKU</th>
                    <th className="p-2.5 font-semibold">Category</th>
                    <th className="p-2.5 font-semibold">Price (PKR)</th>
                    <th className="p-2.5 font-semibold">Stock</th>
                    <th className="p-2.5 font-semibold">Validation Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 50).map((row) => (
                    <tr key={row.rowNumber} className="border-t hover:bg-muted/20">
                      <td className="p-2.5 font-mono">{row.rowNumber}</td>
                      <td className="p-2.5">
                        {row.isValid ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Ready
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-rose-600 font-medium">
                            <XCircle className="h-3.5 w-3.5" /> Error
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 font-medium truncate max-w-[180px]">
                        {row.title || "—"}
                      </td>
                      <td className="p-2.5 font-mono">{row.sku}</td>
                      <td className="p-2.5">{row.category}</td>
                      <td className="p-2.5 font-semibold">Rs {row.price_pkr.toLocaleString()}</td>
                      <td className="p-2.5">{row.stock}</td>
                      <td className="p-2.5 text-rose-600">
                        {row.errors.length > 0 ? row.errors.join("; ") : "Valid"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Importing products into database...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setActiveTab("upload")}>
                Back
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={importing || parsedRows.filter((r) => r.isValid).length === 0}
                className="gap-2"
              >
                {importing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {importing
                  ? "Importing..."
                  : `Confirm & Import ${parsedRows.filter((r) => r.isValid).length} Products`}
              </Button>
            </div>
          </TabsContent>

          {/* TAB 3: SUMMARY REPORT */}
          <TabsContent value="summary" className="space-y-6 pt-4">
            {importSummary && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="border rounded-xl p-4 bg-card text-center">
                    <div className="text-2xl font-bold">{importSummary.total}</div>
                    <div className="text-xs text-muted-foreground">Total Processed</div>
                  </div>
                  <div className="border rounded-xl p-4 bg-emerald-50 border-emerald-200 text-center text-emerald-800">
                    <div className="text-2xl font-bold">{importSummary.success}</div>
                    <div className="text-xs text-emerald-600">Successfully Imported</div>
                  </div>
                  <div className="border rounded-xl p-4 bg-rose-50 border-rose-200 text-center text-rose-800">
                    <div className="text-2xl font-bold">{importSummary.failed}</div>
                    <div className="text-xs text-rose-600">Failed Rows</div>
                  </div>
                </div>

                {importSummary.failed > 0 && (
                  <div className="border rounded-xl p-6 bg-card space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-600 font-semibold">
                        <AlertTriangle className="h-5 w-5" />
                        <span>Failed Rows Breakdown</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadErrorReport}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Error Report (.csv)
                      </Button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto border rounded-lg p-3 text-xs space-y-2 bg-muted/30">
                      {importSummary.errorsList.map((err, idx) => (
                        <div key={idx} className="flex justify-between border-b pb-1">
                          <span className="font-mono">
                            Row {err.row} (SKU: {err.sku})
                          </span>
                          <span className="text-rose-600">{err.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button onClick={() => setOpen(false)}>Done</Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 4: HISTORY */}
          <TabsContent value="history" className="space-y-4 pt-4">
            <h3 className="font-semibold text-base">Recent Import Audit Logs</h3>
            <div className="border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/80 sticky top-0 text-left">
                  <tr>
                    <th className="p-2.5 font-semibold">Filename</th>
                    <th className="p-2.5 font-semibold">Total</th>
                    <th className="p-2.5 font-semibold">Success</th>
                    <th className="p-2.5 font-semibold">Failed</th>
                    <th className="p-2.5 font-semibold">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {importHistory.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-muted/20">
                      <td className="p-2.5 font-medium">{log.filename}</td>
                      <td className="p-2.5">{log.total_rows}</td>
                      <td className="p-2.5 text-emerald-600 font-semibold">{log.success_count}</td>
                      <td className="p-2.5 text-rose-600 font-semibold">{log.failed_count}</td>
                      <td className="p-2.5 text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {importHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No previous import logs recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
