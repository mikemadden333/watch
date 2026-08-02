import { runNwsAdapter, type AdapterCampus } from "../src/lib/adapters/nws";
import { campuses } from "../src/lib/data/chicago";

const ac: AdapterCampus[] = campuses.map((c) => ({
  code: c.code, lat: c.lat, lon: c.lon,
  alertRingMi: c.alertRingMi, elevatedRingMi: c.elevatedRingMi,
}));

const r = await runNwsAdapter(ac);
console.log(`source=${r.source} fetched=${r.fetched} health=${r.health.ageLabel} state=${r.health.state}`);
console.log(`errors: ${r.errors.length ? r.errors.join("; ") : "none"}`);
console.log(`weather signals (warning/watch): ${r.weatherSignals.length}`);
for (const s of r.weatherSignals) console.log(`  ${s.campusCode} · ${s.kind} · ${s.event} · expires ${s.expiresAt}`);
console.log(`incidents (deduped alerts): ${r.incidents.length}`);
for (const i of r.incidents) console.log(`  [${i.kind}] ${i.headline}  occurred=${i.occurredAt}`);
