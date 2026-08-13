"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

/* ============================================================
   Watch V2 nav — tabs + CEO⇄School Leader toggle + tenant mark.
   The view (ceo | leader) and selected campus live in the URL
   (?view=&campus=) so server pages can render at the right
   altitude. Admin lives behind the gear. The campus picker
   sub-bar shows only in School Leader view. Directive §2.
   ============================================================ */

const TABS = [
  { label: "Briefing", href: "briefing" },
  { label: "Map", href: "map" },
  { label: "Pulse", href: "pulse" },
  { label: "Action", href: "action" },
  { label: "Communications", href: "comms" },
  { label: "Record", href: "record" },
  { label: "About", href: "about" },
];

const DOT: Record<string, string> = {
  ALERT: "var(--alert)",
  ELEVATED: "var(--elevated)",
  MONITOR: "var(--monitor)",
  CLEAR: "var(--clear)",
};

export interface NavCampus {
  code: string;
  name: string;
  status?: string;
  meta?: string; // "604 students · K-8 · ~2900 W Madison St · arrival 7:30 · dismissal 2:45"
}

export default function Nav({
  network,
  base,
  mark,
  campuses = [],
  defaultView = "ceo",
}: {
  network: string;
  base: string; // "/chicago"
  mark?: string; // tenant mark asset path (ink only, never status-colored)
  campuses?: NavCampus[];
  defaultView?: "ceo" | "leader"; // config-bindable to role in production
}) {
  const path = usePathname();
  const params = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);

  const seg = path.split("/").filter(Boolean); // ["chicago","briefing"]
  const current = seg[1] ?? "briefing";
  const view = (params.get("view") as "ceo" | "leader") ?? defaultView;

  // selected campus: query, else the highest-posture campus, else first
  const rank: Record<string, number> = { ALERT: 0, ELEVATED: 1, MONITOR: 2, CLEAR: 3 };
  const sorted = [...campuses].sort(
    (a, b) => (rank[a.status ?? "CLEAR"] ?? 3) - (rank[b.status ?? "CLEAR"] ?? 3)
  );
  const campusCode = params.get("campus") ?? sorted[0]?.code ?? "";
  const campus = campuses.find((c) => c.code === campusCode) ?? sorted[0];

  // ambient network posture — the one answer the product exists to give,
  // visible on every screen (not just Briefing).
  const worst = (sorted[0]?.status ?? "CLEAR") as keyof typeof DOT;
  const hotCount = campuses.filter((c) => (c.status ?? "CLEAR") === worst && worst !== "CLEAR").length;
  const PCLS: Record<string, string> = { ALERT: "p-alert", ELEVATED: "p-elevated", MONITOR: "p-monitor", CLEAR: "p-clear" };
  const WORD: Record<string, string> = { ALERT: "on alert", ELEVATED: "elevated", MONITOR: "monitored" };
  const anyHot = worst !== "CLEAR";
  const hot1 = anyHot && hotCount === 1 ? sorted[0] : null;
  const netLabel = worst === "CLEAR" ? "Network clear" : hot1 ? `${hot1.code} · ${WORD[worst]}` : `${hotCount} ${WORD[worst]}`;
  const netHref = hot1 ? `${base}/briefing?view=leader&campus=${hot1.code}` : `${base}/briefing${qs({})}`;

  // build a query string preserving view + campus, overriding as asked
  function qs(next: { view?: string; campus?: string }): string {
    const p = new URLSearchParams(params.toString());
    const v = next.view ?? view;
    if (v && v !== defaultView) p.set("view", v);
    else p.delete("view");
    const c = next.campus ?? (v === "leader" ? campusCode : undefined);
    if (v === "leader" && c) p.set("campus", c);
    else p.delete("campus");
    const s = p.toString();
    return s ? `?${s}` : "";
  }

  const tabHref = (href: string) => `${base}/${href}${qs({})}`;

  return (
    <>
      <div className="nav2">
        <Link href={`${base}/briefing${qs({})}`} className="brand">
          <span className="dot" /> Watch
        </Link>
        <div className="tabs">
          {TABS.map((t) => (
            <Link key={t.href} href={tabHref(t.href)} className={`tab${current === t.href ? " on" : ""}`}>
              {t.label}
              {anyHot && (t.href === "briefing" || t.href === "map") ? (
                <span className="tabdot" style={{ background: DOT[worst] }} />
              ) : null}
            </Link>
          ))}
        </div>

        <div className="toggle">
          <Link href={`${path}${qs({ view: "ceo" })}`} className={view === "ceo" ? "sel" : "un"}>
            CEO view
          </Link>
          <Link href={`${path}${qs({ view: "leader" })}`} className={view === "leader" ? "sel" : "un"}>
            School Leader
          </Link>
        </div>

        <Link href={netHref} className={`pill ${PCLS[worst]} netpill`} title={hot1 ? `${hot1.name} · ${WORD[worst]}` : "Network posture"} aria-label={hot1 ? `${hot1.name} is ${WORD[worst]}` : `Network posture: ${netLabel}`}>
          <span className="d" style={{ background: DOT[worst] }} />
          {netLabel}
        </Link>

        <div className="tenant">
          {mark ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mark} alt="" width={22} height={22} style={{ display: "block" }} />
          ) : null}
          <span className="micro microink">{network}</span>
        </div>

        <Link href={`${base}/admin`} className="gear" aria-label="Admin" title="Admin">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </div>

      {view === "leader" && campus ? (
        <div className="campuspick">
          <div className="campusmenu">
            <button className="pill2" onClick={() => setMenuOpen((o) => !o)} type="button">
              <i style={{ background: DOT[campus.status ?? "CLEAR"] }} />
              {campus.name}
              <span style={{ color: "var(--mut)" }}>▾</span>
            </button>
            {menuOpen ? (
              <div className="menu">
                {sorted.map((c) => (
                  <Link
                    key={c.code}
                    href={`${path}${qs({ view: "leader", campus: c.code })}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <i style={{ background: DOT[c.status ?? "CLEAR"] }} />
                    {c.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          {campus.meta ? <span>{campus.meta}</span> : null}
        </div>
      ) : null}
    </>
  );
}
