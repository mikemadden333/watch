/* ============================================================
   Seeded scenario — Veritas Charter Schools (Chicago pilot)
   THE DEMO SPINE. Labeled a simulation. Content mirrors the
   wireframes verbatim; coordinates are real so the map geometry
   (rings, distances, bearings) is honest.

   Two temporal states in the scenario:
     · Morning posture — 07:12. ENG ELEVATED, WDL MONITOR, 4 CLEAR.
       (briefing, map, campus detail, admin)
     · Afternoon — 14:54. NWS Tornado Warning fires; WPK + GRE ALERT.
       (alerts, audit)
   ============================================================ */

import type {
  AlertItem,
  AuditEvent,
  Campus,
  CampusStatus,
  Contact,
  DataSourceToggle,
  FeedHealth,
  Incident,
  LedgerMetric,
  Playbook,
  Tenant,
  Threshold,
  TimelineEntry,
} from "../types";

export const tenant: Tenant = {
  id: "veritas-charter",
  name: "Veritas Charter Schools",
  city: "Chicago",
  rulesVersion: "v2.0",
};

/** The CPD Violence Reduction publish day driving morning posture. */
export const LATEST_DATA_DAY = "2026-08-01";

export const campuses: Campus[] = [
  {
    id: "eng",
    code: "ENG",
    name: "Englewood Prep",
    address: "6201 S Stewart Ave",
    lat: 41.7817,
    lon: -87.636,
    students: 612,
    grades: "K-8",
    dismissal: "15:30",
    principal: "A. Okafor",
    cpdLiaison: "Sgt. Diaz · ext 4271",
    alertRingMi: 0.25,
    elevatedRingMi: 0.5,
    geocodeVerified: true,
  },
  {
    id: "wdl",
    code: "WDL",
    name: "Woodlawn Academy",
    address: "6357 S Woodlawn Ave",
    lat: 41.7785,
    lon: -87.5965,
    students: 588,
    grades: "6-12",
    dismissal: "15:45",
    principal: "T. Boyd",
    alertRingMi: 0.25,
    elevatedRingMi: 0.5,
    geocodeVerified: true,
  },
  {
    id: "hyp",
    code: "HYP",
    name: "Hyde Park Lower",
    address: "5235 S Kenwood Ave",
    lat: 41.7994,
    lon: -87.5928,
    students: 604,
    grades: "K-5",
    dismissal: "15:15",
    principal: "S. Ruiz",
    alertRingMi: 0.25,
    elevatedRingMi: 0.4,
    geocodeVerified: true,
  },
  {
    id: "brz",
    code: "BRZ",
    name: "Bronzeville Middle",
    address: "4644 S King Dr",
    lat: 41.809,
    lon: -87.616,
    students: 566,
    grades: "6-8",
    dismissal: "15:30",
    principal: "M. Ellison",
    alertRingMi: 0.25,
    elevatedRingMi: 0.5,
    geocodeVerified: true,
  },
  {
    id: "wpk",
    code: "WPK",
    name: "Washington Park HS",
    address: "5620 S King Dr",
    lat: 41.793,
    lon: -87.617,
    students: 631,
    grades: "9-12",
    dismissal: "15:40",
    principal: "J. Carter",
    alertRingMi: 0.25,
    elevatedRingMi: 0.5,
    geocodeVerified: true,
  },
  {
    id: "gre",
    code: "GRE",
    name: "Greater Grand K-8",
    address: "7050 S South Chicago Ave",
    lat: 41.7625,
    lon: -87.615,
    students: 598,
    grades: "K-8",
    dismissal: "15:20",
    principal: "R. Nwosu",
    alertRingMi: 0.25,
    elevatedRingMi: 0.5,
    geocodeVerified: true,
  },
];

export function campusByCode(code: string): Campus | undefined {
  return campuses.find((c) => c.code.toLowerCase() === code.toLowerCase());
}

/* ---------------- incidents (three clocks each) ---------------- */

