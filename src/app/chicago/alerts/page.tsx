import Link from "next/link";
import LiveFooter from "@/components/live/LiveFooter";
import { getNetworkData } from "@/lib/networkData";
import { redirect } from "next/navigation";
import type { Status } from "@/lib/types";

export const dynamic = "force-dynamic";

const pillFor: Record<Status, string> = { ALERT: "p-alert", ELEVATED: "p-elevated", MONITOR: "p-monitor", CLEAR: "p-clear" };

export default async function ChicagoAlerts() {
  const data = await getNetworkData("veritas-charter");
  if (!data) redirect("/chicago/briefing");
  const active = data.statuses.filter((s) => s.status !== "CLEAR");

  return (
    <>
      <div className="wrap" style={{ paddingTop: 20 }}>
        <div className="main">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <b style={{ fontSize: 14 }}>Alert stream · two classes, honestly labeled</b>
            <span className="micro">Live layer · data-day layer</span>
          </div>

          {active.length === 0 ? (
            <div className="card" style={{ marginTop: 10, padding: "20px 18px", fontSize: 12.5, color: "var(--mut)" }}>
              <b style={{ color: "var(--ink)" }}>No active alerts.</b> All {data.campuses.length} campuses
              are CLEAR. A single news report (REPORTED tier) never pages anyone; an alert fires only from
              an honestly-labeled source — an NWS warning (LIVE) or a confirmed incident on the daily
              CPD/ME record (DATA-DAY). Watch never implies a live CPD feed exists.
            </div>
          ) : (
            active.map((s) => (
              <div key={s.campusCode} className="card" style={{ marginTop: 10, borderLeft: `4px solid var(--${s.status.toLowerCase()})` }}>
                <div style={{ padding: "14px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span className={`pill ${pillFor[s.status]}`}><span className="d" />{s.status}</span>
                  <b>{s.campusCode} · {s.detail ?? s.status}</b>
                  {s.ruleId && <span className="micro microink" style={{ fontSize: 10 }}>RULE {s.ruleId} · {s.ruleName}</span>}
                  <span className="mono num" style={{ marginLeft: "auto", color: "var(--mut)", fontSize: 10.5 }}>since {s.since}</span>
                </div>
              </div>
            ))
          )}

          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="card" style={{ flex: 1, minWidth: 260, padding: "14px 16px" }}>
              <div className="micro">Delivery policy</div>
              <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.6 }}>
                ALERT → push + SMS + email, quiet hours overridden.<br />
                ELEVATED → push + email, quiet hours respected.<br />
                MONITOR → in-app only.<br />
                Every delivery logged with timestamp → Audit.
              </div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 260, padding: "14px 16px" }}>
              <div className="micro">Honesty rules · enforced in UI</div>
              <div style={{ marginTop: 8, fontSize: 11.5, lineHeight: 1.6 }}>
                Every alert names its class: LIVE or DATA-DAY.<br />
                Every incident shows occurred time AND published time.<br />
                No alert ever implies a live CPD feed exists.<br />
                Single-source reports never page anyone.
              </div>
            </div>
          </div>

          <Link href="/contract" className="btn ghost" style={{ marginTop: 14, fontSize: 11 }}>
            Read the Notification Contract →
          </Link>
        </div>

        <div className="rail">
          <div className="card" style={{ padding: 16 }}>
            <div className="micro">Network impact · now</div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "On alert", color: "alert", n: data.counts.alert },
                { label: "Elevated", color: "elevated", n: data.counts.elevated },
                { label: "Monitor", color: "monitor", n: data.counts.monitor },
                { label: "Clear", color: "clear", n: data.counts.clear },
              ].map((x) => (
                <div key={x.label} style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 10 }}>
                  <div className="micro" style={{ color: `var(--${x.color})` }}>{x.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800 }} className="num">{x.n}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 16, marginTop: 14 }}>
            <div className="micro">Fast layer · this cycle</div>
            <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--mut)", lineHeight: 1.5 }}>
              {data.incidents.filter((i) => i.tier !== "CONFIRMED").length} corroborated/reported signals in the
              live window, awaiting an authoritative record. Preliminary — never a page on their own.
            </div>
          </div>
        </div>
      </div>
      <LiveFooter data={data} />
    </>
  );
}
