import FreshnessFooter from "@/components/FreshnessFooter";
import { fmtCentral } from "@/lib/time";
import type { NetworkData } from "@/lib/networkData";

export default function LiveFooter({ data }: { data: NetworkData }) {
  const inWindow = data.feeds.filter((f) => f.state === "ok").length;
  const total = data.feeds.length;
  // Real last cycle = the newest ingest we actually hold, not the render clock.
  // A dead pipeline must show its true age, never "just now".
  const latestMs = data.incidents.reduce((m, i) => {
    const t = new Date(i.detectedAt || i.publishedAt || i.occurredAt).getTime();
    return Number.isFinite(t) && t > m ? t : m;
  }, 0);
  const lastCycle = latestMs ? fmtCentral(new Date(latestMs).toISOString(), true) : "—";
  return (
    <FreshnessFooter
      feeds={data.feeds}
      lastCycle={lastCycle}
      right={`STATUS CALC ON ${inWindow} OF ${total} FEEDS · RULES v2.0`}
      base={data.city === "Dallas" ? "/dallas" : "/chicago"}
    />
  );
}
