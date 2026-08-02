import Link from "next/link";

export default function DallasStub() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 16,
        padding: 24,
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1 }}>
        Watch<span style={{ color: "var(--elevated)" }}>.</span>
      </div>
      <div className="serif" style={{ fontSize: 26 }}>Solis Academies</div>
      <div className="micro">Live pack · Dallas PD active calls · 2-min dispatch</div>
      <p style={{ maxWidth: 460, fontSize: 13, lineHeight: 1.6, color: "#4A463D" }}>
        The Dallas adapter pack (DPD Active Calls, archived every snapshot since
        the feed keeps no history) comes online in the next milestone, ahead of
        the Aug 17 meeting. The Chicago pilot is the seeded demo spine today.
      </p>
      <Link href="/chicago/briefing" className="btn">
        Open Chicago pilot →
      </Link>
      <Link href="/" className="micro" style={{ marginTop: 4 }}>
        ← Back to city select
      </Link>
    </div>
  );
}
