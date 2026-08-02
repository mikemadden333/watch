"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtCentral } from "@/lib/time";

/* ============================================================
   LiveLayer — the in-app arrival experience.
   Ambient-calm at rest (a barely-perceptible "watching" breath + a feed
   that ticks), polling the live state, and — when a campus actually
   escalates — the tiered choreography from the motion study:
     MONITOR  → whisper (a quiet chip; no sound)
     ELEVATED → speak (a card rises and settles; no sound)
     ALERT    → interrupt (the screen yields; the ONE sound)
   Real signals only. A ?preview affordance lets you demo the feel without
   touching data (every preview is labeled "not a live incident").
   ============================================================ */

type Level = "CLEAR" | "MONITOR" | "ELEVATED" | "ALERT";
const RANK: Record<Level, number> = { CLEAR: 0, MONITOR: 1, ELEVATED: 2, ALERT: 3 };
const POLL_MS = 20000;

interface StatusLite { c: string; s: Level; since: string; rule: string | null; ruleName: string | null; detail: string | null; inc: string | null; }
interface IncidentLite { id: string; tier: string; kind: string; headline: string; dist: number | null; bearing: string | null; near: string | null; geo: string | null; occurred: string; published: string; }
interface Snapshot { live: boolean; at: string; worst: Level; statuses: StatusLite[]; incidents: IncidentLite[]; feeds: { k: string; label: string; state: string }[]; }

interface Overlay {
  kind: "whisper" | "speak" | "interrupt" | "resolve";
  level: Level;
  campus: string;
  tierLabel?: string;
  headline: string;
  where: string;
  occurred?: string;
  published?: string;
  preview?: boolean;
}

