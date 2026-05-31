// Contributor rental-data submission. Port of submission.go + the D1 insert/
// lookup from submission_store.go.
import { newShortID } from "../lib/id";

export type Submission = {
  id: string;
  societyName: string;
  societySlug: string; // empty when typed name not in catalog
  pendingSocietyId: string; // set when societySlug empty (new-society submission)
  locality: string;
  pendingAreaId: string; // set when locality off canonical list
  bhk: string;
  monthlyRent: number;
  monthlyMaint: number;
  floorBand: string;
  furnishing: string;
  sqft: number | null;
  deposit: number | null;
  block: string;
  moveInMonth: string; // "YYYY-MM"
  moveOutMonth: string;
  ratingValue: number | null;
  ratingQuality: number | null;
  ratingOwner: number | null;
  note: string;
  sourceChannel: string;
  sourceDetail: string;
  moverName: string;
  moverRating: number | null;
  moverNeedsReview: boolean;
  willingToHelp: boolean;
  helpContact: string;
  // Silent per-email spam control (RENT-okskjmao). Set at insert time by
  // persistSubmission via isProbableSpam(); never mutated through the
  // contributor-facing flow. Aggregate readers filter on it via
  // effectiveSubmissionFilter() in src/lib/spam.ts.
  spamFlag: boolean;
};

// newSubmission returns a blank submission with sensible zero-values.
export function newSubmission(): Submission {
  return {
    id: "",
    societyName: "",
    societySlug: "",
    pendingSocietyId: "",
    locality: "",
    pendingAreaId: "",
    bhk: "",
    monthlyRent: 0,
    monthlyMaint: 0,
    floorBand: "",
    furnishing: "",
    sqft: null,
    deposit: null,
    block: "",
    moveInMonth: "",
    moveOutMonth: "",
    ratingValue: null,
    ratingQuality: null,
    ratingOwner: null,
    note: "",
    sourceChannel: "",
    sourceDetail: "",
    moverName: "",
    moverRating: null,
    moverNeedsReview: false,
    willingToHelp: false,
    helpContact: "",
    spamFlag: false,
  };
}

