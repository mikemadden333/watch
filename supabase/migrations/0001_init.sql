-- ============================================================
-- Watch — initial schema (Sprint 1)
-- Multi-tenant, row-level security by tenant from day one.
-- Every incident carries three clocks. The audit log is append-only.
-- Status rules are version-pinned; the version that fired is stored
-- on every status change.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- enums ----------
do $$ begin
  create type watch_status as enum ('CLEAR', 'MONITOR', 'ELEVATED', 'ALERT');
exception when duplicate_object then null; end $$;

do $$ begin
  create type watch_tier as enum ('CONFIRMED', 'CORROBORATED', 'REPORTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type watch_alert_class as enum ('LIVE', 'DATA-DAY');
exception when duplicate_object then null; end $$;

-- ---------- tenants ----------
create table if not exists tenants (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,          -- 'veritas-charter'
  name          text not null,                 -- 'Veritas Charter Schools'
  city          text not null,                 -- 'Chicago'
  rules_version text not null default 'v2.0',
  created_at    timestamptz not null default now()
);

-- ---------- campuses ----------
create table if not exists campuses (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  code              text not null,             -- 'ENG'
  name              text not null,
  address           text not null,
  lat               double precision not null,
  lon               double precision not null,
  geocode_verified  boolean not null default false,
  students          integer,
  grades            text,
  dismissal         text,                      -- '15:30' (local)
  principal         text,
  cpd_liaison       text,
  alert_ring_mi     numeric not null default 0.25,
  elevated_ring_mi  numeric not null default 0.50,
  created_at        timestamptz not null default now(),
  unique (tenant_id, code)
);

-- ---------- incidents (three clocks) ----------
create table if not exists incidents (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references tenants(id) on delete cascade,
  source            text not null,             -- 'CPD VR gumc-mgzr'
  source_record_id  text not null,             -- idempotency key for upserts
  dedupe_key        text,                      -- cross-source dedupe
  headline          text not null,
  kind              text not null,             -- 'shooting' | 'shots-fired' | 'weather-advisory'
  tier              watch_tier not null,
  lat               double precision,
  lon               double precision,
  occurred_at       timestamptz,               -- clock 1: when it happened
  published_at      timestamptz,               -- clock 2: when the source published
  detected_at       timestamptz not null default now(), -- clock 3: when Watch ingested
  victim_note       text,
  corroborating     text[] default '{}',
  note              text,
  created_at        timestamptz not null default now(),
  -- idempotent upsert target for adapters
  unique (tenant_id, source, source_record_id)
);
create index if not exists incidents_tenant_occurred_idx on incidents (tenant_id, occurred_at desc);
create index if not exists incidents_tenant_published_idx on incidents (tenant_id, published_at desc);

-- ---------- current campus status + history ----------
create table if not exists campus_status (
  campus_id      uuid primary key references campuses(id) on delete cascade,
  tenant_id      uuid not null references tenants(id) on delete cascade,
  status         watch_status not null default 'CLEAR',
  rule_id        text,                         -- 'E-2'
  rule_name      text,                         -- 'confirmed-in-ring'
  rules_version  text not null default 'v2.0',
  incident_id    uuid references incidents(id),
  detail         text,
  since          timestamptz not null default now()
);

create table if not exists campus_status_history (
  id             uuid primary key default gen_random_uuid(),
  campus_id      uuid not null references campuses(id) on delete cascade,
  tenant_id      uuid not null references tenants(id) on delete cascade,
  from_status    watch_status,
  to_status      watch_status not null,
  rule_id        text,
  rule_name      text,
  rules_version  text not null,
  incident_id    uuid references incidents(id),
  changed_at     timestamptz not null default now()
);
create index if not exists status_history_campus_idx on campus_status_history (campus_id, changed_at desc);

-- ---------- audit events (append-only) ----------
create table if not exists audit_events (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references tenants(id) on delete cascade,
  occurred_at    timestamptz not null default now(),
  type           text not null,                -- STATUS | DELIVERY | ACTION | INGEST | LOGIN | MUTE
  campus_id      uuid references campuses(id),
  event          text not null,
  evidence       text,                         -- source record id · rule id · rules version
  status_color   watch_status
);
create index if not exists audit_tenant_time_idx on audit_events (tenant_id, occurred_at desc);

-- append-only: block UPDATE and DELETE on the audit log
create or replace function watch_block_mutation() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_events is append-only; % is not permitted', tg_op;
end $$;

drop trigger if exists audit_no_update on audit_events;
create trigger audit_no_update before update or delete on audit_events
  for each row execute function watch_block_mutation();

-- ---------- source health ----------
create table if not exists source_health (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references tenants(id) on delete cascade,
  key              text not null,              -- 'cpdvr'
  label            text not null,              -- 'CPD shootings (VR)'
  last_success_at  timestamptz,
  age_label        text,                       -- '26 h · in window'
  expected_window  text,                       -- '≤48h window'
  in_window        boolean not null default true,
  state            text not null default 'ok', -- ok | warn | late
  enabled          boolean not null default true,
  unique (tenant_id, key)
);

-- ---------- playbooks + steps + completions ----------
create table if not exists playbooks (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  status      watch_status not null,           -- posture this playbook activates on
  role        text not null,                   -- 'Principal'
  author      text,
  version     text not null default 'v1.0',
  created_at  timestamptz not null default now()
);

create table if not exists playbook_steps (
  id           uuid primary key default gen_random_uuid(),
  playbook_id  uuid not null references playbooks(id) on delete cascade,
  ordinal      integer not null,
  title        text not null,
  detail       text,
  unique (playbook_id, ordinal)
);

create table if not exists action_completions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  campus_id    uuid not null references campuses(id) on delete cascade,
  step_id      uuid not null references playbook_steps(id) on delete cascade,
  actor        text not null,
  completed_at timestamptz not null default now()
);

