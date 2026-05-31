import type { FC, PropsWithChildren } from "hono/jsx";
import { html } from "hono/html";
import { adminHref } from "../../admin/auth";
import type { PendingSociety, PendingArea } from "../../data/pending";
import type { AdminAction } from "../../data/moderation";
import type { ContactSubmission } from "../../data/contact";
import type { Builder } from "../../data/builders";
import type { SubmissionListRow } from "../../data/submission";

// queueCounts — the dashboard numbers in one place.
export type QueueCounts = {
  pendingSocieties: number;
  pendingAreas: number;
  openMessages: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  canonicalSocieties: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// fmtDate renders a D1 "YYYY-MM-DD HH:MM:SS" (UTC) as "Jan 02, 15:04".
function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(iso ?? "");
  return m ? `${MONTHS[+m[2] - 1]} ${m[3]}, ${m[4]}:${m[5]}` : (iso ?? "");
}

const pluralize = (n: number, word: string) => (n === 1 ? `1 ${word}` : `${n} ${word}s`);

// proposedSlug — lowercase, non-alnum → hyphen, collapse, trim. Prefill only.
function proposedSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const ChevronDown: FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="text-ink-faint flex-shrink-0">
    <path d="M3.5 5l3.5 3.5L10.5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
  </svg>
);
const ArrowR: FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="text-ink-faint group-hover:text-ink transition-colors">
    <path d="M3 7h8m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" />
  </svg>
);

const rowClass = (last: boolean) => (last ? "block" : "block border-b border-hairline");

// ---- Shared chrome ----
const NavLink: FC<{ path: string; label: string; active: boolean }> = ({ path, label, active }) =>
  active ? (
    <a href={adminHref(path)} class="text-parchment border-b-2 border-marigold pb-1">
      {label}
    </a>
  ) : (
    <a href={adminHref(path)} class="text-parchment/70 hover:text-parchment border-b-2 border-transparent pb-1 transition-colors">
      {label}
    </a>
  );

const AdminBody: FC<PropsWithChildren<{ active: string }>> = ({ active, children }) => (
  <>
    <header class="bg-ink text-parchment border-b-2 border-marigold">
      <div class="max-w-wide mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-6">
        <div class="flex items-center gap-8">
          <a href={adminHref("/")} class="display text-xl font-medium tracking-tightest leading-none">
            RentLens<span class="text-marigold">.</span>
            <span class="text-parchment/55 num text-xs ml-2 align-middle tracking-[0.14em] uppercase">Admin</span>
          </a>
          <nav class="hidden sm:flex items-center gap-6 text-sm num tracking-[0.04em] uppercase">
            <NavLink path="/" label="Dashboard" active={active === "dashboard"} />
            <NavLink path="/pending-societies" label="Societies" active={active === "societies"} />
            <NavLink path="/pending-areas" label="Areas" active={active === "areas"} />
            <NavLink path="/submissions" label="Submissions" active={active === "submissions"} />
            <NavLink path="/messages" label="Messages" active={active === "messages"} />
            <NavLink path="/builders" label="Builders" active={active === "builders"} />
          </nav>
        </div>
        <div class="num text-[10px] text-parchment/45 tracking-[0.18em] uppercase">Moderation · Preview</div>
      </div>
    </header>
    {children}
    <footer class="px-5 sm:px-8 py-8 mt-16 border-t border-hairline">
      <div class="max-w-wide mx-auto flex items-center justify-between gap-4 text-xs text-ink-faint num tracking-[0.1em] uppercase">
        <div>Society, area, and message actions all persist in D1 and write to the audit log.</div>
        <div>v0.1 · MVP</div>
      </div>
    </footer>
  </>
);

// AdminBase renders the full admin document (own DOCTYPE + noindex meta, no SEO).
const AdminBase = (props: PropsWithChildren<{ title: string; active: string }>) =>
  html`<!DOCTYPE html>${(
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex, nofollow" />
        <title>{props.title} · RentLens Admin</title>
        <link rel="stylesheet" href="/static/tailwind.css" />
      </head>
      <body class="min-h-screen bg-parchment">
        <AdminBody active={props.active}>{props.children}</AdminBody>
      </body>
    </html>
  )}`;

const QueueHeader: FC<{ title: string; blurb: string }> = ({ title, blurb }) => (
  <div class="mb-8">
    <div class="eyebrow mb-3">/ Admin · Queue</div>
    <h1 class="display text-3xl sm:text-4xl font-normal tracking-tightest leading-[1.04]">{title}</h1>
    <p class="mt-3 text-sm text-ink-mute max-w-[680px] leading-relaxed">{blurb}</p>
  </div>
);

