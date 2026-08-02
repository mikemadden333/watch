/* ============================================================
   Scheduled sentences (directive §7).
   - 6:40 AM morning briefing — the push subject IS the sentence.
   - 2:15 PM dismissal outlook — one sentence on conditions in the
     90 minutes before release.
   Both deliver in-app always (logged to Record); push/SMS respects
   ELEVATED-tier routing and quiet-window inhibition (informational).
   Sentences come from the deterministic voice engine — never generated.
   ============================================================ */

import { getNetworkData } from "./networkData";
import { ceoBriefing, dismissalOutlook } from "./voice";
import { logAuditEvent } from "./adapters/contract";
import { quietState, DEFAULT_QUIET } from "./delivery";
import { smsConfigured, sendAlertSms } from "./notify/sms";

export const SCHED_SLUGS = ["veritas-charter", "solis-academies"] as const;

export type NoticeKind = "morning" | "dismissal";

export interface NoticeResult {
  slug: string;
  kind: NoticeKind;
  sentence: string;
  active: boolean;
  inApp: boolean;
  pushed: number;
  inhibited: boolean;
}

export async function runScheduledNotice(
  slug: string,
  kind: NoticeKind,
  now = new Date()
): Promise<NoticeResult | null> {
  const data = await getNetworkData(slug);
  if (!data) return null;

  const sentence =
    kind === "morning"
      ? (() => {
          const b = ceoBriefing(data, now);
          return `${b.lead} ${b.key}`;
        })()
      : dismissalOutlook(data);

  const active = data.statuses.some((s) => s.status === "ELEVATED" || s.status === "ALERT");

  // in-app delivery is always logged to Record — the subject line is the sentence
  const subject = kind === "morning" ? "Morning briefing" : "2:15 dismissal outlook";
  const inApp = !(
    await logAuditEvent(slug, {
      type: "DELIVERY",
      event: `${subject} · ${sentence}`,
      evidence: "in-app · informational · push per ELEVATED routing + quiet-window inhibition",
    })
  ).degraded;

  // push/SMS: informational, so quiet windows inhibit it normally
  const quiet = quietState(DEFAULT_QUIET, now).inWindow;
  let pushed = 0;
  let inhibited = false;
  if (quiet) {
    inhibited = true;
  } else if (smsConfigured()) {
    const tenantName = data.tenantName;
    const body = `WATCH — ${tenantName}: ${sentence} Open Watch to see more. Not an emergency service; call 911 in an emergency. Reply STOP to opt out.`;
    const res = await sendAlertSms(body);
    pushed = res.sent;
  }

  return { slug, kind, sentence, active, inApp, pushed, inhibited };
}

export async function runAll(kind: NoticeKind, now = new Date()): Promise<NoticeResult[]> {
  const out: NoticeResult[] = [];
  for (const slug of SCHED_SLUGS) {
    const r = await runScheduledNotice(slug, kind, now);
    if (r) out.push(r);
  }
  return out;
}
