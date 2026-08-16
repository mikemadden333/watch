"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/* ============================================================
   Presenter tour — a semi-automated demo the presenter drives.
   ⌃⇧G arms it (and seeds the one consistent incident so every
   tab tells the same story). SPACE steps forward, ← steps back,
   ESC exits. Each step spotlights one element (dims the rest,
   glows the target) and shows a caption of what to say. It never
   blocks clicks, so the presenter can still drive by hand — the
   tour is a rail, not a cage.
   ============================================================ */

interface Step {
  tab: string;
  view?: "ceo" | "leader";
  campus?: string;
  target: string | null; // data-tour value; null = caption only, no dim
  title: string;
  say: string;
}

const STEPS: Step[] = [
  { tab: "briefing", view: "ceo", target: "brief-answer", title: "Briefing · the network", say: "What the head of the network sees first — overnight, across every school. The answer, before the phone rings." },
  { tab: "briefing", view: "leader", campus: "GPA", target: "brief-answer", title: "Briefing · one principal", say: "Garfield Park Academy. A shooting a quarter-mile from the front door last night. She knew before she got in the car." },
  { tab: "map", view: "leader", campus: "GPA", target: "map-pop", title: "Map · confirmed only", say: "Every dot is confirmed — police or the medical examiner. Here's last night's shooting, placed and timestamped." },
  { tab: "pulse", view: "leader", campus: "GPA", target: "pulse-graphic", title: "Pulse · the pattern", say: "125 days around these schools. Each mark is a verified incident. This is the pattern one night can't show you." },
  { tab: "action", view: "leader", campus: "GPA", target: "action-start", title: "Action · run the plan", say: "Press Begin to turn the plan into a live checklist. A person starts it — Watch never does." },
  { tab: "comms", view: "leader", campus: "GPA", target: "comms-draft", title: "Communications · tell families", say: "Facts locked from the record. Pick the audience and Watch writes a first draft in your school's voice." },
  { tab: "record", view: "leader", campus: "GPA", target: "record-ledger", title: "Record · trust", say: "Everything Watch did, scored against the official record. Nothing here can be edited." },
  { tab: "briefing", view: "leader", campus: "GPA", target: null, title: "Live alert", say: "Now press ⌃⇧A — a real text hits your phone. In a real network it hits every leader within a mile." },
  { tab: "about", target: "about-team", title: "About · the ask", say: "Built by people who've run this. $500K puts Watch in front of every Chicago charter student, free for a year." },
];

interface Rect { x: number; y: number; w: number; h: number; }

export default function PresenterTour({ enabled, slug, base }: { enabled: boolean; slug: string; base: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef(0);

  const current = STEPS[step];

  // hydrate persisted tour state (survives cross-tab navigation)
  useEffect(() => {
    try {
      setActive(localStorage.getItem("watch-tour-active") === "1");
      const s = parseInt(localStorage.getItem("watch-tour-step") || "0", 10);
      setStep(Number.isNaN(s) ? 0 : Math.max(0, Math.min(STEPS.length - 1, s)));
    } catch { /* no storage */ }
  }, []);

  const urlFor = useCallback((st: Step) => {
    const q = new URLSearchParams();
    if (st.view) q.set("view", st.view);
    if (st.campus) q.set("campus", st.campus);
    const s = q.toString();
    return `${base}/${st.tab}${s ? "?" + s : ""}`;
  }, [base]);

  // follow the target rect every frame while active (so the spotlight tracks scroll/layout)
  useEffect(() => {
    if (!active) { setRect(null); return; }
    let stop = false;
    const tick = () => {
      if (stop) return;
      const sel = current?.target;
      const el = sel ? (document.querySelector(`[data-tour="${sel}"]`) as HTMLElement | null) : null;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : null);
      } else {
        setRect(null);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { stop = true; cancelAnimationFrame(rafRef.current); };
  }, [active, step, current?.target, pathname]);

  // scroll the target into view on step change (retry until it renders)
  useEffect(() => {
    if (!active || !current?.target) return;
    let tries = 0;
    const t = setInterval(() => {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); clearInterval(t); }
      if (++tries > 20) clearInterval(t);
    }, 150);
    return () => clearInterval(t);
  }, [active, step, current?.target, pathname]);

  const persist = (a: boolean, s: number) => {
    try {
      if (a) { localStorage.setItem("watch-tour-active", "1"); localStorage.setItem("watch-tour-step", String(s)); }
      else { localStorage.removeItem("watch-tour-active"); localStorage.removeItem("watch-tour-step"); }
    } catch { /* no storage */ }
  };

  const goTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(STEPS.length - 1, idx));
    setStep(clamped);
    persist(true, clamped);
    const st = STEPS[clamped];
    const want = urlFor(st);
    const search = typeof window !== "undefined" ? window.location.search : "";
    const onRightTab = pathname === `${base}/${st.tab}`;
    const onRightView = !st.view || search.includes(`view=${st.view}`);
    if (!onRightTab || !onRightView) router.push(want);
  }, [pathname, router, base, urlFor]);

  const arm = useCallback(async () => {
    try {
      await fetch("/api/demo/incident", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }) });
    } catch { /* seed best-effort */ }
    setActive(true); setStep(0); persist(true, 0);
    router.push(urlFor(STEPS[0]));
  }, [router, slug, urlFor]);

  const exit = useCallback(() => { setActive(false); setRect(null); persist(false, 0); }, []);

  // keyboard: arm/step/exit
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
  const dimBg = "rgba(5,9,20,0.66)";
  const first = step === 0;
  const last = step === STEPS.length - 1;

  return (
    <div className="tourroot" aria-live="polite">
      {rect ? (
        <>
          {/* four-panel dim with a rectangular hole around the target */}
          <div className="tourdim" style={{ left: 0, top: 0, width: "100%", height: Math.max(0, rect.y - pad), background: dimBg }} />
          <div className="tourdim" style={{ left: 0, top: rect.y + rect.h + pad, width: "100%", bottom: 0, background: dimBg }} />
          <div className="tourdim" style={{ left: 0, top: Math.max(0, rect.y - pad), width: Math.max(0, rect.x - pad), height: rect.h + pad * 2, background: dimBg }} />
          <div className="tourdim" style={{ left: rect.x + rect.w + pad, top: Math.max(0, rect.y - pad), right: 0, height: rect.h + pad * 2, background: dimBg }} />
          {/* the glow ring */}
          <div className="tourring" style={{ left: rect.x - pad, top: rect.y - pad, width: rect.w + pad * 2, height: rect.h + pad * 2 }} />
        </>
      ) : (
        current?.target ? <div className="tourdim" style={{ inset: 0, background: dimBg }} /> : null
      )}

      {/* caption */}
      <div className="tourcap">
        <div className="tc-top">
          <span className="tc-num">{step + 1} / {STEPS.length}</span>
          <span className="tc-title">{current.title}</span>
        </div>
        <div className="tc-say">{current.say}</div>
        <div className="tc-ctl">
          <button type="button" className="tc-btn" onClick={() => goTo(step - 1)} disabled={first}>← Back</button>
          <button type="button" className="tc-btn primary" onClick={() => goTo(step + 1)} disabled={last}>Next ␣</button>
          <span className="tc-hint">SPACE next · ← back · ESC exit</span>
        </div>
      </div>
    </div>
  );
}
