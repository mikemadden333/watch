"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Campus, CampusStatus, Incident } from "@/lib/types";
import { AUDIENCES, generateDraft, lockedFacts, type Audience, type GeneratedDraft } from "@/lib/comms/engine";
import { BUILTIN_REFS, extractTraits, type RefExample } from "@/lib/comms/references";

/* ============================================================
   The composer — one guided flow, three moves, one output:
     1 pick the verified incident    2 pick the audience
     3 Watch drafts, in your network's voice.
   The facts are locked from the record; references condition
   VOICE only, never facts. Once you've drafted once, every
   change — audience, incident, or a voice toggle — redrafts
   live, so the same facts visibly re-voice for a new reader.
   Nothing sends from Watch; copies log to Record.
   ============================================================ */

function hm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const THINK_LINES = [
  "Reading the incident…",
  "Locking the facts…",
  "Matching your voice…",
  "Writing…",
];

export default function CommsComposer({
  slug,
  city,
  networkName,
  campuses,
  incidents,
  statuses,
  defaultCampus,
}: {
  slug: string;
  city: string;
  networkName: string;
  campuses: Campus[];
  incidents: Incident[];
  statuses: CampusStatus[];
  defaultCampus: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>("families");
  const [draft, setDraft] = useState<GeneratedDraft | null>(null);
  const [text, setText] = useState("");
  const [genPhase, setGenPhase] = useState<"idle" | "thinking" | "reveal" | "done">("idle");
  const [thinkMode, setThinkMode] = useState<"full" | "quick">("full");
  const [thinkLine, setThinkLine] = useState(0);
  const [copied, setCopied] = useState(false);
  const hasDrafted = draft !== null || genPhase !== "idle";

  // reference library (voice)
  const [disabledRefs, setDisabledRefs] = useState<string[]>([]);
  const [customRefs, setCustomRefs] = useState<RefExample[]>([]);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [extracting, setExtracting] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.localStorage.getItem(`watch-refs-${slug}`);
      if (raw) {
        const p = JSON.parse(raw) as { disabled?: string[]; custom?: RefExample[] };
        setDisabledRefs(p.disabled ?? []);
        setCustomRefs(p.custom ?? []);
      }
    } catch { /* fresh start */ }
    return () => timers.current.forEach(clearTimeout);
  }, [slug]);

  function saveRefs(disabled: string[], custom: RefExample[]) {
    try {
      window.localStorage.setItem(`watch-refs-${slug}`, JSON.stringify({ disabled, custom }));
    } catch { /* storage blocked */ }
  }

  const allRefs = useMemo(() => [...BUILTIN_REFS, ...customRefs], [customRefs]);

  const rankTier: Record<string, number> = { CONFIRMED: 0, CORROBORATED: 1, REPORTED: 2 };
  const pickable = useMemo(
    () =>
      [...incidents]
        .sort(
          (a, b) =>
            (rankTier[a.tier] ?? 3) - (rankTier[b.tier] ?? 3) ||
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
        )
        .slice(0, 6),
    [incidents] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!incidentId && pickable.length > 0) setIncidentId(pickable[0].id);
  }, [pickable, incidentId]);

  /** Build the drafting context from explicit choices (avoids stale state on live redraft). */
  function buildCtx(incId: string | null, disabled: string[]) {
    const inc = pickable.find((i) => i.id === incId);
    const camp =
      campuses.find((c) => c.code === inc?.nearestCampusCode) ??
      campuses.find((c) => c.code === defaultCampus) ??
      campuses[0];
    if (!camp) return null;
    const st = statuses.find((s) => s.campusCode === camp.code);
    const refs = allRefs.filter((r) => !disabled.includes(r.id));
    return { campus: camp, city, networkName, incident: inc, status: st, refs };
  }

  const incident = pickable.find((i) => i.id === incidentId);
  const liveCtx = buildCtx(incidentId, disabledRefs);
  const facts = liveCtx ? lockedFacts(liveCtx) : [];
  const enabledCount = allRefs.length - allRefs.filter((r) => disabledRefs.includes(r.id)).length;

  function runDraft(aud: Audience, incId: string | null, disabled: string[], quick: boolean) {
    const ctx = buildCtx(incId, disabled);
    if (!ctx) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setThinkMode(quick ? "quick" : "full");
    setThinkLine(0);
    setGenPhase("thinking");
    if (!quick) setDraft(null);
    const reveal = () => {
      const d = generateDraft(aud, ctx);
      setDraft(d);
      setText(d.body);
      setGenPhase("reveal");
      timers.current.push(setTimeout(() => setGenPhase("done"), 220 + d.body.split("\n\n").length * 150));
    };
    if (quick) {
      timers.current.push(setTimeout(reveal, 560));
    } else {
      THINK_LINES.forEach((_, i) => {
        if (i > 0) timers.current.push(setTimeout(() => setThinkLine(i), i * 330));
      });
      timers.current.push(setTimeout(reveal, THINK_LINES.length * 330 + 200));
    }
  }

  function draftNow() {
    runDraft(audience, incidentId, disabledRefs, false);
    setTimeout(() => stageRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
  }

  function pick(id: string) {
    setIncidentId(id);
    if (hasDrafted) runDraft(audience, id, disabledRefs, true);
  }

  function pickAudience(a: Audience) {
    setAudience(a);
    if (hasDrafted) runDraft(a, incidentId, disabledRefs, true);
  }

  function toggleRef(id: string) {
    const next = disabledRefs.includes(id) ? disabledRefs.filter((x) => x !== id) : [...disabledRefs, id];
    setDisabledRefs(next);
    saveRefs(next, customRefs);
    if (hasDrafted) runDraft(audience, incidentId, next, true);
  }

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText((draft.subject ? `Subject: ${draft.subject}\n\n` : "") + text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      fetch("/api/act/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, audience: draft.audience, incidentId: incident?.id ?? null, campusCode: liveCtx?.campus.code }),
      }).catch(() => {});
    } catch { /* clipboard blocked — text stays selectable */ }
  }

  function addRef() {
    if (!newBody.trim()) return;
    setExtracting(true);
    setTimeout(() => {
      const r: RefExample = {
        id: `ref-custom-${Date.now()}`,
        title: newTitle.trim() || "Pasted example",
        date: "Added by you · just now",
        kind: "custom",
        excerpt: `“${newBody.trim().slice(0, 90)}…”`,
        traits: extractTraits(newBody),
        builtin: false,
      };
      const next = [...customRefs, r];
      setCustomRefs(next);
      saveRefs(disabledRefs, next);
      setNewTitle("");
      setNewBody("");
      setAdding(false);
      setExtracting(false);
    }, 700);
  }

  if (!mounted || !liveCtx) {
    return <div className="card" style={{ padding: "22px 20px", fontSize: 12.5, color: "var(--mut)" }}>Loading…</div>;
  }

  const paras = text.split("\n\n");
  const audienceLabel = AUDIENCES.find((a) => a.key === audience)?.label ?? "";

  return (
    <>
      {/* incident */}
      <div className="clabel">Incident</div>
      {pickable.length === 0 ? (
        <div className="banner banner-neutral">No incidents in the current window yet.</div>
      ) : (
        <select className="cselect" data-tour="comms-incident" value={incidentId ?? ""} onChange={(e) => pick(e.target.value)}>
          {pickable.map((i) => (
            <option key={i.id} value={i.id}>
              {i.headline} · {i.tier.toLowerCase()} · {hm(i.occurredAt)}{i.victimNote ? ` · ${i.victimNote}` : ""}
            </option>
          ))}
        </select>
      )}

      {/* audience */}
      <div className="clabel" style={{ marginTop: 22 }}>Who it&apos;s for</div>
      <div className="cauds" data-tour="comms-audience">
        {AUDIENCES.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => pickAudience(a.key)}
            className={`caud ${audience === a.key ? "on" : ""}`}
          >
            <b>{a.label}</b>
          </button>
        ))}
      </div>

      {/* the message — facts locked, then the draft */}
      <div className="cstage" ref={stageRef} data-tour="comms-draft">
        <div className="factstrip">
          <div className="fhead">
            <span className="mono flabel">THE FACTS</span>
            <span className="fnote">Pulled from the record. Watch can&apos;t change these.</span>
          </div>
          <div className="fchips">
            {facts.map((f) => (
              <span key={f.label} className="fx">
                <span className="fk">{f.label}</span>
                <span className="fv">{f.value}</span>
              </span>
            ))}
          </div>
        </div>

        {genPhase === "idle" && !draft ? (
          <div className="cdraw">
            <button className="btn cbig" type="button" onClick={draftNow}>Write the draft</button>
            <span className="mono chint">for {audienceLabel}. Nothing sends from Watch — you copy it out.</span>
          </div>
        ) : (
          <div className="cdraw">
            <button className="btn ghost" type="button" onClick={draftNow} disabled={genPhase === "thinking"}>Rewrite</button>
            <span className="mono chint">Edit it, then copy it out. Nothing sends from Watch.</span>
          </div>
        )}

        {/* thinking */}
        {genPhase === "thinking" ? (
          <div className="card cthink">
            <div className="mono" style={{ fontSize: 11, color: "var(--amber2)", marginBottom: 12 }}>
              {thinkMode === "full" ? THINK_LINES[thinkLine] : "Rewriting for " + audienceLabel + "…"}
            </div>
            {(thinkMode === "full" ? [92, 78, 88, 60, 70] : [88, 64, 76]).map((w, i) => (
              <div key={i} className="shimmer" style={{ width: `${w}%`, height: 11, borderRadius: 5, marginTop: 8 }} />
            ))}
          </div>
        ) : null}

        {/* draft */}
        {draft && genPhase !== "thinking" ? (
          <div className="draft" style={{ marginTop: 14 }}>
            <div className="draft-head">
              <div>
                <div className="draft-label">{AUDIENCES.find((a) => a.key === draft.audience)?.label}</div>
                <div className="draft-note">{draft.note} · drafted from the verified record · edit, then copy into your own system</div>
              </div>
              <button className="copybtn" onClick={copy} type="button">{copied ? "Copied ✓" : "Copy"}</button>
            </div>
            {draft.subject ? <div className="draft-subject">Subject: {draft.subject}</div> : null}
            {genPhase === "reveal" ? (
              <div className="draftreveal">
                {paras.map((p, i) => (
                  <p key={i} className="fadein" style={{ margin: i === 0 ? 0 : "12px 0 0", animationDelay: `${i * 150}ms`, whiteSpace: "pre-wrap" }}>{p}</p>
                ))}
              </div>
            ) : (
              <textarea className="draft-body" value={text} onChange={(e) => setText(e.target.value)} rows={Math.min(24, text.split("\n").length + 2)} spellCheck />
            )}
          </div>
        ) : null}
      </div>

      {/* the voice — demoted reference library, collapsible */}
      <button type="button" className="voicebar" onClick={() => setVoiceOpen((v) => !v)} aria-expanded={voiceOpen}>
        <span className="mono vlab">YOUR VOICE</span>
        <span className="vsum">How Watch matches how your school writes · {enabledCount} of {allRefs.length} on</span>
        <span className="vchev">{voiceOpen ? "▲" : "▼"}</span>
      </button>

      {voiceOpen ? (
        <div className="voicewrap">
          <p className="vintro">
            Add letters your school is proud of. Watch copies how you write, not the facts.
            <b> Turn one off and rewrite to see the draft change.</b>
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {allRefs.map((r) => {
              const on = !disabledRefs.includes(r.id);
              return (
                <div key={r.id} className="card vref" style={{ opacity: on ? 1 : 0.5 }}>
                  <div className="vrefh">
                    <div>
                      <b style={{ fontSize: 12.5 }}>{r.title}</b>
                      <span style={{ fontSize: 11, color: "var(--mut)" }}> · {r.date}</span>
                    </div>
                    <button
                      className={`vtoggle ${on ? "on" : ""}`}
                      type="button"
                      onClick={() => toggleRef(r.id)}
                    >
                      {on ? "conditioning ✓" : "off"}
                    </button>
                  </div>
                  <div className="vexcerpt">{r.excerpt}</div>
                  <div className="vtraits">
                    <span className="mono" style={{ fontSize: 9, letterSpacing: 1, color: "var(--mut)", alignSelf: "center" }}>LEARNED ·</span>
                    {r.traits.map((t) => (
                      <span key={t} className="chip" style={{ fontSize: 10 }}>{t}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {adding ? (
            <div className="card" style={{ marginTop: 10, padding: "14px 16px" }}>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What is this — e.g. 'Our reunification-day letter, March 2025'"
                style={{ width: "100%", padding: "9px 11px", borderRadius: 7, border: "1px solid var(--line2)", background: "var(--panel2)", fontFamily: "var(--sans)", fontSize: 12.5, color: "var(--ink)" }}
              />
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Paste the communication here — Watch extracts the voice, not the facts"
                rows={5}
                className="draft-body"
                style={{ marginTop: 8 }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn" type="button" onClick={addRef} disabled={extracting}>
                  {extracting ? "Reading the example…" : "Add to library"}
                </button>
                <button className="btn ghost" type="button" onClick={() => setAdding(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn ghost" type="button" onClick={() => setAdding(true)} style={{ marginTop: 12, fontSize: 12 }}>
              + Add an example
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}
