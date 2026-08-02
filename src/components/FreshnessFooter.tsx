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
    <>
      <div className="foot">
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
      {/* persistent liability line — every screen */}
      <div
        className="foot"
        style={{ borderTop: "none", paddingTop: 0, opacity: 0.85, fontSize: 10, lineHeight: 1.5 }}
      >
        <span style={{ textTransform: "none", letterSpacing: 0 }}>
          {FOOTER_DISCLAIMER} <span style={{ opacity: 0.75 }}>· {BRAND_CREDIT}</span>
        </span>
        <Link
          href="/limitations"
          style={{ marginLeft: "auto", textDecoration: "underline", whiteSpace: "nowrap" }}
        >
          Limits &amp; how to use →
        </Link>
      </div>
    </>
  );
}
