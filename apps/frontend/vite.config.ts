import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Model Workshop Manager",
        short_name: "Workshop",
        description: "Personal scale-model kit, paint, and build tracker",
        theme_color: "#0b1220",
        background_color: "#0b1220",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-maskable-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Minimal offline shell (spec §17): precache the app shell,
        // network-first for API calls so stale data is never silently shown.
        runtimeCaching: [
          {
            // Backup archives can be many MB — pass straight through with no
            // caching/timeout handling. NetworkFirst's 5s timeout + cache
            // fallback (with nothing ever cached for a one-off filename)
            // otherwise surfaces as a "no-response" error on download.
            // Must be listed before the general /api/.* rule below, since
            // workbox matches routes in registration order.
            urlPattern: /\/api\/backup\/.*/,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /\/api\/.*/,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
      "/uploads": "http://localhost:3001",
    },
  },
});
