import RecordView from "@/components/RecordView";
import { getNetworkData } from "@/lib/networkData";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DallasRecord() {
  const data = await getNetworkData("solis-academies");
  if (!data) redirect("/dallas/briefing");
  return <RecordView data={data} />;
}
