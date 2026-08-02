import MapView from "@/components/MapView";
import FreshnessFooter from "@/components/FreshnessFooter";
import { morningFeeds } from "@/lib/data/chicago";

export default function MapPage() {
  return (
    <>
      <MapView />
      <FreshnessFooter
        feeds={morningFeeds}
        lastCycle="07:12:04"
        right="STATUS CALC ON 6 OF 7 FEEDS · RULES v2.0"
        base="/chicago"
      />
    </>
  );
}
