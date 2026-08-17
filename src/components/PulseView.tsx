/* ============================================================
   Watch V2 Pulse (directive §4). The contagion radar: the campus at
   center, each CONFIRMED gun-violence incident in the last 125 days
   placed at its real distance + bearing. A fresh incident still emits
   an expanding "hot" ripple; as it ages over the 125-day window it
   cools to a faint dot. Grounded in Green, Horel & Papachristos (2017)
   — how long gun violence stays active in a community. Describes what
   happened and how recently. It predicts nothing.
   CEO altitude: a grid of six mini radars.
   ============================================================ */

import Link from "next/link";
import type { NetworkData } from "@/lib/networkData";
import type { Campus, Incident } from "@/lib/types";
import {
  pulseForCampus,
  freshThisWeek,
  PULSE_RADIUS_MI,
  PANE_SPAN_MI,
  PULSE_WINDOW_DAYS,
  type PulseRing,
} from "@/lib/pulse";
import { numWord } from "@/lib/voice";
import PulseRadar from "./pulse/PulseRadar";
import ContagionBanner from "./pulse/ContagionBanner";

const EL = "#e8a13a"; // gun-violence signal color (amber, matches the CEO board)
const RED = "#e5564b";
const UNITS_PER_MI = 100 / PANE_SPAN_MI;

function isFatal(note?: string): boolean {
  return !!note && /fatal/i.test(note) && !/non-fatal/i.test(note);
}
const clamp = (n: number) => Math.max(6, Math.min(94, n));

/* Plain-language read of the current pressure near the campus. */
function heatRead(rings: PulseRing[]) {
  const fresh14 = rings.filter((r) => r.ageDays <= 14).length;
  const fresh30 = rings.filter((r) => r.ageDays <= 30).length;
  const near = rings.filter((r) => r.distanceMi <= 0.25).length;
  const nearest = rings.length ? Math.min(...rings.map((r) => r.distanceMi)) : null;
  const recentDays = rings.length ? Math.round(Math.min(...rings.map((r) => r.ageDays))) : null;
  const pressure = rings.reduce((s, r) => s + r.decayFrac, 0); // sum of live heat
  let label = "Quiet", cls = "clr";
  if (fresh14 >= 2 || (fresh14 >= 1 && near >= 1)) { label = "Running hot"; cls = "hot"; }
  else if (fresh30 >= 1 || rings.length >= 3) { label = "Simmering"; cls = "warm"; }
  return { label, cls, fresh14, fresh30, near, nearest, recentDays, pressure };
}

/* ---------------- leader altitude ---------------- */

