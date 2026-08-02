"use client";

import { useState } from "react";
import type { Tier } from "@/lib/types";

/* Self-explaining tier badge — tappable, reveals a plain-language
   definition. Watch never labels anything CONFIRMED on news/crowd
   reports alone. */

const DEF: Record<Tier, { badge: string; text: string }> = {
  CONFIRMED: {
    badge: "badge-conf",
    text: "An official source — Chicago Police or the Cook County Medical Examiner — has published a record of this incident. Watch never labels anything Confirmed based on news or crowd reports alone.",
  },
  CORROBORATED: {
    badge: "badge-corr",
    text: "Two or more independent outlets report the same incident, but no official record has published yet. Stronger than a single report; not yet authoritative.",
  },
  REPORTED: {
    badge: "badge-rep",
    text: "A single source reports this incident. Single-source reports never page anyone and never appear on the map — they wait for corroboration or an official record.",
  },
};

export default function TierBadge({ tier }: { tier: Tier }) {
  const [open, setOpen] = useState(false);
  const d = DEF[tier];
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        className={`pill ${d.badge}`}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        style={{ cursor: "pointer", border: "none", font: "inherit" }}
        aria-expanded={open}
        title="What does this mean?"
      >
        {tier} <span style={{ opacity: 0.6, marginLeft: 2 }}>ⓘ</span>
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 260,
            zIndex: 600,
            background: "var(--panel)",
            border: "1px solid var(--line2)",
            borderRadius: 8,
            padding: "10px 12px",
            boxShadow: "0 6px 20px rgba(27,26,23,.12)",
            fontSize: 11.5,
            lineHeight: 1.5,
            color: "var(--ink)",
            textAlign: "left",
            fontWeight: 400,
            letterSpacing: 0,
            fontFamily: "var(--sans)",
            textTransform: "none",
          }}
        >
          <b>{tier}.</b> {d.text}
        </span>
      )}
    </span>
  );
}
