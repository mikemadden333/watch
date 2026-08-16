/* ============================================================
   Watch V2 Pulse (directive §4). Per-campus: a schematic ring map
   (real relative positions, not to scale) where each CONFIRMED,
   ring-eligible incident in the last 125 days is a translucent ring
   that fades with age; plus a rail with counts, a computed baseline
   sentence, a decaying incident list, and the research citation.
   CEO altitude: a grid of six mini-Pulse cards.
   Describes what happened and how recently. It predicts nothing.
   ============================================================ */

import Link from "next/link";
import type { NetworkData } from "@/lib/networkData";
import type { Campus } from "@/lib/types";
import {
  pulseForCampus,
  freshThisWeek,
  PULSE_RADIUS_MI,
  type PulseRing,
} from "@/lib/pulse";
import { numWord, incidentTypeWord, placeOf } from "@/lib/voice";
import { distanceMi } from "@/lib/geo";
import type { Incident } from "@/lib/types";

const EL = "#e8a13a"; // gun-violence signal color (amber, matches the CEO board)
const BUCKETS = 9; // ~14-day columns across the 125-day window
const DAYS_PER = 14;

/* ---------------- the timeline infographic ---------------- */

function Timeline({ rings }: { rings: PulseRing[] }) {
  // count incidents into ~2-week buckets; bucket 0 = most recent (right edge)
  const counts = new Array(BUCKETS).fill(0);
  for (const r of rings) counts[Math.min(BUCKETS - 1, Math.floor(r.ageDays / DAYS_PER))]++;
  const max = Math.max(1, ...counts);
  const W = 320, H = 96, padB = 18, padT = 8, gap = 5;
  const bw = (W - gap * (BUCKETS - 1)) / BUCKETS;
  const plot = H - padB - padT;
  // oldest on the left → reverse so index 0 (newest) sits on the right
  const cols = [...counts].reverse();

  return (
    <div className="ptimeline">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 150, display: "block" }}>
        {/* baseline + one faint gridline */}
        <line x1="0" y1={H - padB} x2={W} y2={H - padB} stroke="#2b3555" strokeWidth="0.8" />
        <line x1="0" y1={padT + plot / 2} x2={W} y2={padT + plot / 2} stroke="#1e2740" strokeWidth="0.6" strokeDasharray="2 3" />
        {cols.map((c, i) => {
          const h = c === 0 ? 0 : Math.max(3, (c / max) * plot);
          const x = i * (bw + gap);
          const y = H - padB - h;
          const newest = i === BUCKETS - 1;
          return (
            <g key={i}>
              <rect x={x} y={y} width={bw} height={h} rx={1.5} fill={EL} fillOpacity={newest ? 1 : 0.5 + 0.4 * (i / (BUCKETS - 1))} />
              {c > 0 ? <text x={x + bw / 2} y={y - 3} textAnchor="middle" fontSize="7" fontFamily="Menlo, monospace" fill="var(--ink2)">{c}</text> : null}
            </g>
          );
        })}
      </svg>
      <div className="ptl-axis">
        <span>125 days ago</span>
        <span>today →</span>
      </div>
    </div>
  );
}

/* ---------------- leader altitude ---------------- */

