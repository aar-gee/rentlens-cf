-- Per-IP spam control alongside per-email (RENT-okskjmao extension).
--
-- Stores the client IP at submission time. Cloudflare Workers receives the
-- authoritative client IP in the CF-Connecting-IP header (set by CF's edge,
-- can't be spoofed by clients). X-Forwarded-For leftmost is the fallback for
-- local dev or non-CF paths; we accept its lower trust because the production
-- path is CF.
--
-- Privacy: IPs are PII-adjacent. Stored plain-text for now (spam moderation
-- needs to read them). Retention policy lives outside the schema for now —
-- when traffic grows, a periodic purge of rows older than N days is the
-- intended path. Admin UI never shows the IP except in moderation context.
--
-- Per-IP rate threshold is more lenient than per-email (10/7d vs 5/7d)
-- because shared IPs are legitimate: family WiFi, office NAT, carrier-grade
-- NAT on IPv4, ISP CGNAT in India. False positives there would block
-- legitimate users.
ALTER TABLE submissions ADD COLUMN ip_address TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_submissions_ip_address_created
  ON submissions (ip_address, created_at)
  WHERE ip_address <> '';
