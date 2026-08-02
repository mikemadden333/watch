import LiveFooter from "@/components/live/LiveFooter";
import { getNetworkData } from "@/lib/networkData";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const GRID = "0.8fr 0.9fr 3fr 1.2fr";

export default async function DallasAudit() {
  const data = await getNetworkData("solis-academies");
  if (!data) redirect("/dallas/briefing");

  return (
    <>
      <div className="wrap" style={{ paddingTop: 20 }}>
        <div className="main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <b style={{ fontSize: 15 }}>Audit log · live</b>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="chip">All events ▾</span>
              <span className="chip">Last 24 h ▾</span>
              <button className="btn ghost" style={{ fontSize: 11 }}>Export CSV</button>
              <button className="btn" style={{ fontSize: 11 }}>Signed PDF</button>
            </div>
          </div>
          <div className="card" style={{ marginTop: 12, fontSize: 11.5 }}>
            <div className="micro" style={{ display: "grid", gridTemplateColumns: GRID, padding: "9px 16px", borderBottom: "1px solid var(--line)" }}>
              <span>Time</span><span>Type</span><span>Event</span><span>Evidence</span>
            </div>
            {data.audit.length === 0 ? (
              <div style={{ padding: "16px", fontSize: 12, color: "var(--mut)" }}>
                No status changes, deliveries, or actions logged yet — the network is CLEAR and the
                append-only log only records real events. Ingest cycles and status changes will
                appear here as they happen.
              </div>
            ) : (
              data.audit.map((e, i) => (
                <div key={e.id} style={{ display: "grid", gridTemplateColumns: GRID, padding: "10px 16px", borderBottom: i < data.audit.length - 1 ? "1px solid var(--line)" : undefined, alignItems: "center", gap: 8 }}>
                  <span className="mono num">{e.time}</span>
                  <span><span className="chip" style={{ width: "fit-content" }}>{e.type}</span></span>
                  <span>{e.event}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--mut)" }}>{e.evidence}</span>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 10, fontSize: 10.5, color: "var(--mut)", fontFamily: "Menlo,monospace", textTransform: "uppercase", letterSpacing: 0.6 }}>
            Every status change carries · source record id · rule id · rules version · timestamps · nothing is editable, ever
          </div>
        </div>

        <div className="rail" style={{ width: 330 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>Accuracy ledger</b><span className="chip">public to customer</span>
            </div>
            {data.ledger.length === 0 ? (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--mut)", lineHeight: 1.55 }}>
                The ledger scores every fast-layer signal against the authoritative record once it
                lands. Dallas is accumulating its first window — dispatch calls will be matched to the
                daily confirmed record to compute corroborated→confirmed rates.
              </div>
            ) : (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                {data.ledger.map((m) => (
                  <div key={m.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                      <span>{m.label}</span><b className="num">{m.value}</b>
                    </div>
                    <div style={{ height: 7, background: "var(--line)", borderRadius: 4, marginTop: 5 }}>
                      <div style={{ width: `${m.pct}%`, height: "100%", background: m.barColor === "clear" ? "var(--clear)" : "var(--ink)", borderRadius: 4 }} />
                    </div>
                    <div className="micro" style={{ marginTop: 3 }}>{m.note}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card" style={{ padding: 16, marginTop: 14 }}>
            <div className="micro">Dispatch archive</div>
            <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--mut)", lineHeight: 1.55 }}>
              Every Dallas PD poll is archived verbatim — the feed keeps no history of its own. The
              archive is the raw material for the retro-confirmation matcher.
            </div>
          </div>
        </div>
      </div>
      <LiveFooter data={data} />
    </>
  );
}
