"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AAR_QUESTIONS, PHASES, POSTURES } from "@/lib/action/runbook";
import {
  activeRun,
  allRuns,
  freshSteps,
  initialsOf,
  logMilestone,
  upsertRun,
  type AarAnswer,
  type ResponseRun,
} from "@/lib/action/store";
import RunHistory from "./RunHistory";

/* ============================================================
   The emergency response runner — Action tab's working half.
   At rest: one deliberate button. Initiating opens a logged run
   tied to an incident; every step completion stamps actor + time;
   the run cannot close without the after-action review; closing
   writes the whole history permanently. Nothing here dispatches
   anyone — it runs YOUR plan, and it remembers.
   ============================================================ */

export interface IncidentLite {
  id: string;
  headline: string;
  tier: string;
  kind: string;
  occurredAt: string;
  nearestCampusCode?: string;
  distanceMi?: number;
  bearing?: string;
}

function hm(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function elapsedText(startIso: string, now: number): string {
  const min = Math.max(0, Math.floor((now - new Date(startIso).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

export default function ActionRunner({
  slug,
  campuses,
  incidents,
  defaultCampus,
}: {
  slug: string;
  campuses: { code: string; name: string }[];
  incidents: IncidentLite[];
  defaultCampus: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [run, setRun] = useState<ResponseRun | null>(null);
  const [history, setHistory] = useState<ResponseRun[]>([]);
  const [mode, setMode] = useState<"idle" | "confirm" | "active" | "aar">("idle");
  const [justClosed, setJustClosed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // confirm-panel state
  const [campusCode, setCampusCode] = useState(defaultCampus);
  const [incidentId, setIncidentId] = useState<string | "manual">("manual");
  const [initiatedBy, setInitiatedBy] = useState("");
  const [drill, setDrill] = useState(false);

  // active-run state
  const [noteText, setNoteText] = useState("");
  const [aarAnswers, setAarAnswers] = useState<AarAnswer[]>([]);
  const [aarWorked, setAarWorked] = useState("");
  const [aarImprove, setAarImprove] = useState("");
  const aarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const open = activeRun(slug);
    if (open) {
      setRun(open);
      setMode("active");
    }
    setHistory(allRuns(slug).filter((r) => r.status === "closed"));
  }, [slug]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const campusIncidents = useMemo(() => {
    const near = incidents.filter((i) => i.nearestCampusCode === campusCode);
    const rest = incidents.filter((i) => i.nearestCampusCode !== campusCode);
    return [...near, ...rest].slice(0, 5);
  }, [incidents, campusCode]);

  function persist(next: ResponseRun) {
    setRun(next);
    upsertRun(slug, next);
  }

  function openConfirm(asDrill: boolean) {
    setDrill(asDrill);
    setCampusCode(defaultCampus);
    const near = incidents.find((i) => i.nearestCampusCode === defaultCampus);
    setIncidentId(asDrill ? "manual" : near?.id ?? "manual");
    setMode("confirm");
  }

  function start() {
    const campus = campuses.find((c) => c.code === campusCode) ?? campuses[0];
    const inc = incidentId === "manual" ? undefined : incidents.find((i) => i.id === incidentId);
    const who = initiatedBy.trim() || "Duty leader";
    const r: ResponseRun = {
      id: `run-${Date.now()}`,
      slug,
      campusCode: campus.code,
      campusName: campus.name,
      incidentId: inc?.id ?? null,
      incidentHeadline: inc?.headline ?? (drill ? "Drill · no linked incident" : "Manual activation · no linked incident"),
      drill,
      posture: null,
      initiatedBy: who,
      startedAt: new Date().toISOString(),
      steps: freshSteps(),
      notes: [],
      status: "active",
    };
    persist(r);
    setMode("active");
    setJustClosed(false);
    logMilestone(
      slug,
      `response run OPENED · ${campus.code}${drill ? " · DRILL" : ""}${inc ? ` · ${inc.headline}` : ""}`,
      `initiated by ${who} · Action tab`
    );
  }

  function setPosture(p: string) {
    if (!run) return;
    const at = new Date().toISOString();
    persist({ ...run, posture: p, postureAt: at });
    logMilestone(slug, `${run.campusCode} · posture set: ${p}`, `response run · by ${initialsOf(run.initiatedBy)} · ${hm(at)}`);
  }

  function completeStep(id: string) {
    if (!run) return;
    persist({
      ...run,
      steps: run.steps.map((s) =>
        s.id === id && !s.done
          ? { ...s, done: true, actor: initialsOf(run.initiatedBy), at: new Date().toISOString() }
          : s
      ),
    });
  }

  function addNote() {
    if (!run || !noteText.trim()) return;
    persist({ ...run, notes: [...run.notes, { at: new Date().toISOString(), text: noteText.trim() }] });
    setNoteText("");
  }

  function openAar() {
    if (!run) return;
    setAarAnswers(AAR_QUESTIONS.map((q) => ({ q, a: "na" as const })));
    setAarWorked("");
    setAarImprove("");
    setMode("aar");
    setTimeout(() => aarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  }

  function closeRun() {
    if (!run) return;
    const closed: ResponseRun = {
      ...run,
      closedAt: new Date().toISOString(),
      aar: { answers: aarAnswers, worked: aarWorked.trim(), improve: aarImprove.trim() },
      status: "closed",
    };
    persist(closed);
    setHistory(allRuns(slug).filter((r) => r.status === "closed"));
    setMode("idle");
    setRun(null);
    setJustClosed(true);
    const doneCount = closed.steps.filter((s) => s.done).length;
    logMilestone(
      slug,
      `response run CLOSED · ${closed.campusCode} · ${doneCount}/${closed.steps.length} steps · ${elapsedText(closed.startedAt, new Date(closed.closedAt!).getTime())}${closed.drill ? " · DRILL" : ""}`,
      "after-action review completed · full run history retained"
    );
  }

  if (!mounted) {
    return (
      <div className="card" style={{ padding: "22px 20px", fontSize: 12.5, color: "var(--mut)" }}>
        Loading response state…
      </div>
    );
  }

  /* ---------------- idle ---------------- */
  if (mode === "idle") {
    return (
      <>
        {justClosed ? (
          <div className="banner banner-neutral" style={{ borderLeft: "4px solid var(--clear)" }}>
            Run closed. The stamped history — every step, actor, and time — is preserved below and in Record.
          </div>
        ) : null}
        <div className="card" style={{ padding: "26px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 18, justifyContent: "space-between" }}>
          <div style={{ maxWidth: 520 }}>
            <b style={{ fontSize: 15 }}>Nothing is active.</b>
            <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 5, lineHeight: 1.55 }}>
              When a serious incident demands it, initiate a response run: the plan below becomes a live,
              stepped checklist — each completion stamped with who and when, the whole run logged permanently
              when you close it. This is deliberate, not automatic: Watch never initiates a response for you.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => openConfirm(false)}
              style={{
                background: "var(--alert)",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "13px 22px",
                fontSize: 13.5,
                fontWeight: 700,
                fontFamily: "var(--sans)",
                cursor: "pointer",
              }}
            >
              Initiate emergency response
            </button>
            <button className="btn ghost" type="button" onClick={() => openConfirm(true)} style={{ fontSize: 12.5 }}>
              Run as drill
            </button>
          </div>
        </div>
        <RunHistory runs={history} />
      </>
    );
  }

  /* ---------------- confirm ---------------- */
  if (mode === "confirm") {
    return (
      <div className="card" style={{ padding: "24px 24px 20px", borderLeft: `4px solid ${drill ? "var(--monitor)" : "var(--alert)"}` }}>
        <div className="section-label" style={{ marginBottom: 12 }}>
          {drill ? "Open a drill run" : "Initiate emergency response"}
        </div>

        <div style={{ display: "grid", gap: 16, maxWidth: 620 }}>
          <label style={{ fontSize: 12.5 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Campus</div>
            <select
              value={campusCode}
              onChange={(e) => setCampusCode(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: "1px solid var(--line2)", background: "var(--panel2)", fontFamily: "var(--sans)", fontSize: 13 }}
            >
              {campuses.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} · {c.code}
                </option>
              ))}
            </select>
          </label>

          <div style={{ fontSize: 12.5 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Linked incident</div>
            <div style={{ display: "grid", gap: 6 }}>
              {campusIncidents.map((i) => (
                <label
                  key={i.id}
                  style={{
                    display: "flex", gap: 10, alignItems: "flex-start", padding: "9px 11px", borderRadius: 8,
                    border: `1px solid ${incidentId === i.id ? "var(--ink)" : "var(--line)"}`, background: "var(--panel2)", cursor: "pointer",
                  }}
                >
                  <input type="radio" name="inc" checked={incidentId === i.id} onChange={() => setIncidentId(i.id)} style={{ marginTop: 2 }} />
                  <span style={{ lineHeight: 1.45 }}>
                    <b>{i.headline}</b>
                    <span style={{ color: "var(--mut)" }}>
                      {" "}· {i.tier} · {i.nearestCampusCode ?? "—"}
                      {typeof i.distanceMi === "number" ? ` · ${i.distanceMi.toFixed(2)} mi ${i.bearing ?? ""}` : ""} · occurred {hm(i.occurredAt)}
                    </span>
                  </span>
                </label>
              ))}
              <label
                style={{
                  display: "flex", gap: 10, alignItems: "center", padding: "9px 11px", borderRadius: 8,
                  border: `1px solid ${incidentId === "manual" ? "var(--ink)" : "var(--line)"}`, background: "var(--panel2)", cursor: "pointer",
                }}
              >
                <input type="radio" name="inc" checked={incidentId === "manual"} onChange={() => setIncidentId("manual")} />
                <span>
                  <b>No linked incident</b>
                  <span style={{ color: "var(--mut)" }}> · manual activation — something Watch hasn&apos;t seen yet</span>
                </span>
              </label>
            </div>
          </div>

          <label style={{ fontSize: 12.5, maxWidth: 300 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Initiated by</div>
            <input
              value={initiatedBy}
              onChange={(e) => setInitiatedBy(e.target.value)}
              placeholder="Your name — stamps every step"
              style={{ width: "100%", padding: "9px 10px", borderRadius: 7, border: "1px solid var(--line2)", background: "var(--panel2)", fontFamily: "var(--sans)", fontSize: 13 }}
            />
          </label>
        </div>

        <div className="banner banner-neutral" style={{ marginTop: 18, marginBottom: 14 }}>
          This opens a logged response run. Every step you complete is stamped with actor and time; the run
          closes only through an after-action review, and the full history is kept permanently. Call 911 first
          if there is imminent danger — Watch is decision support, not dispatch.
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn"
            type="button"
            onClick={start}
            style={drill ? undefined : { background: "var(--alert)" }}
          >
            {drill ? "Open the drill run" : "Open the run"}
          </button>
          <button className="btn ghost" type="button" onClick={() => setMode("idle")}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- active / aar ---------------- */
  if (!run) return null;
  const doneCount = run.steps.filter((s) => s.done).length;
  const allDone = doneCount === run.steps.length;

  return (
    <>
      {/* run header */}
      <div
        className="card"
        style={{
          padding: "18px 20px",
          borderLeft: `4px solid ${run.drill ? "var(--monitor)" : "var(--alert)"}`,
          display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "space-between",
        }}
      >
        <div style={{ minWidth: 260 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className={`pill ${run.drill ? "p-monitor" : "p-alert"}`}><span className="d" />{run.drill ? "DRILL RUN OPEN" : "RESPONSE RUN OPEN"}</span>
            <b style={{ fontSize: 14.5 }}>{run.campusName}</b>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 6, lineHeight: 1.5 }}>
            {run.incidentHeadline} · opened {hm(run.startedAt)} by {run.initiatedBy} · running {elapsedText(run.startedAt, now)}
            {run.posture ? ` · posture ${run.posture} at ${hm(run.postureAt)}` : ""}
          </div>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--mut)" }}>
          {doneCount}/{run.steps.length} steps · stamped as completed
        </div>
      </div>

      {/* posture */}
      <div className="card" style={{ marginTop: 12, padding: "16px 20px" }}>
        <div className="section-label" style={{ marginBottom: 10 }}>Building posture — say it twice, exactly</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {POSTURES.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPosture(p.key)}
              className="chip"
              style={{
                cursor: "pointer",
                fontFamily: "Menlo,monospace",
                padding: "8px 13px",
                background: run.posture === p.key ? "var(--ink)" : undefined,
                color: run.posture === p.key ? "var(--bg)" : undefined,
              }}
              title={p.when}
            >
              {p.key}
            </button>
          ))}
        </div>
        {run.posture ? (
          <div style={{ marginTop: 10, fontSize: 12.5, lineHeight: 1.5 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--mut)" }}>PA · </span>
            &ldquo;{POSTURES.find((p) => p.key === run.posture)?.pa}&rdquo;
            <span style={{ color: "var(--mut)" }}> — set {hm(run.postureAt)}</span>
          </div>
        ) : (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--mut)" }}>
            No posture set yet — choose one above; the exact public-address language appears here.
          </div>
        )}
      </div>

      {/* phases */}
      {PHASES.map((ph) => {
        const steps = run.steps.filter((s) => s.phase === ph.key);
        const d = steps.filter((s) => s.done).length;
        return (
          <div key={ph.key} className="card" style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "13px 20px 11px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <div>
                <b style={{ fontSize: 13.5 }}>{ph.label}</b>
                <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 2 }}>{ph.lead}</div>
              </div>
              <span className="mono" style={{ fontSize: 10.5, color: d === steps.length ? "var(--clear)" : "var(--mut)" }}>
                {d}/{steps.length}
              </span>
            </div>
            {steps.map((s, i) => (
              <div key={s.id} style={{ padding: "12px 20px", display: "flex", gap: 12, alignItems: "flex-start", borderBottom: i < steps.length - 1 ? "1px solid var(--line)" : undefined, opacity: s.done ? 0.72 : 1 }}>
                {s.done ? (
                  <div style={{ width: 18, height: 18, background: "var(--ink)", borderRadius: 4, color: "var(--bg)", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>✓</div>
                ) : (
                  <div style={{ width: 18, height: 18, border: "1.5px solid var(--line2)", borderRadius: 4, flexShrink: 0, marginTop: 1 }} />
                )}
                <div style={{ flex: 1 }}>
                  <b style={{ fontSize: 13 }}>{s.title}</b>
                  <span className="chip" style={{ marginLeft: 8, fontSize: 9.5, padding: "2px 7px", verticalAlign: "1px" }}>{s.role}</span>
                  <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 3, lineHeight: 1.5, maxWidth: 68 * 8 }}>{s.detail}</div>
                </div>
                {s.done ? (
                  <span className="chip mono" style={{ fontSize: 10.5 }}>{s.actor} · {hm(s.at)}</span>
                ) : (
                  <button className="chip" onClick={() => completeStep(s.id)} type="button" style={{ cursor: "pointer", fontFamily: "Menlo,monospace" }}>
                    mark complete
                  </button>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {/* notes */}
      <div className="card" style={{ marginTop: 12, padding: "16px 20px" }}>
        <div className="section-label" style={{ marginBottom: 10 }}>Run log — document as you go</div>
        {run.notes.length > 0 ? (
          <div style={{ display: "grid", gap: 7, marginBottom: 12 }}>
            {run.notes.map((n, i) => (
              <div key={i} style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                <span className="mono" style={{ fontSize: 10.5, color: "var(--mut)" }}>{hm(n.at)}</span> · {n.text}
              </div>
            ))}
          </div>
        ) : null}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNote()}
            placeholder="What just happened — one line, stamped now"
            style={{ flex: 1, padding: "9px 11px", borderRadius: 7, border: "1px solid var(--line2)", background: "var(--panel2)", fontFamily: "var(--sans)", fontSize: 12.5 }}
          />
          <button className="btn ghost" type="button" onClick={addNote} style={{ fontSize: 12 }}>Log it</button>
        </div>
      </div>

      {/* close / AAR */}
      {mode === "active" ? (
        <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className={`btn${allDone ? "" : " ghost"}`} type="button" onClick={openAar}>
            Close the run — after-action review
          </button>
          {!allDone ? (
            <span style={{ fontSize: 11.5, color: "var(--mut)" }}>
              {run.steps.length - doneCount} steps incomplete — you can still close; they&apos;ll be recorded as not completed.
            </span>
          ) : null}
        </div>
      ) : (
        <div ref={aarRef} className="card" style={{ marginTop: 16, padding: "20px 22px", borderLeft: "4px solid var(--ink)" }}>
          <div className="section-label" style={{ marginBottom: 4 }}>After-action review — required to close</div>
          <p style={{ fontSize: 12, color: "var(--mut)", margin: "4px 0 14px", lineHeight: 1.5 }}>
            Two minutes now, honestly answered, is how the next run gets better. The answers close into the permanent record with the run.
          </p>
          <div style={{ display: "grid", gap: 9 }}>
            {aarAnswers.map((a, idx) => (
              <div key={a.q} style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", fontSize: 12.5 }}>
                <span style={{ maxWidth: 520 }}>{a.q}</span>
                <span style={{ display: "flex", gap: 5 }}>
                  {(["yes", "no", "na"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="chip"
                      onClick={() => setAarAnswers((prev) => prev.map((x, i) => (i === idx ? { ...x, a: v } : x)))}
                      style={{
                        cursor: "pointer", fontFamily: "Menlo,monospace", fontSize: 10,
                        background: a.a === v ? "var(--ink)" : undefined, color: a.a === v ? "var(--bg)" : undefined,
                      }}
                    >
                      {v === "na" ? "n/a" : v}
                    </button>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <textarea value={aarWorked} onChange={(e) => setAarWorked(e.target.value)} placeholder="What worked" rows={2} className="draft-body" />
            <textarea value={aarImprove} onChange={(e) => setAarImprove(e.target.value)} placeholder="What to change before next time" rows={2} className="draft-body" />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="btn" type="button" onClick={closeRun}>Close incident &amp; write to Record</button>
            <button className="btn ghost" type="button" onClick={() => setMode("active")}>Back to the run</button>
          </div>
        </div>
      )}
    </>
  );
}
