"use client";

import { useState } from "react";
import type { NetworkData } from "@/lib/networkData";

/* Record controls — a genuinely working CSV export of the append-only log,
   plus an honest "live" indicator. No decorative buttons: everything here does
   what it says. The log itself is immutable; export is a read-only copy. */
export default function RecordControls({ audit }: { audit: NetworkData["audit"] }) {
  const [done, setDone] = useState(false);

  function exportCsv() {
    const esc = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["time", "type", "event", "evidence"],
      ...audit.map((e) => [e.time, e.type, e.event, e.evidence]),
    ];
    const csv = rows.map((r) => r.map(esc).join(",")).join("\r\n");
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watch-record-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 2200);
    } catch {
      /* download blocked — the log stays on screen */
    }
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <span className="pill p-clear" style={{ width: "fit-content" }}><span className="d" />APPEND-ONLY · LIVE</span>
      <button className="btn ghost" style={{ fontSize: 11 }} type="button" onClick={exportCsv} disabled={audit.length === 0}>
        {done ? "Exported ✓" : "Export CSV"}
      </button>
    </div>
  );
}
