"use client";

/* Reports — build a branded safety report for the whole network or one campus,
   over a chosen window, and Print / Save as PDF. The report renders as a light
   "document" (prints cleanly); the controls are hidden in print. */

import { useMemo, useState } from "react";
import type { NetworkData } from "@/lib/networkData";
import { pulseForCampus } from "@/lib/pulse";
import { incidentTypeWord, placeOf } from "@/lib/voice";
import type { Incident } from "@/lib/types";

const WINDOWS = [
  { key: 7, lab: "Last 7 days" },
  { key: 30, lab: "Last 30 days" },
  { key: 125, lab: "Last 125 days" },
];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const isFatal = (n?: string) => !!n && /fatal/i.test(n) && !/non-fatal/i.test(n);

function centralFmt(iso: string, opts: Intl.DateTimeFormatOptions): string {
  try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", ...opts }).format(new Date(iso)); }
  catch { return ""; }
}

interface Row { id: string; occurredAt: string; kind: string; headline: string; distanceMi: number; bearing: string; ageDays: number; fatal: boolean; campus: string; }

export default function ReportBuilder({ data, nowIso }: { data: NetworkData; nowIso: string }) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const [scope, setScope] = useState<string>("network"); // "network" | campusCode
  const [win, setWin] = useState<number>(30);

  const rank: Record<string, number> = { ALERT: 0, ELEVATED: 1, MONITOR: 2, CLEAR: 3 };

  const stats = useMemo(() => data.campuses.map((c) => {
    const rings = pulseForCampus(data.incidents, c, now);
    const status = (data.statuses.find((s) => s.campusCode === c.code)?.status ?? "CLEAR");
    const rows: Row[] = rings.map((r) => ({
      id: r.id, occurredAt: r.occurredAt, kind: r.kind, headline: r.headline,
      distanceMi: r.distanceMi, bearing: r.bearing, ageDays: r.ageDays, fatal: isFatal(r.victimNote), campus: c.name,
    }));
    return {
      c, status,
      w7: rings.filter((r) => r.ageDays <= 7).length,
      w30: rings.filter((r) => r.ageDays <= 30).length,
      w125: rings.length,
      h48: rings.filter((r) => r.ageDays <= 2).length,
      rows,
    };
  }).sort((a, b) => rank[a.status] - rank[b.status] || b.w30 - a.w30), [data, now]);

  const clearNow = stats.filter((s) => s.status === "CLEAR").length;
  const feedsLive = data.feeds.filter((f) => f.state !== "late").length;

  const isNet = scope === "network";
  const focus = isNet ? null : stats.find((s) => s.c.code === scope) ?? null;

  // incident log for the chosen scope + window
  const log: Row[] = (isNet ? stats.flatMap((s) => s.rows) : focus?.rows ?? [])
    .filter((r) => r.ageDays <= win)
    .sort((a, b) => a.ageDays - b.ageDays);

  const winCount = (s: typeof stats[number]) => win <= 7 ? s.w7 : win <= 30 ? s.w30 : s.w125;
  const maxWin = Math.max(1, ...stats.map(winCount));
  const netWinTotal = stats.reduce((k, s) => k + winCount(s), 0);
  const winLab = WINDOWS.find((w) => w.key === win)!.lab.toLowerCase();

  const scopeName = isNet ? data.city + " network" : focus?.c.name ?? "";
  const genLabel = centralFmt(nowIso, { weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

  const insight = (() => {
    if (!focus) return "";
    const total = focus.w125;
    if (total === 0) return `No confirmed gun violence within a half-mile of ${focus.c.name} in the last 125 days.`;
    const arrival = parseInt((focus.c.arrivalStart ?? "07:30").split(":")[0], 10) || 7;
    const dm = /^(\d{1,2}):(\d{2})/.exec(focus.c.dismissal ?? "");
    const dismissEnd = dm ? parseInt(dm[1], 10) + (parseInt(dm[2], 10) > 0 ? 1 : 0) : 15;
    const during = focus.rows.filter((r) => {
      const h = parseInt(centralFmt(r.occurredAt, { hour: "2-digit", hour12: false }), 10) % 24;
      return h >= arrival && h < dismissEnd;
    }).length;
    return `Of ${total} confirmed incidents in 125 days, ${during === 0 ? "none" : during} occurred during school hours. The remainder were evenings, nights, and weekends.`;
  })();

  return (
    <div className="reportpage">
      <div className="report-controls">
        <div className="rc-row">
          <label className="rc-field">
            <span>Scope</span>
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="network">Whole network · {data.campuses.length} campuses</option>
              {stats.map((s) => <option key={s.c.code} value={s.c.code}>{s.c.name}</option>)}
            </select>
          </label>
          <div className="rc-field">
            <span>Time window</span>
            <div className="rc-seg">
              {WINDOWS.map((w) => (
                <button key={w.key} type="button" className={win === w.key ? "on" : ""} onClick={() => setWin(w.key)}>{w.lab}</button>
              ))}
            </div>
          </div>
          <button type="button" className="rc-print" onClick={() => window.print()}>Print / Save as PDF</button>
        </div>
        <div className="rc-hint">Set the scope and window, then Print / Save as PDF. The report below is what prints.</div>
      </div>

      <div className="report-doc">
        <div className="rd-head">
          <div className="rd-brand"><span className="rd-mark" /> Watch</div>
          <div className="rd-meta">Madden Education Advisory · Decision support, not dispatch</div>
        </div>
        <div className="rd-title">
          <div className="rd-kick">{isNet ? "Network safety report" : "Campus safety report"}</div>
          <h1>{scopeName}</h1>
          <div className="rd-sub">Confirmed gun violence within a half-mile of {isNet ? "each campus" : "the campus"} · {winLab} · generated {genLabel}</div>
        </div>

        {isNet ? (
          <>
            <section className="rd-sec">
              <div className="rd-stats">
                <div className="rd-stat"><div className="v">{clearNow}<small>/ {data.campuses.length}</small></div><div className="l">Campuses clear right now</div></div>
                <div className="rd-stat"><div className="v">{netWinTotal}</div><div className="l">Confirmed incidents · {winLab}</div></div>
                <div className="rd-stat"><div className="v">{stats.reduce((k, s) => k + s.w125, 0)}</div><div className="l">On the 125-day record</div></div>
                <div className="rd-stat"><div className="v">{feedsLive}<small>/ {data.feeds.length}</small></div><div className="l">Sources live</div></div>
              </div>
            </section>

            <section className="rd-sec">
              <h2>Campuses by incident count · {winLab}</h2>
              <div className="rd-bars">
                {stats.map((s) => {
                  const n = winCount(s);
                  return (
                    <div className="rd-bar" key={s.c.code}>
                      <div className="rd-bl"><span className={`rd-dot ${s.status.toLowerCase()}`} />{s.c.name}</div>
                      <div className="rd-btrack"><i style={{ width: `${(n / maxWin) * 100}%` }} /></div>
                      <div className="rd-bn">{n}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rd-sec">
              <h2>Per-campus detail</h2>
              <table className="rd-table">
                <thead><tr><th>Campus</th><th>Neighborhood</th><th>Status</th><th className="num">7 d</th><th className="num">30 d</th><th className="num">125 d</th></tr></thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.c.code}>
                      <td>{s.c.name}</td>
                      <td className="mut">{HOOD[s.c.code] ?? "—"}</td>
                      <td><span className={`rd-pill ${s.status.toLowerCase()}`}>{s.status}</span></td>
                      <td className="num">{s.w7}</td><td className="num">{s.w30}</td><td className="num">{s.w125}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <>
            <section className="rd-sec">
              <div className="rd-stats">
                <div className="rd-stat"><div className="v">{focus?.h48 ?? 0}</div><div className="l">Last 48 hours</div></div>
                <div className="rd-stat"><div className="v">{focus?.w7 ?? 0}</div><div className="l">Last 7 days</div></div>
                <div className="rd-stat"><div className="v">{focus?.w30 ?? 0}</div><div className="l">Last 30 days</div></div>
                <div className="rd-stat"><div className="v">{focus?.w125 ?? 0}</div><div className="l">Last 125 days</div></div>
              </div>
              <p className="rd-insight">{insight}</p>
            </section>
          </>
        )}

        <section className="rd-sec">
          <h2>Incident log · {winLab}{isNet ? " · network" : ""}</h2>
          {log.length === 0 ? (
            <p className="rd-empty">No confirmed gun violence within a half-mile {isNet ? "of any campus" : `of ${focus?.c.name}`} in this window.</p>
          ) : (
            <table className="rd-table">
              <thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Block</th>{isNet ? <th>Nearest campus</th> : null}<th className="num">Distance</th></tr></thead>
              <tbody>
                {log.slice(0, 60).map((r) => (
                  <tr key={r.id}>
                    <td>{centralFmt(r.occurredAt, { month: "short", day: "numeric" })}</td>
                    <td className="mut">{centralFmt(r.occurredAt, { hour: "numeric", minute: "2-digit" })}</td>
                    <td>{cap(incidentTypeWord({ kind: r.kind } as Incident))}{r.fatal ? <span className="rd-fatal"> · fatal</span> : ""}</td>
                    <td>{placeOf({ headline: r.headline } as Incident)}</td>
                    {isNet ? <td className="mut">{r.campus}</td> : null}
                    <td className="num">{r.distanceMi} mi {r.bearing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {log.length > 60 ? <div className="rd-more">Showing the 60 most recent of {log.length} incidents in this window.</div> : null}
        </section>

        <div className="rd-foot">
          <div>Ranked by confirmed, block-level incidents from {/dallas/i.test(data.city) ? "Dallas Police public incident records" : "Chicago Police & the medical examiner"} within each campus&apos;s half-mile ring. Coarse-geo reports never count. Pulse applies the Papachristos contagion window (125 days). Watch is decision support, not dispatch — protocol and police lead.</div>
          <div className="rd-fbrand">Watch · A product of Madden Education Advisory, LLC</div>
        </div>
      </div>
    </div>
  );
}

const HOOD: Record<string, string> = {
  GPA: "West Garfield Park", ENG: "Englewood", LAW: "North Lawndale",
  WPK: "Washington Park", ROS: "Roseland", GRE: "Greater Grand Crossing",
};
