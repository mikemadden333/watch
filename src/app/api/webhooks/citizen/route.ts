/* ============================================================
   Citizen Enterprise webhook — POST /api/webhooks/citizen
   The one push-based ingress. Dark until CITIZEN_WEBHOOK_SECRET is
   configured (returns 503 · not contracted). When live, verifies the
   shared secret, normalizes the incident, and idempotently upserts it
   for the tenant named in the payload (?tenant=slug or body.tenant).
   ============================================================ */

import { NextResponse } from "next/server";
import { citizenContracted, normalizeCitizen, type CitizenPayload } from "@/lib/adapters/citizen";
import { attachGeometry, persistIncidents } from "@/lib/adapters/contract";
import { adapterTenants } from "@/lib/adapters/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // health probe
  return NextResponse.json({
    slot: "citizen-webhook",
    contracted: citizenContracted(),
    note: citizenContracted()
      ? "live · verified-incident stream active"
      : "OFF · not contracted — set CITIZEN_WEBHOOK_SECRET to enable",
  });
}

export async function POST(req: Request) {
  if (!citizenContracted()) {
    return NextResponse.json({ error: "citizen not contracted" }, { status: 503 });
  }
  const secret = process.env.CITIZEN_WEBHOOK_SECRET!;
  const provided = req.headers.get("x-citizen-signature") || new URL(req.url).searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: (CitizenPayload & { tenant?: string }) | CitizenPayload[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const tenantSlug =
    new URL(req.url).searchParams.get("tenant") ||
    (Array.isArray(body) ? undefined : body.tenant) ||
    adapterTenants().find((t) => t.city === "Chicago")?.id;
  const tenant = adapterTenants().find((t) => t.id === tenantSlug);
  if (!tenant) return NextResponse.json({ error: "unknown tenant" }, { status: 400 });

  const payloads = Array.isArray(body) ? body : [body];
  const normalized = payloads
    .map((p) => normalizeCitizen(p))
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const withGeo = attachGeometry(normalized, tenant.campuses);
  const persisted = await persistIncidents(tenant.id, withGeo);

  return NextResponse.json({
    received: payloads.length,
    persisted: persisted.persisted,
    degraded: persisted.degraded,
  });
}
