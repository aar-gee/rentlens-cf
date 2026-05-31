# RentLens — Data Agent Guide

The core guide for agents doing **data work** on RentLens: seeding, the builders
roster, rent data, provenance, migrations, and release versioning. This is NOT a
feature/UI guide — server rendering, routes, search, pagination, and admin views
are out of scope here (see `CLAUDE.md` for engineering practices and the code
itself). Read `CLAUDE.md` (engineering contract) and `README.md` (data/seeding/
DB-population model) first; this file is the data-specific layer on top.

Decision log lives in memory: `seed-trust-decisions.md`. fp epic: `RENT-vuidxkts`.

---

## 1. The data model

| Table | What it holds | Notes for data work |
|---|---|---|
| `societies` | Canonical catalog: headline `median_rent_2bhk`/`3bhk` + `range_*`, `locality`, `city`, `provenance`, `report_count`, `builder_id` | **No maintenance/deposit columns** — those live in `rent_observations`. |
| `builders` + `builder_aliases` | Curated roster: `tier` ('A' featured / 'B' searchable / ''), `website_url`, `logo_url`, `delivery_risk`, `risk_note`. Aliases resolve old/renamed names. | Roster is a **trust decision**, never auto-generated. |
| `rent_observations` | Per (society, BHK) asking snapshot: asking low/median/high, `maintenance_monthly`, `deposit_months`, `listings_basis`, `confidence`, `sources`, `provenance` | The substrate for grounded rent + the future CSE feeder + (conceptually) resident aggregates. |
| `submissions` | Resident reports. `status` pending/published/rejected, `spam_flag`, `monthly_rent`, `bhk`, `society_slug` | Only `published` + `spam_flag=0` count toward aggregates. |

**Provenance tiers** (the trust contract — `migrations/0005`): `seed` (indicative
bootstrap we guessed), `estimated` (from listings / asking prices), `resident`
(built from real resident reports). The UI labels each honestly; never inflate a
tier.

---

## 2. How data reaches each environment (read this before touching data)

- Catalog data lives in `seed/*.csv`. **CSVs never leave your machine.** They are
  build-time inputs to generators that emit **committed migration SQL**; the
  migrations carry the data. `wrangler d1 migrations apply` populates each DB.
- **Never load a CSV into staging/prod.** Migrations are the only path.
- **Migrations are append-only**, numbered `NNNN_*.sql`, never edited after applied
  anywhere. To change seeded data, write a *new* migration.
- **Committed generator output is the source of truth.** Generators mint random
  short IDs, so re-running produces *different* IDs — regenerate only when the CSV
  changes, and never regenerate a migration that's already applied.
- Make new seed migrations **re-apply-safe**: `INSERT ... ON CONFLICT DO UPDATE`
  (upsert), `INSERT OR IGNORE`, `ALTER ... DEFAULT`. Prod is never re-seeded
  (`0002` is already in its `d1_migrations`).

Generators (all build-time, NOT shipped to the Worker):
- `seed/gen-seed.ts` → `0002_seed_societies.sql` (historical; the 36-society seed)
- `seed/gen-builders.ts` → `0003_builders.sql` (**historical**; superseded as roster authority)
- `seed/gen-builders-roster.ts` ← `seed/builders.csv` → `0012_builders_roster.sql` (current roster authority)
- `seed/gen-rent-observations.ts` ← `seed/rent-observations.csv` → `0014_rent_observations.sql`

---

## 3. Builders roster — curation is the product

- **Inclusion rule:** ≥2 residential projects in the target city + brand-grade
  reputation. Tier A = featured on the homepage; tier B = searchable, not featured.
- **Validated by web research** (RERA registry, listing portals, trade press) — not
  from memory. The roster is `seed/builders.csv`.
- **NEVER auto-add builders.** The discovery scraper (RENT-dqfzfbeq) must not. We
  deliberately excluded distressed/disputed builders; auto-adding would reintroduce
  exactly what curation removed.
