import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  FileDown,
} from "lucide-react";
import {
  downloadImportTemplate,
  findExistingProduct,
  parseProductSpreadsheet,
  toProductRow,
  type ParsedProductRow,
} from "@/lib/product-import";
import {
  initializeMockProductsOnClient,
  MOCK_PRODUCTS,
  saveLocalProduct,
  syncServerProducts,
} from "@/lib/mock-products";
import { cn } from "@/lib/utils";

type ImportLogItem = {
  id: string;
  filename: string;
  total_rows: number;
  success_count: number;
  failed_count: number;
  created_count: number;
  updated_count: number;
  status: string;
  created_at: string;
};

const LOG_KEY = "nexus_import_logs";

function readImportLogs(): ImportLogItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeImportLog(entry: ImportLogItem) {
  const next = [entry, ...readImportLogs()].slice(0, 40);
  localStorage.setItem(LOG_KEY, JSON.stringify(next));
}

export function ProductImportModal({ onImportComplete }: { onImportComplete: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedProductRow[]>([]);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    success: number;
    failed: number;
    created: number;
    updated: number;
    errorsList: { row: number; sku: string; reason: string }[];
  } | null>(null);
  const [importHistory, setImportHistory] = useState<ImportLogItem[]>([]);
  const [activeTab, setActiveTab] = useState("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setImportHistory(readImportLogs());
  }, [open]);

  const resetState = () => {
    setFile(null);
    setParsedRows([]);
    setImportSummary(null);
    setProgress(0);
    setImporting(false);
    setParsing(false);
    setActiveTab("upload");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const acceptFile = async (selected: File | undefined | null) => {
    if (!selected) return;
    const ext = selected.name.substring(selected.name.lastIndexOf(".")).toLowerCase();
    if (![".csv", ".xlsx", ".xls", ".tsv"].includes(ext)) {
      toast.error("Please upload a .csv or .xlsx file.");
      return;
    }
    if (selected.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds 20MB.");
      return;
    }
    setFile(selected);
    setParsing(true);
    setImportSummary(null);
    try {
      initializeMockProductsOnClient();
      const rows = await parseProductSpreadsheet(selected);
      if (!rows.length) {
        toast.error("The file has headers but no product rows.");
        setParsedRows([]);
        return;
      }
      setParsedRows(rows);
      setActiveTab("preview");
      const valid = rows.filter((row) => row.isValid).length;
      toast.success(`Parsed ${rows.length} rows — ${valid} ready to import.`);
    } catch (err: any) {
      console.error("Parse error", err);
      toast.error(err?.message || "Could not read this file. Use the CSV/Excel template.");
      setParsedRows([]);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    const validRows = parsedRows.filter((row) => row.isValid);
    if (!validRows.length) return;
    setImporting(true);
    setProgress(8);

    initializeMockProductsOnClient();
    try {
      await syncServerProducts();
    } catch {
      /* local catalog is enough */
    }

    let created = 0;
    let updated = 0;
    let failed = 0;
    const errorsList: { row: number; sku: string; reason: string }[] = [];

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      if (!row.isValid) {
        failed++;
        errorsList.push({ row: row.rowNumber, sku: row.sku, reason: row.errors.join("; ") });
      } else {
        try {
          const existing = findExistingProduct(MOCK_PRODUCTS, row);
          const product = toProductRow(row, existing);
          saveLocalProduct(product);
          if (existing) updated++;
          else created++;
        } catch (err: any) {
          failed++;
          errorsList.push({
            row: row.rowNumber,
            sku: row.sku,
            reason: err?.message || "Could not save this product",
          });
        }
      }
      setProgress(Math.round(((i + 1) / parsedRows.length) * 90) + 8);
      if (i % 8 === 7) await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const log: ImportLogItem = {
      id: "log-" + Date.now(),
      filename: file?.name || "products-import",
      total_rows: parsedRows.length,
      success_count: created + updated,
      failed_count: failed,
      created_count: created,
      updated_count: updated,
      status: "completed",
      created_at: new Date().toISOString(),
    };
    writeImportLog(log);
    setImportHistory(readImportLogs());

    setImporting(false);
    setProgress(100);
    setImportSummary({
      total: parsedRows.length,
      success: created + updated,
      failed,
      created,
      updated,
      errorsList,
    });
    setActiveTab("summary");
    toast.success(
      `Import complete: ${created} created, ${updated} updated${failed ? `, ${failed} skipped` : ""}.`,
    );
    onImportComplete();
  };

  const downloadErrorReport = () => {
    if (!importSummary?.errorsList.length) return;
    const csv = [
      "Row Number,SKU,Error Reason",
      ...importSummary.errorsList.map(
        (item) => `${item.row},"${item.sku.replace(/"/g, '""')}","${item.reason.replace(/"/g, '""')}"`,
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smartzone-import-errors.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const validCount = parsedRows.filter((row) => row.isValid).length;
  const errorCount = parsedRows.length - validCount;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-[44px] gap-2 border-[#0052B4]/30 text-[#0B192C]">
          <Upload className="h-4 w-4" />
          Import Excel / CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-[#0B192C]">
            <FileSpreadsheet className="h-6 w-6 text-[#FF7A00]" />
            Bulk catalog import
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">1. File</TabsTrigger>
            <TabsTrigger value="preview" disabled={parsedRows.length === 0}>
              2. Preview ({parsedRows.length})
            </TabsTrigger>
            <TabsTrigger value="summary" disabled={!importSummary}>
              3. Result
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-3.5 w-3.5" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-5 pt-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                void acceptFile(event.dataTransfer.files?.[0]);
              }}
              className={cn(
                "rounded-xl border-2 border-dashed p-8 text-center space-y-4 transition-colors",
                dragOver
                  ? "border-[#FF7A00] bg-[#FF7A00]/8"
                  : "border-[#0052B4]/25 bg-[#0052B4]/[0.04]",
              )}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#0B192C] text-white">
                <Upload className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-[#0B192C]">Drop Excel or CSV here</h3>
                <p className="text-sm text-muted-foreground">
                  .xlsx and .csv up to 20MB. Matching SKUs update existing products; new SKUs are
                  added. The rest of the catalog is left untouched.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(event) => void acceptFile(event.target.files?.[0])}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing}
                className="gap-2 bg-[#FF7A00] hover:bg-[#E56E00] text-white"
              >
                {parsing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {parsing ? "Reading file…" : "Select file"}
              </Button>
              {file && (
                <p className="text-xs font-medium text-emerald-700">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h4 className="font-semibold text-[#0B192C]">Import template</h4>
              <p className="text-xs text-muted-foreground">
                Required: Product Name, Price. SKU is used to update an existing item. Sale Price
                becomes a discount. Status maps to in stock / on demand / coming soon / obsolete.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    void downloadImportTemplate("xlsx");
                    toast.success("Excel template downloaded.");
                  }}
                >
                  <FileDown className="h-4 w-4" />
                  Excel template
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    void downloadImportTemplate("csv");
                    toast.success("CSV template downloaded.");
                  }}
                >
                  <Download className="h-4 w-4" />
                  CSV template
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-5 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Validation preview</h3>
                <p className="text-xs text-muted-foreground">
                  Valid rows upsert by SKU into the live catalog. Invalid rows are skipped.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  {validCount} ready
                </Badge>
                <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">
                  {errorCount} errors
                </Badge>
              </div>
            </div>

            <div className="max-h-[350px] overflow-auto rounded-xl border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/90 text-left">
                  <tr>
                    <th className="p-2.5 font-semibold">Row</th>
                    <th className="p-2.5 font-semibold">Status</th>
                    <th className="p-2.5 font-semibold">Title</th>
                    <th className="p-2.5 font-semibold">SKU</th>
                    <th className="p-2.5 font-semibold">Category</th>
                    <th className="p-2.5 font-semibold">Price</th>
                    <th className="p-2.5 font-semibold">Stock</th>
                    <th className="p-2.5 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 80).map((row) => {
                    const existing = findExistingProduct(MOCK_PRODUCTS, row);
                    const notes = [...row.errors, ...row.warnings];
                    return (
                      <tr key={row.rowNumber} className="border-t hover:bg-muted/20">
                        <td className="p-2.5 font-mono">{row.rowNumber}</td>
                        <td className="p-2.5">
                          {row.isValid ? (
                            <span className="flex items-center gap-1 font-medium text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {existing ? "Update" : "New"}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 font-medium text-rose-600">
                              <XCircle className="h-3.5 w-3.5" /> Error
                            </span>
                          )}
                        </td>
                        <td className="max-w-[180px] truncate p-2.5 font-medium">{row.title || "—"}</td>
                        <td className="p-2.5 font-mono">{row.sku || "—"}</td>
                        <td className="p-2.5">{row.category}</td>
                        <td className="p-2.5 font-semibold">Rs {row.price_pkr.toLocaleString()}</td>
                        <td className="p-2.5">{row.stock}</td>
                        <td className={cn("p-2.5", row.errors.length ? "text-rose-600" : "text-amber-700")}>
                          {notes.length ? notes.join("; ") : "OK"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 80 && (
              <p className="text-xs text-muted-foreground">Showing first 80 rows. All rows still import.</p>
            )}

            {importing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Writing products into catalog…</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <Button variant="outline" onClick={() => setActiveTab("upload")}>
                Back
              </Button>
              <Button
                onClick={() => void handleConfirmImport()}
                disabled={importing || validCount === 0}
                className="gap-2 bg-[#0B192C] hover:bg-[#0F2C59]"
              >
                {importing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {importing ? "Importing…" : `Import ${validCount} products`}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="summary" className="space-y-6 pt-4">
            {importSummary && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border bg-card p-4 text-center">
                    <div className="text-2xl font-bold">{importSummary.total}</div>
                    <div className="text-xs text-muted-foreground">Processed</div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-800">
                    <div className="text-2xl font-bold">{importSummary.created}</div>
                    <div className="text-xs text-emerald-700">Created</div>
                  </div>
                  <div className="rounded-xl border border-[#0052B4]/20 bg-[#0052B4]/5 p-4 text-center text-[#0B192C]">
                    <div className="text-2xl font-bold">{importSummary.updated}</div>
                    <div className="text-xs text-[#0052B4]">Updated</div>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-rose-800">
                    <div className="text-2xl font-bold">{importSummary.failed}</div>
                    <div className="text-xs text-rose-600">Skipped</div>
                  </div>
                </div>

                {importSummary.failed > 0 && (
                  <div className="space-y-3 rounded-xl border bg-card p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 font-semibold text-amber-700">
                        <AlertTriangle className="h-5 w-5" />
                        Skipped rows
                      </div>
                      <Button variant="outline" size="sm" className="gap-2" onClick={downloadErrorReport}>
                        <Download className="h-4 w-4" />
                        Error CSV
                      </Button>
                    </div>
                    <div className="max-h-[200px] space-y-2 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-xs">
                      {importSummary.errorsList.map((item, idx) => (
                        <div key={idx} className="flex justify-between gap-3 border-b pb-1">
                          <span className="font-mono">
                            Row {item.row} · {item.sku}
                          </span>
                          <span className="text-rose-600">{item.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button className="bg-[#FF7A00] hover:bg-[#E56E00] text-white" onClick={() => setOpen(false)}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 pt-4">
            <h3 className="font-semibold">Recent imports</h3>
            <div className="max-h-[350px] overflow-auto rounded-xl border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/90 text-left">
                  <tr>
                    <th className="p-2.5 font-semibold">File</th>
                    <th className="p-2.5 font-semibold">Total</th>
                    <th className="p-2.5 font-semibold">Created</th>
                    <th className="p-2.5 font-semibold">Updated</th>
                    <th className="p-2.5 font-semibold">Failed</th>
                    <th className="p-2.5 font-semibold">When</th>
                  </tr>
                </thead>
                <tbody>
                  {importHistory.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-muted/20">
                      <td className="p-2.5 font-medium">{log.filename}</td>
                      <td className="p-2.5">{log.total_rows}</td>
                      <td className="p-2.5 font-semibold text-emerald-600">{log.created_count ?? "—"}</td>
                      <td className="p-2.5 font-semibold text-[#0052B4]">{log.updated_count ?? "—"}</td>
                      <td className="p-2.5 font-semibold text-rose-600">{log.failed_count}</td>
                      <td className="p-2.5 text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {importHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No imports yet.
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
