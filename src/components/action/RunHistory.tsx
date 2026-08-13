"use client";

import { useState } from "react";
import { PHASES } from "@/lib/action/runbook";
import type { ResponseRun } from "@/lib/action/store";

/* Every closed run, newest first — the institutional memory a school
   never had. Expand a run for the full stamped timeline and AAR. */

function hm(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dayOf(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function durText(a: string, b?: string): string {
  if (!b) return "";
  const min = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

export default function RunHistory({ runs }: { runs: ResponseRun[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (runs.length === 0) {
    return (
      <div style={{ marginTop: 26 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>History</div>
        <p style={{ fontSize: 12.5, color: "var(--mut)" }}>
          No closed runs yet. Every run — real or drill — lives here permanently once closed.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 26 }}>
      <div className="section-label" style={{ marginBottom: 8 }}>History · every run, kept</div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {runs.map((r, ri) => {
          const done = r.steps.filter((s) => s.done).length;
          const isOpen = open === r.id;
          const timeline = [
            { at: r.startedAt, text: `Run opened by ${r.initiatedBy}` },
            ...(r.posture && r.postureAt ? [{ at: r.postureAt, text: `Posture set: ${r.posture}` }] : []),
            ...r.steps.filter((s) => s.done && s.at).map((s) => ({ at: s.at!, text: `${s.title} — ${s.actor}` })),
            ...r.notes.map((n) => ({ at: n.at, text: `Note: ${n.text}` })),
            ...(r.closedAt ? [{ at: r.closedAt, text: "Run closed · after-action review filed" }] : []),
          ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
          const skipped = r.steps.filter((s) => !s.done);

          return (
            <div key={r.id} style={{ borderBottom: ri < runs.length - 1 ? "1px solid var(--line)" : undefined }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : r.id)}
                style={{
                  display: "flex", width: "100%", textAlign: "left", background: "none", border: "none",
                  padding: "13px 20px", gap: 12, alignItems: "center", cursor: "pointer", fontFamily: "var(--sans)",
                }}
              >
                <span className="mono" style={{ fontSize: 11, color: "var(--mut)", width: 52, flexShrink: 0 }}>{dayOf(r.startedAt)}</span>
                <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45 }}>
                  <b>{r.campusName}</b> · {r.incidentHeadline}
                  {r.drill ? <span className="chip" style={{ marginLeft: 8, fontSize: 9.5, padding: "2px 7px" }}>DRILL</span> : null}
                </span>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--mut)", flexShrink: 0 }}>
                  {r.posture ?? "—"} · {done}/{r.steps.length} · {durText(r.startedAt, r.closedAt)} {isOpen ? "▴" : "▾"}
                </span>
              </button>

              {isOpen ? (
                <div style={{ padding: "2px 20px 18px 84px" }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    {timeline.map((t, i) => (
                      <div key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>
                        <span className="mono" style={{ fontSize: 10.5, color: "var(--mut)" }}>{hm(t.at)}</span> · {t.text}
                      </div>
                    ))}
                  </div>
                  {skipped.length > 0 ? (
                    <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 10 }}>
                      Not completed: {skipped.map((s) => s.title).join(" · ")}
                    </div>
                  ) : null}
                  {r.aar ? (
                    <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                      <div className="section-label" style={{ marginBottom: 8 }}>After-action review</div>
                      <div style={{ display: "grid", gap: 4 }}>
                        {r.aar.answers.map((a) => (
                          <div key={a.q} style={{ fontSize: 11.5, display: "flex", gap: 8, justifyContent: "space-between", maxWidth: 560 }}>
                            <span style={{ color: "var(--ink2)" }}>{a.q}</span>
                            <span className="mono" style={{ fontSize: 10.5, color: a.a === "no" ? "var(--amber2)" : "var(--mut)", flexShrink: 0 }}>
                              {a.a === "na" ? "n/a" : a.a}
                            </span>
                          </div>
                        ))}
                      </div>
                      {r.aar.worked ? <p style={{ fontSize: 12, margin: "10px 0 0", lineHeight: 1.5 }}><b>Worked:</b> {r.aar.worked}</p> : null}
                      {r.aar.improve ? <p style={{ fontSize: 12, margin: "6px 0 0", lineHeight: 1.5 }}><b>Change:</b> {r.aar.improve}</p> : null}
                    </div>
                  ) : null}
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button className="btn ghost" type="button" style={{ fontSize: 11 }}>Export PDF</button>
                    <span style={{ fontSize: 11, color: "var(--mut)", alignSelf: "center" }}>
                      Runs are append-only once closed — nothing here is editable, ever.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
