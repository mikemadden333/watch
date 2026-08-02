import { runCpdCrimesAdapter } from "../src/lib/adapters/cpd-crimes";
import { runCookMeAdapter } from "../src/lib/adapters/cook-me";
import { attachGeometry, validate, type AdapterCampus } from "../src/lib/adapters/contract";
import { campuses } from "../src/lib/data/chicago";

const ac: AdapterCampus[] = campuses.map((c) => ({ code:c.code, lat:c.lat, lon:c.lon, alertRingMi:c.alertRingMi, elevatedRingMi:c.elevatedRingMi }));

console.log("=== CPD Crimes (ijzp-q8t2) ===");
const cr = await runCpdCrimesAdapter(ac, 300);
console.log(`fetched=${cr.fetched} health=${cr.health.ageLabel} ${cr.health.state} errors=${cr.errors.length||"none"}`);
const crGeo = attachGeometry(cr.incidents, ac);
const crV = validate(crGeo);
console.log(`normalized=${crV.ok.length} rejected(date-invalid)=${crV.rejected.length}`);
const near = crGeo.filter(i=>i.distanceMi!=null).sort((a,b)=>a.distanceMi!-b.distanceMi!).slice(0,3);
for (const i of near) console.log(`  ${i.distanceMi} mi ${i.bearing} of ${i.nearestCampusCode} · ${i.headline}`);

console.log("=== Cook County ME (cjeq-bs86) ===");
const me = await runCookMeAdapter(ac, 200);
console.log(`fetched=${me.fetched} health=${me.health.ageLabel} ${me.health.state} errors=${me.errors.length||"none"}`);
const meV = validate(me.incidents);
console.log(`normalized=${meV.ok.length} rejected(future-dated typos)=${meV.rejected.length}`);
if (meV.rejected.length) for (const r of meV.rejected.slice(0,3)) console.log(`  REJECTED: ${r.record.headline} occurred=${r.record.occurredAt} (${r.reason})`);
for (const i of meV.ok.slice(0,3)) console.log(`  ${i.kind} · ${i.headline} · occurred ${i.occurredAt}`);
