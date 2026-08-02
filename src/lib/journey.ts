/* Derive a provenance journey for incidents that don't carry an authored
   one (e.g. live Dallas dispatch). Plain-language, real timestamps. */

import type { Incident, VerificationStep } from "./types";
import { sourceDisplay } from "./sources";

function hm(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

export function deriveJourney(inc: Incident): VerificationStep[] {
  if (inc.journey?.length) return inc.journey;
  const src = sourceDisplay(inc.source);
  const steps: VerificationStep[] = [];
  if (inc.occurredAt)
    steps.push({ kind: "occurred", label: "Occurred", detail: inc.headline, time: hm(inc.occurredAt) });

  if (inc.tier === "CONFIRMED") {
    steps.push({
      kind: "confirmed",
      label: "Authoritative confirmation",
      detail: `${src.name} · ${src.role}`,
      time: hm(inc.publishedAt),
      tier: "CONFIRMED",
    });
  } else if (inc.tier === "CORROBORATED") {
    steps.push({
      kind: "corroborated",
      label: "Corroboration",
      detail: `${src.name} · ${src.role}`,
      time: hm(inc.publishedAt),
      tier: "CORROBORATED",
    });
  } else {
    steps.push({
      kind: "reported",
      label: "First report",
      detail: `${src.name} · ${src.role}`,
      time: hm(inc.publishedAt),
      tier: "REPORTED",
    });
  }
  if (inc.verifiedBy)
    steps.push({ kind: "verified", label: "Verified by a person", detail: inc.verifiedBy, time: inc.verifiedAt ?? "" });
  return steps;
}
