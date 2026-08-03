"use client";

import Link from "next/link";
import { useState } from "react";

/* ============================================================
   Alert routing — SMS recipient enrollment with an explicit,
   unchecked-by-default consent gate. This is the opt-in flow the
   A2P 10DLC campaign describes: a number is only added once the
   recipient's consent box (with the exact program language) is
   checked. Watch only texts numbers with recorded consent.
   ============================================================ */

const CONSENT =
  "I agree to receive Watch safety-alert text messages at this number. Message and data rates may apply. Message frequency varies. Reply STOP to cancel, HELP for help.";

const inp: React.CSSProperties = {
  background: "var(--panel2)",
  border: "1px solid var(--line2)",
  borderRadius: 8,
  padding: "9px 11px",
  color: "var(--ink)",
  fontSize: 12.5,
  fontFamily: "var(--sans)",
  flex: 1,
  minWidth: 150,
};

export default function AlertRoutingCard() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [list, setList] = useState<{ name: string; phone: string }[]>([]);

  const valid = /^\+?[0-9][0-9\s\-().]{6,}$/.test(phone.trim());
  const ready = valid && consent;

  function add() {
    if (!ready) return;
    setList((l) => [...l, { name: name.trim() || "Staff recipient", phone: phone.trim() }]);
    setName("");
    setPhone("");
    setConsent(false);
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <b>Alert routing · text messages</b>
        <span className="chip">A2P · consent required</span>
      </div>

      <p style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.6, color: "var(--mut)" }}>
        Watch only texts numbers with recorded consent. Enroll a recipient below — the consent box is
        required and unchecked by default.
      </p>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional)"
          style={inp}
          aria-label="Recipient name"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 312 555 0123"
          inputMode="tel"
          style={{ ...inp, minWidth: 190 }}
          aria-label="Recipient mobile number"
        />
      </div>

      <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 12, cursor: "pointer", fontSize: 12, lineHeight: 1.55 }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 2, accentColor: "var(--amber)" }} />
        <span style={{ color: "var(--ink)" }}>
          {CONSENT}{" "}
          <Link href="/messaging" style={{ textDecoration: "underline" }}>Program details</Link>
          {" · "}
          <Link href="/privacy" style={{ textDecoration: "underline" }}>Privacy</Link>
        </span>
      </label>

      <button
        className="btn"
        onClick={add}
        disabled={!ready}
        style={{ marginTop: 12, opacity: ready ? 1 : 0.5, cursor: ready ? "pointer" : "not-allowed" }}
      >
        Add recipient
      </button>

      {list.length > 0 ? (
        <div style={{ marginTop: 14, borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: "Menlo, monospace" }}>
              <span>{r.name} · {r.phone}</span>
              <span className="ok">✓ consent recorded</span>
            </div>
          ))}
        </div>
      ) : null}

      <p style={{ marginTop: 12, fontSize: 10.5, color: "var(--faint)", lineHeight: 1.6 }}>
        Preview keeps this list in your browser only. In production, recipients sync to the alert
        router and each keeps a consent timestamp in the audit log; replying STOP unsubscribes
        instantly.
      </p>
    </div>
  );
}
