// Submit-flow form parsing, validation, and assembly. Port of the logic in
// handlers/submit.go (parseStep1/2, validateStep1/2, buildSubmission,
// persistSubmission).
import { newSubmission, insertSubmission, type Submission } from "../data/submission";
import { isCanonicalArea } from "../data/area";
import { isCanonicalMover } from "../data/mover";
import { findOrCreatePendingArea, findOrCreatePendingSociety } from "../data/pending";

export type Step1Data = {
  societyName: string;
  societySlug: string;
  locality: string;
  bhk: string;
  monthlyRent: string; // kept as raw string for re-render
  monthlyMaint: string;
  floorBand: string;
  furnishing: string;
  // Optional email — collected on Step 1 with the "adds credibility to your
  // report" framing (RENT-ahstlnjb continued). Carried through Steps 2 + 3 via
  // hidden inputs; pre-fills Step 3's help_contact box on render. Verification
  // fires at the final persist boundary (Step 1 skip path OR Step 3 submit),
  // not on Step 1 continue — the submission row doesn't exist yet then.
  email: string;
};

export type Step2Data = {
  sqft: string;
  deposit: string;
  block: string;
  moveInMonth: string;
  moveInYear: string;
  moveOutMonth: string;
  moveOutYear: string;
  ratingValue: string;
  ratingQuality: string;
  ratingOwner: string;
  note: string;
  sourceChannel: string;
  sourceDetail: string;
  moverName: string;
  moverRating: string;
  moverCanonical: string; // "true" | "false" | ""
  willingToHelp: boolean;
  helpContact: string;
};

export const emptyStep1 = (): Step1Data => ({
  societyName: "",
  societySlug: "",
  locality: "",
  bhk: "",
  monthlyRent: "",
  monthlyMaint: "",
  floorBand: "",
  furnishing: "",
  email: "",
});

export const emptyStep2 = (): Step2Data => ({
  sqft: "",
  deposit: "",
  block: "",
  moveInMonth: "",
  moveInYear: "",
  moveOutMonth: "",
  moveOutYear: "",
  ratingValue: "",
  ratingQuality: "",
  ratingOwner: "",
  note: "",
  sourceChannel: "",
  sourceDetail: "",
  moverName: "",
  moverRating: "",
  moverCanonical: "",
  willingToHelp: false,
  helpContact: "",
});

// isValidEmail — single source of truth for email-format checks across the
// codebase. Conservative subset of RFC-5321 that catches the common
// fat-finger cases (trailing comma in `gmail,com`, missing TLD, missing
// local part) while accepting normal `+aliases`, `.dots`, and ccTLDs.
// Deeper validation (MX records, deliverability) happens at Resend's end.
const EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,24}$/;
export function isValidEmail(s: string): boolean {
  return s.length > 0 && s.length <= 254 && EMAIL_RE.test(s);
}

const ALLOWED_BHK = new Set(["1", "2", "2.5", "3", "3.5", "4+"]);
// Keep "G" (ground) in sync with the submit form's floorBandOptions.
const ALLOWED_FLOOR_BAND = new Set(["G", "1-3", "4-7", "8-15", "15-21", "21+"]);
const ALLOWED_FURNISHING = new Set(["unfurnished", "semi", "fully"]);
const ALLOWED_SOURCE_CHANNEL = new Set(["whatsapp", "friends", "broker", "app", "other"]);

type Body = Record<string, string | File>;
const str = (b: Body, key: string): string => {
  const v = b[key];
  return typeof v === "string" ? v.trim() : "";
};

export function parseStep1(b: Body): Step1Data {
  return {
    societyName: str(b, "society_name"),
    societySlug: str(b, "society_slug"),
    locality: str(b, "locality"),
    bhk: str(b, "bhk"),
    monthlyRent: str(b, "monthly_rent"),
    monthlyMaint: str(b, "monthly_maint"),
    floorBand: str(b, "floor_band"),
    furnishing: str(b, "furnishing"),
    email: str(b, "email"),
  };
}

export function parseStep2(b: Body): Step2Data {
  return {
    sqft: str(b, "sqft"),
    deposit: str(b, "deposit"),
    block: str(b, "block"),
    moveInMonth: str(b, "move_in_month"),
    moveInYear: str(b, "move_in_year"),
    moveOutMonth: str(b, "move_out_month"),
    moveOutYear: str(b, "move_out_year"),
    ratingValue: str(b, "rating_value"),
    ratingQuality: str(b, "rating_quality"),
    ratingOwner: str(b, "rating_owner"),
    note: str(b, "note"),
    sourceChannel: str(b, "source_channel"),
    sourceDetail: str(b, "source_detail"),
    moverName: str(b, "mover_name"),
    moverRating: str(b, "mover_rating"),
    moverCanonical: str(b, "mover_canonical"),
    willingToHelp: str(b, "willing_to_help") !== "",
    helpContact: str(b, "help_contact"),
  };
}

// parseIntOr returns the parsed integer, or NaN when not a clean integer.
const parseIntStrict = (s: string): number => (/^-?\d+$/.test(s) ? parseInt(s, 10) : NaN);

