import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, root, "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loaded)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    define: envDefine,
    resolve: {
      alias: { "@": path.resolve(root, "src") },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins: [
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({ srcDirectory: "src" }),
      react(),
      tailwindcss(),
    ],
    build: {
      target: "esnext",
      minify: "esbuild",
      cssMinify: true,
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
    },
  };
});
