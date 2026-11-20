import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Переводы лежат в public/ и грузятся один раз при открытии страницы, HMR их
// не подхватывает. В разработке при изменении translation.json — полная перезагрузка.
function reloadOnLocalesChange(): Plugin {
  return {
    name: "reload-on-locales-change",
    apply: "serve",
    configureServer(server) {
      const localesDir = path.resolve(process.cwd(), "public", "locales");
      server.watcher.add(localesDir);
      server.watcher.on("change", (file) => {
        if (path.resolve(file).startsWith(localesDir)) server.ws.send({ type: "full-reload" });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(process.cwd(), "env"));
  return {
    plugins: [react(), reloadOnLocalesChange()],
    server: { port: 5175, open: true, strictPort: true },
    base: env.VITE_BASE_URL ?? "/",
    envDir: "env",
    optimizeDeps: {
      include: ["react-slick"],
    },
    build: {
      emptyOutDir: true,
      cssCodeSplit: false,
      chunkSizeWarningLimit: 1000,
      target: ["es2020", "safari14"],
      outDir: "dist",
      minify: "terser",
      terserOptions: {
        compress: true,
        mangle: true,
        format: {
          comments: false,
          ascii_only: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": "/src",
        "@GrowthPoints": "/src/dashboards/GrowthPoints",
        "@Accidents": "/src/dashboards/Accidents",
        "@Rso": "/src/dashboards/Rso",
      },
    },
  };
});
