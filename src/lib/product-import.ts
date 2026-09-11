import { ALL_CATEGORY_LABELS } from "@/lib/categories";
import { buildXlsx, sniffSpreadsheetKind, xlsxToMatrix } from "@/lib/xlsx-lite";
import type { ProductRow } from "@/types/commerce";

export type ImportAvailability = ProductRow["availability"];

export type ParsedProductRow = {
  rowNumber: number;
  title: string;
  sku: string;
  slug: string;
  category: string;
  manufacturer: string;
  description: string;
  price_pkr: number;
  discount_pct: number;
  stock: number;
  image_url: string;
  gallery_urls: string[];
  tags: string[];
  availability: ImportAvailability;
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

const HEADER_ALIASES: Record<keyof Pick<
  ParsedProductRow,
  | "title"
  | "sku"
  | "category"
  | "manufacturer"
  | "description"
  | "price_pkr"
  | "stock"
  | "image_url"
  | "availability"
> | "subcategory" | "sale_price" | "tags" | "status", string[]> = {
  title: ["productname", "producttitle", "title", "name", "product", "itemname"],
  sku: ["sku", "productcode", "itemcode", "itemno", "code", "skucode"],
  category: ["category", "department", "maincategory"],
  subcategory: ["subcategory", "subcategoryname", "subcat"],
  manufacturer: ["brand", "manufacturer", "make", "vendor"],
  description: ["description", "details", "longdescription", "productdescription"],
  price_pkr: ["pricepkr", "regularprice", "unitprice", "mrp", "price"],
  sale_price: ["saleprice", "discountedprice", "offerprice", "specialprice", "sale"],
  stock: ["stockquantity", "stock", "quantity", "qty", "inventory"],
  image_url: ["productimages", "imageurl", "imageurls", "photourl", "images", "image"],
  tags: ["tagskeywords", "keywords", "tags"],
  status: ["status", "availability", "stockstatus"],
  availability: ["availability"],
};

export const IMPORT_TEMPLATE_HEADERS = [
  "Product Name",
  "SKU",
  "Category",
  "Sub-category",
  "Brand",
  "Description",
  "Price (PKR)",
  "Sale Price (PKR)",
  "Stock",
  "Image URL",
  "Status",
  "Tags",
] as const;

export const IMPORT_SAMPLE_ROWS: string[][] = [
  [
    "Tuya Zigbee Smart Thermostat",
    "TZ-TH-01",
    "IoT Solutions",
    "Smart Thermostats",
    "Tuya",
    "Smart LCD temperature controller with Zigbee mesh.",
    "4500",
    "3999",
    "75",
    "https://images.unsplash.com/photo-1558002038-1055907df827?w=600",
    "Active",
    "thermostat, zigbee, climate",
  ],
  [
    "Smart RGB LED Strip 5m",
    "LED-RGB-5M",
    "IoT Solutions",
    "Smart Home Automation",
    "Sonoff",
    "WiFi RGB LED strip with music sync and voice control.",
    "2800",
    "",
    "150",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600",
    "Active",
    "lighting, led, wifi",
  ],
];

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function detectDelimiter(firstLine: string): string {
  const comma = (firstLine.match(/,/g) || []).length;
  const semi = (firstLine.match(/;/g) || []).length;
  const tab = (firstLine.match(/\t/g) || []).length;
  if (tab >= comma && tab >= semi && tab > 0) return "\t";
  if (semi > comma) return ";";
  return ",";
}

export function parseCsvText(text: string): string[][] {
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const firstLine = source.split("\n").find((line) => line.trim()) || "";
  const delimiter = detectDelimiter(firstLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell.trim());
      if (row.some((value) => value)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell.trim());
  if (row.some((value) => value)) rows.push(row);
  return rows;
}

function columnIndex(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const exact = headers.findIndex((header) => header === alias);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases) {
    if (alias.length < 5) continue;
    const loose = headers.findIndex(
      (header) => header.length >= 4 && (header.includes(alias) || alias.includes(header)),
    );
    if (loose >= 0) return loose;
  }
  return -1;
}

