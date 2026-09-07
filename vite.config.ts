import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { configDefaults, defineConfig } from "vitest/config";

// PWA support (manifest + service worker) is hand-rolled in public/ rather
// than via vite-plugin-pwa — its build pass re-processes app.css outside
// @react-router/dev's SSR postcss context and fails. See #32.
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
  test: {
    // The e2e/ suite runs under Playwright (npm run test:e2e), not vitest —
    // without this exclude, vitest's default *.spec.ts glob also picks up
    // those files and fails trying to run @playwright/test's `test()`.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      include: ["app/**/*.{ts,tsx}", "server/**/*.ts"],
      exclude: [
        "app/db/migrations/**",
        "app/**/*.test.{ts,tsx}",
        "app/routes.ts",
        "app/entry.*.tsx",
        "app/root.tsx",
      ],
    },
  },
});
