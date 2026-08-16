import { SOURCE_CATALOG, CONFIRMATION_NOTE, type SourceCard } from "@/lib/sourceCatalog";

const roleColor: Record<SourceCard["role"], string> = {
  Confirms: "var(--clear)",
  Corroborates: "var(--monitor)",
  "Live weather": "var(--clear)",
  Dispatch: "var(--elevated)",
};

export default function SourcesView({ city, network }: { city: string; network: string }) {
  const cards = SOURCE_CATALOG[city] ?? [];
  return (
    <>
    <div className="head">
      <div className="sentence">Where every line comes from.</div>
      <span className="micro">{network} · {cards.length} sources · the dataset IDs live in the Record</span>
    </div>
    <div className="wrap" style={{ paddingTop: 4 }}>
      <div className="main">
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 10 }}>
          {cards.map((c) => (
            <div key={c.name} className="card" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <b style={{ fontSize: 13.5 }}>{c.name}</b>
                <span
                  className="pill"
                  style={{ color: roleColor[c.role], background: "transparent", border: `1px solid ${roleColor[c.role]}` }}
                >
                  {c.role.toUpperCase()}
                </span>
              </div>
              <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 14px", fontSize: 12, lineHeight: 1.5 }}>
                <span className="micro" style={{ paddingTop: 2 }}>What</span>
                <span>{c.what}</span>
                <span className="micro" style={{ paddingTop: 2 }}>Provides</span>
                <span>{c.provides}</span>
                <span className="micro" style={{ paddingTop: 2 }}>Latency</span>
                <span className="mono" style={{ color: "var(--mut)" }}>{c.latency}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink2)", lineHeight: 1.6, fontFamily: "var(--serif)", fontStyle: "italic", maxWidth: 720 }}>
          {CONFIRMATION_NOTE[city]}
        </div>
      </div>

      <div className="rail">
        <div className="card" style={{ padding: 16 }}>
          <div className="micro">How Watch labels things</div>
          <div style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.6 }}>
            <b style={{ color: "var(--clear)" }}>Confirmed</b> — an official record has published.
            <br />
            <b style={{ color: "var(--monitor)" }}>Corroborated</b> — 2+ independent outlets agree.
            <br />
            <b style={{ color: "var(--elevated)" }}>Reported</b> — a single source; never pages, never on the map.
          </div>
          <hr className="hr" />
          <div style={{ fontSize: 10.5, color: "var(--mut)", lineHeight: 1.5 }}>
            Every source carries an expected freshness window. A feed outside its window is flagged and
            excluded from status calculation.
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
