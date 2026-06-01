import { Hono } from "hono";
import { Home, FeaturedCardsInner } from "./views/pages/home";
import { Society, SocietySparse } from "./views/pages/society";
import { Submit } from "./views/pages/submit";
import { SubmitStep2A, SubmitStep2B } from "./views/pages/submit-step2";
import { SubmitSuccess } from "./views/pages/submit-success";
import { SearchResults } from "./views/components/search-results";
import { AreaResults } from "./views/components/area-results";
import { MoverResults } from "./views/components/mover-results";
import { listFeatured, filterFeatured, search, getBySlug, listAll, listPublishedPage, PAGE_SIZE, societyRentMeta, countPublished, listLocalities } from "./data/society";
import { homeStats } from "./data/stats";
import { SocietiesIndex } from "./views/pages/societies";
import { About } from "./views/pages/about";
import { NotesIndex, NoteArticle } from "./views/pages/notes";
import { notesByDate, noteBySlug } from "./data/notes";
import { joinWaitlist } from "./data/waitlist";
import { WaitlistInner } from "./views/components/waitlist-form";
import { robotsTxt, buildSitemap } from "./lib/seo";
import { societyDetailBySlug, mergeSocietyIntoDetail, buildEstimateDetail } from "./data/society-detail";
import { Contact, ContactSuccess } from "./views/pages/contact";
import { HowItWorks } from "./views/pages/how-it-works";
import { Privacy } from "./views/pages/privacy";
import { Terms } from "./views/pages/terms";
import { searchAreas } from "./data/area";
import { searchMovers } from "./data/mover";
import { insertContact } from "./data/contact";
import { emptyContact, parseContact, validateContact } from "./lib/contact";
import { notifyContact, notifySubmission } from "./lib/notify";
import { verifyTurnstile, TURNSTILE_ERROR } from "./lib/turnstile";
import { ADMIN_PREFIX } from "./admin/auth";
import { adminApp } from "./admin/routes";
import { newSubmission, getSubmissionById, getSubmissionForVerify } from "./data/submission";
import {
  emptyStep1,
  emptyStep2,
  parseStep1,
  parseStep2,
  validateStep1,
  validateStep2,
  hasStep1Errors,
  buildSubmission,
  persistSubmission,
  isValidEmail,
} from "./lib/submit";
import { getClientIp } from "./lib/spam";
import { sendEmail, type EmailEnv } from "./lib/email";
import { writeProof, readProof, type ProofEnv, STAGED_PREFIX } from "./lib/proof";
import { ackEmail as renderAckEmail } from "./views/email/ack-email";
import { ProofPage, type ProofPageState } from "./views/pages/proof";
import { getSubmissionByProofToken, markProofUploaded } from "./data/submission";
import {
  createVerification,
  consumeByToken,
  consumeByCode,
  findLive,
  createPreVerification,
  consumePreByToken,
  consumePreById,
  findPreById,
  attachPreToSubmission,
} from "./lib/verify";
import { verifyEmail as renderVerifyEmail } from "./views/email/verify-email";
import { Verify, maskEmail, type VerifyState } from "./views/pages/verify";
import { PREVERIFY_COOKIE, readCookie, preverifyCookieHeader, clearPreverifyCookieHeader } from "./lib/cookies";

// Worker bindings (see wrangler.toml). DB is the D1 (SQLite) database;
// ASSETS serves files from public/ (compiled tailwind.css, icons, manifest).
export type Bindings = {
  DB: D1Database;
  ASSETS: Fetcher;
  // ntfy push (Phase 6 secrets; notify no-ops when NTFY_TOPIC unset).
  NTFY_TOPIC?: string;
  NTFY_SERVER?: string;
  ADMIN_BASE_URL?: string;
  // Turnstile anti-spam (no-op when unset: widget hidden + verify passes).
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  // Admin basic-auth (Phase 6 secrets; admin 404s entirely when unset).
  ADMIN_USER?: string;
  ADMIN_PASS?: string;
  // Resend (email verification + future receipts). When RESEND_API_KEY is
  // unset, sendEmail no-ops + logs the would-be body to console (matches the
  // Turnstile no-op gate so local/staging-pre-secret still works).
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  // R2 bucket for optional rental-agreement proof uploads (RENT-tscofnqc /
  // RENT-ngelwosv). All proof code paths no-op when PROOFS is unbound so
  // local dev / pre-R2 staging keep working.
  PROOFS?: R2Bucket;
};

// Fire-and-forget: queue verification email creation + send for a submission
// that just persisted. Wraps the sequencing so all submit paths trigger it
// identically. Caller passes c.executionCtx so the HTTP response can return
// before Resend's RTT.
async function triggerVerification(
  db: D1Database,
  env: EmailEnv,
  origin: string,
  submissionId: string,
  email: string,
  societyName: string,
): Promise<void> {
  const created = await createVerification(db, submissionId, email);
  if (created.kind !== "created") return; // cooldown — caller already sent one within the last 60s
  const { code, token } = created.verification;
  const body = renderVerifyEmail({
    societyName: societyName || "your society",
    code,
    magicLink: `${origin}/verify/${token}`,
    ttlMinutes: 30,
  });
  await sendEmail(env, { to: email, subject: body.subject, html: body.html, text: body.text });
}

