import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        evo: {
          black: "#050706",
          bg: "#07100F",
          card: "#0C1A19",
          deep: "#051F20",
          surface: "#10201E",
          surface2: "#163832",
          structural: "#235347",
          support: "#8EB69B",
          light: "#DAF1DE",
          accent: "#F1F9A1",
          text: "#E7ECE8",
          muted: "#9BA6A0",
          disabled: "#65706A",
          border: "rgba(218, 241, 222, 0.08)",
          "border-hover": "rgba(218, 241, 222, 0.16)",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        evo: "12px",
        "evo-sm": "8px",
        "evo-lg": "16px",
      },
      boxShadow: {
        "evo-glow": "0 0 50px -10px rgba(142, 182, 155, 0.06)",
        "evo-card": "0 4px 20px -2px rgba(5, 7, 6, 0.7)",
      },
    },
  },
  plugins: [],
};

export default config;
