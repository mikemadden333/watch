import MapView from "@/components/MapView";
import LiveFooter from "@/components/live/LiveFooter";
import { getNetworkData } from "@/lib/networkData";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DallasMap() {
  const data = await getNetworkData("solis-academies");
  if (!data) redirect("/dallas/briefing");
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
