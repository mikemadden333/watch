"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { freshSteps, type ResponseRun } from "@/lib/action/store";

/* ============================================================
   Presenter tour — page-by-page. ⌃⇧G arms it: the network goes
   all-clear and a response run is pre-started, so every screen is
   ready. SPACE steps forward, ← back, ESC exits. Captions state
   plainly what is on the screen — the presenter narrates the rest.
   The one action is firing the incident (which sends the real
   text); everything else is just SPACE. The standalone alert cards
   are suppressed while the tour runs, so nothing collides.
   ============================================================ */

interface Step {
  tab: string;
  view?: "ceo" | "leader";
  campus?: string;
  target: string | null;
  eyebrow: string;
  say: string;
  sayAfter?: string;
  intro?: boolean;
  fire?: boolean;
  actionLabel?: string;
  alert?: boolean;
}

const STEPS: Step[] = [
  { tab: "briefing", view: "ceo", campus: "GPA", target: null, intro: true, eyebrow: "What Watch is",
    say: "Watch monitors violent crime within a mile of every campus, from public records today and Citizen soon. We'll start at the network office, then step into one school." },
  { tab: "briefing", view: "ceo", campus: "GPA", target: "brief-answer", eyebrow: "The network",
    say: "The network office. Every campus, around the clock, on one screen." },
  { tab: "briefing", view: "leader", campus: "GPA", target: "brief-answer", eyebrow: "One school",
    say: "Now one school: Garfield Park Academy, led by Principal Victoria Parks. The {tod} briefing — the campus is clear." },
  { tab: "briefing", view: "leader", campus: "GPA", target: "brief-answer", alert: true, fire: true, actionLabel: "Fire the incident", eyebrow: "An incident fires",
    say: "Fire the incident. A text goes to every leader's phone.",
    sayAfter: "A shooting, 0.15 miles from campus. Confirmed. The text has been sent." },
  { tab: "briefing", view: "leader", campus: "GPA", target: "brief-answer", eyebrow: "What happened",
    say: "The incident: the block, the distance, the time, and the source that confirmed it." },
  { tab: "map", view: "leader", campus: "GPA", target: "map-pop", eyebrow: "On the map",
    say: "The incident, placed and timestamped. Only confirmed incidents appear on the map." },
  { tab: "pulse", view: "leader", campus: "GPA", target: "pulse-graphic", eyebrow: "The pattern",
    say: "Pulse: every confirmed incident near the campus over the last 125 days, and how the risk decays across that window." },
  { tab: "action", view: "leader", campus: "GPA", target: "action-run", eyebrow: "The response",
    say: "Action: the school's own plan, running as a live checklist." },
  { tab: "action", view: "leader", campus: "GPA", target: "action-posture", eyebrow: "Building posture",
    say: "The building posture, set to SECURE, with the exact public-address language to use." },
  { tab: "action", view: "leader", campus: "GPA", target: "action-run", eyebrow: "The checklist",
    say: "Four phases. Each step is stamped with who completed it and when." },
  { tab: "comms", view: "leader", campus: "GPA", target: "comms-draft", eyebrow: "Communications",
    say: "A draft to families, built from the locked facts, in the school's voice. Nothing sends from Watch." },
  { tab: "record", view: "leader", campus: "GPA", target: "record-ledger", eyebrow: "The record",
    say: "Every action logged and scored against the official record. Nothing here can be edited." },
  { tab: "about", target: "about-team", intro: true, eyebrow: "The ask",
    say: "Watch is built by former school leaders. Five hundred thousand dollars covers every charter student in Chicago for a year." },
];

interface Rect { x: number; y: number; w: number; h: number; }

