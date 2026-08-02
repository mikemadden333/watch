/** Deterministic self-check for v1.1 quiet-window delivery decisions. */
import { decideDelivery, DEFAULT_QUIET } from "../src/lib/delivery";

// A time inside the dismissal window (15:10 Central) and one outside (12:00 Central).
const inWindow = new Date("2026-08-03T20:10:00Z");  // 15:10 CDT
const outWindow = new Date("2026-08-03T17:00:00Z"); // 12:00 CDT

const cases: [string, Date, "ALERT"|"ELEVATED"|"MONITOR"|"CLEAR", string][] = [
  ["ALERT in dismissal window",   inWindow,  "ALERT",    "deliver"],
  ["ELEVATED in dismissal window", inWindow,  "ELEVATED", "hold"],
  ["MONITOR in dismissal window",  inWindow,  "MONITOR",  "hold"],
  ["ELEVATED outside window",      outWindow, "ELEVATED", "deliver"],
  ["MONITOR outside window",       outWindow, "MONITOR",  "in-app"],
  ["CLEAR anytime",                inWindow,  "CLEAR",    "none"],
];
let pass=0, fail=0;
for (const [label, now, tier, expect] of cases) {
  const d = decideDelivery(tier, DEFAULT_QUIET, now);
  const ok = d.action === expect;
  ok ? pass++ : fail++;
  const extra = d.quietOverridden ? " [quiet overridden]" : d.releaseAtLocal ? ` [releases ${d.releaseAtLocal}]` : "";
  console.log(`${ok?"PASS":"FAIL"}  ${label.padEnd(30)} → ${d.action}${extra} (expected ${expect})`);
}
console.log(`\nquiet-windows v1.1 — ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
