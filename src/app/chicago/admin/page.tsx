import LiveFooter from "@/components/live/LiveFooter";
import QuietWindowsCard from "@/components/QuietWindowsCard";
import AlertRoutingCard from "@/components/admin/AlertRoutingCard";
import { getNetworkData } from "@/lib/networkData";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const SUBNAV = ["Campuses", "Thresholds & rules", "Users & roles", "Alert routing", "Playbook editor", "Data sources", "Network settings"];
const GRID = "1.6fr 2fr 0.9fr 0.9fr 0.9fr 1fr";

export default async function ChicagoAdmin() {
  const data = await getNetworkData("veritas-charter");
  if (!data) redirect("/chicago/briefing");

  return (
    <>
      <div className="wrap" style={{ paddingTop: 20 }}>
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12.5 }}>
            {SUBNAV.map((s, i) => (
              <div key={s} style={{ padding: "9px 12px", borderRadius: 6, background: i === 0 ? "var(--ink)" : undefined, color: i === 0 ? "var(--bg)" : "var(--mut)", fontWeight: i === 0 ? 600 : 400 }}>
                {s}
              </div>
            ))}
          </div>
          <hr className="hr" />
          <div className="micro" style={{ lineHeight: 1.8 }}>
            Nothing hardcoded.<br />Campuses, radii, windows,<br />routing, playbooks — all<br />account config. SSO via<br />Google Workspace / M365.
          </div>
        </div>

        <div className="main">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b style={{ fontSize: 15 }}>Campuses · {data.tenantName}</b>
            <button className="btn">+ Add campus</button>
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <div className="micro" style={{ display: "grid", gridTemplateColumns: GRID, padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
              <span>Campus</span><span>Address · geocode</span><span>Alert ring</span><span>Elev. ring</span><span>Dismissal</span><span>Principal</span>
            </div>
            {data.campuses.map((c, i) => (
              <div key={c.code} style={{ display: "grid", gridTemplateColumns: GRID, padding: "12px 16px", borderBottom: i < data.campuses.length - 1 ? "1px solid var(--line)" : undefined, fontSize: 12, alignItems: "center" }}>
                <b>{c.name}</b>
                <span className="mono num" style={{ fontSize: 10.5 }}>{c.address} · {c.geocodeVerified ? "✓ verified" : "unverified"}</span>
                <span className="num">{c.alertRingMi.toFixed(2)} mi</span>
                <span className="num">{c.elevatedRingMi.toFixed(2)} mi</span>
                <span className="num">{c.dismissal}</span>
                <span>{c.principal}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
            <div className="card" style={{ flex: 1, minWidth: 300, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b>Data sources · live</b><span className="chip">{data.feeds.length} tracked</span>
              </div>
              <div style={{ marginTop: 12, fontFamily: "Menlo,monospace", fontSize: 10.5, display: "flex", flexDirection: "column", gap: 8 }}>
                {data.feeds.map((f) => (
                  <div key={f.key} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{f.label}</span>
                    <span className={f.state === "ok" ? "ok" : "warn"}>{f.state === "ok" ? "ON" : "DEGRADED"} · {f.age || f.expectedWindow || "—"}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 10.5, color: "var(--mut)" }}>
                CPD VR / ME / crimes are daily records (DATA-DAY). News + dispatch are preliminary
                (REPORTED/CORROBORATED). Each source has an expected freshness window; outside it →
                flagged and excluded from status calc.
              </div>
            </div>
            <div className="card" style={{ flex: 1, minWidth: 260, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b>Thresholds &amp; rules</b><span className="chip">rules v2.0</span>
              </div>
              <div style={{ marginTop: 12, fontFamily: "Menlo,monospace", fontSize: 10.5, display: "flex", flexDirection: "column", gap: 9 }}>
                {[
                  ["A-1 warning trigger", "NWS warning ∩ campus"],
                  ["A-2 confirmed shooting", "0.25 mi · daily record"],
                  ["E-2 confirmed in ring", "0.5 mi · daily record"],
                  ["M-1 two-outlet news", "2+ outlets · 0.5 mi · block-level"],
                  ["Geo integrity gate", "coarse geo never rings"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: "var(--mut)" }}>{k}</span><span style={{ textAlign: "right" }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, fontSize: 10.5, color: "var(--mut)" }}>
                Every value overridable per account and per campus; the version that fired is pinned to
                every status change in Audit.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <AlertRoutingCard />
          </div>

          <div style={{ marginTop: 16 }}>
            <QuietWindowsCard campuses={data.campuses} />
          </div>
        </div>
      </div>
      <LiveFooter data={data} />
    </>
  );
}
