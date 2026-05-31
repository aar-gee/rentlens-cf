// Generate the default Open Graph share image (1200x630) from a brand SVG.
//
// Why a committed generator: the OG image is a build-time artifact, not a
// runtime one — it's rasterized once here and the resulting PNG is checked in
// at public/static/og-default.png. Keeping the source SVG in code means the
// next person can tweak the headline/colors and re-run `node scripts/gen-og.mjs`
// rather than reverse-engineering a binary.
//
// Fonts: we render with system faces (Helvetica Neue / Menlo) available on the
// build machine. The live brand uses Geist + JetBrains Mono, but those aren't
// guaranteed installed; Helvetica Neue is a faithful grotesque stand-in for a
// static share card and renders identically everywhere this script is run.
//
// Run: node scripts/gen-og.mjs   (from repo root; needs `sharp`)

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/static/og-default.png");

// Brand tokens (mirror src/styles/tokens.css).
const PARCHMENT = "#F7F2EB";
const PARCHMENT_DEEP = "#EDE5D6";
const INK = "#1A1F26";
const INK_MUTE = "#4A5260";
const INK_FAINT = "#8A8F99";
const MARIGOLD = "#D4811F";
const HAIRLINE = "#D4CDC0";

const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";
const MONO = "Menlo, ui-monospace, monospace";

const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${PARCHMENT}"/>

  <!-- faint vertical rules at 14% / 86%, echoing the hero section -->
  <rect x="168" y="0" width="1.5" height="${H}" fill="${INK}" opacity="0.05"/>
  <rect x="1031" y="0" width="1.5" height="${H}" fill="${INK}" opacity="0.05"/>

  <!-- eyebrow: pulse dot + mono uppercase label -->
  <circle cx="96" cy="92" r="6" fill="${MARIGOLD}"/>
  <text x="116" y="98" font-family="${MONO}" font-size="22" letter-spacing="3"
        fill="${INK_MUTE}">RENTAL INTELLIGENCE &#183; BENGALURU</text>

  <!-- signature headline -->
  <text x="92" y="270" font-family="${SANS}" font-size="104" font-weight="600"
        letter-spacing="-4" fill="${INK}">Asking prices lie.</text>
  <text x="92" y="382" font-family="${SANS}" font-size="104" font-weight="600"
        letter-spacing="-4" fill="${MARIGOLD}">Residents don&#8217;t.</text>

  <!-- subhead -->
  <text x="94" y="452" font-family="${SANS}" font-size="30" font-weight="400"
        fill="${INK_MUTE}">Real rent, maintenance &amp; deposit data &#8212; from people who actually</text>
  <text x="94" y="492" font-family="${SANS}" font-size="30" font-weight="400"
        fill="${INK_MUTE}">live in Bengaluru&#8217;s premium apartment societies.</text>

  <!-- footer hairline + wordmark + url -->
  <rect x="92" y="556" width="1016" height="1.5" fill="${HAIRLINE}"/>
  <text x="92" y="600" font-family="${SANS}" font-size="30" font-weight="600"
        letter-spacing="-1" fill="${INK}">RentLens</text>
  <text x="1108" y="600" text-anchor="end" font-family="${MONO}" font-size="22"
        letter-spacing="1" fill="${MARIGOLD}">rentlens.fyi</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile(OUT);
console.log("wrote", OUT);
