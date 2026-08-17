import TierBadge from "./TierBadge";
import { distanceMi, bearing } from "@/lib/geo";
import type { BreakingItem, BreakingNews as BreakingNewsData } from "@/lib/breakingNews";

/** A single-campus briefing scopes the news to that campus, not the network. */
export interface NewsFocus {
  code: string;
  name: string;
  lat: number;
  lon: number;
}
const FOCUS_RADIUS_MI = 1.5;

/* ============================================================
   "Breaking news near your campuses" — the answer-the-phone-call
   surface. A parent calls because they saw something on the news;
   this is what Watch can hand the principal in that moment: the same
   headlines, but clustered, corroboration-scored, and placed against
   campuses — with the location honesty always visible.

   Design law: news is never a status color. Everything here is ink.
   A precise (block) item earns a distance to a campus; a coarse
   (neighborhood) item says so plainly and claims no ring; a location-
   less item admits it. Corroboration is a fact, shown as a count.
   ============================================================ */

export default function BreakingNews({
  data,
  live,
  focus,
}: {
  data: BreakingNewsData | null;
  live: boolean;
  focus?: NewsFocus;
}) {
  const allItems = data?.items ?? [];

  // On a single campus, only show precise news genuinely near THAT campus,
  // re-measured to it — not the whole network's news (which sits near other
  // schools). Coarse / location-less items are network-scope, so they're
  // dropped here; they still appear at the network altitude.
  const items = focus
    ? allItems
        .filter((i) => i.geo === "block" && i.lat != null && i.lon != null)
        .map((i) => {
          const d = distanceMi({ lat: focus.lat, lon: focus.lon }, { lat: i.lat!, lon: i.lon! });
          return {
            ...i,
            distanceMi: Math.round(d * 100) / 100,
            bearing: bearing({ lat: focus.lat, lon: focus.lon }, { lat: i.lat!, lon: i.lon! }),
            nearestCampusCode: focus.code,
            nearestCampusName: focus.name,
          } as BreakingItem;
        })
        .filter((i) => (i.distanceMi ?? 99) <= FOCUS_RADIUS_MI)
        .sort((a, b) => (a.distanceMi ?? 99) - (b.distanceMi ?? 99))
    : allItems;

  const near = items.filter((i) => i.geo === "block" && (i.distanceMi ?? 99) <= 1.5);
  const title = focus ? `Breaking news near ${focus.name}` : "Breaking news near your campuses";

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <b style={{ fontSize: 14 }}>{title}</b>
        <span className="micro">
          {live ? (
            <>
              <span style={{ color: "var(--clear)", fontWeight: 700 }}>● LIVE</span> · local newsrooms
              {data?.outletsLive ? ` · ${data.outletsLive} outlets` : ""}
              {data?.updatedLabel ? ` · updated ${data.updatedLabel}` : ""}
            </>
          ) : (
            "monitor offline"
          )}
        </span>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--mut)", lineHeight: 1.55, marginTop: 6 }}>
        Sometimes the first thing a principal hears is a parent calling about
        something on the news. This is that call, structured: local outlets
        clustered by incident, scored by how many report it, and placed against
        {focus ? " this campus" : " your campuses"}. <b>News is never “confirmed”</b> — and a headline that
        only names a neighborhood is shown as approximate, never as a ring.
      </p>

      {items.length === 0 ? (
        <div
          style={{
            marginTop: 12,
            padding: "14px 14px",
            border: "1px dashed var(--line2)",
            borderRadius: 8,
            fontSize: 12.5,
            color: "var(--mut)",
          }}
        >
          {live
            ? `No violent-incident news was reported within ${FOCUS_RADIUS_MI} miles of ${
                focus ? focus.name : "your campuses"
              } in the last 18 h. The monitor is running; this space fills only when something is actually reported${
                focus ? " near this campus" : ""
              }.`
            : "The live news monitor is not connected in this view."}
        </div>
      ) : (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {!focus && near.length > 0 && (
            <div className="micro" style={{ color: "var(--elevated)" }}>
              {near.length} near a campus (within 1.5 mi) · {items.length - near.length} more in the network
            </div>
          )}
          {items.slice(0, 8).map((it) => (
            <NewsRow key={it.id} it={it} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsRow({ it }: { it: BreakingItem }) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: "10px 12px",
        background: "var(--panel)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, fontWeight: 600 }}>
          {cleanHeadline(it.headline)}
        </div>
        <TierBadge tier={it.tier} />
      </div>

      <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: "4px 10px", alignItems: "center" }}>
        <LocationLine it={it} />
        {it.lastSeen && (
          <span className="mono" style={{ fontSize: 10.5, color: "var(--mut)" }}>
            · {timeLabel(it.lastSeen)}
          </span>
        )}
      </div>

      {it.outlets.length > 0 && (
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
          {it.outlets.map((o) => (
            <span
              key={o}
              style={{
                fontSize: 10,
                padding: "2px 7px",
                borderRadius: 20,
                border: "1px solid var(--line2)",
                color: "#4A463D",
              }}
            >
              {o}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** The honesty line — how we're allowed to talk about this location. */
function LocationLine({ it }: { it: BreakingItem }) {
  if (it.geo === "block" && it.distanceMi != null && it.nearestCampusName) {
    return (
      <span style={{ fontSize: 11.5 }}>
        <span className="num" style={{ fontWeight: 700 }}>
          {it.distanceMi} mi {it.bearing}
        </span>{" "}
        of {it.nearestCampusName} · <span style={{ color: "var(--mut)" }}>block-level, precise</span>
      </span>
    );
  }
  if (it.geo === "neighborhood") {
    return (
      <span style={{ fontSize: 11.5, color: "var(--mut)" }}>
        In {it.placeLabel ?? "a named neighborhood"} · <b style={{ color: "#4A463D" }}>approximate</b> — no exact
        block, so no distance and no ring
      </span>
    );
  }
  return (
    <span style={{ fontSize: 11.5, color: "var(--mut)" }}>
      Location not yet pinned · network-scope only
    </span>
  );
}

function cleanHeadline(h: string): string {
  return h.replace(/^Breaking news · /, "");
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const h = Math.round(mins / 60);
  return `${h} h ago`;
}
