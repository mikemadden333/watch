# Watch — Integrity & Correctness Audit

_Overnight sweep, 2026-08-02. Every finding below was verified against the
actual code before it was written down. Fixes marked **FIXED** were applied,
tested (`verify:rules` 8/8, `verify:news` 22/22), built, and deployed this
session. Findings marked **FLAG** are left for a human decision because the
correct fix is coupled, design-level, or would change displayed data in a way
that should be eyeballed first._

Scope: adapters, rules engine, status engine, delivery, retro-confirmation,
news-intelligence, network read layer, map. Four lenses — silent failures,
integrity gaps, adapter fragility, rules/engine correctness.

---

## Summary

| # | Severity | Area | Finding | Status |
|---|----------|------|---------|--------|
| 1 | **HIGH** | Map | Coarse neighborhood-geo news could render as a precise map dot | **FIXED** |
| 2 | MEDIUM | Map | Popover showed hardcoded scenario times (`yest 21:47`) on live E-2 | **FIXED** |
| 3 | MEDIUM | NWS | Total fetch failure still reported source health "ok · live" | **FIXED** |
| 4 | MEDIUM | Rules/engine | M-1 corroboration time-window not enforced on live data | **FLAG** |
| 5 | MEDIUM | Timezone | Socrata times stored as CT-as-UTC; display mixes local & UTC | **FLAG** |
| 6 | MEDIUM | Rules/integrity | "Context-only" sources (CPD Crimes) not structurally barred from rings | **FLAG** |
| 7 | MEDIUM | Ledger honesty | Retro-confirm could publish a misleading 0% with no source to check | **FIXED** |
| 8 | LOW | GDELT / News | Fetch exception reported health "ok" | **FIXED** |
| 9 | LOW | Rules/engine | `CORROBORATED` defaults to outletCount 2, can satisfy the 2-outlet rule | **FLAG** |
| 10 | LOW | Dallas PD | `combineDateTime` is fragile if `time` is a full timestamp | **FLAG** |

---

## FIXED

### 1 — HIGH · Coarse-geo news could render as a precise dot on the map
`src/components/MapView.tsx` (incident marker loop)

The map plotted any incident with `lat/lon` at tier CONFIRMED or CORROBORATED,
**regardless of `geoConfidence`**. A corroborated local-news event geocoded to a
*neighborhood centroid* (`geoConfidence: "neighborhood"`) carries real
coordinates (the centroid) and tier CORROBORATED — so it would draw as a precise
7px dot at the centroid, asserting a precision we don't have. This directly
violates the core promise "coarse geo never on the map," on the very screen a
principal reads as ground truth.

_Failure scenario:_ two outlets report "a shooting in Englewood" with no block.
The cluster is CORROBORATED, geocoded to the Englewood centroid. Before the fix,
a confident green/amber dot appears mid-neighborhood — indistinguishable from a
CPD-confirmed point.

**Fix:** the marker loop now applies the same gate as the rules engine — only
`exact`/`block` incidents render as points; `neighborhood`/`city` are excluded
(they remain available as briefing context). Latent today (no CORROBORATED
neighborhood event live right now) but structural, so worth closing now.

### 2 — MEDIUM · Hardcoded scenario times in the live map popover
`src/components/MapView.tsx` (selected-campus popover)

The "Occurred / Published" rows printed the literal strings `"yest 21:47"` and
`"06:40 today"` whenever `ruleId === "E-2"`. Harmless while E-2 was fixture-only;
now that Chicago is live, a real E-2 would display fabricated timestamps — fake
data wearing a real posture. **Fix:** the rows now read the real clocks of the
nearest confirmed in-ring incident, or `—` when there is none.

### 3 — MEDIUM · NWS reported healthy during a total outage
`src/lib/adapters/nws.ts`

Health was hardcoded `state: "ok"`, `inWindow: true`. When every per-campus point
fetch throws (NWS down, network blocked), the adapter caught each error, continued,
and still reported "ok · live" — hiding the loss of the **only** real-time
authoritative source, the one that drives the A-1/E-1 weather rules. A dark NWS
would silently produce zero weather signals with a green light.

