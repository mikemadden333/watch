import PulseView from "@/components/PulseView";
import { getNetworkData } from "@/lib/networkData";

export const dynamic = "force-dynamic";

export default async function DallasPulse({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; campus?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "leader" ? "leader" : "ceo";
  const data = await getNetworkData("solis-academies");
  if (!data) {
    return (
      <div className="v2hero">
        <div className="sentence">This network isn&apos;t connected yet.</div>
      </div>
    );
  }
  return <PulseView data={data} base="/dallas" view={view} campus={sp.campus} />;
}
