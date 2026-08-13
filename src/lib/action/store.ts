/* ============================================================
   Action — client-side run store.
   Runs persist in localStorage (per tenant) so an open run
   survives a refresh, and milestone events are POSTed to the
   append-only audit log server-side (best-effort — the demo
   never breaks if the network does). Two closed runs per demo
   network are seeded so History reads as lived-in.
   ============================================================ */

import { AAR_QUESTIONS, DEFAULT_RUNBOOK } from "./runbook";
import type { PhaseKey } from "./runbook";

export interface RunStep {
  id: string;
  phase: PhaseKey;
  title: string;
  detail: string;
  role: string;
  done: boolean;
  actor?: string; // "M.R."
  at?: string; // ISO
}

export interface RunNote {
  at: string; // ISO
  text: string;
}

export interface AarAnswer {
  q: string;
  a: "yes" | "no" | "na";
}

export interface ResponseRun {
  id: string;
  slug: string;
  campusCode: string;
  campusName: string;
  incidentId: string | null;
  incidentHeadline: string | null;
  drill: boolean;
  posture: string | null;
  postureAt?: string;
  initiatedBy: string;
  startedAt: string; // ISO
  closedAt?: string; // ISO
  steps: RunStep[];
  notes: RunNote[];
  aar?: { answers: AarAnswer[]; worked: string; improve: string };
  status: "active" | "closed";
  seeded?: boolean;
}

export function freshSteps(): RunStep[] {
  return DEFAULT_RUNBOOK.map((s) => ({ ...s, done: false }));
}

function key(slug: string): string {
  return `watch-runs-${slug}`;
}