// insertSubmission assigns a fresh 8-char id (if blank) and persists the row.
// society_slug is stored only when it references a real catalog row; an empty
// slug stays NULL (the FK allows it). Returns the assigned id.
export async function insertSubmission(db: D1Database, sub: Submission): Promise<string> {
  if (sub.id === "") sub.id = newShortID();
  await db
    .prepare(
      `INSERT INTO submissions (
        id, society_name, society_slug, pending_society_id, locality, pending_area_id,
        bhk, monthly_rent, monthly_maint, floor_band, furnishing,
        sqft, deposit, block, move_in_month, move_out_month,
        rating_value, rating_quality, rating_owner, note,
        source_channel, source_detail, mover_name, mover_rating,
        willing_to_help, help_contact, spam_flag
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      sub.id,
      sub.societyName,
      sub.societySlug === "" ? null : sub.societySlug,
      sub.pendingSocietyId === "" ? null : sub.pendingSocietyId,
      sub.locality,
      sub.pendingAreaId === "" ? null : sub.pendingAreaId,
      sub.bhk,
      sub.monthlyRent,
      sub.monthlyMaint,
      sub.floorBand,
      sub.furnishing,
      sub.sqft,
      sub.deposit,
      sub.block,
      sub.moveInMonth,
      sub.moveOutMonth,
      sub.ratingValue,
      sub.ratingQuality,
      sub.ratingOwner,
      sub.note,
      sub.sourceChannel,
      sub.sourceDetail,
      sub.moverName,
      sub.moverRating,
      sub.willingToHelp ? 1 : 0,
      sub.helpContact,
      sub.spamFlag ? 1 : 0,
    )
    .run();
  return sub.id;
}

type SubmissionRow = {
  id: string;
  society_name: string;
  society_slug: string | null;
  pending_society_id: string | null;
  locality: string;
  pending_area_id: string | null;
};

export async function countSubmissions(db: D1Database): Promise<number> {
  const r = await db.prepare(`SELECT count(*) AS n FROM submissions`).first<{ n: number }>();
  return r?.n ?? 0;
}

// countPendingSubmissions = submissions tagged with a pending society OR area.
export async function countPendingSubmissions(db: D1Database): Promise<number> {
  const r = await db
    .prepare(`SELECT count(*) AS n FROM submissions WHERE pending_society_id IS NOT NULL OR pending_area_id IS NOT NULL`)
    .first<{ n: number }>();
  return r?.n ?? 0;
}

// listSubmissionsForModeration returns the minimal per-submission fields the
// admin queues aggregate over (pending links + help-contact for distinct counts).
export async function listSubmissionsForModeration(
  db: D1Database,
): Promise<{ pendingSocietyId: string; pendingAreaId: string; helpContact: string }[]> {
  const { results } = await db
    .prepare(`SELECT pending_society_id, pending_area_id, help_contact FROM submissions`)
    .all<{ pending_society_id: string | null; pending_area_id: string | null; help_contact: string }>();
  return results.map((r) => ({
    pendingSocietyId: r.pending_society_id ?? "",
    pendingAreaId: r.pending_area_id ?? "",
    helpContact: r.help_contact,
  }));
}

// getSubmissionById returns the (partial) submission needed by the success
// page, or null. The success page only reads name/slug/locality/pending ids.
// isActiveOptIn — single source of truth for "may we contact this resident
// for intros?". A submission with `willing_to_help=true` is dormant until
// the contributor's email is verified; downstream intro flows MUST gate on
// this helper rather than reading `willing_to_help` directly. Decoupling the
// rule from the columns means tightening the rule later (e.g. add a "not
// banned" check) is one-file.
export function isActiveOptIn(row: {
  willingToHelp: boolean;
  helpContact: string;
  verifyState: "unverified" | "verified";
}): boolean {
  return row.willingToHelp && row.helpContact !== "" && row.verifyState === "verified";
}

// getSubmissionForVerify returns just the fields the /verify routes need —
// the email (help_contact) we're verifying, the society for the success
// copy, and the current verify_state so we can short-circuit refreshes.
// Separate from getSubmissionById on purpose: that one is for the success
// page and never returned the email.
export type SubmissionVerifyView = {
  id: string;
  societyName: string;
  societySlug: string;
  helpContact: string;
  verifyState: "unverified" | "verified";
};

export async function getSubmissionForVerify(db: D1Database, id: string): Promise<SubmissionVerifyView | null> {
  const row = await db
    .prepare(
      `SELECT id, society_name, society_slug, help_contact, verify_state
       FROM submissions WHERE id = ?`,
    )
    .bind(id)
    .first<{
      id: string;
      society_name: string;
      society_slug: string | null;
      help_contact: string;
      verify_state: string;
    }>();
  if (!row) return null;
  return {
    id: row.id,
    societyName: row.society_name,
    societySlug: row.society_slug ?? "",
    helpContact: row.help_contact,
    verifyState: row.verify_state === "verified" ? "verified" : "unverified",
  };
}

export async function getSubmissionById(db: D1Database, id: string): Promise<Submission | null> {
  const row = await db
    .prepare(
      `SELECT id, society_name, society_slug, pending_society_id, locality, pending_area_id
       FROM submissions WHERE id = ?`,
    )
    .bind(id)
    .first<SubmissionRow>();
  if (!row) return null;
  const sub = newSubmission();
  sub.id = row.id;
  sub.societyName = row.society_name;
  sub.societySlug = row.society_slug ?? "";
  sub.pendingSocietyId = row.pending_society_id ?? "";
  sub.locality = row.locality;
  sub.pendingAreaId = row.pending_area_id ?? "";
  return sub;
}
