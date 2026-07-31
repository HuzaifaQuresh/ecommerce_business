/**
 * Picks Vite config: on Windows, use Tailwind v3 config when Oxide native binary is blocked.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(root, "..");

function oxideLoads() {
  if (process.platform !== "win32") return true;
  try {
    createRequire(import.meta.url)("@tailwindcss/oxide-win32-x64-msvc");
    return true;
  } catch {
    return false;
  }
}

const useWindows = process.platform === "win32" && !oxideLoads();
const args = ["dev", ...(useWindows ? ["--config", "vite.config.windows.mjs"] : [])];

if (useWindows) {
  console.log(
    "[dev] Windows: Application Control blocked @tailwindcss/oxide — using vite.config.windows.mjs (Tailwind v3).\n",
  );
}

const child = spawn("npx", ["vite", ...args], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 1));
