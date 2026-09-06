import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// NOTE: vite-plugin-pwa is deliberately NOT wired in here yet. It conflicts
// with @react-router/dev's SSR build environment (its own build pass
// re-processes app.css outside the app's postcss context and fails) — this
// is the PWA-compatibility risk flagged in the migration plan (M0/M4).
// Re-add it as a follow-up: hand-roll the service worker/manifest, or retry
// vite-plugin-pwa once a version compatible with React Router's SSR
// environments build is confirmed.
export default defineConfig({
  environments: {
    ssr: {
      build: {
        rollupOptions: {
          input: "./server/app.ts",
        },
      },
    },
  },
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
});
