/**
 * Deterministic self-check for the news-intelligence layer:
 *   extract → cluster (corroboration) → rules integrity gate (coarse geo
 *   can never trigger a ring). Run: npm run verify:news
 */
import { extract } from "../src/lib/news/extract";
import { clusterHeadlines, type RawHeadline } from "../src/lib/news/cluster";
import { evaluateCampus, type RuleIncident } from "../src/lib/rules";

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, got?: unknown) {
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (got ${JSON.stringify(got)})`}`);
}

/* ---------- extract ---------- */
const e1 = extract("Man shot in the 6300 block of South Halsted, police say");
check("extract: violent shooting detected", e1.isViolent && e1.eventType === "shooting");
check("extract: block cue parsed", !!e1.blockCue && /6300/.test(e1.blockCue!), e1.blockCue);

const e2 = extract("Person killed in Englewood shooting overnight");
check("extract: homicide classified", e2.eventType === "homicide", e2.eventType);
check("extract: neighborhood found", e2.place?.name === "Englewood", e2.place?.name);

const e3 = extract("City council debates new budget for parks");
check("extract: non-violent ignored", !e3.isViolent && e3.eventType === null);

const e4 = extract("Film crew stages fake shooting for movie downtown");
check("extract: negative context suppresses", !e4.isViolent);

/* ---------- serious-crime filter: adds rape/sexual assault, drops noise ---------- */
const rape = extract("Woman raped in the 6300 block of South Halsted");
check("filter: sexual assault detected + classified", rape.isViolent && rape.eventType === "sexual-assault", rape.eventType);
const sa = extract("Teen sexually assaulted near Englewood park");
check("filter: 'sexually assaulted' detected", sa.isViolent && sa.eventType === "sexual-assault", sa.eventType);

// GDELT-style noise that must NOT pass the filter
const noise = [
  "Today in History : August 2 , Wild Bill shot and killed during poker game",
  "MLB roundup : Brewers down Angels , move atop MLB standings",
  "Robert Lewandowski scores twice in his Chicago Fire home debut",
  "Today in History : verdict in Black Sox trial",
  "City debates new gun control law after rally",
  "Man killed in three-car crash on I-90",
  "Police recover stolen catalytic converter in theft ring",
  "Suspect sentenced to 20 years in prison for 2019 murder",
];
for (const n of noise) {
  const x = extract(n);
  check(`filter drops noise: "${n.slice(0, 42)}…"`, !x.isViolent, x.eventType);
}
// real incidents that must STILL pass
for (const y of ["Two men shot in Englewood overnight", "Fatal stabbing reported in Woodlawn", "Person killed in Auburn Gresham shooting"]) {
  const x = extract(y);
  check(`filter keeps real: "${y.slice(0, 34)}…"`, x.isViolent, x.eventType);
}

/* ---------- cluster: multi-outlet same event → 1 CORROBORATED ---------- */
const base = "2026-08-01T22:40:00Z";
const sameEvent: RawHeadline[] = [
  { outlet: "ABC7 Chicago", title: "Man shot in 6300 block of South Halsted", url: "a", publishedAt: base },
  { outlet: "NBC5 Chicago", title: "Shooting reported at 6300 block of S Halsted", url: "b", publishedAt: "2026-08-01T22:52:00Z" },
  { outlet: "WGN", title: "Police investigate shooting on 6300 block of South Halsted", url: "c", publishedAt: "2026-08-01T23:05:00Z" },
];
const c1 = clusterHeadlines(sameEvent);
check("cluster: 3 outlets on same block → 1 event", c1.length === 1, c1.length);
check("cluster: distinct outlet count = 3", c1[0]?.outlets.length === 3, c1[0]?.outlets);
check("cluster: tier CORROBORATED (2+ outlets)", c1[0]?.tier === "CORROBORATED", c1[0]?.tier);
check("cluster: news never CONFIRMED", c1.every((c) => c.tier !== ("CONFIRMED" as unknown)), c1.map((c) => c.tier));

/* ---------- cluster: different events stay separate ---------- */
const diffEvents: RawHeadline[] = [
  { outlet: "ABC7 Chicago", title: "Man shot in 6300 block of South Halsted", url: "a", publishedAt: base },
  { outlet: "NBC5 Chicago", title: "Stabbing reported in Rogers Park", url: "b", publishedAt: base },
];
const c2 = clusterHeadlines(diffEvents);
check("cluster: two unrelated events → 2 clusters", c2.length === 2, c2.length);
check("cluster: single-outlet event is REPORTED", c2.every((c) => c.tier === "REPORTED"), c2.map((c) => c.tier));