export const incidents: Incident[] = [
  {
    id: "inc-eng-shooting",
    sourceRecordId: "gumc-mgzr:2026-08-01:0347",
    headline: "Confirmed shooting · 63rd & Halsted block",
    kind: "shooting",
    tier: "CONFIRMED",
    source: "CPD VR gumc-mgzr",
    corroboratingSources: ["Block Club Chicago", "GDELT"],
    // 0.31 mi NE of Englewood Prep — inside 0.5 elevated ring, outside 0.25 alert ring
    lat: 41.78487,
    lon: -87.63174,
    occurredAt: "2026-07-31T21:47:00-05:00",
    publishedAt: "2026-08-01T06:40:00-05:00",
    detectedAt: "2026-08-01T06:40:44-05:00",
    victimNote: "1 victim, non-fatal",
    nearestCampusCode: "ENG",
    distanceMi: 0.31,
    bearing: "NE",
    verifiedBy: "M. Reese · Safety Director",
    verifiedAt: "06:52 today",
    verifierNote: "Matched CPD record to overnight news reports; geocode confirmed 0.31 mi NE.",
    journey: [
      { kind: "occurred", label: "Occurred", detail: "Shooting near 63rd & Halsted", time: "yest 21:47" },
      { kind: "reported", label: "First report", detail: "Block Club Chicago · local news", time: "22:40 yest", tier: "REPORTED" },
      { kind: "corroborated", label: "Corroboration", detail: "GDELT · news wire + a second outlet agree", time: "06:31 today", tier: "CORROBORATED" },
      { kind: "confirmed", label: "Authoritative confirmation", detail: "Chicago Police · official shooting record", time: "06:40 today", tier: "CONFIRMED" },
      { kind: "verified", label: "Verified by a person", detail: "M. Reese · Safety Director", time: "06:52 today" },
      { kind: "status", label: "Status change", detail: "CLEAR → ELEVATED · rule E-2 · confirmed-in-ring", time: "06:40 today" },
      { kind: "notified", label: "Who was notified", detail: "A. Okafor, M. Reese · push + email · delivered", time: "06:41 today" },
    ],
  },
  {
    id: "inc-wdl-shotsfired",
    sourceRecordId: "news:65th-cottage-grove:0633",
    headline: "Corroborated · shots-fired report, 65th & Cottage Grove",
    kind: "shots-fired",
    tier: "CORROBORATED",
    source: "News ×2",
    corroboratingSources: ["News ×2", "GDELT"],
    // 0.44 mi S of Woodlawn Academy
    lat: 41.77213,
    lon: -87.5965,
    occurredAt: "2026-08-01T05:35:00-05:00",
    publishedAt: "2026-08-01T06:33:00-05:00",
    detectedAt: "2026-08-01T06:33:12-05:00",
    nearestCampusCode: "WDL",
    distanceMi: 0.44,
    bearing: "S",
    note: "awaiting CPD record",
  },
  {
    id: "inc-eng-prior",
    sourceRecordId: "gumc-mgzr:2026-07-29:0288",
    headline: "Confirmed shooting · 62nd & Morgan block",
    kind: "shooting",
    tier: "CONFIRMED",
    source: "CPD VR gumc-mgzr",
    // ~0.40 mi SW of Englewood Prep — inside 0.5 elevated ring, prior data day
    lat: 41.7776,
    lon: -87.6415,
    occurredAt: "2026-07-28T23:12:00-05:00",
    publishedAt: "2026-07-29T06:45:00-05:00",
    detectedAt: "2026-07-29T06:45:20-05:00",
    victimNote: "1 victim, non-fatal",
    nearestCampusCode: "ENG",
    distanceMi: 0.4,
    bearing: "SW",
    note: "prior data day · logged",
  },
  {
    id: "inc-racine-shooting",
    sourceRecordId: "gumc-mgzr:2026-08-01:0351",
    headline: "Confirmed shooting · 71st & Racine block",
    kind: "shooting",
    tier: "CONFIRMED",
    source: "CPD VR gumc-mgzr",
    // 71st & Racine — outside all rings
    lat: 41.7647,
    lon: -87.6539,
    occurredAt: "2026-07-31T22:30:00-05:00",
    publishedAt: "2026-08-01T06:40:00-05:00",
    detectedAt: "2026-08-01T06:40:44-05:00",
    victimNote: "1 victim",
    nearestCampusCode: "GRE",
    distanceMi: 1.2,
    note: "outside all rings, logged",
  },
  {
    id: "inc-heat-advisory",
    sourceRecordId: "nws:IL-heat-advisory:20260801",
    headline: "NWS · Heat Advisory, Cook County",
    kind: "weather-advisory",
    tier: "CONFIRMED",
    source: "NWS live",
    lat: 41.8,
    lon: -87.62,
    occurredAt: "2026-08-01T05:58:00-05:00",
    publishedAt: "2026-08-01T05:58:00-05:00",
    detectedAt: "2026-08-01T05:58:00-05:00",
    note: "11:00–19:00 · outdoor activity guidance applies to all campuses",
  },
];

