"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/* Demo DRILL controls — for demonstrations only, gated behind ?drill in the
   URL so a real principal never triggers it. Fires a clearly-labeled
   SIMULATED shooting near a campus (Chicago or Dallas per the current
   network) that runs the real rules engine → posture escalates → the
   in-app ALERT fires (and a text, if Twilio is configured). Clear wipes it.

   Hotkeys:  ⌃⇧D  fire drill      ⌃⇧C  clear drill
   ============================================================ */

const kbd: React.CSSProperties = {
  fontFamily: "Menlo,monospace",
  fontSize: 9,
  opacity: 0.7,
  border: "1px solid currentColor",
  borderRadius: 4,
  padding: "1px 4px",
  lineHeight: 1,
};

export default function DrillControls({ slug }: { slug: string }) {
  const router = useRouter();
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState<"" | "fire" | "clear">("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("drill")) setOn(true);
  }, []);

  const poke = useCallback(() => {
    // make the in-app monitor re-check immediately, then sync server content
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
      setMsg(j.ok ? `Drill fired · ${j.campusName ?? j.campus}` : `Error: ${j.error ?? "failed"}`);
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
      if (e.code === "KeyD") { e.preventDefault(); fire(); }
      if (e.code === "KeyC") { e.preventDefault(); clear(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on, fire, clear]);

  if (!on) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 16,
        bottom: 16,
        zIndex: 8600,
        width: 208,
        background: "var(--panel)",
        border: "1px solid var(--line2)",
        borderRadius: 14,
        padding: "12px 13px 11px",
        boxShadow: "0 10px 32px rgba(27,26,23,.20)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--alert)", flex: "0 0 auto" }} />
        <span style={{ fontFamily: "Menlo,monospace", fontSize: 9.5, letterSpacing: ".14em", color: "var(--mut)", fontWeight: 600 }}>
          DEMO CONTROLS
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <button
          onClick={fire}
          disabled={!!busy}
          style={{
            width: "100%", fontSize: 13, fontWeight: 600, border: "none",
            background: "var(--alert)", color: "#fff", borderRadius: 10,
            padding: "10px", cursor: busy ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
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
            width: "100%", fontSize: 13, fontWeight: 500, border: "1px solid var(--line2)",
            background: "transparent", color: "var(--ink)", borderRadius: 10,
            padding: "9px", cursor: busy ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            opacity: busy === "clear" ? 0.7 : 1,
          }}
        >
          {busy === "clear" ? "Clearing…" : "All clear"}
          <kbd style={kbd}>⌃⇧C</kbd>
        </button>
      </div>
      {msg ? (
        <div style={{ marginTop: 9, fontSize: 10.5, color: "var(--ink)", fontFamily: "Menlo,monospace" }}>{msg}</div>
      ) : (
        <div style={{ marginTop: 9, fontSize: 10, color: "var(--mut)", lineHeight: 1.45 }}>
          Simulated &amp; labeled — never counts toward accuracy.
        </div>
      )}
    </div>
  );
}
