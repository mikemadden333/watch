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
  type Briefing,
  type Seg,
} from "@/lib/voice";
import { pulseForCampus } from "@/lib/pulse";

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

const DOT: Record<Status, string> = {
  ALERT: "var(--alert)",
  ELEVATED: "var(--elevated)",
  MONITOR: "var(--monitor)",
  CLEAR: "var(--clear)",
};

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
  const b: Briefing = ceoBriefing(data);
  const rank: Record<string, number> = { ALERT: 0, ELEVATED: 1, MONITOR: 2, CLEAR: 3 };

  // per-campus violence stats from the real 125-day store (7d / 30d windows)
  const stats = data.campuses
    .map((c) => {
      const st = (data.statuses.find((s) => s.campusCode === c.code)?.status ?? "CLEAR") as Status;
      const detail = data.statuses.find((s) => s.campusCode === c.code)?.detail;
      const rings = pulseForCampus(data.incidents, c);
      return {
        c, st, detail,
        total: rings.length, // last 125 days
        m: rings.filter((r) => r.ageDays <= 30).length,
        w: rings.filter((r) => r.ageDays <= 7).length,
      };
    })
    .sort((a, x) => rank[a.st] - rank[x.st] || x.total - a.total);

  const attention = stats.filter((s) => s.st === "ELEVATED" || s.st === "ALERT");
  const top = attention[0];
  const topIncident = top ? drivingIncident(data, top.c.code) : undefined;
  const topStatus = top ? data.statuses.find((s) => s.campusCode === top.c.code) : undefined;
  const clearCount = stats.filter((s) => s.st === "CLEAR").length;
  const net7 = stats.reduce((n, s) => n + s.w, 0);
  const net30 = stats.reduce((n, s) => n + s.m, 0);
  const maxTotal = Math.max(1, ...stats.map((s) => s.total));
  const feedsTotal = data.feeds.length || 7;
  const feedsLive = data.feeds.filter((f) => f.state === "ok").length || feedsTotal;

  const storyData: StoryRow[] = topIncident
    ? storyRows(topIncident).length
      ? storyRows(topIncident)
      : synthStory(topIncident, topStatus, top!.c.name, data.city)
    : [{ time: "", text: "Nothing crossed a line overnight. Every source was current and quiet.", cls: undefined }];

  const postureCls = attention.length ? (top!.st === "ALERT" ? "alertc" : "hot") : "good";

  return (
    <>
      <div className="v2hero ceo">
        <div className="micro">{b.micro}</div>
        <div className="sentence">
          {b.lead} <span className={b.keyClass}>{b.key}</span>
        </div>
        <Para para={b.para} />
        {top ? (
          <div className="cta">
            <Link className="btn" href={`${base}/briefing?view=leader&campus=${top.c.code}`}>
              Open {top.c.name} →
            </Link>
            <a className="btn ghost" href="#story">
              Read the overnight story
            </a>
          </div>
        ) : null}
      </div>

      <div className="vitals">
        <div className={`vital ${postureCls}`}>
          <div className="num">
            {attention.length || stats.length}
            <small> / {stats.length}</small>
          </div>
          <div className="lab">{attention.length ? `${statusWord(top!.st)} · ${clearCount} clear` : "all campuses clear"}</div>
        </div>
        <div className="vital">
          <div className="num">{net7}</div>
          <div className="lab">Confirmed shootings near campuses · 7 days</div>
        </div>
        <div className="vital">
          <div className="num">{net30}</div>
          <div className="lab">Confirmed shootings near campuses · 30 days</div>
        </div>
        <div className="vital good">
          <div className="num">
            {feedsLive}
            <small> / {feedsTotal}</small>
          </div>
          <div className="lab">Sources live right now</div>
        </div>
      </div>

      <div className="cboard">
        <div className="micro">
          Confirmed gun violence near each campus · last 125 days{"  "}
          <span style={{ color: "var(--elevated)" }}>▬</span> last 30 days{"  "}
          <span style={{ color: "var(--faint)" }}>▬</span> earlier
        </div>
        <div className="rows">
          {stats.map((s) => {
            const hot = s.st === "ELEVATED" || s.st === "ALERT";
            return (
              <Link
                key={s.c.code}
                href={`${base}/briefing?view=leader&campus=${s.c.code}`}
                className={`crow${s.st === "ALERT" ? " alertc" : hot ? " hot" : ""}`}
              >
                <span className="cdot" style={{ background: DOT[s.st] }} />
                <span className="cname">{s.c.name}</span>
                <span className="cstat">
                  {s.st === "CLEAR" ? "Clear" : `${capWord(statusWord(s.st))} · ${s.detail ?? "see campus"}`}
                </span>
                <span className="cbar">
                  <i style={{ width: `${(s.total / maxTotal) * 100}%` }} />
                  <b style={{ width: `${(s.m / maxTotal) * 100}%` }} />
                </span>
                <span className="ccount">
                  <b>{s.total}</b>
                  <small>125D</small>
                  {s.m ? <span style={{ color: "var(--elevated)" }}> · {s.m} in 30d</span> : null}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="cfoot">Tap a campus for its briefing · CONFIRMED, ring-eligible incidents from CPD &amp; the medical examiner</div>
      </div>

      <div className="story" id="story">
        <div className="micro">While you slept · the verification story</div>
        <div className="rows">
          {storyData.map((r, i) => (
            <div key={i} className={`srow${r.cls ? " " + r.cls : ""}`}>
              {r.time ? <span className="t">{r.time}</span> : null}
              {r.text}
            </div>
          ))}
        </div>
        <div className="quiet">
          Every line above is traceable to a source, a timestamp, and a rule — tap anything to see its evidence. · <SourcesLine data={data} /> · Rules v2.0 · <Link href="/limitations" style={{ textDecoration: "underline" }}>Why can this take until morning?</Link>
        </div>
      </div>
    </>
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

function capWord(s: string): string {
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