/* ---------------- morning statuses (07:12) ---------------- */

export const morningStatuses: CampusStatus[] = [
  {
    campusCode: "ENG",
    status: "ELEVATED",
    since: "06:40",
    ruleId: "E-2",
    ruleName: "confirmed-in-ring",
    detail: "Confirmed shooting · morning posture",
    incidentId: "inc-eng-shooting",
  },
  {
    campusCode: "WDL",
    status: "MONITOR",
    since: "06:33",
    ruleId: "M-1",
    ruleName: "two-outlet-corroboration",
    detail: "Corroborated news · unconfirmed",
    incidentId: "inc-wdl-shotsfired",
  },
  { campusCode: "HYP", status: "CLEAR", since: "07:10", detail: "No qualifying signals" },
  { campusCode: "BRZ", status: "CLEAR", since: "07:10", detail: "No qualifying signals" },
  { campusCode: "WPK", status: "CLEAR", since: "07:10", detail: "No qualifying signals" },
  { campusCode: "GRE", status: "CLEAR", since: "07:10", detail: "No qualifying signals" },
];

/* ---------------- afternoon statuses (14:54, tornado) ---------------- */

export const afternoonStatuses: CampusStatus[] = [
  { campusCode: "WPK", status: "ALERT", since: "14:52", ruleId: "A-1", ruleName: "warning-intersect", detail: "NWS Tornado Warning polygon" },
  { campusCode: "GRE", status: "ALERT", since: "14:52", ruleId: "A-1", ruleName: "warning-intersect", detail: "NWS Tornado Warning polygon" },
  { campusCode: "ENG", status: "ELEVATED", since: "06:40", ruleId: "E-2", ruleName: "confirmed-in-ring", detail: "Confirmed shooting · morning posture" },
  { campusCode: "WDL", status: "MONITOR", since: "06:33", ruleId: "M-1", ruleName: "two-outlet-corroboration", detail: "Corroborated news · unconfirmed" },
  { campusCode: "HYP", status: "CLEAR", since: "07:10", detail: "No qualifying signals" },
  { campusCode: "BRZ", status: "CLEAR", since: "07:10", detail: "No qualifying signals" },
];

export function statusOf(list: CampusStatus[], code: string): CampusStatus | undefined {
  return list.find((s) => s.campusCode === code);
}

/* ---------------- feed health ---------------- */

// Morning: RSS degraded → status calc on 6 of 7 feeds.
export const morningFeeds: FeedHealth[] = [
  { key: "nws", label: "NWS alerts", age: "live · 2 m", state: "ok", inWindow: true, footLabel: "NWS", footValue: "✓ live" },
  { key: "news", label: "News (licensed)", age: "18 m", state: "ok", inWindow: true, expectedWindow: "≤60m window", footLabel: "News", footValue: "✓ 18m" },
  { key: "gdelt", label: "GDELT", age: "41 m", state: "ok", inWindow: true, expectedWindow: "≤90m window", footLabel: "GDELT", footValue: "✓ 41m" },
  { key: "cpdvr", label: "CPD shootings (VR)", age: "26 h · in window", state: "ok", inWindow: true, expectedWindow: "≤48h window", footLabel: "CPD VR", footValue: "✓ 26h" },
  { key: "me", label: "Cook County ME", age: "2 d · in window", state: "ok", inWindow: true, expectedWindow: "≤4d window", footLabel: "ME", footValue: "✓ 2d" },
  { key: "crimes", label: "CPD crimes (all)", age: "8 d · in window", state: "ok", inWindow: true, expectedWindow: "≤9d window", footLabel: "Crimes", footValue: "✓ 8d" },
  { key: "rss", label: "RSS monitors", age: "64 m · degraded", state: "warn", inWindow: false, expectedWindow: "≤60m window", footLabel: "RSS", footValue: "degraded" },
];

