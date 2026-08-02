import Link from "next/link";
import FreshnessFooter from "@/components/FreshnessFooter";
import {
  afternoonFeeds,
  alertItems,
  deliveryAudit,
  networkImpact,
  tornadoBanner,
} from "@/lib/data/chicago";
import type { AlertClass, Status } from "@/lib/types";

const borderColor: Record<Status, string> = {
  ALERT: "var(--alert)",
  ELEVATED: "var(--elevated)",
  MONITOR: "var(--monitor)",
  CLEAR: "var(--clear)",
};
const pillFor: Record<Status, string> = {
  ALERT: "p-alert",
  ELEVATED: "p-elevated",
  MONITOR: "p-monitor",
  CLEAR: "p-clear",
};

export default function AlertsPage() {
  return (
    <>
      {/* live alert banner */}
      <div
        style={{
          margin: "20px 28px 0",
          background: "var(--alert)",
          color: "#fff",
          borderRadius: 8,
          padding: "16px 22px",
          display: "flex",
          alignItems: "center",
          gap: 18,
          flexWrap: "wrap",
        }}
      >
        <span className="pill" style={{ background: "#fff", color: "var(--alert)" }}>
          LIVE · ALERT
        </span>
        <div style={{ fontSize: 13.5, lineHeight: 1.5, maxWidth: 860, flex: 1 }}>
          <b>{tornadoBanner.title}</b>, {tornadoBanner.body}
        </div>
        <span className="mono num" style={{ marginLeft: "auto", fontSize: 11, opacity: 0.9 }}>
          ESCALATED {tornadoBanner.escalatedAt} · {tornadoBanner.elapsed}
        </span>
      </div>

      <div className="wrap" style={{ paddingTop: 16 }}>
        <div className="main">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <b style={{ fontSize: 14 }}>Alert stream · two classes, honestly labeled</b>
            <span className="micro">Live layer · data-day layer</span>
          </div>

          {alertItems.map((a) => (
            <div key={a.id} className="card" style={{ marginTop: 10, borderLeft: `4px solid ${borderColor[a.status]}` }}>
              <div style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span className={`pill ${pillFor[a.status]}`}>
                    <span className="d" />
                    {a.status} · {classLabel(a.alertClass)}
                  </span>
                  <b>{a.title}</b>
                  <span className="mono num" style={{ marginLeft: "auto", color: "var(--mut)", fontSize: 10.5 }}>
                    {a.time}
                  </span>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--mut)" }}>{a.ruleText}</div>
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className="chip c-conf">
                    <span className="d" />
                    {a.sourceChip}
                  </span>
                  {a.deliveryChips.map((c, i) => (
                    <span key={i} className="chip">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="card" style={{ flex: 1, minWidth: 260, padding: "14px 16px" }}>
              <div className="micro">Delivery policy</div>
              <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.6 }}>
                ALERT → push + SMS + email, quiet hours overridden.
                <br />
                ELEVATED → push + email, quiet hours respected.
                <br />
                MONITOR → in-app only.
                <br />
                Every delivery logged with timestamp → Audit.
              </div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 260, padding: "14px 16px" }}>
              <div className="micro">Honesty rules · enforced in UI</div>
              <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.6 }}>
                Every alert names its class: LIVE or DATA-DAY.
                <br />
                Every incident shows occurred time AND published time.
                <br />
                No alert ever implies a live CPD feed exists.
                <br />
                Single-source reports never page anyone.
              </div>
            </div>
          </div>

          <Link href="/contract" className="btn ghost" style={{ marginTop: 14, fontSize: 11 }}>
            Read the Notification Contract →
          </Link>
        </div>

        {/* rail */}
        <div className="rail">
          <div className="card" style={{ padding: 16 }}>
            <div className="micro">Network impact · now</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {networkImpact.map((n) => (
                <div key={n.label} style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 10 }}>
                  <div className="micro" style={{ color: `var(--${n.color})` }}>{n.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }} className="num">{n.count}</div>
                  <div style={{ fontSize: 10, color: "var(--mut)" }}>{n.campuses}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 16, marginTop: 14 }}>
            <div className="micro">Delivery audit · last alert</div>
            <div style={{ marginTop: 10, fontFamily: "Menlo,monospace", fontSize: 10, display: "flex", flexDirection: "column", gap: 7 }}>
              {deliveryAudit.map((d) => (
                <div key={d.label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{d.label}</span>
                  <span className={d.ok ? "ok" : undefined}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 16, marginTop: 14 }}>
            <div className="micro">Mute · drills &amp; maintenance</div>
            <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--mut)", lineHeight: 1.5 }}>
              Admin can mute network alerts for X minutes. Mute events are logged
              to Audit with actor + duration.
            </div>
            <button className="btn ghost" style={{ marginTop: 10, fontSize: 11 }}>
              Mute network · 30 min
            </button>
          </div>
        </div>
      </div>

      <FreshnessFooter
        feeds={afternoonFeeds}
        lastCycle="14:54:41"
        right="STATUS CALC ON 7 OF 7 FEEDS · RULES v2.0"
        base="/chicago"
      />
    </>
  );
}

function classLabel(c: AlertClass): string {
  return c === "LIVE" ? "LIVE" : "DATA-DAY";
}
