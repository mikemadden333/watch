import Link from "next/link";
import type { NetworkData } from "@/lib/networkData";
import { StatusPill } from "@/components/ui";
import type { Status } from "@/lib/types";

const TOP: Status[] = ["ALERT", "ELEVATED", "MONITOR", "CLEAR"];

function topPosture(d: NetworkData): Status {
  for (const s of TOP) {
    if (
      (s === "ALERT" && d.counts.alert) ||
      (s === "ELEVATED" && d.counts.elevated) ||
      (s === "MONITOR" && d.counts.monitor)
    )
      return s;
  }
  return "CLEAR";
}

const postureColor: Record<Status, string> = {
  ALERT: "var(--alert)",
  ELEVATED: "var(--elevated)",
  MONITOR: "var(--monitor)",
  CLEAR: "var(--clear)",
};
const postureBg: Record<Status, string> = {
  ALERT: "var(--alertbg)",
  ELEVATED: "var(--elevatedbg)",
  MONITOR: "var(--monitorbg)",
  CLEAR: "var(--clearbg)",
};

export default function LiveBriefing({ data, base }: { data: NetworkData; base: string }) {
  const posture = topPosture(data);
  const active = data.statuses.filter((s) => s.status !== "CLEAR");
  const feedIncidents = data.incidents.slice(0, 8);

  return (
    <>
      {/* posture banner (live) */}
      <div
        style={{
          margin: "20px 28px 0",
          border: "1px solid var(--line2)",
          background: postureBg[posture],
          borderRadius: 8,
          padding: "18px 22px",
          display: "flex",
          gap: 26,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 210 }}>
          <div className="micro">Live Posture · {data.city}</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: postureColor[posture], letterSpacing: 0.3, marginTop: 4 }}>
            {posture}
          </div>
          <div className="micro" style={{ marginTop: 4 }}>
            {data.counts.alert + data.counts.elevated + data.counts.monitor} of {data.campuses.length} campuses · rules v2.0
          </div>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, maxWidth: 760, flex: 1 }}>
          {posture === "CLEAR" ? (
            <>
              <b>All campuses clear.</b> No qualifying signals inside any campus ring.
              Live dispatch and weather feeds are polling; incidents below are network-scope context.
              All-clear is deliberately boring.
            </>
          ) : (
            <>
              <b>
                {active.length} campus{active.length === 1 ? "" : "es"} above CLEAR
              </b>{" "}
              — {active.map((s) => `${s.campusCode} ${s.status}`).join(", ")}. Every status traces to a
              source, a timestamp, and a rule.
            </>
          )}
          <span className="chip c-conf" style={{ margin: "0 6px" }}>
            <span className="d" />
            LIVE DATA
          </span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href={`${base}/map`} className="btn">
            Open campus map →
          </Link>
          <Link href={`${base}/audit`} className="btn ghost">
            Audit trail →
          </Link>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 18 }}>
        <div className="main">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <b style={{ fontSize: 14 }}>Campuses</b>
            <span className="micro">{data.campuses.length} total · sorted by status</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 10 }}>
            {data.campuses.map((c) => {
              const st = data.statuses.find((s) => s.campusCode === c.code);
              const status = st?.status ?? "CLEAR";
              return (
                <Link
                  key={c.code}
                  href={`${base}/campuses/${c.code.toLowerCase()}`}
                  className="card"
                  style={{ padding: "14px 16px", borderColor: status !== "CLEAR" ? postureColor[status] : undefined, display: "block" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <b>{c.name}</b>
                    <StatusPill status={status} />
                  </div>
                  <div className="micro" style={{ marginTop: 5 }}>
                    {c.code} · {c.students} students
                  </div>
                  <div style={{ fontSize: 11.5, marginTop: 8, color: "var(--mut)" }}>
                    {st?.detail ?? "No qualifying signals"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>
                    {st?.ruleId ? `rule ${st.ruleId} · since ${st.since}` : "live · checked this cycle"}
                  </div>
                </Link>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 20 }}>
            <b style={{ fontSize: 14 }}>Intelligence feed</b>
            <span className="micro">Live layer · network scope</span>
          </div>
          <div className="card" style={{ marginTop: 10 }}>
            {feedIncidents.length === 0 && (
              <div style={{ padding: "16px", fontSize: 12, color: "var(--mut)" }}>
                No incidents ingested yet this cycle.
              </div>
            )}
            {feedIncidents.map((inc, i) => (
              <div
                key={inc.id}
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  gap: 14,
                  borderBottom: i < feedIncidents.length - 1 ? "1px solid var(--line)" : undefined,
                }}
              >
                <span className="mono num" style={{ color: "var(--mut)", fontSize: 11, width: 96, flexShrink: 0 }}>
                  {fmt(inc.occurredAt)}
                </span>
                <div style={{ flex: 1 }}>
                  <b>{inc.headline}</b>{" "}
                  <span style={{ color: "var(--mut)" }}>
                    —{" "}
                    {inc.distanceMi != null
                      ? `${inc.distanceMi} mi ${inc.bearing ?? ""} of ${inc.nearestCampusCode}`
                      : inc.note ?? "network scope"}
                  </span>
                  <div style={{ marginTop: 5, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className={`chip ${inc.tier === "CONFIRMED" ? "c-conf" : inc.tier === "CORROBORATED" ? "c-corr" : "c-rep"}`}>
                      <span className="d" />
                      {inc.source}
                    </span>
                  </div>
                </div>
                <span className={`pill badge-${inc.tier === "CONFIRMED" ? "conf" : inc.tier === "CORROBORATED" ? "corr" : "rep"}`}>
                  {inc.tier}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* rail */}
        <div className="rail">
          <div className="card" style={{ padding: 16 }}>
            <div className="micro">Network at a glance</div>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }} className="num">
                  {data.counts.clear}{" "}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--clear)" }}>clear</span>
                </div>
                <div className="micro">
                  {data.counts.alert} alert · {data.counts.elevated} elevated · {data.counts.monitor} monitor
                </div>
              </div>
              <hr className="hr" style={{ margin: "2px 0" }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }} className="num">{data.incidents.length}</div>
                <div className="micro">Incidents ingested · live window</div>
              </div>
              <hr className="hr" style={{ margin: "2px 0" }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }} className="num">
                  {data.feeds.filter((f) => f.state === "ok").length}/{data.feeds.length}
                </div>
                <div className="micro">Feeds inside their expected window</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 16, marginTop: 14 }}>
            <div className="micro">Data freshness · live</div>
            <div style={{ marginTop: 10, fontFamily: "Menlo,monospace", fontSize: 10.5, display: "flex", flexDirection: "column", gap: 8 }}>
              {data.feeds.map((f) => (
                <div key={f.key} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{f.label}</span>
                  <span className={f.state === "ok" ? "ok" : f.state === "warn" ? "warn" : "late"}>
                    {f.age || "—"}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 10.5, color: "var(--mut)", lineHeight: 1.5 }}>
              A feed outside its expected window is flagged and excluded from status calc.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function fmt(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
