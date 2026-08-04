import { Suspense } from "react";
import Nav from "@/components/Nav";
import DrillControls from "@/components/live/DrillControls";
import { getNetworkData } from "@/lib/networkData";
import { buildNavCampuses } from "@/lib/navCampuses";
import { tenant, campuses as fixtureCampuses, morningStatuses } from "@/lib/data/chicago";

export default async function ChicagoLayout({ children }: { children: React.ReactNode }) {
  const data = await getNetworkData("veritas-charter");
  const navCampuses = data
    ? buildNavCampuses(data.campuses, data.statuses)
    : buildNavCampuses(fixtureCampuses, morningStatuses);

  return (
    <>
      <Suspense fallback={<div className="nav2" />}>
        <Nav network={tenant.name} base="/chicago" mark="/veritas-mark.svg" campuses={navCampuses} />
      </Suspense>
      {children}
      <DrillControls slug="veritas-charter" enabled={process.env.DEMO_MODE === "1"} />
    </>
  );
}
