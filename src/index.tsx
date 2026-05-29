import { Hono } from "hono";
import { Layout } from "./views/layout";
import { Header } from "./views/components/header";
import { Footer } from "./views/components/footer";

// Worker bindings (see wrangler.toml). DB is the D1 (SQLite) database;
// ASSETS serves files from public/ (compiled tailwind.css, icons, manifest).
export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.html(
    <Layout
      meta={{
        title: "RentLens. — real rents from real residents",
        description:
          "Real rents from real residents — apartment-society rental intelligence for Bengaluru.",
        path: "/",
      }}
    >
      <Header />
      <main class="max-w-wide mx-auto px-5 sm:px-8 py-16 sm:py-24">
        <p class="eyebrow">Bengaluru · v0.1</p>
        <h1 class="display text-[var(--text-display-xxl)] font-light tracking-display leading-[0.98] mt-4">
          Real rents from
          <br />
          real residents<span class="text-marigold">.</span>
        </h1>
        <p class="mt-6 max-w-narrow text-ink-mute text-[var(--text-body-lg)] leading-relaxed">
          Phase 1 — design system + base layout ported. Parchment, ink, marigold;
          Geist + JetBrains Mono. Read pages land in Phase 3.
        </p>
      </main>
      <Footer />
    </Layout>,
  );
});

// Liveness probe — also confirms the D1 binding answers a trivial query.
app.get("/healthz", async (c) => {
  const row = await c.env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
  return c.json({ status: "ok", db: row?.ok === 1 });
});

export default app;
