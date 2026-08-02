import Link from "next/link";
import LiveBriefing from "@/components/live/LiveBriefing";
import LiveFooter from "@/components/live/LiveFooter";
import BreakingNews from "@/components/BreakingNews";
import { getNetworkData } from "@/lib/networkData";
import { getBreakingNews } from "@/lib/breakingNews";

export const dynamic = "force-dynamic"; // always read fresh live data

export default async function ChicagoBriefing() {
  const [data, breaking] = await Promise.all([
    getNetworkData("veritas-charter"),
    getBreakingNews("veritas-charter"),
  ]);
  if (!data) return <NotConnected />;
  return (
    <>
      <LiveBriefing data={data} base="/chicago" />
      <div style={{ padding: "0 28px", maxWidth: 900, margin: "0 auto" }}>
        <BreakingNews data={breaking} live={data.live} />
      </div>
      <LiveFooter data={data} />
    </>
  );
}

function NotConnected() {
  return (
    <div style={{ padding: "60px 28px", maxWidth: 560 }}>
      <div className="serif" style={{ fontSize: 24 }}>Veritas Charter Schools</div>
      <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "#4A463D" }}>
        This network reads live from Supabase. Set the Supabase env vars and
        apply <span className="mono">supabase/migrations</span> +{" "}
        <span className="mono">seed.sql</span> to bring it online. The adapters
        (CPD VR, Cook County ME, CPD crimes, NWS, GDELT, local news) then
        populate it.
      </p>
      <Link href="/dallas/briefing" className="btn" style={{ marginTop: 12 }}>
        Open Dallas network →
      </Link>
    </div>
  );
}
