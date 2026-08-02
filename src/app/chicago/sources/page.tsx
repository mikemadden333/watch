import SourcesView from "@/components/SourcesView";
import FreshnessFooter from "@/components/FreshnessFooter";
import { morningFeeds, tenant } from "@/lib/data/chicago";

export default function ChicagoSources() {
  return (
    <>
      <SourcesView city="chicago" network={tenant.name} />
      <FreshnessFooter feeds={morningFeeds} lastCycle="07:12:04" right="STATUS CALC ON 6 OF 7 FEEDS · RULES v2.0" base="/chicago" />
    </>
  );
}
