import Link from "next/link";

/* Persistent, unmistakable label that the Chicago screens are a scripted
   reference scenario — not live data. Required by the demo plan; also
   simple honesty. Neutral/ink (never a status color), calm, always on. */
export default function SimulationBanner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "6px 28px",
        background: "#EFEBE1",
        borderBottom: "1px solid var(--line2)",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontFamily: "Menlo, monospace",
          fontSize: 9,
          letterSpacing: 1.4,
          fontWeight: 700,
          color: "#F5F3EE",
          background: "var(--ink)",
          padding: "3px 8px",
          borderRadius: 4,
        }}
      >
        ◆ SIMULATION
      </span>
      <span style={{ fontSize: 11.5, color: "#4A463D" }}>
        Seeded reference scenario — these Chicago screens show a{" "}
        <b>scripted flow, not live incidents</b>. The live adapters (CPD, ME,
        NWS, GDELT) run underneath and populate the database.
      </span>
      <Link
        href="/dallas/briefing"
        className="micro"
        style={{ marginLeft: "auto", color: "var(--ink)", textDecoration: "underline" }}
      >
        See the fully-live network (Dallas) →
      </Link>
    </div>
  );
}
