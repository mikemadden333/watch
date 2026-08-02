import type { FeedHealth } from "@/lib/types";

export default function FreshnessFooter({
  feeds,
  lastCycle,
  right,
}: {
  feeds: FeedHealth[];
  lastCycle: string; // "07:12:04"
  right: string; // "STATUS CALC ON 6 OF 7 FEEDS · RULES v2.0"
}) {
  return (
    <div className="foot">
      <span>LAST CYCLE {lastCycle}</span>
      {feeds.map((f) => (
        <span key={f.key} className="fchip">
          {f.footLabel}{" "}
          <span className={f.state === "ok" ? "ok" : f.state === "warn" ? "warn" : "late"}>
            {f.footValue}
          </span>
        </span>
      ))}
      <span style={{ marginLeft: "auto" }}>{right}</span>
    </div>
  );
}
