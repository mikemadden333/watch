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
import type { Incident } from "@/lib/types";

const EL = "#e8a13a"; // gun-violence signal color (amber, matches the CEO board)
const WINDOW = 125;    // the contagion window, in days

function isFatal(note?: string): boolean {
  return !!note && /fatal/i.test(note) && !/non-fatal/i.test(note);
}

/* Plain-language read of the current situation near the campus. */
function heatRead(rings: PulseRing[]) {
  const fresh14 = rings.filter((r) => r.ageDays <= 14).length;
  const fresh30 = rings.filter((r) => r.ageDays <= 30).length;
  const near = rings.filter((r) => r.distanceMi <= 0.25).length;
  const nearest = rings.length ? Math.min(...rings.map((r) => r.distanceMi)) : null;
  const recentDays = rings.length ? Math.min(...rings.map((r) => r.ageDays)) : null;
  let label = "Quiet", cls = "clr";
  if (fresh14 >= 2 || (fresh14 >= 1 && near >= 1)) { label = "Running hot"; cls = "hot"; }
  else if (fresh30 >= 1 || rings.length >= 3) { label = "Simmering"; cls = "warm"; }
  return { label, cls, fresh14, fresh30, near, nearest, recentDays };
}

/* ---------------- the contagion / decay infographic ----------------
   Each confirmed incident is a ring on a decay curve: the fresher it is,
   the higher and brighter it sits (top-right = today, still hot); as an
   incident ages it slides left and fades — the danger cooling over 125
   days, the way the research describes it. */
function DecayBand({ rings }: { rings: PulseRing[] }) {
  const W = 340, H = 138, padL = 6, padR = 6, padT = 12, padB = 22;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const bottom = padT + plotH;
  const x = (age: number) => padL + plotW - (Math.min(WINDOW, Math.max(0, age)) / WINDOW) * plotW;
  const decay = (age: number) => Math.max(0, 1 - Math.min(WINDOW, age) / WINDOW);
  const y = (d: number) => padT + (1 - d) * plotH;
  const curve = Array.from({ length: 26 }, (_, i) => { const age = WINDOW - (i / 25) * WINDOW; return `${x(age).toFixed(1)},${y(decay(age)).toFixed(1)}`; }).join(" ");

  return (
    <div className="pdecay">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 172, display: "block" }}>
        <defs>
          <linearGradient id="pdg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={EL} stopOpacity="0.015" />
            <stop offset="1" stopColor={EL} stopOpacity="0.16" />
          </linearGradient>
        </defs>
        <polygon points={`${padL},${bottom} ${curve} ${padL + plotW},${bottom}`} fill="url(#pdg)" />
        <polyline points={curve} fill="none" stroke={EL} strokeOpacity="0.45" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={padL} y1={bottom} x2={W - padR} y2={bottom} stroke="#2b3555" strokeWidth="0.8" />
        {rings.map((r) => {
          const d = decay(r.ageDays);
          const cx = x(r.ageDays), cy = y(d), rad = 2.5 + 6 * d;
          const col = isFatal(r.victimNote) ? "#e5564b" : EL;
          return (
            <g key={r.id}>
              <circle cx={cx} cy={cy} r={rad} fill={col} fillOpacity={0.14 + 0.34 * d} stroke={col} strokeOpacity={0.4 + 0.5 * d} strokeWidth="0.8" />
              <circle cx={cx} cy={cy} r="1.1" fill={col} fillOpacity={0.6 + 0.4 * d} />
            </g>
          );
        })}
      </svg>
      <div className="ptl-axis"><span>125 days ago · cooled</span><span>today · hot →</span></div>
    </div>
  );
}

/* ---------------- leader altitude ---------------- */

function LeaderPulse({ data, campus }: { data: NetworkData; campus: Campus }) {
  const rings = pulseForCampus(data.incidents, campus);
  const total = rings.length;
  const hr = heatRead(rings);
  const read =
    total === 0
      ? `It's quiet. Nothing has been confirmed near ${campus.name} in the last 125 days.`
      : `${hr.fresh14 > 0 ? `${hr.fresh14} confirmed in the last two weeks` : "Nothing in the last two weeks"}${hr.nearest != null ? `, the closest ${hr.nearest} miles from the door` : ""}. ${
          hr.label === "Running hot"
            ? "This block is active — the kind of stretch where one incident tends to pull another in behind it."
            : hr.label === "Simmering"
            ? "Not spiking, but not settled either. Worth keeping an eye on the walk routes."
            : "The neighborhood has been calm lately, though the record still carries older incidents."
        }`;

  return (
    <>
      <div className="head">
        <div className="sentence">The pattern around {campus.name}</div>
        <span className="micro">Pulse · how much violence is near your campus, how close, and how recently — and how long it stays live</span>
      </div>

      <div className="pulsewrap">
        {/* the situation read + the decay infographic */}
        <div className="card psit" data-tour="pulse-graphic">
          <div className="psit-top">
            <span className={`psit-badge ${hr.cls}`}>{hr.label}</span>
            <span className="psit-nums">
              <b>{total}</b> in 125 days · <b>{hr.fresh14}</b> in the last two weeks{hr.nearest != null ? <> · closest <b>{hr.nearest} mi</b></> : null}
            </span>
          </div>
          <p className="psit-read">{read}</p>
          {total > 0 ? <DecayBand rings={rings} /> : null}
        </div>

        {/* the contagion explainer */}
        <div className="card pexplain">
          <div className="micro" style={{ marginBottom: 8 }}>Violence is a contagion</div>
          <p>
            One shooting sharply raises the odds of another one close by — for weeks — and then the danger slowly
            cools. Watch holds every confirmed incident for about 125 days, so the heat near your campus stays visible
            while it lasts. Each ring above is one incident: the fresher it is, the higher and brighter it sits; as it
            ages it slides left and fades.
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
                    <span style={isFatal(r.victimNote) ? { color: "var(--alert)", fontWeight: 600 } : undefined}>
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
