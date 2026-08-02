import SourcesView from "@/components/SourcesView";
import LiveFooter from "@/components/live/LiveFooter";
import { getNetworkData } from "@/lib/networkData";
import { tenant } from "@/lib/data/chicago";

export const dynamic = "force-dynamic";

export default async function ChicagoSources() {
  const data = await getNetworkData("veritas-charter");
  return (
    <>
      <SourcesView city="chicago" network={tenant.name} />
      {data && <LiveFooter data={data} />}
    </>
  );
}
