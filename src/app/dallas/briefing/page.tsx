import Link from "next/link";
import BriefingV2 from "@/components/BriefingV2";
import LiveLayer from "@/components/live/LiveLayer";
import BreakingNews from "@/components/BreakingNews";
import { getNetworkData } from "@/lib/networkData";
import { getBreakingNews } from "@/lib/breakingNews";

export const dynamic = "force-dynamic"; // always read fresh live data

export default async function DallasBriefing({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; campus?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "leader" ? "leader" : "ceo";
  const [data, breaking] = await Promise.all([
    getNetworkData("solis-academies"),
    getBreakingNews("solis-academies"),
  ]);
  if (!data) return <NotConnected />;
  return (
    <>
      <LiveLayer
        slug="solis-academies"
        initialStatuses={data.statuses.map((s) => ({ c: s.campusCode, s: s.status }))}
        campusNames={Object.fromEntries(data.campuses.map((c) => [c.code, c.name]))}
      />
      <BriefingV2 data={data} base="/dallas" view={view} campus={sp.campus} />
      {view === "leader" ? (
        <div style={{ padding: "0 40px", maxWidth: 880, margin: "40px auto 0" }}>
          <BreakingNews data={breaking} live={data.live} />
        </div>
      ) : null}
    </>
  );
}

function NotConnected() {
  return (
    <div style={{ padding: "60px 40px", maxWidth: 560 }}>
      <div className="serif" style={{ fontSize: 24 }}>Solis Academies</div>
      <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "#4A463D" }}>
        The Dallas pack reads live from Supabase. Set the Supabase env vars and
        apply <span className="mono">supabase/migrations</span> +{" "}
        <span className="mono">seed-dallas.sql</span> to bring this network online.
      </p>
      <Link href="/chicago/briefing" className="btn" style={{ marginTop: 12 }}>
        Open Chicago pilot →
      </Link>
    </div>
  );
}
