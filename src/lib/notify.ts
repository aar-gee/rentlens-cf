// ntfy.sh push notifications via fetch(). Port of notify/notify.go — in
// Workers this is just an HTTPS POST. No-ops when NTFY_TOPIC is unset (dev /
// pre-secrets), mirroring the Go Noop notifier.
import type { ContactSubmission } from "../data/contact";

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
