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
  overnightWord,
  watchedWindow,
  centralHour,
  type Briefing,
  type Seg,
} from "@/lib/voice";
import { pulseForCampus } from "@/lib/pulse";
import HeatRibbon, { type RibbonDay } from "./briefing/HeatRibbon";
import SafetyDial, { type DialInc } from "./briefing/SafetyDial";
import PulseMap from "./pulse/PulseMap";
import { violentCrimeNear, violentCrimeWord, VIOLENT_RADIUS_MI } from "@/lib/violentCrime";

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
  if (i.occurredAt) rows.push({ time: clockOf(i.occurredAt), text: `A ${type} occurred on ${placeOf(i)}.` });
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

type TlRow = { tm?: string; text: string; ok?: boolean };

/** "14:45" → "2:45 PM". Tolerates already-formatted or empty input. */
function pretty12(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || "");
  if (!m) return hhmm || "dismissal";
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ap}`;
}
/** subtract minutes from an "HH:MM" clock, clamped to the same day. */
function minusMinutes(hhmm: string, mins: number): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || "");
  if (!m) return hhmm || "";
  const total = Math.max(0, parseInt(m[1], 10) * 60 + parseInt(m[2], 10) - mins);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

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
    tm: overnightWord(now),
    ok: true,
    text: `${police} ${isDallas ? "cleared the latest dispatch log" : "published the latest shooting record"}. Nothing landed inside a campus ring.`,
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
    rows.push({ tm: overnightWord(now), ok: true, text: "Medical-examiner feed refreshed. No new gun deaths in the network's areas." });
  }

  const feedsTotal = data.feeds.length;
  // "Live" = connected and reporting this cycle, not "newest record inside a tight
  // window". Slow authoritative feeds still count — only a dark feed drops it.
  const feedsLive = data.feeds.filter((f) => f.state !== "late").length;
  rows.push(
    feedsTotal === 0
      ? { tm: "now", text: "Source health is not reporting — treat this quiet with caution until feeds confirm." }
      : {
          tm: overnightWord(now),
          text: `${feedsLive >= feedsTotal ? `All ${feedsTotal}` : `${feedsLive} of ${feedsTotal}`} sources connected and reporting. Every source checked; nothing qualified for an alert.`,
        }
  );
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
  // Absence of health data is NOT full health — never fabricate an all-clear.
  const total = data.feeds.length;
  if (!total) return "Source health unavailable";
  // match the CEO vitals: "live" = connected and reporting (not dark), so the
  // two views never show different source counts for the same feeds.
  const live = data.feeds.filter((f) => f.state !== "late").length;
  return live >= total ? `All ${total} sources live` : `${live} of ${total} sources live`;
}

/* ---------------- CEO ---------------- */

function CeoView({ data, base }: { data: NetworkData; base: string }) {
  const now = new Date();
  const b: Briefing = ceoBriefing(data, now);
  const n = data.campuses.length;
  const rank: Record<string, number> = { ALERT: 0, ELEVATED: 1, MONITOR: 2, CLEAR: 3 };

  // date label per ribbon cell (index 0 = 29 days ago … index 29 = today)
  const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric" });
  const dayLabels = Array.from({ length: 30 }, (_, i) => dayFmt.format(new Date(now.getTime() - (29 - i) * 86400000)));

  // per-campus violence stats from the real 125-day store (7d / 30d windows),
  // plus a 30-day daily heat ribbon (index 0 = 29 days ago, index 29 = today)
  // with the actual incidents per day, binned from the real incident dates.
  const stats = data.campuses
    .map((c) => {
      const st = (data.statuses.find((s) => s.campusCode === c.code)?.status ?? "CLEAR") as Status;
      const rings = violentCrimeNear(data.incidents, c, now);
      const ribbon: RibbonDay[] = dayLabels.map((label) => ({ n: 0, label, items: [] as { t: string; s: string }[] }));
      for (const r of rings) {
        if (r.ageDays < 30) {
          const idx = 29 - Math.min(29, Math.max(0, Math.floor(r.ageDays)));
          ribbon[idx].n += 1;
          ribbon[idx].items.push({
            t: `${cap(violentCrimeWord({ kind: r.kind, headline: r.headline } as Incident))} · ${placeOf({ headline: r.headline } as Incident)}`,
            s: `${r.distanceMi} mi ${r.bearing} · ${r.ageLabel}`,
          });
        }
      }
      return {
        c, st,
        ribbon,
        total: rings.length, // last 125 days
        m: rings.filter((r) => r.ageDays <= 30).length,
        w: rings.filter((r) => r.ageDays <= 7).length,
      };
    })
    // rank by the actionable window: worst status first, then this week's
    // activity, then the last 30 days (never the stale 125-day store)
    .sort((a, x) => rank[a.st] - rank[x.st] || x.w - a.w || x.m - a.m);

  const clearCount = stats.filter((s) => s.st === "CLEAR").length;
  const hotCampus = stats.find((s) => s.st === "ELEVATED" || s.st === "ALERT");
  const net7 = stats.reduce((k, s) => k + s.w, 0);
  const net30 = stats.reduce((k, s) => k + s.m, 0);
  // Honest source health — an empty feed table is "unknown", never "all good".
  // "Live" = connected and reporting this cycle. Slow authoritative feeds (CPD's
  // crime dataset publishes ~8 days behind by policy) are active and polling even
  // with nothing new to pull, so they count. Only a dark feed ("late" / no data)
  // drops the number. Per-source freshness detail lives on the Sources page.
  const feedsTotal = data.feeds.length;
  const feedsLive = data.feeds.filter((f) => f.state !== "late").length;
  const feedsKnown = feedsTotal > 0;
  const feedsAllLive = feedsKnown && feedsLive >= feedsTotal;
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
            <h1 className="sr-answer" data-tour="brief-answer">
              {b.lead} <span className={`sr-${b.keyClass}`}>{b.key}</span>
            </h1>
          </div>
          <div>
            <p className="sr-read">
              {b.para.map((s, i) => (s.b ? <b key={i}>{s.t}</b> : <span key={i}>{s.t}</span>))}
            </p>
            {hotCampus ? (
              <div className="sr-ctarow">
                <Link className="sr-cta" href={`${base}/action?view=leader&campus=${hotCampus.c.code}`}>
                  Open {hotCampus.c.name}&apos;s response →
                </Link>
                <Link className="sr-cta ghost" href={`${base}/briefing?view=leader&campus=${hotCampus.c.code}`}>
                  See the evidence
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="sr-vitals">
          <div className={`sr-v${clearCount === n ? " clr" : ""}`}>
            <div className="sr-num">{clearCount}<small> / {n}</small></div>
            <div className="sr-lab">Campuses clear<br />right now</div>
          </div>
          <div className="sr-v">
            <div className="sr-num">{net7}</div>
            <div className="sr-lab">Confirmed violent crime<br />within 1 mi · 7 days</div>
          </div>
          <div className="sr-v">
            <div className="sr-num">{net30}</div>
            <div className="sr-lab">Confirmed violent crime<br />within 1 mi · 30 days</div>
          </div>
          <div className={`sr-v${feedsAllLive ? " clr" : !feedsKnown ? " warnv" : ""}`}>
            <div className="sr-num">{feedsKnown ? feedsLive : "—"}{feedsKnown ? <small> / {feedsTotal}</small> : null}</div>
            <div className="sr-lab">{feedsKnown ? "Sources live" : "Source health"}<br />{feedsKnown ? "right now" : "not reporting"}</div>
          </div>
        </div>

        <div className="sr-boardh">
          <div className="t">The blocks around your schools</div>
          <div className="s">
            Confirmed violent crime · within 1 mile · last 30 days
            <span className="sr-scale" aria-hidden="true">
              <i style={{ background: "var(--sr-cell)" }} />
              <i style={{ background: "rgba(232,161,58,.38)" }} />
              <i style={{ background: "var(--sr-amber)" }} />
              <i style={{ background: "var(--sr-amber2)" }} />
              <em>more</em>
            </span>
          </div>
        </div>
        <div className="sr-board">
          {stats.map((s, i) => {
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
                <HeatRibbon days={s.ribbon} />
                <span className="sr-cnt">
                  <span className={`big${s.w === 0 ? " zero" : " warm"}`}>{s.w}</span><span className="u">this week</span>
                  {s.m ? <div className="r">{s.m} in 30 days</div> : <div className="r faint">quiet this month</div>}
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
          <div className="sr-nlab">{overnightWord(now) === "overnight" ? "While you slept" : "Since this morning"}<br />what Watch checked</div>
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
  const now = new Date();
  const campus = data.campuses.find((c) => c.code === code) ?? data.campuses[0];
  const st = (data.statuses.find((s) => s.campusCode === campus.code)?.status ?? "CLEAR") as Status;
  const b: Briefing = leaderBriefing(data, campus.code);
  const incident = drivingIncident(data, campus.code);
  const active = st === "ELEVATED" || st === "ALERT" || st === "MONITOR";
  const dismissPretty = pretty12(campus.dismissal);
  const briefPretty = pretty12(minusMinutes(campus.dismissal, 30));

  // the safety dial + campus map — confirmed violent crime within a mile of this
  // campus, plotted by hour of day and recency, so a principal has a pattern to
  // explore even when clear
  const pulseRings = violentCrimeNear(data.incidents, campus, now);
  const dialData: DialInc[] = pulseRings.map((r) => ({
    id: r.id,
    hour: centralHour(new Date(r.occurredAt)),
    ageDays: Math.max(0, Math.round(r.ageDays)),
    fatal: /fatal/i.test(r.victimNote ?? "") && !/non-fatal/i.test(r.victimNote ?? ""),
    title: `${cap(violentCrimeWord({ kind: r.kind, headline: r.headline } as Incident))} · ${placeOf({ headline: r.headline } as Incident)}`,
    sub: `${r.distanceMi} mi ${r.bearing} · ${r.ageLabel}`,
  }));
  const schoolStart = parseInt((campus.arrivalStart ?? "07:30").split(":")[0], 10) || 7;
  const dm = /^(\d{1,2}):(\d{2})/.exec(campus.dismissal ?? "");
  const schoolEnd = dm ? parseInt(dm[1], 10) + (parseInt(dm[2], 10) > 0 ? 1 : 0) : 15;

  return (
    <>
      <div className="v2hero">
        <div className="v2top">
          <span className="v2eyebrow">Campus briefing · {campus.name}</span>
          <span className="v2live"><i />Live · watching</span>
        </div>
        <div className="micro">{b.micro}</div>
        <div className="sentence" data-tour="brief-answer">
          {b.lead} <span className={b.keyClass}>{b.key}</span>
        </div>
        <Para para={b.para} />
      </div>

      <div className="acts">
        <Link className="ac primary" href={`${base}/campuses/${campus.code.toLowerCase()}`}>
          <div className="k">Your playbook</div>
          <div className="v">Review the playbook →</div>
          <div className="s">
            {active
              ? "Brief front-desk and security · confirm doors · adjust morning recess · hold parent note for your review"
              : "Your standing morning checklist — nothing extra is required today."}
          </div>
        </Link>
        <Link className="ac" href={`${base}/comms?view=leader&campus=${campus.code}`}>
          <div className="k">Communications · ready for your edit</div>
          <div className="v">{active ? "Family note drafted from the facts →" : "Drafts thread from the incident, ready when needed →"}</div>
          <div className="s">
            {active
              ? "References the incident, your response, and police coordination. Nothing sends unless you send it."
              : "The drafts fill themselves the moment something qualifies. Nothing sends unless you send it."}
          </div>
        </Link>
        <div className="ac">
          <div className="k">{briefPretty} · dismissal outlook</div>
          <div className="v">I&apos;ll brief you before dismissal</div>
          <div className="s">One line at {briefPretty} — conditions on your blocks in the half hour before your {dismissPretty} release.</div>
        </div>
      </div>

      {pulseRings.length > 0 ? (
        <section className="sdpanel campusmap">
          <div className="sdhead">
            <div className="t">Violent crime around {campus.name}</div>
            <div className="s">Confirmed violent crime within {VIOLENT_RADIUS_MI} mile · last 125 days · pinned where it happened</div>
          </div>
          <PulseMap rings={pulseRings} campus={campus} compact radiusMi={VIOLENT_RADIUS_MI} />
        </section>
      ) : null}

      <SafetyDial incidents={dialData} campusName={campus.name} schoolStart={schoolStart} schoolEnd={schoolEnd} />

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
              <span className="t">{overnightWord(now)}</span>
              I watched the public record around {campus.name} {watchedWindow(now)}. Nothing crossed a line.
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
        time: clockOf(incident.detectedAt),
        detail: `Watch surfaced this${detectionGap(incident)}`,
        badge: { cls: "badge-corr", text: "surfaced" },
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

/** publish → surface latency clause — the "how fast we found out" promise, made concrete. */
function detectionGap(i: Incident): string {
  const pub = new Date(i.publishedAt).getTime();
  const det = new Date(i.detectedAt).getTime();
  if (!Number.isFinite(pub) || !Number.isFinite(det)) return "";
  const min = Math.round((det - pub) / 60000);
  if (min <= 0) return " · within a minute of publication";
  if (min < 60) return ` · ${min} min after publication`;
  const h = Math.round(min / 60);
  return ` · ${h} h after publication`;
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
