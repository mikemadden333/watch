-- ============================================================
-- Watch — retro-confirmation matcher
-- When an authoritative record (CPD VR / ME) lands, the matcher links
-- earlier fast-layer signals (news, dispatch) to it by space + time.
-- The corroborated→confirmed rate and the detect→confirm gap become
-- the accuracy ledger — the integrity product. "The ledger is allowed
-- to say no."
-- ============================================================

alter table incidents
  add column if not exists retro_confirmed_by  uuid references incidents(id),
  add column if not exists retro_confirmed_at  timestamptz,
  add column if not exists retro_gap_hours     numeric,
  add column if not exists retro_distance_mi   numeric;

create index if not exists incidents_retro_idx
  on incidents (tenant_id, retro_confirmed_at);
