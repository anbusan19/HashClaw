import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        surface:   "#0a0a0a",
        "surface-2": "#111111",
        "surface-3": "#161616",
        border:    "#1e1e1e",
        "border-2": "#2a2a2a",
        muted:     "#555555",
        "muted-2": "#888888",
      },
      fontSize: {
        "2xs": "0.65rem",
      },
    },
  },
  plugins: [],
};

export default config;
