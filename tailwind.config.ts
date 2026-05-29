import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Design tokens (parchment/ink/marigold + Geist/JetBrains Mono) get
      // ported here in Phase 1 from the Go repo's design/system/.
    },
  },
  plugins: [],
} satisfies Config;
