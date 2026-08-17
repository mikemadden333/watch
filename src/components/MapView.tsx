"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import {
  campuses as chicagoCampuses,
  incidents as chicagoIncidents,
  morningStatuses,
} from "@/lib/data/chicago";
import { distanceMi, bearing } from "@/lib/geo";
import { fmtCentral } from "@/lib/time";
import { incidentTypeWord, placeOf, occurredPhrase } from "@/lib/voice";
import { StatusPill, statusColorVar } from "./ui";
import type { Campus, CampusStatus, Incident } from "@/lib/types";

export interface MapCorridor {
  campusCode: string;
  name: string;
  path: [number, number][];
  bufferMi: number;
}

export interface MapViewProps {
  campuses?: Campus[];
  incidents?: Incident[];
  statuses?: CampusStatus[];
  /** age reference for the 7-day fade; defaults to the seeded morning. */
  nowIso?: string;
  /** Safe Passage walking corridors to overlay */
  corridors?: MapCorridor[];
}

const MI_TO_M = 1609.34;

const STATUS_COLOR: Record<string, string> = {
  CLEAR: "#57c191",
  MONITOR: "#d9a53a",
  ELEVATED: "#e6864a",
  ALERT: "#e5564b",
};

interface Layers {
  confirmed: boolean;
  corroborated: boolean;
  weather: boolean;
  allCrimes: boolean;
}

