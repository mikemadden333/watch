"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/* ============================================================
   Presenter tour — one continuous story you drive.
   ⌃⇧G arms it: the network goes quiet (all clear), and you walk a
   single incident all the way through Watch as Principal Thomas —
   it fires live (with the real text), then Briefing → Map → Pulse →
   Action (the checklist) → Communications (the family message) →
   Record. SPACE steps forward, ← back, ESC exits. The tour becomes
   the only narrator (the standalone alert cards step aside), so the
   fire and the walk are one seamless thing. Manual hotkeys still
   work for a one-off.
   ============================================================ */

interface Step {
  tab: string;
  view?: "ceo" | "leader";
  campus?: string;
  target: string | null;
  eyebrow: string;
  say: string;
  sayAfter?: string;      // shown after a fire action completes
  intro?: boolean;        // full centered title card
  fire?: boolean;         // caption button fires the live alert (+ text)
  click?: string;         // caption button clicks this data-tour target
  actionLabel?: string;
  alert?: boolean;        // caption styled as an alert beat
}

const STEPS: Step[] = [
  {
    tab: "briefing", view: "leader", campus: "GPA", target: null, intro: true,
    eyebrow: "What Watch is",
    say: "Watch listens for violent crime within a mile of every campus — around the clock, from the public record today, and Citizen soon. When something happens, the school knows first. What follows is one morning at Garfield Park Academy, in the chair of its principal, R. Thomas.",
  },
  {
    tab: "briefing", view: "leader", campus: "GPA", target: "brief-answer",
    eyebrow: "The quiet",
    say: "The building is awake. Buses are turning onto Madison, the first bells are minutes off, and every campus reads clear. This is the calm you stop noticing — until it doesn't hold.",
  },
  {
    tab: "briefing", view: "leader", campus: "GPA", target: "brief-answer", alert: true,
    fire: true, actionLabel: "Fire the incident",
    eyebrow: "It breaks",
    say: "A mile out, a gun goes off. No call has reached the office yet — but Watch already has it. Fire it, and check your phone.",
    sayAfter: "There. A quarter — no, an eighth of a mile. Confirmed. Your phone buzzed just now, and so did every leader's. This is knowing first. Now you answer it.",
  },
  {
    tab: "briefing", view: "leader", campus: "GPA", target: "brief-answer",
    eyebrow: "What happened",
    say: "Not a headline. The block, the distance, the time, and who confirmed it — laid out the way a leader needs it at 7 a.m., not the way a newsroom writes it at noon.",
  },
  {
    tab: "map", view: "leader", campus: "GPA", target: "map-pop",
    eyebrow: "Where",
    say: "Thomas knows this corner. He's walked children past it. Every dot here is confirmed — police or the medical examiner. If it can't be placed, it isn't on the map.",
  },
  {
    tab: "pulse", view: "leader", campus: "GPA", target: "pulse-graphic",
    eyebrow: "Why it matters",
    say: "And it isn't the first. Violence moves like contagion — one shooting leaves a block hot for months, then slowly cools. This is that pattern, near his school, in a single glance.",
  },
  {
    tab: "action", view: "leader", campus: "GPA", target: "action-start",
    click: "action-begin", actionLabel: "Begin the response",
    eyebrow: "He acts",
    say: "Knowing isn't the whole job. Thomas starts the response — a person does that, never Watch. His own plan is already loaded. Begin it.",
  },
  {
    tab: "action", view: "leader", campus: "GPA", target: "action-posture",
    eyebrow: "The posture",
    say: "SECURE — get inside, lock the outside doors. He'll say it twice, exactly, and the words to speak are right there. Set it.",
  },
  {
    tab: "action", view: "leader", campus: "GPA", target: "action-run",
    eyebrow: "The checklist",
    say: "Four phases, in the order a real morning runs them. Every step he checks stamps his initials and the minute. When it's over, nothing about what he did is lost.",
  },
  {
    tab: "comms", view: "leader", campus: "GPA", target: "comms-draft",
    eyebrow: "The hardest part",
    say: "Then the call he dreads: telling families. The facts are locked from the record — Watch can't move them. It writes the first draft in his school's own voice. He edits it, and he sends it. Nothing leaves Watch on its own.",
  },
  {
    tab: "record", view: "leader", campus: "GPA", target: "record-ledger",
    eyebrow: "The record",
    say: "Every move, logged and unchangeable — and scored against the official record when it lands. Watch keeps its own honesty, in the open, where the district can see it.",
  },
  {
    tab: "briefing", view: "ceo", campus: "GPA", target: "brief-answer",
    eyebrow: "And upstairs",
    say: "While Thomas worked, the network office saw all of it — every campus, one screen, the moment it happened. One principal is never alone with it again.",
  },
  {
    tab: "about", target: "about-team", intro: true,
    eyebrow: "The ask",
    say: "Watch is built by people who have sat in that chair. Five hundred thousand dollars puts it in front of every charter student in Chicago, free for a year — because the schools that need it most can least afford it.",
  },
];

interface Rect { x: number; y: number; w: number; h: number; }

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

  // hydrate persisted tour state (survives cross-tab navigation)
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

  // follow the target rect every frame while active
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

  // scroll target into view on step change (retry until it renders)
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
    setActive(true); setStep(0); persist(true, 0); emit(true);
    router.push(urlFor(STEPS[0]));
    router.refresh(); // invalidate the router cache so we open genuinely all-clear
  }, [router, slug, urlFor]);

  const exit = useCallback(() => { setActive(false); setRect(null); persist(false, 0); emit(false); }, []);

  // caption action button: fire the live incident, or click a target
  const doAction = useCallback(async () => {
    if (current?.fire) {
      setBusy(true);
      try {
        await fetch("/api/demo/incident", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, alert: true }) });
      } catch { /* best-effort */ }
      setBusy(false);
      setFired(true);
      try { window.dispatchEvent(new Event("watch:poll")); } catch { /* ignore */ }
      router.refresh();
      // belt-and-suspenders: the RSC posture can lag the client poll by a beat
      setTimeout(() => router.refresh(), 1000);
    } else if (current?.click) {
      const el = document.querySelector(`[data-tour="${current.click}"]`) as HTMLElement | null;
      el?.click();
    }
  }, [current, slug, router]);

  // keyboard
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
  const showAction = (current.fire && !fired) || (current.click && !current.fire);
  const sayText = current.fire && fired && current.sayAfter ? current.sayAfter : current.say;

  // intro / title-card layout
  if (current.intro) {
    return (
      <div className="tourroot">
        <div className="tourdim" style={{ inset: 0, background: dimBg }} />
        <div className="tourcard">
          <div className="tc-eyebrow">{current.eyebrow}</div>
          <p className="tc-lead">{sayText}</p>
          <div className="tc-ctl">
            <button type="button" className="tc-btn" onClick={() => goTo(step - 1)} disabled={first}>← Back</button>
            <button type="button" className="tc-btn primary" onClick={() => goTo(step + 1)} disabled={last}>{first ? "Begin the walk ␣" : "Next ␣"}</button>
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
          {showAction ? (
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
