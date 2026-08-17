"use client";

/* Interactive 30-day heat ribbon. Each cell is a day; click a day with
   incidents to see what happened. Lives inside the campus row <Link>, so cell
   clicks preventDefault + stopPropagation to avoid navigating. */

import { useState } from "react";

export interface RibbonDay {
  n: number;
  label: string; // "Tue, Aug 12"
  items: { t: string; s: string }[];
}

/* height + color encode a day's count relative to the busiest day, so the
   ribbon reads as a pattern (spikes vs calm) instead of a wall of amber even
   when nearly every day has something. */
function cellViz(n: number, max: number): { h: string; bg: string; hot: boolean } {
  if (n <= 0) return { h: "16%", bg: "var(--sr-cell)", hot: false };
  const r = n / max; // 0..1
  const h = `${Math.round((0.34 + 0.66 * Math.sqrt(r)) * 100)}%`;
  const bg = r >= 0.7 ? "var(--sr-amber2)" : r >= 0.34 ? "var(--sr-amber)" : "rgba(232,161,58,.45)";
  return { h, bg, hot: r >= 0.7 };
}

export default function HeatRibbon({ days }: { days: RibbonDay[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const sel = open != null ? days[open] : null;
  const max = Math.max(1, ...days.map((d) => d.n));
  // keep the popover on-screen: anchor left for early cells, right for late ones
  const anchor = open == null ? "50%" : `${((open + 0.5) / days.length) * 100}%`;
  const shift = open == null ? "-50%" : open <= 4 ? "-12%" : open >= days.length - 5 ? "-88%" : "-50%";

  return (
    <span className="sr-ribbonw" onClick={(e) => e.preventDefault()}>
      <span className="sr-ribbon">
        {days.map((d, i) => {
          const v = cellViz(d.n, max);
          return (
          <i
            key={i}
            className={`sr-cell${i === days.length - 1 ? " today" : ""}${v.hot ? " glow" : ""}${open === i ? " sel" : ""}${d.n > 0 ? " live" : ""}`}
            style={{ background: v.bg, height: v.h, animationDelay: `${(i * 0.012).toFixed(3)}s` }}
            role={d.n > 0 ? "button" : undefined}
            aria-label={d.n > 0 ? `${d.label}: ${d.n} confirmed` : undefined}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(d.n > 0 ? (open === i ? null : i) : null);
            }}
          />
          );
        })}
      </span>
      <span className="sr-ribbonx"><span>30 days ago</span><span>today</span></span>

      {sel && sel.n > 0 && (
        <span
          className="ribbonpop"
          style={{ left: anchor, transform: `translateX(${shift})` }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <button
            type="button"
            className="rp-x"
            aria-label="Close"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(null); }}
          >×</button>
          <span className="rp-hd">{sel.label} · {sel.n} confirmed</span>
          {sel.items.slice(0, 4).map((it, k) => (
            <span className="rp-it" key={k}><b>{it.t}</b><em>{it.s}</em></span>
          ))}
          {sel.items.length > 4 ? <span className="rp-more">+{sel.items.length - 4} more</span> : null}
        </span>
      )}
    </span>
  );
}
