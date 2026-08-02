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

// M-2 · Dallas: an official dispatch call inside the ring → MONITOR only.
const dispatchNow = new Date("2026-08-01T15:00:00-05:00");
const dispatch = evaluateCampus({
  campus: { lat: 32.755, lon: -96.832 },
  incidents: [
    {
      id: "d1",
      kind: "dispatch",
      tier: "REPORTED",
      lat: 32.7565,
      lon: -96.8305,
      occurredAt: "2026-08-01T14:40:00-05:00",
      publishedAt: "2026-08-01T14:40:00-05:00",
    },
  ],
  weather: [],
  now: dispatchNow,
  latestDataDay: LATEST_DATA_DAY,
  thresholds: { elevatedRingMi: 0.5, alertRingMi: 0.25 },
});
const dOk = dispatch.status === "MONITOR" && dispatch.ruleId === "M-2";
dOk ? pass++ : fail++;
console.log(
  `${dOk ? "PASS" : "FAIL"}  DAL  -> ${dispatch.status} rule=${dispatch.ruleId} (dispatch in ring -> MONITOR M-2, never ALERT)`
);

console.log(`\nrules ${RULES_VERSION} - ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
