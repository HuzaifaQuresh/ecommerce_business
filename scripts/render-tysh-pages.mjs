import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

const pdfPath = process.argv[2];
const outDir = process.argv[3];
const startPage = Number(process.argv[4] || 1);
const endPage = Number(process.argv[5] || 0);
const scale = Number(process.argv[6] || 1.35);

fs.mkdirSync(outDir, { recursive: true });
const canvasFactory = new NodeCanvasFactory();
const data = new Uint8Array(fs.readFileSync(pdfPath));
const pdf = await getDocument({
  data,
  canvasFactory,
  disableFontFace: true,
  verbosity: 0,
}).promise;

const last = endPage > 0 ? Math.min(endPage, pdf.numPages) : pdf.numPages;
console.log(`pages=${pdf.numPages} render=${startPage}..${last} scale=${scale}`);

for (let i = startPage; i <= last; i++) {
  const page = await pdf.getPage(i);
  const viewport = page.getViewport({ scale });
  const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
  await page.render({
    canvasContext: canvasAndContext.context,
    viewport,
    canvas: canvasAndContext.canvas,
  }).promise;
  const file = path.join(outDir, `page-${String(i).padStart(2, "0")}.jpg`);
  fs.writeFileSync(file, canvasAndContext.canvas.toBuffer("image/jpeg", 78));
  console.log(`wrote ${file} ${Math.round(fs.statSync(file).size / 1024)}kb ${Math.round(viewport.width)}x${Math.round(viewport.height)}`);
  canvasFactory.destroy(canvasAndContext);
}
