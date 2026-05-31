-- Silent per-email spam control (RENT-okskjmao).
--
-- Server-side rate rule applied at submission-time: if the contributor's
-- help_contact has already produced more than SPAM_MAX_PER_WINDOW
-- (default 5) reports in the last SPAM_WINDOW_DAYS (default 7), the new
-- submission lands with spam_flag=1. The contributor sees the normal
-- success / verify flow — no UI signal that the report was flagged.
--
-- Downstream aggregate readers (median rent, range, report counts) MUST
-- prefer non-spam rows when computing — but degrade to spam-included
-- when a society has ONLY spam-flagged data, so a spammer-only society
-- doesn't appear blank. The helper for that read lives in
-- src/lib/spam.ts (effectiveSubmissionFilter).
--
-- Admin override path (planned, not in this migration): admins can flip
-- spam_flag back to 0 via the moderation queue, same way they currently
-- approve/reject. Until that UI lands, the flag is read-only after insert.
ALTER TABLE submissions ADD COLUMN spam_flag INTEGER NOT NULL DEFAULT 0
  CHECK (spam_flag IN (0, 1));

CREATE INDEX idx_submissions_spam_flag ON submissions (spam_flag);
CREATE INDEX idx_submissions_help_contact_created
  ON submissions (help_contact, created_at)
  WHERE help_contact <> '';
