import { notFound } from "next/navigation";
import LiveFooter from "@/components/live/LiveFooter";
import { StatusPill, statusColorVar } from "@/components/ui";
import { getNetworkData } from "@/lib/networkData";
import { PERMANENT_DISCLAIMER } from "@/lib/data/chicago";

export const dynamic = "force-dynamic";

export default async function DallasCampusDetail({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getNetworkData("solis-academies");
  if (!data) notFound();
  const campus = data.campuses.find((c) => c.code.toLowerCase() === code.toLowerCase());
  if (!campus) notFound();
  const st = data.statuses.find((s) => s.campusCode === campus.code);
  const status = st?.status ?? "CLEAR";
  const nearby = data.incidents.filter((i) => i.distanceMi != null && i.distanceMi <= campus.elevatedRingMi);

  return (
    <>
      <div
        style={{
          margin: "20px 28px 0",
          border: "1px solid var(--line2)",
          background: status === "CLEAR" ? "var(--clearbg)" : "var(--elevatedbg)",
          borderRadius: 8,
          padding: "16px 22px",
        }}
      >
        <div className="micro">{data.tenantName} · Campus · Live</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24, fontWeight: 800 }}>{campus.name}</span>
          <StatusPill status={status} />
        </div>
        <div style={{ display: "flex", gap: 34, marginTop: 10, fontSize: 12, flexWrap: "wrap" }}>
          <span>
            {campus.students} students · {campus.grades} · {campus.address} · <b>Dismissal {campus.dismissal}</b>
          </span>
          <span className="micro microink" style={{ fontSize: 10 }}>PRINCIPAL {campus.principal}</span>
          <span className="micro microink" style={{ fontSize: 10 }}>
            RINGS ALERT {campus.alertRingMi} MI · ELEVATED {campus.elevatedRingMi} MI
          </span>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 16 }}>
        <div className="main">
          <div className="card" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: 14 }}>
                {nearby.length ? `${nearby.length} confirmed in ring` : "No qualifying signals"}
              </b>
              <span className="pill badge-conf">{status}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "var(--mut)" }}>
              {nearby.length
                ? "Confirmed/corroborated incidents inside this campus's rings on the live window."
                : "No confirmed or corroborated incidents inside this campus's rings. Dispatch calls are network-scope until geocoded. All-clear is deliberately boring."}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 18 }}>
            <b style={{ fontSize: 14 }}>Network incidents · live</b>
            <span className="micro">nearest first</span>
          </div>
          <div className="card" style={{ marginTop: 10 }}>
            {data.incidents.slice(0, 6).map((inc, i) => (
              <div
                key={inc.id}
                style={{ padding: "12px 16px", display: "flex", gap: 14, borderBottom: i < 5 ? "1px solid var(--line)" : undefined }}
              >
                <div style={{ flex: 1 }}>
                  <b>{inc.headline}</b>
                  <div style={{ fontSize: 11, color: "var(--mut)" }}>
                    {inc.distanceMi != null ? `${inc.distanceMi} mi ${inc.bearing} of ${inc.nearestCampusCode}` : inc.note ?? "network scope"} · {inc.source}
                  </div>
                </div>
                <span className={`pill badge-${inc.tier === "CONFIRMED" ? "conf" : inc.tier === "CORROBORATED" ? "corr" : "rep"}`}>
                  {inc.tier}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 10.5, color: "var(--mut)", fontFamily: "Menlo,monospace", textTransform: "uppercase", letterSpacing: 0.6 }}>
            {PERMANENT_DISCLAIMER}
          </div>
        </div>

        <div className="rail">
          <div className="card" style={{ padding: "14px 16px" }}>
            <div className="micro">Vicinity</div>
            <div style={{ marginTop: 10, height: 150, background: "var(--panel2)", borderRadius: 6, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", width: 110, height: 110, border: "2px dashed var(--elevated)", borderRadius: "50%", left: 55, top: 22, opacity: 0.6 }} />
              <div style={{ position: "absolute", width: 26, height: 26, background: statusColorVar(status), border: "2px solid var(--ink)", borderRadius: "50%", left: 97, top: 64, color: "#fff", fontSize: 8, fontFamily: "Menlo,monospace", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                {campus.code}
              </div>
            </div>
            <div className="micro" style={{ marginTop: 8 }}>Live · Dallas PD active calls + NWS</div>
          </div>
          <div className="card" style={{ padding: "14px 16px", marginTop: 12 }}>
            <div className="micro">Feeds</div>
            <div style={{ marginTop: 10, fontFamily: "Menlo,monospace", fontSize: 10.5, display: "flex", flexDirection: "column", gap: 8 }}>
              {data.feeds.map((f) => (
                <div key={f.key} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{f.label}</span>
                  <span className={f.state === "ok" ? "ok" : "warn"}>{f.age || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <LiveFooter data={data} />
    </>
  );
}
