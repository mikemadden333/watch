-- ============================================================
-- Watch v1.1 — verifier seat
-- A named human verifies and annotates significant incidents (the
-- Watch Duty model: trust with a face on it). Schema + display only.
-- ============================================================

alter table incidents
  add column if not exists verified_by   text,        -- "M. Reese · Safety Director"
  add column if not exists verified_at   timestamptz,
  add column if not exists verifier_note text;