_Failure scenario:_ api.weather.gov returns 5xx for all six campuses → six errors
collected → health still "ok" → the Sources page and footer show NWS green while
no tornado warning could ever fire. **Fix:** when `errors.length >= campuses.length`,
health reports `state: "late"`, `inWindow: false`, label "unreachable". A genuine
quiet period (fetch OK, no active alerts) now reads "live · no active alerts" and
stays healthy — the two cases are finally distinguished.

### 7 — MEDIUM · Retro-confirm could publish a misleading 0%
`src/lib/retroConfirm.ts`

The accuracy ledger's "Corroborated → confirmed" rate was published whenever
`rate != null`. For a tenant with fast signals but **no authoritative records to
match against** (Dallas today — no daily incident feed exists), every fast signal
is unmatched, so the rate computes to `0%`. Published, that reads as "Watch is
wrong 100% of the time," when the truth is "there is nothing to check against
yet." **Fix:** the rate is published only when `confirmed.length > 0`. With no
confirmation source, the ledger stays empty and the UI's honest "accumulating its
first window" copy shows instead.

### 8 — LOW · GDELT / licensed-news reported "ok" on a failed fetch
`src/lib/adapters/gdelt.ts`, `src/lib/adapters/news.ts`

Same silent-failure shape as NWS but lower stakes (both are network-scope
REPORTED/CORROBORATED and never drive a ring). A thrown fetch left health "ok ·
no coverage," indistinguishable from a genuine empty result. **Fix:** when
`errors.length > 0 && incidents.length === 0`, both report "unreachable" / warn.

---

## FLAG — for a human decision

### 4 — MEDIUM · M-1's 20-minute corroboration window isn't enforced on live data
`src/lib/statusEngine.ts` (ruleIncidents construction) · `src/lib/rules.ts` (M-1/E-3)

The rules require corroborating outlet reports to fall within 20 minutes
(`corroborationSpreadMin <= m1WindowMin`). But `statusEngine` **hardcodes
`corroborationSpreadMin: 10`** for every incident — the real spread computed by
`cluster.ts` is neither persisted nor read. So a corroborated news event whose
outlets actually reported six hours apart still satisfies the "within 20 min"
freshness test.

_Failure scenario:_ two outlets cover the same neighborhood shooting, one at 6am
and one at noon. The cluster is CORROBORATED with a real spread of ~360 min; M-1
should reject it as stale corroboration, but the hardcoded 10 makes it pass, and
(if block-level) it drives MONITOR.

_Why flagged, not fixed:_ the correct fix persists the cluster's `spreadMin` to a
new column and reads it in `statusEngine` — a schema + migration + mapping change
that should ship deliberately. Recommended next step. Impact is currently latent
(no multi-outlet block-level cluster live yet).

### 5 — MEDIUM · No single timezone discipline for incident clocks
`src/lib/adapters/{cpd-vr,cpd-crimes,cook-me,dallas-pd}.ts` · display helpers in
`networkData.ts`, `journey.ts`, `breakingNews.ts`

Socrata "floating" timestamps have no zone. The adapters convert
`"2026-08-01 06:40:00"` → `"2026-08-01T06:40:00"` with **no offset**, so
`new Date()` treats Central wall-clock digits as UTC. It happens to *round-trip
correctly for display* because the display helpers read `getUTCHours()` — the
original CT digits come back out. But truly-UTC sources (NWS `sent`, GDELT
`seendate…Z`, RSS `pubDate`) store real UTC instants and display via the same
`getUTCHours()` — so **news/NWS times render ~5–6h ahead of local, while
CPD/ME/dispatch render correct-local**, with no label saying which is which.
Cross-source duration math (the detection-latency metric, retro gap-hours) mixes
a true-UTC instant with a CT-as-UTC one and is off by the offset.

_Failure scenario:_ a GDELT item seen at 16:47 CT displays "21:47"; a CPD record
at 16:47 CT displays "16:47" — same real time, two different numbers on the same
screen, both unlabeled. The "three clocks, always shown" promise is undermined by
inconsistent zones.