function cell(cols: string[], headers: string[], aliases: string[]): string {
  const idx = columnIndex(headers, aliases);
  if (idx < 0) return "";
  return (cols[idx] ?? "").trim();
}

function parseMoney(raw: string): number {
  const cleaned = raw.replace(/,/g, "").replace(/[^\d.]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function parseIntSafe(raw: string, fallback = 0): number {
  const cleaned = raw.replace(/[^\d-]/g, "");
  const value = parseInt(cleaned, 10);
  return Number.isFinite(value) ? value : fallback;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function matchCategory(raw: string): { category: string; warning?: string } {
  const value = raw.trim();
  if (!value) return { category: "Components", warning: "Category missing — defaulted to Components" };
  const exact = ALL_CATEGORY_LABELS.find((label) => label.toLowerCase() === value.toLowerCase());
  if (exact) return { category: exact };
  const fuzzy = ALL_CATEGORY_LABELS.find(
    (label) =>
      label.toLowerCase().includes(value.toLowerCase()) ||
      value.toLowerCase().includes(label.toLowerCase()),
  );
  if (fuzzy) return { category: fuzzy, warning: `Category mapped to "${fuzzy}"` };
  return { category: value };
}

function parseAvailability(status: string, stock: number): ImportAvailability {
  const value = status.trim().toLowerCase();
  if (["obsolete", "discontinued", "inactive", "hidden", "draft"].includes(value)) return "obsolete";
  if (["coming soon", "coming_soon", "preorder"].includes(value)) return "coming_soon";
  if (
    ["on demand", "on_demand", "made to order", "out of stock", "outofstock", "out_of_stock"].includes(
      value,
    )
  ) {
    return "on_demand";
  }
  if (stock <= 0) return "on_demand";
  return "in_stock";
}

function splitList(raw: string): string[] {
  return raw
    .split(/[|,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function mapSpreadsheetRows(matrix: string[][]): ParsedProductRow[] {
  if (matrix.length < 2) return [];
  const headers = matrix[0].map(normalizeHeader);
  const rows: ParsedProductRow[] = [];
  const seenSkus = new Map<string, number>();

  for (let i = 1; i < matrix.length; i++) {
    const cols = matrix[i].map((value) => String(value ?? "").trim());
    if (cols.every((value) => !value)) continue;

    const title = cell(cols, headers, HEADER_ALIASES.title);
    const skuRaw = cell(cols, headers, HEADER_ALIASES.sku);
    const categoryRaw = cell(cols, headers, HEADER_ALIASES.category);
    const subCategory = cell(cols, headers, HEADER_ALIASES.subcategory);
    const manufacturer = cell(cols, headers, HEADER_ALIASES.manufacturer);
    const description = cell(cols, headers, HEADER_ALIASES.description);
    const price = parseMoney(cell(cols, headers, HEADER_ALIASES.price_pkr));
    const salePrice = parseMoney(cell(cols, headers, HEADER_ALIASES.sale_price));
    const stock = parseIntSafe(cell(cols, headers, HEADER_ALIASES.stock), 0);
    const imageRaw = cell(cols, headers, HEADER_ALIASES.image_url);
    const tagsRaw = cell(cols, headers, HEADER_ALIASES.tags);
    const status = cell(cols, headers, HEADER_ALIASES.status);

    const categoryMatch = matchCategory(subCategory || categoryRaw);
    const images = splitList(imageRaw);
    const sku = skuRaw || (title ? `SZ-${slugify(title).slice(0, 24).toUpperCase()}` : "");
    const slug = slugify(sku || title);
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!title) errors.push("Product name is required");
    if (!sku) errors.push("SKU is required");
    if (price <= 0) errors.push("Price must be greater than 0");
    if (stock < 0) errors.push("Stock cannot be negative");
    if (categoryMatch.warning) warnings.push(categoryMatch.warning);

    const skuKey = sku.toLowerCase();
    if (skuKey && seenSkus.has(skuKey)) {
      errors.push(`Duplicate SKU in file (also row ${seenSkus.get(skuKey)})`);
    } else if (skuKey) {
      seenSkus.set(skuKey, i + 1);
    }

    let discount_pct = 0;
    if (salePrice > 0 && salePrice < price) {
      discount_pct = Math.round(((price - salePrice) / price) * 100);
    } else if (salePrice > price) {
      warnings.push("Sale price is higher than regular price — ignored");
    }

    rows.push({
      rowNumber: i + 1,
      title,
      sku,
      slug,
      category: categoryMatch.category,
      manufacturer,
      description,
      price_pkr: price,
      discount_pct,
      stock,
      image_url: images[0] || "",
      gallery_urls: images.slice(1),
      tags: splitList(tagsRaw),
      availability: parseAvailability(status, stock),
      isValid: errors.length === 0,
      errors,
      warnings,
    });
  }

  return rows;
}

export async function parseProductSpreadsheet(file: File): Promise<ParsedProductRow[]> {
  const buffer = await file.arrayBuffer();
  const kind = sniffSpreadsheetKind(buffer);
  const name = file.name.toLowerCase();

  const isLegacyXls = kind === "xls" || (name.endsWith(".xls") && !name.endsWith(".xlsx"));
  if (isLegacyXls) {
    throw new Error(
      "Legacy .xls (Excel 97-2003) is not supported. In Excel choose File → Save As → Excel Workbook (.xlsx) or CSV, then upload again.",
    );
  }

  if (kind === "xlsx") {
    return mapSpreadsheetRows(await xlsxToMatrix(buffer));
  }

  if (kind === "csv" || name.endsWith(".csv") || name.endsWith(".tsv") || file.type.includes("csv")) {
    return mapSpreadsheetRows(parseCsvText(new TextDecoder("utf-8").decode(buffer)));
  }

  if (name.endsWith(".xlsx")) {
    return mapSpreadsheetRows(await xlsxToMatrix(buffer));
  }

  throw new Error("Please upload a .csv or .xlsx file");
}

export function toProductRow(row: ParsedProductRow, existing?: ProductRow | null): ProductRow {
  const specs = { ...(existing?.specs ?? {}) };
  specs.sku = row.sku;
  const tags = Array.from(new Set([row.sku, ...row.tags, ...(existing?.tags ?? [])])).filter(Boolean);
  return {
    id: existing?.id || `user-imp-${row.slug || crypto.randomUUID()}`,
    title: row.title,
    slug: existing?.slug || row.slug,
    description: row.description || existing?.description || "",
    category: row.category,
    price_pkr: row.price_pkr,
    stock: row.stock,
    image_url: row.image_url || existing?.image_url || "",
    gallery_urls: row.gallery_urls.length ? row.gallery_urls : existing?.gallery_urls || [],
    manufacturer: row.manufacturer || existing?.manufacturer || "",
    color: existing?.color ?? null,
    availability: row.availability,
    discount_pct: row.discount_pct,
    tags,
    rating: existing?.rating ?? 4.5,
    specs,
    vendor_id: existing?.vendor_id ?? null,
    created_at: existing?.created_at,
  };
}

export function findExistingProduct(catalog: ProductRow[], row: ParsedProductRow): ProductRow | undefined {
  const sku = row.sku.toLowerCase();
  return catalog.find((product) => {
    const specSku = String(product.specs?.sku ?? "").toLowerCase();
    const tagSku = (product.tags ?? []).some((tag) => tag.toLowerCase() === sku);
    return specSku === sku || tagSku || product.slug === row.slug || product.id === row.sku;
  });
}

export async function downloadImportTemplate(kind: "csv" | "xlsx") {
  const lines = [
    IMPORT_TEMPLATE_HEADERS.join(","),
    ...IMPORT_SAMPLE_ROWS.map((row) =>
      row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
    ),
  ];

  if (kind === "csv") {
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    triggerDownload(blob, "smartzone-product-import-template.csv");
    return;
  }

  const blob = await buildXlsx([[...IMPORT_TEMPLATE_HEADERS], ...IMPORT_SAMPLE_ROWS]);
  triggerDownload(blob, "smartzone-product-import-template.xlsx");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