// Shared post-persist responder. Three branches:
//   1. Browser carries an rl_preverify cookie pointing at a consumed
//      pre-verification whose email matches sub.helpContact → attach it and
//      go straight to success (no email round-trip — they already verified
//      at Step 1).
//   2. sub.helpContact !== "" and no usable pre-verification → trigger a
//      fresh bound verification, redirect to /verify?id=.
//   3. No helpContact → straight to success.
async function respondAfterPersist(
  c: import("hono").Context<{ Bindings: Bindings }>,
  sub: import("./data/submission").Submission,
): Promise<Response> {
  // ntfy push on every submission — fire-and-forget so the HTTP response
  // returns before the ntfy POST round-trips. Spam-flagged pushes at low
  // priority (auto-dispositioned, lower attention); clean at default. No-op
  // when NTFY_TOPIC is unset (dev / pre-secret staging).
  c.executionCtx.waitUntil(notifySubmission(c.env, sub));

  // Ack + soft proof-prompt email (RENT-ngelwosv). Sent only when the
  // contributor gave us an email AND wasn't spam-flagged AND didn't attach
  // a proof inline AND was issued a token. Tone is friendly + non-pushy per
  // the user's pick (modelled on the levels.fyi mail). The verify email
  // continues to fire independently when needed.
  //
  // Cost-control: skipping spam-flagged saves Resend cost and doesn't tip
  // the attacker that they were flagged. persistSubmission already withholds
  // the token from spam_flag=1 rows, so the conditions below double-cover.
  if (
    sub.helpContact !== "" &&
    sub.proofUploadKey === "" &&
    sub.proofUploadToken !== "" &&
    !sub.spamFlag
  ) {
    const origin = new URL(c.req.url).origin;
    const proofUploadURL = `${origin}/proof/${sub.proofUploadToken}`;
    const tpl = renderAckEmail({
      societyName: sub.societyName,
      locality: sub.locality,
      bhk: sub.bhk,
      monthlyRent: sub.monthlyRent,
      monthlyMaint: sub.monthlyMaint,
      proofUploadURL,
    });
    c.executionCtx.waitUntil(
      sendEmail(c.env, { to: sub.helpContact, subject: tpl.subject, html: tpl.html, text: tpl.text }),
    );
  }

  // Branch 1: cookie attach. Three outcomes from attachPreToSubmission:
  //   attached_verified → submission flipped to verified; clear cookie; success.
  //   attached_pending  → pre is linked but unconsumed; SAME inbox email will
  //                       verify the submission later via markPreConsumed.
  //                       Clear cookie; success page tells them about the link.
  //   no_match          → fall through to fresh bound verification.
  if (sub.helpContact !== "") {
    const preId = readCookie(c.req.header("Cookie"), PREVERIFY_COOKIE);
    if (preId !== "") {
      const result = await attachPreToSubmission(c.env.DB, preId, sub);
      if (result === "attached_verified" || result === "attached_pending") {
        c.header("Set-Cookie", clearPreverifyCookieHeader());
        if (c.req.header("HX-Request") === "true") {
          c.header("HX-Redirect", `/submit/success?id=${sub.id}`);
          return c.body(null);
        }
        return c.html(<SubmitSuccess sub={sub} />);
      }
    }
  }
  // Branch 2: trigger fresh bound verification.
  if (sub.helpContact !== "") {
    const origin = new URL(c.req.url).origin;
    c.executionCtx.waitUntil(
      triggerVerification(c.env.DB, c.env, origin, sub.id, sub.helpContact, sub.societyName),
    );
    if (c.req.header("HX-Request") === "true") {
      c.header("HX-Redirect", `/verify?id=${sub.id}`);
      return c.body(null);
    }
    return c.redirect(`/verify?id=${sub.id}`);
  }
  // Branch 3: no email.
  if (c.req.header("HX-Request") === "true") {
    c.header("HX-Redirect", `/submit/success?id=${sub.id}`);
    return c.body(null);
  }
  return c.html(<SubmitSuccess sub={sub} />);
}

// strict:false so trailing slashes don't 404 (e.g. the admin dashboard at
// ADMIN_PREFIX + "/"); no public route depends on the trailing-slash distinction.
const app = new Hono<{ Bindings: Bindings }>({ strict: false });

// Admin moderation — mounted under the obscure prefix, behind basic-auth.
// 404s entirely when ADMIN_USER/ADMIN_PASS aren't configured.
app.route(ADMIN_PREFIX, adminApp);

// Homepage — featured (most-reported) societies + autocomplete search + filters.
app.get("/", async (c) => {
  const [featured, stats] = await Promise.all([listFeatured(c.env.DB, 6), homeStats(c.env.DB)]);
  return c.html(<Home featured={featured} stats={stats} />);
});

