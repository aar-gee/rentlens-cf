import type { Config } from "tailwindcss";

// Mirrors the Go repo's tailwind/tailwind.config.js theme.extend so the
// compiled utility classes match the ported templates 1:1. Canonical token
// values live in src/styles/tokens.css; these duplicate them as utilities.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        parchment: "#F7F2EB",
        "parchment-deep": "#EDE5D6",
        ink: "#1A1F26",
        "ink-mute": "#4A5260",
        "ink-faint": "#8A8F99",
        marigold: "#D4811F",
        "marigold-deep": "#B36A14",
        hairline: "#D4CDC0",
        "hairline-strong": "#B8AE9C",
        danger: "#B8362B",
        "danger-deep": "#94251C",
        success: "#3D7B5C",
      },
      letterSpacing: {
        micro: "0.14em",
        tighter: "-0.025em",
        tightest: "-0.04em",
        display: "-0.035em",
      },
      maxWidth: {
        narrow: "900px",
        base: "1100px",
        wide: "1400px",
      },
    },
  },
  plugins: [],
} satisfies Config;
