import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async ({ mode, command }) => {
  const loaded = loadEnv(mode, root, "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loaded)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const plugins = [
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      srcDirectory: "src",
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    react(),
    tailwindcss(),
  ];

  return {
    define: envDefine,
    resolve: {
      alias: { "@": path.join(root, "src") },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins,
    build: {
      target: "esnext",
      minify: "esbuild",
      cssMinify: true,
    },
    server: {
      host: "0.0.0.0",
      port: 3000,
      allowedHosts: "all",
      strictPort: false,
    },
  };
});
