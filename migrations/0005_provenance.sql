-- Provenance tier on societies: where a society's headline numbers come from,
-- so seeded/estimated data is honestly labeled and real resident data is
-- preferred when present. Existing rows default to 'seed' (indicative starter
-- data). Values: 'seed' (indicative bootstrap), 'estimated' (from listings /
-- asking prices), 'resident' (built from residents' actual reports).
ALTER TABLE societies ADD COLUMN provenance TEXT NOT NULL DEFAULT 'seed'
  CHECK (provenance IN ('seed', 'estimated', 'resident'));
