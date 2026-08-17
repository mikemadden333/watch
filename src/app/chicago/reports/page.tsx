import ReportBuilder from "@/components/reports/ReportBuilder";
import { getNetworkData } from "@/lib/networkData";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChicagoReports() {
  const data = await getNetworkData("veritas-charter");
  if (!data) redirect("/chicago/briefing");
  return <ReportBuilder data={data} nowIso={new Date().toISOString()} />;
}