const EmptyQueue: FC<{ headline: string; blurb: string }> = ({ headline, blurb }) => (
  <div class="bg-white border border-hairline p-10 text-center">
    <div class="display text-2xl font-normal tracking-tight mb-2 text-ink-mute">{headline}</div>
    <p class="text-sm text-ink-faint max-w-[520px] mx-auto leading-relaxed">{blurb}</p>
  </div>
);

// ---- Dashboard ----
const DashboardCard: FC<{ label: string; count: number; blurb: string; path: string }> = ({ label, count, blurb, path }) => (
  <a href={adminHref(path)} class="block bg-white border border-hairline p-6 hover:border-ink transition-colors group">
    <div class="flex items-baseline justify-between gap-3 mb-3">
      <div class="eyebrow">{label}</div>
      <ArrowR />
    </div>
    <div class="num text-5xl font-medium tracking-tighter leading-none mb-3">{count}</div>
    <p class="text-xs text-ink-mute leading-relaxed">{blurb}</p>
  </a>
);

const Stat: FC<{ label: string; value: number }> = ({ label, value }) => (
  <div>
    <div class="num text-[10px] text-ink-faint tracking-[0.14em] uppercase mb-1.5">{label}</div>
    <div class="num text-xl text-ink font-medium tracking-tight">{value}</div>
  </div>
);

export const Dashboard = (counts: QueueCounts) => (
  <AdminBase title="Dashboard" active="dashboard">
    <main class="px-5 sm:px-8 py-12 sm:py-16">
      <div class="max-w-wide mx-auto">
        <div class="mb-10">
          <div class="eyebrow mb-3">/ Admin · Overview</div>
          <h1 class="display text-3xl sm:text-5xl font-normal tracking-tightest leading-[1.04]">Moderation queue.</h1>
          <p class="mt-4 text-base text-ink-mute max-w-[640px] leading-relaxed">
            Pending societies and pending areas are the two places where contributor submissions wait for a human
            decision before they enter the public catalog.
          </p>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <DashboardCard label="Pending societies" count={counts.pendingSocieties} blurb="Societies a contributor typed in that aren't in the catalog yet." path="/pending-societies" />
          <DashboardCard label="Pending areas" count={counts.pendingAreas} blurb="Areas typed via the 'Other' option in the submit form." path="/pending-areas" />
          <DashboardCard label="Open messages" count={counts.openMessages} blurb="Bug reports, feature requests, and general feedback from /contact." path="/messages" />
        </div>
        <div class="mt-12 pt-8 border-t border-hairline grid grid-cols-3 gap-4 text-sm">
          <Stat label="Canonical societies" value={counts.canonicalSocieties} />
          <Stat label="Total submissions" value={counts.totalSubmissions} />
          <Stat label="Of which pending" value={counts.pendingSubmissions} />
        </div>
      </div>
    </main>
  </AdminBase>
);

// ---- Shared action forms ----
const MergeForm: FC<{ action: string; label: string; helper: string; fieldName: string; options: string[] }> = ({
  action,
  label,
  helper,
  fieldName,
  options,
}) => (
  <form action={adminHref(action)} method="post" class="flex flex-col gap-2">
    <div class="text-xs font-medium text-ink">{label}</div>
    <div class="text-xs text-ink-faint leading-relaxed">{helper}</div>
    <select name={fieldName} required class="w-full bg-white border border-hairline px-3 py-2 text-sm outline-none focus:border-marigold mt-1">
      <option value="">— select —</option>
      {options.map((opt) => (
        <option value={opt}>{opt}</option>
      ))}
    </select>
    <button type="submit" class="bg-ink text-parchment px-4 py-2 text-sm font-medium tracking-tight hover:bg-ink/90 transition-colors mt-1">
      Merge
    </button>
  </form>
);

const RejectForm: FC<{ action: string; helper: string }> = ({ action, helper }) => (
  <form action={adminHref(action)} method="post" class="flex flex-col gap-2">
    <div class="text-xs font-medium text-ink">Reject</div>
    <div class="text-xs text-ink-faint leading-relaxed">{helper}</div>
    <textarea name="reason" required rows={3} placeholder="duplicate / spam / unrelated / ..." class="w-full bg-white border border-hairline px-3 py-2 text-sm outline-none focus:border-marigold mt-1 resize-none" />
    <button type="submit" class="bg-white text-danger border border-danger px-4 py-2 text-sm font-medium tracking-tight hover:bg-danger hover:text-parchment transition-colors mt-1">
      Reject
    </button>
  </form>
);

