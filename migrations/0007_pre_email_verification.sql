-- Pre-submission email verification (RENT-ahstlnjb continued, user feedback
-- 2026-05-30). A contributor can click "Verify email" on Step 1 BEFORE the
-- submission row exists. We need a place to park (email + code + token + TTL
-- + attempts) without a submission_id. Two-table design instead of making
-- email_verifications.submission_id nullable, because SQLite doesn't support
-- changing column nullability via ALTER and rebuilding the existing table
-- midway through a feature ship has more blast radius than adding a sibling.
--
-- Lifecycle:
--   1. POST /email/verify-now creates a row here. Cookie rl_preverify=<id>
--      pins it to the browser.
--   2. /verify/<token> or POST /verify (code-entry) marks consumed_at.
--   3. On final submit (Step 3 or Step 1 skip), respondAfterPersist looks up
--      the cookie's row; if consumed AND email matches the submission's
--      helpContact, the submission's verify_state is set to 'verified' and
--      linked_submission_id is filled in here for audit. The pre-row is NOT
--      copied into email_verifications — that table stays for post-submit
--      bound verifications (e.g. resends after a submission exists).
--
-- attempts + 5-strike lock + 30min TTL + 60s resend cooldown all mirror the
-- post-submit verification semantics in src/lib/verify.ts.

CREATE TABLE pre_email_verifications (
    id                    TEXT PRIMARY KEY,
    email                 TEXT NOT NULL,
    code                  TEXT NOT NULL,
    token                 TEXT NOT NULL UNIQUE,
    created_at            TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at            TEXT NOT NULL,
    consumed_at           TEXT,
    attempts              INTEGER NOT NULL DEFAULT 0,
    -- Set when the pre-verification gets attached to a real submission at
    -- final-submit time (informational; the submission carries verify_state).
    linked_submission_id  TEXT REFERENCES submissions (id) ON DELETE SET NULL
);

CREATE INDEX idx_pre_email_verifications_email ON pre_email_verifications (email);
CREATE INDEX idx_pre_email_verifications_linked ON pre_email_verifications (linked_submission_id);
