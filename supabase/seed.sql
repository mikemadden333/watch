-- ============================================================
-- Watch — seed: Veritas Charter Schools (Chicago network)
-- CONFIG ONLY. This network runs on LIVE data — no simulated
-- incidents, statuses, audit history, or accuracy numbers are ever
-- seeded. The live adapters (CPD VR, Cook County ME, CPD crimes, NWS,
-- GDELT, local-news intelligence) populate incidents; the rules engine
-- computes campus_status; the append-only log records real events; the
-- retro-confirmation matcher builds the accuracy ledger. This file only
-- establishes account CONFIGURATION: the tenant, its campuses (real
-- coordinates + rings + quiet windows), a response playbook template,
-- and the pinned rules version.
-- Run with the service role (bypasses RLS). Idempotent on slug/codes.
-- ============================================================

-- ---------- tenant ----------
insert into tenants (slug, name, city, rules_version)
values ('veritas-charter', 'Veritas Charter Schools', 'Chicago', 'v2.0')
on conflict (slug) do update set name = excluded.name;

do $$
declare tid uuid;
begin
  select id into tid from tenants where slug = 'veritas-charter';

  -- ---------- campuses (real coordinates · rings · config) ----------
  -- School-day config (directive §7): all Chicago campuses dismiss 14:45.
  insert into campuses (tenant_id, code, name, address, lat, lon, geocode_verified, students, grades, dismissal, principal, cpd_liaison, alert_ring_mi, elevated_ring_mi) values
    (tid,'GPA','Garfield Park Academy','2900 W Madison St',41.8817,-87.6966,true,604,'K-8','14:45','M. Reyes',null,0.25,0.50),
    (tid,'ENG','Englewood Prep','6201 S Stewart Ave',41.7817,-87.6360,true,612,'K-8','14:45','A. Okafor','Sgt. Diaz · ext 4271',0.25,0.50),
    (tid,'LAW','Lawndale Prep','3600 W Douglas Blvd',41.8646,-87.7156,true,574,'6-12','14:45','D. Harris',null,0.25,0.50),
    (tid,'WPK','Washington Park HS','5620 S King Dr',41.7930,-87.6170,true,631,'9-12','14:45','J. Carter',null,0.25,0.50),
    (tid,'ROS','Roseland Collegiate','10701 S Indiana Ave',41.6949,-87.6188,true,588,'9-12','14:45','C. Bell',null,0.25,0.50),
    (tid,'GRE','Greater Grand K-8','7050 S South Chicago Ave',41.7625,-87.6150,true,598,'K-8','14:45','R. Nwosu',null,0.25,0.50)
  on conflict (tenant_id, code) do nothing;

  -- ---------- response playbook template (config, not incident data) ----------
  insert into playbooks (tenant_id, status, role, author, version)
  values (tid,'ELEVATED','Principal','ops','v3.2')
  on conflict do nothing;

  insert into playbook_steps (playbook_id, ordinal, title, detail)
  select p.id, s.ordinal, s.title, s.detail
  from playbooks p,
    (values
      (1,'Review intelligence before doors open','Briefing read · posture acknowledged'),
      (2,'Brief front-desk and security staff','Arrival supervision plan adjusted'),
      (3,'Confirm exterior doors are locked','Front, side, gym, kitchen entry · security desk verifies'),
      (4,'Adjust outdoor activities','Hold recess indoors until status clears'),
      (5,'Prepare templated parent communication (HOLD)','Fill-in-the-blank template · do not send without principal review')
    ) as s(ordinal,title,detail)
  where p.tenant_id = tid and p.version = 'v3.2'
  on conflict (playbook_id, ordinal) do nothing;

  -- ---------- rules config (pinned; overridable per account/campus) ----------
  insert into rules_config (tenant_id, version, thresholds, active)
  values (tid,'v2.0','{
    "m1OutletCount":2,"m1WindowMin":20,"e3OutletCount":3,
    "elevatedRingMi":0.5,"alertRingMi":0.25,"citizenContracted":false
  }'::jsonb, true)
  on conflict (tenant_id, version) do nothing;

end $$;
