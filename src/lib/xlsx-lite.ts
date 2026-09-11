/**
 * Minimal .xlsx reader/writer for catalog import.
 * Avoids the SheetJS dependency (license + install flakiness) while supporting
 * the Office Open XML files Excel, Google Sheets, and Numbers actually export.
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function u16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

function setU16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function setU32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser cannot read Excel files. Export the sheet as CSV and upload that instead.");
  }
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unzip(buffer: ArrayBuffer): Promise<Map<string, string>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const files = new Map<string, string>();
  const decoder = new TextDecoder("utf-8");
  let offset = 0;

  while (offset + 30 <= bytes.length) {
    const sig = u32(view, offset);
    if (sig !== 0x04034b50) break;

    const flags = u16(view, offset + 6);
    const method = u16(view, offset + 8);
    let compactSize = u32(view, offset + 18);
    let plainSize = u32(view, offset + 22);
    const nameLen = u16(view, offset + 26);
    const extraLen = u16(view, offset + 28);
    const name = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLen));
    let dataStart = offset + 30 + nameLen + extraLen;

    if (flags & 0x08 && compactSize === 0) {
      throw new Error("Excel file uses an unsupported ZIP layout. Save as .xlsx or .csv and try again.");
    }

    const compressed = bytes.subarray(dataStart, dataStart + compactSize);
    let raw: Uint8Array;
    if (method === 0) raw = compressed;
    else if (method === 8) raw = await inflateRaw(compressed);
    else throw new Error(`Unsupported ZIP compression (${method}) in ${name}`);

    if (plainSize && raw.length !== plainSize) {
      raw = raw.subarray(0, plainSize);
    }
    if (!name.endsWith("/")) files.set(name.replace(/^\/+/, ""), decoder.decode(raw));
    offset = dataStart + compactSize;
  }

  return files;
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colLetter(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function cellColumn(ref: string): number {
  const match = ref.match(/^([A-Za-z]+)/);
  if (!match) return 0;
  let n = 0;
  for (const ch of match[1].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return Math.max(0, n - 1);
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function taggedBlocks(xml: string, tag: string): string[] {
  const re = new RegExp(`<(?:\\w+:)?${tag}\\b([^>]*)>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, "gi");
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) blocks.push(match[2]);
  return blocks;
}

function attr(openTag: string, name: string): string {
  const match = openTag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"));
  return match?.[1] || "";
}

function innerTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:\\w+:)?${tag}>`, "i"));
  return match?.[1] ?? "";
}

function allTText(xml: string): string {
  const re = /<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/gi;
  const parts: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml))) parts.push(decodeXml(match[1]));
  return parts.join("");
}

function parseSharedStrings(xml: string): string[] {
  if (!xml) return [];
  return taggedBlocks(xml, "si").map((si) => allTText(si));
}

function cellValue(inner: string, type: string, shared: string[]): string {
  if (type === "s") {
    const idx = Number(decodeXml(innerTag(inner, "v")));
    return Number.isFinite(idx) ? String(shared[idx] ?? "") : "";
  }
  if (type === "inlineStr") return allTText(inner);
  if (type === "b") return decodeXml(innerTag(inner, "v")) === "1" ? "TRUE" : "FALSE";
  const v = innerTag(inner, "v");
  if (v) return decodeXml(v);
  return allTText(inner).trim();
}

function firstSheetPath(files: Map<string, string>): string | undefined {
  const book = files.get("xl/workbook.xml") || "";
  const rels = files.get("xl/_rels/workbook.xml.rels") || "";
  const sheetOpen = book.match(/<(?:\w+:)?sheet\b([^>/]*)/i);
  const rid = sheetOpen ? attr(sheetOpen[1], "r:id") || attr(sheetOpen[1], "Id") : "";
  if (rid) {
    const relMatch = rels.match(
      new RegExp(`<(?:\\w+:)?Relationship\\b([^>]*\\bId="${rid}"[^>]*)`, "i"),
    );
    if (relMatch) {
      const target = attr(relMatch[1], "Target").replace(/\\/g, "/").replace(/^\.\//, "");
      const path = target.startsWith("/") ? target.replace(/^\/+/, "") : `xl/${target}`;
      if (files.has(path)) return path;
    }
  }
  return (
    [...files.keys()].find((key) => key.replace(/\\/g, "/") === "xl/worksheets/sheet1.xml") ||
    [...files.keys()].find((key) => /xl\/worksheets\/sheet\d+\.xml$/i.test(key.replace(/\\/g, "/")))
  );
}

export async function xlsxToMatrix(buffer: ArrayBuffer): Promise<string[][]> {
  const files = await unzip(buffer);
  const sheetPath = firstSheetPath(files);
  if (!sheetPath) throw new Error("Excel file has no worksheets");
  const sheetXml = files.get(sheetPath)!;
  const shared = parseSharedStrings(files.get("xl/sharedStrings.xml") || "");
  const rows: string[][] = [];
  let width = 0;
  const rowRe = /<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(sheetXml))) {
    const next: string[] = [];
    const cellRe = /<(?:\w+:)?c\b([^>]*)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      const ref = attr(cellMatch[1], "r");
      const type = attr(cellMatch[1], "t");
      const col = cellColumn(ref);
      while (next.length < col) next.push("");
      next[col] = cellValue(cellMatch[2] || "", type, shared).trim();
    }
    if (next.every((value) => !value)) continue;
    width = Math.max(width, next.length);
    rows.push(next);
  }

  return rows.map((row) => {
    const padded = row.slice();
    while (padded.length < width) padded.push("");
    return padded;
  });
}

function dosDateTime(date: Date) {
  const time = (date.getSeconds() >> 1) | (date.getMinutes() << 5) | (date.getHours() << 11);
  const day = date.getDate() | ((date.getMonth() + 1) << 5) | ((date.getFullYear() - 1980) << 9);
  return { time, date: day };
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof CompressionStream === "undefined") return data;
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function buildXlsx(aoa: string[][]): Promise<Blob> {
  const sheetRows = aoa
    .map((row, rIdx) => {
      const cells = row
        .map((value, cIdx) => {
          const ref = `${colLetter(cIdx)}${rIdx + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(String(value ?? ""))}</t></is></c>`;
        })
        .join("");
      return `<row r="${rIdx + 1}">${cells}</row>`;
    })
    .join("");

  const files: Record<string, string> = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Products" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetRows}</sheetData>
</worksheet>`,
  };

  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(new Date());
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const compressed = await deflateRaw(data);
    const useDeflate = typeof CompressionStream !== "undefined";
    const payload = useDeflate ? compressed : data;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length);
    setU32(local, 0, 0x04034b50);
    setU16(local, 4, 20);
    setU16(local, 8, method);
    setU16(local, 10, time);
    setU16(local, 12, date);
    setU32(local, 14, crc);
    setU32(local, 18, payload.length);
    setU32(local, 22, data.length);
    setU16(local, 26, nameBytes.length);
    local.set(nameBytes, 30);
    locals.push(local, payload);

    const central = new Uint8Array(46 + nameBytes.length);
    setU32(central, 0, 0x02014b50);
    setU16(central, 4, 20);
    setU16(central, 6, 20);
    setU16(central, 10, method);
    setU16(central, 12, time);
    setU16(central, 14, date);
    setU32(central, 16, crc);
    setU32(central, 20, payload.length);
    setU32(central, 24, data.length);
    setU16(central, 28, nameBytes.length);
    setU32(central, 42, offset);
    central.set(nameBytes, 46);
    centrals.push(central);
    offset += local.length + payload.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  setU32(eocd, 0, 0x06054b50);
  setU16(eocd, 8, Object.keys(files).length);
  setU16(eocd, 10, Object.keys(files).length);
  setU32(eocd, 12, centralSize);
  setU32(eocd, 16, offset);

  return new Blob([...locals, ...centrals, eocd], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function sniffSpreadsheetKind(buffer: ArrayBuffer): "xlsx" | "xls" | "csv" | "unknown" {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) return "xlsx";
  if (bytes.length >= 8 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return "xls";
  }
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.subarray(0, 256));
  if (head.includes(",") || head.includes(";") || head.includes("\t")) return "csv";
  return "unknown";
}
