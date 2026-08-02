import { runDallasPdAdapter } from "../src/lib/adapters/dallas-pd";
const { result } = await runDallasPdAdapter(500);
console.log(`fetched=${result.fetched} · health=${result.health.ageLabel} ${result.health.state} · errors=${result.errors.length||"none"}`);
console.log(`safety-relevant dispatch incidents: ${result.incidents.length}`);
const seen = new Set<string>();
for (const i of result.incidents) { if(seen.has(i.sourceRecordId))continue; seen.add(i.sourceRecordId); if(seen.size<=8) console.log(`  [${i.tier}] ${i.headline}`); }
console.log(`unique incident_numbers (post-dedupe): ${seen.size}`);
