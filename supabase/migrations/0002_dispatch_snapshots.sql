-- ============================================================
-- Watch — dispatch snapshot archive (Dallas pack)
-- Dallas PD Active Calls (9fxf-t2tr) is a live-only feed that keeps
-- NO history. We archive every poll verbatim so history can be
-- reconstructed and dispatch calls matched to the daily confirmed
-- incident record later.
-- ============================================================

create table if not exists dispatch_snapshots (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  source       text not null,               -- 'Dallas PD active calls 9fxf-t2tr'
  captured_at  timestamptz not null default now(),
  record_count integer not null default 0,
  payload      jsonb not null,              -- full snapshot as returned
  created_at   timestamptz not null default now()
);
create index if not exists dispatch_snapshots_tenant_time_idx
  on dispatch_snapshots (tenant_id, captured_at desc);

alter table dispatch_snapshots enable row level security;

drop policy if exists dispatch_snapshots_tenant_read on dispatch_snapshots;
create policy dispatch_snapshots_tenant_read on dispatch_snapshots
  for select using (tenant_id = watch_current_tenant());