const CreateForm: FC<{ action: string; p: PendingSociety; linkedAreaName?: string; builders: Builder[] }> = ({
  action,
  p,
  linkedAreaName,
  builders,
}) => (
  <form action={adminHref(action)} method="post" class="flex flex-col gap-2">
    <div class="text-xs font-medium text-ink">Create canonical society</div>
    <div class="text-xs text-ink-faint leading-relaxed">Promote this typed name into a real catalog row.</div>
    <input type="text" name="slug" required placeholder="slug (kebab-case)" value={proposedSlug(p.typedName)} class="w-full bg-white border border-hairline px-3 py-2 text-sm outline-none focus:border-marigold mt-1 num" />
    <input type="text" name="name" required value={p.typedName} placeholder="canonical name" class="w-full bg-white border border-hairline px-3 py-2 text-sm outline-none focus:border-marigold" />
    <input type="text" name="locality" required value={linkedAreaName && linkedAreaName !== "" ? linkedAreaName : p.locality} placeholder="locality" class="w-full bg-white border border-hairline px-3 py-2 text-sm outline-none focus:border-marigold" />
    {/* Builder is a select from the builders table (Category-A drives homepage
        featuring). Missing one? Add it on the Builders page, then reload. */}
    <select name="builder_id" class="w-full bg-white border border-hairline px-3 py-2 text-sm outline-none focus:border-marigold">
      <option value="">— builder (none) —</option>
      {builders.map((b) => (
        <option value={b.id}>
          {b.name}
          {b.tier === "A" ? "  ★ Category A" : ""}
        </option>
      ))}
    </select>
    <button type="submit" class="bg-marigold text-parchment px-4 py-2 text-sm font-medium tracking-tight hover:bg-marigold-deep transition-colors mt-1">
      Create
    </button>
  </form>
);

const PromoteForm: FC<{ action: string; p: PendingArea }> = ({ action, p }) => (
  <form action={adminHref(action)} method="post" class="flex flex-col gap-2">
    <div class="text-xs font-medium text-ink">Promote to canonical area</div>
    <div class="text-xs text-ink-faint leading-relaxed">Mark this area promoted. (Canonical-area picker list is code-managed.)</div>
    <input type="text" name="name" required value={p.typedName} placeholder="canonical name" class="w-full bg-white border border-hairline px-3 py-2 text-sm outline-none focus:border-marigold mt-1" />
    <button type="submit" class="bg-marigold text-parchment px-4 py-2 text-sm font-medium tracking-tight hover:bg-marigold-deep transition-colors mt-1">
      Promote
    </button>
  </form>
);

const AuditLog: FC<{ actions: AdminAction[] }> = ({ actions }) => (
  <section class="mt-12">
    <h2 class="num text-xs tracking-[0.14em] uppercase text-ink-faint mb-3">Recent moderation activity</h2>
    {actions.length === 0 ? (
      <p class="text-sm text-ink-faint">No moderation actions recorded yet.</p>
    ) : (
      <div class="bg-white border border-hairline overflow-hidden">
        {actions.map((a) => (
          <div class="px-5 py-3 border-b border-hairline last:border-b-0">
            <div class="flex items-center gap-2 num text-xs">
              <span class="text-marigold-deep uppercase tracking-[0.1em]">{a.action}</span>
              <span class="text-ink">
                {a.targetKind} {a.targetId}
              </span>
              {a.detail !== "" ? <span class="text-ink-faint truncate">— {a.detail}</span> : null}
            </div>
            <div class="num text-[11px] text-ink-faint mt-0.5">
              {a.actor} · {fmtDate(a.createdAt)}
            </div>
          </div>
        ))}
      </div>
    )}
  </section>
);

// ---- Pending societies queue ----
type PSRowData = { p: PendingSociety; subCount: number; emailCount: number; linkedAreaName?: string };

