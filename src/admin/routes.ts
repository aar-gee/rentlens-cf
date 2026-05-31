// Admin moderation routes — mounted under ADMIN_PREFIX behind adminAuth.
// Port of admin/server.go route table + admin/handlers.go.
import { Hono } from "hono";
import { adminAuth } from "./auth";
import { Dashboard, PendingSocietiesQueue, PendingAreasQueue, MessagesQueue, ActionResult, BuildersPage, SubmissionsQueue, ProofViewer, WaitlistQueue } from "../views/admin/ui";
import { countPublished, publishedSlugs, getBySlug } from "../data/society";
import { listWaitlistGrouped, emailsToNotify, markNotified } from "../data/waitlist";
import { waitlistReadyEmail } from "../views/email/waitlist-email";
import { sendEmail } from "../lib/email";
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
  listRecentSubmissions,
  parseSinceParam,
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
  publishSubmission,
  rejectSubmission,
} from "../data/moderation";
import { RESIDENT_THRESHOLD } from "../data/aggregate";

type AdminBindings = {
  DB: D1Database;
  ADMIN_USER?: string;
  ADMIN_PASS?: string;
  PROOFS?: R2Bucket;
  // For the waitlist "now has data" notification (sendEmail no-ops without these).
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
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

// ---- Waitlist (RENT-swwqpyth) ----
adminApp.get("/waitlist", async (c) => {
  const rows = await listWaitlistGrouped(c.env.DB);
  return c.html(WaitlistQueue(rows));
});

// POST /waitlist/:slug/notify — send the one-time "now has data" email to
// every un-notified subscriber for this society, then stamp them notified.
// Reads emails BEFORE marking (markNotified would empty the un-notified set).
// sendEmail is fire-and-forget (waitUntil) and no-ops without RESEND_API_KEY.
adminApp.post("/waitlist/:slug/notify", async (c) => {
  const slug = c.req.param("slug");
  const emails = await emailsToNotify(c.env.DB, slug);
  const soc = await getBySlug(c.env.DB, slug);
  const name = soc?.name ?? slug;
  const url = `${new URL(c.req.url).origin}/societies/${slug}`;
  const tpl = waitlistReadyEmail({ societyName: name, societyUrl: url });
  for (const to of emails) {
    c.executionCtx.waitUntil(sendEmail(c.env, { to, subject: tpl.subject, html: tpl.html, text: tpl.text }));
  }
  const marked = await markNotified(c.env.DB, slug);
  await recordAction(c.env.DB, c.get("adminUser"), "waitlist_notify", "society", slug, `notified ${marked} subscriber(s)`);
  return c.html(
    ActionResult(
      "Notify",
      marked === 0
        ? `No un-notified subscribers for ${name} — nothing sent.`
        : `Sent the "now has data" email to ${marked} subscriber${marked === 1 ? "" : "s"} for ${name}.`,
      "/waitlist",
    ),
  );
});

// ---- Submissions browse + JSON API ----
//
// Both routes share the same query params: since (relative shortcut like
// "24h" / "7d" or a SQLite-shaped ISO datetime), status, spam ("0" / "1").
// HTML is for human triage; JSON is the AI-friendly path that ships full
// rows + a `summary` object so a calling agent doesn't have to recompute
// distributions.
function parseListFilters(
  c: import("hono").Context<{ Bindings: AdminBindings; Variables: { adminUser: string } }>,
) {
  const sinceParam = c.req.query("since") ?? "24h";
  const statusParam = (c.req.query("status") ?? "").trim();
  const spamParam = (c.req.query("spam") ?? "").trim();
  return {
    sinceParam,
    sinceISO: parseSinceParam(sinceParam),
    status: ["pending", "published", "rejected"].includes(statusParam) ? statusParam : "",
    spamFlag: spamParam === "0" ? 0 : spamParam === "1" ? 1 : undefined,
    spamRaw: spamParam,
  };
}

adminApp.get("/submissions", async (c) => {
  const f = parseListFilters(c);
  const rows = await listRecentSubmissions(c.env.DB, {
    sinceISO: f.sinceISO,
    status: f.status || undefined,
    spamFlag: f.spamFlag as 0 | 1 | undefined,
    limit: 200,
  });
  return c.html(SubmissionsQueue(rows, { since: f.sinceParam, status: f.status, spam: f.spamRaw }));
});

adminApp.get("/api/submissions", async (c) => {
  const f = parseListFilters(c);
  const rows = await listRecentSubmissions(c.env.DB, {
    sinceISO: f.sinceISO,
    status: f.status || undefined,
    spamFlag: f.spamFlag as 0 | 1 | undefined,
    limit: 500,
  });
  // Compute distributions inline so callers (humans + AIs) don't refold.
  const byStatus: Record<string, number> = {};
  const bySpam: Record<string, number> = { "0": 0, "1": 0 };
  const byVerify: Record<string, number> = { unverified: 0, verified: 0 };
  let newSociety = 0;
  let newArea = 0;
  let areaMismatch = 0;
  let proofs = 0;
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    bySpam[r.spamFlag ? "1" : "0"]++;
    byVerify[r.verifyState]++;
    if (r.pendingSocietyId !== "") newSociety++;
    if (r.pendingAreaId !== "") newArea++;
    if (r.areaMismatch) areaMismatch++;
    if (r.hasProof) proofs++;
  }
  return c.json({
    since: f.sinceISO,
    filters: { status: f.status, spam: f.spamRaw },
    count: rows.length,
    summary: {
      by_status: byStatus,
      by_spam: bySpam,
      by_verify: byVerify,
      new_society: newSociety,
      new_area: newArea,
      area_mismatch: areaMismatch,
      proofs,
    },
    rows,
  });
});