// Afternoon: all 7 healthy → status calc on 7 of 7 feeds.
export const afternoonFeeds: FeedHealth[] = [
  { key: "nws", label: "NWS alerts", age: "live · 2 m", state: "ok", inWindow: true, footLabel: "NWS", footValue: "✓ live" },
  { key: "news", label: "News (licensed)", age: "12 m", state: "ok", inWindow: true, expectedWindow: "≤60m window", footLabel: "News", footValue: "✓ 12m" },
  { key: "gdelt", label: "GDELT", age: "28 m", state: "ok", inWindow: true, expectedWindow: "≤90m window", footLabel: "GDELT", footValue: "✓ 28m" },
  { key: "cpdvr", label: "CPD shootings (VR)", age: "32 h · in window", state: "ok", inWindow: true, expectedWindow: "≤48h window", footLabel: "CPD VR", footValue: "✓ 32h" },
  { key: "me", label: "Cook County ME", age: "2 d · in window", state: "ok", inWindow: true, expectedWindow: "≤4d window", footLabel: "ME", footValue: "✓ 2d" },
  { key: "crimes", label: "CPD crimes (all)", age: "8 d · in window", state: "ok", inWindow: true, expectedWindow: "≤9d window", footLabel: "Crimes", footValue: "✓ 8d" },
  { key: "rss", label: "RSS monitors", age: "22 m", state: "ok", inWindow: true, expectedWindow: "≤60m window", footLabel: "RSS", footValue: "✓ 22m" },
];

/* ---------------- Englewood Prep detail: playbook / timeline / contacts ---------------- */

export const englewoodPlaybook: Playbook = {
  status: "ELEVATED",
  role: "Principal",
  author: "ops",
  version: "v3.2",
  steps: [
    { id: "p1", title: "Review overnight intelligence before doors open", detail: "Briefing read · morning posture acknowledged", done: true, actor: "AO", completedAt: "07:02" },
    { id: "p2", title: "Brief front-desk and security staff", detail: "Arrival supervision plan adjusted · east entrance", done: true, actor: "RM", completedAt: "07:09" },
    { id: "p3", title: "Confirm exterior doors are locked", detail: "Front, side, gym, kitchen entry · security desk verifies", done: false },
    { id: "p4", title: "Adjust outdoor activities · morning recess", detail: "Hold K-2 recess indoors until status clears", done: false },
    { id: "p5", title: "Prepare templated parent communication (HOLD)", detail: "Fill-in-the-blank template · do not send without principal review", done: false },
  ],
};

export const englewoodTimeline: TimelineEntry[] = [
  { time: "06:40", text: "CLEAR → ELEVATED · rule E-2 · CPD VR publish", kind: "active" },
  { time: "06:41", text: "Push + email → A. Okafor, M. Reese · delivered", kind: "past" },
  { time: "07:02", text: "Playbook opened · action 1 complete", kind: "past" },
  { time: "07:09", text: "Action 2 complete · RM", kind: "past" },
  { time: "15:30", text: "De-escalates end of data day unless re-qualified", kind: "future" },
];

export const englewoodContacts: Contact[] = [
  { name: "Sgt. Diaz", role: "CPD liaison", value: "ext 4271" },
  { name: "M. Reese", role: "district safety", value: "(312) 555-0148" },
  { name: "L. Patel", role: "school nurse", value: "on-site" },
  { name: "D. Westfall", role: "bus coordinator", value: "ext 1102" },
];

/* ---------------- alerts screen (14:54) ---------------- */

