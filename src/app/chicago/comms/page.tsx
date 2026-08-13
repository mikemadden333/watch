import CommsView from "@/components/CommsView";
import { getNetworkData } from "@/lib/networkData";

export const dynamic = "force-dynamic";

export default async function ChicagoCommsViewPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; campus?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "leader" ? "leader" : "ceo";
  const data = await getNetworkData("veritas-charter");
  if (!data) {
    return (
      <div className="v2hero">
        <div className="sentence">This network isn&apos;t connected yet.</div>
      </div>
    );
  }
  return <CommsView data={data} slug="veritas-charter" view={view} campus={sp.campus} />;
}
