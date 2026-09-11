import fs from "node:fs";
import path from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const pdfPath = process.argv[2];
const outPath = process.argv[3];
const maxPages = Number(process.argv[4] || 0);

const data = new Uint8Array(fs.readFileSync(pdfPath));
const pdf = await getDocument({ data, disableWorker: true, verbosity: 0 }).promise;
const last = maxPages > 0 ? Math.min(maxPages, pdf.numPages) : pdf.numPages;
console.log(`pages=${pdf.numPages} extracting=1..${last}`);

const chunks = [];
for (let i = 1; i <= last; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  const lines = [];
  let rowY = null;
  let row = [];
  for (const item of content.items) {
    const str = "str" in item ? String(item.str) : "";
    if (!str.trim() && str !== " ") continue;
    const y = item.transform?.[5];
    if (rowY == null || (typeof y === "number" && Math.abs(y - rowY) > 3)) {
      if (row.length) lines.push(row.join(" ").replace(/\s+/g, " ").trim());
      row = [str.trim()];
      rowY = y;
    } else {
      row.push(str.trim());
    }
  }
  if (row.length) lines.push(row.join(" ").replace(/\s+/g, " ").trim());
  chunks.push(`\n===== PAGE ${i} =====\n${lines.filter(Boolean).join("\n")}`);
  if (i % 10 === 0 || i === last) {
    console.log(`extracted ${i}/${last}`);
    fs.writeFileSync(outPath, chunks.join("\n"), "utf8");
  }
}

fs.writeFileSync(outPath, chunks.join("\n"), "utf8");
console.log(`wrote ${outPath} bytes=${fs.statSync(outPath).size}`);
