-- ============================================================
-- Watch — seed: Veritas Charter Schools (Chicago pilot)
-- The demo spine. Mirrors src/lib/data/chicago.ts.
-- Run with the service role (bypasses RLS). Idempotent on slug/codes.
-- ============================================================

-- ---------- tenant ----------
insert into tenants (slug, name, city, rules_version)
values ('veritas-charter', 'Veritas Charter Schools', 'Chicago', 'v2.0')
on conflict (slug) do update set name = excluded.name;

-- capture tenant id
do $$
declare tid uuid;
begin
  select id into tid from tenants where slug = 'veritas-charter';

  -- ---------- campuses ----------
  insert into campuses (tenant_id, code, name, address, lat, lon, geocode_verified, students, grades, dismissal, principal, cpd_liaison, alert_ring_mi, elevated_ring_mi) values
    (tid,'ENG','Englewood Prep','6201 S Stewart Ave',41.7817,-87.6360,true,612,'K-8','15:30','A. Okafor','Sgt. Diaz · ext 4271',0.25,0.50),
    (tid,'WDL','Woodlawn Academy','6357 S Woodlawn Ave',41.7785,-87.5965,true,588,'6-12','15:45','T. Boyd',null,0.25,0.50),
    (tid,'HYP','Hyde Park Lower','5235 S Kenwood Ave',41.7994,-87.5928,true,604,'K-5','15:15','S. Ruiz',null,0.25,0.40),
    (tid,'BRZ','Bronzeville Middle','4644 S King Dr',41.8090,-87.6160,true,566,'6-8','15:30','M. Ellison',null,0.25,0.50),
    (tid,'WPK','Washington Park HS','5620 S King Dr',41.7930,-87.6170,true,631,'9-12','15:40','J. Carter',null,0.25,0.50),
    (tid,'GRE','Greater Grand K-8','7050 S South Chicago Ave',41.7625,-87.6150,true,598,'K-8','15:20','R. Nwosu',null,0.25,0.50)
  on conflict (tenant_id, code) do nothing;

  -- ---------- incidents (three clocks) ----------
  insert into incidents (tenant_id, source, source_record_id, headline, kind, tier, lat, lon, occurred_at, published_at, victim_note, corroborating, note) values
    (tid,'CPD VR gumc-mgzr','gumc-mgzr:2026-08-01:0347','Confirmed shooting · 63rd & Halsted block','shooting','CONFIRMED',41.78487,-87.63174,'2026-07-31T21:47:00-05:00','2026-08-01T06:40:00-05:00','1 victim, non-fatal',array['Block Club Chicago','GDELT'],null),
    (tid,'News ×2','news:65th-cottage-grove:0633','Corroborated · shots-fired report, 65th & Cottage Grove','shots-fired','CORROBORATED',41.77213,-87.5965,'2026-08-01T05:35:00-05:00','2026-08-01T06:33:00-05:00',null,array['News ×2','GDELT'],'awaiting CPD record'),
    (tid,'CPD VR gumc-mgzr','gumc-mgzr:2026-07-29:0288','Confirmed shooting · 62nd & Morgan block','shooting','CONFIRMED',41.7776,-87.6415,'2026-07-28T23:12:00-05:00','2026-07-29T06:45:00-05:00','1 victim, non-fatal',array[]::text[],'prior data day · logged'),
    (tid,'CPD VR gumc-mgzr','gumc-mgzr:2026-08-01:0351','Confirmed shooting · 71st & Racine block','shooting','CONFIRMED',41.7647,-87.6539,'2026-07-31T22:30:00-05:00','2026-08-01T06:40:00-05:00','1 victim',array[]::text[],'outside all rings, logged'),
    (tid,'NWS live','nws:IL-heat-advisory:20260801','NWS · Heat Advisory, Cook County','weather-advisory','CONFIRMED',41.8000,-87.6200,'2026-08-01T05:58:00-05:00','2026-08-01T05:58:00-05:00',null,array[]::text[],'11:00–19:00 · outdoor activity guidance applies to all campuses')
  on conflict (tenant_id, source, source_record_id) do nothing;

  -- ---------- current campus status (morning posture) ----------
  insert into campus_status (campus_id, tenant_id, status, rule_id, rule_name, rules_version, incident_id, detail, since)
  select c.id, tid,
    case c.code when 'ENG' then 'ELEVATED'::watch_status when 'WDL' then 'MONITOR'::watch_status else 'CLEAR'::watch_status end,
    case c.code when 'ENG' then 'E-2' when 'WDL' then 'M-1' else null end,
    case c.code when 'ENG' then 'confirmed-in-ring' when 'WDL' then 'two-outlet-corroboration' else null end,
    'v2.0',
    case c.code when 'ENG' then (select id from incidents where source_record_id='gumc-mgzr:2026-08-01:0347')
                when 'WDL' then (select id from incidents where source_record_id='news:65th-cottage-grove:0633') else null end,
    case c.code when 'ENG' then 'Confirmed shooting · morning posture' when 'WDL' then 'Corroborated news · unconfirmed' else 'No qualifying signals' end,
    now()
  from campuses c where c.tenant_id = tid
  on conflict (campus_id) do nothing;

  -- ---------- source health ----------
  insert into source_health (tenant_id, key, label, age_label, expected_window, in_window, state, enabled) values
    (tid,'nws','NWS alerts','live · 2 m',null,true,'ok',true),
    (tid,'news','News (licensed)','18 m','≤60m window',true,'ok',true),
    (tid,'gdelt','GDELT','41 m','≤90m window',true,'ok',true),
    (tid,'cpdvr','CPD shootings (VR)','26 h · in window','≤48h window',true,'ok',true),
    (tid,'me','Cook County ME','2 d · in window','≤4d window',true,'ok',true),
    (tid,'crimes','CPD crimes (all)','8 d · in window','≤9d window',true,'ok',true),
    (tid,'rss','RSS monitors','64 m · degraded','≤60m window',false,'warn',true)
  on conflict (tenant_id, key) do nothing;

  -- ---------- Englewood playbook + steps ----------
  insert into playbooks (tenant_id, status, role, author, version)
  values (tid,'ELEVATED','Principal','ops','v3.2')
  on conflict do nothing;

  insert into playbook_steps (playbook_id, ordinal, title, detail)
  select p.id, s.ordinal, s.title, s.detail
  from playbooks p,
    (values
      (1,'Review overnight intelligence before doors open','Briefing read · morning posture acknowledged'),
      (2,'Brief front-desk and security staff','Arrival supervision plan adjusted · east entrance'),
      (3,'Confirm exterior doors are locked','Front, side, gym, kitchen entry · security desk verifies'),
      (4,'Adjust outdoor activities · morning recess','Hold K-2 recess indoors until status clears'),
      (5,'Prepare templated parent communication (HOLD)','Fill-in-the-blank template · do not send without principal review')
    ) as s(ordinal,title,detail)
  where p.tenant_id = tid and p.version = 'v3.2'
  on conflict (playbook_id, ordinal) do nothing;

  -- ---------- audit events ----------
  insert into audit_events (tenant_id, occurred_at, type, event, evidence, status_color) values
    (tid,'2026-08-01T14:52:07-05:00','STATUS','WPK, GRE · CLEAR → ALERT · rule A-1 · NWS Tornado Warning polygon','NWS CAP id · rules v2.0','ALERT'),
    (tid,'2026-08-01T14:52:12-05:00','DELIVERY','ALERT · push 5/5 · SMS 5/5 · email 7/7 · quiet hours overridden by policy','msg ids · Twilio, Postmark',null),
    (tid,'2026-08-01T07:09:33-05:00','ACTION','ENG playbook · "Brief front-desk and security staff" complete · R. Moore','playbook v3.2 · step 2',null),
    (tid,'2026-08-01T06:41:02-05:00','DELIVERY','ELEVATED · push 2/2 · email 3/3 · A. Okafor, M. Reese, J. Chen','msg ids',null),
    (tid,'2026-08-01T06:40:51-05:00','STATUS','ENG · CLEAR → ELEVATED · rule E-2 · confirmed shooting 0.31 mi · occurred yest 21:47, published 06:40','CPD VR row id · rules v2.0','ELEVATED'),
    (tid,'2026-08-01T06:40:44-05:00','INGEST','CPD VR publish cycle · 3 new records in network scope · freshness 26 h · in window','query hash · row ids',null),
    (tid,'2026-08-01T06:12:20-05:00','LOGIN','M. Reese · SSO · Google Workspace','session id',null);

  -- ---------- accuracy ledger ----------
  insert into accuracy_ledger (tenant_id, metric_key, label, value, pct, window_note) values
    (tid,'corroborated_to_confirmed','Corroborated → CPD-confirmed','96%',96,'27 of 28 · trailing 30 d'),
    (tid,'median_detect_confirm_gap','Median detect → confirm gap','22.4 h',62,'fast layer leads the record by ~a day'),
    (tid,'false_alerts','False ALERTs · production','0',2,'61 consecutive days'),
    (tid,'feed_uptime','Feed uptime · 7 sources','99.2%',99,'trailing 30 d · degrades logged');

  -- ---------- rules config ----------
  insert into rules_config (tenant_id, version, thresholds, active)
  values (tid,'v2.0','{
    "m1OutletCount":2,"m1WindowMin":20,"e3OutletCount":3,
    "elevatedRingMi":0.5,"alertRingMi":0.25,"citizenContracted":false
  }'::jsonb, true)
  on conflict (tenant_id, version) do nothing;

end $$;
