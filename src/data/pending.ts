// Pending (contributor-typed, not-yet-canonical) society/area moderation
// records. Port of pending_area_store.go + pending_society_store.go.
import { newShortID } from "../lib/id";

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
