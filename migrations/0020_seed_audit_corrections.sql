-- 0020: data-integrity corrections to the original seed catalog (the un-audited
-- rows DATA_AGENT.md §4 warned about). Hand-written UPDATEs on existing live rows
-- — NOT generated, NOT INSERT (these societies already exist on prod). Idempotent /
-- re-apply-safe (UPDATEs to fixed values; the locality slugs are unchanged so no
-- URL/redirect impact).
--
-- Found by an adversarial web audit (builder sites, RERA, listing portals) of the
-- original 36 seed societies, 2026-06.

-- Locality corrections (society real + correctly attributed, locality wrong).
-- adarsh-park-heights: marketed "near Sarjapur Road" but actually in Gunjur (Varthur Road).
UPDATE societies SET locality = 'Gunjur' WHERE slug = 'adarsh-park-heights';
-- prestige-misty-waters: actually Hebbal (Hebbal Kempapura / Nagavara), not Thanisandra.
UPDATE societies SET locality = 'Hebbal' WHERE slug = 'prestige-misty-waters';
-- divyasree-77-place: actually Yemalur (off Old Airport Road / Kodbisanhalli), not Marathahalli.
UPDATE societies SET locality = 'Yemalur' WHERE slug = 'divyasree-77-place';
-- salarpuria-greenage: on Hosur Road in Bommanahalli; HSR Layout is only the nearby area.
UPDATE societies SET locality = 'Bommanahalli' WHERE slug = 'salarpuria-greenage';

-- Fabricated config: total-environment-after-the-rain is a 4BHK earth-sheltered
-- VILLA project (no 3BHK exists). The seeded 3BHK median (~2L) is mislabeled and a
-- huge outlier; NULL it. societies has no 4BHK column, so this leaves the row with no
-- headline rent (honest — we have no genuine 2/3BHK figure for it). Flagged for a
-- follow-up keep-as-villa / relabel / remove decision.
UPDATE societies
SET median_rent_3bhk = NULL, range_3bhk_low = NULL, range_3bhk_high = NULL
WHERE slug = 'total-environment-after-the-rain';
