import Nav from "@/components/Nav";
import DrillControls from "@/components/live/DrillControls";
import { tenant } from "@/lib/data/dallas";

export default function DallasLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav network={tenant.name} base="/dallas" mark="/solis-mark.svg" />
      {children}
      <DrillControls slug="solis-academies" />
    </>
  );
}
