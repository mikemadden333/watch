"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FIRST_RUN } from "@/lib/legal";

/* Logged acknowledgment, shown once per SESSION (i.e. every login), on first
   entry into a network (never on the splash). Framed as "how to use Watch,"
   not a legal wall — calm, on-brand, honest. Accepting records the
   acknowledgment in sessionStorage and, best-effort, server-side (an audit
   row), so there is a record the user was informed each time they enter. The
   primary liability shield is still the customer contract; this supports it. */

const KEY = "watch.ack.v1";

function bold(text: string) {
  return text.split("**").map((seg, i) =>
    i % 2 === 1 ? <b key={i}>{seg}</b> : <span key={i}>{seg}</span>
  );
}

export default function FirstRunNotice() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();

  // Re-check on every navigation — the root layout mounts this once at the
  // splash ("/"), where it's suppressed; entering a network is a client-side
  // navigation, so we must react to the pathname change to show it there.
  useEffect(() => {
    if (pathname === "/" || pathname === "/limitations") return; // not on splash / the page itself
    try {
      if (!sessionStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, [pathname]);

  if (!show) return null;

  function accept() {
    try {
      sessionStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* private mode — still proceed */
    }
    // best-effort server record; never blocks the user
    try {
      fetch("/api/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: window.location.pathname }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="frn-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(5,8,16,0.62)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 440,
          width: "100%",
          background: "var(--panel)",
          border: "1px solid var(--line2)",
          borderRadius: 16,
          padding: "26px 26px 22px",
          boxShadow: "0 20px 60px rgba(27,26,23,0.28)",
        }}
      >
        <div className="micro" style={{ letterSpacing: "0.16em" }}>◆ WATCH</div>
        <h2 id="frn-title" className="serif" style={{ fontSize: 23, margin: "10px 0 16px", letterSpacing: "-0.01em" }}>
          {FIRST_RUN.title}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          {FIRST_RUN.points.map((p, i) => (
            <p key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink)", margin: 0 }}>
              {bold(p)}
            </p>
          ))}
        </div>
        <button
          onClick={accept}
          className="btn"
          style={{ marginTop: 22, width: "100%", justifyContent: "center", padding: "12px", fontSize: 14 }}
        >
          {FIRST_RUN.accept}
        </button>
        <a
          href="/limitations"
          className="micro"
          style={{ display: "block", textAlign: "center", marginTop: 12, textDecoration: "underline" }}
        >
          Read the full limitations
        </a>
      </div>
    </div>
  );
}
