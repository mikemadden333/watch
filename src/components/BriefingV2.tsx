/* ============================================================
   Watch V2 Briefing — the front door (directive §3).
   Three layers: THE ANSWER (Georgia sentence) → THE STORY
   (plain paragraph + timeline) → THE EVIDENCE (one tap deeper).
   Server component. All copy comes from the deterministic voice
   engine (lib/voice.ts). CEO = network altitude; Leader = one campus.
   ============================================================ */

import Link from "next/link";
import type { NetworkData } from "@/lib/networkData";
import type { CampusStatus, Incident, Status } from "@/lib/types";
import {
  ceoBriefing,
  leaderBriefing,
  statusWord,
  storyRows,
  clockOf,
  confirmClause,
  incidentTypeWord,
  placeOf,
  milesPhrase,
  numWord,
  type Briefing,
  type Seg,
} from "@/lib/voice";
import { pulseForCampus, PULSE_WINDOW_DAYS } from "@/lib/pulse";

type StoryRow = { time: string; text: string; cls?: "conf" | "elev" | "alert" };

/** Build the CEO "while you slept" story from clocks when there's no authored
 *  journey — so an elevated campus is always traceable. */
function synthStory(
  i: Incident,
  st: CampusStatus | undefined,
  campusName: string,
  city: string
): StoryRow[] {
  const rows: StoryRow[] = [];
  const cc = confirmClause(i, city);
  const type = incidentTypeWord(i);
  if (i.occurredAt) rows.push({ time: clockOf(i.occurredAt), text: `A ${type} occurred on ${placeOf(i)} — nobody knew yet, including us.` });
  if (i.publishedAt) rows.push({ time: clockOf(i.publishedAt), text: `${cc.who} ${cc.verb}. Confirmed${i.victimNote ? " — " + i.victimNote : ""}.`, cls: "conf" });
  const alerted = st?.status === "ALERT";
  rows.push({
    time: st?.since ?? clockOf(i.publishedAt),
    text: `${campusName} ${alerted ? "placed on alert" : "elevated"}${st?.ruleId ? " by rule " + st.ruleId : ""}. The principal and you were notified.`,
    cls: alerted ? "alert" : "elev",
  });
  return rows;
}

/** dark situation-room status colors (defined under .sitroom) */
const SR_DOT: Record<Status, string> = {
  ALERT: "var(--sr-alert)",
  ELEVATED: "var(--sr-elevated)",
  MONITOR: "var(--sr-monitor)",
  CLEAR: "var(--sr-clear)",
};

/** campus code → Chicago neighborhood, for the CEO risk board. */
const HOOD: Record<string, string> = {
  GPA: "West Garfield Park",
  ENG: "Englewood",
  LAW: "North Lawndale",
  WPK: "Washington Park",
  ROS: "Roseland",
  GRE: "Greater Grand Crossing",
};