/** Time-of-day word in Central time, to match the app's greeting on screen. */
function todWord(): string {
  try {
    const h = parseInt(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Chicago" }).format(new Date()), 10);
    return h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  } catch { return "morning"; }
}

export default function PresenterTour({ enabled, slug, base }: { enabled: boolean; slug: string; base: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [fired, setFired] = useState(false);
  const [busy, setBusy] = useState(false);
  const rafRef = useRef(0);

  const current = STEPS[step];

  const emit = (a: boolean) => {
    try { window.dispatchEvent(new CustomEvent("watch:tour", { detail: { active: a } })); } catch { /* ignore */ }
  };

  useEffect(() => {
    try {
      const a = localStorage.getItem("watch-tour-active") === "1";
      const s = parseInt(localStorage.getItem("watch-tour-step") || "0", 10);
      setActive(a);
      setStep(Number.isNaN(s) ? 0 : Math.max(0, Math.min(STEPS.length - 1, s)));
      if (a) emit(true);
    } catch { /* no storage */ }
  }, []);

  useEffect(() => { setFired(false); }, [step]);

  const urlFor = useCallback((st: Step) => {
    const q = new URLSearchParams();
    if (st.view) q.set("view", st.view);
    if (st.campus) q.set("campus", st.campus);
    const s = q.toString();
    return `${base}/${st.tab}${s ? "?" + s : ""}`;
  }, [base]);

  useEffect(() => {
    if (!active || current?.intro) { setRect(null); return; }
    let stop = false;
    const tick = () => {
      if (stop) return;
      const sel = current?.target;
      const el = sel ? (document.querySelector(`[data-tour="${sel}"]`) as HTMLElement | null) : null;
      if (el) { const r = el.getBoundingClientRect(); setRect(r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null); }
      else setRect(null);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { stop = true; cancelAnimationFrame(rafRef.current); };
  }, [active, step, current?.target, current?.intro, pathname]);

  useEffect(() => {
    if (!active || !current?.target) return;
    let tries = 0;
    const t = setInterval(() => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); clearInterval(t); }
      if (++tries > 24) clearInterval(t);
    }, 150);
    return () => clearInterval(t);
  }, [active, step, current?.target, pathname]);

  const persist = (a: boolean, s: number) => {
    try {
      if (a) { localStorage.setItem("watch-tour-active", "1"); localStorage.setItem("watch-tour-step", String(s)); }
      else { localStorage.removeItem("watch-tour-active"); localStorage.removeItem("watch-tour-step"); }
    } catch { /* ignore */ }
  };

  // pre-start a response run so the Action tab lands on a live checklist
  const seedRun = useCallback(() => {
    try {
      const now = Date.now();
      const steps = freshSteps().map((s, i) =>
        i < 2 ? { ...s, done: true, actor: "V.P.", at: new Date(now - (2 - i) * 60000).toISOString() } : s
      );
      const run: ResponseRun = {
        id: `run-tour-${slug}`, slug, campusCode: "GPA", campusName: "Garfield Park Academy",
        incidentId: null, incidentHeadline: "Confirmed shooting · near Garfield Park Academy",
        drill: false, posture: "SECURE", postureAt: new Date(now - 3 * 60000).toISOString(),
        initiatedBy: "V. Parks", startedAt: new Date(now - 4 * 60000).toISOString(),
        steps, notes: [], status: "active",
      };
      localStorage.setItem(`watch-runs-${slug}`, JSON.stringify([run]));
    } catch { /* storage blocked */ }
  }, [slug]);

  const goTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, idx));
    setStep(clamped);
    persist(true, clamped);
    const st = STEPS[clamped];
    const search = typeof window !== "undefined" ? window.location.search : "";
    const onRightTab = pathname === `${base}/${st.tab}`;
    const onRightView = !st.view || search.includes(`view=${st.view}`);
    if (!onRightTab || !onRightView) router.push(urlFor(st));
  }, [pathname, router, base, urlFor]);

  const arm = useCallback(async () => {
    setBusy(true);
    try { await fetch("/api/demo/clear", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) }); } catch { /* best-effort */ }
    setBusy(false);
    seedRun();
    setActive(true); setStep(0); persist(true, 0); emit(true);
    router.push(urlFor(STEPS[0]));
    router.refresh();
  }, [router, slug, urlFor, seedRun]);

  const exit = useCallback(() => {
    setActive(false); setRect(null); persist(false, 0); emit(false);
    try { localStorage.removeItem(`watch-runs-${slug}`); } catch { /* ignore */ }
  }, [slug]);

  const doAction = useCallback(async () => {
    if (!current?.fire) return;
    setBusy(true);
    try {
      await fetch("/api/demo/incident", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, alert: true }) });
    } catch { /* best-effort */ }
    setBusy(false);
    setFired(true);
    try { window.dispatchEvent(new Event("watch:poll")); } catch { /* ignore */ }
    router.refresh();
    setTimeout(() => router.refresh(), 1000);
  }, [current, slug, router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (enabled && e.ctrlKey && e.shiftKey && (e.key === "G" || e.key === "g")) {
        e.preventDefault();
        if (active) exit(); else arm();
        return;
      }
      if (!active) return;
      if (e.key === "Escape") { e.preventDefault(); exit(); return; }
      const t = e.target as HTMLElement | null;
      const tag = (t?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || t?.isContentEditable) return;
      if (e.key === " " || e.code === "Space" || e.key === "ArrowRight") { e.preventDefault(); goTo(step + 1); }
      else if (e.key === "ArrowLeft" || e.key === "Backspace") { e.preventDefault(); goTo(step - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, active, step, arm, exit, goTo]);

  if (!active) return null;

  const pad = 7;
  const dimBg = "rgba(5,9,20,0.72)";
  const first = step === 0;
  const last = step === STEPS.length - 1;
  const showFire = current.fire && !fired;
  const sayText = (current.fire && fired && current.sayAfter ? current.sayAfter : current.say).replace("{tod}", todWord());

  if (current.intro) {
    return (
      <div className="tourroot">
        <div className="tourdim" style={{ inset: 0, background: dimBg }} />
        <div className="tourcard">
          <div className="tc-eyebrow">{current.eyebrow}</div>
          <p className="tc-lead">{sayText}</p>
          <div className="tc-ctl">
            <button type="button" className="tc-btn" onClick={() => goTo(step - 1)} disabled={first}>← Back</button>
            <button type="button" className="tc-btn primary" onClick={() => goTo(step + 1)} disabled={last}>{first ? "Begin ␣" : "Next ␣"}</button>
            <span className="tc-hint">SPACE continue · ESC exit</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tourroot" aria-live="polite">
      {rect ? (
        <>
          <div className="tourdim" style={{ left: 0, top: 0, width: "100%", height: Math.max(0, rect.y - pad), background: dimBg }} />
          <div className="tourdim" style={{ left: 0, top: rect.y + rect.h + pad, width: "100%", bottom: 0, background: dimBg }} />
          <div className="tourdim" style={{ left: 0, top: Math.max(0, rect.y - pad), width: Math.max(0, rect.x - pad), height: rect.h + pad * 2, background: dimBg }} />
          <div className="tourdim" style={{ left: rect.x + rect.w + pad, top: Math.max(0, rect.y - pad), right: 0, height: rect.h + pad * 2, background: dimBg }} />
          <div className={`tourring ${current.alert && fired ? "alert" : ""}`} style={{ left: rect.x - pad, top: rect.y - pad, width: rect.w + pad * 2, height: rect.h + pad * 2 }} />
        </>
      ) : (
        <div className="tourdim" style={{ inset: 0, background: dimBg }} />
      )}

      <div className={`tourcap ${current.alert ? "alertcap" : ""}`}>
        <div className="tc-top">
          <span className="tc-num">{step + 1} / {STEPS.length}</span>
          <span className="tc-title">{current.eyebrow}</span>
        </div>
        <div className="tc-say">{sayText}</div>
        <div className="tc-ctl">
          <button type="button" className="tc-btn" onClick={() => goTo(step - 1)} disabled={first}>← Back</button>
          {showFire ? (
            <button type="button" className="tc-btn fire" onClick={doAction} disabled={busy}>{busy ? "…" : current.actionLabel}</button>
          ) : (
            <button type="button" className="tc-btn primary" onClick={() => goTo(step + 1)} disabled={last}>Next ␣</button>
          )}
          <span className="tc-hint">SPACE next · ← back · ESC exit</span>
        </div>
      </div>
    </div>
  );
}
