import { notFound } from "next/navigation";
import LiveFooter from "@/components/live/LiveFooter";
import VerificationJourney from "@/components/VerificationJourney";
import TierBadge from "@/components/TierBadge";
import { StatusPill, statusColorVar } from "@/components/ui";
import { deriveJourney } from "@/lib/journey";
import { getNetworkData } from "@/lib/networkData";
import { PERMANENT_DISCLAIMER } from "@/lib/data/chicago";

export const dynamic = "force-dynamic";

export default async function ChicagoCampusDetail({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const data = await getNetworkData("veritas-charter");
  if (!data) notFound();
  const campus = data.campuses.find((c) => c.code.toLowerCase() === code.toLowerCase());
  if (!campus) notFound();
  const st = data.statuses.find((s) => s.campusCode === campus.code);
  const status = st?.status ?? "CLEAR";

  const nearby = data.incidents
    .filter((i) => i.distanceMi != null && i.distanceMi <= campus.elevatedRingMi)
    .sort((a, b) => (a.distanceMi ?? 99) - (b.distanceMi ?? 99));
  const trigger =
    (st?.incidentId && data.incidents.find((i) => i.id === st.incidentId)) || nearby[0] || null;

  const bannerBg =
    status === "ALERT"
      ? "var(--alertbg)"
      : status === "ELEVATED"
        ? "var(--elevatedbg)"
        : status === "MONITOR"
          ? "var(--monitorbg)"
          : "var(--clearbg)";

  return (
    <>
      <div style={{ margin: "20px 28px 0", border: "1px solid var(--line2)", background: bannerBg, borderRadius: 8, padding: "16px 22px" }}>
        <div className="micro">{data.tenantName} · Campus · Live</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24, fontWeight: 800 }}>{campus.name}</span>
          <StatusPill status={status} />
          {st?.since && <span className="mono" style={{ fontSize: 10.5, color: "var(--mut)" }}>since {st.since}</span>}
        </div>
        <div style={{ display: "flex", gap: 34, marginTop: 10, fontSize: 12, flexWrap: "wrap" }}>
          <span>
            {campus.students} students · {campus.grades} · {campus.address} · <b>Dismissal {campus.dismissal}</b>
          </span>
          <span className="micro microink" style={{ fontSize: 10 }}>PRINCIPAL {campus.principal}</span>
          {campus.cpdLiaison && <span className="micro microink" style={{ fontSize: 10 }}>CPD LIAISON {campus.cpdLiaison}</span>}
          {st?.ruleId && <span className="micro microink" style={{ fontSize: 10 }}>TRIGGER Rule {st.ruleId} · {st.ruleName}</span>}
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 16 }}>
        <div className="main">
          {trigger ? (
            <div className="card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: 14 }}>{trigger.headline}</b>
                <TierBadge tier={trigger.tier} />
              </div>
              <div style={{ display: "flex", gap: 26, marginTop: 12, marginBottom: 4, flexWrap: "wrap" }}>
                {trigger.distanceMi != null && <Field label="Distance" value={`${trigger.distanceMi} mi ${trigger.bearing ?? ""}`} />}
                <Field label="Source" value={trigger.source} />
                {trigger.verifiedBy && <Field label="Verified by" value={trigger.verifiedBy} />}
              </div>
              <hr className="hr" style={{ margin: "12px 0" }} />
              <div className="micro" style={{ marginBottom: 10 }}>Verification journey</div>
              <VerificationJourney steps={deriveJourney(trigger)} />
            </div>
          ) : (
            <div className="card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: 14 }}>No qualifying signals</b>
                <span className="pill badge-conf">CLEAR</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--mut)" }}>
                No confirmed or corroborated incidents inside this campus&apos;s rings on the live
                window. All-clear is deliberately boring.
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 18 }}>
            <b style={{ fontSize: 14 }}>Network incidents · live</b>
            <span className="micro">nearest first</span>
          </div>
          <div className="card" style={{ marginTop: 10 }}>
            {data.incidents.length === 0 ? (
              <div style={{ padding: "16px", fontSize: 12, color: "var(--mut)" }}>No incidents in the live window.</div>
            ) : (
              data.incidents.slice(0, 8).map((inc, i) => (
                <div key={inc.id} style={{ padding: "12px 16px", display: "flex", gap: 14, borderBottom: i < Math.min(7, data.incidents.length - 1) ? "1px solid var(--line)" : undefined }}>
                  <div style={{ flex: 1 }}>
                    <b>{inc.headline}</b>
                    <div style={{ fontSize: 11, color: "var(--mut)" }}>
                      {inc.distanceMi != null ? `${inc.distanceMi} mi ${inc.bearing} of ${inc.nearestCampusCode}` : inc.note ?? "network scope"} · {inc.source}
                    </div>
                  </div>
                  <span className={`pill badge-${inc.tier === "CONFIRMED" ? "conf" : inc.tier === "CORROBORATED" ? "corr" : "rep"}`}>{inc.tier}</span>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: 10, fontSize: 10.5, color: "var(--mut)", fontFamily: "Menlo,monospace", textTransform: "uppercase", letterSpacing: 0.6 }}>
            {PERMANENT_DISCLAIMER}
          </div>
        </div>

        <div className="rail">
          <div className="card" style={{ padding: "14px 16px" }}>
            <div className="micro">Vicinity</div>
            <div style={{ marginTop: 10, height: 150, background: "#EDEAE2", borderRadius: 6, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", width: 110, height: 110, border: `2px dashed ${statusColorVar(status)}`, borderRadius: "50%", left: 55, top: 22, opacity: 0.6 }} />
              <div style={{ position: "absolute", width: 26, height: 26, background: statusColorVar(status), border: "2px solid #1B1A17", borderRadius: "50%", left: 97, top: 64, color: "#fff", fontSize: 8, fontFamily: "Menlo,monospace", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                {campus.code}
              </div>
            </div>
            <div className="micro" style={{ marginTop: 8 }}>
              Rings · ALERT {campus.alertRingMi} mi · ELEVATED {campus.elevatedRingMi} mi
            </div>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="micro">{label}</div>
      <div style={{ fontWeight: 700 }} className="num">{value}</div>
    </div>
  );
}