export default function LiveLayer({
  slug,
  initialStatuses,
  campusNames,
}: {
  slug: string;
  initialStatuses: { c: string; s: Level }[];
  campusNames: Record<string, string>;
}) {
  const router = useRouter();
  const prev = useRef<Map<string, Level>>(new Map(initialStatuses.map((s) => [s.c, s.s])));
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [muted, setMuted] = useState(false);
  const [feed, setFeed] = useState("watching");
  const [pulse, setPulse] = useState<Level>("CLEAR");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acRef = useRef<AudioContext | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    try { setMuted(localStorage.getItem("watch.mute") === "1"); } catch { /* ignore */ }
    if (typeof window !== "undefined" && window.location.search.includes("preview")) setShowPreview(true);
  }, []);

  const name = useCallback((code: string) => campusNames[code] ?? code, [campusNames]);

  function alertSound() {
    if (muted) return;
    try {
      const AC = acRef.current || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      acRef.current = AC;
      const t = AC.currentTime;
      [[660, 0], [880, 0.15]].forEach(([f, d]) => {
        const o = AC.createOscillator(); const g = AC.createGain();
        o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(AC.destination);
        g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(0.16, t + d + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.5);
        o.start(t + d); o.stop(t + d + 0.55);
      });
    } catch { /* audio unavailable */ }
  }

  const play = useCallback((o: Overlay) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setOverlay(o);
    setPulse(o.level);
    if (o.level === "ALERT") alertSound();
    // whisper + resolve auto-dismiss; speak lingers; interrupt stays until dismissed
    const life = o.kind === "whisper" ? 9000 : o.kind === "resolve" ? 7000 : o.kind === "speak" ? 30000 : 0;
    if (life > 0) dismissTimer.current = setTimeout(() => setOverlay(null), life);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  const softRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), 1200);
  }, [router]);

  // polling + diff
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const res = await fetch(`/api/state/${slug}`, { cache: "no-store" });
        if (!res.ok) return;
        const snap = (await res.json()) as Snapshot;
        if (!alive || !snap.live) return;

        let topEsc: { st: StatusLite; level: Level } | null = null;
        let anyDeesc: StatusLite | null = null;
        for (const st of snap.statuses) {
          const was = prev.current.get(st.c) ?? "CLEAR";
          if (RANK[st.s] > RANK[was]) {
            if (!topEsc || RANK[st.s] > RANK[topEsc.level]) topEsc = { st, level: st.s };
          } else if (RANK[st.s] < RANK[was] && st.s === "CLEAR") {
            anyDeesc = st;
          }
          prev.current.set(st.c, st.s);
        }

        if (topEsc) {
          const inc = snap.incidents.find((i) => i.id === topEsc!.st.inc);
          const where = inc && inc.dist != null
            ? `${name(topEsc.st.c)} · ${inc.dist} mi ${inc.bearing ?? ""} · ${plainSrc(inc)}`
            : `${name(topEsc.st.c)} · ${topEsc.st.detail ?? topEsc.st.ruleName ?? ""}`;
          play({
            kind: topEsc.level === "ALERT" ? "interrupt" : topEsc.level === "ELEVATED" ? "speak" : "whisper",
            level: topEsc.level,
            campus: topEsc.st.c,
            tierLabel: inc?.tier,
            headline: inc?.headline?.replace(/^News · /, "") ?? topEsc.st.detail ?? `${topEsc.level} posture`,
            where,
            occurred: inc?.occurred,
            published: inc?.published,
          });
          softRefresh();
        } else if (anyDeesc && !overlay) {
          play({ kind: "resolve", level: "CLEAR", campus: anyDeesc.c, headline: `${name(anyDeesc.c)} back to clear`, where: "Resolved · ring clear" });
          softRefresh();
        }
        setPulse(snap.worst);
      } catch { /* network blip — try next tick */ }
    }
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // ambient feed tick — feels awake without nagging
  useEffect(() => {
    const labels = ["NWS · live", "local news · live", "CPD ME · in window", "GDELT · live", "dispatch · live"];
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % labels.length; setFeed(labels[i]); }, 4200);
    return () => clearInterval(id);
  }, []);

  function toggleMute() {
    setMuted((m) => { const n = !m; try { localStorage.setItem("watch.mute", n ? "1" : "0"); } catch { /* */ } return n; });
  }

  // preview samples — clearly labeled, no data touched
  const PREVIEWS: Record<string, Overlay> = {
    whisper: { kind: "whisper", level: "MONITOR", campus: "WDL", tierLabel: "CORROBORATED", headline: "Corroborated report · shots-fired", where: "Woodlawn Academy · 2 outlets · block-level", preview: true },
    speak: { kind: "speak", level: "ELEVATED", campus: "ENG", tierLabel: "CONFIRMED", headline: "Confirmed shooting · 0.31 mi NE", where: "Englewood Prep · CPD record · inside 0.5 mi", occurred: "2026-08-01T02:47:00Z", published: "2026-08-01T11:40:00Z", preview: true },
    interrupt: { kind: "interrupt", level: "ALERT", campus: "ENG", headline: "Confirmed shooting inside 0.25 mi", where: "Englewood Prep · CPD record · precise · latest data day", occurred: "2026-08-01T02:47:00Z", published: "2026-08-01T11:40:00Z", preview: true },
  };

  const col = colorFor(pulse);

  return (
    <>
      <style>{CSS}</style>

      {/* ambient "watching" pill — always on, barely there */}
      <div className="ll-amb" aria-hidden="true">
        <span className="ll-breath" style={{ background: col }} />
        <span className="ll-amb-txt">{feed}</span>
        <button className="ll-mute" onClick={toggleMute} title={muted ? "Sound off (Alert only)" : "Sound on (Alert only)"}>
          {muted ? "🔇" : "🔔"}
        </button>
      </div>

      {showPreview && (
        <div className="ll-prev">
          <span className="ll-prev-l">Preview the arrival</span>
          <button onClick={() => play(PREVIEWS.whisper)}>Whisper</button>
          <button onClick={() => play(PREVIEWS.speak)}>Speak</button>
          <button onClick={() => play(PREVIEWS.interrupt)}>Interrupt</button>
        </div>
      )}

      {/* WHISPER — Monitor */}
      {overlay?.kind === "whisper" && (
        <div className="ll-whisper" role="status">
          <span className="ll-dot" style={{ background: "var(--monitor)" }} />
          <b>{overlay.campus}</b>&nbsp;· {overlay.headline}
          {overlay.tierLabel && <span className="ll-tier mon">{overlay.tierLabel}</span>}
          {overlay.preview && <span className="ll-pv">PREVIEW</span>}
          <button className="ll-x" onClick={() => setOverlay(null)}>×</button>
        </div>
      )}

      {/* SPEAK — Elevated */}
      {overlay?.kind === "speak" && (
        <div className="ll-speak" role="alert">
          <div className="ll-speak-top">
            <span className="ll-tier elev">{overlay.tierLabel ?? "ELEVATED"}</span>
            {overlay.preview && <span className="ll-pv">PREVIEW · not a live incident</span>}
            <button className="ll-x" onClick={() => setOverlay(null)}>×</button>
          </div>
          <div className="ll-hl">{overlay.headline}</div>
          <div className="ll-where">{overlay.where}</div>
          {(overlay.occurred || overlay.published) && (
            <div className="ll-clocks">
              <span><i>occurred</i>{fmtCentral(overlay.occurred) || "—"}</span>
              <span><i>published</i>{fmtCentral(overlay.published) || "—"}</span>
            </div>
          )}
        </div>
      )}

      {/* RESOLVE — de-escalation */}
      {overlay?.kind === "resolve" && (
        <div className="ll-resolve" role="status">
          <span className="ll-dot" style={{ background: "var(--clear)" }} />
          {overlay.headline} · {overlay.where}
        </div>
      )}

      {/* INTERRUPT — Alert */}
      {overlay?.kind === "interrupt" && (
        <div className="ll-take" role="alertdialog" aria-label="Alert">
          <div className="ll-take-card">
            <div className="ll-flag">◆ LIVE · ALERT · {name(overlay.campus)}</div>
            <div className="ll-big">{overlay.headline}</div>
            <div className="ll-desc">{overlay.where}</div>
            {(overlay.occurred || overlay.published) && (
              <div className="ll-clocks light">
                <span><i>occurred</i>{fmtCentral(overlay.occurred) || "—"}</span>
                <span><i>published</i>{fmtCentral(overlay.published) || "—"}</span>
              </div>
            )}
            {overlay.preview && <div className="ll-pv big">PREVIEW · not a live incident</div>}
            <div className="ll-acts">
              <b>Open playbook →</b>
              <span>Send parent HOLD template</span>
              <span>Call CPD liaison</span>
            </div>
            <button className="ll-dismiss" onClick={() => setOverlay(null)}>Acknowledge · keep watching</button>
          </div>
        </div>
      )}
    </>
  );
}

