/* Haversine distance + bearing helpers. Distances in miles. */

const EARTH_MI = 3958.7613;

export function distanceMi(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_MI * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearing(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): string {
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const deg = (toDeg(Math.atan2(y, x)) + 360) % 360;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}
function toDeg(r: number): number {
  return (r * 180) / Math.PI;
}
