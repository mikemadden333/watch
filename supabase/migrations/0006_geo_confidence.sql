-- 0006 · geo_confidence on incidents
-- Location precision, for the integrity gate. Only 'exact'/'block' rows are
-- ring-eligible in the rules engine; 'neighborhood'/'city' rows surface as
-- briefing context but never drive a distance-ring status and never map.
--   exact        — a real point from an authoritative feed (default)
--   block        — a geocoded block / cross-street (precise enough for a ring)
--   neighborhood — a community-area centroid (coarse; context only)
--   city         — no location at all (network scope)

alter table incidents
  add column if not exists geo_confidence text
    check (geo_confidence in ('exact', 'block', 'neighborhood', 'city'));

comment on column incidents.geo_confidence is
  'Location precision. Only exact/block are ring-eligible (rules integrity gate).';
