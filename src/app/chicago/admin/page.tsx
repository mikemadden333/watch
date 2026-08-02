import FreshnessFooter from "@/components/FreshnessFooter";
import QuietWindowsCard from "@/components/QuietWindowsCard";
import {
  campuses,
  dataSources,
  morningFeeds,
  tenant,
  thresholds,
} from "@/lib/data/chicago";

const SUBNAV = [
  "Campuses",
  "Thresholds & rules",
  "Users & roles",
  "Alert routing",
  "Playbook editor",
  "Data sources",
  "Network settings",
];

const GRID = "1.5fr 2fr 0.9fr 0.9fr 0.9fr 1fr 0.7fr";

export default function AdminPage() {
  return (
    <>
      <div className="wrap" style={{ paddingTop: 20 }}>
        {/* sub-nav */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12.5 }}>
            {SUBNAV.map((s, i) => (
              <div
                key={s}
                style={{
                  padding: "9px 12px",
                  borderRadius: 6,
                  background: i === 0 ? "var(--ink)" : undefined,
                  color: i === 0 ? "#fff" : "var(--mut)",
                  fontWeight: i === 0 ? 600 : 400,
                }}
              >
                {s}
              </div>
            ))}
          </div>
          <hr className="hr" />
          <div className="micro" style={{ lineHeight: 1.8 }}>
            Nothing hardcoded.
            <br />
            Campuses, radii, windows,
            <br />
            routing, playbooks — all
            <br />
            account config. SSO via
            <br />
            Google Workspace / M365.
          </div>
        </div>

        <div className="main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ fontSize: 15 }}>Campuses · {tenant.name}</b>
            <button className="btn">+ Add campus</button>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="micro" style={{ display: "grid", gridTemplateColumns: GRID, padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
              <span>Campus</span>
              <span>Address · geocode</span>
              <span>Alert ring</span>
              <span>Elev. ring</span>
              <span>Dismissal</span>
              <span>Principal</span>
              <span />
            </div>
            {campuses.map((c, i) => (
              <div
                key={c.code}
                style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  padding: "12px 16px",
                  borderBottom: i < campuses.length - 1 ? "1px solid var(--line)" : undefined,
                  fontSize: 12,
                  alignItems: "center",
                }}
              >
                <b>{c.name}</b>
                <span className="mono num" style={{ fontSize: 10.5 }}>
                  {c.address} · {c.geocodeVerified ? "✓ verified" : "unverified"}
                </span>
                <span className="num">{c.alertRingMi.toFixed(2)} mi</span>
                <span className="num">{c.elevatedRingMi.toFixed(2)} mi</span>
                <span className="num">{c.dismissal}</span>
                <span>{c.principal}</span>
                <span className="chip" style={{ width: "fit-content" }}>edit</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            {/* thresholds */}
            <div className="card" style={{ flex: 1.2, minWidth: 300, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b>Thresholds &amp; rules</b>
                <span className="chip">rules v2.0 · view changelog</span>
              </div>
              <div style={{ marginTop: 12, fontFamily: "Menlo,monospace", fontSize: 10.5, display: "flex", flexDirection: "column", gap: 9 }}>
                {thresholds.map((t) => (
                  <div key={t.label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: "var(--mut)" }}>{t.label}</span>
                    <span style={{ textAlign: "right" }}>{t.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 10.5, color: "var(--mut)" }}>
                Every value overridable per account and per campus. Changes are
                versioned; the version that fired is pinned to every status
                change in Audit.
              </div>
            </div>

            {/* data sources */}
            <div className="card" style={{ flex: 1, minWidth: 280, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b>Data sources</b>
                <span className="chip">7 active</span>
              </div>
              <div style={{ marginTop: 12, fontFamily: "Menlo,monospace", fontSize: 10.5, display: "flex", flexDirection: "column", gap: 8 }}>
                {dataSources.map((d) => (
                  <div key={d.label} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: d.optional ? "var(--faint)" : undefined }}>{d.label}</span>
                    <span className={d.on ? "ok" : undefined} style={{ color: d.optional ? "var(--faint)" : undefined }}>
                      {d.state}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 10.5, color: "var(--mut)" }}>
                Each source has an expected freshness window. Outside its window →
                flagged, excluded from status calc, incident banner in footer.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <QuietWindowsCard campuses={campuses} />
          </div>
        </div>
      </div>

      <FreshnessFooter
        feeds={morningFeeds}
        lastCycle="07:12:04"
        right="STATUS CALC ON 6 OF 7 FEEDS · RULES v2.0"
        base="/chicago"
      />
    </>
  );
}
