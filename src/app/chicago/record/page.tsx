import RecordView from "@/components/RecordView";
import { getNetworkData } from "@/lib/networkData";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChicagoRecord() {
  const data = await getNetworkData("veritas-charter");
  if (!data) redirect("/chicago/briefing");
  return <RecordView data={data} />;
}
