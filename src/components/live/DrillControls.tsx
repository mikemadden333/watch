"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* Demo DRILL controls. Available on every page whenever DEMO_MODE=1 (passed
   in as `enabled`) — no ?drill needed; ?drill still reveals it as a fallback.
   Hotkeys work globally while visible:
       ⌃⇧D  simulate alert       ⌃⇧C  all clear
   Fires a clearly-labeled SIMULATED shooting near a campus that runs the real
   rules engine → posture escalates → the in-app ALERT fires (and a text, if
   Twilio is live). Collapses to a small pill so it never clutters a demo.
   ============================================================ */

const kbd: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 8.5,
  opacity: 0.75,
  border: "1px solid currentColor",
  borderRadius: 4,
  padding: "1px 4px",
  lineHeight: 1,
  letterSpacing: "0.02em",
};

export default function DrillControls({ slug, enabled = false }: { slug: string; enabled?: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState<"" | "fire" | "clear">("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (enabled) { setOn(true); return; }
    if (typeof window !== "undefined" && window.location.search.includes("drill")) setOn(true);
  }, [enabled]);

  const poke = useCallback(() => {
    window.dispatchEvent(new CustomEvent("watch:poll"));
    setTimeout(() => window.dispatchEvent(new CustomEvent("watch:poll")), 1500);
    router.refresh();
  }, [router]);

  const fire = useCallback(async () => {
    setBusy("fire"); setMsg("");
    try {
      const res = await fetch("/api/demo/incident", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }),
      });
      const j = await res.json();
      setMsg(j.ok ? `Fired · ${j.campusName ?? j.campus}` : `Error: ${j.error ?? "failed"}`);
      poke();
    } catch { setMsg("Network error"); }
    setBusy("");
  }, [slug, poke]);

  const clear = useCallback(async () => {
    setBusy("clear"); setMsg("");
    try {
      const res = await fetch("/api/demo/clear", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }),
      });
      const j = await res.json();
      setMsg(j.ok ? `Cleared (${j.cleared})` : `Error: ${j.error ?? "failed"}`);
      poke();
    } catch { setMsg("Network error"); }
    setBusy("");
  }, [slug, poke]);

  useEffect(() => {
    if (!on) return;
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey && e.shiftKey)) return;
      if (e.code === "KeyD") { e.preventDefault(); setOpen(true); fire(); }
      if (e.code === "KeyC") { e.preventDefault(); setOpen(true); clear(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on, fire, clear]);

  if (!on) return null;

  // collapsed → a small unobtrusive pill
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Demo controls (⌃⇧D simulate · ⌃⇧C clear)"
        style={{
          position: "fixed", left: 14, bottom: 14, zIndex: 8600,
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 999,
          padding: "7px 12px", color: "var(--mut)", cursor: "pointer",
          fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: "0.14em", textTransform: "uppercase",
          boxShadow: "0 6px 20px rgba(0,0,0,.42)",
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--alert)" }} />
        Demo
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed", left: 14, bottom: 14, zIndex: 8600, width: 186,
        background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 12,
        padding: "10px 11px", boxShadow: "0 10px 30px rgba(0,0,0,.45)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--alert)", flex: "0 0 auto" }} />
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.16em", color: "var(--mut)", fontWeight: 600 }}>
          DEMO MODE
        </span>
        <button
          onClick={() => setOpen(false)}
          aria-label="Collapse demo controls"
          title="Collapse"
          style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--mut)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}
        >
          –
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          onClick={fire}
          disabled={!!busy}
          style={{
            width: "100%", fontSize: 12.5, fontWeight: 600, border: "none",
            background: "var(--alert)", color: "#fff", borderRadius: 9,
            padding: "8px 10px", cursor: busy ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            opacity: busy === "fire" ? 0.7 : 1,
          }}
        >
          {busy === "fire" ? "Firing…" : "Simulate alert"}
          <kbd style={kbd}>⌃⇧D</kbd>
        </button>
        <button
          onClick={clear}
          disabled={!!busy}
          style={{
            width: "100%", fontSize: 12.5, fontWeight: 500, border: "1px solid var(--line2)",
            background: "transparent", color: "var(--ink)", borderRadius: 9,
            padding: "7px 10px", cursor: busy ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            opacity: busy === "clear" ? 0.7 : 1,
          }}
        >
          {busy === "clear" ? "Clearing…" : "All clear"}
          <kbd style={kbd}>⌃⇧C</kbd>
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 9.5, color: msg ? "var(--ink)" : "var(--faint)", fontFamily: "var(--mono)", lineHeight: 1.5 }}>
        {msg || "Simulated · never counts toward accuracy"}
      </div>
    </div>
  );
}
