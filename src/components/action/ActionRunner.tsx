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
   At rest: one clear "start" card, pre-linked to the incident you
   came from. Running: the plan walks as a four-phase spine — one
   phase in focus at a time, not a wall of eighteen checkboxes.
   Every completion stamps actor + time; the run closes only through
   an after-action review; closing writes the whole history for good.
   Nothing here dispatches anyone — it runs YOUR plan, and remembers.
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
  const [mode, setMode] = useState<"idle" | "active" | "aar">("idle");
  const [justClosed, setJustClosed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // start-card state
  const [campusCode, setCampusCode] = useState(defaultCampus);
  const [incidentId, setIncidentId] = useState<string | "manual">("manual");
  const [initiatedBy, setInitiatedBy] = useState("");
  const [pickOpen, setPickOpen] = useState(false);

  // active-run state
  const [phaseIdx, setPhaseIdx] = useState(0);
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
      setPhaseIdx(firstIncompletePhase(open));
    }
    setHistory(allRuns(slug).filter((r) => r.status === "closed"));
  }, [slug]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // the incident we'd link by default: the top one nearest this campus
  const linked = useMemo(() => {
    if (incidentId === "manual") return undefined;
    return incidents.find((i) => i.id === incidentId);
  }, [incidents, incidentId]);

  const campusIncidents = useMemo(() => {
    const near = incidents.filter((i) => i.nearestCampusCode === campusCode);
    const rest = incidents.filter((i) => i.nearestCampusCode !== campusCode);
    return [...near, ...rest].slice(0, 6);
  }, [incidents, campusCode]);

  // pre-link the strongest incident near the default campus on mount
  useEffect(() => {
    const near = incidents.find((i) => i.nearestCampusCode === defaultCampus) ?? incidents[0];
    if (near) setIncidentId(near.id);
  }, [incidents, defaultCampus]);

  function firstIncompletePhase(r: ResponseRun): number {
    const idx = PHASES.findIndex((p) => r.steps.some((s) => s.phase === p.key && !s.done));
    return idx < 0 ? PHASES.length - 1 : idx;
  }

  function persist(next: ResponseRun) {
    setRun(next);
    upsertRun(slug, next);
  }

  function begin(asDrill: boolean) {
    const campus = campuses.find((c) => c.code === campusCode) ?? campuses[0];
    const inc = incidentId === "manual" ? undefined : incidents.find((i) => i.id === incidentId);
    const who = initiatedBy.trim() || "Duty leader";
    const r: ResponseRun = {
      id: `run-${Date.now()}`,
      slug,
      campusCode: campus.code,
      campusName: campus.name,
      incidentId: inc?.id ?? null,
      incidentHeadline: inc?.headline ?? (asDrill ? "Drill · no linked incident" : "Manual activation · no linked incident"),
      drill: asDrill,
      posture: null,
      initiatedBy: who,
      startedAt: new Date().toISOString(),
      steps: freshSteps(),
      notes: [],
      status: "active",
    };
    persist(r);
    setMode("active");
    setPhaseIdx(0);
    setJustClosed(false);
    logMilestone(
      slug,
      `response run OPENED · ${campus.code}${asDrill ? " · DRILL" : ""}${inc ? ` · ${inc.headline}` : ""}`,
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

  /* ---------------- idle: the start card ---------------- */
  if (mode === "idle") {
    return (
      <>
        {justClosed ? (
          <div className="banner banner-neutral" style={{ borderLeft: "4px solid var(--clear)" }}>
            Run closed. The stamped history — every step, actor, and time — is preserved below and in Record.
          </div>
        ) : null}

        <div className="startcard" data-tour="action-start">
          <div className="startrow">
            <div className="starttext">
              <div className="section-label" style={{ marginBottom: 6 }}>Emergency response</div>
              <b style={{ fontSize: 16 }}>Nothing is active right now.</b>
              <div style={{ fontSize: 12.5, color: "var(--mut)", marginTop: 6, lineHeight: 1.55, maxWidth: 560 }}>
                Start one when something happens near a campus. You start it; <b style={{ color: "var(--ink2)" }}>Watch never does</b>.
              </div>
            </div>
            <div className="startdot"><span className="pill p-clear"><span className="d" />ALL CLEAR</span></div>
          </div>

          {/* what you'd respond to — pre-linked, changeable */}
          <div className="startlink">
            <div className="mono sl-lab">RESPOND TO</div>
            {linked ? (
              <div className="sl-inc">
                <b>{linked.headline}</b>
                <span className="sl-meta">
                  {linked.tier} · {linked.nearestCampusCode ?? "—"}
                  {typeof linked.distanceMi === "number" ? ` · ${linked.distanceMi.toFixed(2)} mi ${linked.bearing ?? ""}` : ""} · occurred {hm(linked.occurredAt)}
                </span>
              </div>
            ) : (
              <div className="sl-inc"><b>Manual activation</b><span className="sl-meta">something Watch hasn&apos;t seen yet</span></div>
            )}
            <button type="button" className="sl-change" onClick={() => setPickOpen((v) => !v)}>
              {pickOpen ? "close" : "change ▾"}
            </button>
          </div>

          {pickOpen ? (
            <div className="startpick">
              <label className="sp-field">
                <div className="sp-lab">Campus</div>
                <select value={campusCode} onChange={(e) => setCampusCode(e.target.value)} className="sp-select">
                  {campuses.map((c) => (
                    <option key={c.code} value={c.code}>{c.name} · {c.code}</option>
                  ))}
                </select>
              </label>
              <div className="sp-field">
                <div className="sp-lab">Linked incident</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {campusIncidents.map((i) => (
                    <label key={i.id} className={`crow ${incidentId === i.id ? "on" : ""}`} style={{ padding: "8px 11px" }}>
                      <input type="radio" name="inc" checked={incidentId === i.id} onChange={() => setIncidentId(i.id)} style={{ marginTop: 2 }} />
                      <span style={{ lineHeight: 1.4, fontSize: 12 }}>
                        <b>{i.headline}</b>
                        <span style={{ color: "var(--mut)" }}> · {i.tier} · occurred {hm(i.occurredAt)}</span>
                      </span>
                    </label>
                  ))}
                  <label className={`crow ${incidentId === "manual" ? "on" : ""}`} style={{ padding: "8px 11px" }}>
                    <input type="radio" name="inc" checked={incidentId === "manual"} onChange={() => setIncidentId("manual")} />
                    <span style={{ fontSize: 12 }}><b>No linked incident</b><span style={{ color: "var(--mut)" }}> · manual activation</span></span>
                  </label>
                </div>
              </div>
            </div>
          ) : null}

          <div className="startgo">
            <input
              value={initiatedBy}
              onChange={(e) => setInitiatedBy(e.target.value)}
              placeholder="Your name — stamps every step"
              className="startname"
            />
            <button type="button" className="startbtn" data-tour="action-begin" onClick={() => begin(false)}>Begin response</button>
            <button type="button" className="btn ghost" onClick={() => begin(true)} style={{ fontSize: 12.5 }}>Run as a drill</button>
          </div>
          <div className="startfoot mono">
            Every step is timestamped and kept. Call 911 first if anyone&apos;s in danger — Watch doesn&apos;t dispatch.
          </div>
        </div>

        <RunHistory runs={history} />
      </>
    );
  }

  /* ---------------- active / aar ---------------- */
  if (!run) return null;
  const doneCount = run.steps.filter((s) => s.done).length;
  const phase = PHASES[phaseIdx];
  const phaseSteps = run.steps.filter((s) => s.phase === phase.key);
  const phaseDone = phaseSteps.filter((s) => s.done).length;
  const isLastPhase = phaseIdx === PHASES.length - 1;

  return (
    <>
      {/* run header */}
      <div className="runhead" data-tour="action-run" style={{ borderLeft: `4px solid ${run.drill ? "var(--monitor)" : "var(--alert)"}` }}>
        <div style={{ minWidth: 260 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className={`pill ${run.drill ? "p-monitor" : "p-alert"}`}><span className="d" />{run.drill ? "DRILL RUN OPEN" : "RESPONSE RUN OPEN"}</span>
            <b style={{ fontSize: 14.5 }}>{run.campusName}</b>
            {run.posture ? <span className="chip mono" style={{ fontSize: 10 }}>posture {run.posture}</span> : null}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 6, lineHeight: 1.5 }}>
            {run.incidentHeadline} · opened {hm(run.startedAt)} by {run.initiatedBy} · running {elapsedText(run.startedAt, now)}
          </div>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--mut)", textAlign: "right" }}>
          {doneCount}/{run.steps.length} steps<br />stamped as completed
        </div>
      </div>

      {/* phase spine */}
      <div className="spine">
        {PHASES.map((p, idx) => {
          const st = run.steps.filter((s) => s.phase === p.key);
          const d = st.filter((s) => s.done).length;
          const complete = d === st.length;
          return (
            <button
              key={p.key}
              type="button"
              className={`sp-node ${idx === phaseIdx ? "on" : ""} ${complete ? "done" : ""}`}
              onClick={() => setPhaseIdx(idx)}
            >
              <span className="sp-i">{complete ? "✓" : idx + 1}</span>
              <span className="sp-nm">{p.label}</span>
              <span className="sp-ct mono">{d}/{st.length}</span>
            </button>
          );
        })}
      </div>

      {/* current phase */}
      <div className="phasecard">
        <div className="ph-head">
          <div>
            <b style={{ fontSize: 14 }}>{phase.label}</b>
            <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 3, lineHeight: 1.5 }}>{phase.lead}</div>
          </div>
          <span className="mono" style={{ fontSize: 10.5, color: phaseDone === phaseSteps.length ? "var(--clear)" : "var(--mut)" }}>
            {phaseDone}/{phaseSteps.length} done
          </span>
        </div>

        {/* posture selector lives in Assess — setting it IS step a3 */}
        {phase.key === "assess" ? (
          <div className="posturebox" data-tour="action-posture">
            <div className="mono" style={{ fontSize: 10, letterSpacing: 1.2, color: "var(--amber2)", marginBottom: 9 }}>BUILDING POSTURE — SAY IT TWICE</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {POSTURES.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPosture(p.key)}
                  className={`postchip ${run.posture === p.key ? "on" : ""}`}
                  title={p.when}
                >
                  {p.key}
                </button>
              ))}
            </div>
            {run.posture ? (
              <div className="pa-line">
                <span className="mono" style={{ fontSize: 11, color: "var(--mut)" }}>PA · </span>
                &ldquo;{POSTURES.find((p) => p.key === run.posture)?.pa}&rdquo;
                <span style={{ color: "var(--mut)" }}> — set {hm(run.postureAt)}</span>
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--mut)" }}>
                Choose a posture — the exact public-address language appears here.
              </div>
            )}
          </div>
        ) : null}

        {/* phase steps */}
        <div className="ph-steps">
          {phaseSteps.map((s) => (
            <div key={s.id} className={`ph-step ${s.done ? "done" : ""}`}>
              <button
                type="button"
                className={`stepbox ${s.done ? "on" : ""}`}
                onClick={() => completeStep(s.id)}
                aria-label={s.done ? "completed" : "mark complete"}
              >
                {s.done ? "✓" : ""}
              </button>
              <div style={{ flex: 1 }}>
                <div>
                  <b style={{ fontSize: 13 }}>{s.title}</b>
                  <span className="chip" style={{ marginLeft: 8, fontSize: 9.5, padding: "2px 7px", verticalAlign: "1px" }}>{s.role}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 3, lineHeight: 1.5 }}>{s.detail}</div>
              </div>
              {s.done ? (
                <span className="chip mono" style={{ fontSize: 10.5, flexShrink: 0 }}>{s.actor} · {hm(s.at)}</span>
              ) : (
                <button className="markbtn" onClick={() => completeStep(s.id)} type="button">mark complete</button>
              )}
            </div>
          ))}
        </div>

        {!isLastPhase ? (
          <div className="ph-adv">
            <button type="button" className="btn" onClick={() => setPhaseIdx((i) => Math.min(PHASES.length - 1, i + 1))}>
              Advance to {PHASES[phaseIdx + 1].label} →
            </button>
            <span className="mono" style={{ fontSize: 10.5, color: "var(--mut)" }}>jump between phases anytime</span>
          </div>
        ) : null}
      </div>

      {/* run log */}
      <details className="logbox">
        <summary><span className="mono">RUN LOG</span> — document as you go{run.notes.length ? ` · ${run.notes.length} note${run.notes.length === 1 ? "" : "s"}` : ""}</summary>
        <div style={{ padding: "4px 2px 2px" }}>
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
              className="startname"
              style={{ flex: 1 }}
            />
            <button className="btn ghost" type="button" onClick={addNote} style={{ fontSize: 12 }}>Log it</button>
          </div>
        </div>
      </details>

      {/* close / AAR */}
      {mode === "active" ? (
        <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className={`btn${doneCount === run.steps.length ? "" : " ghost"}`} type="button" onClick={openAar}>
            Close the run — after-action review
          </button>
          {doneCount < run.steps.length ? (
            <span style={{ fontSize: 11.5, color: "var(--mut)" }}>
              {run.steps.length - doneCount} steps incomplete — you can still close; they&apos;ll be recorded as not completed.
            </span>
          ) : null}
        </div>
      ) : (
        <div ref={aarRef} className="card" style={{ marginTop: 16, padding: "20px 22px", borderLeft: "4px solid var(--amber)" }}>
          <div className="section-label" style={{ marginBottom: 4 }}>After-action review — required to close</div>
          <p style={{ fontSize: 12, color: "var(--mut)", margin: "4px 0 14px", lineHeight: 1.5 }}>
            Answer honestly. It&apos;s kept with the record.
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
                      className={`postchip ${a.a === v ? "on" : ""}`}
                      style={{ fontSize: 10, padding: "5px 10px" }}
                      onClick={() => setAarAnswers((prev) => prev.map((x, i) => (i === idx ? { ...x, a: v } : x)))}
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
