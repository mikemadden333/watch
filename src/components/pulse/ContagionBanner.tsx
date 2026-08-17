"use client";

/* Live contagion-window banner. When a fresh confirmed shooting/homicide sits
   near the campus, this shows the current phase of the Papachristos window and
   counts the hours down in real time. Client component — it ticks every second. */

import { useEffect, useState } from "react";

const ACUTE_END = 18;   // hours
const ACTIVE_END = 72;  // hours — end of the peak retaliation window
const WATCH_END = 168;  // hours (7 days)

export interface TriggerInc {
  occurredAt: string;
  kind: string;
  distanceMi: number;
  bearing: string;
  fatal: boolean;
}

function fmtHMS(hoursRemaining: number): string {
  const total = Math.max(0, Math.round(hoursRemaining * 3600));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export default function ContagionBanner({ trigger, nowIso }: { trigger: TriggerInc; nowIso: string }) {
  // seed from the server "now" so first paint matches SSR, then tick live
  const [nowMs, setNowMs] = useState(() => new Date(nowIso).getTime());
  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const hoursSince = (nowMs - new Date(trigger.occurredAt).getTime()) / 3_600_000;
  if (hoursSince < 0 || hoursSince >= WATCH_END) return null;

  const kindWord = trigger.fatal ? "homicide" : "shooting";
  const where = `${trigger.distanceMi} mi ${trigger.bearing} of campus`;
  const head = `Confirmed ${kindWord} · ${where}`;

  let phase: string, cls: string, sub: string, lab: string, val: string;
  if (hoursSince < ACUTE_END) {
    phase = "Acute window"; cls = "acute";
    sub = "The first hours after the incident. Organized retaliation is unlikely, but spontaneous violence is possible.";
    lab = "Peak retaliation window opens in"; val = fmtHMS(ACUTE_END - hoursSince);
  } else if (hoursSince < ACTIVE_END) {
    phase = "Peak retaliation window"; cls = "active";
    sub = "The most dangerous window. When retaliatory violence occurs, it most often happens now.";
    lab = "Peak window closes in"; val = fmtHMS(ACTIVE_END - hoursSince);
  } else {
    phase = "Risk declining"; cls = "watch";
    sub = "Past the peak window. Risk is still elevated but easing back toward baseline.";
    lab = "Returns to baseline in"; val = `~${Math.max(1, Math.ceil((WATCH_END - hoursSince) / 24))} d`;
  }

  return (
    <div className={`cbanner ${cls}`} role="status" aria-live="polite">
      <div className="cb-left">
        <span className="cb-dot" aria-hidden="true" />
        <div>
          <div className="cb-phase">{phase}</div>
          <div className="cb-head">{head}</div>
          <div className="cb-sub">{sub}</div>
        </div>
      </div>
      <div className="cb-count">
        <div className="cb-lab">{lab}</div>
        <div className="cb-val">{val}</div>
      </div>
    </div>
  );
}
