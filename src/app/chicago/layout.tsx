import Nav from "@/components/Nav";
import DrillControls from "@/components/live/DrillControls";
import { tenant } from "@/lib/data/chicago";

export default function ChicagoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav network={tenant.name} base="/chicago" mark="/veritas-mark.svg" />
      {children}
      <DrillControls slug="veritas-charter" />
    </>
  );
}
