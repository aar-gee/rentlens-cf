import type { FC, PropsWithChildren } from "hono/jsx";
import { html } from "hono/html";
import {
  PILL_FILTER_SCRIPT,
  PICKER_SCRIPT,
  CONDITIONAL_REVEAL_SCRIPT,
  FORM_ERROR_CLEAR_SCRIPT,
  SUBMIT_NUDGE_SCRIPT,
  HTMX_4XX_SWAP_SCRIPT,
} from "./scripts";

// Meta carries page-level SEO/social metadata into the Layout.
// path is canonical-relative (e.g. "/", "/societies/prestige-shantiniketan"),
// joined onto HOST below. ogImage is path-relative ("/static/og-default.png")
// or absolute; empty → the default OG image. jsonLd, when set, is emitted as a
// single <script type="application/ld+json"> in <head> (caller must ensure
// valid JSON — build it server-side, never embed user input raw).
// Ported from the Go repo's layout/base.templ.
export type Meta = {
  title: string;
  description: string;
  path: string;
  ogType?: string;
  ogImage?: string;
  jsonLd?: string;
};

// Canonical production host. Centralized so every meta tag stays in sync.
const HOST = "https://rentlens.fyi";

const canonicalURL = (path: string) => HOST + path;

const ogImageURL = (img?: string) => {
  const v = img && img !== "" ? img : "/static/og-default.png";
  return v.startsWith("http") ? v : HOST + v;
};

const GlobalScripts: FC = () => (
  <>
    <script dangerouslySetInnerHTML={{ __html: FORM_ERROR_CLEAR_SCRIPT }} />
    <script dangerouslySetInnerHTML={{ __html: PILL_FILTER_SCRIPT }} />
    <script dangerouslySetInnerHTML={{ __html: PICKER_SCRIPT }} />
    <script dangerouslySetInnerHTML={{ __html: CONDITIONAL_REVEAL_SCRIPT }} />
    <script dangerouslySetInnerHTML={{ __html: SUBMIT_NUDGE_SCRIPT }} />
    <script dangerouslySetInnerHTML={{ __html: HTMX_4XX_SWAP_SCRIPT }} />
  </>
);

type LayoutProps = PropsWithChildren<{ meta: Meta }>;

const Document: FC<LayoutProps> = ({ meta, children }) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={canonicalURL(meta.path)} />
      <meta property="og:type" content={meta.ogType && meta.ogType !== "" ? meta.ogType : "website"} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={canonicalURL(meta.path)} />
      <meta property="og:image" content={ogImageURL(meta.ogImage)} />
      <meta property="og:site_name" content="RentLens" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={ogImageURL(meta.ogImage)} />
      {/* Favicon + app-icon set: SVG canonical mark, PNG 16/32 fallbacks,
          apple-touch-icon at 180 for iOS, manifest for the Android PWA icons.
          theme-color tints the mobile address bar to the parchment ground. */}
      <link rel="icon" type="image/svg+xml" href="/static/favicon.svg" />
      <link rel="icon" type="image/png" sizes="32x32" href="/static/favicon-32.png" />
      <link rel="icon" type="image/png" sizes="16x16" href="/static/favicon-16.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/static/apple-touch-icon.png" />
      <link rel="manifest" href="/static/site.webmanifest" />
      <meta name="theme-color" content="#F7F2EB" />
      <link rel="stylesheet" href="/static/tailwind.css" />
      <script src="https://unpkg.com/htmx.org@2.0.4" defer />
      {meta.jsonLd && meta.jsonLd !== "" ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: meta.jsonLd }} />
      ) : null}
    </head>
    <body class="min-h-screen">
      {children}
      <GlobalScripts />
    </body>
  </html>
);

// Layout renders the full HTML document, prefixing the DOCTYPE that c.html
// does not add on its own. Pages compose <Header/> + content + <Footer/> as
// children (matching the Go Base, which renders only the shell + scripts).
export const Layout = (props: LayoutProps) =>
  html`<!DOCTYPE html>${(<Document {...props} />)}`;
