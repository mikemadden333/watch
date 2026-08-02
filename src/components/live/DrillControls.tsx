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
        position: "fixed", left: 14, bottom: 14, zIndex: 8600,
        background: "var(--panel)", border: "1px dashed var(--alert)", borderRadius: 12,
        padding: "10px 12px", boxShadow: "0 6px 20px rgba(27,26,23,.14)", maxWidth: 260,
      }}
    >
      <div style={{ fontFamily: "Menlo,monospace", fontSize: 10, letterSpacing: ".12em", color: "var(--alert)", fontWeight: 700 }}>
        ◆ DRILL MODE · demo
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={fire} disabled={!!busy}
          style={{ flex: 1, fontSize: 12, fontWeight: 600, border: "1px solid var(--alert)", background: "var(--alert)", color: "#fff", borderRadius: 9, padding: "8px 10px", cursor: "pointer" }}>
          {busy === "fire" ? "…" : "Fire ⌃⇧D"}
        </button>
        <button onClick={clear} disabled={!!busy}
          style={{ flex: 1, fontSize: 12, fontWeight: 600, border: "1px solid var(--line2)", background: "var(--bg)", color: "var(--ink)", borderRadius: 9, padding: "8px 10px", cursor: "pointer" }}>
          {busy === "clear" ? "…" : "Clear ⌃⇧C"}
        </button>
      </div>
      <div style={{ marginTop: 7, fontSize: 10.5, color: "var(--mut)", lineHeight: 1.4 }}>
        Inserts a <b>clearly-labeled simulated</b> incident. Never counts toward the accuracy ledger.
      </div>
      {msg && <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--ink)", fontFamily: "Menlo,monospace" }}>{msg}</div>}
    </div>
  );
}
