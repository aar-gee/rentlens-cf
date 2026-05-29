// Pending (contributor-typed, not-yet-canonical) society/area moderation
// records. Port of pending_area_store.go + pending_society_store.go.
import { newShortID } from "../lib/id";

export type PendingSociety = {
  id: string;
  typedName: string;
  locality: string;
  pendingAreaId: string;
  createdAt: string;
  submissionCount: number;
  status: string;
};

export type PendingArea = {
  id: string;
  typedName: string;
  createdAt: string;
  submissionCount: number;
  status: string;
};

// ---- Admin reads (queues filter to status='pending', newest first) ----
export async function listPendingSocieties(db: D1Database): Promise<PendingSociety[]> {
  const { results } = await db
    .prepare(
      `SELECT id, typed_name, locality, pending_area_id, created_at, submission_count, status
       FROM pending_societies WHERE status = 'pending' ORDER BY created_at DESC, rowid DESC`,
    )
    .all<{
      id: string;
      typed_name: string;
      locality: string;
      pending_area_id: string | null;
      created_at: string;
      submission_count: number;
      status: string;
    }>();
  return results.map((r) => ({
    id: r.id,
    typedName: r.typed_name,
    locality: r.locality,
    pendingAreaId: r.pending_area_id ?? "",
    createdAt: r.created_at,
    submissionCount: r.submission_count,
    status: r.status,
  }));
}

export async function getPendingAreaById(db: D1Database, id: string): Promise<PendingArea | null> {
  const r = await db
    .prepare(`SELECT id, typed_name, created_at, submission_count, status FROM pending_areas WHERE id = ?`)
    .bind(id)
    .first<{ id: string; typed_name: string; created_at: string; submission_count: number; status: string }>();
  return r ? { id: r.id, typedName: r.typed_name, createdAt: r.created_at, submissionCount: r.submission_count, status: r.status } : null;
}

export async function listPendingAreas(db: D1Database): Promise<PendingArea[]> {
  const { results } = await db
    .prepare(
      `SELECT id, typed_name, created_at, submission_count, status
       FROM pending_areas WHERE status = 'pending' ORDER BY created_at DESC, rowid DESC`,
    )
    .all<{ id: string; typed_name: string; created_at: string; submission_count: number; status: string }>();
  return results.map((r) => ({
    id: r.id,
    typedName: r.typed_name,
    createdAt: r.created_at,
    submissionCount: r.submission_count,
    status: r.status,
  }));
}

export async function countPendingSocieties(db: D1Database): Promise<number> {
  const r = await db.prepare(`SELECT count(*) AS n FROM pending_societies WHERE status='pending'`).first<{ n: number }>();
  return r?.n ?? 0;
}

export async function countPendingAreas(db: D1Database): Promise<number> {
  const r = await db.prepare(`SELECT count(*) AS n FROM pending_areas WHERE status='pending'`).first<{ n: number }>();
  return r?.n ?? 0;
}

// normalisePendingKey lowercases + collapses internal whitespace so
// "Brigade  Cosmopolis" and "brigade cosmopolis" hit the same record.
export const normalisePendingKey = (s: string): string =>
  s.toLowerCase().trim().split(/\s+/).join(" ");

// findOrCreatePendingArea upserts on normalised_key (bumping submission_count
// on conflict) and returns the record id, or null when typedName is blank.
export async function findOrCreatePendingArea(db: D1Database, typedName: string): Promise<string | null> {
  typedName = typedName.trim();
  if (typedName === "") return null;
  const row = await db
    .prepare(
      `INSERT INTO pending_areas (id, typed_name, normalised_key, submission_count)
       VALUES (?, ?, ?, 1)
       ON CONFLICT (normalised_key) DO UPDATE SET submission_count = pending_areas.submission_count + 1
       RETURNING id`,
    )
    .bind(newShortID(), typedName, normalisePendingKey(typedName))
    .first<{ id: string }>();
  return row?.id ?? null;
}

// findOrCreatePendingSociety upserts on normalised_key. Locality + pendingAreaId
// are sticky to the first submission (the upsert only bumps the count).
export async function findOrCreatePendingSociety(
  db: D1Database,
  typedName: string,
  locality: string,
  pendingAreaId: string,
): Promise<string | null> {
  typedName = typedName.trim();
  if (typedName === "") return null;
  const row = await db
    .prepare(
      `INSERT INTO pending_societies (id, typed_name, normalised_key, locality, pending_area_id, submission_count)
       VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT (normalised_key) DO UPDATE SET submission_count = pending_societies.submission_count + 1
       RETURNING id`,
    )
    .bind(newShortID(), typedName, normalisePendingKey(typedName), locality, pendingAreaId === "" ? null : pendingAreaId)
    .first<{ id: string }>();
  return row?.id ?? null;
}