function colorFor(l: Level) {
  return l === "ALERT" ? "var(--alert)" : l === "ELEVATED" ? "var(--elevated)" : l === "MONITOR" ? "var(--monitor)" : "var(--clear)";
}
function plainSrc(i: IncidentLite): string {
  if (i.tier === "CONFIRMED") return "confirmed record";
  if (i.tier === "CORROBORATED") return "corroborated · unconfirmed";
  return "reported · unconfirmed";
}

const CSS = `
.ll-amb{position:fixed;right:14px;top:60px;z-index:8000;display:flex;align-items:center;gap:9px;background:color-mix(in srgb,var(--panel) 84%,transparent);backdrop-filter:blur(10px);border:1px solid var(--line2);border-radius:22px;padding:6px 10px 6px 12px;box-shadow:0 3px 14px rgba(27,26,23,.10);font-size:11px;color:var(--mut);}
.ll-breath{width:9px;height:9px;border-radius:50%;position:relative;}
.ll-breath::after{content:"";position:absolute;inset:0;border-radius:50%;background:inherit;animation:llbreath 3.4s ease-out infinite;}
@keyframes llbreath{0%{transform:scale(1);opacity:.5}70%{transform:scale(3);opacity:0}100%{opacity:0}}
.ll-amb-txt{font-family:var(--mono,monospace);letter-spacing:.02em;min-width:118px;}
.ll-mute{border:none;background:transparent;cursor:pointer;font-size:13px;line-height:1;padding:2px;border-radius:6px;}
.ll-prev{position:fixed;left:14px;top:60px;z-index:8000;display:flex;align-items:center;gap:6px;background:var(--panel);border:1px dashed var(--line2);border-radius:12px;padding:6px 8px;font-size:11px;}
.ll-prev-l{color:var(--mut);font-family:var(--mono,monospace);letter-spacing:.04em;margin-right:2px;}
.ll-prev button{font-size:11px;border:1px solid var(--line2);background:var(--bg);border-radius:8px;padding:4px 9px;cursor:pointer;color:var(--ink);}
.ll-tier{font-family:var(--mono,monospace);font-size:8.5px;font-weight:700;letter-spacing:.08em;padding:2px 6px;border-radius:20px;margin-left:6px;}
.ll-tier.mon{color:var(--monitor);background:color-mix(in srgb,var(--monitor) 15%,transparent);}
.ll-tier.elev{color:var(--elevated);background:color-mix(in srgb,var(--elevated) 15%,transparent);}
.ll-pv{font-family:var(--mono,monospace);font-size:8.5px;font-weight:700;letter-spacing:.1em;color:var(--mut);border:1px solid var(--line2);border-radius:20px;padding:2px 6px;margin-left:6px;}
.ll-pv.big{display:inline-block;margin:8px 0 0;}
.ll-dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto;}
.ll-x{margin-left:auto;border:none;background:transparent;font-size:16px;line-height:1;color:var(--mut);cursor:pointer;padding:0 2px;}
.ll-whisper{position:fixed;top:104px;left:50%;transform:translateX(-50%);z-index:8100;display:flex;align-items:center;gap:6px;background:var(--panel);border:1px solid var(--line2);border-left:3px solid var(--monitor);border-radius:12px;padding:10px 12px;font-size:12.5px;color:var(--ink);box-shadow:0 8px 24px rgba(27,26,23,.12);max-width:min(440px,92vw);animation:llwhisper .5s cubic-bezier(.22,.61,.36,1);}
@keyframes llwhisper{from{opacity:0;transform:translateX(-50%) translateY(-14px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
.ll-speak{position:fixed;right:16px;bottom:16px;z-index:8100;width:min(340px,92vw);background:var(--panel);border:1px solid var(--line2);border-radius:16px;padding:15px 16px;box-shadow:0 16px 40px rgba(27,26,23,.20);animation:llspeak .6s cubic-bezier(.34,1.56,.64,1);}
@keyframes llspeak{from{opacity:0;transform:translateY(28px) scale(.96);}to{opacity:1;transform:none;}}
.ll-speak-top{display:flex;align-items:center;gap:8px;}
.ll-hl{font-weight:600;font-size:15px;margin:10px 0 3px;line-height:1.3;}
.ll-where{font-size:12px;color:var(--mut);}
.ll-clocks{display:flex;gap:16px;margin-top:11px;padding-top:10px;border-top:1px solid var(--line);}
.ll-clocks span{font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;}
.ll-clocks i{display:block;font-style:normal;font-family:var(--mono,monospace);font-size:8px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);font-weight:500;margin-bottom:1px;}
.ll-clocks.light span{color:var(--ink);}
.ll-resolve{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:8100;display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--line2);border-radius:22px;padding:9px 15px;font-size:12px;color:var(--ink);box-shadow:0 8px 24px rgba(27,26,23,.12);animation:llwhisper .5s ease;}
.ll-take{position:fixed;inset:0;z-index:9500;background:rgba(27,26,23,.5);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:20px;animation:llfade .3s ease;}
@keyframes llfade{from{opacity:0}to{opacity:1}}
.ll-take-card{width:min(460px,100%);background:var(--alertbg,#F6DED8);border:1px solid var(--alert);border-radius:20px;padding:26px 24px;box-shadow:0 26px 70px rgba(27,26,23,.34);animation:lltake .45s cubic-bezier(.22,.61,.36,1);}
@keyframes lltake{from{opacity:0;transform:scale(1.05);}to{opacity:1;transform:none;}}
.ll-flag{font-family:var(--mono,monospace);font-size:10px;font-weight:700;letter-spacing:.16em;color:var(--alert);}
.ll-big{font-family:var(--serif,Georgia,serif);font-size:29px;font-weight:600;color:var(--alert);line-height:1.05;margin:9px 0 10px;}
.ll-desc{font-size:13.5px;color:var(--ink);line-height:1.45;}
.ll-acts{margin-top:20px;display:flex;flex-direction:column;gap:9px;}
.ll-acts b{background:var(--alert);color:#fff;text-align:center;padding:11px;border-radius:13px;font-size:13.5px;}
.ll-acts span{border:1px solid var(--line2);text-align:center;padding:10px;border-radius:13px;font-size:12.5px;color:var(--ink);}
.ll-dismiss{margin-top:16px;width:100%;background:transparent;border:none;color:var(--mut);font-size:12px;cursor:pointer;text-decoration:underline;}
@media (prefers-reduced-motion:reduce){.ll-breath::after{display:none;}.ll-whisper,.ll-speak,.ll-take-card,.ll-take,.ll-resolve{animation-duration:.001s;}}
`;
