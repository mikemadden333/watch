import type { Campus } from "@/lib/types";
import { DEFAULT_QUIET } from "@/lib/delivery";

/** Admin display of per-campus quiet windows (v1.1). Config surface;
 *  editing is a follow-up. During a window, only ALERTs break through. */
export default function QuietWindowsCard({ campuses }: { campuses: Campus[] }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b>Quiet windows · arrival &amp; dismissal</b>
        <span className="chip">default on</span>
      </div>
      <div
        style={{
          marginTop: 12,
          fontFamily: "Menlo,monospace",
          fontSize: 10.5,
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 0.7fr",
          gap: "8px 12px",
          alignItems: "center",
        }}
      >
        <span className="micro">Campus</span>
        <span className="micro">Arrival</span>
        <span className="micro">Dismissal</span>
        <span className="micro">State</span>
        {campuses.map((c) => {
          const on = c.quietWindowsEnabled ?? DEFAULT_QUIET.quietWindowsEnabled;
          return (
            <div key={c.code} style={{ display: "contents" }}>
              <span style={{ fontWeight: 600 }}>{c.code}</span>
              <span className="num">
                {c.arrivalStart ?? DEFAULT_QUIET.arrivalStart}–{c.arrivalEnd ?? DEFAULT_QUIET.arrivalEnd}
              </span>
              <span className="num">
                {c.dismissalStart ?? DEFAULT_QUIET.dismissalStart}–{c.dismissalEnd ?? DEFAULT_QUIET.dismissalEnd}
              </span>
              <span className={on ? "ok" : undefined} style={{ color: on ? undefined : "var(--faint)" }}>
                {on ? "ON" : "off"}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, fontSize: 10.5, color: "var(--mut)", lineHeight: 1.5 }}>
        During arrival and dismissal, MONITOR/ELEVATED notifications are held and
        delivered when the window ends — only ALERT-tier breaks through. Every
        held or overriding delivery is logged to Audit. A principal running
        dismissal is a pilot on final approach.
      </div>
    </div>
  );
}
