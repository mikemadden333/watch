import { notFound } from "next/navigation";
import FreshnessFooter from "@/components/FreshnessFooter";
import PlaybookChecklist from "@/components/PlaybookChecklist";
import { StatusPill, statusColorVar } from "@/components/ui";
import {
  campusByCode,
  campuses,
  tenant,
  englewoodContacts,
  englewoodPlaybook,
  englewoodTimeline,
  incidents,
  morningFeeds,
  morningStatuses,
  statusOf,
  PERMANENT_DISCLAIMER,
} from "@/lib/data/chicago";
import type { CampusStatus } from "@/lib/types";

export function generateStaticParams() {
  return campuses.map((c) => ({ code: c.code.toLowerCase() }));
}

export default async function CampusDetail({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const campus = campusByCode(code);
  if (!campus) notFound();
  const st = statusOf(morningStatuses, campus.code)!;
  const bannerBg =
    st.status === "ELEVATED"
      ? "var(--elevatedbg)"
      : st.status === "MONITOR"
        ? "var(--monitorbg)"
        : st.status === "ALERT"
          ? "var(--alertbg)"
          : "var(--clearbg)";

  const incident = st.incidentId ? incidents.find((i) => i.id === st.incidentId) : undefined;
  const isEng = campus.code === "ENG";

  return (
    <>
      {/* banner */}
      <div
        style={{
          margin: "20px 28px 0",
          border: "1px solid var(--line2)",
          background: bannerBg,
          borderRadius: 8,
          padding: "16px 22px",
        }}
      >
        <div className="micro">{tenant.name} · Campus</div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24, fontWeight: 800 }}>{campus.name}</span>
          <span className={`pill ${st.status === "CLEAR" ? "p-clear" : st.status === "MONITOR" ? "p-monitor" : st.status === "ELEVATED" ? "p-elevated" : "p-alert"}`}>
            <span className="d" />
            {st.status} · since {st.since}
          </span>
          {isEng && (
            <span className="mono" style={{ fontSize: 10.5, color: "var(--mut)" }}>
              evidence age · occurred 9 h ago · published 32 m ago
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 34, marginTop: 10, fontSize: 12, flexWrap: "wrap" }}>
          <span>
            {campus.students} students · {campus.grades} · {campus.address} ·{" "}
            <b>Dismissal {campus.dismissal}</b>
          </span>
          <span className="micro microink" style={{ fontSize: 10 }}>PRINCIPAL {campus.principal}</span>
          {campus.cpdLiaison && (
            <span className="micro microink" style={{ fontSize: 10 }}>CPD LIAISON {campus.cpdLiaison}</span>
          )}
          {st.ruleId && (
            <span className="micro microink" style={{ fontSize: 10 }}>
              TRIGGER Rule {st.ruleId} · {st.ruleName}
            </span>
          )}
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 16 }}>
        <div className="main">
          {/* evidence card */}
          {incident ? (
            <div className="card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: 14 }}>{incident.headline}</b>
                <span className={`pill badge-${incident.tier === "CONFIRMED" ? "conf" : incident.tier === "CORROBORATED" ? "corr" : "rep"}`}>
                  {incident.tier}
                </span>
              </div>
              <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--mut)" }}>
                {isEng
                  ? "Occurred yesterday 21:47 · published by CPD 06:40 today · 1 victim, non-fatal"
                  : `${incident.note ?? ""}`}
              </div>
              <div style={{ display: "flex", gap: 26, marginTop: 12, flexWrap: "wrap" }}>
                <Field label="Distance" value={`${incident.distanceMi} mi ${incident.bearing ?? ""}`} />
                <Field label="Within ring" value={incident.tier === "CONFIRMED" ? "ELEVATED (0.5)" : "ELEVATED (0.5)"} />
                <Field label="Occurred" value={isEng ? "yest 21:47" : "05:35 today"} />
                <Field label="Published" value={isEng ? "06:40 · CPD VR" : "06:33 · news"} />
                <Field label="Corroboration" value={isEng ? "Block Club · 22:40 yest" : "GDELT · 06:31"} />
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {isEng ? (
                  <>
                    <Chip cls="c-conf" label="CPD VR gumc-mgzr" />
                    <Chip cls="c-conf" label="Geocode verified" />
                    <Chip cls="c-corr" label="Block Club Chicago" />
                    <Chip cls="c-corr" label="GDELT" />
                  </>
                ) : (
                  <>
                    <Chip cls="c-corr" label="News ×2" />
                    <Chip cls="c-corr" label="GDELT" />
                    <Chip cls="c-conf" label="Geocode verified" />
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <b style={{ fontSize: 14 }}>No qualifying signals</b>
                <span className="pill badge-conf">CLEAR</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "var(--mut)" }}>
                No confirmed or corroborated incidents inside this campus&apos;s
                rings on the latest data day. All-clear is deliberately boring.
              </div>
            </div>
          )}

          {/* playbook */}
          {isEng ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 18 }}>
                <b style={{ fontSize: 14 }}>
                  Playbook · {englewoodPlaybook.status} · {englewoodPlaybook.role}
                </b>
                <span className="micro">
                  Authored by {englewoodPlaybook.author} · {englewoodPlaybook.version} · 2 of 5 done
                </span>
              </div>
              <PlaybookChecklist steps={englewoodPlaybook.steps} />
            </>
          ) : (
            <div className="card" style={{ padding: "16px 18px", marginTop: 18, fontSize: 12, color: "var(--mut)" }}>
              No active playbook — status {st.status}. Playbooks activate on
              ELEVATED and ALERT posture and are role-filtered per user.
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 10.5, color: "var(--mut)", fontFamily: "Menlo,monospace", textTransform: "uppercase", letterSpacing: 0.6 }}>
            {PERMANENT_DISCLAIMER}
          </div>
        </div>

        {/* rail */}
        <div className="rail">
          {/* vicinity */}
          <div className="card" style={{ padding: "14px 16px" }}>
            <div className="micro">Vicinity</div>
            <div style={{ marginTop: 10, height: 150, background: "#EDEAE2", borderRadius: 6, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", width: 110, height: 110, border: "2px dashed var(--alert)", borderRadius: "50%", left: 55, top: 22, opacity: 0.7 }} />
              <div style={{ position: "absolute", width: 26, height: 26, background: statusColorVar(st.status), border: "2px solid #1B1A17", borderRadius: "50%", left: 97, top: 64, color: "#fff", fontSize: 8, fontFamily: "Menlo,monospace", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                {campus.code}
              </div>
              <div style={{ position: "absolute", width: 12, height: 12, background: "var(--clear)", border: "2px solid #fff", borderRadius: "50%", left: 150, top: 38 }} />
              <div style={{ position: "absolute", width: 12, height: 12, background: "var(--clear)", border: "2px solid #fff", borderRadius: "50%", opacity: 0.5, left: 60, top: 100 }} />
            </div>
            <div className="micro" style={{ marginTop: 8 }}>
              Rings · ALERT {campus.alertRingMi} mi · ELEVATED {campus.elevatedRingMi} mi
            </div>
          </div>

          {/* status timeline */}
          <div className="card" style={{ padding: "14px 16px", marginTop: 12 }}>
            <div className="micro">Status timeline</div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 11, fontSize: 11 }}>
              {(isEng ? englewoodTimeline : genericTimeline(st)).map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10 }}>
                  <span style={{ color: t.kind === "active" ? statusColorVar(st.status) : "var(--faint)" }}>
                    {t.kind === "future" ? "○" : "●"}
                  </span>
                  <div>
                    <span className="mono num" style={{ color: "var(--mut)" }}>{t.time}</span>
                    &nbsp;{t.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* contacts */}
          <div className="card" style={{ padding: "14px 16px", marginTop: 12 }}>
            <div className="micro">Contacts</div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 9, fontSize: 11.5 }}>
              {englewoodContacts.map((c) => (
                <div key={c.name} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>
                    <b>{c.name}</b> · {c.role}
                  </span>
                  <span className="mono num" style={{ color: "var(--mut)" }}>{c.value}</span>
                </div>
              ))}
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

function genericTimeline(st: CampusStatus) {
  return [
    { time: st.since, text: `Last status calc · ${st.status}`, kind: "active" as const },
    { time: "—", text: "No qualifying signals on latest data day", kind: "past" as const },
  ];
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="micro">{label}</div>
      <div style={{ fontWeight: 700 }} className="num">{value}</div>
    </div>
  );
}
function Chip({ cls, label }: { cls: string; label: string }) {
  return (
    <span className={`chip ${cls}`}>
      <span className="d" />
      {label}
    </span>
  );
}
