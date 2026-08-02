import { runCpdVrAdapter, } from "../src/lib/adapters/cpd-vr";
import { attachGeometry, validate, type AdapterCampus } from "../src/lib/adapters/contract";
import { campuses } from "../src/lib/data/chicago";

const ac: AdapterCampus[] = campuses.map((c) => ({
  code: c.code, lat: c.lat, lon: c.lon, alertRingMi: c.alertRingMi, elevatedRingMi: c.elevatedRingMi,
}));

const r = await runCpdVrAdapter(ac, 100);
console.log(`source=${r.source} fetched=${r.fetched}`);
console.log(`health: ${r.health.ageLabel} · state=${r.health.state} · inWindow=${r.health.inWindow}`);
console.log(`errors: ${r.errors.length ? r.errors.join("; ") : "none"}`);
const geo = attachGeometry(r.incidents, ac);
const { ok, rejected } = validate(geo);
console.log(`normalized=${ok.length} rejected=${rejected.length}`);
// show the 5 nearest-to-any-campus confirmed incidents
const near = geo.filter(i => i.distanceMi != null).sort((a,b)=> (a.distanceMi!-b.distanceMi!)).slice(0,5);
console.log("nearest confirmed to a campus:");
for (const i of near) console.log(`  ${i.distanceMi} mi ${i.bearing} of ${i.nearestCampusCode} · [${i.kind}] ${i.headline} · occurred ${i.occurredAt}`);
