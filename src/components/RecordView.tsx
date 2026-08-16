/* ============================================================
   Watch V2 Record (directive §6) — the rename of Audit. Keeps
   everything: the append-only log, the accuracy ledger, exports,
   the after-action report. Act's copy-events flow in as ACTION rows.
   Opens with one sentence in the Watch voice.
   ============================================================ */

import LiveFooter from "@/components/live/LiveFooter";
import RecordControls from "@/components/RecordControls";
import type { NetworkData } from "@/lib/networkData";

const GRID = "0.8fr 0.9fr 3fr 1.2fr";

export default function RecordView({ data }: { data: NetworkData }) {
  return (
    <>
      <div className="v2hero">
        <div className="micro">Record · the account of everything</div>
        <div className="sentence">Everything Watch has done, and how often it was right.</div>
        <p className="para" style={{ maxWidth: 720 }}>
          The append-only log below carries every status change, delivery, ingest, and copied draft — each with its
          source record, rule, and timestamps. <b>Nothing here is editable, ever.</b>
        </p>
      </div>

      <div className="wrap" style={{ paddingTop: 12 }}>
        <div className="main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <b style={{ fontSize: 15 }}>The log</b>
            <RecordControls audit={data.audit} />
          </div>
          <div className="card" style={{ marginTop: 12, fontSize: 11.5 }}>
            <div className="micro" style={{ display: "grid", gridTemplateColumns: GRID, padding: "9px 16px", borderBottom: "1px solid var(--line)" }}>
              <span>Time</span><span>Type</span><span>Event</span><span>Evidence</span>
            </div>
            {data.audit.length === 0 ? (
              <div style={{ padding: "16px", fontSize: 12, color: "var(--mut)" }}>
                No status changes, deliveries, or actions logged in the current window — the network is
                calm and the append-only log only records real events. Ingest cycles and status changes
                appear here as they happen.
              </div>
            ) : (
              data.audit.map((e, i) => (
                <div key={e.id} style={{ display: "grid", gridTemplateColumns: GRID, padding: "10px 16px", borderBottom: i < data.audit.length - 1 ? "1px solid var(--line)" : undefined, alignItems: "center", gap: 8 }}>
                  <span className="mono num">{e.time}</span>
                  <span>
                    {e.type === "STATUS" ? (
                      <span className={`pill ${e.statusColor === "ALERT" ? "p-alert" : e.statusColor === "ELEVATED" ? "p-elevated" : e.statusColor === "MONITOR" ? "p-monitor" : "p-clear"}`} style={{ width: "fit-content" }}>
                        <span className="d" />STATUS
                      </span>
                    ) : (
                      <span className="chip" style={{ width: "fit-content" }}>{e.type}</span>
                    )}
                  </span>
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
          <div className="card" data-tour="record-ledger" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>Accuracy ledger</b><span className="chip">public to customer</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 10.5, color: "var(--mut)" }}>
              Every fast-layer signal is scored against the authoritative record when it lands. The
              ledger is allowed to say no.
            </div>
            {data.ledger.length === 0 ? (
              <div style={{ marginTop: 12, fontSize: 11, color: "var(--mut)", lineHeight: 1.55 }}>
                Accumulating its first window. The retro-confirmation matcher scores each corroborated /
                reported signal against the CPD/ME record once it publishes, then the corroborated→confirmed
                rate appears here. Real numbers only — no placeholder.
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
            <div className="micro">After-action report</div>
            <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.55 }}>
              One-page timeline of any escalation: what fired, when, who was told, what was done, when it
              cleared. Generated from the log — never written by hand.
            </div>
          </div>
        </div>
      </div>
      <LiveFooter data={data} />
    </>
  );
}
