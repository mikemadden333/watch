import Link from "next/link";
import BriefingV2 from "@/components/BriefingV2";
import LiveLayer from "@/components/live/LiveLayer";
import BreakingNews from "@/components/BreakingNews";
import { getNetworkData } from "@/lib/networkData";
import { getBreakingNews } from "@/lib/breakingNews";

export const dynamic = "force-dynamic"; // always read fresh live data

export default async function ChicagoBriefing({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; campus?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "leader" ? "leader" : "ceo";
  const [data, breaking] = await Promise.all([
    getNetworkData("veritas-charter"),
    getBreakingNews("veritas-charter"),
  ]);
  if (!data) return <NotConnected />;
  // Resolve the leader view's campus exactly as BriefingV2 does, so the
  // breaking-news panel is scoped to the same school the briefing is showing.
  const focusCampus = resolveLeaderCampus(data, sp.campus);
  return (
    <>
      <LiveLayer
        slug="veritas-charter"
        initialStatuses={data.statuses.map((s) => ({ c: s.campusCode, s: s.status }))}
        campusNames={Object.fromEntries(data.campuses.map((c) => [c.code, c.name]))}
      />
      <BriefingV2 data={data} base="/chicago" view={view} campus={sp.campus} />
      {view === "leader" ? (
        <div style={{ padding: "0 40px", maxWidth: 880, margin: "40px auto 0" }}>
          <BreakingNews
            data={breaking}
            live={data.live}
            focus={
              focusCampus
                ? { code: focusCampus.code, name: focusCampus.name, lat: focusCampus.lat, lon: focusCampus.lon }
                : undefined
            }
          />
        </div>
      ) : null}
    </>
  );
}

/** Mirror BriefingV2's leader-view campus pick: the URL campus, else the
 *  worst-status campus. Returns the full campus record (with coords). */
function resolveLeaderCampus(
  data: NonNullable<Awaited<ReturnType<typeof getNetworkData>>>,
  campusParam?: string
) {
  const rank: Record<string, number> = { ALERT: 0, ELEVATED: 1, MONITOR: 2, CLEAR: 3 };
  const worst = [...data.campuses].sort((a, x) => {
    const sa = data.statuses.find((s) => s.campusCode === a.code)?.status ?? "CLEAR";
    const sx = data.statuses.find((s) => s.campusCode === x.code)?.status ?? "CLEAR";
    return rank[sa] - rank[sx];
  })[0];
  const code = campusParam ?? worst?.code ?? "";
  return data.campuses.find((c) => c.code === code) ?? data.campuses[0] ?? null;
}

function NotConnected() {
  return (
    <div style={{ padding: "60px 40px", maxWidth: 560 }}>
      <div className="serif" style={{ fontSize: 24 }}>Veritas Charter Schools</div>
      <p style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "#4A463D" }}>
        This network reads live from Supabase. Set the Supabase env vars and
        apply <span className="mono">supabase/migrations</span> +{" "}
        <span className="mono">seed.sql</span> to bring it online.
      </p>
      <Link href="/dallas/briefing" className="btn" style={{ marginTop: 12 }}>
        Open Dallas network →
      </Link>
    </div>
  );
}
