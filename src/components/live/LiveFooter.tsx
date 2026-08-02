import FreshnessFooter from "@/components/FreshnessFooter";
import { fmtCentral } from "@/lib/time";
import type { NetworkData } from "@/lib/networkData";

export default function LiveFooter({ data }: { data: NetworkData }) {
  const inWindow = data.feeds.filter((f) => f.state === "ok").length;
  const total = data.feeds.length;
  const lastCycle = fmtCentral(new Date().toISOString(), true);
  return (
    <FreshnessFooter
      feeds={data.feeds}
      lastCycle={lastCycle}
      right={`STATUS CALC ON ${inWindow} OF ${total} FEEDS · RULES v2.0`}
      base={data.city === "Dallas" ? "/dallas" : "/chicago"}
    />
  );
}
