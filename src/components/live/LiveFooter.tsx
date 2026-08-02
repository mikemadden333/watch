import FreshnessFooter from "@/components/FreshnessFooter";
import type { NetworkData } from "@/lib/networkData";

export default function LiveFooter({ data }: { data: NetworkData }) {
  const inWindow = data.feeds.filter((f) => f.state === "ok").length;
  const total = data.feeds.length;
  const now = new Date();
  const lastCycle = `${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())}`;
  return (
    <FreshnessFooter
      feeds={data.feeds}
      lastCycle={lastCycle}
      right={`STATUS CALC ON ${inWindow} OF ${total} FEEDS · RULES v2.0`}
    />
  );
}

function p(n: number): string {
  return String(n).padStart(2, "0");
}