export function validateStep1(s: Step1Data): Record<string, string> {
  const e: Record<string, string> = {};
  if (s.societyName === "") e.society_name = "Society name is required.";
  else if (s.societyName.length > 200) e.society_name = "Keep the society name under 200 characters.";
  if (s.locality === "") e.locality = "Pick or type an area.";
  else if (s.locality.length > 100) e.locality = "Keep the area name under 100 characters.";
  if (!ALLOWED_BHK.has(s.bhk)) e.bhk = "Pick a BHK option.";
  const rent = parseIntStrict(s.monthlyRent);
  if (Number.isNaN(rent) || rent < 5000 || rent > 500000)
    e.monthly_rent = "Rent must be a number between 5,000 and 5,00,000.";
  const maint = parseIntStrict(s.monthlyMaint);
  if (Number.isNaN(maint) || maint < 0 || maint > 50000)
    e.monthly_maint = "Maintenance must be a number between 0 and 50,000.";
  if (!ALLOWED_FLOOR_BAND.has(s.floorBand)) e.floor_band = "Pick a floor band.";
  if (!ALLOWED_FURNISHING.has(s.furnishing)) e.furnishing = "Pick a furnishing option.";
  // Email is optional; only validate format when provided. Shared shape check
  // via isValidEmail (catches `gmail,com`, missing TLD, etc.).
  if (s.email !== "" && !isValidEmail(s.email)) {
    e.email = "Please enter a valid email address (or leave it blank).";
  }
  return e;
}

export function validateStep2(s: Step2Data): Record<string, string> {
  const e: Record<string, string> = {};
  if (s.sqft !== "") {
    const n = parseIntStrict(s.sqft);
    if (Number.isNaN(n) || n < 100 || n > 10000) e.sqft = "Square feet must be a number between 100 and 10,000.";
  }
  if (s.deposit !== "") {
    const n = parseIntStrict(s.deposit);
    if (Number.isNaN(n) || n < 0 || n > 5000000) e.deposit = "Deposit must be a number between 0 and 50,00,000.";
  }
  if (s.sourceChannel !== "" && !ALLOWED_SOURCE_CHANNEL.has(s.sourceChannel))
    e.source_channel = "Unknown source channel.";
  if (s.willingToHelp && s.helpContact !== "" && !isValidEmail(s.helpContact)) {
    e.help_contact = "Please enter a valid email address (or uncheck the help box).";
  }
  return e;
}

const STEP1_KEYS = ["society_name", "locality", "bhk", "monthly_rent", "monthly_maint", "floor_band", "furnishing"];
export const hasStep1Errors = (errs: Record<string, string>): boolean => STEP1_KEYS.some((k) => k in errs);

const optInt = (s: string): number | null => {
  if (s === "") return null;
  const n = parseIntStrict(s);
  return Number.isNaN(n) ? null : n;
};

export function buildSubmission(s1: Step1Data, s2: Step2Data): Submission {
  const sub = newSubmission();
  sub.societyName = s1.societyName;
  sub.societySlug = s1.societySlug;
  sub.locality = s1.locality.trim();
  sub.bhk = s1.bhk;
  sub.floorBand = s1.floorBand;
  sub.furnishing = s1.furnishing;
  sub.block = s2.block;
  sub.note = s2.note;
  sub.sourceChannel = s2.sourceChannel;
  sub.sourceDetail = s2.sourceDetail;
  sub.moverName = s2.moverName;
  sub.willingToHelp = s2.willingToHelp;

  const rent = parseIntStrict(s1.monthlyRent);
  if (!Number.isNaN(rent)) sub.monthlyRent = rent;
  const maint = parseIntStrict(s1.monthlyMaint);
  if (!Number.isNaN(maint)) sub.monthlyMaint = maint;
  // help_contact is the contributor's email, when any. Priority: Step 3 input
  // wins (because Step 3 pre-fills its box from s1.email on render, the only
  // way s2.helpContact differs is if the user edited it). Step 1 email fills
  // in on the SKIP path where Step 3 was never rendered. willing_to_help is
  // independent — it gates "intros allowed", and downstream consumers must
  // additionally check verify_state='verified' before contacting.
  sub.helpContact = s2.helpContact !== "" ? s2.helpContact : s1.email;

  sub.sqft = optInt(s2.sqft);
  sub.deposit = optInt(s2.deposit);
  sub.ratingValue = optInt(s2.ratingValue);
  sub.ratingQuality = optInt(s2.ratingQuality);
  sub.ratingOwner = optInt(s2.ratingOwner);
  sub.moverRating = optInt(s2.moverRating);

  // Flag for admin review when the typed mover isn't a canonical match. The
  // client flag is verified server-side so a hand-rolled POST can't bypass it.
  if (sub.moverName !== "") {
    const client = s2.moverCanonical === "true";
    const server = isCanonicalMover(sub.moverName);
    sub.moverNeedsReview = !client || !server;
  }

  if (s2.moveInMonth !== "" && s2.moveInYear !== "") sub.moveInMonth = `${s2.moveInYear}-${s2.moveInMonth}`;
  if (s2.moveOutMonth !== "" && s2.moveOutYear !== "") sub.moveOutMonth = `${s2.moveOutYear}-${s2.moveOutMonth}`;
  return sub;
}

// persistSubmission upserts pending area/society records for off-catalog
// values (linking society→area in the combined case), tags the submission,
// then inserts it. Port of handlers/submit.go persistSubmission.
export async function persistSubmission(db: D1Database, sub: Submission): Promise<string> {
  if (sub.locality !== "" && !isCanonicalArea(sub.locality)) {
    const paId = await findOrCreatePendingArea(db, sub.locality);
    if (paId) sub.pendingAreaId = paId;
  }
  if (sub.societySlug === "" && sub.societyName !== "") {
    const psId = await findOrCreatePendingSociety(db, sub.societyName, sub.locality, sub.pendingAreaId);
    if (psId) sub.pendingSocietyId = psId;
  }
  return insertSubmission(db, sub);
}
