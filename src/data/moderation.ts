// Admin moderation workflows. Port of moderation.go — multi-table operations
// run as atomic D1 batches (db.batch is transactional). Per the user's call,
// pending-AREA actions are also real here (the Go MVP left them dummy).
import { newShortID } from "../lib/id";
import { recomputeSocietyFromSubmissions, type RecomputeResult } from "./aggregate";

export type AdminAction = {
  createdAt: string;
  actor: string;
  action: string;
  targetKind: string;
  targetId: string;
  detail: string;
};

const insertAction = (db: D1Database, actor: string, action: string, kind: string, id: string, detail: string) =>
  db
    .prepare(`INSERT INTO admin_actions (id, actor, action, target_kind, target_id, detail) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(newShortID(), actor, action, kind, id, detail);

// ---- Pending-society actions (transactional) ----

// mergePendingSociety re-points the pending row's submissions at intoSlug,
// marks it merged, and audits — atomically.
export async function mergePendingSociety(
  db: D1Database,
  actor: string,
  pendingId: string,
  intoSlug: string,
): Promise<void> {
  await db.batch([
    db
      .prepare(`UPDATE submissions SET society_slug = ?, pending_society_id = NULL WHERE pending_society_id = ?`)
      .bind(intoSlug, pendingId),
    db.prepare(`UPDATE pending_societies SET status='merged', merged_into_slug=? WHERE id=?`).bind(intoSlug, pendingId),
    insertAction(db, actor, "merge", "pending_society", pendingId, "merged into " + intoSlug),
  ]);
}

// createSocietyFromPending inserts a canonical society, re-points the pending
// row's submissions at it, marks it created, and audits — atomically.
export async function createSocietyFromPending(
  db: D1Database,
  actor: string,
  pendingId: string,
  slug: string,
  name: string,
  locality: string,
  builderId: string,
): Promise<void> {
  const bid = builderId === "" ? null : builderId;
  await db.batch([
    // builder (text) is resolved from the selected builder row so the
    // denormalized name + the FK stay in sync; bid null leaves both blank.
    db
      .prepare(
        `INSERT INTO societies (id, slug, name, locality, builder, builder_id, description, status, source, contributed_by)
         VALUES (?, ?, ?, ?, COALESCE((SELECT name FROM builders WHERE id = ?), ''), ?, '', 'published', 'contributor', ?)`,
      )
      .bind(newShortID(), slug, name, locality, bid, bid, actor),
    db
      .prepare(`UPDATE submissions SET society_slug = ?, pending_society_id = NULL WHERE pending_society_id = ?`)
      .bind(slug, pendingId),
    db.prepare(`UPDATE pending_societies SET status='created', merged_into_slug=? WHERE id=?`).bind(slug, pendingId),
    insertAction(db, actor, "create", "pending_society", pendingId, "created as " + slug),
  ]);
}

// rejectPendingSociety marks the pending row + its submissions rejected, audits.
export async function rejectPendingSociety(
  db: D1Database,
  actor: string,
  pendingId: string,
  reason: string,
): Promise<void> {
  await db.batch([
    db.prepare(`UPDATE pending_societies SET status='rejected', reject_reason=? WHERE id=?`).bind(reason, pendingId),
    db.prepare(`UPDATE submissions SET status='rejected' WHERE pending_society_id=?`).bind(pendingId),
    insertAction(db, actor, "reject", "pending_society", pendingId, reason),
  ]);
}

// ---- Pending-area actions (real persistence — beyond the Go MVP) ----

export async function mergePendingArea(db: D1Database, actor: string, pendingId: string, intoArea: string): Promise<void> {
  await db.batch([
    db.prepare(`UPDATE pending_areas SET status='merged' WHERE id=?`).bind(pendingId),
    insertAction(db, actor, "merge", "pending_area", pendingId, "merged into " + intoArea),
  ]);
}

export async function promotePendingArea(db: D1Database, actor: string, pendingId: string, name: string): Promise<void> {
  await db.batch([
    db.prepare(`UPDATE pending_areas SET status='promoted' WHERE id=?`).bind(pendingId),
    insertAction(db, actor, "promote", "pending_area", pendingId, "promoted as " + name),
  ]);
}

export async function rejectPendingArea(db: D1Database, actor: string, pendingId: string, reason: string): Promise<void> {
  await db.batch([
    db.prepare(`UPDATE pending_areas SET status='rejected', reject_reason=? WHERE id=?`).bind(reason, pendingId),
    insertAction(db, actor, "reject", "pending_area", pendingId, reason),
  ]);
}

// recordAction appends a single audit entry (e.g. contact resolve/reopen).
export async function recordAction(
  db: D1Database,
  actor: string,
  action: string,
  targetKind: string,
  targetId: string,
  detail: string,
): Promise<void> {
  await insertAction(db, actor, action, targetKind, targetId, detail).run();
}

// ---- Submission moderation (RENT-tbhkjjfy part B) ----

// publishSubmission marks a submission published, recomputes its society's
// aggregates from all published reports (promoting provenance to 'resident'
// once RESIDENT_THRESHOLD is met), and audits. The recompute is a no-op below
// threshold. Returns the society slug + recompute outcome for the UI message.
export async function publishSubmission(
  db: D1Database,
  actor: string,
  id: string,
): Promise<{ ok: boolean; slug: string; recompute: RecomputeResult | null }> {
  const row = await db
    .prepare(`SELECT society_slug AS slug FROM submissions WHERE id = ?`)
    .bind(id)
    .first<{ slug: string }>();
  if (!row) return { ok: false, slug: "", recompute: null };
  await db.prepare(`UPDATE submissions SET status = 'published' WHERE id = ?`).bind(id).run();
  const recompute = row.slug ? await recomputeSocietyFromSubmissions(db, row.slug) : null;
  const detail = recompute?.promoted
    ? `published; ${row.slug} -> resident (${recompute.count} reports)`
    : `published (society ${row.slug || "none/pending"})`;
  await recordAction(db, actor, "publish_submission", "submission", id, detail);
  return { ok: true, slug: row.slug, recompute };
}

// rejectSubmission marks a submission rejected (excluded from aggregates) +
// audits. Does not recompute — rejected rows never counted.
export async function rejectSubmission(db: D1Database, actor: string, id: string): Promise<boolean> {
  const res = await db.prepare(`UPDATE submissions SET status = 'rejected' WHERE id = ?`).bind(id).run();
  if (!res.success) return false;
  await recordAction(db, actor, "reject_submission", "submission", id, "rejected");
  return true;
}

export async function recentActions(db: D1Database, limit: number): Promise<AdminAction[]> {
  const { results } = await db
    .prepare(
      `SELECT created_at, actor, action, target_kind, target_id, detail
       FROM admin_actions ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    )
    .bind(limit)
    .all<{ created_at: string; actor: string; action: string; target_kind: string; target_id: string; detail: string }>();
  return results.map((r) => ({
    createdAt: r.created_at,
    actor: r.actor,
    action: r.action,
    targetKind: r.target_kind,
    targetId: r.target_id,
    detail: r.detail,
  }));
}
