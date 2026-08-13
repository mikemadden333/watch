import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/adapters/contract";

/* Logs response-run milestones (initiated · posture set · closed) to the
   append-only record. Watch never dispatches — this only records what the
   school's own team did, stamped as it happened. */

export async function POST(req: Request) {
  let body: { slug?: string; event?: string; evidence?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  const { slug, event, evidence } = body;
  if (!slug || !event) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }
  const res = await logAuditEvent(slug, {
    type: "ACTION",
    event,
    evidence: evidence ?? "Action tab · response run",
  });
  return NextResponse.json({ ok: !res.degraded });
}
