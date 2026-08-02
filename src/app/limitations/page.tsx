import Link from "next/link";
import { LIMITATIONS, COMPANY, SPLASH_DISCLAIMER } from "@/lib/legal";

export const metadata = {
  title: "How to use Watch — and its limits",
};

export default function LimitationsPage() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 28px 90px" }}>
      <Link href="/" className="micro" style={{ textDecoration: "none" }}>
        ← Watch
      </Link>
      <h1 className="serif" style={{ fontSize: 32, marginTop: 20, marginBottom: 8, letterSpacing: "-0.01em" }}>
        How to use Watch — and its limits
      </h1>
      <p style={{ fontSize: 15, color: "var(--mut)", lineHeight: 1.6, maxWidth: "60ch" }}>
        {SPLASH_DISCLAIMER} Please read this before relying on Watch for any safety decision.
      </p>

      <div style={{ marginTop: 34, display: "flex", flexDirection: "column", gap: 22 }}>
        {LIMITATIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="serif" style={{ fontSize: 18, marginBottom: 6 }}>
              {s.heading}
            </h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--ink)" }}>{s.body}</p>
          </section>
        ))}
      </div>

      <div
        style={{
          marginTop: 34,
          padding: "16px 18px",
          border: "1px solid var(--line2)",
          borderRadius: 10,
          background: "var(--elevatedbg)",
          fontSize: 13.5,
          lineHeight: 1.6,
        }}
      >
        <b>In an emergency, call 911.</b> Watch is not an emergency service and cannot summon help.
        Follow the protocols of your school, district, and local authorities.
      </div>

      <p
        className="mono"
        style={{ marginTop: 30, fontSize: 10.5, color: "var(--mut)", letterSpacing: "0.03em", lineHeight: 1.6 }}
      >
        {COMPANY} · By using Watch you acknowledge that you have read and understood these limitations.
      </p>
    </div>
  );
}
