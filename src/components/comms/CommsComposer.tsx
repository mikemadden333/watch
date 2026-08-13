"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Campus, CampusStatus, Incident } from "@/lib/types";
import { AUDIENCES, generateDraft, lockedFacts, type Audience, type GeneratedDraft } from "@/lib/comms/engine";
import { BUILTIN_REFS, extractTraits, type RefExample } from "@/lib/comms/references";

/* ============================================================
   The composer — one flow, three choices, no floating drafts:
   1 pick the incident (the thread starts at the verified record)
   2 pick the audience  3 Watch drafts, in your network's voice.
   Facts are locked; references condition voice only; everything
   is editable; nothing sends from Watch; copies log to Record.
   ============================================================ */

function hm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const THINK_LINES = [
  "Reading the verified record…",
  "Locking the facts — what, when, where, who confirmed…",
  "Conditioning on your reference examples…",
  "Drafting…",
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
  const [thinkLine, setThinkLine] = useState(0);
  const [copied, setCopied] = useState(false);

  // reference library
  const [disabledRefs, setDisabledRefs] = useState<string[]>([]);
  const [customRefs, setCustomRefs] = useState<RefExample[]>([]);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [extracting, setExtracting] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

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
  const enabledRefs = useMemo(() => allRefs.filter((r) => !disabledRefs.includes(r.id)), [allRefs, disabledRefs]);

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

  const incident = pickable.find((i) => i.id === incidentId);
  const campus =
    campuses.find((c) => c.code === incident?.nearestCampusCode) ??
    campuses.find((c) => c.code === defaultCampus) ??
    campuses[0];
  const status = statuses.find((s) => s.campusCode === campus?.code);

  const ctx = campus
    ? { campus, city, networkName, incident, status, refs: enabledRefs }
    : null;
  const facts = ctx ? lockedFacts(ctx) : [];

  function generate() {
    if (!ctx) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setGenPhase("thinking");
    setThinkLine(0);
    setDraft(null);
    THINK_LINES.forEach((_, i) => {
      if (i > 0) timers.current.push(setTimeout(() => setThinkLine(i), i * 340));
    });
    timers.current.push(
      setTimeout(() => {
        const d = generateDraft(audience, ctx);
        setDraft(d);
        setText(d.body);
        setGenPhase("reveal");
        timers.current.push(setTimeout(() => setGenPhase("done"), 250 + d.body.split("\n\n").length * 160));
      }, THINK_LINES.length * 340 + 220)
    );
  }

  function pick(id: string) {
    setIncidentId(id);
    setDraft(null);
    setGenPhase("idle");
  }

  function pickAudience(a: Audience) {
    setAudience(a);
    setDraft(null);
    setGenPhase("idle");
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
        body: JSON.stringify({ slug, audience: draft.audience, incidentId: incident?.id ?? null, campusCode: campus?.code }),
      }).catch(() => {});
    } catch { /* clipboard blocked — text stays selectable */ }
  }

  function toggleRef(id: string) {
    const next = disabledRefs.includes(id) ? disabledRefs.filter((x) => x !== id) : [...disabledRefs, id];
    setDisabledRefs(next);
    saveRefs(next, customRefs);
    if (draft) setGenPhase("idle"); // voice changed — invite a redraft
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

  if (!mounted || !campus) {
    return <div className="card" style={{ padding: "22px 20px", fontSize: 12.5, color: "var(--mut)" }}>Loading…</div>;
  }

  const paras = text.split("\n\n");

  return (
    <>
      {/* 1 · incident */}
      <div className="section-label" style={{ marginBottom: 8 }}>1 · The incident — every message starts at the verified record</div>
      <div style={{ display: "grid", gap: 7 }}>
        {pickable.map((i) => (
          <label
            key={i.id}
            style={{
              display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 13px", borderRadius: 9,
              border: `1px solid ${incidentId === i.id ? "var(--ink)" : "var(--line)"}`,
              background: "var(--panel)", cursor: "pointer", fontSize: 12.5, lineHeight: 1.45,
            }}
          >
            <input type="radio" name="cinc" checked={incidentId === i.id} onChange={() => pick(i.id)} style={{ marginTop: 2 }} />
            <span style={{ flex: 1 }}>
              <b>{i.headline}</b>
              <span style={{ color: "var(--mut)" }}>
                {" "}· {i.nearestCampusCode ?? "network"} · occurred {hm(i.occurredAt)}
                {i.victimNote ? ` · ${i.victimNote}` : ""}
              </span>
            </span>
            <span className="chip mono" style={{ fontSize: 9.5, flexShrink: 0 }}>{i.tier}</span>
          </label>
        ))}
        {pickable.length === 0 ? (
          <div className="banner banner-neutral">No incidents in the current window — the composer threads from live incidents as they qualify.</div>
        ) : null}
      </div>

      {/* 2 · audience */}
      <div className="section-label" style={{ margin: "26px 0 8px" }}>2 · The audience — same facts, different duty of care</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        {AUDIENCES.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => pickAudience(a.key)}
            style={{
              textAlign: "left", padding: "12px 14px", borderRadius: 9, cursor: "pointer", fontFamily: "var(--sans)",
              border: `1px solid ${audience === a.key ? "var(--ink)" : "var(--line)"}`,
              background: audience === a.key ? "var(--ink)" : "var(--panel)",
              color: audience === a.key ? "var(--bg)" : "var(--ink)",
            }}
          >
            <b style={{ fontSize: 13 }}>{a.label}</b>
            <div style={{ fontSize: 10.5, marginTop: 3, opacity: 0.75, lineHeight: 1.4 }}>{a.desc}</div>
          </button>
        ))}
      </div>

      {/* locked facts */}
      <div className="card" style={{ marginTop: 18, padding: "13px 16px", background: "var(--panel2)" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 9.5, letterSpacing: 1.2, color: "var(--mut)" }}>FACTS · LOCKED</span>
          {facts.map((f) => (
            <span key={f.label} className="chip" style={{ fontSize: 10.5 }}>
              <span style={{ color: "var(--mut)" }}>{f.label} · </span>{f.value}
            </span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 8, lineHeight: 1.5 }}>
          Facts come only from the verified record. Watch drafts <i>around</i> them — it cannot change them. Your
          reference examples shape the voice, never the facts.
        </div>
      </div>

      {/* generate */}
      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn" type="button" onClick={generate} disabled={genPhase === "thinking"}>
          {genPhase === "done" || draft ? "Redraft" : "Draft this message"}
        </button>
        <span style={{ fontSize: 11.5, color: "var(--mut)" }}>
          for <b>{AUDIENCES.find((a) => a.key === audience)?.label}</b> · conditioned on {enabledRefs.length} example{enabledRefs.length === 1 ? "" : "s"} in your voice · nothing sends from Watch
        </span>
      </div>

      {/* thinking */}
      {genPhase === "thinking" ? (
        <div className="card" style={{ marginTop: 14, padding: "18px 20px" }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--mut)", marginBottom: 12 }}>{THINK_LINES[thinkLine]}</div>
          {[92, 78, 88, 60].map((w, i) => (
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
              <div className="draft-note">{draft.note} · drafted from the verified record · edit freely, then copy into your own system</div>
            </div>
            <button className="copybtn" onClick={copy} type="button">{copied ? "Copied ✓" : "Copy"}</button>
          </div>
          {draft.subject ? <div className="draft-subject">Subject: {draft.subject}</div> : null}
          {genPhase === "reveal" ? (
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink2)", padding: "12px 13px", border: "1px solid var(--line2)", borderRadius: 8, background: "var(--panel2)" }}>
              {paras.map((p, i) => (
                <p key={i} className="fadein" style={{ margin: i === 0 ? 0 : "12px 0 0", animationDelay: `${i * 160}ms`, whiteSpace: "pre-wrap" }}>{p}</p>
              ))}
            </div>
          ) : (
            <textarea className="draft-body" value={text} onChange={(e) => setText(e.target.value)} rows={Math.min(24, text.split("\n").length + 2)} spellCheck />
          )}
        </div>
      ) : null}

      {/* reference library */}
      <div className="section-label" style={{ margin: "40px 0 6px" }}>Reference library — Watch drafts in your network&apos;s voice</div>
      <p style={{ fontSize: 12, color: "var(--mut)", margin: "0 0 12px", lineHeight: 1.55, maxWidth: 680 }}>
        Load examples of communications your network is proud of. Watch reads how you speak — openers, structure,
        sign-offs — and drafts within that voice. Toggle any example off to see the draft change. References
        never supply facts.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {allRefs.map((r) => {
          const on = !disabledRefs.includes(r.id);
          return (
            <div key={r.id} className="card" style={{ padding: "12px 15px", opacity: on ? 1 : 0.55 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap" }}>
                <div>
                  <b style={{ fontSize: 12.5 }}>{r.title}</b>
                  <span style={{ fontSize: 11, color: "var(--mut)" }}> · {r.date}</span>
                </div>
                <button
                  className="chip"
                  type="button"
                  onClick={() => toggleRef(r.id)}
                  style={{ cursor: "pointer", fontFamily: "Menlo,monospace", fontSize: 10, background: on ? "var(--ink)" : undefined, color: on ? "var(--bg)" : undefined }}
                >
                  {on ? "conditioning ✓" : "off"}
                </button>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--mut)", marginTop: 5, fontStyle: "italic", lineHeight: 1.5 }}>{r.excerpt}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
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
            style={{ width: "100%", padding: "9px 11px", borderRadius: 7, border: "1px solid var(--line2)", background: "var(--panel2)", fontFamily: "var(--sans)", fontSize: 12.5 }}
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
    </>
  );
}