/* ---------- cluster: same neighborhood, different blocks — conservative ---------- */
// Two different Englewood shootings with distinct block cues must NOT merge
// (a false merge would inflate corroboration).
const twoBlocks: RawHeadline[] = [
  { outlet: "ABC7 Chicago", title: "Shooting in 6300 block of South Halsted, Englewood", url: "a", publishedAt: base },
  { outlet: "NBC5 Chicago", title: "Separate shooting in 5900 block of South Racine, Englewood", url: "b", publishedAt: base },
];
const c3 = clusterHeadlines(twoBlocks);
check("cluster: distinct blocks in same nbhd stay separate", c3.length === 2, c3.length);

/* ---------- Dallas: city-aware extraction + clustering ---------- */
const d1 = extract("Man shot in the 1200 block of North Beckley Ave, Oak Cliff", "", "dallas");
check("dallas: violent shooting detected", d1.isViolent && d1.eventType === "shooting");
check("dallas: block cue carries Dallas, TX suffix", !!d1.blockCue && /Dallas, TX$/.test(d1.blockCue!), d1.blockCue);
check("dallas: Dallas neighborhood found", d1.place?.name === "Oak Cliff", d1.place?.name);

// same headline under Chicago context must NOT geocode to Dallas
const d1chi = extract("Man shot in the 1200 block of North Beckley Ave, Oak Cliff", "", "chicago");
check("city isolation: Chicago context → Chicago, IL suffix", !!d1chi.blockCue && /Chicago, IL$/.test(d1chi.blockCue!), d1chi.blockCue);
check("city isolation: Oak Cliff not in Chicago gazetteer", d1chi.place === null, d1chi.place?.name);

const dallasSame: RawHeadline[] = [
  { outlet: "NBC5 DFW", title: "Shooting in 3400 block of Malcolm X Blvd, South Dallas", url: "x", publishedAt: base },
  { outlet: "FOX 4 Dallas", title: "Police investigate shooting on 3400 block of Malcolm X Boulevard", url: "y", publishedAt: "2026-08-01T22:55:00Z" },
];
const dc = clusterHeadlines(dallasSame, "dallas");
check("dallas cluster: 2 outlets same block → 1 CORROBORATED", dc.length === 1 && dc[0]?.tier === "CORROBORATED", `${dc.length}/${dc[0]?.tier}`);

/* ---------- rules integrity gate: coarse geo can never trigger a ring ---------- */
const now = new Date("2026-08-01T23:30:00Z");
const campus = { lat: 41.7796, lon: -87.6444 }; // Englewood Prep-ish
const ringInc = (geo: RuleIncident["geoConfidence"]): RuleIncident => ({
  id: `n-${geo}`,
  kind: "shooting",
  tier: "CORROBORATED",
  lat: 41.7799, // ~0.02 mi away — well inside any ring
  lon: -87.6448,
  occurredAt: "2026-08-01T22:40:00Z",
  publishedAt: "2026-08-01T22:40:00Z",
  outletCount: 3,
  corroborationSpreadMin: 12,
  geoConfidence: geo,
});

const coarse = evaluateCampus({
  campus,
  incidents: [ringInc("neighborhood")],
  weather: [],
  now,
  latestDataDay: "2026-08-01",
});
check("gate: neighborhood-geo corroborated news → CLEAR (no ring)", coarse.status === "CLEAR", coarse.status);

const precise = evaluateCampus({
  campus,
  incidents: [ringInc("block")],
  weather: [],
  now,
  latestDataDay: "2026-08-01",
});
check("gate: block-geo corroborated news (3 outlets) → ELEVATED E-3", precise.status === "ELEVATED" && precise.ruleId === "E-3", `${precise.status}/${precise.ruleId}`);

const city = evaluateCampus({
  campus,
  incidents: [ringInc("city")],
  weather: [],
  now,
  latestDataDay: "2026-08-01",
});
check("gate: city-geo news → CLEAR (no ring)", city.status === "CLEAR", city.status);

console.log(`\nnews-intelligence — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
