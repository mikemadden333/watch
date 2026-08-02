/* Build the nav campus-picker list (code, name, status, meta line)
   from live network data, with a static fixture fallback. Server-safe. */

import type { Campus, CampusStatus } from "./types";
import type { NavCampus } from "@/components/Nav";

function h12(t?: string): string {
  if (!t) return "";
  const [H, M] = t.split(":").map(Number);
  if (Number.isNaN(H)) return "";
  const ap = H < 12 ? "AM" : "PM";
  const h = ((H + 11) % 12) + 1;
  return `${h}:${String(M ?? 0).padStart(2, "0")} ${ap}`;
}

export function buildNavCampuses(campuses: Campus[], statuses: CampusStatus[]): NavCampus[] {
  return campuses.map((c) => {
    const st = statuses.find((s) => s.campusCode === c.code)?.status;
    const bits = [
      c.students ? `${c.students} students` : "",
      c.grades,
      c.address ? `~${c.address}` : "",
      c.arrivalStart ? `arrival ${h12(c.arrivalStart)}` : "",
      c.dismissal ? `dismissal ${h12(c.dismissal)}` : "",
    ].filter(Boolean);
    return { code: c.code, name: c.name, status: st, meta: bits.join(" · ") };
  });
}
