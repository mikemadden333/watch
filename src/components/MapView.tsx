"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import {
  campuses as chicagoCampuses,
  incidents as chicagoIncidents,
  morningStatuses,
} from "@/lib/data/chicago";
import { distanceMi, bearing } from "@/lib/geo";
import { fmtCentral } from "@/lib/time";
import { StatusPill, statusColorVar } from "./ui";
import type { Campus, CampusStatus, Incident } from "@/lib/types";

export interface MapViewProps {
  campuses?: Campus[];
  incidents?: Incident[];
  statuses?: CampusStatus[];
  /** age reference for the 7-day fade; defaults to the seeded morning. */
  nowIso?: string;
}

const MI_TO_M = 1609.34;

const STATUS_COLOR: Record<string, string> = {
  CLEAR: "#1E6E4E",
  MONITOR: "#B08A1E",
  ELEVATED: "#C75B12",
  ALERT: "#B3261E",
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

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);
  const [selected, setSelected] = useState(campuses[0]?.code ?? "");
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
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
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

  // redraw overlay on state change
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      if (mapRef.current) drawOverlay(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, layers, windowDays]);

  async function drawOverlay(L: typeof import("leaflet")) {
    const g = overlayRef.current;
    const map = mapRef.current;
    if (!g || !map) return;
    g.clearLayers();

    // rings on selected campus only
    L.circle([sel.lat, sel.lon], {
      radius: sel.elevatedRingMi * MI_TO_M,
      color: "#C75B12",
      weight: 2,
      dashArray: "6 6",
      fill: true,
      fillColor: "#C75B12",
      fillOpacity: 0.04,
    }).addTo(g);
    L.circle([sel.lat, sel.lon], {
      radius: sel.alertRingMi * MI_TO_M,
      color: "#B3261E",
      weight: 2,
      dashArray: "6 6",
      fill: true,
      fillColor: "#B3261E",
      fillOpacity: 0.05,
    }).addTo(g);

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
      const color = inc.tier === "CONFIRMED" ? "#1E6E4E" : "#B08A1E";
      L.circleMarker([inc.lat, inc.lon], {
        radius: 7,
        color: "#fff",
        weight: 2,
        fillColor: color,
        fillOpacity: opacity,
      })
        .addTo(g)
        .bindTooltip(`${inc.headline}`, { direction: "top" });
    });

    // campuses
    campuses.forEach((c) => {
      const st = statusOf(morningStatuses, c.code)!;
      const isSel = c.code === selected;
      const size = isSel ? 34 : 30;
      const icon = L.divIcon({
        className: "",
        html: `<div class="campus-marker" style="width:${size}px;height:${size}px;background:${STATUS_COLOR[st.status]};${isSel ? "border-color:#1B1A17;" : ""}">${c.code}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      L.marker([c.lat, c.lon], { icon })
        .addTo(g)
        .on("click", () => setSelected(c.code));
    });
  }

  return (
    <div className="wrap">
      {/* rail (left on map screen) */}
      <div className="rail" style={{ width: 290 }}>
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
            <div><Dot c="var(--clear)" />Confirmed incident · CPD/ME</div>
            <div><Dot c="var(--monitor)" />Corroborated · 2+ outlets</div>
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
            <div style={{ color: "var(--mut)" }}>☐ Single-source reports <span style={{ color: "var(--faint)" }}>· off map by rule</span></div>
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
            className="card"
            style={{
              position: "absolute",
              right: 18,
              top: 18,
              width: 290,
              padding: "14px 16px",
              boxShadow: "0 3px 14px rgba(0,0,0,.08)",
              zIndex: 500,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>{sel.name} · selected</b>
              <StatusPill status={selStatus.status} />
            </div>
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
            className="card"
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
              style={{ flex: 1, accentColor: "#1B1A17" }}
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
  );
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
    <div onClick={onClick} style={{ cursor: "pointer", userSelect: "none" }}>
      {on ? "☑" : "☐"} {children}
    </div>
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
