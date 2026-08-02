-- ============================================================
-- Watch v1.1 — Quiet windows
-- Per-campus arrival/dismissal windows. During a window, MONITOR and
-- ELEVATED notifications are HELD and delivered after the window ends;
-- only ALERT-tier breaks through. Every suppression/held delivery is
-- logged to the audit trail. "A principal running dismissal is a pilot
-- on final approach."
-- ============================================================

alter table campuses
  add column if not exists quiet_windows_enabled boolean not null default true,
  add column if not exists arrival_start   text not null default '07:00',
  add column if not exists arrival_end     text not null default '08:15',
  add column if not exists dismissal_start text not null default '14:45',
  add column if not exists dismissal_end   text not null default '15:45';

-- Held / suppressed notifications during quiet windows. ALERT never lands
-- here (it always breaks through). Append-style: rows are inserted when a
-- notice is held and updated only to mark release.
create table if not exists held_deliveries (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  campus_id    uuid not null references campuses(id) on delete cascade,
  incident_id  uuid references incidents(id),
  status       watch_status not null,          -- MONITOR | ELEVATED
  window_kind  text not null,                  -- 'arrival' | 'dismissal'
  reason       text not null,
  held_at      timestamptz not null default now(),
  release_at   timestamptz not null,           -- when the window ends
  released_at  timestamptz,                    -- when actually delivered
  delivered    boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists held_deliveries_release_idx
  on held_deliveries (tenant_id, delivered, release_at);

alter table held_deliveries enable row level security;
drop policy if exists held_deliveries_tenant_read on held_deliveries;
create policy held_deliveries_tenant_read on held_deliveries
  for select using (tenant_id = watch_current_tenant());