const PendingSocietyRow: FC<{ d: PSRowData; canonical: string[]; builders: Builder[]; last: boolean }> = ({
  d,
  canonical,
  builders,
  last,
}) => (
  <details class={rowClass(last)}>
    <summary class="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-parchment-deep/30 transition-colors">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-1">
          <span class="text-sm font-medium text-ink truncate">{d.p.typedName}</span>
          {d.linkedAreaName ? (
            <span class="num text-[10px] text-marigold-deep tracking-[0.14em] uppercase bg-marigold/15 px-2 py-0.5 rounded">
              + new area
            </span>
          ) : null}
        </div>
        <div class="num text-xs text-ink-faint flex items-center gap-3">
          <span>ID {d.p.id}</span>
          <span>·</span>
          <span>{pluralize(d.subCount, "submission")}</span>
          <span>·</span>
          <span>{pluralize(d.emailCount, "contributor")}</span>
          {d.p.locality !== "" ? (
            <>
              <span>·</span>
              <span>{d.p.locality}</span>
            </>
          ) : null}
          <span>·</span>
          <span>{fmtDate(d.p.createdAt)}</span>
        </div>
      </div>
      <ChevronDown />
    </summary>
    <div class="px-5 pb-6 pt-2 border-t border-hairline grid sm:grid-cols-3 gap-5">
      <MergeForm action={`/pending-societies/${d.p.id}/merge`} label="Merge into existing society" helper="Pick the canonical society this typed name should fold into." fieldName="society_slug" options={canonical} />
      <CreateForm action={`/pending-societies/${d.p.id}/create`} p={d.p} linkedAreaName={d.linkedAreaName} builders={builders} />
      <RejectForm action={`/pending-societies/${d.p.id}/reject`} helper="Why is this not being added?" />
    </div>
  </details>
);

export const PendingSocietiesQueue = (
  rows: PSRowData[],
  canonical: string[],
  builders: Builder[],
  actions: AdminAction[],
) => (
  <AdminBase title="Pending societies" active="societies">
    <main class="px-5 sm:px-8 py-12 sm:py-16">
      <div class="max-w-wide mx-auto">
        <QueueHeader
          title="Pending societies"
          blurb="Societies typed by contributors that don't yet exist in the canonical catalog. Merge into an existing society, create a new canonical row, or reject."
        />
        {rows.length === 0 ? (
          <EmptyQueue headline="No pending societies" blurb="Every submission so far has matched a society in the catalog." />
        ) : (
          <div class="bg-white border border-hairline overflow-hidden">
            {rows.map((d, i) => (
              <PendingSocietyRow d={d} canonical={canonical} builders={builders} last={i === rows.length - 1} />
            ))}
          </div>
        )}
        <AuditLog actions={actions} />
      </div>
    </main>
  </AdminBase>
);

