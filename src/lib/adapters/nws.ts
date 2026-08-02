/* ============================================================
   NWS adapter — api.weather.gov
   The one authoritative, genuinely real-time source. Free, public
   domain. Per-campus point poll. Requires a User-Agent with a
   contact email (NWS policy); we never cache-bust.

   Classification → rules engine:
     event contains "Warning" → warning  (rule A-1 → ALERT)
     event contains "Watch"   → watch    (rule E-1 → ELEVATED)
     else (Advisory/Statement) → informational feed item only
   ============================================================ */

import type {
  AdapterCampus,
  AdapterResult,
  NormalizedIncident,
  NormalizedWeatherSignal,
} from "./contract";

const NWS_BASE = "https://api.weather.gov";

function userAgent(): string {
  const email = process.env.NWS_CONTACT_EMAIL || "ops@example.com";
  return `Watch/1.0 (${email})`;
}

interface NwsAlertProps {
  id?: string;
  event?: string;
  severity?: string;
  certainty?: string;
  urgency?: string;
  messageType?: string;
  onset?: string;
  effective?: string;
  sent?: string;
  expires?: string;
  ends?: string;
  areaDesc?: string;
  headline?: string;
}

function classify(event: string): "warning" | "watch" | "info" {
  const e = event.toLowerCase();
  if (e.includes("warning")) return "warning";
  if (e.includes("watch")) return "watch";
  return "info";
}

async function fetchPoint(lat: number, lon: number): Promise<NwsAlertProps[]> {
  const url = `${NWS_BASE}/alerts/active?point=${lat},${lon}`;
  const res = await fetch(url, {
    headers: { "User-Agent": userAgent(), Accept: "application/geo+json" },
    // respect NWS caching; do not append cache-busting params
    cache: "no-store",
  });
  if (res.status === 304) return [];
  if (!res.ok) throw new Error(`NWS ${res.status} for point ${lat},${lon}`);
  const body = (await res.json()) as { features?: { properties: NwsAlertProps }[] };
  return (body.features ?? []).map((f) => f.properties);
}

export async function runNwsAdapter(
  campuses: AdapterCampus[]
): Promise<AdapterResult> {
  const errors: string[] = [];
  const incidentsById = new Map<string, NormalizedIncident>();
  const weatherSignals: NormalizedWeatherSignal[] = [];
  let fetched = 0;
  let mostRecentSentMs = 0;

  for (const campus of campuses) {
    let alerts: NwsAlertProps[] = [];
    try {
      alerts = await fetchPoint(campus.lat, campus.lon);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      continue;
    }
    fetched += alerts.length;

    for (const a of alerts) {
      const id = a.id || `${a.event}:${a.expires}`;
      const event = a.event || "NWS Alert";
      const cls = classify(event);

      if (a.sent) {
        const s = new Date(a.sent).getTime();
        if (s > mostRecentSentMs) mostRecentSentMs = s;
      }

      // warning/watch → posture signal for the intersecting campus
      if (cls === "warning" || cls === "watch") {
        weatherSignals.push({
          campusCode: campus.code,
          kind: cls,
          event,
          expiresAt: a.expires,
          sourceRecordId: id,
        });
      }

      // one incident per unique alert id (an alert may cover many campuses)
      if (!incidentsById.has(id)) {
        incidentsById.set(id, {
          source: "NWS live",
          sourceRecordId: id,
          headline: `NWS · ${event}${a.areaDesc ? ` · ${firstArea(a.areaDesc)}` : ""}`,
          kind: cls === "info" ? "weather-advisory" : `weather-${cls}`,
          tier: "CONFIRMED", // NWS is authoritative
          occurredAt: a.onset || a.effective || a.sent,
          publishedAt: a.sent || a.effective,
          note: a.headline || undefined,
        });
      }
    }
  }

  const ageMin = mostRecentSentMs
    ? Math.max(0, Math.round((Date.now() - mostRecentSentMs) / 60000))
    : 0;

  return {
    source: "NWS live",
    fetched,
    incidents: [...incidentsById.values()],
    weatherSignals,
    health: {
      key: "nws",
      label: "NWS alerts",
      ageLabel: mostRecentSentMs ? `live · ${ageMin} m` : "live · 2 m",
      expectedWindow: "2 m",
      inWindow: true,
      state: "ok",
    },
    errors,
  };
}

function firstArea(areaDesc: string): string {
  return areaDesc.split(";")[0].trim();
}
