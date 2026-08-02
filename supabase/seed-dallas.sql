-- ============================================================
-- Watch — seed: Solis Academies (Dallas pack)
-- Four fictional campuses across Oak Cliff, South Dallas, Pleasant
-- Grove. Fully live (DPD Active Calls + NWS). Idempotent on slug/codes.
-- ============================================================

insert into tenants (slug, name, city, rules_version)
values ('solis-academies', 'Solis Academies', 'Dallas', 'v2.0')
on conflict (slug) do update set name = excluded.name;

do $$
declare tid uuid;
begin
  select id into tid from tenants where slug = 'solis-academies';

  insert into campuses (tenant_id, code, name, address, lat, lon, geocode_verified, students, grades, dismissal, principal, alert_ring_mi, elevated_ring_mi) values
    (tid,'TRO','Trinity Oaks Elementary','1200 N Beckley Ave',32.7550,-96.8320,true,540,'K-5','15:10','D. Salazar',0.25,0.50),
    (tid,'CVP','Cliff View Prep','300 W Jefferson Blvd',32.7430,-96.8280,true,610,'6-12','15:35','R. Okonkwo',0.25,0.50),
    (tid,'SDC','South Dallas Collegiate','3434 Malcolm X Blvd',32.7620,-96.7720,true,588,'9-12','15:40','T. Jefferson',0.25,0.50),
    (tid,'PGA','Pleasant Grove Academy','1150 N Buckner Blvd',32.7845,-96.6860,true,566,'K-8','15:20','M. Andrade',0.25,0.50)
  on conflict (tenant_id, code) do nothing;

  -- all-clear starting posture; live feeds drive changes from here
  insert into campus_status (campus_id, tenant_id, status, rules_version, detail, since)
  select c.id, tid, 'CLEAR'::watch_status, 'v2.0', 'No qualifying signals', now()
  from campuses c where c.tenant_id = tid
  on conflict (campus_id) do nothing;

  insert into source_health (tenant_id, key, label, age_label, expected_window, in_window, state, enabled) values
    (tid,'nws','NWS alerts','live · 2 m',null,true,'ok',true),
    (tid,'dpd','DPD active calls','live · 2 m','2 m',true,'ok',true),
    (tid,'news','News (licensed)','—','≤60m window',true,'ok',true),
    (tid,'gdelt','GDELT','—','≤90m window',true,'ok',true),
    (tid,'rss','RSS monitors','—','≤60m window',true,'ok',true)
  on conflict (tenant_id, key) do nothing;

  insert into rules_config (tenant_id, version, thresholds, active)
  values (tid,'v2.0','{"m1OutletCount":2,"m1WindowMin":20,"e3OutletCount":3,"elevatedRingMi":0.5,"alertRingMi":0.25,"citizenContracted":false}'::jsonb, true)
  on conflict (tenant_id, version) do nothing;
end $$;