function LeaderPulse({ data, campus }: { data: NetworkData; campus: Campus }) {
  const rings = pulseForCampus(data.incidents, campus);
  const total = rings.length;
  const fresh = freshThisWeek(rings);
  const fatal = rings.filter((r) => r.victimNote && /fatal/i.test(r.victimNote) && !/non-fatal/i.test(r.victimNote)).length;
  const nearestConfirmed = data.incidents
    .filter((i) => i.tier === "CONFIRMED" && i.lat && i.lon && distanceMi({ lat: i.lat, lon: i.lon }, campus) <= PULSE_RADIUS_MI + 0.05)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];
  const mostRecentDays = nearestConfirmed
    ? Math.round((Date.now() - new Date(nearestConfirmed.occurredAt).getTime()) / 86400000)
    : undefined;
  // how close: within a quarter-mile
  const near = rings.filter((r) => r.distanceMi <= 0.25).length;

  return (
    <>
      <div className="head">
        <div className="sentence">
          {total === 0
            ? `No verified incidents within a half-mile of ${campus.name} in the last 125 days.`
            : `${total} verified incident${total === 1 ? "" : "s"} within a half-mile of ${campus.name} in the last 125 days.`}
        </div>
        <span className="micro">Confirmed by police or the medical examiner · within a half-mile</span>
      </div>

      <div className="pulsewrap">
        {/* the infographic */}
        <div className="card pchart" data-tour="pulse-graphic">
          <div className="pstats">
            <div className="pstat"><b>{total}</b><span>incidents</span></div>
            <div className="pstat"><b style={{ color: fresh ? EL : "var(--ink)" }}>{fresh}</b><span>in the last week</span></div>
            <div className="pstat"><b style={{ color: fatal ? "var(--alert)" : "var(--ink)" }}>{fatal}</b><span>fatal</span></div>
            <div className="pstat"><b>{mostRecentDays ?? "—"}</b><span>days since the last</span></div>
            <div className="pstat"><b>{near}</b><span>within a quarter-mile</span></div>
          </div>
          {total === 0 ? (
            <div className="note" style={{ padding: "26px 4px" }}>
              Nothing verified near {campus.name} in the window. When the official record shows an incident, it appears
              here and stays on the board for 125 days.
            </div>
          ) : (
            <Timeline rings={rings} />
          )}
        </div>

        {/* why 125 days — the research */}
        <div className="card pexplain">
          <div className="micro" style={{ marginBottom: 8 }}>Why 125 days</div>
          <p>
            A shooting doesn&apos;t end when the sirens leave. A Yale study of gun violence in Chicago found that one
            incident sharply raises the odds of another one nearby, for weeks after. Watch keeps every verified
            incident on the board for 125 days, so you see the pattern near your campus — not just today.
          </p>
          <p className="pcite">
            Green, Horel &amp; Papachristos, <i>Modeling Contagion Through Social Networks to Explain and Predict
            Gunshot Violence in Chicago</i>, JAMA Internal Medicine, 2017. <Link href="/limitations">More on the research →</Link>
          </p>
        </div>

        {/* the incidents */}
        {total > 0 ? (
          <div className="plist">
            {rings.map((r) => (
              <div className="prow" key={r.id}>
                <div className="top">
                  <span>{cap(incidentTypeWord({ kind: r.kind } as Incident))} · {placeOf({ headline: r.headline } as Incident)}</span>
                  <span className="mono num" style={{ color: r.ageDays <= 7 ? EL : "var(--ink)" }}>{r.ageLabel}</span>
                </div>
                <div className="sub">
                  {r.distanceMi} mi {r.bearing}
                  {r.victimNote ? (
                    <span style={/fatal/i.test(r.victimNote) && !/non-fatal/i.test(r.victimNote) ? { color: "var(--alert)", fontWeight: 600 } : undefined}>
                      {" · "}{r.victimNote}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}

/* ---------------- CEO altitude: mini grid ---------------- */

function MiniPulse({ data, base, campus }: { data: NetworkData; base: string; campus: Campus }) {
  const rings = pulseForCampus(data.incidents, campus);
  const fresh = freshThisWeek(rings);
  const top = rings[0];
  return (
    <Link className="pcard" href={`${base}/pulse?view=leader&campus=${campus.code}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="26" height="26" viewBox="0 0 26 26" style={{ flex: "0 0 auto" }}>
          <circle cx="13" cy="13" r="12" fill="none" stroke="#3a4566" strokeWidth="0.7" strokeDasharray="2 1.6" />
          {top ? <circle cx="13" cy="13" r="7" fill={EL} fillOpacity={top.fillOpacity} stroke={EL} strokeOpacity={top.strokeOpacity} /> : null}
          <circle cx="13" cy="13" r="2.4" fill="#f3f1ea" stroke="#0b0f1c" strokeWidth="0.6" />
        </svg>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{campus.name}</div>
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 12, alignItems: "baseline" }}>
        <div><span className="pnum num" style={{ fontSize: 24 }}>{rings.length}</span> <span className="micro">active</span></div>
        <div><span className="pnum num" style={{ fontSize: 24, color: fresh ? EL : "var(--mut)" }}>{fresh}</span> <span className="micro">fresh</span></div>
      </div>
    </Link>
  );
}

/* ---------------- entry ---------------- */

export default function PulseView({
  data,
  base,
  view,
  campus,
}: {
  data: NetworkData;
  base: string;
  view: "ceo" | "leader";
  campus?: string;
}) {
  const rank: Record<string, number> = { ALERT: 0, ELEVATED: 1, MONITOR: 2, CLEAR: 3 };
  const sorted = [...data.campuses].sort((a, x) => {
    const sa = data.statuses.find((s) => s.campusCode === a.code)?.status ?? "CLEAR";
    const sx = data.statuses.find((s) => s.campusCode === x.code)?.status ?? "CLEAR";
    return rank[sa] - rank[sx];
  });

  if (view === "leader") {
    const c = data.campuses.find((x) => x.code === campus) ?? sorted[0];
    if (!c) return <div className="v2hero"><div className="sentence">No campuses configured.</div></div>;
    return <LeaderPulse data={data} campus={c} />;
  }

  const totalActive = sorted.reduce((n, c) => n + pulseForCampus(data.incidents, c).length, 0);
  return (
    <>
      <div className="head">
        <div className="sentence">
          {totalActive === 0
            ? "Nothing is fresh near any campus right now."
            : `${cap(numWord(totalActive))} verified incident${totalActive === 1 ? " sits" : "s sit"} in the rings across your network.`}
        </div>
        <span className="micro">Last 125 days · {PULSE_RADIUS_MI} mi radius · per campus</span>
      </div>
      <div className="pulsegrid">
        {sorted.map((c) => (
          <MiniPulse key={c.code} data={data} base={base} campus={c} />
        ))}
      </div>
    </>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
