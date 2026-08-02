import type { VerificationStep } from "@/lib/types";

/* Compact vertical provenance timeline — the primary provenance display
   on incident cards. occurred → first report → corroboration →
   authoritative confirmation → verified → status change → who notified. */

const DOT: Record<VerificationStep["kind"], string> = {
  occurred: "var(--faint)",
  reported: "var(--elevated)",
  corroborated: "var(--monitor)",
  confirmed: "var(--clear)",
  verified: "var(--ink)",
  status: "var(--elevated)",
  notified: "var(--faint)",
};

export default function VerificationJourney({ steps }: { steps: VerificationStep[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <div key={i} style={{ display: "flex", gap: 12, position: "relative" }}>
            {/* rail */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 12 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: DOT[s.kind],
                  border: s.kind === "confirmed" || s.kind === "verified" ? "2px solid #fff" : "none",
                  boxShadow: s.kind === "confirmed" ? "0 0 0 1.5px var(--clear)" : "none",
                  marginTop: 3,
                  flexShrink: 0,
                }}
              />
              {!last && <span style={{ flex: 1, width: 2, background: "var(--line)", minHeight: 18 }} />}
            </div>
            {/* content */}
            <div style={{ paddingBottom: last ? 0 : 12, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span className="micro" style={{ color: "var(--mut)" }}>{s.label}</span>
                <span className="mono num" style={{ fontSize: 10, color: "var(--faint)" }}>{s.time}</span>
                {s.tier && (
                  <span className={`chip ${s.tier === "CONFIRMED" ? "c-conf" : s.tier === "CORROBORATED" ? "c-corr" : "c-rep"}`} style={{ fontSize: 8 }}>
                    <span className="d" />
                    {s.tier}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, marginTop: 1 }}>{s.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
