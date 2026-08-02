import Link from "next/link";

export const metadata = { title: "Watch — The Notification Contract" };

const ROWS: { tier: string; color: string; delivery: string; theater: string }[] = [
  { tier: "ALERT", color: "var(--alert)", delivery: "Push + SMS + email", theater: "Act now. Overrides quiet hours and quiet windows." },
  { tier: "ELEVATED", color: "var(--elevated)", delivery: "Push + email", theater: "Notifies without urgency theater. Held during arrival & dismissal." },
  { tier: "MONITOR", color: "var(--monitor)", delivery: "In-app only", theater: "Never pushes. Held during arrival & dismissal." },
  { tier: "CLEAR", color: "var(--clear)", delivery: "No notification", theater: "All-clear is deliberately boring." },
];

export default function NotificationContract() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 28px 80px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>
          Watch<span style={{ color: "var(--elevated)" }}>.</span>
        </div>
        <h1 className="serif" style={{ fontSize: 34, fontWeight: 400, marginTop: 20 }}>
          The Notification Contract
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink2)", marginTop: 16 }}>
          Watch earns the right to be believed by sending you as little as possible. A company whose
          revenue grows with messages sent cannot credibly market restraint. Watch can. This is the
          promise, printed in the product:
        </p>

        <div className="card" style={{ marginTop: 22, padding: "22px 24px" }}>
          <div className="serif" style={{ fontSize: 18, lineHeight: 1.8 }}>
            A push from Watch means <b>act now</b>.<br />
            <span style={{ color: "var(--elevated)" }}>ELEVATED</span> notifies without urgency theater.<br />
            <span style={{ color: "var(--monitor)" }}>MONITOR</span> never pushes.<br />
            Single-source reports never page anyone.<br />
            During arrival and dismissal, <b>only ALERTs break through</b>.
          </div>
        </div>

        <div style={{ marginTop: 28 }}>
          <div className="micro" style={{ marginBottom: 10 }}>What each tier does</div>
          <div className="card">
            <div className="micro" style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 2.4fr", padding: "10px 16px", borderBottom: "1px solid var(--line)" }}>
              <span>Tier</span>
              <span>Delivery</span>
              <span>What it means</span>
            </div>
            {ROWS.map((r, i) => (
              <div key={r.tier} style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 2.4fr", padding: "12px 16px", borderBottom: i < ROWS.length - 1 ? "1px solid var(--line)" : undefined, alignItems: "center", fontSize: 12.5 }}>
                <span style={{ fontWeight: 700, color: r.color, fontFamily: "Menlo,monospace", fontSize: 11, letterSpacing: 1 }}>{r.tier}</span>
                <span>{r.delivery}</span>
                <span style={{ color: "var(--mut)" }}>{r.theater}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--mut)", marginTop: 22 }}>
          Quiet windows are per-campus and default on. During a window, MONITOR and ELEVATED notices
          are held and delivered when the window ends; the hold is logged to the audit trail. A
          principal running dismissal is a pilot on final approach — the flight deck stays quiet until
          it can&apos;t.
        </p>

        <div style={{ marginTop: 28, display: "flex", gap: 12, fontSize: 12 }}>
          <Link href="/chicago/alerts" className="btn ghost">← Chicago alerts</Link>
          <Link href="/dallas/alerts" className="btn ghost">← Dallas alerts</Link>
        </div>
        <div className="micro" style={{ marginTop: 30 }}>
          Madden Education Advisory, LLC · Decision support, not dispatch
        </div>
      </div>
    </div>
  );
}
