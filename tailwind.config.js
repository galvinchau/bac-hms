/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        "bac-bg": "#0f172a",
        "bac-panel": "#111827",
        "bac-border": "#1f2937",
        "bac-text": "#e5e7eb",
        "bac-muted": "#9ca3af",
        "bac-primary": "#3b82f6",
        "bac-green": "#22c55e",
        "bac-red": "#ef4444",
      },
    },
  },
  plugins: [],
};
