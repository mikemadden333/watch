"use client";

/* The campus safety dial — a 24-hour radial infographic for the principal view.
   Angle = the hour an incident occurred (midnight at top, like a clock). Rings =
   how long ago (48h → 7d → 30d → 125d). Click a window chip to focus a band;
   click a dot to inspect the incident. Client component; serializable input. */

import { useState } from "react";

export interface DialInc {
  id: string;
  hour: number;   // 0–23, Central time
  ageDays: number;
  fatal: boolean;
  title: string;  // "Shooting · 3400 W 16th St"
  sub: string;    // "0.31 mi W · 34 d ago"
}

const BANDS = [
  { max: 2, r0: 6, r1: 13 },
  { max: 7, r0: 15, r1: 21 },
  { max: 30, r0: 23, r1: 31 },
  { max: 125, r0: 33, r1: 45 },
];
const WINDOWS = [
  { key: "48h", lab: "Last 48 hours", days: 2 },
  { key: "7d", lab: "Last 7 days", days: 7 },
  { key: "30d", lab: "Last 30 days", days: 30 },
  { key: "125d", lab: "Last 125 days", days: 125 },
];
const TAU = Math.PI * 2;

function bandOf(age: number): number {
  for (let i = 0; i < BANDS.length; i++) if (age <= BANDS[i].max) return i;
  return 3;
}
function colorFor(inc: DialInc): string {
  if (inc.fatal) return "#e5564b";
  return ["#f4bf63", "#e8a13a", "#c88a3a", "rgba(232,161,58,.42)"][bandOf(inc.ageDays)];
}
/** stable per-id jitter so a dot doesn't jump between renders */
function jitter(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  return h / 0xffff;
}
function fmtH(hour: number): string {
  const ap = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h} ${ap}`;
}

export default function SafetyDial({
  incidents,
  campusName,
  schoolStart,
  schoolEnd,
}: {
  incidents: DialInc[];
  campusName: string;
  schoolStart: number;
  schoolEnd: number;
}) {
  const [active, setActive] = useState(125);
  const [sel, setSel] = useState<string | null>(null);
  const selected = incidents.find((i) => i.id === sel) ?? null;

  const ang = (hour: number) => -Math.PI / 2 + (hour / 24) * TAU;
  const pos = (inc: DialInc) => {
    const b = BANDS[bandOf(inc.ageDays)];
    const rad = b.r0 + jitter(inc.id) * (b.r1 - b.r0);
    const a = ang(inc.hour) + (jitter(inc.id) - 0.5) * 0.06;
    return { cx: 50 + rad * Math.cos(a), cy: 50 + rad * Math.sin(a) };
  };
  const counts = (days: number) => incidents.filter((i) => i.ageDays <= days).length;

  const total = incidents.length;
  const duringSchool = incidents.filter((i) => i.hour >= schoolStart && i.hour < schoolEnd).length;
  const insight =
    total === 0
      ? `No confirmed violent crime within a mile of ${campusName} in the last 125 days.`
      : `Of ${total} confirmed incident${total === 1 ? "" : "s"} near ${campusName} in 125 days, ${
          duringSchool === 0 ? "none" : duringSchool
        } happened during school hours (${fmtH(schoolStart)}–${fmtH(schoolEnd)}). The rest were evenings, nights, and weekends.`;

  const cardinals: [string, number][] = [["12a", 0], ["6a", 6], ["12p", 12], ["6p", 18]];

  return (
    <div className="sdpanel">
      <div className="sdhead">
        <div className="t">The pattern around {campusName}</div>
        <div className="s">Confirmed violent crime · by hour &amp; recency · last 125 days</div>
      </div>

      <div className="sd-grid">
        <div className="sd-dialwrap">
          <svg viewBox="0 0 100 100" className="sd-dial" onClick={() => setSel(null)} role="img"
            aria-label={`24-hour safety dial for ${campusName}`}>
            <defs>
              <radialGradient id="sd-core" cx="50%" cy="50%" r="50%">
                <stop offset="0" stopColor="#57c191" stopOpacity="0.26" />
                <stop offset="1" stopColor="#57c191" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="sd-sweep" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#e8a13a" stopOpacity="0.16" />
                <stop offset="1" stopColor="#e8a13a" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[13, 21, 31, 45].map((r) => <circle key={r} cx="50" cy="50" r={r} className="sd-guide" />)}
            {Array.from({ length: 24 }, (_, h) => {
              const a = ang(h);
              const outer = 44, inner = h % 6 === 0 ? 41 : 43;
              return <line key={h} x1={50 + outer * Math.cos(a)} y1={50 + outer * Math.sin(a)}
                x2={50 + inner * Math.cos(a)} y2={50 + inner * Math.sin(a)} className="sd-tick" />;
            })}
            {cardinals.map(([t, h]) => {
              const a = ang(h);
              return <text key={t} x={50 + 48 * Math.cos(a)} y={50 + 48 * Math.sin(a) + 1} className="sd-lab" textAnchor="middle">{t}</text>;
            })}

            <g className="sd-sweep">
              <polygon points="50,50 50,5 64,9" fill="url(#sd-sweep)" />
            </g>

            {incidents.map((inc) => {
              const { cx, cy } = pos(inc);
              const inWin = inc.ageDays <= active;
              const isSel = inc.id === sel;
              const col = colorFor(inc);
              const rr = inc.fatal ? 2 : 1.7;
              return (
                <g key={inc.id} className={`sd-inc${inWin ? "" : " dim"}`} style={{ cursor: "pointer" }}
                  onClick={(e) => { e.stopPropagation(); setSel(inc.id); }}>
                  {inWin && <circle cx={cx} cy={cy} r={rr + 1.7} fill={col} fillOpacity={0.16} />}
                  <circle cx={cx} cy={cy} r={rr} fill={col} />
                  {isSel && <circle cx={cx} cy={cy} r={rr + 2.6} fill="none" stroke="#f3f1ea" strokeWidth="0.7" />}
                  <circle cx={cx} cy={cy} r={Math.max(3.2, rr + 2)} fill="transparent" />
                </g>
              );
            })}

            <circle cx="50" cy="50" r="11" fill="url(#sd-core)" />
            <circle cx="50" cy="50" r="2.4" className="sd-campus" />
          </svg>
        </div>

        <div className="sd-side">
          <div className="sd-chips">
            {WINDOWS.map((w) => (
              <button key={w.key} type="button" className={`sd-chip${active === w.days ? " on" : ""}`}
                onClick={() => { setActive(w.days); setSel(null); }}>
                <span className="cl"><span className="ck">{w.key}</span><span className="cn">{w.lab}</span></span>
                <span className="cv">{counts(w.days)}<small>{w.days >= 125 ? "on record" : "confirmed"}</small></span>
              </button>
            ))}
          </div>

          {selected ? (
            <div className={`sd-detail${selected.fatal ? " fatal" : ""}`}>
              <button type="button" className="sd-x" aria-label="Close" onClick={() => setSel(null)}>×</button>
              <div className="sd-dt">{selected.title}</div>
              <div className="sd-ds">{selected.sub} · {fmtH(selected.hour)}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="sd-insight">
        <div className="il">What the pattern shows</div>
        <p>{insight}</p>
      </div>

      <div className="sd-legend">
        <span><i style={{ background: "#f3f1ea" }} />Campus (now)</span>
        <span><i style={{ background: "#f4bf63" }} />Fresh · last 48 h</span>
        <span><i style={{ background: "#e8a13a" }} />Recent</span>
        <span><i style={{ background: "rgba(232,161,58,.42)" }} />Older · cooling</span>
        <span><i style={{ background: "#e5564b" }} />Fatal</span>
        <span className="sd-scale">Angle = hour of day · ring = how long ago · tap a dot</span>
      </div>
    </div>
  );
}
