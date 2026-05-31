-- City on societies, so the directory can scope by city as we expand beyond
-- Bengaluru. All seeded + current data is Bengaluru, so existing rows take the
-- DEFAULT (no separate backfill needed). Index is partial on published rows,
-- mirroring societies_locality_idx.
--
-- Builders stay city-agnostic for now. Tier ('A'/'B') is a city-specific
-- judgment (grade-A in Bengaluru != grade-A in Pune), so when a second city
-- launches, tier moves to a builder_city_tiers join table rather than a column
-- on builders. Until then a single global tier is correct.
--
-- seed/societies.csv carries a `city` column for documentation; 0002 stays
-- frozen (cityless) and this ALTER supplies the value. Future-city seed batches
-- use a new CSV + a migration numbered above this one — never regenerate 0002.
ALTER TABLE societies ADD COLUMN city TEXT NOT NULL DEFAULT 'Bengaluru';
CREATE INDEX societies_city_idx ON societies (city) WHERE status = 'published';
