import Link from "next/link";
import LiveBriefing from "@/components/live/LiveBriefing";
import LiveFooter from "@/components/live/LiveFooter";
import { getNetworkData } from "@/lib/networkData";

export const dynamic = "force-dynamic"; // always read fresh live data

export default async function DallasBriefing() {
  const data = await getNetworkData("solis-academies");
  if (!data) return <NotConnected />;
  return (
    <>
      <LiveBriefing data={data} base="/dallas" />
      <LiveFooter data={data} />
    </>
  );
}

function NotConnected() {
  return (
    <div style={{ padding: "60px 28px", maxWidth: 560 }}>
      <div className="serif" style={{ fontSize: 24 }}>Solis Academies</div>
      <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "#4A463D" }}>
        The Dallas pack reads live from Supabase. Set the Supabase env vars and
        apply <span className="mono">supabase/migrations</span> +{" "}
        <span className="mono">seed-dallas.sql</span> to bring this network
        online. The adapters (Dallas PD Active Calls, NWS) will then populate it.
      </p>
      <Link href="/chicago/briefing" className="btn" style={{ marginTop: 12 }}>
        Open Chicago pilot →
      </Link>
    </div>
  );
}
