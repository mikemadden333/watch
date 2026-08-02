/* Tenant → adapter-campus registry. Adapters iterate tenants here.
   Chicago (Veritas) ships now; Dallas (Solis) is added with its pack. */

import type { AdapterCampus } from "./contract";
import { campuses as chicagoCampuses, tenant as chicagoTenant } from "../data/chicago";
import { campuses as dallasCampuses, tenant as dallasTenant } from "../data/dallas";

export interface AdapterTenant {
  id: string;
  name: string;
  city: string;
  campuses: AdapterCampus[];
}

function toAdapterCampuses(
  list: { code: string; lat: number; lon: number; alertRingMi: number; elevatedRingMi: number }[]
): AdapterCampus[] {
  return list.map((c) => ({
    code: c.code,
    lat: c.lat,
    lon: c.lon,
    alertRingMi: c.alertRingMi,
    elevatedRingMi: c.elevatedRingMi,
  }));
}

export function adapterTenants(): AdapterTenant[] {
  const tenants: AdapterTenant[] = [
    {
      id: chicagoTenant.id,
      name: chicagoTenant.name,
      city: chicagoTenant.city,
      campuses: toAdapterCampuses(chicagoCampuses),
    },
    {
      id: dallasTenant.id,
      name: dallasTenant.name,
      city: dallasTenant.city,
      campuses: toAdapterCampuses(dallasCampuses),
    },
  ];
  return tenants;
}
