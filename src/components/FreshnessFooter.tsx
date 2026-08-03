import Link from "next/link";
import type { FeedHealth } from "@/lib/types";
import { plainFootLabel } from "@/lib/sources";
import { FOOTER_DISCLAIMER, BRAND_CREDIT } from "@/lib/legal";

export default function FreshnessFooter({
  feeds,
  lastCycle,
  right,
  base,
}: {
  feeds: FeedHealth[];
  lastCycle: string; // "07:12:04"
  right: string; // "STATUS CALC ON 6 OF 7 FEEDS · RULES v2.0"
  base?: string; // e.g. "/chicago" — enables the Sources link
}) {
  return (
    // one fixed footer, two stacked rows (freshness chips, then the liability
    // line) — never two overlapping fixed bars
    <div className="foot" style={{ flexDirection: "column", alignItems: "stretch", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span>LAST CYCLE {lastCycle}</span>
        {feeds.map((f) => (
          <span key={f.key} className="fchip">
            {plainFootLabel(f.key)}{" "}
            <span className={f.state === "ok" ? "ok" : f.state === "warn" ? "warn" : "late"}>
              {f.footValue}
            </span>
          </span>
        ))}
        {base && (
          <Link href={`${base}/sources`} style={{ marginLeft: "auto", textDecoration: "underline" }}>
            Sources
          </Link>
        )}
        <span style={{ marginLeft: base ? 12 : "auto" }}>{right}</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          opacity: 0.8,
          textTransform: "none",
          letterSpacing: 0,
          lineHeight: 1.4,
        }}
      >
        <span>
          {FOOTER_DISCLAIMER} <span style={{ opacity: 0.8 }}>· {BRAND_CREDIT}</span>
        </span>
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: 12, whiteSpace: "nowrap" }}>
          <Link href="/privacy" style={{ textDecoration: "underline" }}>Privacy</Link>
          <Link href="/terms" style={{ textDecoration: "underline" }}>Terms</Link>
          <Link href="/messaging" style={{ textDecoration: "underline" }}>Text alerts</Link>
          <Link href="/limitations" style={{ textDecoration: "underline" }}>Limits &amp; how to use →</Link>
        </span>
      </div>
    </div>
  );
}
