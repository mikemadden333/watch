import { redirect } from "next/navigation";
import { getNetworkData } from "@/lib/networkData";

export const dynamic = "force-dynamic";

export default async function DallasCampusesIndex() {
  const data = await getNetworkData("solis-academies");
  const first = data?.campuses[0]?.code.toLowerCase() ?? "cvp";
  redirect(`/dallas/campuses/${first}`);
}