_Why flagged, not fixed:_ storage and display are coupled — fixing the display
alone would *double-shift* the Socrata times that currently read correctly. The
right fix is end-to-end: stamp Socrata times with the source's real offset on
ingest, then format everything in `America/Chicago` via `Intl` at display. That
changes visible timestamps across the app and should be eyeballed by a human, not
shipped unattended at 4am.

### 6 — MEDIUM · "Context-only" sources aren't structurally barred from rings
`src/lib/adapters/cpd-crimes.ts` · `src/lib/statusEngine.ts` (latestDataDay) · `src/lib/rules.ts`

CPD Crimes is documented as the "8-day backfill / context layer, not alerting,"
yet it emits `tier: CONFIRMED` with `kind: shooting/homicide`, which A-2/E-2 treat
as ring-eligible. The only thing stopping an 8-day-old crime from firing an ALERT
is the `onLatestDataDay` gate — and `latestDataDay` is derived as the max published
date across *all* CONFIRMED sources, so it currently pins to whatever is freshest
(usually a same-day NWS advisory). The protection is an emergent coincidence, not a
structural guarantee.

_Failure scenario:_ on a day NWS has no active alerts and CPD Crimes is the
freshest CONFIRMED source, `latestDataDay` becomes the crimes date; an 8-day-old
armed-battery reclassified as "shooting" inside 0.25 mi could then fire A-2 ALERT.

_Why flagged:_ recommend an explicit per-source role flag (`alerting: false`) that
context sources carry, checked in the rules the same way `ringEligible` gates geo —
a small, principled change, but it touches the source contract and rule set and
deserves a deliberate design pass. Related: CPD Crimes maps any BATTERY/ASSAULT
whose description contains "GUN/ARMED/FIREARM" to `kind: "shooting"` — defensible
but aggressive; worth reviewing alongside the role flag.

### 9 — LOW · `CORROBORATED` defaults to outletCount 2
`src/lib/statusEngine.ts`

`outletCount: outlets || (i.tier === "CORROBORATED" ? 2 : 1)` — any CORROBORATED
incident with an empty `corroborating` array is treated as 2 outlets, which alone
satisfies M-1's `>= 2` test. Today only Citizen (off) and licensed-news (no coords,
so ring-excluded) hit this path, so it's inert; `localnews` sets a real outlet
list. Flagged so a future CORROBORATED-with-coordinates source doesn't inherit a
free pass on the two-outlet rule. Recommend defaulting to 1 and requiring sources
to state their real count.

### 10 — LOW · Dallas dispatch `combineDateTime` fragility
`src/lib/adapters/dallas-pd.ts`

`combineDateTime(date, time)` returns `` `${date.split("T")[0]}T${time}` ``. If the
Socrata `time` field ever arrives as a full timestamp rather than `HH:MM:SS`, the
result is `2026-08-01T2026-08-01T…` → `Invalid Date`. Currently the M-2 window was
widened to 36h partly to tolerate clock skew, which masks date issues. Low
likelihood, easy guard (validate the `time` shape, fall back to `date`). Worth a
one-line hardening when the timezone work (#5) is done, since they touch the same
code.

---

## Not findings (checked, sound)

- **Geo integrity gate** in `rules.ts` (`ringEligible`) correctly bars
  neighborhood/city incidents from every distance-ring rule — verified by
  `verify:news` (coarse → CLEAR, block → ELEVATED).
- **Batch dedup** in `persistIncidents` correctly collapses duplicate
  `(source, source_record_id)` before upsert.
- **Quiet-window / delivery** logic (`delivery.ts`) uses `Intl` in
  `America/Chicago` correctly; ALERT always breaks through; MONITOR never pushes.
- **News tiering** never emits CONFIRMED; single-source stays REPORTED and is
  excluded from the map.
- **Socrata freshness** correctly uses ordered-desc-limit-1, never an aggregate.
- **ME future-dated typos** are handled by `isPlausibleDate` on both ingest and
  the freshness label.

---

_Fixes in this pass are safe and localized. The four FLAGs (M-1 window, timezone,
context-source role, and the low-severity companions) are the recommended next
work — none is on fire, and each deserves a deliberate change rather than an
overnight edit._
