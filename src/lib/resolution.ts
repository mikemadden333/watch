/* ============================================================
   Watch v1.1 — resolution messages
   Every ELEVATED/ALERT ends with a closing notification on
   de-escalation: what happened, how it resolved, which rule fired
   and why. Template-filled, NEVER generated. "Perceived accuracy is
   what sustains trust; the resolution message is how a correct alert
   is remembered as correct."
   ============================================================ */

import type { Status } from "./types";

export interface ResolutionInput {
  campusName: string;
  fromStatus: Status; // ELEVATED | ALERT | MONITOR
  ruleId?: string; // "E-2"
  ruleName?: string; // "confirmed-in-ring"
  incidentHeadline?: string;
  occurredLabel?: string; // "yesterday 21:47"
  publishedLabel?: string; // "06:40 today"
  reason: string; // "ring clear + data-day window expiry"
  resolvedLabel: string; // "15:30"
}

/** Build the closing notice. Fixed template — only the fields are
 *  filled in; nothing is model-generated. */
export function buildResolutionMessage(i: ResolutionInput): string {
  const what = i.incidentHeadline
    ? `${i.incidentHeadline}${i.occurredLabel ? ` (occurred ${i.occurredLabel}` : ""}${
        i.publishedLabel ? `, published ${i.publishedLabel})` : i.occurredLabel ? ")" : ""
      }`
    : "the qualifying signal";
  const why = i.ruleId
    ? `Watch raised ${i.fromStatus} on rule ${i.ruleId} (${i.ruleName}).`
    : `Watch raised ${i.fromStatus}.`;
  return (
    `${i.campusName} returned to CLEAR at ${i.resolvedLabel}. ` +
    `What happened: ${what}. ` +
    `${why} ` +
    `How it resolved: ${i.reason}. ` +
    `No further action required — logged to the audit trail.`
  );
}

/** Short one-line variant for a push/SMS resolution notice. */
export function buildResolutionHeadline(i: ResolutionInput): string {
  return `${i.campusName} · ${i.fromStatus} → CLEAR at ${i.resolvedLabel} · ${i.reason}`;
}
