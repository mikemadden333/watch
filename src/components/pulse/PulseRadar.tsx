"use client";

/* Interactive contagion radar — click any ring (or list row) to inspect that
   incident. Client component; receives serializable PulseRing[] from the server. */

import { useState } from "react";
import type { PulseRing } from "@/lib/pulse";
import { PANE_SPAN_MI, PULSE_RADIUS_MI, PULSE_WINDOW_DAYS } from "@/lib/pulse";
import { incidentTypeWord, placeOf } from "@/lib/voice";
import type { Incident } from "@/lib/types";

const EL = "#e8a13a";
const RED = "#e5564b";
const UNITS_PER_MI = 100 / PANE_SPAN_MI;
const HOT_DAYS = 21;
const clamp = (n: number) => Math.max(6, Math.min(94, n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const isFatal = (note?: string) => !!note && /fatal/i.test(note) && !/non-fatal/i.test(note);
const titleOf = (r: PulseRing) => `${cap(incidentTypeWord({ kind: r.kind } as Incident))} · ${placeOf({ headline: r.headline } as Incident)}`;

export default function PulseRadar({ rings }: { rings: PulseRing[] }) {
  const [sel, setSel] = useState<string | null>(null);
  const r025 = 0.25 * UNITS_PER_MI;
  const r05 = 0.5 * UNITS_PER_MI;
  const ordered = [...rings].sort((a, b) => b.ageDays - a.ageDays);
  const selected = rings.find((r) => r.id === sel) ?? null;

  return (
    <div className="pradarblock">
      <div className="pradarwrap">
        <svg viewBox="0 0 100 100" className="pradar" preserveAspectRatio="xMidYMid meet" role="img"
          aria-label="Radar of confirmed gun violence around the campus. Click a ring to inspect it."
          onClick={() => setSel(null)}>
          <defs>
            <radialGradient id="pr-core" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor={EL} stopOpacity="0.30" />
              <stop offset="1" stopColor={EL} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="pr-sweep" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={EL} stopOpacity="0.22" />
              <stop offset="1" stopColor={EL} stopOpacity="0" />
            </linearGradient>
          </defs>

          <circle cx="50" cy="50" r={r05} className="pguide" />
          <circle cx="50" cy="50" r={r025} className="pguide" />
          <line x1="50" y1={50 - r05} x2="50" y2={50 + r05} className="pcross" />
          <line x1={50 - r05} y1="50" x2={50 + r05} y2="50" className="pcross" />

          <g className="psweep">
            <polygon points={`50,50 50,${50 - r05 - 3} ${50 + 14},${50 - r05 + 4}`} fill="url(#pr-sweep)" />
          </g>

          {ordered.map((r) => {
            const cx = clamp(r.x), cy = clamp(r.y);
            const col = isFatal(r.victimNote) ? RED : EL;
            const hot = r.ageDays <= HOT_DAYS;
            const coreR = 1.4 + 2.6 * r.decayFrac;
            const delay = (r.ageDays / PULSE_WINDOW_DAYS) * 2.4;
            const isSel = r.id === sel;
            return (
              <g key={r.id} className="pinc" onClick={(e) => { e.stopPropagation(); setSel(r.id); }} style={{ cursor: "pointer" }}>
                {hot && (
                  <circle cx={cx} cy={cy} r={coreR + 1.6} className="pring" fill="none" stroke={col} strokeWidth="0.8"
                    style={{ transformOrigin: `${cx}px ${cy}px`, animationDelay: `${delay.toFixed(2)}s` }} />
                )}
                <circle cx={cx} cy={cy} r={coreR + 2.4} fill={col} fillOpacity={0.05 + 0.12 * r.decayFrac} />
                <circle cx={cx} cy={cy} r={coreR} fill={col} fillOpacity={0.28 + 0.45 * r.decayFrac}
                  stroke={col} strokeOpacity={0.5 + 0.4 * r.decayFrac} strokeWidth="0.5" />
                {isSel && <circle cx={cx} cy={cy} r={coreR + 3.4} fill="none" stroke="#f3f1ea" strokeWidth="0.9" strokeOpacity="0.9" />}
                {/* invisible hit target */}
                <circle cx={cx} cy={cy} r={Math.max(4.5, coreR + 3)} fill="transparent" />
              </g>
            );
          })}

          <circle cx="50" cy="50" r="12" fill="url(#pr-core)" className="pcampusglow" />
          <circle cx="50" cy="50" r="2.6" className="pcampus" />
          <circle cx="50" cy="50" r="2.6" className="pcampusping" fill="none" />
        </svg>

        <div className="pradar-legend">
          <span><i className="lg-campus" />Campus</span>
          <span><i className="lg-hot" />Fresh · still hot</span>
          <span><i className="lg-cool" />Cooling</span>
          <span className="pradar-scale">inner ring 0.25 mi · outer {PULSE_RADIUS_MI} mi · tap a ring</span>
        </div>
      </div>

      {selected && (
        <div className={`pdetail${isFatal(selected.victimNote) ? " fatal" : ""}`}>
          <button type="button" className="pdetail-x" onClick={() => setSel(null)} aria-label="Close">×</button>
          <div className="pdetail-t">{titleOf(selected)}</div>
          <div className="pdetail-sub">
            <b>{selected.distanceMi} mi {selected.bearing}</b> of campus · {selected.ageLabel}
            {selected.victimNote ? <> · <span className={isFatal(selected.victimNote) ? "fatalw" : ""}>{selected.victimNote}</span></> : null}
          </div>
          <div className="pdetail-meta">
            {selected.ageDays <= HOT_DAYS ? "Inside the active contagion window · " : "Cooling · "}
            still on the record for ~{selected.fadesInDays} more days
          </div>
        </div>
      )}

      <div className="plist">
        {rings.map((r) => (
          <button
            type="button"
            className={`prow${r.id === sel ? " on" : ""}`}
            key={r.id}
            onClick={() => setSel(r.id === sel ? null : r.id)}
          >
            <div className="top">
              <span>{titleOf(r)}</span>
              <span className="mono num" style={{ color: r.ageDays <= 7 ? EL : "var(--ink)" }}>{r.ageLabel}</span>
            </div>
            <div className="sub">
              {r.distanceMi} mi {r.bearing}
              {r.victimNote ? (
                <span style={isFatal(r.victimNote) ? { color: "var(--alert)", fontWeight: 600 } : undefined}>
                  {" · "}{r.victimNote}
                </span>
              ) : null}
              {" · "}<span className="mono" style={{ color: "var(--faint)" }}>cools in ~{r.fadesInDays} d</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
