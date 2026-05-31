-- 0015: correct the two mis-seeded societies flagged in 0014 (research-verified,
-- RENT-dqfzfbeq). Supersedes the EXISTENCE FLAGS comment in 0014.
--
--  1. "Salarpuria Sattva Magnus" did NOT exist in Bengaluru (only Hyderabad).
--     The intended project is Sattva Magnificia (Old Madras Road, Mahadevapura).
--     Rename + relocate + grounded asking rent. Slug change cascades to
--     submissions + rent_observations (both ON UPDATE CASCADE). Old name kept
--     as a society alias; old slug is 301-redirected in the worker route.
--  2. "Prestige Sunrise Park" is real but in Electronics City Phase 1, not
--     Bellandur. Locality fix + grounded asking rent. Slug/name unchanged.
--
-- Rents are asking-derived (provenance 'estimated'), not resident-paid.

-- ---- 1. Sattva Magnificia (rename + relocate; ultra-luxury, no 2BHK) ----
INSERT OR IGNORE INTO society_aliases (id, society_id, alias)
  SELECT lower(hex(randomblob(5))), id, 'Salarpuria Sattva Magnus'
  FROM societies WHERE slug = 'salarpuria-sattva-magnus';

UPDATE societies SET
  slug = 'sattva-magnificia',
  name = 'Sattva Magnificia',
  locality = 'Mahadevapura',
  median_rent_2bhk = NULL, range_2bhk_low = NULL, range_2bhk_high = NULL,
  median_rent_3bhk = 100000, range_3bhk_low = 90000, range_3bhk_high = 120000,
  provenance = 'estimated', last_updated = '2026-05-31T00:00:00Z'
WHERE slug = 'salarpuria-sattva-magnus';

INSERT INTO rent_observations (id, society_slug, bhk, asking_low, asking_median, asking_high, maintenance_monthly, deposit_months, listings_basis, confidence, observed_on, sources, note)
VALUES (lower(hex(randomblob(5))), 'sattva-magnificia', '3BHK', 90000, 100000, 120000, 11000, 6, 3, 'low', '2026-05',
  'https://www.nobroker.in/flats-for-rent-in-salarpuria_sattva_magnificia_pai_layout_mahadevapura_bangalore;https://www.99acres.com/salarpuria-sattva-magnificia-for-rent-in-old-madras-road-bangalore-east-46280-rnpffid',
  'Renamed from mis-seeded "Salarpuria Sattva Magnus" (a Hyderabad project). Ultra-luxury, mostly 4BHK; thin 3BHK inventory. 4BHK ask ~1.1-1.5L. NO 2BHK.');

-- ---- 2. Prestige Sunrise Park (locality fix + grounded rent) ----
UPDATE societies SET
  locality = 'Electronics City Phase 1',
  median_rent_2bhk = 45000, range_2bhk_low = 38000, range_2bhk_high = 70000,
  median_rent_3bhk = 55000, range_3bhk_low = 45000, range_3bhk_high = 65000,
  provenance = 'estimated', last_updated = '2026-05-31T00:00:00Z'
WHERE slug = 'prestige-sunrise-park';

INSERT INTO rent_observations (id, society_slug, bhk, asking_low, asking_median, asking_high, maintenance_monthly, deposit_months, listings_basis, confidence, observed_on, sources, note)
VALUES (lower(hex(randomblob(5))), 'prestige-sunrise-park', '2BHK', 38000, 45000, 70000, 6000, 3, 10, 'medium', '2026-05',
  'https://www.nobroker.in/2bhk-flats-for-rent-near-prestige_sunrise_park_birchwood_bangalore;https://www.99acres.com/prestige-sunrise-park-for-rent-in-electronics-city-phase-1-bangalore-south-21930-rnpffid',
  'Locality corrected to Electronics City Ph1 (seed said Bellandur). Large township; furnishing spread 38k-70k.');
INSERT INTO rent_observations (id, society_slug, bhk, asking_low, asking_median, asking_high, maintenance_monthly, deposit_months, listings_basis, confidence, observed_on, sources, note)
VALUES (lower(hex(randomblob(5))), 'prestige-sunrise-park', '3BHK', 45000, 55000, 65000, 7000, 3, 10, 'medium', '2026-05',
  'https://www.nobroker.in/3bhk-flats-for-rent-near-prestige_sunrise_park_birchwood_bangalore;https://www.squareyards.com/rent/property-for-rent-in-prestige-sunrise-park-bangalore',
  'Semi-furnished cluster 50-57k; fully furnished to 65k.');
