-- Society waitlist (RENT-swwqpyth). Captures "email me when this society has
-- data" interest from sparse society pages, so demand for not-yet-covered
-- societies is visible + actionable (admin can notify subscribers when a
-- society crosses into having real reports).
--
-- Privacy: emails are PII. Stored to deliver the one notification the user
-- asked for; admin reads them only in the waitlist moderation view. Same
-- retention posture as ip_address (see 0009) — periodic purge is the intended
-- path once volume grows.
CREATE TABLE waitlist (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL,
  society_slug  TEXT NOT NULL,
  society_name  TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  notified_at   TEXT,                       -- set when the "now has data" mail is sent
  ip_address    TEXT NOT NULL DEFAULT ''
);

-- Dedup: one row per (email, society). A repeat signup is a no-op upsert.
CREATE UNIQUE INDEX idx_waitlist_email_society ON waitlist (email, society_slug);

-- Admin grouping by society + "who hasn't been notified yet" lookups.
CREATE INDEX idx_waitlist_society ON waitlist (society_slug);

-- Per-IP rate limiting (mirrors submissions' ip+created index).
CREATE INDEX idx_waitlist_ip_created ON waitlist (ip_address, created_at) WHERE ip_address <> '';
