"use client";

import { useState } from "react";
import type { Tier, VerificationStep } from "@/lib/types";
import { plainSource } from "@/lib/sources";
import TierBadge from "./TierBadge";
import VerificationJourney from "./VerificationJourney";

export interface FeedItem {
  time: string;
  title: string;
  detail: string;
  primarySourceRaw: string; // "CPD VR gumc-mgzr"
  tier: Tier;
  journey?: VerificationStep[];
}

const badgeTierKind: Record<Tier, VerificationStep["kind"]> = {
  CONFIRMED: "confirmed",
  CORROBORATED: "corroborated",
  REPORTED: "reported",
};

function minimalJourney(item: FeedItem): VerificationStep[] {
  return [
    { kind: "occurred", label: "Occurred / reported", detail: item.title.replace(/^[^·]+·\s*/, ""), time: item.time },
    {
      kind: badgeTierKind[item.tier],
      label: item.tier === "CONFIRMED" ? "Authoritative confirmation" : item.tier === "CORROBORATED" ? "Corroboration" : "First report",
      detail: plainSource(item.primarySourceRaw),
      time: item.time,
      tier: item.tier,
    },
  ];
}

export default function IntelligenceFeed({ items }: { items: FeedItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <div className="card" style={{ marginTop: 10 }}>
        {items.map((it, i) => {
          const expanded = open === i;
          return (
            <div key={i} style={{ borderBottom: i < items.length - 1 ? "1px solid var(--line)" : undefined }}>
              <div
                onClick={() => setOpen(expanded ? null : i)}
                style={{ padding: "12px 16px", display: "flex", gap: 14, alignItems: "center", cursor: "pointer" }}
              >
                <span className="mono num" style={{ color: "var(--mut)", fontSize: 11, width: 96, flexShrink: 0 }}>
                  {it.time}
                </span>
                <div style={{ flex: 1 }}>
                  <b>{it.title}</b>{" "}
                  <span style={{ color: "var(--mut)" }}>— {it.detail}</span>
                  <div className="micro" style={{ marginTop: 3 }}>
                    {plainSource(it.primarySourceRaw)} · {expanded ? "hide" : "show"} verification journey
                  </div>
                </div>
                <TierBadge tier={it.tier} />
              </div>
              {expanded && (
                <div style={{ padding: "0 16px 16px 108px" }}>
                  <VerificationJourney steps={it.journey?.length ? it.journey : minimalJourney(it)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* one-line tier legend */}
      <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--mut)", lineHeight: 1.5 }}>
        <b style={{ color: "var(--clear)" }}>Confirmed</b> = official record ·{" "}
        <b style={{ color: "var(--monitor)" }}>Corroborated</b> = 2+ independent outlets ·{" "}
        <b style={{ color: "var(--elevated)" }}>Reported</b> = single source (never pages, never on the map).
        Tap a tier for details.
      </div>
    </>
  );
}
