/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        workshop: {
          bg: "#0f172a",
          panel: "#111827",
          accent: "#f97316",
        },
      },
    },
  },
  plugins: [],
};
