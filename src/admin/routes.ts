// Admin moderation routes — mounted under ADMIN_PREFIX behind adminAuth.
// Port of admin/server.go route table + admin/handlers.go.
import { Hono } from "hono";
import { adminAuth } from "./auth";
import { Dashboard, PendingSocietiesQueue, PendingAreasQueue, MessagesQueue, ActionResult, BuildersPage } from "../views/admin/ui";
import { countPublished, publishedSlugs } from "../data/society";
import { listBuilders, createBuilder } from "../data/builders";
import { CANONICAL_AREAS } from "../data/area";
import {
  listPendingSocieties,
  listPendingAreas,
  getPendingAreaById,
  countPendingSocieties,
  countPendingAreas,
} from "../data/pending";
import {
  countSubmissions,
  countPendingSubmissions,
  listSubmissionsForModeration,
} from "../data/submission";
import { listContacts, countOpenContacts, resolveContact, reopenContact } from "../data/contact";
import {
  mergePendingSociety,
  createSocietyFromPending,
  rejectPendingSociety,
  mergePendingArea,
  promotePendingArea,
  rejectPendingArea,
  recordAction,
  recentActions,
} from "../data/moderation";

type AdminBindings = {
  DB: D1Database;
  ADMIN_USER?: string;
  ADMIN_PASS?: string;
};

// strict:false so the dashboard matches both the mount root with and without a
// trailing slash (the nav links to ADMIN_PREFIX + "/").
export const adminApp = new Hono<{ Bindings: AdminBindings; Variables: { adminUser: string } }>({ strict: false });

adminApp.use("*", adminAuth);

const str = (b: Record<string, string | File>, k: string): string => {
  const v = b[k];
  return typeof v === "string" ? v.trim() : "";
};

// ---- Reads ----
adminApp.get("/", async (c) => {
  const db = c.env.DB;
  const [pendingSocieties, pendingAreas, openMessages, totalSubmissions, pendingSubmissions, canonicalSocieties] =
    await Promise.all([
      countPendingSocieties(db),
      countPendingAreas(db),
      countOpenContacts(db),
      countSubmissions(db),
      countPendingSubmissions(db),
      countPublished(db),
    ]);
  return c.html(
    Dashboard({ pendingSocieties, pendingAreas, openMessages, totalSubmissions, pendingSubmissions, canonicalSocieties }),
  );
});

adminApp.get("/pending-societies", async (c) => {
  const db = c.env.DB;
  const [societies, subs, canonical, builders, actions] = await Promise.all([
    listPendingSocieties(db),
    listSubmissionsForModeration(db),
    publishedSlugs(db),
    listBuilders(db),
    recentActions(db, 50),
  ]);

  const subCounts = new Map<string, number>();
  const emailSeen = new Map<string, Set<string>>();
  for (const s of subs) {
    if (s.pendingSocietyId === "") continue;
    subCounts.set(s.pendingSocietyId, (subCounts.get(s.pendingSocietyId) ?? 0) + 1);
    if (s.helpContact !== "") {
      if (!emailSeen.has(s.pendingSocietyId)) emailSeen.set(s.pendingSocietyId, new Set());
      emailSeen.get(s.pendingSocietyId)!.add(s.helpContact);
    }
  }

  // Resolve linked pending-area names (combined case + create-form prefill).
  const areaNames = new Map<string, string>();
  for (const ps of societies) {
    if (ps.pendingAreaId !== "" && !areaNames.has(ps.pendingAreaId)) {
      const pa = await getPendingAreaById(db, ps.pendingAreaId);
      if (pa) areaNames.set(ps.pendingAreaId, pa.typedName);
    }
  }

  const rows = societies.map((p) => ({
    p,
    subCount: subCounts.get(p.id) ?? 0,
    emailCount: emailSeen.get(p.id)?.size ?? 0,
    linkedAreaName: p.pendingAreaId !== "" ? areaNames.get(p.pendingAreaId) : undefined,
  }));
  return c.html(PendingSocietiesQueue(rows, canonical, builders, actions));
});

// Builders management — list + add (feeds the create-society select).
adminApp.get("/builders", async (c) => c.html(BuildersPage(await listBuilders(c.env.DB))));
adminApp.post("/builders", async (c) => {
  const b = await c.req.parseBody();
  await createBuilder(c.env.DB, str(b, "name"), str(b, "tier"));
  return c.html(ActionResult("Add builder", `Builder "${str(b, "name")}" added.`, "/builders"));
});

