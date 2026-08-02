import { redirect } from "next/navigation";
import { getNetworkData } from "@/lib/networkData";

export const dynamic = "force-dynamic";

export default async function ChicagoCampusesIndex() {
  const data = await getNetworkData("veritas-charter");
  const first = data?.campuses[0]?.code.toLowerCase() ?? "eng";
  redirect(`/chicago/campuses/${first}`);
}
