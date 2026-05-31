-- 0016: fix the stale description on the renamed Sattva Magnificia. The 0015
-- rename carried over the old fabricated-Magnus blurb ("high-rise off ITPL Main
-- Road"); replace it with the real project's description (Old Madras Road,
-- Mahadevapura; ultra-luxury 3/4 BHK).
UPDATE societies
SET description = 'Ultra-luxury Sattva Group community on Old Madras Road, Mahadevapura, with large 3 and 4 BHK residences.'
WHERE slug = 'sattva-magnificia';