// /societies — browseable directory with classic page navigation (Prev/Next)
// and an optional ?area= locality filter. ?page is 1-based; both reset cleanly
// via plain links (no JS, no infinite-scroll jank). Sort: most-reported first,
// then A→Z. JSON-LD covers the current page; /sitemap.xml is the full SEO surface.
app.get("/societies", async (c) => {
  const area = (c.req.query("area") ?? "").trim();
  const page = Math.max(1, parseInt(c.req.query("page") ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const [pageData, total, stats, areas] = await Promise.all([
    listPublishedPage(c.env.DB, offset, area),
    countPublished(c.env.DB, area),
    homeStats(c.env.DB),
    listLocalities(c.env.DB),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return c.html(
    <SocietiesIndex
      societies={pageData.societies}
      page={page}
      totalPages={totalPages}
      area={area}
      areas={areas}
      stats={stats}
    />,
  );
});

// /search — autocomplete dropdown HTML fragment. Accepts q or society_name
// (the submit form posts its raw input name). mode=picker renders fill-form
// buttons instead of navigate links.
app.get("/search", async (c) => {
  let q = (c.req.query("q") ?? "").trim();
  if (q === "") q = (c.req.query("society_name") ?? "").trim();
  const picker = c.req.query("mode") === "picker";
  const results = await search(c.env.DB, q);
  return c.html(<SearchResults query={q} results={results} picker={picker} />);
});

// /featured — inner of #featured-cards as an HTMX fragment. ?area + ?bhk
// filter (empty = no filter); up to 6 matches, most-reported first.
app.get("/featured", async (c) => {
  const area = (c.req.query("area") ?? "").trim();
  const bhk = (c.req.query("bhk") ?? "").trim();
  const results = await filterFeatured(c.env.DB, area, bhk, 6);
  return c.html(<FeaturedCardsInner featured={results} />);
});

// /societies/:slug — curated detail first; slug-in-catalog-without-detail
// falls back to the sparse page; unknown slug 404s.
// Slugs renamed by data corrections (0015) — 301 so old links/index entries
// don't 404. Keep tiny; promote to a table if this grows.
const SLUG_REDIRECTS: Record<string, string> = {
  "salarpuria-sattva-magnus": "sattva-magnificia",
};

app.get("/societies/:slug", async (c) => {
  const slug = c.req.param("slug");
  const renamed = SLUG_REDIRECTS[slug];
  if (renamed) return c.redirect(`/societies/${renamed}`, 301);
  // The live DB row is authoritative for headline numbers + provenance; the
  // curated bundle (if any) only supplies the rich sections. A slug must exist
  // as a published society to render.
  const soc = await getBySlug(c.env.DB, slug);
  if (!soc) return c.notFound();
  const detail = societyDetailBySlug(slug);
  if (detail) return c.html(<Society detail={mergeSocietyIntoDetail(detail, soc)} />);
  // Non-curated society with grounded medians: render the same honest estimate
  // detail (per-BHK cards + maintenance/deposit) as curated ones. Only truly
  // data-less societies fall through to the sparse "contribute" page.
  if (soc.medianRent2BHK != null || soc.medianRent3BHK != null) {
    const meta = await societyRentMeta(c.env.DB, slug);
    return c.html(<Society detail={buildEstimateDetail(soc, meta.maintenance, meta.depositMonths)} />);
  }
  return c.html(<SocietySparse soc={soc} />);
});

// ---- Submit flow ----

// Step 1 form.
app.get("/submit", async (c) => {
  const preStatus = await loadPreStatus(c);
  return c.html(<Submit step1={emptyStep1()} errors={{}} siteKey={c.env.TURNSTILE_SITE_KEY} preStatus={preStatus} />);
});

// /areas/search + /movers/search — picker dropdowns for the submit form.
app.get("/areas/search", (c) => {
  let q = (c.req.query("q") ?? "").trim();
  if (q === "") q = (c.req.query("locality") ?? "").trim();
  const matches = searchAreas(q, 10);
  const exact = matches.some((a) => a.toLowerCase() === q.toLowerCase());
  return c.html(<AreaResults query={q} matches={matches} exact={exact} />);
});
app.get("/movers/search", (c) => {
  let q = (c.req.query("q") ?? "").trim();
  if (q === "") q = (c.req.query("mover_name") ?? "").trim();
  const matches = searchMovers(q, 8);
  const exact = matches.some((m) => m.toLowerCase() === q.toLowerCase());
  return c.html(<MoverResults query={q} matches={matches} exact={exact} />);
});

// Step 1 POST: validate; on success either skip to success (skip_step2) or
// render Step 2. On error re-render Step 1 (422) with values intact.
app.post("/submit/step1", async (c) => {
  const body = await c.req.parseBody();
  const step1 = parseStep1(body);
  const errs = validateStep1(step1);
  // Turnstile gates progression + the skip-to-success path (the widget lives
  // on this form). No-op when TURNSTILE_SECRET is unset.
  const tsOk = await verifyTurnstile(
    c.env.TURNSTILE_SECRET,
    String(body["cf-turnstile-response"] ?? ""),
    c.req.header("CF-Connecting-IP"),
  );
  if (!tsOk) errs.turnstile = TURNSTILE_ERROR;
  if (Object.keys(errs).length > 0) {
    c.status(422);
    const preStatus = await loadPreStatus(c);
    return c.html(<Submit step1={step1} errors={errs} siteKey={c.env.TURNSTILE_SITE_KEY} preStatus={preStatus} />);
  }
  if (body["skip_step2"] === "true") {
    const sub = buildSubmission(step1, emptyStep2());
    sub.ipAddress = getClientIp((n) => c.req.header(n));
    await persistSubmission(c.env.DB, sub);
    // helpContact = step1.email here (Step 2 was never rendered → s2.helpContact
    // is empty → buildSubmission falls back to step1.email). respondAfterPersist
    // triggers verification when an email is present, success otherwise.
    return respondAfterPersist(c, sub);
  }
  return c.html(<SubmitStep2A step1={step1} step2={emptyStep2()} errors={{}} />);
});

// Step 2a POST (RENT-tpsfwybf): validate step1 (re-check, in case someone
// hand-crafted a POST that skipped Step 1) + the section A fields with rules
// (sqft / deposit ranges). No Turnstile, no persist — just gateway to Step 3.
// On success render Step 3 carrying step1 + step2 forward.
app.post("/submit/step2a", async (c) => {
  const body = await c.req.parseBody();
  const step1 = parseStep1(body);
  const step2 = parseStep2(body);
  const step1Errs = validateStep1(step1);
  if (hasStep1Errors(step1Errs)) {
    c.status(422);
    const preStatus = await loadPreStatus(c);
    return c.html(<Submit step1={step1} errors={step1Errs} siteKey={c.env.TURNSTILE_SITE_KEY} preStatus={preStatus} />);
  }
  // Validate only the A-section fields with rules (sqft, deposit). The B/C/D/E
  // checks happen on /submit/step2b so users on Step 2 don't get errors about
  // fields they haven't seen yet.
  const allStep2Errs = validateStep2(step2);
  const aErrs: Record<string, string> = {};
  if (allStep2Errs.sqft) aErrs.sqft = allStep2Errs.sqft;
  if (allStep2Errs.deposit) aErrs.deposit = allStep2Errs.deposit;
  if (Object.keys(aErrs).length > 0) {
    c.status(422);
    return c.html(<SubmitStep2A step1={step1} step2={step2} errors={aErrs} />);
  }
  return c.html(<SubmitStep2B step1={step1} step2={step2} errors={{}} siteKey={c.env.TURNSTILE_SITE_KEY} />);
});

// Back navigation from Step 3 → Step 2 (preserves all current state). Uses
// formaction on the back button so a single form ferries everything across.
// No validation: this is purely "render the previous page with what they've
// typed". Step 2 validation (re-)runs when they move forward again.
// POST /submit/stage-proof — inline Step 1 upload (RENT-tscofnqc completion).
// File hits R2 BEFORE the submission row exists; the JSON response returns
// the R2 key, and the client JS writes that into a hidden input
// (staged_proof_key) which Step1Hidden carries through Steps 2 → 3.
// buildSubmission promotes the staged key into the submission's
// proof_upload_key on persist. Orphans (file uploaded but form abandoned)
// are auto-purged by the staged/ R2 lifecycle rule.
//
// Cost-control mirrors the post-submit /proof/<token> route:
//   - Pre-parseBody Content-Length cap (< 600 KB)
//   - Per-IP daily limit (10/day; a hair higher than the post-submit cap
//     since both inline + late paths count separately)
// No Turnstile here on purpose: the widget on Step 1 produces a single-use
// token; spending it on the stage upload would invalidate the eventual
// form submit. We accept that tradeoff and rely on per-IP rate + spam_flag
// downstream to catch abuse.
const STAGE_MAX_PER_IP_PER_DAY = 10;

app.post("/submit/stage-proof", async (c) => {
  if (!c.env.PROOFS) {
    return c.json({ ok: false, error: "uploads_unavailable" }, 503);
  }
  const clHeader = c.req.header("Content-Length");
  const cl = clHeader ? parseInt(clHeader, 10) : NaN;
  if (Number.isFinite(cl) && cl > 600 * 1024) {
    return c.json({ ok: false, error: "too_large" }, 413);
  }
  // Per-IP rate cap — counts both inline stage uploads (proof_upload_key
  // LIKE 'staged/%') AND post-submit late uploads (proof_upload_key
  // LIKE 'proofs/%') for the same IP in the last 24h.
  const clientIp = getClientIp((n) => c.req.header(n));
  if (clientIp !== "") {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    const row = await c.env.DB.prepare(
      `SELECT count(*) AS n FROM submissions WHERE ip_address = ? AND proof_upload_key != '' AND created_at > ?`,
    )
      .bind(clientIp, cutoff)
      .first<{ n: number }>();
    if ((row?.n ?? 0) >= STAGE_MAX_PER_IP_PER_DAY) {
      return c.json({ ok: false, error: "rate_limited" }, 429);
    }
  }
  const body = await c.req.parseBody();
  const file = body["file"];
  if (!file || typeof file === "string") {
    return c.json({ ok: false, error: "no_file" }, 422);
  }
  // No submission_id yet — pass a random owner key purely for R2's
  // customMetadata trail. STAGED_PREFIX makes the actual key path predictable.
  const stagedOwner = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const result = await writeProof(c.env, stagedOwner, file, { keyPrefix: STAGED_PREFIX });
  if (result.kind === "ok") return c.json({ ok: true, key: result.key });
  if (result.kind === "too_large") return c.json({ ok: false, error: "too_large", size: result.size }, 413);
  if (result.kind === "wrong_type") return c.json({ ok: false, error: "wrong_type", type: result.type }, 415);
  if (result.kind === "empty") return c.json({ ok: false, error: "empty" }, 422);
  if (result.kind === "no_binding") return c.json({ ok: false, error: "uploads_unavailable" }, 503);
  return c.json({ ok: false, error: "unknown" }, 500);
});

app.post("/submit/back-step2a", async (c) => {
  const body = await c.req.parseBody();
  const step1 = parseStep1(body);
  const step2 = parseStep2(body);
  return c.html(<SubmitStep2A step1={step1} step2={step2} errors={{}} />);
});

// Step 2b POST (RENT-tpsfwybf): the final persist boundary. Validate
// EVERYTHING again (step1 + all of step2 — defends against hand-crafted POSTs
// that skip the Step 2 / Step 3 forms), gate Turnstile, then persist + verify.
// On Step 1 errors bounce all the way back to Step 1; on Step 2 (A) errors
// bounce to Step 2; on Step 2 (C/D/E) errors re-render Step 3 in place.
app.post("/submit/step2b", async (c) => {
  const body = await c.req.parseBody();
  const step1 = parseStep1(body);
  const step2 = parseStep2(body);
  const errs = { ...validateStep1(step1), ...validateStep2(step2) };
  const tsOk = await verifyTurnstile(
    c.env.TURNSTILE_SECRET,
    String(body["cf-turnstile-response"] ?? ""),
    c.req.header("CF-Connecting-IP"),
  );
  if (!tsOk) errs.turnstile = TURNSTILE_ERROR;
  if (hasStep1Errors(errs)) {
    c.status(422);
    const preStatus = await loadPreStatus(c);
    return c.html(<Submit step1={step1} errors={errs} siteKey={c.env.TURNSTILE_SITE_KEY} preStatus={preStatus} />);
  }
  // Section-A errors (sqft / deposit) belong on Step 2, not Step 3 — bounce.
  if (errs.sqft || errs.deposit) {
    c.status(422);
    const aErrs: Record<string, string> = {};
    if (errs.sqft) aErrs.sqft = errs.sqft;
    if (errs.deposit) aErrs.deposit = errs.deposit;
    return c.html(<SubmitStep2A step1={step1} step2={step2} errors={aErrs} />);
  }
  if (Object.keys(errs).length > 0) {
    c.status(422);
    return c.html(<SubmitStep2B step1={step1} step2={step2} errors={errs} siteKey={c.env.TURNSTILE_SITE_KEY} />);
  }
  const sub = buildSubmission(step1, step2);
  sub.ipAddress = getClientIp((n) => c.req.header(n));
  await persistSubmission(c.env.DB, sub);
  return respondAfterPersist(c, sub);
});

// Success page — ?id lookup falls back to a generic page so refreshes render.
app.get("/submit/success", async (c) => {
  const id = c.req.query("id") ?? "";
  let sub = id !== "" ? await getSubmissionById(c.env.DB, id) : null;
  if (!sub) {
    sub = newSubmission();
    sub.societyName = "your society";
  }
  return c.html(<SubmitSuccess sub={sub} />);
});

// loadPreStatus — read rl_preverify cookie, look up the pre row, classify.
// Returned shape feeds the Submit page's Step1Fields so the email block can
// render its three states (none / pending / verified) on initial GET /submit
// as well as on every 422-redraw path.
type PreStatus = { kind: "verified" | "pending"; email: string } | undefined;

async function loadPreStatus(
  c: import("hono").Context<{ Bindings: Bindings }>,
): Promise<PreStatus> {
  const preId = readCookie(c.req.header("Cookie"), PREVERIFY_COOKIE);
  if (preId === "") return undefined;
  const pre = await findPreById(c.env.DB, preId);
  if (!pre) return undefined;
  // Expired pre → treat as none.
  if (Date.parse(pre.expiresAt + "Z") < Date.now()) return undefined;
  return { kind: pre.consumedAt ? "verified" : "pending", email: pre.email };
}

// preverifyPendingFragment — inner-HTML for #email-verify-status while a
// pre-verification is live (sent, not yet consumed). Always rendered with
// the state marker + a code-entry form so the form survives the next swap.
// When `error` is set, also surfaces it; when `email` is "" we omit the
// "sent to..." sentence (used by error-fallback paths where we lost the
// caller context).
function preverifyPendingFragment(email: string, error?: string) {
  return (
    <>
      <span id="email-verify-state" data-state="pending" hidden />
      {email !== "" ? (
        <div class="text-xs text-marigold-deep leading-relaxed">
          We sent a verification link + 6-digit code to <span class="font-medium">{maskEmail(email)}</span>. Click the
          link in your inbox, or paste the code below.
        </div>
      ) : (
        <div class="text-xs text-marigold-deep leading-relaxed">Check your inbox, then paste the code below.</div>
      )}
      <div class="flex items-stretch gap-2">
        {/* Inputs reference the sibling #x-rl-verify-code form (rendered
            outside the outer step1 <form> in Submit). No inner <form> wrapper
            — nesting one inside the step1 form would silently close the
            outer form and orphan the Step 1 submit buttons. */}
        <input type="hidden" name="id" value="" form="x-rl-verify-code" />
        <input
          type="text"
          name="code"
          form="x-rl-verify-code"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength={6}
          autocomplete="one-time-code"
          required
          placeholder="000000"
          class="num text-center text-base tracking-[0.22em] px-3 py-2 bg-white border border-hairline focus:border-ink focus:outline-none flex-1"
        />
        <button
          type="submit"
          form="x-rl-verify-code"
          class="bg-ink text-parchment px-4 py-2 text-xs font-medium tracking-tight hover:bg-ink/90 transition-colors"
        >
          Verify
        </button>
      </div>
      {error ? <div class="text-xs text-danger leading-relaxed">{error}</div> : null}
    </>
  );
}

// preverifyNoneFragment — re-renders the initial "type your email + Verify
// email button" state. Used when verify-now hits a validation or rate-limit
// error so the user can adjust input and retry.
function preverifyNoneFragment(error?: string) {
  return (
    <>
      <span id="email-verify-state" data-state="none" hidden />
      <button
        type="button"
        hx-post="/email/verify-now"
        hx-include="#submit-email, [name='cf-turnstile-response']"
        hx-target="#email-verify-status"
        hx-swap="innerHTML"
        class="self-start text-xs font-medium text-marigold-deep hover:text-marigold underline"
      >
        Verify email →
      </button>
      {error ? <div class="text-xs text-danger leading-relaxed mt-1">{error}</div> : null}
    </>
  );
}

// preverifyVerifiedFragment — replaces #email-verify-status content after
// successful code consumption. Marker switches to "verified" so the nudge
// JS skips the interrupt.
function preverifyVerifiedFragment(email: string) {
  return (
    <>
      <span id="email-verify-state" data-state="verified" hidden />
      <div class="flex items-center gap-3 bg-marigold/10 border border-marigold/30 px-4 py-3">
        <svg width="16" height="16" viewBox="0 0 16 16" class="text-marigold-deep flex-shrink-0">
          <path d="M4 8l3 3 5-6" stroke="currentColor" stroke-width="2" stroke-linecap="square" fill="none" />
        </svg>
        <div class="text-sm text-ink leading-relaxed flex-1">
          Verified <span class="font-medium">{email}</span>
        </div>
      </div>
    </>
  );
}

// ---- Pre-submission email verification (user feedback 2026-05-30) ----
//
// POST /email/verify-now is the "Verify email" button on Step 1. Validates
// the typed email + Turnstile, creates a pre-verification row (no
// submission_id yet), sends the verification mail, sets the rl_preverify
// cookie, and returns an HTMX fragment that replaces the button area with
// a "sent" confirmation + inline 6-digit code-entry form. The cookie is
// also read at final-submit time (respondAfterPersist) to attach the
// already-verified email to the eventual submission without a second mail.
app.post("/email/verify-now", async (c) => {
  const body = await c.req.parseBody();
  const email = String(body["email"] ?? "").trim();
  // Format check (same as validateStep1).
  const valid = isValidEmail(email);
  if (!valid) {
    return c.html(preverifyNoneFragment("Please type a valid email above, then click Verify email again."), 422);
  }
  const tsOk = await verifyTurnstile(
    c.env.TURNSTILE_SECRET,
    String(body["cf-turnstile-response"] ?? ""),
    c.req.header("CF-Connecting-IP"),
  );
  if (!tsOk) {
    return c.html(preverifyNoneFragment(TURNSTILE_ERROR), 422);
  }
  const created = await createPreVerification(c.env.DB, email);
  if (created.kind === "rate_limited") {
    return c.html(
      preverifyNoneFragment(
        `We sent one recently — please try again in about ${Math.max(1, Math.ceil(created.retryAfterSeconds / 60))} min.`,
      ),
      429,
    );
  }
  const { id, code, token } = created.preVerification;
  const origin = new URL(c.req.url).origin;
  const tpl = renderVerifyEmail({
    societyName: "your report",
    code,
    magicLink: `${origin}/verify/${token}`,
    ttlMinutes: 30,
  });
  c.executionCtx.waitUntil(
    sendEmail(c.env, { to: email, subject: tpl.subject, html: tpl.html, text: tpl.text }),
  );
  c.header("Set-Cookie", preverifyCookieHeader(id));
  return c.html(preverifyPendingFragment(email));
});

// POST /email/clear-verify — "Use a different email" link. Drops the cookie
// so the user can re-enter the verify-email button flow with a new address.
app.post("/email/clear-verify", (c) => {
  c.header("Set-Cookie", clearPreverifyCookieHeader());
  return c.redirect("/submit");
});

// ---- Email verification (RENT-ahstlnjb) ----

// GET /verify — code-entry landing page. Two modes:
//
//   (a) ?id=<submission_id> — post-submit bound flow. State: not_found,
//       already_verified, expired (no live row), or ask (the form).
//
//   (b) no query — pre-submit flow (user clicked Step 1's "Verify email"
//       earlier). Read rl_preverify cookie; look up the pre row; render
//       based on state. If no cookie either, not_found.
app.get("/verify", async (c) => {
  const id = c.req.query("id") ?? "";
  if (id === "") {
    // (b) Pre-mode via cookie.
    const preId = readCookie(c.req.header("Cookie"), PREVERIFY_COOKIE);
    if (preId === "") return c.html(<Verify state={{ kind: "not_found" }} />);
    const pre = await findPreById(c.env.DB, preId);
    if (!pre) return c.html(<Verify state={{ kind: "not_found" }} />);
    if (pre.consumedAt) {
      return c.html(<Verify state={{ kind: "pre_success", maskedEmail: maskEmail(pre.email) }} />);
    }
    if (Date.parse(pre.expiresAt + "Z") < Date.now()) {
      return c.html(<Verify state={{ kind: "expired", submissionId: pre.id, maskedEmail: maskEmail(pre.email) }} />);
    }
    return c.html(
      <Verify state={{ kind: "ask", submissionId: pre.id, maskedEmail: maskEmail(pre.email), pre: true }} />,
    );
  }
  // (a) Bound mode via submission id.
  const sub = await getSubmissionForVerify(c.env.DB, id);
  if (!sub) return c.html(<Verify state={{ kind: "not_found" }} />);
  if (sub.verifyState === "verified") {
    return c.html(
      <Verify state={{ kind: "already_verified", societyName: sub.societyName, societySlug: sub.societySlug }} />,
    );
  }
  const live = await findLive(c.env.DB, id);
  if (!live) {
    return c.html(<Verify state={{ kind: "expired", submissionId: id, maskedEmail: maskEmail(sub.helpContact) }} />);
  }
  return c.html(
    <Verify state={{ kind: "ask", submissionId: id, maskedEmail: maskEmail(sub.helpContact) }} />,
  );
});

// POST /verify — body: id, code. The `id` is either a submission_id (bound
// flow) OR a pre_verification_id (pre flow). When `id` is empty, fall back
// to the rl_preverify cookie (inline Step 1 form posts id="" — the cookie
// is the source of truth there).
app.post("/verify", async (c) => {
  const body = await c.req.parseBody();
  let id = String(body["id"] ?? "");
  const code = String(body["code"] ?? "").trim();
  if (id === "") {
    id = readCookie(c.req.header("Cookie"), PREVERIFY_COOKIE);
  }
  if (id === "") {
    // No id from form and no cookie either — the pre-verification session
    // expired or never existed. Send the browser back to /submit so the
    // page redraws with the verify-email button.
    if (c.req.header("HX-Request") === "true") {
      c.header("HX-Redirect", "/submit");
      return c.body(null);
    }
    return c.redirect("/submit");
  }
  if (!/^\d{6}$/.test(code)) {
    return c.html(preverifyPendingFragment("", "That doesn't look like a 6-digit code."), 422);
  }
  // Try pre first.
  const pre = await findPreById(c.env.DB, id);
  if (pre) {
    const preResult = await consumePreById(c.env.DB, id, code);
    return renderPreConsumeResult(c, preResult, pre.email);
  }
  // Fall back to bound.
  const sub = await getSubmissionForVerify(c.env.DB, id);
  if (!sub) return c.html(<Verify state={{ kind: "not_found" }} />);
  if (sub.verifyState === "verified") {
    return c.html(
      <Verify state={{ kind: "already_verified", societyName: sub.societyName, societySlug: sub.societySlug }} />,
    );
  }
  const result = await consumeByCode(c.env.DB, id, code);
  return renderConsumeResult(c, result, sub);
});

// GET /verify/:token — magic link. Tries the pre table first; on not_found
// falls back to the bound table. A pre-success here also keeps the cookie
// alive so respondAfterPersist can attach it later.
app.get("/verify/:token", async (c) => {
  const token = c.req.param("token");
  // Try pre first.
  const preResult = await consumePreByToken(c.env.DB, token);
  if (preResult.kind === "ok") {
    return c.html(<Verify state={{ kind: "pre_success", maskedEmail: maskEmail(preResult.verification.email) }} />);
  }
  if (preResult.kind === "already_consumed") {
    // Find the pre row to get the email (consumed but token still valid lookup).
    // We don't strictly need the email; show a generic already_verified page.
    return c.html(<Verify state={{ kind: "already_verified", societyName: "your report", societySlug: "" }} />);
  }
  // pre returned not_found/expired/locked. Only on not_found do we try the
  // bound table — expired/locked from a pre token should surface as-is.
  if (preResult.kind !== "not_found") {
    return c.html(<Verify state={{ kind: "not_found" }} />);
  }

  const result = await consumeByToken(c.env.DB, token);
  if (result.kind === "not_found") return c.html(<Verify state={{ kind: "not_found" }} />);
  // For success/already_consumed/expired/locked we need the submission for
  // copy. Magic-link rows always carry submission_id; look it up.
  // (already_consumed = the link was already used; treat as already_verified
  // since the same end-state applies — the submission is verified.)
  if (result.kind === "ok") {
    const sub = await getSubmissionForVerify(c.env.DB, result.verification.submissionId);
    if (!sub) return c.html(<Verify state={{ kind: "not_found" }} />);
    return c.html(
      <Verify state={{ kind: "success", societyName: sub.societyName, societySlug: sub.societySlug }} />,
    );
  }
  if (result.kind === "already_consumed") {
    // Need the submission id from the token row to look up society. We can
    // re-query email_verifications, but cheaper: consumeByToken already gave
    // us nothing — fall back to "not_found"-ish messaging via expired text.
    // In practice this is reached only when someone reloads the magic link
    // after a successful first hit, so just say "already verified" generically.
    return c.html(
      <Verify state={{ kind: "already_verified", societyName: "your report", societySlug: "" }} />,
    );
  }
  // expired / locked from a magic-link click: we don't know which submission
  // without re-querying. The user can re-trigger from /verify?id= if they
  // remember the id — but typically they'll re-submit. Show a generic expired.
  return c.html(<Verify state={{ kind: "not_found" }} />);
});

// POST /verify/resend — body: id.
app.post("/verify/resend", async (c) => {
  const body = await c.req.parseBody();
  const id = String(body["id"] ?? "");
  if (id === "") return c.redirect("/verify");
  const sub = await getSubmissionForVerify(c.env.DB, id);
  if (!sub) return c.html(<Verify state={{ kind: "not_found" }} />);
  if (sub.verifyState === "verified") {
    return c.html(
      <Verify state={{ kind: "already_verified", societyName: sub.societyName, societySlug: sub.societySlug }} />,
    );
  }
  if (sub.helpContact === "") {
    // Resend requested on a submission that has no email — should not happen
    // via the UI but handle it. Render not_found rather than expose the data.
    return c.html(<Verify state={{ kind: "not_found" }} />);
  }
  const origin = new URL(c.req.url).origin;
  c.executionCtx.waitUntil(
    triggerVerification(c.env.DB, c.env, origin, sub.id, sub.helpContact, sub.societyName),
  );
  return c.redirect(`/verify?id=${id}`);
});

// renderPreConsumeResult — pre-table variant of the POST /verify code-path
// mapper. Returns HTMX-friendly small fragments (the form is embedded inline
// on Step 1) for the non-success branches, and a full page for the success
// branch (the inline flow completes on the next /submit render via cookie).
function renderPreConsumeResult(
  c: import("hono").Context<{ Bindings: Bindings }>,
  result: Awaited<ReturnType<typeof consumePreById>>,
  email: string,
) {
  switch (result.kind) {
    case "ok":
    case "already_consumed":
      return c.html(preverifyVerifiedFragment(maskEmail(email)));
    case "expired":
      return c.html(
        preverifyNoneFragment(`That code expired. Type your email again, then click Verify email.`),
        410,
      );
    case "locked":
      return c.html(
        preverifyNoneFragment(`Too many wrong codes. Type your email again, then click Verify email.`),
        423,
      );
    case "wrong_code":
      return c.html(
        preverifyPendingFragment(
          email,
          `That code didn't match. ${result.attemptsRemaining} ${result.attemptsRemaining === 1 ? "try" : "tries"} left.`,
        ),
        422,
      );
    case "not_found":
      return c.html(preverifyNoneFragment("Verification not found — start over."), 404);
  }
}

// renderConsumeResult — shared mapper for POST /verify outcomes (code path).
function renderConsumeResult(
  c: import("hono").Context<{ Bindings: Bindings }>,
  result: Awaited<ReturnType<typeof consumeByCode>>,
  sub: { societyName: string; societySlug: string; helpContact: string; id: string },
) {
  switch (result.kind) {
    case "ok":
      return c.html(
        <Verify state={{ kind: "success", societyName: sub.societyName, societySlug: sub.societySlug }} />,
      );
    case "already_consumed":
      return c.html(
        <Verify state={{ kind: "already_verified", societyName: sub.societyName, societySlug: sub.societySlug }} />,
      );
    case "expired":
      return c.html(
        <Verify state={{ kind: "expired", submissionId: sub.id, maskedEmail: maskEmail(sub.helpContact) }} />,
      );
    case "locked":
      return c.html(
        <Verify state={{ kind: "locked", submissionId: sub.id, maskedEmail: maskEmail(sub.helpContact) }} />,
      );
    case "wrong_code":
      return c.html(
        <Verify
          state={{
            kind: "ask",
            submissionId: sub.id,
            maskedEmail: maskEmail(sub.helpContact),
            error: "That code didn't match. Double-check the email — or request a new code below.",
            attemptsRemaining: result.attemptsRemaining,
          }}
        />,
      );
    case "not_found":
      return c.html(<Verify state={{ kind: "not_found" }} />);
  }
}

// ---- SEO surface (RENT-dbimvled) ----
// robots.txt + sitemap.xml. Host-aware: only the canonical prod host is
// crawlable; staging/local/preview emit Disallow:/ (see src/lib/seo.ts).
app.get("/robots.txt", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.text(robotsTxt(origin), 200, { "Cache-Control": "public, max-age=86400" });
});

app.get("/sitemap.xml", async (c) => {
  const origin = new URL(c.req.url).origin;
  const societies = await listAll(c.env.DB);
  const xml = buildSitemap(
    origin,
    societies.map((s) => ({ slug: s.slug, lastUpdated: s.lastUpdated })),
    notesByDate().map((n) => ({ path: `/notes/${n.slug}`, lastUpdated: n.date })),
  );
  return c.body(xml, 200, {
    "Content-Type": "application/xml; charset=UTF-8",
    "Cache-Control": "public, max-age=3600",
  });
});

// ---- Proof upload (RENT-tscofnqc / RENT-ngelwosv) ----
//
// /proof/<token> serves a single-page upload form. Token is the per-
// submission single-use token issued at insert time (when helpContact was
// given but no inline upload). The ack/proof-prompt mail carries the URL;
// the success page also links to it as an "Add proof →" affordance.
//
// State machine:
//   - token unknown                       → not_found
//   - submission already has proof_upload → already_done
//   - otherwise                           → ask (form)
app.get("/proof/:token", async (c) => {
  const token = c.req.param("token");
  const sub = await getSubmissionByProofToken(c.env.DB, token);
  if (!sub) return c.html(<ProofPage state={{ kind: "not_found" }} siteKey={c.env.TURNSTILE_SITE_KEY} />);
  if (sub.hasProof) {
    return c.html(
      <ProofPage
        state={{ kind: "already_done", societyName: sub.societyName, societySlug: sub.societySlug }}
        siteKey={c.env.TURNSTILE_SITE_KEY}
      />,
    );
  }
  return c.html(
    <ProofPage state={{ kind: "ask", token, societyName: sub.societyName }} siteKey={c.env.TURNSTILE_SITE_KEY} />,
  );
});

// PROOF_MAX_REQUEST_BYTES — Content-Length cap including multipart overhead.
// 500 KB file + ~1 KB form boundary/headers. Reject anything above before
// parseBody() runs to spare CPU + bandwidth + R2 writes from malicious
// requests that ignore the client-side limit.
const PROOF_MAX_REQUEST_BYTES = 600 * 1024;
// PROOF_MAX_PER_IP_PER_DAY — successful uploads from the same client IP in
// the last 24h. Tuned to absorb a typo-retry pattern (1-2 uploads) but reject
// a sustained burst from one source.
const PROOF_MAX_PER_IP_PER_DAY = 5;

app.post("/proof/:token", async (c) => {
  const token = c.req.param("token");
  const sub = await getSubmissionByProofToken(c.env.DB, token);
  if (!sub) return c.html(<ProofPage state={{ kind: "not_found" }} siteKey={c.env.TURNSTILE_SITE_KEY} />);
  if (sub.hasProof) {
    return c.html(
      <ProofPage
        state={{ kind: "already_done", societyName: sub.societyName, societySlug: sub.societySlug }}
        siteKey={c.env.TURNSTILE_SITE_KEY}
      />,
    );
  }
  // Cheap pre-checks before reading the body — bail before parseBody pays
  // CPU/bandwidth on hostile requests.
  const clHeader = c.req.header("Content-Length");
  const cl = clHeader ? parseInt(clHeader, 10) : NaN;
  if (Number.isFinite(cl) && cl > PROOF_MAX_REQUEST_BYTES) {
    c.status(413);
    return c.html(
      <ProofPage
        state={{
          kind: "ask",
          token,
          societyName: sub.societyName,
          error: `That request is ${Math.round(cl / 1024)} KB — proof uploads are capped at 500 KB.`,
        }}
        siteKey={c.env.TURNSTILE_SITE_KEY}
      />,
    );
  }
  // Per-IP daily cap. Counts successful uploads (proof_upload_key != '')
  // from this IP in the last 24h. Cheap covering index on (ip_address,
  // created_at) — added in migration 0009.
  const clientIp = getClientIp((n) => c.req.header(n));
  if (clientIp !== "") {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);
    const row = await c.env.DB.prepare(
      `SELECT count(*) AS n FROM submissions WHERE ip_address = ? AND proof_upload_key != '' AND created_at > ?`,
    )
      .bind(clientIp, cutoff)
      .first<{ n: number }>();
    if ((row?.n ?? 0) >= PROOF_MAX_PER_IP_PER_DAY) {
      c.status(429);
      return c.html(
        <ProofPage
          state={{
            kind: "ask",
            token,
            societyName: sub.societyName,
            error: "Too many uploads from this network today. Please try again tomorrow.",
          }}
          siteKey={c.env.TURNSTILE_SITE_KEY}
        />,
      );
    }
  }
  const body = await c.req.parseBody();
  // Turnstile gate — same widget the rest of the form flow uses. No-op
  // when TURNSTILE_SECRET is unset (local dev / pre-secret staging).
  const tsOk = await verifyTurnstile(
    c.env.TURNSTILE_SECRET,
    String(body["cf-turnstile-response"] ?? ""),
    c.req.header("CF-Connecting-IP"),
  );
  if (!tsOk) {
    c.status(422);
    return c.html(
      <ProofPage
        state={{ kind: "ask", token, societyName: sub.societyName, error: TURNSTILE_ERROR }}
        siteKey={c.env.TURNSTILE_SITE_KEY}
      />,
    );
  }
  const file = body["file"];
  if (!file || typeof file === "string") {
    c.status(422);
    return c.html(
      <ProofPage
        state={{ kind: "ask", token, societyName: sub.societyName, error: "Please pick a file first." }}
        siteKey={c.env.TURNSTILE_SITE_KEY}
      />,
    );
  }
  const result = await writeProof(c.env, sub.id, file);
  if (result.kind === "no_binding") {
    // R2 not wired yet — pretend the upload landed so the contributor isn't
    // confused, but flag it server-side. Production should always have the
    // binding; this branch protects local dev.
    console.log(`[proof:no_binding] submission=${sub.id} — R2 not bound, skipping write`);
    c.status(503);
    return c.html(
      <ProofPage
        state={{
          kind: "ask",
          token,
          societyName: sub.societyName,
          error: "Uploads aren't wired up yet on this server. Please try again later.",
        }}
        siteKey={c.env.TURNSTILE_SITE_KEY}
      />,
    );
  }
  if (result.kind === "empty") {
    c.status(422);
    return c.html(
      <ProofPage
        state={{ kind: "ask", token, societyName: sub.societyName, error: "The file looks empty." }}
        siteKey={c.env.TURNSTILE_SITE_KEY}
      />,
    );
  }
  if (result.kind === "too_large") {
    c.status(413);
    return c.html(
      <ProofPage
        state={{
          kind: "ask",
          token,
          societyName: sub.societyName,
          error: `That file is ${Math.round(result.size / 1024)} KB — please compress to under 500 KB and try again.`,
        }}
        siteKey={c.env.TURNSTILE_SITE_KEY}
      />,
    );
  }
  if (result.kind === "wrong_type") {
    c.status(415);
    return c.html(
      <ProofPage
        state={{
          kind: "ask",
          token,
          societyName: sub.societyName,
          error: `That file type (${result.type}) isn't accepted. Please use JPG, PNG, WebP, HEIC, or PDF.`,
        }}
        siteKey={c.env.TURNSTILE_SITE_KEY}
      />,
    );
  }
  await markProofUploaded(c.env.DB, sub.id, result.key);
  return c.html(
    <ProofPage
      state={{ kind: "already_done", societyName: sub.societyName, societySlug: sub.societySlug }}
      siteKey={c.env.TURNSTILE_SITE_KEY}
    />,
  );
});

// ---- Static content pages ----
app.get("/about", async (c) => c.html(<About stats={await homeStats(c.env.DB)} />));

// ---- Notes (on-site blog, RENT-aruxinbc) ----
app.get("/notes", (c) => c.html(<NotesIndex notes={notesByDate()} />));
app.get("/notes/:slug", (c) => {
  const note = noteBySlug(c.req.param("slug"));
  if (!note) return c.notFound();
  return c.html(<NoteArticle note={note} />);
});

app.get("/how-it-works", async (c) => c.html(<HowItWorks stats={await homeStats(c.env.DB)} />));
app.get("/privacy", async (c) => c.html(<Privacy stats={await homeStats(c.env.DB)} />));
app.get("/terms", async (c) => c.html(<Terms stats={await homeStats(c.env.DB)} />));

// ---- Contact ----
app.get("/contact", (c) => c.html(<Contact data={emptyContact()} errors={{}} siteKey={c.env.TURNSTILE_SITE_KEY} />));

// POST /contact: validate, persist (synchronous — recoverable in admin),
// fire ntfy async (waitUntil), render success.
app.post("/contact", async (c) => {
  const body = await c.req.parseBody();
  const form = parseContact(body);
  const errs = validateContact(form);
  const tsOk = await verifyTurnstile(
    c.env.TURNSTILE_SECRET,
    String(body["cf-turnstile-response"] ?? ""),
    c.req.header("CF-Connecting-IP"),
  );
  if (!tsOk) errs.turnstile = TURNSTILE_ERROR;
  if (Object.keys(errs).length > 0) {
    c.status(422);
    return c.html(<Contact data={form} errors={errs} siteKey={c.env.TURNSTILE_SITE_KEY} />);
  }
  const sub = await insertContact(c.env.DB, form);
  c.executionCtx.waitUntil(notifyContact(c.env, sub));
  return c.html(<ContactSuccess category={form.category} />);
});

// ---- Waitlist (RENT-swwqpyth) ----
// POST /waitlist — "email me when this society has data" capture from sparse
// society pages. Returns an HTMX fragment (WaitlistInner) swapped into
// #waitlist-box. Anti-spam: honeypot `company` field (bots fill it → silent
// success) + per-IP daily cap inside joinWaitlist. No Turnstile (the sparse
// page doesn't load the widget; the honeypot + rate cap suffice for a low-
// stakes email capture).
app.post("/waitlist", async (c) => {
  const body = await c.req.parseBody();
  const email = String(body["email"] ?? "").trim();
  const slug = String(body["society_slug"] ?? "").trim();
  const name = String(body["society_name"] ?? "").trim();
  const honeypot = String(body["company"] ?? "").trim();

  // Honeypot tripped → act successful, store nothing.
  if (honeypot !== "") return c.html(<WaitlistInner slug={slug} name={name} done email={email} />);

  if (slug === "") {
    // No society context — shouldn't happen from the real form. Fail soft.
    return c.html(<WaitlistInner slug={slug} name={name} error="Something went wrong — please reload and try again." />, 422);
  }
  if (!isValidEmail(email)) {
    return c.html(<WaitlistInner slug={slug} name={name} error="Please enter a valid email address." />, 422);
  }
  const ipAddress = getClientIp((n) => c.req.header(n));
  const result = await joinWaitlist(c.env.DB, { email, societySlug: slug, societyName: name, ipAddress });
  if (result.kind === "rate_limited") {
    return c.html(
      <WaitlistInner slug={slug} name={name} error="Too many sign-ups from this network today. Try again tomorrow." />,
      429,
    );
  }
  // "added" and "already" both land here — idempotent from the user's view.
  return c.html(<WaitlistInner slug={slug} name={name} done email={email} />);
});

// Liveness probe — also confirms the D1 binding answers a trivial query.
app.get("/healthz", async (c) => {
  const row = await c.env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
  return c.json({ status: "ok", db: row?.ok === 1 });
});

export default app;
