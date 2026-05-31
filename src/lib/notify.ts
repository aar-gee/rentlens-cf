// ntfy.sh push notifications via fetch(). Port of notify/notify.go — in
// Workers this is just an HTTPS POST. No-ops when NTFY_TOPIC is unset (dev /
// pre-secrets), mirroring the Go Noop notifier.
import type { ContactSubmission } from "../data/contact";
import type { Submission } from "../data/submission";

export type NotifyEnv = {
  NTFY_TOPIC?: string;
  NTFY_SERVER?: string;
  ADMIN_BASE_URL?: string;
};

// categoryPresentation maps the category to ntfy's title/tags/priority trio.
function categoryPresentation(category: string): { title: string; tags: string; priority: string } {
  switch (category) {
    case "bug":
      return { title: "RentLens · Bug report", tags: "bug,warning", priority: "high" };
    case "feature":
      return { title: "RentLens · Feature request", tags: "bulb", priority: "default" };
    default:
      return { title: "RentLens · Message", tags: "envelope", priority: "low" };
  }
}

function buildBody(sub: ContactSubmission, adminBaseURL: string): string {
  let b = sub.name !== "" ? `From: ${sub.name} <${sub.email}>\n` : `From: ${sub.email}\n`;
  b += `Ref: contact/${sub.id}\n\n${sub.message}`;
  if (adminBaseURL !== "") b += `\n\nView: ${adminBaseURL}/messages`;
  return b;
}

// notifyContact POSTs a contact submission to ntfy. Fire-and-forget: returns a
// boolean (logged by caller); the message is already persisted. No-op when
// NTFY_TOPIC is unset.
export async function notifyContact(env: NotifyEnv, sub: ContactSubmission): Promise<boolean> {
  const topic = env.NTFY_TOPIC?.trim();
  if (!topic) return false;
  const server = (env.NTFY_SERVER?.trim() || "https://ntfy.sh").replace(/\/+$/, "");
  const adminBaseURL = (env.ADMIN_BASE_URL ?? "").replace(/\/+$/, "");
  const { title, tags, priority } = categoryPresentation(sub.category);
  try {
    const resp = await fetch(`${server}/${topic}`, {
      method: "POST",
      headers: {
        Title: title,
        Tags: tags,
        Priority: priority,
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: buildBody(sub, adminBaseURL),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

// formatINR — compact "₹50,000" style numbers for the ntfy body. SQL stores
// raw integers; the notification reads better with grouping.
function formatINR(n: number): string {
  if (n <= 0) return "₹0";
  // Indian grouping: last three digits, then groups of two.
  const s = String(n);
  const lastThree = s.slice(-3);
  const head = s.slice(0, -3);
  if (head === "") return "₹" + lastThree;
  const headGrouped = head.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return "₹" + headGrouped + "," + lastThree;
}

// buildSubmissionBody — the human-readable ntfy body for a fresh submission.
// Kept concise (mobile push), but carries the signals the admin would want
// to triage at a glance: spam flag, verify state, society/locality, rent,
// reference id, and a deep-link into the admin queue.
function buildSubmissionBody(sub: Submission, adminBaseURL: string): string {
  const society = sub.societyName || "Unknown society";
  const locality = sub.locality || "—";
  const rent = formatINR(sub.monthlyRent);
  const maint = formatINR(sub.monthlyMaint);
  const flags: string[] = [];
  if (sub.spamFlag) flags.push("SPAM-FLAGGED");
  if (sub.pendingSocietyId !== "") flags.push("new society");
  if (sub.pendingAreaId !== "") flags.push("new area");
  if (sub.helpContact !== "") flags.push("email given");
  if (sub.willingToHelp) flags.push("willing to help");

  let body = `${society} · ${locality}\n`;
  body += `${sub.bhk}BHK · ${rent} rent · ${maint} maint · ${sub.furnishing || "—"}\n`;
  if (flags.length > 0) body += `[${flags.join(", ")}]\n`;
  body += `Ref: submission/${sub.id}`;
  if (adminBaseURL !== "") body += `\n\nView: ${adminBaseURL}/submissions?since=24h`;
  return body;
}

// notifySubmission POSTs a fresh rent submission to ntfy. Fire-and-forget;
// the row is already persisted regardless of push outcome. Spam-flagged
// submissions push at "low" priority (auto-dispositioned, lower attention)
// while clean ones push at "default". No-op when NTFY_TOPIC is unset.
export async function notifySubmission(env: NotifyEnv, sub: Submission): Promise<boolean> {
  const topic = env.NTFY_TOPIC?.trim();
  if (!topic) return false;
  const server = (env.NTFY_SERVER?.trim() || "https://ntfy.sh").replace(/\/+$/, "");
  const adminBaseURL = (env.ADMIN_BASE_URL ?? "").replace(/\/+$/, "");
  const priority = sub.spamFlag ? "low" : "default";
  const tags = sub.spamFlag ? "house_with_garden,warning" : "house_with_garden";
  try {
    const resp = await fetch(`${server}/${topic}`, {
      method: "POST",
      headers: {
        Title: "RentLens · New submission",
        Tags: tags,
        Priority: priority,
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: buildSubmissionBody(sub, adminBaseURL),
    });
    return resp.ok;
  } catch {
    return false;
  }
}
