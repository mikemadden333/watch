"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import s from "./splash.module.css";
import { BRAND_LINE } from "@/lib/legal";

export default function SplashPage() {
  const [entered, setEntered] = useState(false);
  const router = useRouter();

  function pick(city: string) {
    if (city === "chicago") router.push("/chicago/briefing");
    else if (city === "dallas") router.push("/dallas/briefing");
  }

  return (
    <div className={s.root}>
      {/* ================= SPLASH ================= */}
      <div
        className={`${s.splash}${entered ? " " + s.gone : ""}`}
        onClick={() => setEntered(true)}
      >
        <div className={s.rings}>
          <svg viewBox="0 0 1200 1200">
            <g fill="none" stroke="#1B1A17">
              <circle className={s.ringA} cx="600" cy="600" r="170" strokeOpacity=".14" strokeWidth="1.4" />
              <circle className={s.ringB} cx="600" cy="600" r="310" strokeOpacity=".10" strokeWidth="1.2" />
              <circle className={s.ringC} cx="600" cy="600" r="460" strokeOpacity=".07" strokeWidth="1" />
              <circle cx="600" cy="600" r="590" strokeOpacity=".05" strokeWidth="1" />
            </g>
            <g fill="none" stroke="#C75B12">
              <circle cx="600" cy="600" r="240" strokeOpacity=".28" strokeWidth="1.3" strokeDasharray="3 9" />
            </g>
            <g className={s.sweepline}>
              <defs>
                <linearGradient id="fade" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="#C75B12" stopOpacity=".38" />
                  <stop offset="1" stopColor="#C75B12" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="600" y1="455" x2="600" y2="55" stroke="url(#fade)" strokeWidth="1.6" />
              <circle cx="600" cy="360" r="4" fill="#C75B12" fillOpacity=".85" />
              <circle cx="600" cy="360" r="9" fill="none" stroke="#C75B12" strokeOpacity=".3" />
            </g>
          </svg>
        </div>
        <div className={s.blip} style={{ left: "calc(50% + 205px)", top: "calc(50% - 128px)", color: "var(--elevated)", animationDelay: "0s" }}><i /></div>
        <div className={s.blip} style={{ left: "calc(50% - 268px)", top: "calc(50% + 158px)", color: "var(--monitor)", animationDelay: "2.9s" }}><i /></div>
        <div className={s.blip} style={{ left: "calc(50% - 148px)", top: "calc(50% - 262px)", color: "var(--clear)", animationDelay: "5.6s" }}><i /></div>

        <div className={s.splashCore}>
          <div className={s.wordmark}>
            Watch<span className={s.dot}>.</span>
          </div>
          <div className={s.subline}>Know first. Act fast.</div>
          <div className={s.statusline}>
            <span><i style={{ background: "var(--clear)" }} />CLEAR</span>
            <span><i style={{ background: "var(--monitor)" }} />MONITOR</span>
            <span><i style={{ background: "var(--elevated)" }} />ELEVATED</span>
            <span><i style={{ background: "var(--alert)" }} />ALERT</span>
          </div>
          <div className={s.enter}>
            <button className={s.enterBtn} onClick={(e) => { e.stopPropagation(); setEntered(true); }}>
              Enter Watch →
            </button>
            <div className={`${s.hint} micro`}>
              Safety intelligence for K-12 school networks · 24x7
            </div>
          </div>
        </div>
        <div className={s.splashFoot}>
          <span className="micro">{BRAND_LINE}</span>
        </div>
      </div>

      {/* ================= CITY SELECT ================= */}
      <div className={`${s.select}${entered ? " " + s.on : ""}`}>
        <div className={s.selHead}>
          <div className={s.selBrand}>Watch<span className={s.dot}>.</span></div>
          <div className={s.selTitle}>Where are your campuses?</div>
          <div className={`${s.selSub} micro`}>
            Choose a network · every city is an adapter pack, not a rebuild
          </div>
        </div>
        <div className={s.cards}>
          {/* Chicago */}
          <div className={s.city} onClick={() => pick("chicago")}>
            <div className={s.go}>→</div>
            <div className={s.art}>
              <div className={s.g} style={{ left: 0, right: 0, top: 38, height: 1.6 }} />
              <div className={s.g} style={{ left: 0, right: 0, top: 78, height: 1.6 }} />
              <div className={s.g} style={{ top: 0, bottom: 0, left: 78, width: 1.6 }} />
              <div className={s.g} style={{ top: 0, bottom: 0, left: 168, width: 2.4 }} />
              <div className={s.g} style={{ top: 0, bottom: 0, left: 238, width: 1.6 }} />
              <div className={s.ringart} style={{ width: 74, height: 74, left: 96, top: 24 }} />
              <div className={s.cdot} style={{ width: 16, height: 16, background: "var(--elevated)", border: "2px solid #1B1A17", left: 125, top: 53 }} />
              <div className={s.cdot} style={{ width: 9, height: 9, background: "var(--clear)", border: "1.5px solid #fff", left: 196, top: 34 }} />
              <div className={s.cdot} style={{ width: 9, height: 9, background: "var(--clear)", border: "1.5px solid #fff", left: 64, top: 92 }} />
              <div className={s.cdot} style={{ width: 9, height: 9, background: "var(--monitor)", border: "1.5px solid #fff", left: 246, top: 70 }} />
            </div>
            <h3>Chicago</h3>
            <div className={s.net} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/veritas-mark.svg" alt="" width={20} height={20} />
              Veritas Charter Schools · Pilot
            </div>
            <p>
              Six campuses across Englewood, Woodlawn, and Bronzeville. The
              hardest public-data city in America — where the integrity
              architecture proves itself.
            </p>
            <div className={s.meta}>
              <span><b>7 sources</b> · CPD · ME · NWS · news · GDELT · RSS</span>
              <span><b>Confirmed clock</b> · 13–37 h shooting records</span>
              <span><b>Live clock</b> · weather · corroborated news</span>
            </div>
          </div>

          {/* Dallas */}
          <div className={s.city} onClick={() => pick("dallas")}>
            <div className={s.go}>→</div>
            <div className={s.art}>
              <div className={s.radial} />
              <div className={s.live}><i />LIVE · 2 MIN</div>
              <div className={s.cdot} style={{ width: 16, height: 16, background: "var(--clear)", border: "2px solid #1B1A17", left: 150, top: 62 }} />
              <div className={s.cdot} style={{ width: 9, height: 9, background: "var(--clear)", border: "1.5px solid #fff", left: 88, top: 44 }} />
              <div className={s.cdot} style={{ width: 9, height: 9, background: "var(--monitor)", border: "1.5px solid #fff", left: 214, top: 38 }} />
              <div className={s.cdot} style={{ width: 9, height: 9, background: "var(--clear)", border: "1.5px solid #fff", left: 190, top: 96 }} />
            </div>
            <h3>Dallas</h3>
            <div className={s.net} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/solis-mark.svg" alt="" width={20} height={20} />
              Solis Academies · Live
            </div>
            <p>
              Four campuses across Oak Cliff, South Dallas, and Pleasant Grove.
              Fully live — city dispatch data refreshed roughly every two
              minutes.
            </p>
            <div className={s.meta}>
              <span><b>5 sources</b> · DPD active calls · NWS · news · GDELT · RSS</span>
              <span><b>Confirmed clock</b> · daily incident record</span>
              <span><b>Live clock</b> · 2-min dispatch · weather</span>
            </div>
          </div>

          {/* Ghost */}
          <div className={`${s.city} ${s.ghost}`}>
            <div className={s.art}>+</div>
            <h3 style={{ color: "var(--mut)" }}>Your city</h3>
            <div className={s.net}>New city = one adapter pack</div>
            <p>
              Socrata and ArcGIS adapters cover most of urban America. San
              Francisco publishes 10-minute dispatch data. Nashville, minutes.
              The platform is ready before the city is chosen.
            </p>
            <div className={s.meta}>
              <span><b>No forks.</b> Campuses, rings, playbooks — all config.</span>
            </div>
          </div>
        </div>
        <div className={s.selFoot}>
          <span className="micro">
            Decision support for school safety — not a guarantee ·{" "}
            <a href="/limitations" style={{ textDecoration: "underline", color: "inherit" }}>
              How Watch works, and its limits →
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
