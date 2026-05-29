// Contact-form parsing + validation. Port of handlers/contact.go.

export type ContactFormData = {
  name: string;
  email: string;
  category: string; // "bug" | "feature" | "general"
  message: string;
};

export const emptyContact = (): ContactFormData => ({ name: "", email: "", category: "", message: "" });

const ALLOWED_CATEGORY = new Set(["bug", "feature", "general"]);
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;
const NAME_MAX = 120;
const EMAIL_MAX = 254;
// Permissive single-address check (stand-in for Go's net/mail.ParseAddress).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = Record<string, string | File>;
const str = (b: Body, k: string): string => {
  const v = b[k];
  return typeof v === "string" ? v.trim() : "";
};

export function parseContact(b: Body): ContactFormData {
  return { name: str(b, "name"), email: str(b, "email"), category: str(b, "category"), message: str(b, "message") };
}

export function validateContact(d: ContactFormData): Record<string, string> {
  const e: Record<string, string> = {};
  if ([...d.name].length > NAME_MAX) e.name = "Keep your name under 120 characters.";

  if (d.email === "") e.email = "We need an email to reply to you.";
  else if ([...d.email].length > EMAIL_MAX) e.email = "That email looks too long.";
  else if (!EMAIL_RE.test(d.email)) e.email = "That doesn't look like a valid email.";

  if (!ALLOWED_CATEGORY.has(d.category)) e.category = "Pick a category — bug, feature, or general.";

  const n = [...d.message].length;
  if (n === 0) e.message = "Tell us what's on your mind.";
  else if (n < MESSAGE_MIN) e.message = "A bit more detail helps — at least 10 characters.";
  else if (n > MESSAGE_MAX) e.message = "Keep messages under 2,000 characters.";

  return e;
}
