import SourcesView from "@/components/SourcesView";
import LiveFooter from "@/components/live/LiveFooter";
import { getNetworkData } from "@/lib/networkData";
import { tenant } from "@/lib/data/dallas";

export const dynamic = "force-dynamic";

export default async function DallasSources() {
  const data = await getNetworkData("solis-academies");
  return (
    <>
      <SourcesView city="dallas" network={tenant.name} />
      {data && <LiveFooter data={data} />}
    </>
  );
}
