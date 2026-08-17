"use client";

/* Pulse — the real map under the radar. A live street map of the half-mile
   around the campus, every CONFIRMED gun-violence incident pinned at its true
   location, sized + faded by how recent it is; the freshest still pulse. This
   is the geographic twin of the schematic radar: same 0.25 / 0.5 mi rings,
   grounded on real streets. Degrades gracefully — if tiles ever fail to load,
   the navy ground, the rings, and the pins still render, so it never goes
   blank on stage. */

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { Campus } from "@/lib/types";
import type { PulseRing } from "@/lib/pulse";
import { PULSE_RADIUS_MI, PULSE_WINDOW_DAYS } from "@/lib/pulse";
import { incidentTypeWord, placeOf } from "@/lib/voice";
import type { Incident } from "@/lib/types";

const EL = "#e8a13a";
const RED = "#e5564b";
const MI_TO_M = 1609.34;
const HOT_DAYS = 21;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const isFatal = (note?: string) => !!note && /fatal/i.test(note) && !/non-fatal/i.test(note);
const titleOf = (r: PulseRing) => `${cap(incidentTypeWord({ kind: r.kind } as Incident))} · ${placeOf({ headline: r.headline } as Incident)}`;

export default function PulseMap({ rings, campus, compact = false, radiusMi = PULSE_RADIUS_MI }: { rings: PulseRing[]; campus: Campus; compact?: boolean; radiusMi?: number }) {
  const ringMi = radiusMi >= 0.9 ? [0.5, 1] : [0.25, 0.5];
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const selected = rings.find((r) => r.id === sel) ?? null;

  // build the map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current || mapRef.current) return;

      const map = L.map(mapEl.current, {
        center: [campus.lat, campus.lon],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: true,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);
      mapRef.current = map;

      // frame on the outer half-mile ring so the whole watched area is visible.
      // toBounds() takes the full box size in meters and needs no map — unlike
      // Circle.getBounds(), which throws on a circle not yet added to a map.
      const box = L.latLng(campus.lat, campus.lon).toBounds(radiusMi * 2 * MI_TO_M);
      map.fitBounds(box, { padding: [18, 18] });
      overlayRef.current = L.layerGroup().addTo(map);
      map.on("click", () => setSel(null));
      setTimeout(() => { if (mapRef.current === map) map.invalidateSize(); }, 60);
      draw(L);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // redraw pins on selection change or when the incident set changes
  const key = rings.map((r) => r.id).join("|");
  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      if (mapRef.current) draw(L);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, key]);

  function draw(L: typeof import("leaflet")) {
    const g = overlayRef.current;
    if (!g) return;
    g.clearLayers();

    // range rings — inner + outer, scaled to the awareness radius
    for (const [mi, op] of [[ringMi[0], 0.1], [ringMi[1], 0.07]] as [number, number][]) {
      L.circle([campus.lat, campus.lon], {
        radius: mi * MI_TO_M,
        color: EL,
        weight: 1,
        dashArray: "3 5",
        opacity: 0.5,
        fill: true,
        fillColor: EL,
        fillOpacity: op * 0.12,
        interactive: false,
      }).addTo(g);
    }

    // incidents — oldest first so fresh pins sit on top
    const ordered = [...rings].sort((a, b) => b.ageDays - a.ageDays);
    for (const r of ordered) {
      const fatal = isFatal(r.victimNote);
      const col = fatal ? RED : EL;
      const hot = r.ageDays <= HOT_DAYS;
      const isSel = r.id === sel;
      const size = 10 + Math.round(12 * r.decayFrac); // px
      const cls = `pm-dot${hot ? " pm-fresh" : ""}${fatal ? " pm-fatal" : ""}${isSel ? " pm-sel" : ""}`;
      const icon = L.divIcon({
        className: "pm-iconwrap",
        html: `<span class="${cls}" style="--pm-c:${col};--pm-s:${size}px;--pm-o:${(0.35 + 0.5 * r.decayFrac).toFixed(2)}"></span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      L.marker([r.lat, r.lon], { icon, riseOnHover: true })
        .addTo(g)
        .on("click", (e) => {
          e.originalEvent?.stopPropagation?.();
          setSel(r.id);
        });
    }

    // campus — glowing white core at center
    const campusIcon = L.divIcon({
      className: "pm-iconwrap",
      html: `<span class="pm-campus"></span>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });
    L.marker([campus.lat, campus.lon], { icon: campusIcon, interactive: false, keyboard: false }).addTo(g);
  }

  return (
    <div className="pmapblock">
      <div className="pmapwrap">
        <div ref={mapEl} className="pmap" role="img"
          aria-label={`Map of confirmed gun violence within a half-mile of ${campus.name}. Tap a pin to inspect it.`} />
        <div className="pradar-legend">
          <span><i className="lg-campus" />Campus</span>
          <span><i className="lg-hot" />Fresh · still hot</span>
          <span><i className="lg-cool" />Cooling</span>
          <span className="pradar-scale">rings {ringMi[0]} &amp; {ringMi[1]} mi · tap a pin</span>
        </div>
      </div>

      {selected && (
        <div className={`pdetail${isFatal(selected.victimNote) ? " fatal" : ""}`}>
          <button type="button" className="pdetail-x" onClick={() => setSel(null)} aria-label="Close">×</button>
          <div className="pdetail-t">{titleOf(selected)}</div>
          <div className="pdetail-sub">
            <b>{selected.distanceMi} mi {selected.bearing}</b> of campus · {selected.ageLabel}
            {selected.victimNote ? <> · <span className={isFatal(selected.victimNote) ? "fatalw" : ""}>{selected.victimNote}</span></> : null}
          </div>
          <div className="pdetail-meta">
            {selected.ageDays <= HOT_DAYS ? "Inside the active contagion window · " : "Cooling · "}
            still on the record for ~{selected.fadesInDays} more days
          </div>
        </div>
      )}

      {!compact && (
      <div className="plist">
        {rings.map((r) => (
          <button
            type="button"
            className={`prow${r.id === sel ? " on" : ""}`}
            key={r.id}
            onClick={() => setSel(r.id === sel ? null : r.id)}
          >
            <div className="top">
              <span>{titleOf(r)}</span>
              <span className="mono num" style={{ color: r.ageDays <= 7 ? EL : "var(--ink)" }}>{r.ageLabel}</span>
            </div>
            <div className="sub">
              {r.distanceMi} mi {r.bearing}
              {r.victimNote ? (
                <span style={isFatal(r.victimNote) ? { color: "var(--alert)", fontWeight: 600 } : undefined}>
                  {" · "}{r.victimNote}
                </span>
              ) : null}
              {" · "}<span className="mono" style={{ color: "var(--faint)" }}>cools in ~{r.fadesInDays} d</span>
            </div>
          </button>
        ))}
      </div>
      )}

      {rings.length > 0 && (
        <div className="pmap-scale-note mono">
          {rings.length} confirmed within {ringMi[1]} mi over the last {PULSE_WINDOW_DAYS} days · pinned where each happened
        </div>
      )}
    </div>
  );
}