function LeaderPulse({ data, campus }: { data: NetworkData; campus: Campus }) {
  const now = new Date();
  const rings = pulseForCampus(data.incidents, campus, now);
  const total = rings.length;
  const hr = heatRead(rings);

  // the freshest incident inside the 7-day contagion window drives the live banner
  const fresh0 = rings[0];
  const trigger =
    fresh0 && fresh0.ageDays < 7
      ? { occurredAt: fresh0.occurredAt, kind: fresh0.kind, distanceMi: fresh0.distanceMi, bearing: fresh0.bearing, fatal: isFatal(fresh0.victimNote) }
      : null;

  const read =
    total === 0
      ? `Quiet. No confirmed gun violence within a half-mile of ${campus.name} in the last ${PULSE_WINDOW_DAYS} days.`
      : hr.label === "Running hot"
      ? `${hr.fresh14} confirmed within a half-mile in the last two weeks${hr.nearest != null ? `, the closest ${hr.nearest} mi from the door` : ""}. By the research, this block is still carrying heat.`
      : hr.label === "Simmering"
      ? `${hr.fresh30} in the last 30 days${hr.nearest != null ? `, closest ${hr.nearest} mi` : ""}. Not spiking, but the block has not fully cooled.`
      : `Nothing in the last two weeks${hr.recentDays != null ? `; the most recent was ${hr.recentDays} days ago` : ""}. Older incidents are still on the ${PULSE_WINDOW_DAYS}-day record, cooling.`;

  return (
    <>
      <div className="head">
        <div className="sentence">The pattern around {campus.name}</div>
        <span className="micro">Pulse · how much confirmed gun violence is near your campus, how close, how recent — and how long it stays live</span>
      </div>

      {trigger ? <ContagionBanner trigger={trigger} nowIso={now.toISOString()} /> : null}

      <div className="pulsewrap">
        <div className="card psit">
          <div className="psit-top">
            <span className="psit-badgewrap">
              <span className="psit-plab">Pressure</span>
              <span className={`psit-badge ${hr.cls}`}>{hr.label}</span>
            </span>
            <span className="psit-nums">
              <b>{total}</b> in {PULSE_WINDOW_DAYS} days · <b>{hr.fresh14}</b> in the last two weeks{hr.nearest != null ? <> · closest <b>{hr.nearest} mi</b></> : null}
            </span>
          </div>

          <p className="psit-read">{read}</p>
          <div className="psit-foot">A read of recent pressure — not today&apos;s campus posture.</div>
        </div>

        <div className="card pexplain">
          <div className="micro" style={{ marginBottom: 8 }}>Why 125 days — violence behaves like a contagion</div>
          <p>
            One shooting sharply raises the odds of another nearby, then the risk cools over the following months.
            Watch keeps every confirmed incident on the radar for about <b>125 days</b> and fades it as it ages, so
            the heat around your campus stays visible for exactly as long as the research says it lasts.
          </p>
          <p className="pcite">
            Method adapted from Green, Horel &amp; Papachristos, <i>Modeling Contagion Through Social Networks to
            Explain and Predict Gunshot Violence in Chicago, 2006–2014</i>, JAMA Internal Medicine, 2017 — which models
            contagion through networks; Watch applies the same decay window to geographic proximity.{" "}
            <Link href="/limitations">More on the research →</Link>
          </p>
        </div>

        <div className="card pradarcard" data-tour="pulse-graphic">
          {total > 0 ? (
            <PulseRadar rings={rings} />
          ) : (
            <div className="pradar-empty">No confirmed gun violence within a half-mile in the window. The radar is clear.</div>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------------- CEO altitude: mini grid ---------------- */

function MiniPulse({ data, base, campus }: { data: NetworkData; base: string; campus: Campus }) {
  const rings = pulseForCampus(data.incidents, campus);
  const fresh = freshThisWeek(rings);
  const r05 = 0.5 * UNITS_PER_MI;
  return (
    <Link className="pcard" href={`${base}/pulse?view=leader&campus=${campus.code}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="30" height="30" viewBox="0 0 100 100" style={{ flex: "0 0 auto" }} aria-hidden="true">
          <circle cx="50" cy="50" r={r05} fill="none" stroke="#3a4566" strokeWidth="1.4" strokeDasharray="4 3" />
          {rings.map((r) => {
            const col = isFatal(r.victimNote) ? RED : EL;
            return <circle key={r.id} cx={clamp(r.x)} cy={clamp(r.y)} r={2 + 3 * r.decayFrac}
              fill={col} fillOpacity={0.2 + 0.5 * r.decayFrac} />;
          })}
          <circle cx="50" cy="50" r="4" fill="#f3f1ea" stroke="#0b0f1c" strokeWidth="1" />
        </svg>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{campus.name}</div>
      </div>
      <div style={{ display: "flex", gap: 20, marginTop: 12, alignItems: "baseline" }}>
        <div><span className="pnum num" style={{ fontSize: 24 }}>{rings.length}</span> <span className="micro">on the radar</span></div>
        <div><span className="pnum num" style={{ fontSize: 24, color: fresh ? EL : "var(--mut)" }}>{fresh}</span> <span className="micro">this week</span></div>
      </div>
    </Link>
  );
}

/* ---------------- the science (academic depth) ---------------- */

const PHASES = [
  { tag: "Acute", range: "0 – 18 hrs", cls: "p1", peak: false,
    body: "The immediate aftermath of a homicide. Chaos and grief dominate; organized retaliation is unlikely, but spontaneous violence is possible." },
  { tag: "Active", range: "18 – 72 hrs", cls: "p2", peak: true,
    body: "The peak retaliation window — the most dangerous period. Grief has hardened into intent. A campus within a half-mile of the triggering homicide sits at its highest risk." },
  { tag: "Watch", range: "72 hrs – 7 d", cls: "p3", peak: false,
    body: "Risk is elevated but declining. The immediate impulse fades; monitoring continues with heightened awareness." },
  { tag: "Monitor", range: "7 – 21 d", cls: "p4", peak: false,
    body: "Returning to baseline. The zone is still tracked but its weight diminishes, dissolving at 21 days unless a new event resets the clock." },
];

const CITES = [
  { who: "Papachristos, Wildeman & Roberto", yr: "2015", jrn: "Social Science & Medicine",
    title: "Tragic, but not random: the social contagion of nonfatal gunshot injuries.",
    note: "Showed that gunshot victimization spreads through co-offending networks with the predictability of an infectious disease. Pulse’s primary foundation." },
  { who: "Papachristos & Wildeman", yr: "2014", jrn: "American Journal of Public Health",
    title: "Network exposure and homicide victimization in an African American community.",
    note: "Network position — not neighborhood — is the primary predictor of victimization; 41% of gun homicides occurred within a network of 4% of the population." },
  { who: "Papachristos", yr: "2009", jrn: "American Journal of Sociology",
    title: "Murder by structure: dominance relations and the social structure of gang homicide.",
    note: "The original study framing gang homicide as a network-contagion phenomenon in Chicago." },
];

function TheScience() {
  return (
    <section className="scienceband" aria-label="The science behind Pulse">
      <div className="sci-head">
        <span className="sci-eyebrow">03 — The Science</span>
        <h2 className="sci-title">Violence spreads like a disease.</h2>
        <p className="sci-lead">
          Not a metaphor — peer-reviewed science. Pulse is built on the Papachristos contagion model, the
          same framework Yale and the University of Chicago use to study urban gun violence.
        </p>
      </div>

      <div className="sci-grid">
        <div className="sci-found">
          <div className="sci-k">The foundational research</div>
          <p>
            Dr. Andrew Papachristos showed that gunshot victimization moves through social networks the way an
            infectious disease moves through a population. A homicide doesn’t end with one victim — it can set off
            retaliatory violence that travels through connected communities in predictable patterns over the days that
            follow. In his Chicago research, roughly <b>70% of shootings</b> occurred within co-offending networks
            representing under <b>6% of the population</b>.
          </p>
          <blockquote className="sci-quote">
            Pulse tracks homicides and weapons violations — not all crime — because these are the incidents that
            create contagion. A battery three miles away doesn’t create retaliatory risk. A homicide half a mile away
            does. That distinction is everything.
          </blockquote>
        </div>

        <div className="sci-phases">
          <div className="sci-k">The four contagion phases</div>
          <div className="phaserow">
            {PHASES.map((p) => (
              <div key={p.tag} className={`phase ${p.cls}${p.peak ? " peak" : ""}`}>
                <div className="ph-bar" />
                <div className="ph-tag">{p.tag}{p.peak ? <em>Peak</em> : null}</div>
                <div className="ph-range">{p.range}</div>
                <div className="ph-body">{p.body}</div>
              </div>
            ))}
          </div>
          <div className="sci-note">
            On the radar, pulsing rings are incidents still inside this window; faint dots have cooled but stay on the
            record as the block returns to baseline.
          </div>
        </div>
      </div>

      <div className="sci-cites">
        <div className="sci-k">Academic foundation</div>
        <div className="citelist">
          {CITES.map((c) => (
            <div className="cite" key={c.yr}>
              <div className="cite-hd"><span className="cite-who">{c.who}</span> <span className="cite-yr">{c.yr}</span> · <span className="cite-jrn">{c.jrn}</span></div>
              <div className="cite-title">“{c.title}”</div>
              <div className="cite-note">{c.note}</div>
            </div>
          ))}
        </div>
        <div className="sci-cap">Pulse describes what the public record shows and how the research reads it. It predicts nothing, and it is not a security system.</div>
      </div>
    </section>
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
    return (
      <>
        <LeaderPulse data={data} campus={c} />
        <TheScience />
      </>
    );
  }

  const totalActive = sorted.reduce((n, c) => n + pulseForCampus(data.incidents, c).length, 0);
  return (
    <>
      <div className="head">
        <div className="sentence">
          {totalActive === 0
            ? "Nothing is on the radar near any campus right now."
            : `${cap(numWord(totalActive))} confirmed incident${totalActive === 1 ? " is" : "s are"} still on the radar across your network.`}
        </div>
        <span className="micro">Last {PULSE_WINDOW_DAYS} days · {PULSE_RADIUS_MI} mi radius · per campus</span>
      </div>
      <div className="pulsegrid">
        {sorted.map((c) => (
          <MiniPulse key={c.code} data={data} base={base} campus={c} />
        ))}
      </div>
      <TheScience />
    </>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
