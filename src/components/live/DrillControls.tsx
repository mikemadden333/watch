"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* Demo DRILL — hotkeys only, no persistent UI (it never draws the eye).
   Active on every page when DEMO_MODE=1 (passed as `enabled`); ?drill also
   arms it. A tiny confirmation toast appears for ~2.5s when you act, then
   vanishes.
       ⌃⇧D  simulate alert       ⌃⇧C  all clear
   Fires a clearly-labeled SIMULATED shooting that runs the real rules engine
   → posture escalates → the in-app ALERT fires (and a text, if Twilio is live).
   ============================================================ */

export default function DrillControls({ slug, enabled = false }: { slug: string; enabled?: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [toast, setToast] = useState("");
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (enabled) { setOn(true); return; }
    if (typeof window !== "undefined" && window.location.search.includes("drill")) setOn(true);
  }, [enabled]);

  const flash = useCallback((m: string) => {
    setToast(m);
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const poke = useCallback(() => {
    window.dispatchEvent(new CustomEvent("watch:poll"));
    setTimeout(() => window.dispatchEvent(new CustomEvent("watch:poll")), 1500);
    router.refresh();
  }, [router]);

  const fire = useCallback(async (alert = false) => {
    flash(alert ? "Simulating ALERT (text)…" : "Simulating…");
    try {
      const res = await fetch("/api/demo/incident", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, alert }),
      });
      const j = await res.json();
      flash(j.ok ? `${alert ? "ALERT" : "Simulated"} · ${j.campusName ?? j.campus}` : `Error: ${j.error ?? "failed"}`);
      poke();
    } catch { flash("Network error"); }
  }, [slug, poke, flash]);

  const clear = useCallback(async () => {
    flash("Clearing…");
    try {
      const res = await fetch("/api/demo/clear", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }),
      });
      const j = await res.json();
      flash(j.ok ? "All clear" : `Error: ${j.error ?? "failed"}`);
      poke();
    } catch { flash("Network error"); }
  }, [slug, poke, flash]);

  useEffect(() => {
    if (!on) return;
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey && e.shiftKey)) return;
      if (e.code === "KeyD") { e.preventDefault(); fire(false); }   // ELEVATED story
      if (e.code === "KeyA") { e.preventDefault(); fire(true); }    // ALERT → sends a text
      if (e.code === "KeyC") { e.preventDefault(); clear(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on, fire, clear]);

  // nothing on screen unless you just pressed a hotkey — then a small,
  // self-dismissing confirmation.
  if (!on || !toast) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed", left: 14, bottom: 14, zIndex: 8600,
        display: "inline-flex", alignItems: "center", gap: 8,
        background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 999,
        padding: "7px 13px", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: 11,
        letterSpacing: "0.03em", boxShadow: "0 6px 20px rgba(0,0,0,.42)", opacity: 0.97,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--alert)", flex: "0 0 auto" }} />
      {toast}
    </div>
  );
}
