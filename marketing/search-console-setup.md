# Google Search Console setup — rentlens.fyi

One-time setup so Google crawls the site and you can watch how it ranks. You do
this (it needs your Google account + a DNS change); takes ~10 min plus crawl
wait. rentlens.fyi is on Cloudflare, so the cleanest path is a **Domain**
property verified by a **DNS TXT record**.

## Part A — Add + verify the property

1. Go to **https://search.google.com/search-console** and sign in with the
   Google account you want to own this.
2. If it's your first property, you'll see a "Welcome" screen with two boxes:
   **Domain** and **URL prefix**. Pick **Domain** (left box). Otherwise click
   the property dropdown (top-left) → **Add property** → **Domain**.
3. Type `rentlens.fyi` (no https://, no www) → **Continue**.
4. Google shows a **TXT record** to add to DNS — a string like
   `google-site-verification=AbC123...`. Click **Copy**. Leave this tab open.
5. In a new tab, open the **Cloudflare dashboard** → select the `rentlens.fyi`
   zone → **DNS** → **Records** → **Add record**:
   - **Type:** `TXT`
   - **Name:** `@`  (means the root, rentlens.fyi)
   - **Content:** paste the `google-site-verification=...` value
   - **TTL:** Auto
   - **Proxy status:** N/A (TXT records aren't proxied)
   - **Save**
6. Back in the Search Console tab, click **Verify**. Cloudflare DNS usually
   propagates in seconds–minutes; if it says "not found," wait a few minutes and
   click Verify again. Once it succeeds you can delete nothing — leave the TXT
   record in place (removing it un-verifies you).

> Alternative if you'd rather not touch DNS: tell me and I'll wire a Search
> Console **HTML meta-tag** into the site `<head>` (one-line code change I can
> deploy), then you pick **URL prefix** → `https://rentlens.fyi/` and verify by
> "HTML tag." Downside: only covers that exact prefix, not www/other variants.
> DNS Domain verification is better; use the meta tag only if DNS is a hassle.

## Part B — Submit the sitemap

7. In the left sidebar, click **Sitemaps**.
8. Under "Add a new sitemap," the domain is prefilled (`https://rentlens.fyi/`).
   In the box type just `sitemap.xml` → **Submit**.
9. Status should move to **Success** within a few minutes (it'll show the
   discovered URL count — should be ~48). Google now crawls every society page
   plus /about, /notes, /societies on its own schedule.

## Part C — Nudge the homepage + first checks (optional)

10. Top search bar → **URL Inspection** → paste `https://rentlens.fyi/` →
    Enter. When it loads, click **Request Indexing** to push the homepage to the
    front of the crawl queue. (You can do this for a handful of key pages; it's
    rate-limited, so don't try to do all 48.)
11. Come back in **3–7 days** and check:
    - **Pages** (left nav) — how many URLs are indexed vs. excluded, and the
      reason for any exclusions. Thin seed-data society pages *may* get parked as
      "Crawled – currently not indexed"; that resolves as they gain real reports.
    - **Performance** — once you have impressions, this shows which queries
      surface you, clicks, and average position. This is your SEO scoreboard.

## Notes

- Indexing is not instant — expect days-to-weeks for pages to appear in results.
  Submitting the sitemap just makes discovery fast and complete; ranking still
  takes time and content depth.
- Staging (`rentlens-staging.rg-labs.workers.dev`) serves `robots: Disallow: /`,
  so never add it as a property — it's intentionally invisible to search.
- If you later pull the site back to noindex, the `isIndexableHost` flip in
  `src/lib/seo.ts` handles robots; you'd also remove the sitemap in Search
  Console.

---

# Bing Webmaster Tools — rentlens.fyi

Bing's index also feeds DuckDuckGo, Yahoo, and ChatGPT/Copilot search, so it's
worth the few minutes. Status: DONE (2026-05-31).

## Part A — Add + verify (easiest: import from Google)

1. Go to **https://www.bing.com/webmasters** and sign in with a Microsoft
   account.
2. On "Add your site," choose **Import from Google Search Console** (not "Add
   manually") → authorize the Google connection. Bing pulls in `rentlens.fyi`
   already verified plus the submitted sitemap — no DNS/meta steps.
3. (Manual alternative: "Add a site" → `https://rentlens.fyi` → verify via the
   same DNS TXT method as Google → **Sitemaps** → submit `sitemap.xml`.)

## Part B — IndexNow via Cloudflare Crawler Hints (instant re-crawls)

IndexNow pushes new/changed URLs to Bing + Yandex immediately instead of waiting
for a crawl. Cloudflare has it built in:

4. Cloudflare dashboard → `rentlens.fyi` zone → **Caching** → **Configuration**
   → toggle on **Crawler Hints**. Cloudflare then auto-notifies Bing via
   IndexNow whenever content changes — new society pages and notes get picked up
   fast, zero ongoing effort.