export function loadLocalRuns(slug: string): ResponseRun[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(slug));
    return raw ? (JSON.parse(raw) as ResponseRun[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalRuns(slug: string, runs: ResponseRun[]): void {
  try {
    window.localStorage.setItem(key(slug), JSON.stringify(runs));
  } catch {
    /* storage blocked — the run still lives in memory this session */
  }
}

export function allRuns(slug: string): ResponseRun[] {
  const local = loadLocalRuns(slug);
  const seeds = (SEEDED_RUNS[slug] ?? []).filter((s) => !local.some((l) => l.id === s.id));
  return [...local, ...seeds].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
}

export function activeRun(slug: string): ResponseRun | undefined {
  return loadLocalRuns(slug).find((r) => r.status === "active");
}

export function upsertRun(slug: string, run: ResponseRun): void {
  const local = loadLocalRuns(slug);
  const i = local.findIndex((r) => r.id === run.id);
  if (i >= 0) local[i] = run;
  else local.unshift(run);
  saveLocalRuns(slug, local);
}

/** Fire-and-forget milestone log to the append-only record. */
export function logMilestone(slug: string, event: string, evidence: string): void {
  try {
    fetch("/api/action/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, event, evidence }),
    }).catch(() => {});
  } catch {
    /* never let logging break the run */
  }
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map((p) => p[0].toUpperCase()).join(".") + ".";
}

/* ---------------- seeded history (demo fixture spine) ------------- */

function mkSteps(
  doneIds: string[],
  actor: string,
  base: Date,
  spreadMin: number
): RunStep[] {
  let i = 0;
  return DEFAULT_RUNBOOK.map((s) => {
    const done = doneIds.includes(s.id);
    const at = done
      ? new Date(base.getTime() + (++i / doneIds.length) * spreadMin * 60000).toISOString()
      : undefined;
    return { ...s, done, actor: done ? actor : undefined, at };
  });
}

const ALL_IDS = DEFAULT_RUNBOOK.map((s) => s.id);

export const SEEDED_RUNS: Record<string, ResponseRun[]> = {
  "veritas-charter": [
    (() => {
      const start = new Date("2026-07-21T14:38:00-05:00");
      return {
        id: "seed-veritas-0721",
        slug: "veritas-charter",
        campusCode: "ENG",
        campusName: "Englewood Prep",
        incidentId: null,
        incidentHeadline: "Confirmed shooting · 3 blocks NE · summer programming in session",
        drill: false,
        posture: "SECURE",
        postureAt: new Date(start.getTime() + 4 * 60000).toISOString(),
        initiatedBy: "A. Okafor",
        startedAt: start.toISOString(),
        closedAt: new Date(start.getTime() + 96 * 60000).toISOString(),
        steps: mkSteps(ALL_IDS, "A.O.", start, 88),
        notes: [
          {
            at: new Date(start.getTime() + 11 * 60000).toISOString(),
            text: "CPD on scene per liaison; perimeter two blocks; no movement toward campus.",
          },
          {
            at: new Date(start.getTime() + 52 * 60000).toISOString(),
            text: "All summer-program students accounted for. Two staff cars inside police tape; owners notified.",
          },
        ],
        aar: {
          answers: AAR_QUESTIONS.map((q, i) => ({ q, a: i === 4 ? "na" : "yes" })),
          worked: "Posture set within four minutes of the alert. Accounting finished before CPD requested it.",
          improve: "The front-desk radio battery was dead — spares now live at the command post.",
        },
        status: "closed",
        seeded: true,
      };
    })(),
    (() => {
      const start = new Date("2026-08-04T09:02:00-05:00");
      const doneIds = ALL_IDS.filter((id) => !["p5", "c4", "r3", "r4"].includes(id));
      return {
        id: "seed-veritas-0804-drill",
        slug: "veritas-charter",
        campusCode: "WPK",
        campusName: "Washington Park HS",
        incidentId: null,
        incidentHeadline: "Quarterly response drill · staff in-service day",
        drill: true,
        posture: "SECURE",
        postureAt: new Date(start.getTime() + 3 * 60000).toISOString(),
        initiatedBy: "M. Reese",
        startedAt: start.toISOString(),
        closedAt: new Date(start.getTime() + 41 * 60000).toISOString(),
        steps: mkSteps(doneIds, "M.R.", start, 34),
        notes: [
          {
            at: new Date(start.getTime() + 18 * 60000).toISOString(),
            text: "Sweep found two propped exterior doors — facilities ticket filed from the drill.",
          },
        ],
        aar: {
          answers: AAR_QUESTIONS.map((q, i) => ({ q, a: i === 4 || i === 5 ? "na" : i === 3 ? "no" : "yes" })),
          worked: "Full posture-to-accounting cycle in 22 minutes, five better than spring.",
          improve: "East stairwell door reads locked but doesn't latch. Authorities' access path needs a marked route.",
        },
        status: "closed",
        seeded: true,
      };
    })(),
  ],
  "solis-academies": [
    (() => {
      const start = new Date("2026-07-29T12:12:00-05:00");
      return {
        id: "seed-solis-0729",
        slug: "solis-academies",
        campusCode: "CVP",
        campusName: "Cliff View Prep",
        incidentId: null,
        incidentHeadline: "Armed robbery · 0.4 mi W · active police response at midday",
        drill: false,
        posture: "SECURE",
        postureAt: new Date(start.getTime() + 5 * 60000).toISOString(),
        initiatedBy: "R. Salinas",
        startedAt: start.toISOString(),
        closedAt: new Date(start.getTime() + 63 * 60000).toISOString(),
        steps: mkSteps(ALL_IDS, "R.S.", start, 55),
        notes: [
          {
            at: new Date(start.getTime() + 9 * 60000).toISOString(),
            text: "DPD active-calls record confirmed via Watch; suspect fled west, away from campus.",
          },
        ],
        aar: {
          answers: AAR_QUESTIONS.map((q, i) => ({ q, a: i === 4 ? "na" : "yes" })),
          worked: "Dispatch-record confirmation inside ten minutes let us hold lunch indoors instead of guessing.",
          improve: "Family message went out at 34 minutes — target is 20. Pre-selecting the draft would have saved most of that.",
        },
        status: "closed",
        seeded: true,
      };
    })(),
  ],
};