- Standing decisions (don't silently undo): **Mantri Developers** demoted A→B with
  `delivery_risk=1` (NCLT insolvency + KRERA orders); **Ozone Group** excluded
  (active CCB FIR); **Salarpuria Sattva → Sattva Group** rename (alias kept).
- **Tier is city-specific.** Builders are global with one tier today; a second city
  moves tier to a `builder_city_tiers` join table rather than a column on builders.
- New builders post-launch go in via the **admin UI** (`createBuilder`) or a new
  migration — not by regenerating `0012`.

---

## 4. Rent data — asking-derived, honestly labeled

- **Pipeline (the "research harness"):** fan out Sonnet research agents over listing
  portals (99acres, NoBroker, MagicBricks, Housing.com, CommonFloor, SquareYards),
  one focused agent per society, with a **strict output schema** (asking low/median/
  high + maintenance + deposit + listings_basis + confidence + sources per BHK).
  Compile into `seed/rent-observations.csv`. The Google-CSE automated feeder is the
  future version (RENT-dqfzfbeq) and sinks into the same `rent_observations` table.
- **Asking ≠ resident-paid.** Seeded rents are `provenance='estimated'` ("Estimated
  from current listings"). **Never fabricate "what residents pay"** — that only comes
  from real submissions. The spread (low–high) carries the uncertainty; don't invent
  false precision.
- **One aggregate range per (society, BHK).** Furnishing is folded into the range and
  noted (semi-furnished is the Bengaluru default); we do NOT seed per-furnishing rows.
- **The research is also a data-integrity audit.** It reliably surfaces:
  - **Fabricated configs** — e.g. a seeded 2BHK on a villa/3BHK-only society. NULL the
    fabricated config (10 societies were corrected this way).
  - **Mislocated / misnamed societies** — e.g. "Salarpuria Sattva Magnus" didn't exist
    in Bengaluru (it's a Hyderabad project) → renamed to **Sattva Magnificia**
    (Mahadevapura); "Prestige Sunrise Park" was in **Electronics City Ph1**, not
    Bellandur. Always verify a society's existence + config before trusting the seed.
- Slug renames: rely on FK `ON UPDATE CASCADE` (submissions, rent_observations), add a
  **301** via `SLUG_REDIRECTS` in `src/index.tsx`, and keep the old name as an alias.

---

## 5. Provenance promotion — resident data flowing in

- Path: `seed` → `estimated` (listings) → `resident` (real reports).
- Mechanism: an admin **publishes** a submission → `publishSubmission` (moderation.ts)
  → `recomputeSocietyFromSubmissions` (`src/data/aggregate.ts`) rebuilds the society's
  per-BHK medians/ranges + `report_count` from PUBLISHED, non-spam reports and flips
  `provenance='resident'` once count ≥ `RESIDENT_THRESHOLD` (currently **3**, tunable).
- **Below threshold it's a no-op** — a stray report must not override the listings
  estimate or let us claim "resident-reported".
- Detail pages are D1-backed, so resident provenance unlocks the real
  "what residents pay" variant automatically.

---

## 6. Versioning + CHANGELOG cadence — DO THIS EVERY PRODUCTION RELEASE

This was being skipped: `[Unreleased]` accumulated across multiple prod deploys
without a version being cut. **Don't.** The process (also in `CLAUDE.md` §4) is the
**last step of every prod deploy**, not optional:

1. Move `## [Unreleased]` items under `## [vX.Y.Z] — YYYY-MM-DD`.
2. `git commit -m "chore: release vX.Y.Z"`.
3. `git tag vX.Y.Z && git push --tags`.
4. `gh release create vX.Y.Z --title … --notes …` (quote the changelog entry).

SemVer-ish (pre-1.0, loose but consistent): **major** = breaking schema/URL change,
**minor** = new user-facing feature, **patch** = fix/copy. Tag history is the record
of what's actually in prod — keep it honest. (Current: `v0.1.0`, 2026-05-30.)

---

## 7. Invariants & gotchas

- `report_count`: `src/data/stats.ts` uses `SUM(report_count)` as the homepage's
  "estimated points" and `COUNT(non-spam submissions)` as "actual points". Don't
  repurpose `report_count` without checking that counter.
- `societies` has **no maintenance/deposit columns** — read/write those via
  `rent_observations` (`societyRentMeta`).
- Don't re-seed prod (dupes). Staging is freely re-seedable.
- Discovery scraper scope (RENT-dqfzfbeq): rent-range **enrichment of existing,
  occupied societies** via a review queue. Never adds builders; never auto-publishes.
- City scope is Bengaluru today (`societies.city`); a new city = new seed CSV + new
  migration, never a regenerate of `0002`.

## Pointers

- `CLAUDE.md` — engineering contract, deploy ladder, fp rules. `README.md` — data/
  seeding/DB-population. `HANDOFF.md` — product + brand. `CHANGELOG.md` — releases.
- Generators: `seed/*.ts`. Migrations: `migrations/`. Aggregation: `src/data/aggregate.ts`.
- Memory: `seed-trust-decisions.md`. fp epics: `RENT-vuidxkts` (seed & trust),
  `RENT-dqfzfbeq` (discovery), `RENT-tbhkjjfy` (honesty pipeline).
