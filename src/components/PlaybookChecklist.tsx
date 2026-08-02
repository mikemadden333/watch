"use client";

import { useState } from "react";
import type { PlaybookStep } from "@/lib/types";

/** Role-filtered checklist. Completing a step stamps actor + time —
 *  in production this writes an ACTION event to the append-only audit
 *  log; here it updates local state and shows the stamp inline. */
export default function PlaybookChecklist({
  steps: initial,
  actorInitials = "MR",
}: {
  steps: PlaybookStep[];
  actorInitials?: string;
}) {
  const [steps, setSteps] = useState<PlaybookStep[]>(initial);

  function complete(id: string) {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id && !s.done
          ? { ...s, done: true, actor: actorInitials, completedAt: nowHM() }
          : s
      )
    );
  }

  return (
    <div className="card" style={{ marginTop: 10 }}>
      {steps.map((s, i) => (
        <div
          key={s.id}
          style={{
            padding: "12px 16px",
            display: "flex",
            gap: 12,
            alignItems: "center",
            borderBottom: i < steps.length - 1 ? "1px solid var(--line)" : undefined,
          }}
        >
          {s.done ? (
            <div
              style={{
                width: 18,
                height: 18,
                background: "var(--ink)",
                borderRadius: 4,
                color: "#fff",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              ✓
            </div>
          ) : (
            <div
              style={{
                width: 18,
                height: 18,
                border: "1.5px solid var(--line2)",
                borderRadius: 4,
                flexShrink: 0,
              }}
            />
          )}
          <div style={{ flex: 1 }}>
            <b>{s.title}</b>
            <div style={{ fontSize: 11, color: "var(--mut)" }}>{s.detail}</div>
          </div>
          {s.done ? (
            <span className="chip">
              {s.actor} · {s.completedAt}
            </span>
          ) : (
            <button
              className="chip"
              onClick={() => complete(s.id)}
              style={{ cursor: "pointer", fontFamily: "Menlo,monospace" }}
            >
              mark complete
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function nowHM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