// Admin proof viewer — HTML wrapper that frames the uploaded file with
// submission context. Renders an embedded preview + the same metadata the
// admin would otherwise have to cross-reference in the /submissions table.
//
// The raw bytes live at /<prefix>/proof/<id> (below); this page just sets
// the preview src to that URL so the worker doesn't have to buffer the
// file into the HTML response.
adminApp.get("/proof/:id/view", async (c) => {
  const id = c.req.param("id");
  if (!c.env.PROOFS) return c.text("PROOFS not bound", 503);
  const r = await c.env.DB.prepare(
    `SELECT id, created_at, society_name, society_slug, locality, bhk,
            monthly_rent, monthly_maint, furnishing, help_contact,
            verify_state, spam_flag, status, proof_upload_key
       FROM submissions WHERE id = ?`,
  )
    .bind(id)
    .first<{
      id: string;
      created_at: string;
      society_name: string;
      society_slug: string | null;
      locality: string;
      bhk: string;
      monthly_rent: number;
      monthly_maint: number;
      furnishing: string;
      help_contact: string;
      verify_state: string;
      spam_flag: number;
      status: string;
      proof_upload_key: string;
    }>();
  if (!r || !r.proof_upload_key) return c.text("not found", 404);
  // Pull just the content type from R2 (HEAD-ish; head() returns just the
  // metadata without streaming the body — cheap Class-B op).
  const head = await c.env.PROOFS.head(r.proof_upload_key);
  const contentType = head?.httpMetadata?.contentType ?? "";
  return c.html(
    ProofViewer(
      {
        id: r.id,
        createdAt: r.created_at,
        societyName: r.society_name,
        societySlug: r.society_slug ?? "",
        locality: r.locality,
        bhk: r.bhk,
        monthlyRent: r.monthly_rent,
        monthlyMaint: r.monthly_maint,
        furnishing: r.furnishing,
        helpContact: r.help_contact,
        verifyState: r.verify_state === "verified" ? "verified" : "unverified",
        spamFlag: r.spam_flag === 1,
        status: r.status,
        proofUploadKey: r.proof_upload_key,
        proofContentType: contentType,
      },
      // Relative path: /<prefix>/proof/<id>/view → ../<id> = /<prefix>/proof/<id>.
      `../${id}`,
    ),
  );
});

// Admin proof raw stream — proxies the R2 object. Streams the original
// bytes with the stored content-type. 404 when no proof on file; 503 when
// R2 isn't bound.
adminApp.get("/proof/:id", async (c) => {
  const id = c.req.param("id");
  if (!c.env.PROOFS) return c.text("PROOFS not bound", 503);
  const r = await c.env.DB.prepare(`SELECT proof_upload_key FROM submissions WHERE id = ?`).bind(id).first<{
    proof_upload_key: string;
  }>();
  if (!r || !r.proof_upload_key) return c.text("not found", 404);
  const obj = await c.env.PROOFS.get(r.proof_upload_key);
  if (!obj) return c.text("not found in R2", 404);
  const h = new Headers();
  obj.writeHttpMetadata(h);
  h.set("Cache-Control", "private, no-store");
  h.set("Content-Disposition", `inline; filename="proof-${id}"`);
  return new Response(obj.body, { headers: h });
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

// Publish a submission: marks it published, recomputes its society from all
// published reports (promotes to 'resident' provenance once the threshold is
// met), and audits. (RENT-tbhkjjfy part B.)
adminApp.post("/submissions/:id/publish", async (c) => {
  const id = c.req.param("id");
  const res = await publishSubmission(c.env.DB, c.get("adminUser"), id);
  if (!res.ok) return c.html(ActionResult("Publish", `Submission ${id} not found.`, "/submissions"));
  const msg = res.recompute?.promoted
    ? `Published. ${res.slug} is now resident-verified (${res.recompute.count} reports drive its numbers).`
    : `Published.${res.slug ? ` ${res.slug} stays an estimate until ${RESIDENT_THRESHOLD} resident reports.` : ""}`;
  return c.html(ActionResult("Publish", msg, "/submissions"));
});

adminApp.post("/submissions/:id/reject", async (c) => {
  const id = c.req.param("id");
  await rejectSubmission(c.env.DB, c.get("adminUser"), id);
  return c.html(ActionResult("Reject", `Submission ${id} rejected.`, "/submissions"));
});
