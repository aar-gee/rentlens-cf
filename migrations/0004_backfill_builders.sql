-- Self-healing builder backfill: any published/contributor society whose
-- builder text has no matching builders row (e.g. contributor-created via the
-- admin before builder_id is wired into that flow) gets a builder row (tier ''
-- = non-A, searchable but not featured) and is linked. Idempotent: INSERT OR
-- IGNORE on the unique name, and only NULL builder_ids are updated. No-op when
-- every society already matches.
INSERT OR IGNORE INTO builders (id, name, slug, tier)
SELECT lower(hex(randomblob(5))),
       builder,
       lower(replace(replace(replace(builder, ' ', '-'), '.', ''), '&', 'and')),
       ''
FROM societies
WHERE builder_id IS NULL AND TRIM(builder) <> '';

UPDATE societies
SET builder_id = (SELECT id FROM builders WHERE builders.name = societies.builder)
WHERE builder_id IS NULL AND TRIM(builder) <> '';
