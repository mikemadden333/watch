/** Deterministic check of the retro-confirmation match criteria:
 *  a fast signal confirms iff a CONFIRMED record is within 0.5 mi AND 48 h. */
import { distanceMi } from "../src/lib/geo";

const RADIUS = 0.5, WINDOW_H = 48;
function isMatch(f: {lat:number;lon:number;occ:string}, c: {lat:number;lon:number;occ:string}) {
  const d = distanceMi(f, c);
  const gapH = Math.abs(new Date(c.occ).getTime() - new Date(f.occ).getTime()) / 3.6e6;
  return d <= RADIUS && gapH <= WINDOW_H;
}
const fast = { lat: 41.7721, lon: -87.5965, occ: "2026-08-01T05:35:00-05:00" };
const cases: [string, {lat:number;lon:number;occ:string}, boolean][] = [
  ["confirmed 0.2mi / 6h later", { lat: 41.7745, lon: -87.5955, occ: "2026-08-01T11:35:00-05:00" }, true],
  ["confirmed 0.6mi / 6h later (too far)", { lat: 41.7635, lon: -87.5900, occ: "2026-08-01T11:35:00-05:00" }, false],
  ["confirmed 0.2mi / 5 days later (too old)", { lat: 41.7745, lon: -87.5955, occ: "2026-08-06T11:35:00-05:00" }, false],
];
let pass=0, fail=0;
for (const [label, c, expect] of cases) {
  const got = isMatch(fast, c);
  const ok = got === expect; ok ? pass++ : fail++;
  console.log(`${ok?"PASS":"FAIL"}  ${label.padEnd(38)} → ${got} (expected ${expect})`);
}
console.log(`\nretro-confirm criteria — ${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
