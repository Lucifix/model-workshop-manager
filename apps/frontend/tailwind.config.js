/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Big Shoulders Display", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        workshop: {
          bg: "#0b1220",
          panel: "#141b2d",
          panelmuted: "#0f1626",
          sidebar: "#0a0f1c",
          border: "#232c42",
          accent: "#f97316",
          accentmuted: "#fb923c",
        },
      },
      boxShadow: {
        panel: "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)",
        lift: "0 12px 24px -8px rgba(0,0,0,0.5), 0 0 0 1px rgba(249,115,22,0.15)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