export const alertItems: AlertItem[] = [
  {
    id: "al-tornado",
    status: "ALERT",
    alertClass: "LIVE",
    title: "NWS Tornado Warning · Cook County · WPK + GRE in polygon",
    ruleText: "Rule A-1 · NWS warning polygon intersects campus. Authoritative source, zero latency. De-escalates when warning expires 15:30.",
    time: "14:52 today",
    sourceChip: "NWS · CAP alert",
    deliveryChips: ["Delivered · push 5/5 · SMS 5/5 · email 7/7", "Quiet hours overridden · ALERT tier"],
  },
  {
    id: "al-eng",
    status: "ELEVATED",
    alertClass: "DATA-DAY",
    title: "Confirmed shooting published · 0.31 mi from Englewood Prep",
    ruleText: "Rule E-2 · CPD Violence Reduction publish cycle. Occurred yesterday 21:47 · published this morning. Labeled as morning posture, never implied live.",
    time: "06:40 today",
    sourceChip: "CPD VR · confirmed",
    deliveryChips: ["Delivered · push 2/2 · email 3/3", "Occurred→published gap · 8h 53m · shown"],
  },
  {
    id: "al-wdl",
    status: "MONITOR",
    alertClass: "LIVE",
    title: "Corroborated shots-fired report · 0.44 mi from Woodlawn Academy",
    ruleText: "Rule M-1 · two independent outlets within 20 min. Unconfirmed — will auto-resolve or upgrade when CPD data day publishes.",
    time: "06:33 today",
    sourceChip: "News ×2 · GDELT",
    deliveryChips: ["In-app only · no push at MONITOR tier"],
  },
];

export const tornadoBanner = {
  title: "NWS Tornado Warning intersects Washington Park HS & Greater Grand K-8",
  body: "issued 14:52, in effect until 15:30. Source: National Weather Service · authoritative · real time. Dismissal window affected.",
  escalatedAt: "14:52:07",
  elapsed: "02:41 ELAPSED",
};

export const networkImpact = [
  { label: "On alert", color: "alert" as const, count: 2, campuses: "WPK · GRE" },
  { label: "Elevated", color: "elevated" as const, count: 1, campuses: "ENG" },
  { label: "Monitor", color: "monitor" as const, count: 1, campuses: "WDL" },
  { label: "Clear", color: "clear" as const, count: 2, campuses: "HYP · BRZ" },
];

export const deliveryAudit = [
  { label: "Push (PWA) · 5 recip", value: "14:52:09 ✓", ok: true },
  { label: "SMS · Twilio · 5 recip", value: "14:52:12 ✓", ok: true },
  { label: "Email · Postmark · 7 recip", value: "14:52:15 ✓", ok: true },
  { label: "Quiet hours", value: "overridden · policy", ok: false },
  { label: "Dedup", value: "1 event · 1 alert", ok: false },
];

/* ---------------- admin screen ---------------- */

export const thresholds: Threshold[] = [
  { label: "M-1 corroboration window", value: "2 outlets · 20 min" },
  { label: "E-1 weather trigger", value: "NWS watch ∩ campus" },
  { label: "E-2 confirmed-in-ring window", value: "latest data day" },
  { label: "A-1 warning trigger", value: "NWS warning ∩ campus" },
  { label: "A-2 confirmed shooting ring", value: "0.25 mi · data day" },
  { label: "De-escalation", value: "ring clear + window expiry" },
];

export const dataSources: DataSourceToggle[] = [
  { label: "NWS alerts", state: "ON · live", on: true },
  { label: "CPD shootings (VR)", state: "ON · ≤48h window", on: true },
  { label: "CPD crimes", state: "ON · ≤9d window", on: true },
  { label: "Cook County ME", state: "ON · ≤4d window", on: true },
  { label: "News (licensed)", state: "ON · ≤60m window", on: true },
  { label: "GDELT", state: "ON · ≤90m window", on: true },
  { label: "RSS monitors", state: "ON · ≤60m window", on: true },
  { label: "Citizen overlay (optional)", state: "OFF · not contracted", on: false, optional: true },
];

/* ---------------- audit + accuracy ledger ---------------- */

