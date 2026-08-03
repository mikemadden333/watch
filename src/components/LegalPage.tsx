import Link from "next/link";
import type { ReactNode } from "react";
import type { LegalDoc } from "@/lib/legalDocs";
import { LEGAL_EFFECTIVE } from "@/lib/legalDocs";
import { COMPANY } from "@/lib/legal";

/* Shared chrome for the legal / compliance pages (Privacy, Terms,
   Messaging). Dark Nightwatch prose, one column, quiet cross-links. */
export default function LegalPage({ doc, footer }: { doc: LegalDoc; footer?: ReactNode }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "56px 28px 90px" }}>
      <Link href="/" className="micro" style={{ textDecoration: "none" }}>
        ← Watch
      </Link>
      <h1 className="serif" style={{ fontSize: 32, marginTop: 20, marginBottom: 6, letterSpacing: "-0.01em" }}>
        {doc.title}
      </h1>
      <div className="mono" style={{ fontSize: 10.5, color: "var(--mut)", letterSpacing: "0.04em" }}>
        {COMPANY} · Effective {LEGAL_EFFECTIVE}
      </div>
      <p style={{ fontSize: 15, color: "var(--ink2)", lineHeight: 1.65, maxWidth: "62ch", marginTop: 18 }}>
        {doc.intro}
      </p>

      <div style={{ marginTop: 30, display: "flex", flexDirection: "column", gap: 22 }}>
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="serif" style={{ fontSize: 18, marginBottom: 7 }}>
              {s.heading}
            </h2>
            {s.body ? (
              <p style={{ fontSize: 14.5, lineHeight: 1.68, color: "var(--ink)" }}>{s.body}</p>
            ) : null}
            {s.bullets ? (
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 7 }}>
                {s.bullets.map((b, i) => (
                  <li key={i} style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--ink)" }}>
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      {footer ? <div style={{ marginTop: 30 }}>{footer}</div> : null}

      <div
        style={{
          marginTop: 30,
          paddingTop: 18,
          borderTop: "1px solid var(--line)",
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          fontSize: 12,
          color: "var(--mut)",
        }}
      >
        <Link href="/privacy" style={{ textDecoration: "underline" }}>Privacy</Link>
        <Link href="/terms" style={{ textDecoration: "underline" }}>Terms</Link>
        <Link href="/messaging" style={{ textDecoration: "underline" }}>Text alerts</Link>
        <Link href="/limitations" style={{ textDecoration: "underline" }}>Limitations</Link>
      </div>
    </div>
  );
}