// ---- Builders management ----
export const BuildersPage = (builders: Builder[]) => (
  <AdminBase title="Builders" active="builders">
    <main class="px-5 sm:px-8 py-12 sm:py-16">
      <div class="max-w-wide mx-auto">
        <QueueHeader
          title="Builders"
          blurb="The builder catalog. Category-A builders' societies surface on the homepage featured strip; the rest stay fully searchable. Used by the create-society select."
        />
        <div class="grid sm:grid-cols-[1fr_320px] gap-6 items-start">
          <div class="bg-white border border-hairline overflow-hidden">
            <div class="grid grid-cols-[1fr_90px] text-xs text-ink-mute eyebrow !normal-case px-5 py-3 border-b border-hairline bg-parchment-deep/40">
              <div>Builder</div>
              <div class="text-right">Tier</div>
            </div>
            {builders.map((b, i) => (
              <div class={`grid grid-cols-[1fr_90px] text-sm px-5 py-3 items-center${i === builders.length - 1 ? "" : " border-b border-hairline"}`}>
                <div>
                  {b.name}
                  <span class="num text-[10px] text-ink-faint ml-2">{b.slug}</span>
                </div>
                <div class="text-right">
                  {b.tier === "A" ? (
                    <span class="num text-[10px] tracking-[0.14em] uppercase bg-marigold/15 text-marigold-deep px-2 py-0.5 rounded">A</span>
                  ) : (
                    <span class="num text-[10px] text-ink-faint">{b.tier === "B" ? "B" : "—"}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <form action={adminHref("/builders")} method="post" class="bg-white border border-hairline p-5 flex flex-col gap-2">
            <div class="text-xs font-medium text-ink">Add a builder</div>
            <div class="text-xs text-ink-faint leading-relaxed">Then it appears in the create-society select.</div>
            <input type="text" name="name" required placeholder="Builder name" class="w-full bg-white border border-hairline px-3 py-2 text-sm outline-none focus:border-marigold mt-1" />
            <select name="tier" class="w-full bg-white border border-hairline px-3 py-2 text-sm outline-none focus:border-marigold">
              <option value="">Tier — none (searchable only)</option>
              <option value="A">A — featured on homepage</option>
              <option value="B">B</option>
            </select>
            <button type="submit" class="bg-ink text-parchment px-4 py-2 text-sm font-medium tracking-tight hover:bg-ink/90 transition-colors mt-1">
              Add builder
            </button>
          </form>
        </div>
      </div>
    </main>
  </AdminBase>
);

// ---- Pending areas queue ----
type PARowData = { p: PendingArea; subCount: number; societyCount: number };

const PendingAreaRow: FC<{ d: PARowData; canonical: string[]; last: boolean }> = ({ d, canonical, last }) => (
  <details class={rowClass(last)}>
    <summary class="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-parchment-deep/30 transition-colors">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-1">
          <span class="text-sm font-medium text-ink truncate">{d.p.typedName}</span>
          {d.societyCount > 0 ? (
            <span class="num text-[10px] text-marigold-deep tracking-[0.14em] uppercase bg-marigold/15 px-2 py-0.5 rounded">
              linked to {d.societyCount} pending soc.
            </span>
          ) : null}
        </div>
        <div class="num text-xs text-ink-faint flex items-center gap-3">
          <span>ID {d.p.id}</span>
          <span>·</span>
          <span>{pluralize(d.subCount, "submission")}</span>
          <span>·</span>
          <span>{fmtDate(d.p.createdAt)}</span>
        </div>
      </div>
      <ChevronDown />
    </summary>
    <div class="px-5 pb-6 pt-2 border-t border-hairline grid sm:grid-cols-3 gap-5">
      <MergeForm action={`/pending-areas/${d.p.id}/merge`} label="Merge into existing area" helper="Pick the canonical area this typed name should fold into." fieldName="area_name" options={canonical} />
      <PromoteForm action={`/pending-areas/${d.p.id}/promote`} p={d.p} />
      <RejectForm action={`/pending-areas/${d.p.id}/reject`} helper="Why is this not being added?" />
    </div>
  </details>
);

export const PendingAreasQueue = (rows: PARowData[], canonical: string[]) => (
  <AdminBase title="Pending areas" active="areas">
    <main class="px-5 sm:px-8 py-12 sm:py-16">
      <div class="max-w-wide mx-auto">
        <QueueHeader
          title="Pending areas"
          blurb="Areas typed by contributors via the 'Other' option in the submit form. Merge into an existing area, promote to canonical, or reject."
        />
        {rows.length === 0 ? (
          <EmptyQueue headline="No pending areas" blurb="Every submission so far picked an area from the canonical list." />
        ) : (
          <div class="bg-white border border-hairline overflow-hidden">
            {rows.map((d, i) => (
              <PendingAreaRow d={d} canonical={canonical} last={i === rows.length - 1} />
            ))}
          </div>
        )}
      </div>
    </main>
  </AdminBase>
);

// ---- Messages queue ----
const CategoryBadge: FC<{ category: string }> = ({ category }) => {
  if (category === "bug")
    return <span class="num text-[10px] tracking-[0.14em] uppercase bg-danger/15 text-danger-deep px-2 py-0.5 rounded">Bug</span>;
  if (category === "feature")
    return <span class="num text-[10px] tracking-[0.14em] uppercase bg-marigold/15 text-marigold-deep px-2 py-0.5 rounded">Feature</span>;
  return <span class="num text-[10px] tracking-[0.14em] uppercase bg-ink/10 text-ink-mute px-2 py-0.5 rounded">General</span>;
};

const StatusBadge: FC<{ status: string }> = ({ status }) =>
  status === "resolved" ? (
    <span class="num text-[10px] tracking-[0.14em] uppercase bg-success/15 text-success px-2 py-0.5 rounded">Resolved</span>
  ) : (
    <span class="num text-[10px] tracking-[0.14em] uppercase bg-parchment-deep text-ink-mute px-2 py-0.5 rounded border border-hairline">Open</span>
  );

const senderLabel = (m: ContactSubmission) => (m.name !== "" ? `${m.name} <${m.email}>` : m.email);
const snippet = (body: string) => {
  const c = body.replace(/\n/g, " ").trim();
  return c.length > 160 ? c.slice(0, 160) + "…" : c;
};

function mailtoLink(m: ContactSubmission): string {
  const subject = `Re: your message to RentLens (contact/${m.id})`;
  const greeting = m.name !== "" ? m.name : "there";
  const kind = m.category === "bug" ? "bug report" : m.category === "feature" ? "feature request" : "message";
  const body = `Hi ${greeting},\n\nThanks for writing in about your ${kind}.\n\n— RentLens\n\n---\nYour original message (ref: contact/${m.id}):\n\n${m.message}`;
  return `mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const MessageRow: FC<{ m: ContactSubmission; last: boolean }> = ({ m, last }) => (
  <details class={rowClass(last)}>
    <summary class="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-parchment-deep/30 transition-colors">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-3 mb-1">
          <CategoryBadge category={m.category} />
          <span class="text-sm font-medium text-ink truncate">{senderLabel(m)}</span>
          <StatusBadge status={m.status} />
        </div>
        <div class="num text-xs text-ink-faint flex items-center gap-3">
          <span>ID {m.id}</span>
          <span>·</span>
          <span>{fmtDate(m.createdAt)}</span>
        </div>
        <div class="text-sm text-ink-mute mt-2 line-clamp-1 max-w-[680px]">{snippet(m.message)}</div>
      </div>
      <ChevronDown />
    </summary>
    <div class="px-5 pb-6 pt-2 border-t border-hairline grid sm:grid-cols-[1fr_280px] gap-6">
      <div>
        <div class="text-xs text-ink-faint num tracking-[0.1em] uppercase mb-2">Message body</div>
        <div class="whitespace-pre-wrap text-sm text-ink leading-relaxed bg-parchment-deep/30 border border-hairline p-4">
          {m.message}
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <a href={mailtoLink(m)} class="inline-flex items-center justify-center gap-2 bg-ink text-parchment px-4 py-2.5 text-sm font-medium tracking-tight hover:bg-ink/90 transition-colors">
          Reply via email
        </a>
        {m.status === "open" ? (
          <form action={adminHref(`/messages/${m.id}/resolve`)} method="post">
            <button type="submit" class="w-full bg-success text-parchment px-4 py-2.5 text-sm font-medium tracking-tight hover:bg-success/90 transition-colors">
              Mark resolved
            </button>
          </form>
        ) : (
          <>
            <form action={adminHref(`/messages/${m.id}/reopen`)} method="post">
              <button type="submit" class="w-full bg-white text-ink border border-hairline-strong px-4 py-2.5 text-sm font-medium tracking-tight hover:border-ink transition-colors">
                Reopen
              </button>
            </form>
            {m.resolvedAt ? (
              <div class="num text-[10px] text-ink-faint tracking-[0.1em] uppercase text-center">
                Resolved {fmtDate(m.resolvedAt)}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  </details>
);

export const MessagesQueue = (messages: ContactSubmission[]) => (
  <AdminBase title="Messages" active="messages">
    <main class="px-5 sm:px-8 py-12 sm:py-16">
      <div class="max-w-wide mx-auto">
        <QueueHeader
          title="Messages"
          blurb="Submissions from /contact. Bug reports, feature requests, and general feedback. Resolve when you've replied or decided no reply is needed."
        />
        {messages.length === 0 ? (
          <EmptyQueue headline="No messages yet" blurb="When someone fills out /contact, their submission lands here." />
        ) : (
          <div class="bg-white border border-hairline overflow-hidden">
            {messages.map((m, i) => (
              <MessageRow m={m} last={i === messages.length - 1} />
            ))}
          </div>
        )}
      </div>
    </main>
  </AdminBase>
);

// ---- Submissions browse (time-windowed) ----

// formatINR — mirror of the lib/notify.ts helper, scoped to view here so
// the admin row count of rent values reads naturally. Plain `₹` prefix +
// Indian grouping.
function formatINRView(n: number): string {
  if (n <= 0) return "₹0";
  const s = String(n);
  const lastThree = s.slice(-3);
  const head = s.slice(0, -3);
  if (head === "") return "₹" + lastThree;
  return "₹" + head.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
}

// maskEmail — mirror of the verify-page helper (kept private to admin view
// so admin sees masked + can hover to confirm dedup signal without raw PII
// in the page DOM).
function maskEmailView(e: string): string {
  if (e === "") return "";
  const at = e.indexOf("@");
  if (at < 1) return "***";
  const local = e.slice(0, at);
  const domain = e.slice(at);
  if (local.length <= 2) return `${local[0]}***${domain}`;
  return `${local[0]}${"*".repeat(Math.min(3, local.length - 2))}${local[local.length - 1]}${domain}`;
}

const SinceQuickPicks: FC<{ current: string }> = ({ current }) => {
  const picks: { value: string; label: string }[] = [
    { value: "1h", label: "1h" },
    { value: "6h", label: "6h" },
    { value: "24h", label: "24h" },
    { value: "7d", label: "7d" },
    { value: "30d", label: "30d" },
  ];
  return (
    <div class="flex items-center gap-2">
      <span class="num text-[10px] tracking-[0.14em] uppercase text-ink-faint">Since</span>
      {picks.map((p) => (
        <a
          href={adminHref(`/submissions?since=${p.value}`)}
          class={
            "px-2.5 py-1 text-xs num border " +
            (p.value === current
              ? "bg-ink text-parchment border-ink"
              : "bg-white text-ink-mute border-hairline hover:border-ink")
          }
        >
          {p.label}
        </a>
      ))}
    </div>
  );
};

const StatusFilter: FC<{ current: string }> = ({ current }) => {
  const picks: { value: string; label: string }[] = [
    { value: "", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "published", label: "Published" },
    { value: "rejected", label: "Rejected" },
  ];
  return (
    <div class="flex items-center gap-2">
      <span class="num text-[10px] tracking-[0.14em] uppercase text-ink-faint">Status</span>
      {picks.map((p) => (
        <a
          href={adminHref(`/submissions?status=${p.value}`)}
          class={
            "px-2.5 py-1 text-xs num border " +
            (p.value === current
              ? "bg-ink text-parchment border-ink"
              : "bg-white text-ink-mute border-hairline hover:border-ink")
          }
        >
          {p.label}
        </a>
      ))}
    </div>
  );
};

const SpamFilter: FC<{ current: string }> = ({ current }) => {
  const picks: { value: string; label: string }[] = [
    { value: "", label: "All" },
    { value: "0", label: "Clean" },
    { value: "1", label: "Flagged" },
  ];
  return (
    <div class="flex items-center gap-2">
      <span class="num text-[10px] tracking-[0.14em] uppercase text-ink-faint">Spam</span>
      {picks.map((p) => (
        <a
          href={adminHref(`/submissions?spam=${p.value}`)}
          class={
            "px-2.5 py-1 text-xs num border " +
            (p.value === current
              ? "bg-ink text-parchment border-ink"
              : "bg-white text-ink-mute border-hairline hover:border-ink")
          }
        >
          {p.label}
        </a>
      ))}
    </div>
  );
};

const Badge: FC<PropsWithChildren<{ tone: "ink" | "mute" | "danger" | "marigold" | "success" }>> = ({ tone, children }) => {
  const cls =
    tone === "ink"
      ? "bg-ink text-parchment"
      : tone === "danger"
      ? "bg-danger/15 text-danger"
      : tone === "marigold"
      ? "bg-marigold/15 text-marigold-deep"
      : tone === "success"
      ? "bg-success/15 text-success"
      : "bg-parchment-deep/60 text-ink-mute";
  return <span class={`num text-[10px] tracking-[0.14em] uppercase px-1.5 py-0.5 ${cls}`}>{children as any}</span>;
};

const SubmissionRow: FC<{ r: SubmissionListRow; last: boolean }> = ({ r, last }) => (
  <div class={"px-5 py-4 grid grid-cols-[150px_1fr_140px] gap-4 items-start" + (last ? "" : " border-b border-hairline")}>
    <div class="text-xs text-ink-mute num">
      <div>{fmtDate(r.createdAt)}</div>
      <div class="text-ink-faint mt-1">{r.id}</div>
    </div>
    <div class="min-w-0">
      <div class="text-sm text-ink leading-tight flex items-center gap-2 flex-wrap">
        <span class="font-medium truncate">{r.societyName || "—"}</span>
        {r.locality ? <span class="text-ink-faint">· {r.locality}</span> : null}
        {r.pendingSocietyId !== "" ? <Badge tone="marigold">new society</Badge> : null}
        {r.pendingAreaId !== "" ? <Badge tone="marigold">new area</Badge> : null}
      </div>
      <div class="text-xs text-ink-mute mt-1 num">
        {r.bhk}BHK · {formatINRView(r.monthlyRent)} rent · {formatINRView(r.monthlyMaint)} maint · {r.floorBand || "—"} · {r.furnishing || "—"}
      </div>
      {r.helpContact !== "" || r.note !== "" ? (
        <div class="text-xs text-ink-mute mt-1.5 leading-relaxed">
          {r.helpContact !== "" ? (
            <span class="num" title={r.helpContact}>
              {maskEmailView(r.helpContact)}
              {r.willingToHelp ? " · willing to help" : ""}
            </span>
          ) : null}
          {r.note !== "" ? (
            <div class="text-ink-faint mt-1 truncate" title={r.note}>
              "{r.note.slice(0, 140)}{r.note.length > 140 ? "…" : ""}"
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
    <div class="flex flex-col items-end gap-1.5">
      {r.spamFlag ? <Badge tone="danger">spam</Badge> : null}
      {r.verifyState === "verified" ? <Badge tone="success">verified</Badge> : null}
      <Badge tone={r.status === "published" ? "success" : r.status === "rejected" ? "danger" : "mute"}>{r.status}</Badge>
    </div>
  </div>
);

const StatsBar: FC<{ rows: SubmissionListRow[] }> = ({ rows }) => {
  const total = rows.length;
  const verified = rows.filter((r) => r.verifyState === "verified").length;
  const spam = rows.filter((r) => r.spamFlag).length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const published = rows.filter((r) => r.status === "published").length;
  const rejected = rows.filter((r) => r.status === "rejected").length;
  const newSoc = rows.filter((r) => r.pendingSocietyId !== "").length;
  const stats: { label: string; value: number }[] = [
    { label: "Total", value: total },
    { label: "Pending", value: pending },
    { label: "Published", value: published },
    { label: "Rejected", value: rejected },
    { label: "Verified", value: verified },
    { label: "Spam", value: spam },
    { label: "New soc", value: newSoc },
  ];
  return (
    <div class="bg-white border border-hairline px-5 py-4 mb-6 grid grid-cols-7 gap-4">
      {stats.map((s) => (
        <div>
          <div class="num text-[10px] tracking-[0.14em] uppercase text-ink-faint">{s.label}</div>
          <div class="num text-2xl tracking-tight text-ink mt-1">{s.value}</div>
        </div>
      ))}
    </div>
  );
};

export const SubmissionsQueue = (
  rows: SubmissionListRow[],
  filters: { since: string; status: string; spam: string },
) => (
  <AdminBase title="Submissions" active="submissions">
    <main class="px-5 sm:px-8 py-12 sm:py-16">
      <div class="max-w-wide mx-auto">
        <QueueHeader
          title="Submissions"
          blurb="Time-windowed browse of every rent report — pending, published, or rejected — with verify state, spam flag, and pending-link flags surfaced inline. Filters chain via URL: ?since= + ?status= + ?spam=."
        />
        <div class="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
          <SinceQuickPicks current={filters.since} />
          <StatusFilter current={filters.status} />
          <SpamFilter current={filters.spam} />
          <a
            href={adminHref(`/api/submissions?since=${filters.since}${filters.status ? "&status=" + filters.status : ""}${filters.spam ? "&spam=" + filters.spam : ""}`)}
            class="num text-[10px] tracking-[0.14em] uppercase text-ink-faint hover:text-ink underline ml-auto"
          >
            Raw JSON →
          </a>
        </div>
        <StatsBar rows={rows} />
        {rows.length === 0 ? (
          <EmptyQueue headline="No submissions in this window" blurb="Widen the time range or clear filters." />
        ) : (
          <div class="bg-white border border-hairline overflow-hidden">
            {rows.map((r, i) => (
              <SubmissionRow r={r} last={i === rows.length - 1} />
            ))}
          </div>
        )}
      </div>
    </main>
  </AdminBase>
);

// ---- Action result (flash) ----
export const ActionResult = (verb: string, summary: string, backPath: string) => (
  <AdminBase title={verb} active="">
    <main class="px-5 sm:px-8 py-16 sm:py-24">
      <div class="max-w-narrow mx-auto text-center">
        <div class="eyebrow mb-3">/ Admin · {verb}</div>
        <h1 class="display text-3xl sm:text-5xl font-normal tracking-tightest leading-[1.04] mb-5">Done.</h1>
        <p class="text-base text-ink-mute max-w-[560px] mx-auto leading-relaxed">{summary}</p>
        <div class="mt-10">
          <a href={adminHref(backPath)} class="inline-flex items-center gap-2 bg-ink text-parchment px-5 py-3 text-sm font-medium tracking-tight hover:bg-ink/90 transition-colors">
            ← Back to queue
          </a>
        </div>
      </div>
    </main>
  </AdminBase>
);
