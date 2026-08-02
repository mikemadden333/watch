import Nav from "@/components/Nav";
import SimulationBanner from "@/components/SimulationBanner";
import { tenant } from "@/lib/data/chicago";

export default function ChicagoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav network={tenant.name} base="/chicago" mark="/veritas-mark.svg" />
      <SimulationBanner />
      {children}
    </>
  );
}