adminApp.get("/pending-areas", async (c) => {
  const db = c.env.DB;
  const [areas, subs, pendingSocieties] = await Promise.all([
    listPendingAreas(db),
    listSubmissionsForModeration(db),
    listPendingSocieties(db),
  ]);

  const subCounts = new Map<string, number>();
  for (const s of subs) {
    if (s.pendingAreaId === "") continue;
    subCounts.set(s.pendingAreaId, (subCounts.get(s.pendingAreaId) ?? 0) + 1);
  }
  const societyCounts = new Map<string, number>();
  for (const ps of pendingSocieties) {
    if (ps.pendingAreaId === "") continue;
    societyCounts.set(ps.pendingAreaId, (societyCounts.get(ps.pendingAreaId) ?? 0) + 1);
  }

  const rows = areas.map((p) => ({
    p,
    subCount: subCounts.get(p.id) ?? 0,
    societyCount: societyCounts.get(p.id) ?? 0,
  }));
  return c.html(PendingAreasQueue(rows, CANONICAL_AREAS));
});

adminApp.get("/messages", async (c) => {
  const messages = await listContacts(c.env.DB);
  return c.html(MessagesQueue(messages));
});

// ---- Pending-society actions ----
adminApp.post("/pending-societies/:id/merge", async (c) => {
  const id = c.req.param("id");
  const slug = str(await c.req.parseBody(), "society_slug");
  if (slug === "") return c.text("pick a society to merge into", 400);
  await mergePendingSociety(c.env.DB, c.get("adminUser"), id, slug);
  return c.html(
    ActionResult("Merge", `Pending society ${id} merged into ${slug}. Its submissions now point at the canonical society.`, "/pending-societies"),
  );
});

adminApp.post("/pending-societies/:id/create", async (c) => {
  const id = c.req.param("id");
  const b = await c.req.parseBody();
  const slug = str(b, "slug");
  const name = str(b, "name");
  if (slug === "" || name === "") return c.text("slug and name are required", 400);
  await createSocietyFromPending(c.env.DB, c.get("adminUser"), id, slug, name, str(b, "locality"), str(b, "builder_id"));
  return c.html(
    ActionResult("Create", `Created canonical society ${slug} from pending society ${id}. Its submissions now point at the new society.`, "/pending-societies"),
  );
});

adminApp.post("/pending-societies/:id/reject", async (c) => {
  const id = c.req.param("id");
  await rejectPendingSociety(c.env.DB, c.get("adminUser"), id, str(await c.req.parseBody(), "reason"));
  return c.html(ActionResult("Reject", `Pending society ${id} rejected. Its submissions are marked rejected too.`, "/pending-societies"));
});

// ---- Pending-area actions (real) ----
adminApp.post("/pending-areas/:id/merge", async (c) => {
  const id = c.req.param("id");
  const area = str(await c.req.parseBody(), "area_name");
  if (area === "") return c.text("pick an area to merge into", 400);
  await mergePendingArea(c.env.DB, c.get("adminUser"), id, area);
  return c.html(ActionResult("Merge", `Pending area ${id} merged into ${area}.`, "/pending-areas"));
});

adminApp.post("/pending-areas/:id/promote", async (c) => {
  const id = c.req.param("id");
  const name = str(await c.req.parseBody(), "name");
  await promotePendingArea(c.env.DB, c.get("adminUser"), id, name);
  return c.html(ActionResult("Promote", `Pending area ${id} (${name}) promoted to canonical.`, "/pending-areas"));
});

adminApp.post("/pending-areas/:id/reject", async (c) => {
  const id = c.req.param("id");
  await rejectPendingArea(c.env.DB, c.get("adminUser"), id, str(await c.req.parseBody(), "reason"));
  return c.html(ActionResult("Reject", `Pending area ${id} rejected.`, "/pending-areas"));
});

// ---- Message actions (resolve/reopen, audit on change) ----
adminApp.post("/messages/:id/resolve", async (c) => {
  const id = c.req.param("id");
  const changed = await resolveContact(c.env.DB, id);
  if (changed) await recordAction(c.env.DB, c.get("adminUser"), "resolve", "contact", id, "");
  return c.html(ActionResult("Resolve", `Message ${id} marked resolved.`, "/messages"));
});

adminApp.post("/messages/:id/reopen", async (c) => {
  const id = c.req.param("id");
  const changed = await reopenContact(c.env.DB, id);
  if (changed) await recordAction(c.env.DB, c.get("adminUser"), "reopen", "contact", id, "");
  return c.html(ActionResult("Reopen", `Message ${id} reopened.`, "/messages"));
});
