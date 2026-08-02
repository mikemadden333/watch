/* Best-effort acknowledgment log. Records that a user accepted the first-run
   "How to use Watch" limitations notice — a timestamped audit row that
   supports the liability posture. Never fails the client: any error just
   means the localStorage record stands on its own. */

import { NextResponse } from "next/server";
import { logAuditEvent } from "@/lib/adapters/contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tenantForPath(path: string): string | null {
  if (path.startsWith("/chicago")) return "veritas-charter";
  if (path.startsWith("/dallas")) return "solis-academies";
  return null;
}

export async function POST(req: Request) {
  let path = "";
  try {
    const body = (await req.json()) as { path?: string };
    path = body.path ?? "";
  } catch {
    /* ignore malformed body */
  }
  const slug = tenantForPath(path);
  const ua = req.headers.get("user-agent")?.slice(0, 180) ?? "unknown";
  if (slug) {
    await logAuditEvent(slug, {
      type: "ACTION",
      event: "Limitations acknowledged · first-run notice accepted",
      evidence: `path ${path} · ${ua}`,
    }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
