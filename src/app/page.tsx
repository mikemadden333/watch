"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import s from "./splash.module.css";
import NightSplash from "@/components/NightSplash";

export default function SplashPage() {
  const [entered, setEntered] = useState(false);
  const router = useRouter();

  function pick(city: string) {
    if (city === "chicago") router.push("/chicago/briefing");
    else if (city === "dallas") router.push("/dallas/briefing");
  }

  return (
    <div className={s.root}>
      {/* ================= NIGHTWATCH SPLASH (dark curtain) ================= */}
      <NightSplash gone={entered} onEnter={() => setEntered(true)} />

      {/* ================= CITY SELECT (dark) ================= */}
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
              <div className={s.cdot} style={{ width: 16, height: 16, background: "var(--elevated)", border: "2px solid #f3f1ea", left: 125, top: 53 }} />
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
              Six campuses across Englewood, North Lawndale, and Roseland. The
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
              <div className={s.cdot} style={{ width: 16, height: 16, background: "var(--clear)", border: "2px solid #f3f1ea", left: 150, top: 62 }} />
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