-- ---------- alert deliveries ----------
create table if not exists alert_deliveries (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  incident_id   uuid references incidents(id),
  campus_id     uuid references campuses(id),
  status        watch_status not null,
  alert_class   watch_alert_class not null,
  channel       text not null,                 -- push | sms | email
  recipients    integer not null default 0,
  delivered_at  timestamptz not null default now(),
  quiet_hours_overridden boolean not null default false,
  provider_msg_ids text[]
);

-- ---------- accuracy ledger ----------
create table if not exists accuracy_ledger (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  metric_key    text not null,                 -- 'corroborated_to_confirmed'
  label         text not null,
  value         text not null,                 -- display value '96%'
  pct           numeric,                       -- bar fill 0-100
  window_note   text,                          -- '27 of 28 · trailing 30 d'
  computed_at   timestamptz not null default now()
);

-- ---------- rules config (versioned, per-account overridable) ----------
create table if not exists rules_config (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  version       text not null,                 -- 'v2.0'
  thresholds    jsonb not null default '{}',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (tenant_id, version)
);

-- ============================================================
-- Row-level security — tenant isolation
-- Reads are scoped to the caller's tenant_id JWT claim.
-- service_role bypasses RLS (used by adapters / seed).
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array[
    'tenants','campuses','incidents','campus_status','campus_status_history',
    'audit_events','source_health','playbooks','playbook_steps',
    'action_completions','alert_deliveries','accuracy_ledger','rules_config'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- helper: the tenant_id carried in the JWT
create or replace function watch_current_tenant() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::uuid
$$;

-- tenants: a user can read their own tenant row
drop policy if exists tenant_self_read on tenants;
create policy tenant_self_read on tenants
  for select using (id = watch_current_tenant());

-- tenant-scoped tables: read rows for your tenant
do $$
declare t text;
begin
  foreach t in array array[
    'campuses','incidents','campus_status','campus_status_history',
    'audit_events','source_health','playbooks',
    'action_completions','alert_deliveries','accuracy_ledger','rules_config'
  ] loop
    execute format('drop policy if exists %I_tenant_read on %I;', t, t);
    execute format(
      'create policy %I_tenant_read on %I for select using (tenant_id = watch_current_tenant());',
      t, t
    );
  end loop;
end $$;

-- playbook_steps is scoped through its playbook's tenant
drop policy if exists playbook_steps_tenant_read on playbook_steps;
create policy playbook_steps_tenant_read on playbook_steps
  for select using (
    exists (
      select 1 from playbooks p
      where p.id = playbook_steps.playbook_id
        and p.tenant_id = watch_current_tenant()
    )
  );
