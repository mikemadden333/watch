import Link from "next/link";
import FreshnessFooter from "@/components/FreshnessFooter";
import { StatusPill } from "@/components/ui";
import {
  campuses,
  intelligenceFeed,
  morningFeeds,
  morningStatuses,
  statusOf,
} from "@/lib/data/chicago";

export default function BriefingPage() {
  return (
    <>
      {/* posture banner */}
      <div
        style={{
          margin: "20px 28px 0",
          border: "1px solid var(--line2)",
          background: "var(--elevatedbg)",
          borderRadius: 8,
          padding: "18px 22px",
          display: "flex",
          gap: 26,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 210 }}>
          <div className="micro">Morning Posture · 07:12</div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: "var(--elevated)",
              letterSpacing: 0.3,
              marginTop: 4,
            }}
          >
            ELEVATED
          </div>
          <div className="micro" style={{ marginTop: 4 }}>
            1 of 6 campuses · rules v2.0
          </div>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, maxWidth: 760, flex: 1 }}>
          <b>Confirmed shooting 0.31 mi NE of Englewood Prep</b>, occurred
          yesterday <b>21:47</b>, published by CPD at <b>06:40 today</b>{" "}
          <span className="chip c-conf" style={{ margin: "0 2px" }}>
            <span className="d" />
            CPD VR
          </span>
          . No severe weather{" "}
          <span className="chip c-conf" style={{ margin: "0 2px" }}>
            <span className="d" />
            NWS live
          </span>
          . No corroborated incidents in the last 6 h. All 7 feeds inside their
          expected windows. <b>Dismissal 15:30.</b>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/chicago/map" className="btn">
            Open campus map →
          </Link>
          <Link href="/chicago/map" className="btn ghost">
            Confirmed incidents (3) →
          </Link>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 18 }}>
        <div className="main">
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <b style={{ fontSize: 14 }}>Campuses</b>
            <span className="micro">6 total · sorted by status</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 12,
              marginTop: 10,
            }}
          >
            {campuses.map((c) => {
              const st = statusOf(morningStatuses, c.code)!;
              const isEng = c.code === "ENG";
              const isWdl = c.code === "WDL";
              return (
                <Link
                  key={c.code}
                  href={`/chicago/campuses/${c.code.toLowerCase()}`}
                  className="card"
                  style={{
                    padding: "14px 16px",
                    borderColor: isEng ? "var(--elevated)" : undefined,
                    display: "block",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <b>{c.name}</b>
                    <StatusPill status={st.status} />
                  </div>
                  <div className="micro" style={{ marginTop: 5 }}>
                    {c.code} · {c.students} students
                  </div>
                  {isEng ? (
                    <>
                      <div style={{ fontSize: 11.5, marginTop: 8 }}>
                        <b className="num">0.31 mi NE</b> · occurred 21:47{" "}
                        <span className="mono" style={{ color: "var(--mut)" }}>
                          · published 06:40
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>
                        Confirmed shooting · morning posture
                      </div>
                    </>
                  ) : isWdl ? (
                    <>
                      <div style={{ fontSize: 11.5, marginTop: 8 }}>
                        <b className="num">0.44 mi S</b> · 58 min ago{" "}
                        <span className="mono" style={{ color: "var(--mut)" }}>
                          · 2 outlets
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>
                        Corroborated news · unconfirmed
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 11.5, marginTop: 8, color: "var(--mut)" }}>
                        No qualifying signals
                      </div>
                      <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 2 }}>
                        Checked 2 m ago
                      </div>
                    </>
                  )}
                </Link>
              );
            })}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginTop: 20,
            }}
          >
            <b style={{ fontSize: 14 }}>Intelligence feed</b>
            <span className="micro">Confirmed layer + live layer · network scope</span>
          </div>
          <div className="card" style={{ marginTop: 10 }}>
            {intelligenceFeed.map((row, i) => (
              <div
                key={i}
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  gap: 14,
                  borderBottom:
                    i < intelligenceFeed.length - 1 ? "1px solid var(--line)" : undefined,
                }}
              >
                <span
                  className="mono num"
                  style={{ color: "var(--mut)", fontSize: 11, width: 88, flexShrink: 0 }}
                >
                  {row.time}
                </span>
                <div style={{ flex: 1 }}>
                  <b>{row.title}</b>{" "}
                  <span style={{ color: "var(--mut)" }}>— {row.detail}</span>
                  <div style={{ marginTop: 5, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {row.chips.map((ch, j) => (
                      <span key={j} className={`chip ${ch.cls}`}>
                        <span className="d" />
                        {ch.label}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={`pill badge-${row.badge === "CONFIRMED" ? "conf" : row.badge === "CORROBORATED" ? "corr" : "rep"}`}>
                  {row.badge}
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
                  1{" "}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--elevated)" }}>
                    elevated
                  </span>
                </div>
                <div className="micro">1 monitor · 4 clear · 0 alert</div>
              </div>
              <hr className="hr" style={{ margin: "2px 0" }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }} className="num">3</div>
                <div className="micro">Confirmed incidents · latest data day · within 0.5 mi</div>
              </div>
              <hr className="hr" style={{ margin: "2px 0" }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }} className="num">0.31 mi</div>
                <div className="micro">Closest confirmed · Englewood Prep · NE</div>
              </div>
              <hr className="hr" style={{ margin: "2px 0" }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }} className="num">96%</div>
                <div className="micro">30-day accuracy ledger · corroborated → confirmed</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ padding: 16, marginTop: 14 }}>
            <div className="micro">Data freshness · expected window</div>
            <div
              style={{
                marginTop: 10,
                fontFamily: "Menlo,monospace",
                fontSize: 10.5,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {morningFeeds.map((f) => (
                <div key={f.key} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{f.label}</span>
                  <span className={f.state === "ok" ? "ok" : f.state === "warn" ? "warn" : "late"}>
                    {f.age}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 10.5, color: "var(--mut)", lineHeight: 1.5 }}>
              Every feed shows its age. A feed outside its expected window is
              flagged and excluded from status calc.
            </div>
          </div>
        </div>
      </div>

      <FreshnessFooter
        feeds={morningFeeds}
        lastCycle="07:12:04"
        right="STATUS CALC ON 6 OF 7 FEEDS · RULES v2.0"
      />
    </>
  );
}
