import ReportBuilder from "@/components/reports/ReportBuilder";
import { getNetworkData } from "@/lib/networkData";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DallasReports() {
  const data = await getNetworkData("solis-academies");
  if (!data) redirect("/dallas/briefing");
  return <ReportBuilder data={data} nowIso={new Date().toISOString()} />;
}
