/* ============================================================
   Solis Academies — North Texas (Dallas) pack
   Four fictional campuses across Oak Cliff, South Dallas, and
   Pleasant Grove. Fully live: Dallas PD Active Calls (~2-min
   dispatch) + NWS. Dispatch is preliminary → MONITOR/ELEVATED only;
   CONFIRMED comes from the daily official incident record.

   Never reference "Veritas" on the Texas side.
   ============================================================ */

import type { Campus, Tenant } from "../types";

export const tenant: Tenant = {
  id: "solis-academies",
  name: "Solis Academies",
  city: "Dallas",
  rulesVersion: "v2.0",
};

export const campuses: Campus[] = [
  {
    id: "tro",
    code: "TRO",
    name: "Trinity Oaks Elementary",
    address: "1200 N Beckley Ave", // Oak Cliff (fictional campus)
    lat: 32.755,
    lon: -96.832,
    students: 540,
    grades: "K-5",
    dismissal: "15:10",
    principal: "D. Salazar",
    alertRingMi: 0.25,
    elevatedRingMi: 0.5,
    geocodeVerified: true,
  },
  {
    id: "cvp",
    code: "CVP",
    name: "Cliff View Prep",
    address: "300 W Jefferson Blvd", // Oak Cliff
    lat: 32.743,
    lon: -96.828,
    students: 610,
    grades: "6-12",
    dismissal: "15:35",
    principal: "R. Okonkwo",
    alertRingMi: 0.25,
    elevatedRingMi: 0.5,
    geocodeVerified: true,
  },
  {
    id: "sdc",
    code: "SDC",
    name: "South Dallas Collegiate",
    address: "3434 Malcolm X Blvd", // South Dallas
    lat: 32.762,
    lon: -96.772,
    students: 588,
    grades: "9-12",
    dismissal: "15:40",
    principal: "T. Jefferson",
    alertRingMi: 0.25,
    elevatedRingMi: 0.5,
    geocodeVerified: true,
  },
  {
    id: "pga",
    code: "PGA",
    name: "Pleasant Grove Academy",
    address: "1150 N Buckner Blvd", // Pleasant Grove
    lat: 32.7845,
    lon: -96.686,
    students: 566,
    grades: "K-8",
    dismissal: "15:20",
    principal: "M. Andrade",
    alertRingMi: 0.25,
    elevatedRingMi: 0.5,
    geocodeVerified: true,
  },
];

export function campusByCode(code: string): Campus | undefined {
  return campuses.find((c) => c.code.toLowerCase() === code.toLowerCase());
}
