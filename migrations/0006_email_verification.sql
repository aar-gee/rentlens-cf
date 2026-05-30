-- Email verification for submissions (RENT-ahstlnjb).
--
-- A submission's `help_contact` is optional (only collected when the contributor
-- ticks "willing to help"). When provided, we send a single email containing
-- BOTH a magic link and a 6-digit code; the contributor uses whichever they
-- prefer. Verified status is a reputation / weighting signal — it does NOT
-- gate the submission entering the moderation queue (that's `status` above,
-- which stays the moderation axis: pending → published / rejected).
--
-- verify_state: orthogonal to status.
--   'unverified' — no email given, or email given but link/code not yet used.
--   'verified'   — link clicked or code entered before expiry.
-- Once verified, a downstream consumer (weighting / featured / 'help future
-- renters' intro) may treat the row as higher-trust. That logic lives outside
-- this migration.

ALTER TABLE submissions ADD COLUMN verify_state TEXT NOT NULL DEFAULT 'unverified'
  CHECK (verify_state IN ('unverified', 'verified'));
ALTER TABLE submissions ADD COLUMN verified_at TEXT;

-- Per-submission verification challenge. One submission can spawn multiple
-- rows over its lifetime (resend), but only the latest non-consumed-non-expired
-- one is "live". `token` is the magic-link path component; `code` is the
-- 6-digit shown in the same email (kept as TEXT so leading zeros survive).
--
-- attempts counts wrong-code submissions; we lock at 5 by forcing a resend.
-- consumed_at is set on success; the row is then dead even if not expired.
CREATE TABLE email_verifications (
    id            TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES submissions (id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    code          TEXT NOT NULL,
    token         TEXT NOT NULL UNIQUE,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at    TEXT NOT NULL,
    consumed_at   TEXT,
    attempts      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_email_verifications_submission ON email_verifications (submission_id);
CREATE INDEX idx_email_verifications_email      ON email_verifications (email);