export default function MapView(props: MapViewProps = {}) {
  const campuses = props.campuses ?? chicagoCampuses;
  const incidents = props.incidents ?? chicagoIncidents;
  const statuses = props.statuses ?? morningStatuses;
  const statusOf = (_list: unknown, code: string) =>
    statuses.find((s) => s.campusCode === code) ?? {
      campusCode: code,
      status: "CLEAR" as const,
      since: "",
    };
  const nowMs = props.nowIso
    ? new Date(props.nowIso).getTime()
    : new Date("2026-08-01T07:12:00-05:00").getTime();
  const pathname = usePathname();
  const base = "/" + (pathname?.split("/").filter(Boolean)[0] ?? "chicago");

  // open on the campus that needs attention, not the first in the list —
  // so the "what happened" popover is showing the moment the map loads.
  const postureRank: Record<string, number> = { ALERT: 0, ELEVATED: 1, MONITOR: 2, CLEAR: 3 };
  const hottest = [...campuses].sort(
    (a, b) => (postureRank[statusOf(null, a.code).status] ?? 3) - (postureRank[statusOf(null, b.code).status] ?? 3)
  )[0];

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);
  const [selected, setSelected] = useState(hottest?.code ?? campuses[0]?.code ?? "");
  const [windowDays, setWindowDays] = useState(7);
  const [layers, setLayers] = useState<Layers>({
    confirmed: true,
    corroborated: true,
    weather: true,
    allCrimes: false,
  });

  const sel = campuses.find((c) => c.code === selected)!;
  const selStatus = statusOf(morningStatuses, selected)!;

  // confirmed incidents within elevated ring of selected, last 7d
  const confirmedInRing = incidents.filter(
    (i) =>
      i.tier === "CONFIRMED" &&
      i.kind !== "weather-advisory" &&
      distanceMi(sel, i) <= sel.elevatedRingMi
  );
  const nearest = [...incidents]
    .filter((i) => i.kind !== "weather-advisory" && i.lat && i.lon)
    .sort((a, b) => distanceMi(sel, a) - distanceMi(sel, b))[0] as
    | (typeof incidents)[number]
    | undefined;
  // the confirmed incident driving this campus's posture, nearest first —
  // its real clocks feed the popover (no hardcoded scenario times)
  const triggerInc = [...confirmedInRing].sort(
    (a, b) => distanceMi(sel, a) - distanceMi(sel, b)
  )[0] as (typeof incidents)[number] | undefined;

  // init map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current || mapRef.current) return;

      const lats = campuses.map((c) => c.lat);
      const lons = campuses.map((c) => c.lon);
      const center: [number, number] = [
        (Math.min(...lats) + Math.max(...lats)) / 2,
        (Math.min(...lons) + Math.max(...lons)) / 2,
      ];

      const map = L.map(mapEl.current, {
        center,
        zoom: 13,
        zoomControl: false,
        attributionControl: false,
      });
      L.control.zoom({ position: "topleft" }).addTo(map);
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19, subdomains: "abcd" }
      ).addTo(map);
      mapRef.current = map;
      overlayRef.current = L.layerGroup().addTo(map);
      drawOverlay(L);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redraw overlay on state change AND when the incident set changes — e.g. a
  // demo drill or a live ingest arrives via router.refresh(). Keying on the
  // incident ids means a freshly-seeded incident actually lands on the map.
  const incidentKey = incidents.map((i) => `${i.id}:${i.tier}`).join("|");
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      if (mapRef.current) drawOverlay(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, layers, windowDays, incidentKey, nowMs]);

  async function drawOverlay(L: typeof import("leaflet")) {
    const g = overlayRef.current;
    const map = mapRef.current;
    if (!g || !map) return;
    g.clearLayers();

    // rings on selected campus only
    L.circle([sel.lat, sel.lon], {
      radius: sel.elevatedRingMi * MI_TO_M,
      color: "#e6864a",
      weight: 2,
      dashArray: "6 6",
      fill: true,
      fillColor: "#e6864a",
      fillOpacity: 0.06,
    }).addTo(g);
    L.circle([sel.lat, sel.lon], {
      radius: sel.alertRingMi * MI_TO_M,
      color: "#e5564b",
      weight: 2,
      dashArray: "6 6",
      fill: true,
      fillColor: "#e5564b",
      fillOpacity: 0.07,
    }).addTo(g);

    // safe-passage corridors (drawn under incidents): a translucent buffer
    // band + a crisp centerline. Walking routes read in a calm route-blue,
    // distinct from the status palette.
    (props.corridors ?? []).forEach((cor) => {
      if (cor.path.length < 2) return;
      L.polyline(cor.path, { color: "#5b78c0", weight: 16, opacity: 0.16, lineCap: "round" }).addTo(g);
      L.polyline(cor.path, { color: "#93a9e6", weight: 3, opacity: 0.9, dashArray: "1 7", lineCap: "round" })
        .addTo(g)
        .bindTooltip(`Safe Passage · ${cor.name}`, { direction: "top" });
    });

    // incidents
    incidents.forEach((inc) => {
      if (inc.kind === "weather-advisory") return;
      if (!inc.lat || !inc.lon) return; // no geometry (e.g. dispatch awaiting geocode)
      // INTEGRITY GATE: a precise dot on the map claims a precise location.
      // Only exact/block incidents earn one. A neighborhood-centroid signal
      // (coarse news) is context-only and must never render as a point — the
      // same discipline the rules engine applies to ring eligibility.
      const geo = inc.geoConfidence ?? "exact";
      if (geo !== "exact" && geo !== "block") return;
      const show =
        (inc.tier === "CONFIRMED" && layers.confirmed) ||
        (inc.tier === "CORROBORATED" && layers.corroborated);
      if (!show) return;
      const ageDays = (nowMs - new Date(inc.occurredAt).getTime()) / 86400000;
      if (ageDays > windowDays) return;
      const opacity = fadeByAge(ageDays);
      // amber = the violence signal used everywhere; never status-green (which
      // reads as "safe") for a confirmed shooting. Corroborated news = slate.
      const color = inc.tier === "CONFIRMED" ? "#e8a13a" : "#9aa3c0";
      const isDriver = !!triggerInc && inc.id === triggerInc.id;
      L.circleMarker([inc.lat, inc.lon], {
        radius: isDriver ? 8 : 7,
        color: isDriver ? "#f3f1ea" : "#0b0f1c",
        weight: 2,
        fillColor: color,
        fillOpacity: opacity,
      })
        .addTo(g)
        .bindTooltip(
          `${cap(incidentTypeWord(inc))}${inc.victimNote ? " · " + inc.victimNote : ""} — ${placeOf(inc)} · ${hm(inc.occurredAt)}`,
          { direction: "top", permanent: isDriver }
        );
    });

    // campuses
    campuses.forEach((c) => {
      const st = statusOf(morningStatuses, c.code)!;
      const isSel = c.code === selected;
      const size = isSel ? 34 : 30;
      const icon = L.divIcon({
        className: "",
        html: `<div class="campus-marker" style="width:${size}px;height:${size}px;background:${STATUS_COLOR[st.status]};${isSel ? "border-color:#f4bf63;box-shadow:0 0 0 2px rgba(244,191,99,.35),0 1px 6px rgba(0,0,0,.5);" : ""}">${c.code}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      L.marker([c.lat, c.lon], { icon })
        .addTo(g)
        .on("click", () => setSelected(c.code));
    });
  }

  const clearNow = campuses.filter((c) => (statusOf(morningStatuses, c.code)?.status ?? "CLEAR") === "CLEAR").length;
  return (
    <>
    <div className="head">
      <div className="sentence">
        {clearNow === campuses.length
          ? `All ${campuses.length} campuses on one map — clear right now.`
          : `${campuses.length} campuses on one map · ${clearNow} clear.`}
      </div>
      <span className="micro">Rings show the selected campus. Dots fade as they age. If we can&apos;t pin the exact spot, it isn&apos;t here.</span>
    </div>
    <div className="wrap">
      {/* rail (left on map screen) */}
      <div className="rail" data-tour="map-rail" style={{ width: 290 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="micro">Selected campus</div>
          <div style={{ fontSize: 17, fontWeight: 800, marginTop: 5 }}>{sel.name}</div>
          <div style={{ marginTop: 6 }}>
            <StatusPill status={selStatus.status} />{" "}
            <span className="mono" style={{ fontSize: 10, color: "var(--mut)" }}>
              since {selStatus.since}
            </span>
          </div>
          <hr className="hr" />
          <div className="micro">Rings · selected campus only</div>
          <div style={{ marginTop: 8, fontSize: 11.5, display: "flex", flexDirection: "column", gap: 6 }}>
            <div>
              <span style={{ display: "inline-block", width: 10, height: 10, border: "2px dashed var(--alert)", borderRadius: "50%", marginRight: 8 }} />
              ALERT radius · {sel.alertRingMi} mi
            </div>
            <div>
              <span style={{ display: "inline-block", width: 10, height: 10, border: "2px dashed var(--elevated)", borderRadius: "50%", marginRight: 8 }} />
              ELEVATED radius · {sel.elevatedRingMi} mi
            </div>
          </div>
          <hr className="hr" />
          <div className="micro">Markers</div>
          <div style={{ marginTop: 8, fontSize: 11.5, display: "flex", flexDirection: "column", gap: 6 }}>
            <div><Dot c="var(--ink)" />Campus · status color</div>
            <div><Dot c="#e8a13a" />Confirmed incident · CPD/ME</div>
            <div><Dot c="#9aa3c0" />Corroborated · 2+ outlets</div>
            <div style={{ color: "var(--mut)", fontSize: 10.5 }}>
              Marker opacity decays with age · 7-day fade
            </div>
          </div>
          <hr className="hr" />
          <div className="micro">Layers</div>
          <div style={{ marginTop: 8, fontSize: 11.5, display: "flex", flexDirection: "column", gap: 7 }}>
            <Toggle on={layers.confirmed} onClick={() => setLayers((l) => ({ ...l, confirmed: !l.confirmed }))}>
              Confirmed (CPD VR · ME · last 7 d)
            </Toggle>
            <Toggle on={layers.corroborated} onClick={() => setLayers((l) => ({ ...l, corroborated: !l.corroborated }))}>
              Corroborated (news · last 6 h)
            </Toggle>
            <div className="maptoggle off" title="Single-source reports never plot — an integrity rule, not a toggle">
              <span className="mt-sw" aria-hidden><span className="mt-knob" /></span>
              <span className="mt-lab" style={{ color: "var(--mut)" }}>Single-source reports <span style={{ color: "var(--faint)" }}>· off map by rule</span></span>
            </div>
            <Toggle on={layers.weather} onClick={() => setLayers((l) => ({ ...l, weather: !l.weather }))}>
              Weather (NWS live)
            </Toggle>
            <Toggle on={layers.allCrimes} onClick={() => setLayers((l) => ({ ...l, allCrimes: !l.allCrimes }))}>
              All-crimes backfill (8-day layer)
            </Toggle>
          </div>
          <hr className="hr" />
          <div className="micro">All campuses</div>
          <div style={{ marginTop: 8, fontFamily: "Menlo,monospace", fontSize: 10.5, display: "flex", flexDirection: "column", gap: 7 }}>
            {campuses.map((c) => {
              const st = statusOf(morningStatuses, c.code)!;
              return (
                <div
                  key={c.code}
                  onClick={() => setSelected(c.code)}
                  style={{ display: "flex", justifyContent: "space-between", cursor: "pointer", fontWeight: c.code === selected ? 700 : 400 }}
                >
                  <span>{c.name}</span>
                  <span style={{ color: statusColorVar(st.status) }}>● {st.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* map */}
      <div className="main">
        <div
          style={{
            position: "relative",
            border: "1px solid var(--line)",
            borderRadius: 8,
            height: "calc(100vh - 160px)",
            minHeight: 520,
            overflow: "hidden",
          }}
        >
          <div ref={mapEl} style={{ position: "absolute", inset: 0 }} />

          {/* selected popover */}
          <div
            className="card mappop"
            data-tour="map-pop"
            style={{
              position: "absolute",
              right: 18,
              top: 18,
              width: 290,
              padding: "14px 16px",
              boxShadow: "0 6px 22px rgba(0,0,0,.45)",
              zIndex: 500,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>{sel.name} · selected</b>
              <StatusPill status={selStatus.status} />
            </div>

            {triggerInc && selStatus.status !== "CLEAR" ? (
              <div
                style={{
                  marginTop: 10,
                  padding: "9px 11px",
                  borderRadius: 9,
                  background: selStatus.status === "ALERT" ? "var(--alertbg)" : "var(--elevatedbg)",
                  border: `1px solid ${selStatus.status === "ALERT" ? "var(--alert)" : "var(--line2)"}`,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>
                  {cap(incidentTypeWord(triggerInc))}
                  {triggerInc.victimNote ? ` · ${triggerInc.victimNote}` : ""}
                </div>
                <div style={{ fontSize: 11, color: "var(--mut)", marginTop: 3, lineHeight: 1.4 }}>
                  {placeOf(triggerInc)} · {distanceMi(sel, triggerInc).toFixed(2)} mi {bearing(sel, triggerInc)} of campus · occurred {occurredPhrase(triggerInc.occurredAt).replace(/^./, (ch) => ch.toLowerCase())}
                </div>
                <Link
                  href={`${base}/action?view=leader&campus=${sel.code}`}
                  style={{ display: "inline-block", marginTop: 8, fontSize: 11.5, fontWeight: 600, color: "var(--amber2)", textDecoration: "none" }}
                >
                  Open response →
                </Link>
              </div>
            ) : null}

            <div style={{ marginTop: 10, fontFamily: "Menlo,monospace", fontSize: 10.5, display: "flex", flexDirection: "column", gap: 7 }}>
              <PopRow label="Confirmed in ring · 7 d" value={String(confirmedInRing.length)} />
              <PopRow
                label="Nearest confirmed"
                value={
                  nearest
                    ? `${distanceMi(sel, nearest).toFixed(2)} mi · ${bearing(sel, nearest)}`
                    : "none in range"
                }
              />
              <PopRow label="Occurred" value={triggerInc ? hm(triggerInc.occurredAt) : "—"} />
              <PopRow label="Published" value={triggerInc ? hm(triggerInc.publishedAt) : "—"} />
              <PopRow
                label="Rule fired"
                value={selStatus.ruleId ? `${selStatus.ruleId} · ${selStatus.ruleName}` : "CLEAR · none"}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 10.5, color: "var(--mut)" }}>
              Click another campus to switch rings.
            </div>
          </div>

          {/* data-window scrubber */}
          <div
            className="card mapscrub"
            style={{
              position: "absolute",
              left: 18,
              bottom: 18,
              right: 340,
              minWidth: 260,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              zIndex: 500,
            }}
          >
            <span className="micro microink">Data window</span>
            <input
              type="range"
              min={1}
              max={7}
              value={windowDays}
              onChange={(e) => setWindowDays(Number(e.target.value))}
              style={{ flex: 1, accentColor: "#e8a13a" }}
            />
            <span className="mono" style={{ fontSize: 10, color: "var(--mut)", whiteSpace: "nowrap" }}>
              {windowDays} d ago —— latest data day
            </span>
          </div>

          <div className="micro" style={{ position: "absolute", right: 18, bottom: 18, zIndex: 500 }}>
            Leaflet · © OpenStreetMap · CARTO
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
function fadeByAge(ageDays: number): number {
  return Math.max(0.28, 1 - ageDays / 7);
}
function hm(iso?: string): string {
  return fmtCentral(iso) || "—";
}

function Dot({ c }: { c: string }) {
  return (
    <span style={{ display: "inline-block", width: 10, height: 10, background: c, borderRadius: "50%", marginRight: 8 }} />
  );
}
function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`maptoggle ${on ? "on" : ""}`}>
      <span className="mt-sw" aria-hidden><span className="mt-knob" /></span>
      <span className="mt-lab">{children}</span>
    </button>
  );
}
function PopRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--mut)" }}>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
