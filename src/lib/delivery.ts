/* ============================================================
   Watch v1.1 — notification delivery decision (quiet windows)
   Pure, deterministic. Given a status/tier, a campus's quiet-window
   config, and the current time, decide whether a notification is
   delivered now, held until the window ends, or in-app only.

   Rules (from the Notification Contract):
     ALERT     → always delivers (push + SMS + email); during a quiet
                 window it breaks through, and that override is logged.
     ELEVATED  → push + email; HELD during a quiet window.
     MONITOR   → in-app only, never pushes; HELD during a quiet window.
     CLEAR     → no notification.

   Both current tenants (Chicago, Dallas) are Central Time; window
   times are compared in America/Chicago. Per-campus timezones can be
   added later without changing callers.
   ============================================================ */

import type { Status } from "./types";

export interface QuietWindowConfig {
  quietWindowsEnabled: boolean;
  arrivalStart: string; // "07:00"
  arrivalEnd: string; // "08:15"
  dismissalStart: string; // "14:45"
  dismissalEnd: string; // "15:45"
}

export const DEFAULT_QUIET: QuietWindowConfig = {
  quietWindowsEnabled: true,
  arrivalStart: "07:00",
  arrivalEnd: "08:15",
  dismissalStart: "14:45",
  dismissalEnd: "15:45",
};

export type DeliveryAction = "deliver" | "hold" | "in-app" | "none";

export interface DeliveryDecision {
  action: DeliveryAction;
  tier: Status;
  channels: ("push" | "sms" | "email")[];
  /** which quiet window is active, if any */
  windowKind?: "arrival" | "dismissal";
  /** for held notices: local time the window ends (delivery time) */
  releaseAtLocal?: string;
  /** true when an ALERT overrode an active quiet window */
  quietOverridden?: boolean;
  reason: string;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Minutes-since-midnight in America/Chicago for a given instant. */
export function centralMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return h * 60 + m;
}

export interface QuietState {
  inWindow: boolean;
  kind?: "arrival" | "dismissal";
  endLocal?: string;
}

export function quietState(cfg: QuietWindowConfig, now: Date): QuietState {
  if (!cfg.quietWindowsEnabled) return { inWindow: false };
  const nm = centralMinutes(now);
  if (nm >= toMinutes(cfg.arrivalStart) && nm < toMinutes(cfg.arrivalEnd))
    return { inWindow: true, kind: "arrival", endLocal: cfg.arrivalEnd };
  if (nm >= toMinutes(cfg.dismissalStart) && nm < toMinutes(cfg.dismissalEnd))
    return { inWindow: true, kind: "dismissal", endLocal: cfg.dismissalEnd };
  return { inWindow: false };
}

export function decideDelivery(
  tier: Status,
  cfg: QuietWindowConfig,
  now: Date
): DeliveryDecision {
  const q = quietState(cfg, now);

  if (tier === "ALERT") {
    return {
      action: "deliver",
      tier,
      channels: ["push", "sms", "email"],
      windowKind: q.kind,
      quietOverridden: q.inWindow,
      reason: q.inWindow
        ? `ALERT breaks through the ${q.kind} quiet window (only ALERTs do)`
        : "ALERT · push + SMS + email, quiet hours overridden by policy",
    };
  }

  if (tier === "CLEAR") {
    return { action: "none", tier, channels: [], reason: "CLEAR · no notification" };
  }

  // MONITOR / ELEVATED
  if (q.inWindow) {
    return {
      action: "hold",
      tier,
      channels: [],
      windowKind: q.kind,
      releaseAtLocal: q.endLocal,
      reason: `${tier} held during ${q.kind} quiet window · delivers ${q.endLocal}`,
    };
  }

  if (tier === "ELEVATED") {
    return {
      action: "deliver",
      tier,
      channels: ["push", "email"],
      reason: "ELEVATED · push + email, quiet hours respected",
    };
  }

  // MONITOR
  return {
    action: "in-app",
    tier,
    channels: [],
    reason: "MONITOR · in-app only, never pushes",
  };
}

/** Audit-line text for a held/suppressed or overriding delivery. */
export function deliveryAuditText(campusCode: string, d: DeliveryDecision): string {
  if (d.action === "hold")
    return `${campusCode} · ${d.tier} notification HELD · ${d.windowKind} quiet window · releases ${d.releaseAtLocal}`;
  if (d.action === "in-app")
    return `${campusCode} · ${d.tier} in-app only · no push at MONITOR tier`;
  if (d.action === "deliver" && d.quietOverridden)
    return `${campusCode} · ALERT delivered · ${d.windowKind} quiet window overridden by policy`;
  if (d.action === "deliver")
    return `${campusCode} · ${d.tier} delivered · ${d.channels.join(" + ")}`;
  return `${campusCode} · no notification`;
}