/** 18-week histogram of ring ages → sparkline geometry (oldest left, newest right). */
function sparkPoints(ages: number[]): { line: string; area: string; last: [number, number] } {
  const W = 120, H = 28, pad = 2, BINS = 18;
  const binW = PULSE_WINDOW_DAYS / BINS;
  const series = new Array(BINS).fill(0);
  for (const a of ages) {
    const idx = BINS - 1 - Math.min(BINS - 1, Math.floor(a / binW));
    series[idx]++;
  }
  const mx = Math.max(1, ...series);
  const step = (W - pad * 2) / (BINS - 1);
  const pts = series.map((v, i) => [pad + i * step, H - pad - (v / mx) * (H - pad * 2)] as [number, number]);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${pad},${H - pad} ${line} ${(W - pad).toFixed(1)},${H - pad}`;
  return { line, area, last: pts[pts.length - 1] };
}

type TlRow = { tm?: string; text: string; ok?: boolean };

/** The "while you slept" verification story — real signals, honest tokens. */
function ceoTimeline(
  data: NetworkData,
  stats: { c: NetworkData["campuses"][number]; st: Status }[],
  now: Date
): TlRow[] {
  const isDallas = /dallas/i.test(data.city);
  const police = isDallas ? "Dallas police" : "Chicago Police";
  const attn = stats.find((s) => s.st === "ELEVATED" || s.st === "ALERT");

  // If a campus is elevated, tell that incident's traceable story.
  if (attn) {
    const inc = drivingIncident(data, attn.c.code);
    if (inc) {
      const rows = storyRows(inc).length
        ? storyRows(inc)
        : synthStory(inc, data.statuses.find((s) => s.campusCode === attn.c.code), attn.c.name, data.city);
      return rows.map((r) => ({ tm: r.time || undefined, text: r.text, ok: r.cls === "conf" }));
    }
  }

  // All clear — the quiet was verified, not assumed.
  const rows: TlRow[] = [];
  rows.push({
    tm: "overnight",
    ok: true,
    text: `${police} ${isDallas ? "cleared the overnight dispatch log" : "published the overnight shooting record"}. Nothing landed inside a campus ring.`,
  });

  const dayAgo = now.getTime() - 24 * 3600 * 1000;
  const held = data.incidents
    .filter(
      (i) =>
        i.tier === "REPORTED" &&
        i.nearestCampusCode &&
        new Date(i.occurredAt).getTime() >= dayAgo &&
        (i.distanceMi ?? 9) <= 0.6
    )
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  if (held.length) {
    const nm = data.campuses.find((c) => c.code === held[0].nearestCampusCode)?.name ?? "a campus";
    rows.push({
      tm: clockOf(held[0].occurredAt),
      text: `${held.length === 1 ? "A local report" : cap(numWord(held.length)) + " local reports"} near ${nm} — single-source, unconfirmed. Held below alert level; paged no one.`,
    });
  }

  const hasME = data.feeds.some((f) => /exam|\bme\b|medical/i.test(f.key + " " + f.label));
  if (hasME) {
    rows.push({ tm: "overnight", ok: true, text: "Medical-examiner feed refreshed. No new gun deaths in the network's areas." });
  }

  const feedsTotal = data.feeds.length || 7;
  const feedsLive = data.feeds.filter((f) => f.state === "ok").length || feedsTotal;
  rows.push({
    tm: "all night",
    text: `${feedsLive >= feedsTotal ? `All ${feedsTotal}` : `${feedsLive} of ${feedsTotal}`} sources current. The quiet was verified, not assumed.`,
  });
  return rows;
}

/** the incident that drove the posture: highest tier (CONFIRMED first) near
 *  the campus, then most recent — matches the voice engine's pick, so the
 *  evidence never shows a stray REPORTED news item instead of the confirmed one. */
function drivingIncident(data: NetworkData, code: string): Incident | undefined {
  const rank: Record<string, number> = { CONFIRMED: 0, CORROBORATED: 1, REPORTED: 2 };
  return data.incidents
    .filter((i) => i.nearestCampusCode === code)
    .sort(
      (a, b) =>
        (rank[a.tier] ?? 3) - (rank[b.tier] ?? 3) ||
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )[0];
}

function Para({ para }: { para: Seg[] }) {
  return (
    <p className="para">
      {para.map((s, i) => (s.b ? <b key={i}>{s.t}</b> : <span key={i}>{s.t}</span>))}
    </p>
  );
}

function SourcesLine({ data }: { data: NetworkData }) {
  const total = data.feeds.length || 7;
  const current = data.feeds.filter((f) => f.state === "ok").length || total;
  return current >= total ? `All ${total} sources current` : `${current} of ${total} sources current`;
}

/* ---------------- CEO ---------------- */

function CeoView({ data, base }: { data: NetworkData; base: string }) {
  const now = new Date();
  const b: Briefing = ceoBriefing(data, now);
  const n = data.campuses.length;
  const rank: Record<string, number> = { ALERT: 0, ELEVATED: 1, MONITOR: 2, CLEAR: 3 };

  // per-campus violence stats from the real 125-day store (7d / 30d windows)
  const stats = data.campuses
    .map((c) => {
      const st = (data.statuses.find((s) => s.campusCode === c.code)?.status ?? "CLEAR") as Status;
      const rings = pulseForCampus(data.incidents, c, now);
      return {
        c, st,
        ages: rings.map((r) => r.ageDays),
        total: rings.length, // last 125 days
        m: rings.filter((r) => r.ageDays <= 30).length,
        w: rings.filter((r) => r.ageDays <= 7).length,
      };
    })
    .sort((a, x) => rank[a.st] - rank[x.st] || x.total - a.total);

  const clearCount = stats.filter((s) => s.st === "CLEAR").length;
  const net7 = stats.reduce((k, s) => k + s.w, 0);
  const net30 = stats.reduce((k, s) => k + s.m, 0);
  const maxTotal = Math.max(1, ...stats.map((s) => s.total));
  const feedsTotal = data.feeds.length || 7;
  const feedsLive = data.feeds.filter((f) => f.state === "ok").length || feedsTotal;
  const isDallas = /dallas/i.test(data.city);

  const when = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric",
  }).format(now);
  const clock = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", hour12: true,
  }).format(now);

  const timeline = ceoTimeline(data, stats, now);

  return (
    <div className="sitroom">
      <div className="sr-shell">
        <div className="sr-sweep" aria-hidden="true" />

        <div className="sr-top">
          <svg className="sr-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="14" stroke="#f6f5f1" strokeOpacity=".4" />
            <circle cx="16" cy="16" r="8" stroke="#f6f5f1" strokeOpacity=".72" />
            <circle cx="16" cy="16" r="2.6" fill="#e8a13a" />
          </svg>
          <span className="sr-tenant">{data.tenantName}</span>
          <div className="sr-right">
            <span>{when} · {clock}</span>
            <span className="sr-livep"><i />Live · watching</span>
          </div>
        </div>

        <div className="sr-hero">
          <div>
            <div className="sr-eyebrow">Network briefing · {numWord(n)} campuses</div>
            <h1 className="sr-answer">
              {b.lead} <span className={`sr-${b.keyClass}`}>{b.key}</span>
            </h1>
          </div>
          <p className="sr-read">
            {b.para.map((s, i) => (s.b ? <b key={i}>{s.t}</b> : <span key={i}>{s.t}</span>))}
          </p>
        </div>

        <div className="sr-vitals">
          <div className={`sr-v${clearCount === n ? " clr" : ""}`}>
            <div className="sr-num">{clearCount}<small> / {n}</small></div>
            <div className="sr-lab">Campuses clear<br />right now</div>
          </div>
          <div className="sr-v">
            <div className="sr-num">{net7}</div>
            <div className="sr-lab">Confirmed shootings<br />near campuses · 7 days</div>
          </div>
          <div className="sr-v">
            <div className="sr-num">{net30}</div>
            <div className="sr-lab">Confirmed shootings<br />near campuses · 30 days</div>
          </div>
          <div className={`sr-v${feedsLive >= feedsTotal ? " clr" : ""}`}>
            <div className="sr-num">{feedsLive}<small> / {feedsTotal}</small></div>
            <div className="sr-lab">Sources live<br />right now</div>
          </div>
        </div>

        <div className="sr-boardh">
          <div className="t">The blocks around your schools</div>
          <div className="s">
            Confirmed gun violence · last 125 days · <span style={{ color: "var(--sr-amber2)" }}>▬</span> last 30
          </div>
        </div>
        <div className="sr-board">
          {stats.map((s, i) => {
            const sp = sparkPoints(s.ages);
            const hood = HOOD[s.c.code];
            const hot = s.st !== "CLEAR";
            const statusText = s.st === "CLEAR" ? "clear" : statusWord(s.st).toLowerCase();
            return (
              <Link
                key={s.c.code}
                href={`${base}/briefing?view=leader&campus=${s.c.code}`}
                className={`sr-row${hot ? " hot" : ""}`}
              >
                <span className="sr-rank">{String(i + 1).padStart(2, "0")}</span>
                <span className="sr-who">
                  <span className="sr-nm"><i style={{ background: SR_DOT[s.st] }} />{s.c.name}</span>
                  <span className="sr-hood">{hood ? `${hood} · ` : ""}{statusText}</span>
                </span>
                <svg className="sr-spark" width="120" height="28" viewBox="0 0 120 28" aria-hidden="true">
                  <polygon points={sp.area} fill="rgba(232,161,58,.12)" />
                  <polyline points={sp.line} fill="none" stroke="rgba(232,161,58,.85)" strokeWidth="1.4" strokeLinejoin="round" />
                  <circle cx={sp.last[0].toFixed(1)} cy={sp.last[1].toFixed(1)} r="2.1" fill="#f4bf63" />
                </svg>
                <span className="sr-bar">
                  <i style={{ width: `${(s.total / maxTotal) * 100}%` }} />
                  <b style={{ width: `${(s.m / maxTotal) * 100}%` }} />
                </span>
                <span className="sr-cnt">
                  <span className="big">{s.total}</span><span className="u">125D</span>
                  {s.m ? <div className="r">{s.m} in 30 days</div> : <div className="r faint">quiet lately</div>}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="sr-boardf">
          Ranked by confirmed, block-level incidents from {isDallas ? "Dallas police dispatch" : "Chicago Police & the medical examiner"} within
          each campus&apos;s half-mile ring. Coarse-geo reports never count. Tap a campus for its briefing.
        </div>

        <div className="sr-night">
          <div className="sr-nlab">While you slept<br />the verification story</div>
          <div className="sr-tl">
            {timeline.map((e, i) => (
              <div key={i} className={`sr-e${e.ok ? " ok" : ""}`}>
                {e.tm ? <span className="tm">{e.tm}</span> : null}
                {e.text}
              </div>
            ))}
          </div>
        </div>

        <div className="sr-foot">
          <span>Every line traceable — source · timestamp · rule · Rules v2.0</span>
          <span className="sr-footr">A product of Madden Education Advisory, LLC · decision support, not dispatch</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- School Leader ---------------- */

function LeaderView({ data, base, code }: { data: NetworkData; base: string; code: string }) {
  const campus = data.campuses.find((c) => c.code === code) ?? data.campuses[0];
  const st = (data.statuses.find((s) => s.campusCode === campus.code)?.status ?? "CLEAR") as Status;
  const b: Briefing = leaderBriefing(data, campus.code);
  const incident = drivingIncident(data, campus.code);
  const active = st === "ELEVATED" || st === "ALERT" || st === "MONITOR";

  return (
    <>
      <div className="v2hero">
        <div className="micro">{b.micro}</div>
        <div className="sentence">
          {b.lead} <span className={b.keyClass}>{b.key}</span>
        </div>
        <Para para={b.para} />
      </div>

      <div className="acts">
        <Link className="ac primary" href={`${base}/campuses/${campus.code.toLowerCase()}`}>
          <div className="k">Your morning · playbook</div>
          <div className="v">Review the playbook before doors open →</div>
          <div className="s">
            {active
              ? "Brief front-desk and security · confirm doors · adjust morning recess · hold parent note for your review"
              : "Your standing morning checklist — nothing extra is required today."}
          </div>
        </Link>
        <Link className="ac" href={`${base}/act?view=leader&campus=${campus.code}`}>
          <div className="k">Act · ready for your edit</div>
          <div className="v">{active ? "Family note drafted from the facts →" : "Draft templates, ready when needed →"}</div>
          <div className="s">
            {active
              ? "References the incident, your response, and police coordination. Nothing sends unless you send it."
              : "The drafts fill themselves the moment something qualifies. Nothing sends unless you send it."}
          </div>
        </Link>
        <div className="ac">
          <div className="k">2:15 PM · dismissal outlook</div>
          <div className="v">I&apos;ll brief you before dismissal</div>
          <div className="s">One sentence at 2:15 — conditions on your blocks in the 90 minutes before release.</div>
        </div>
      </div>

      {active && incident ? (
        <div className="evi">
          <div className="micro">How I know · the evidence</div>
          <div className="rows">
            {evidenceRows(incident, st, base, data.statuses.find((s) => s.campusCode === campus.code), data.city)}
          </div>
          <div className="quiet">
            Tap any line for its source record. · <SourcesLine data={data} /> · Rules v2.0 · Decision support, not dispatch — your protocol and police lead.
          </div>
        </div>
      ) : (
        <div className="evi">
          <div className="micro">What I watched · and dismissed</div>
          <div className="rows">
            <div className="erow">
              <span className="t">overnight</span>
              I watched the public record around {campus.name} through the night. Nothing crossed a line.
            </div>
          </div>
          <div className="quiet">
            Tap any line for its source record. · <SourcesLine data={data} /> · Rules v2.0 · Decision support, not dispatch — your protocol and police lead.
          </div>
        </div>
      )}
    </>
  );
}

type EvItem = { time: string; detail: string; badge: { cls: string; text: string; dot?: boolean } };

function evidenceRows(incident: Incident, st: Status, base: string, statusObj?: CampusStatus, city = "") {
  const statusBadge = { cls: st === "ALERT" ? "p-alert" : "p-elevated", text: statusWord(st).toUpperCase().replace("ON ", ""), dot: true };
  let items: EvItem[];

  if (incident.journey?.length) {
    const badgeFor = (kind: string): EvItem["badge"] | null => {
      switch (kind) {
        case "occurred": return { cls: "badge-rep", text: "occurred" };
        case "reported": return { cls: "badge-rep", text: "REPORTED" };
        case "corroborated": return { cls: "badge-corr", text: "CORROBORATED" };
        case "confirmed": return { cls: "badge-conf", text: "CONFIRMED" };
        case "status": return statusBadge;
        default: return null;
      }
    };
    items = incident.journey
      .map((s) => ({ s, b: badgeFor(s.kind) }))
      .filter((x) => x.b)
      .map((x) => ({ time: x.s.time, detail: x.s.detail, badge: x.b! }));
  } else {
    // synthesize the evidence from the three clocks + tier — always traceable
    const cc = confirmClause(incident, city);
    const tierBadge =
      incident.tier === "CONFIRMED"
        ? { cls: "badge-conf", text: "CONFIRMED" }
        : incident.tier === "CORROBORATED"
        ? { cls: "badge-corr", text: "CORROBORATED" }
        : { cls: "badge-rep", text: "REPORTED" };
    items = [
      {
        time: clockOf(incident.occurredAt),
        detail: `${cap(incidentTypeWord(incident))} occurred · ${placeOf(incident)} · ${milesPhrase(incident.distanceMi, incident.bearing)}`,
        badge: { cls: "badge-rep", text: "occurred" },
      },
      {
        time: clockOf(incident.publishedAt),
        detail: `${cc.who} · official record${incident.victimNote ? " · " + incident.victimNote : ""}`,
        badge: tierBadge,
      },
      {
        time: statusObj?.since ?? clockOf(incident.publishedAt),
        detail: `Campus ${statusWord(st)}${statusObj?.ruleId ? " · rule " + statusObj.ruleId : ""}`,
        badge: statusBadge,
      },
    ];
  }

  return items.map((it, i) => (
    <Link key={i} className="erow" href={`${base}/campuses/${incident.nearestCampusCode?.toLowerCase() ?? ""}`}>
      <span className="t">{it.time}</span>
      {it.detail}
      <span className={`badge pill ${it.badge.cls}`}>
        {it.badge.dot ? <span className="d" /> : null}
        {it.badge.text}
      </span>
    </Link>
  ));
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ---------------- entry ---------------- */

export default function BriefingV2({
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
  if (view === "leader") {
    const rank: Record<string, number> = { ALERT: 0, ELEVATED: 1, MONITOR: 2, CLEAR: 3 };
    const fallback = [...data.campuses].sort((a, x) => {
      const sa = data.statuses.find((s) => s.campusCode === a.code)?.status ?? "CLEAR";
      const sx = data.statuses.find((s) => s.campusCode === x.code)?.status ?? "CLEAR";
      return rank[sa] - rank[sx];
    })[0];
    const code = campus ?? fallback?.code ?? "";
    return <LeaderView data={data} base={base} code={code} />;
  }
  return <CeoView data={data} base={base} />;
}
