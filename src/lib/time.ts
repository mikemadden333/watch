/* ============================================================
   Watch — timezone discipline. One rule: incident clocks are stored as
   correct UTC instants and DISPLAYED in the served city's local time
   (America/Chicago for both current tenants).

   Two failure modes this fixes:
   1. Socrata open-data timestamps are "floating" (no zone) but are local
      Central time. Stored verbatim, `new Date()` treats them as UTC, so any
      cross-source math (detection latency, retro gap) was off by the offset.
      centralWallToUtc() stamps them with the correct DST-aware offset.
   2. Display read UTC hours, so authoritative-UTC sources (NWS/GDELT/RSS)
      showed ~5–6h ahead of local while Socrata sources showed correct-local,
      unlabeled. fmtCentral() renders every instant in America/Chicago, so all
      clocks agree.
   DST-aware via Intl — no library, no hardcoded offset.
   ============================================================ */

const TZ = "America/Chicago";

/** Minutes the timeZone is ahead of UTC at `date` (negative for Chicago). */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) if (p.type !== "literal") map[p.type] = Number(p.value);
  const asUTC = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return (asUTC - date.getTime()) / 60000;
}

/** Convert a Central wall-clock string (zoneless, from Socrata) to a correct
 *  UTC ISO instant. If the input already carries a zone (Z or ±hh:mm) it's
 *  trusted as-is. Returns undefined for empty/invalid input. */
export function centralWallToUtc(wall?: string | null): string | undefined {
  if (!wall) return undefined;
  const norm = wall.includes("T") ? wall : wall.replace(" ", "T");
  if (/([zZ]|[+-]\d\d:?\d\d)$/.test(norm)) {
    const d = new Date(norm);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  const asIfUtc = new Date(norm + "Z");
  if (Number.isNaN(asIfUtc.getTime())) return undefined;
  const off = tzOffsetMinutes(asIfUtc, TZ); // e.g. -300 (CDT) / -360 (CST)
  return new Date(asIfUtc.getTime() - off * 60000).toISOString();
}

/** Format an instant (ISO) as local time in the served city. "21:47" or
 *  "21:47:03". Empty/invalid → "". */
export function fmtCentral(iso?: string | null, withSeconds = false): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
  }).format(d);
}

/** The local (Central) calendar day of an instant, "YYYY-MM-DD". */
export function centralDay(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return p; // en-CA yields YYYY-MM-DD
}
