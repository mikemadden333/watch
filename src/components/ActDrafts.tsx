"use client";

import { useState } from "react";
import type { Draft } from "@/lib/act/templates";

/* The editable comms drafts. Every draft is a live textarea — the leader
   edits freely before copying. Nothing sends from Watch; "Copy" puts the
   text on the clipboard and logs a copy event to Record. */

function DraftCard({
  draft,
  slug,
  campusCode,
  incidentId,
}: {
  draft: Draft;
  slug: string;
  campusCode: string;
  incidentId: string | null;
}) {
  const [text, setText] = useState(draft.body);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText((draft.subject ? `Subject: ${draft.subject}\n\n` : "") + text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
      fetch("/api/act/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, audience: draft.audience, incidentId, campusCode }),
      }).catch(() => {});
    } catch {
      /* clipboard blocked — leave the text selectable */
    }
  }

  return (
    <div className="draft">
      <div className="draft-head">
        <div>
          <div className="draft-label">{draft.label}</div>
          {draft.note ? <div className="draft-note">{draft.note}</div> : null}
        </div>
        <button className="copybtn" onClick={copy} type="button">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      {draft.subject ? <div className="draft-subject">Subject: {draft.subject}</div> : null}
      <textarea
        className="draft-body"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(20, text.split("\n").length + 2)}
        spellCheck
      />
    </div>
  );
}

export default function ActDrafts({
  drafts,
  slug,
  campusCode,
  incidentId,
}: {
  drafts: Draft[];
  slug: string;
  campusCode: string;
  incidentId: string | null;
}) {
  return (
    <div className="drafts">
      {drafts.map((d) => (
        <DraftCard key={d.audience} draft={d} slug={slug} campusCode={campusCode} incidentId={incidentId} />
      ))}
    </div>
  );
}