export const auditEvents: AuditEvent[] = [
  { id: "a1", time: "14:52:07", type: "STATUS", statusColor: "ALERT", event: "WPK, GRE · CLEAR → ALERT · rule A-1 · NWS Tornado Warning polygon", evidence: "NWS CAP id · rules v2.0" },
  { id: "a2", time: "14:52:12", type: "DELIVERY", event: "ALERT · push 5/5 · SMS 5/5 · email 7/7 · quiet hours overridden by policy", evidence: "msg ids · Twilio, Postmark" },
  { id: "a3", time: "07:09:33", type: "ACTION", event: 'ENG playbook · "Brief front-desk and security staff" complete · R. Moore', evidence: "playbook v3.2 · step 2" },
  { id: "a4", time: "06:41:02", type: "DELIVERY", event: "ELEVATED · push 2/2 · email 3/3 · A. Okafor, M. Reese, J. Chen", evidence: "msg ids" },
  { id: "a5", time: "06:40:51", type: "STATUS", statusColor: "ELEVATED", event: "ENG · CLEAR → ELEVATED · rule E-2 · confirmed shooting 0.31 mi · occurred yest 21:47, published 06:40", evidence: "CPD VR row id · rules v2.0" },
  { id: "a6", time: "06:40:44", type: "INGEST", event: "CPD VR publish cycle · 3 new records in network scope · freshness 26 h · in window", evidence: "query hash · row ids" },
  { id: "a7", time: "06:12:20", type: "LOGIN", event: "M. Reese · SSO · Google Workspace", evidence: "session id" },
];

export const ledgerMetrics: LedgerMetric[] = [
  { label: "Median detection latency", value: "41 s", pct: 92, barColor: "ink", note: "publish → surfaced · within one poll cycle" },
  { label: "Corroborated → CPD-confirmed", value: "96%", pct: 96, barColor: "clear", note: "27 of 28 · trailing 30 d" },
  { label: "Median detect → confirm gap", value: "22.4 h", pct: 62, barColor: "ink", note: "fast layer leads the record by ~a day" },
  { label: "False ALERTs · production", value: "0", pct: 2, barColor: "clear", note: "61 consecutive days" },
  { label: "Feed uptime · 7 sources", value: "99.2%", pct: 99, barColor: "clear", note: "trailing 30 d · degrades logged" },
];

/* ---------------- briefing intelligence feed ---------------- */

export interface FeedRow {
  time: string;
  title: string;
  detail: string;
  chips: { cls: "c-conf" | "c-corr" | "c-rep"; label: string }[];
  badge: "CONFIRMED" | "CORROBORATED" | "REPORTED";
}

export const intelligenceFeed: FeedRow[] = [
  {
    time: "06:40 today",
    title: "Confirmed shooting · 63rd & Halsted block",
    detail: "occurred yest 21:47 · 1 victim, non-fatal · 0.31 mi from ENG",
    chips: [
      { cls: "c-conf", label: "CPD VR gumc-mgzr" },
      { cls: "c-corr", label: "Block Club" },
    ],
    badge: "CONFIRMED",
  },
  {
    time: "06:33 today",
    title: "Corroborated · shots-fired report, 65th & Cottage Grove",
    detail: "2 outlets, 58 min ago · 0.44 mi from WDL · awaiting CPD record",
    chips: [
      { cls: "c-corr", label: "News ×2" },
      { cls: "c-corr", label: "GDELT" },
    ],
    badge: "CORROBORATED",
  },
  {
    time: "yest 22:30",
    title: "Confirmed shooting · 71st & Racine block",
    detail: "published 06:40 · 1.2 mi from nearest campus · outside all rings, logged",
    chips: [{ cls: "c-conf", label: "CPD VR" }],
    badge: "CONFIRMED",
  },
  {
    time: "05:58 today",
    title: "NWS · Heat Advisory, Cook County",
    detail: "11:00–19:00 · outdoor activity guidance applies to all campuses",
    chips: [{ cls: "c-conf", label: "NWS live" }],
    badge: "CONFIRMED",
  },
];

export const PERMANENT_DISCLAIMER =
  "Decision support, not dispatch. Watch never instructs lockdown. Defer to police and district protocol.";
