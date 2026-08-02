import MapView from "@/components/MapView";
import LiveFooter from "@/components/live/LiveFooter";
import { getNetworkData } from "@/lib/networkData";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChicagoMap() {
  const data = await getNetworkData("veritas-charter");
  if (!data) redirect("/chicago/briefing");
  return (
    <>
      <MapView
        campuses={data.campuses}
        incidents={data.incidents}
        statuses={data.statuses}
        nowIso={new Date().toISOString()}
      />
      <LiveFooter data={data} />
    </>
  );
}
