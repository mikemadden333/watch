"use client";

/* ============================================================
   Watch — Nightwatch splash (the "curtain up" before the cream app).
   Abstract field of attention: concentric geometry, one line of light
   sweeping, a single living signal, a luminous horizon over a faint
   pediment (education, abstracted). Proprietary mark + a private wink
   along the bottom. Dark on purpose; the product itself stays calm cream.
   ============================================================ */

export default function NightSplash({ gone, onEnter }: { gone: boolean; onEnter: () => void }) {
  return (
    <div className={`ns${gone ? " ns-gone" : ""}`} onClick={onEnter}>
      <div className="ns-grain" aria-hidden="true" />
      <span className="ns-contact" style={{ left: "19%", top: "24%" }} />
      <span className="ns-contact" style={{ left: "78%", top: "18%" }} />
      <span className="ns-contact" style={{ left: "86%", top: "52%" }} />
      <span className="ns-contact" style={{ left: "12%", top: "60%" }} />
      <span className="ns-contact" style={{ left: "64%", top: "30%" }} />

      <div className="ns-horizon" />
      {/* buried pediment — education's oldest sign, a faint ghost at the horizon */}
      <svg className="ns-school" viewBox="0 0 200 90" aria-hidden="true" fill="none" stroke="#eef0f6" strokeLinejoin="round">
        <path d="M22 40 L100 12 L178 40" strokeWidth="1.4" opacity="0.10" />
        <path d="M40 40 L40 78 M64 40 L64 78 M88 40 L88 78 M112 40 L112 78 M136 40 L136 78 M160 40 L160 78" strokeWidth="1.2" opacity="0.075" />
        <path d="M26 40 L174 40 M20 78 L180 78" strokeWidth="1.3" opacity="0.10" />
        <circle cx="100" cy="25" r="1.6" fill="#e8a13a" stroke="none" opacity="0.5" />
      </svg>

      <div className="ns-field">
        <div className="ns-sweep"><div className="ns-sector" /><div className="ns-radius" /></div>
        <div className="ns-ring r1" /><div className="ns-ring r2" /><div className="ns-ring r3" />
        <div className="ns-ring r4" /><div className="ns-ring r5" /><div className="ns-ring r6" />
        <div className="ns-orbit"><span className="ns-dot" /></div>
      </div>

      <div className="ns-center">
        <span className="ns-lockup">
          <svg className="ns-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="14.5" stroke="#f6f5f1" strokeOpacity="0.45" />
            <circle cx="16" cy="16" r="8.5" stroke="#f6f5f1" strokeOpacity="0.7" />
            <circle cx="16" cy="16" r="2.6" fill="#e8a13a" />
          </svg>
          <span className="ns-word">Watch</span>
        </span>
        <div className="ns-tag">Safety intelligence for school leaders</div>
        <div className="ns-enter">
          <span className="ns-st"><i />All clear</span>
          <button className="ns-go" onClick={(e) => { e.stopPropagation(); onEnter(); }}>Enter network →</button>
        </div>
      </div>

      <div className="ns-legal">
        A product of Madden Education Advisory, LLC · Proprietary &amp; Confidential · All rights reserved · © 2026
        <span className="ns-fam" aria-hidden="true">
          <svg className="ns-fm ns-bfly" viewBox="0 0 24 24" fill="currentColor">
            <g className="wl"><ellipse cx="8" cy="9.6" rx="4.2" ry="3.4" /><ellipse cx="8.7" cy="15" rx="3.1" ry="2.5" /></g>
            <g className="wr"><ellipse cx="16" cy="9.6" rx="4.2" ry="3.4" /><ellipse cx="15.3" cy="15" rx="3.1" ry="2.5" /></g>
            <rect x="11.4" y="7.4" width="1.2" height="9.4" rx=".6" />
            <path d="M12 7.6 L10 4.6 M12 7.6 L14 4.6" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
          </svg>
          <svg className="ns-fm ns-bun" viewBox="0 0 24 24" fill="currentColor">
            <ellipse cx="12" cy="16.5" rx="5.6" ry="5" /><circle cx="12" cy="11.4" r="3.3" />
            <ellipse cx="10.1" cy="5.6" rx="1.4" ry="4" /><ellipse cx="13.9" cy="5.6" rx="1.4" ry="4" /><circle cx="17.6" cy="18" r="1.5" />
          </svg>
          <svg className="ns-fm ns-poo" viewBox="0 0 24 24" fill="currentColor">
            <g className="tail"><circle cx="4.6" cy="12" r="2.2" /></g>
            <ellipse cx="11" cy="14" rx="5.6" ry="3.2" /><circle cx="16.8" cy="10.6" r="2.5" /><circle cx="18.4" cy="8.8" r="1.7" />
            <rect x="7.4" y="16" width="1.4" height="4" rx=".7" /><rect x="12.8" y="16" width="1.4" height="4" rx=".7" />
          </svg>
        </span>
      </div>

      <style jsx>{`
        .ns {
          position: fixed; inset: 0; z-index: 100; overflow: hidden; cursor: pointer;
          isolation: isolate;
          background:
            radial-gradient(80% 60% at 50% 108%, rgba(232, 161, 58, 0.3) 0%, transparent 58%),
            radial-gradient(120% 120% at 50% 30%, #1a2242 0%, #0e1428 46%, #0a0e1c 100%);
          transition: opacity 0.6s ease, visibility 0.6s;
        }
        .ns-gone { opacity: 0; visibility: hidden; pointer-events: none; }
        .ns-grain {
          position: absolute; inset: 0; z-index: 6; pointer-events: none; opacity: 0.05; mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        .ns-contact { position: absolute; width: 2px; height: 2px; border-radius: 50%; background: #eef0f6; opacity: 0.16; z-index: 2; }
        .ns-field { position: absolute; left: 50%; top: 47%; transform: translate(-50%, -50%); z-index: 3; width: min(88%, 760px); aspect-ratio: 1 / 1; }
        .ns-ring { position: absolute; inset: 0; border-radius: 50%; border: 1px solid #6f7aa6; }
        .r1 { opacity: 0.16; } .r2 { inset: 12%; opacity: 0.14; } .r3 { inset: 24%; opacity: 0.12; }
        .r4 { inset: 36%; opacity: 0.1; } .r5 { inset: 48%; opacity: 0.09; } .r6 { inset: 60%; opacity: 0.08; }
        .ns-sweep { position: absolute; inset: 0; z-index: 3; }
        .ns-sector {
          position: absolute; inset: 0; border-radius: 50%;
          background: conic-gradient(from 0deg, rgba(232, 161, 58, 0.9) 0deg, transparent 22deg);
          opacity: 0.1; filter: blur(5px);
          -webkit-mask: radial-gradient(circle, transparent 5%, #000 6%); mask: radial-gradient(circle, transparent 5%, #000 6%);
        }
        .ns-radius {
          position: absolute; left: calc(50% - 0.75px); top: 0; width: 1.5px; height: 50%;
          transform-origin: bottom center; background: linear-gradient(to top, transparent 18%, #e8a13a);
          opacity: 0.62; filter: drop-shadow(0 0 6px rgba(232, 161, 58, 0.55));
        }
        .ns-orbit { position: absolute; inset: 0; z-index: 4; }
        .ns-dot {
          position: absolute; top: 50%; left: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%;
          background: #e8a13a; box-shadow: 0 0 0 5px rgba(232, 161, 58, 0.14), 0 0 18px #e8a13a;
          transform: translateX(clamp(175px, 22vw, 250px));
        }
        .ns-horizon { position: absolute; left: 0; right: 0; bottom: 0; height: 34%; z-index: 2; pointer-events: none; background: linear-gradient(to top, rgba(232, 161, 58, 0.1), transparent 78%); }
        .ns-horizon::before { content: ""; position: absolute; left: 8%; right: 8%; bottom: 16%; height: 1px; background: linear-gradient(90deg, transparent, rgba(238, 240, 246, 0.28) 22%, rgba(238, 240, 246, 0.28) 78%, transparent); }
        .ns-school { position: absolute; left: 50%; bottom: 5.4%; transform: translateX(-50%); z-index: 2; width: min(30%, 300px); height: auto; pointer-events: none; }
        .ns-center { position: absolute; left: 50%; top: 45%; transform: translate(-50%, -50%); z-index: 5; text-align: center; width: 90%; }
        .ns-lockup { display: inline-flex; align-items: center; gap: 15px; }
        .ns-mark { width: 30px; height: 30px; flex: 0 0 auto; }
        .ns-word { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; font-weight: 500; font-size: clamp(32px, 5.6vw, 60px); letter-spacing: -0.02em; color: #f6f5f1; line-height: 1; }
        .ns-tag { margin-top: 16px; font-family: "SF Mono", Menlo, monospace; font-size: clamp(10px, 1.5vw, 12.5px); letter-spacing: 0.3em; text-transform: uppercase; color: #9aa3c0; }
        .ns-enter { margin-top: 26px; display: inline-flex; align-items: center; gap: 14px; font-size: 12.5px; }
        .ns-st { display: inline-flex; align-items: center; gap: 7px; font-family: "SF Mono", Menlo, monospace; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #9aa3c0; }
        .ns-st i { width: 6px; height: 6px; border-radius: 50%; background: #4fb286; box-shadow: 0 0 8px #4fb286; }
        .ns-go { padding: 8px 16px; border-left: 1px solid #232a48; color: #f0e2c8; letter-spacing: 0.01em; background: none; border-top: none; border-right: none; border-bottom: none; font: inherit; cursor: pointer; }
        .ns-go:hover { color: #fff; }
        .ns-legal { position: absolute; left: 0; right: 0; bottom: 16px; z-index: 5; text-align: center; font-family: "SF Mono", Menlo, monospace; font-size: 9.5px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(238, 240, 246, 0.34); padding: 0 16px; }
        .ns-fam { display: inline-flex; align-items: center; gap: 5px; margin-left: 11px; vertical-align: -1px; color: rgba(238, 240, 246, 0.22); }
        .ns-fm { width: 11px; height: 11px; overflow: visible; }
        @media (prefers-reduced-motion: no-preference) {
          .ns-sweep { animation: ns-spin 18s linear infinite; transform-origin: 50% 50%; }
          .ns-orbit { animation: ns-spin 18s linear infinite; }
          .ns-contact { animation: ns-tw 5s ease-in-out infinite; }
          .ns-bfly :global(.wl), .ns-bfly :global(.wr), .ns-poo :global(.tail) { transform-box: fill-box; }
          .ns-bfly :global(.wl) { transform-origin: right center; animation: ns-flutter 1.1s ease-in-out infinite; }
          .ns-bfly :global(.wr) { transform-origin: left center; animation: ns-flutter 1.1s ease-in-out infinite; }
          .ns-bun { animation: ns-hop 3.6s ease-in-out infinite; }
          .ns-poo :global(.tail) { transform-origin: right center; animation: ns-wag 0.8s ease-in-out infinite; }
        }
        @keyframes ns-spin { to { transform: rotate(360deg); } }
        @keyframes ns-tw { 0%, 100% { opacity: 0.08; } 50% { opacity: 0.34; } }
        @keyframes ns-flutter { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(0.48); } }
        @keyframes ns-hop { 0%, 84%, 100% { transform: translateY(0); } 90% { transform: translateY(-2.6px); } }
        @keyframes ns-wag { 0%, 100% { transform: rotate(-15deg); } 50% { transform: rotate(15deg); } }
      `}</style>
    </div>
  );
}
