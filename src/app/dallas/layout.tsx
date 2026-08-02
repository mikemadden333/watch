import { Suspense } from "react";
import Nav from "@/components/Nav";
import DrillControls from "@/components/live/DrillControls";
import { getNetworkData } from "@/lib/networkData";
import { buildNavCampuses } from "@/lib/navCampuses";
import { tenant, campuses as fixtureCampuses } from "@/lib/data/dallas";

export default async function DallasLayout({ children }: { children: React.ReactNode }) {
  const data = await getNetworkData("solis-academies");
  const navCampuses = data
    ? buildNavCampuses(data.campuses, data.statuses)
    : buildNavCampuses(fixtureCampuses, []);

  return (
    <>
      <Suspense fallback={<div className="nav2" />}>
        <Nav network={tenant.name} base="/dallas" mark="/solis-mark.svg" campuses={navCampuses} />
      </Suspense>
      {children}
      <DrillControls slug="solis-academies" />
    </>
  );
}
