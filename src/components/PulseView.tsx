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
  baselineSentence,
  elevatedRadiusUnits,
  PULSE_RADIUS_MI,
  type PulseRing,
} from "@/lib/pulse";
import { pulseHeader, numWord } from "@/lib/voice";
import { distanceMi } from "@/lib/geo";

const EL = "#C75B12"; // elevated / ring color

/* ---------------- the schematic map ---------------- */

function RingMap({ campus, rings }: { campus: Campus; rings: PulseRing[] }) {
  const er = elevatedRadiusUnits(campus);
  return (
    <div className="mappane">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
        {/* faint schematic grid */}
        <g stroke="#E0DCD2" strokeWidth="0.4">
          <line x1="0" y1="33" x2="100" y2="33" />
          <line x1="0" y1="66" x2="100" y2="66" />
          <line x1="33" y1="0" x2="33" y2="100" />
          <line x1="66" y1="0" x2="66" y2="100" />
        </g>
        {/* elevated ring radius, dashed */}
        <circle cx="50" cy="50" r={er} fill="none" stroke="#B8B3A6" strokeWidth="0.4" strokeDasharray="1.6 1.4" />
        {/* incident rings — oldest first so fresh sits on top */}
        {[...rings].reverse().map((r) => (
          <g key={r.id}>
            <circle cx={r.x} cy={r.y} r={r.rUnits} fill={EL} fillOpacity={r.fillOpacity} stroke={EL} strokeOpacity={r.strokeOpacity} strokeWidth="0.5" />
            <circle cx={r.x} cy={r.y} r="0.9" fill={EL} fillOpacity={Math.max(0.4, r.decayFrac)} stroke="#fff" strokeWidth="0.4" />
          </g>
        ))}
        {/* campus mark */}
        <circle cx="50" cy="50" r="3.1" fill={EL} stroke="#1B1A17" strokeWidth="0.7" />
        <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontSize="2.5" fontFamily="Menlo, monospace" fontWeight="700" fill="#fff">
          {campus.code}
        </text>
      </svg>

      <div className="card" style={{ position: "absolute", left: 16, bottom: 16, padding: "11px 15px", fontSize: 10.5, color: "var(--mut)", maxWidth: 330, lineHeight: 1.55 }}>
        Each ring is one <b style={{ color: "var(--ink)" }}>verified</b> incident. Rings fade over 125 days — the window research says
        violence stays live in a community. Overlap of fresh rings is the pattern to notice.
      </div>
      <div className="micro" style={{ position: "absolute", right: 16, bottom: 16 }}>
        Schematic · real positions, not to scale
      </div>
    </div>
  );
}

/* ---------------- leader altitude ---------------- */

function LeaderPulse({ data, campus }: { data: NetworkData; campus: Campus }) {
  const rings = pulseForCampus(data.incidents, campus);
  const fresh = freshThisWeek(rings);
  // most-recent confirmed near campus (for the empty-state sentence)
  const nearestConfirmed = data.incidents
    .filter((i) => i.tier === "CONFIRMED" && i.lat && i.lon && distanceMi({ lat: i.lat, lon: i.lon }, campus) <= PULSE_RADIUS_MI + 0.05)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];
  const mostRecentDays = nearestConfirmed
    ? Math.round((Date.now() - new Date(nearestConfirmed.occurredAt).getTime()) / 86400000)
    : undefined;

  return (
    <>
      <div className="head">
        <div className="sentence">{pulseHeader(campus.name, rings.length, mostRecentDays)}</div>
        <span className="micro">Last 125 days · {PULSE_RADIUS_MI} mi radius</span>
      </div>

      <div className="wrap2">
        <RingMap campus={campus} rings={rings} />

        <div className="rail2">
          <div className="pcard">
            <div className="micro">Active rings · this campus</div>
            <div style={{ display: "flex", gap: 26, marginTop: 8, alignItems: "baseline" }}>
              <div><span className="pnum num">{rings.length}</span> <span className="micro">active</span></div>
              <div><span className="pnum num" style={{ color: fresh ? EL : "var(--mut)" }}>{fresh}</span> <span className="micro">fresh this week</span></div>
            </div>
            <div className="note" style={{ marginTop: 8 }}>{baselineSentence(rings)}</div>
          </div>

          {rings.length ? (
            <div className="plist">
              {rings.map((r) => (
                <div className="prow" key={r.id}>
                  <div className="top">
                    <span>{r.headline}</span>
                    <span className="mono num" style={{ color: r.ageDays <= 7 ? EL : "var(--ink)" }}>{r.ageLabel}</span>
                  </div>
                  <div className="sub">
                    {r.distanceMi} mi {r.bearing}
                    {r.victimNote ? ` · ${r.victimNote}` : ""}
                    {r.ageDays > 60 ? ` · fades fully in ${r.fadesInDays} days` : ""}
                  </div>
                  <div className="fade"><i style={{ width: `${Math.round(r.decayFrac * 100)}%`, opacity: Math.max(0.35, r.decayFrac) }} /></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="plist">
              <div className="prow">
                <div className="sub" style={{ fontSize: 12.5 }}>
                  No verified incidents in the window near {campus.name}. When the record shows one, it appears here and fades over 125 days.
                </div>
              </div>
            </div>
          )}

          <div className="note">
            Pulse describes what happened and how recently. <b style={{ color: "var(--ink)" }}>It predicts nothing.</b> The 125-day
            window comes from Yale research on how long gun violence stays active in a community after an incident
            (Green, Horel &amp; Papachristos, 2017). <Link href="/limitations" style={{ textDecoration: "underline" }}>Read about the research</Link>
          </div>
        </div>
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
          <circle cx="13" cy="13" r="12" fill="none" stroke="#B8B3A6" strokeWidth="0.7" strokeDasharray="2 1.6" />
          {top ? <circle cx="13" cy="13" r="7" fill={EL} fillOpacity={top.fillOpacity} stroke={EL} strokeOpacity={top.strokeOpacity} /> : null}
          <circle cx="13" cy="13" r="2.4" fill={EL} stroke="#1B1A17" strokeWidth="0.6" />
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
