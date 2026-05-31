-- Optional rental-agreement proof upload (RENT-tscofnqc / RENT-ngelwosv).
--
-- proof_upload_key: R2 object key (e.g. "proofs/abc12345/a1b2c3.jpg") when
-- the contributor uploaded a doc — either inline on Step 1 or later via
-- the /proof/<token> page. Empty means no proof yet.
--
-- proof_upload_token: single-use token for the late-upload path. Set at
-- submission insert time IF the submitter provided an email; the ack /
-- proof-prompt mail carries a link to /proof/<token>. Cleared once a
-- successful upload lands. Token is a fresh UUID (no expiry for v1; we
-- can shorten the window later if abuse surfaces).
ALTER TABLE submissions ADD COLUMN proof_upload_key TEXT NOT NULL DEFAULT '';
ALTER TABLE submissions ADD COLUMN proof_upload_token TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_submissions_proof_token
  ON submissions (proof_upload_token)
  WHERE proof_upload_token <> '';
