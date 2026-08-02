/**
 * Deterministic self-check for the v2.0 rules engine against the seeded
 * Chicago scenario. Run: npm run verify:rules
 */
import { evaluateCampus, RULES_VERSION, type RuleIncident } from "../src/lib/rules";
import {
  campuses,
  incidents,
  LATEST_DATA_DAY,
  morningStatuses,
} from "../src/lib/data/chicago";

const now = new Date("2026-08-01T07:12:00-05:00");

const ruleIncidents: RuleIncident[] = incidents
  .filter((i) => i.kind !== "weather-advisory")
  .map((i) => ({
    id: i.id,
    kind: i.kind,
    tier: i.tier,
    lat: i.lat,
    lon: i.lon,
    occurredAt: i.occurredAt,
    publishedAt: i.publishedAt,
    outletCount: i.source.includes("×2") ? 2 : undefined,
    corroborationSpreadMin: i.tier === "CORROBORATED" ? 12 : undefined,
  }));

let pass = 0;
let fail = 0;

for (const c of campuses) {
  const r = evaluateCampus({
    campus: { lat: c.lat, lon: c.lon },
    incidents: ruleIncidents,
    weather: [],
    now,
    latestDataDay: LATEST_DATA_DAY,
    thresholds: { elevatedRingMi: c.elevatedRingMi, alertRingMi: c.alertRingMi },
  });
  const expected = morningStatuses.find((s) => s.campusCode === c.code)!.status;
  const ok = r.status === expected;
  ok ? pass++ : fail++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${c.code.padEnd(4)} -> ${r.status.padEnd(9)} rule=${(r.ruleId ?? "-").padEnd(4)} (expected ${expected})`
  );
}

// NWS Tornado Warning intersecting a campus must fire ALERT · A-1.
const tornado = evaluateCampus({
  campus: { lat: 41.793, lon: -87.617 },
  incidents: ruleIncidents,
  weather: [{ kind: "warning", intersectsCampus: true }],
  now: new Date("2026-08-01T14:52:00-05:00"),
  latestDataDay: LATEST_DATA_DAY,
});
const tOk = tornado.status === "ALERT" && tornado.ruleId === "A-1";
tOk ? pass++ : fail++;
console.log(
  `${tOk ? "PASS" : "FAIL"}  WPK  -> ${tornado.status} rule=${tornado.ruleId} (tornado warning -> ALERT A-1)`
);

console.log(`\nrules ${RULES_VERSION} - ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
