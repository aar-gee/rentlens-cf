// Contact-form messages. D1 port of contact.go + contact_store.go.
import { newShortID } from "../lib/id";

export type ContactStatus = "open" | "resolved";

export type ContactSubmission = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  category: string; // "bug" | "feature" | "general"
  message: string;
  status: ContactStatus;
  resolvedAt: string | null;
};

type ContactRow = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  category: string;
  message: string;
  status: string;
  resolved_at: string | null;
};

const rowToContact = (c: ContactRow): ContactSubmission => ({
  id: c.id,
  createdAt: c.created_at,
  name: c.name,
  email: c.email,
  category: c.category,
  message: c.message,
  status: c.status as ContactStatus,
  resolvedAt: c.resolved_at,
});

// insertContact assigns a fresh id (if blank) and persists. created_at +
// status come from the DB defaults. Returns the new submission.
export async function insertContact(
  db: D1Database,
  fields: { name: string; email: string; category: string; message: string },
): Promise<ContactSubmission> {
  const id = newShortID();
  await db
    .prepare(`INSERT INTO contacts (id, name, email, category, message) VALUES (?, ?, ?, ?, ?)`)
    .bind(id, fields.name, fields.email, fields.category, fields.message)
    .run();
  return { id, createdAt: "", status: "open", resolvedAt: null, ...fields };
}

const SELECT = `id, created_at, name, email, category, message, status, resolved_at`;

export async function listContacts(db: D1Database): Promise<ContactSubmission[]> {
  const { results } = await db
    .prepare(`SELECT ${SELECT} FROM contacts ORDER BY created_at DESC, rowid DESC`)
    .all<ContactRow>();
  return results.map(rowToContact);
}

export async function countOpenContacts(db: D1Database): Promise<number> {
  const row = await db
    .prepare(`SELECT count(*) AS n FROM contacts WHERE status = 'open'`)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// resolve flips a message to 'resolved' (stamping resolved_at); reports
// whether a row actually changed (false when missing or already resolved).
export async function resolveContact(db: D1Database, id: string): Promise<boolean> {
  const res = await db
    .prepare(`UPDATE contacts SET status='resolved', resolved_at=datetime('now') WHERE id=? AND status='open'`)
    .bind(id)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function reopenContact(db: D1Database, id: string): Promise<boolean> {
  const res = await db
    .prepare(`UPDATE contacts SET status='open', resolved_at=NULL WHERE id=? AND status='resolved'`)
    .bind(id)
    .run();
  return (res.meta.changes ?? 0) > 0;
}
