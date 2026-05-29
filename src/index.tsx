import { Hono } from "hono";

// Worker bindings (see wrangler.toml). DB is the D1 (SQLite) database;
// ASSETS serves files from public/ (compiled tailwind.css, HTMX, icons).
export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", (c) => {
  return c.html(
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>RentLens.</title>
        <link rel="stylesheet" href="/tailwind.css" />
      </head>
      <body class="min-h-screen flex items-center justify-center font-sans">
        <main class="text-center">
          <h1 class="text-3xl font-semibold">
            RentLens<span class="text-amber-500">.</span>
          </h1>
          <p class="mt-2 text-sm text-neutral-500">
            Cloudflare-native scaffold — Phase 0 green.
          </p>
        </main>
      </body>
    </html>,
  );
});

// Liveness probe — also proves the D1 binding is wired (Phase 0: schema is
// empty, so we just confirm the binding answers a trivial query).
app.get("/healthz", async (c) => {
  const row = await c.env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
  return c.json({ status: "ok", db: row?.ok === 1 });
});

export default app;
