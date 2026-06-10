-- 0017: remove two low-quality contributor-created societies and their full
-- footprint, per admin review (thin pages with no usable data, surfaced in
-- Search Console as discovered-not-indexed):
--   mc-fortune ("MC FORTUNE", builder "MC Builders") and
--   millennium-habitat ("Millennium Habitat").
-- Both arrived via the submit flow (each with one still-pending report) and are
-- prod-only — so this is a no-op on local/staging. Deletes go children-first to
-- respect FKs: submissions + pending_societies, then the societies, then the
-- now-orphaned contributor builder "MC Builders" (used by nothing else).
DELETE FROM submissions       WHERE society_slug     IN ('mc-fortune', 'millennium-habitat');
DELETE FROM pending_societies WHERE merged_into_slug IN ('mc-fortune', 'millennium-habitat');
DELETE FROM societies         WHERE slug             IN ('mc-fortune', 'millennium-habitat');
DELETE FROM builders WHERE name = 'MC Builders'
  AND NOT EXISTS (SELECT 1 FROM societies s WHERE s.builder_id = builders.id);
