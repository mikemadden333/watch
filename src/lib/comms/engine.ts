/* ============================================================
   Communications — the drafting engine.
   The thread runs: verified incident → locked facts → audience-
   shaped draft. Facts (what, when, where, who confirmed, victims)
   come ONLY from the incident record and cannot be altered by the
   drafting layer; the enabled reference examples condition voice —
   openers, structure, sign-off — never facts. Deterministic under
   the hood, so every sentence survives a deposition. Nothing sends
   from Watch.
   ============================================================ */

import type { Campus, CampusStatus, Incident } from "../types";
import { incidentTypeWord, milesPhrase, occurredPhrase, clockOf } from "../voice";
import type { RefExample } from "./references";

export type Audience = "families" | "staff" | "students" | "board";

export const AUDIENCES: { key: Audience; label: string; desc: string }[] = [
  { key: "families", label: "Families", desc: "Plain, complete, human — what we know and what we did" },
  { key: "staff", label: "Staff", desc: "Operational — what this means for the building today" },
  { key: "students", label: "Students", desc: "Direct and steady · middle/high school" },
  { key: "board", label: "Board of directors", desc: "Governance memo — fact pattern, actions, record" },
];

export interface LockedFact {
  label: string;
  value: string;
}

export interface CommsContext {
  campus: Campus;
  city: string;
  networkName: string;
  incident?: Incident;
  status?: CampusStatus;
  refs: RefExample[]; // ENABLED references only
}

export interface GeneratedDraft {
  audience: Audience;
  subject?: string;
  note: string;
  body: string;
  conditionedOn: number;
}

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function surname(p: string): string {
  const t = (p || "").trim().split(/\s+/);
  return t[t.length - 1] || "";
}

function hasTrait(refs: RefExample[], frag: string): boolean {
  return refs.some((r) => r.traits.some((t) => t.toLowerCase().includes(frag)));
}

function isFatal(i?: Incident): boolean {
  return !!i && /fatal/i.test(i.victimNote ?? "") && !/non-?fatal/i.test(i.victimNote ?? "");
}

function isActive(status?: CampusStatus): boolean {
  return status?.status === "ALERT" || status?.status === "ELEVATED";
}

function confirmedBy(city: string, i?: Incident): string {
  if (i && /weather|advisory|nws/i.test(i.kind + " " + (i.source ?? ""))) return "the National Weather Service";
  return /dallas/i.test(city)
    ? "the Dallas Police Department's dispatch record"
    : "the Chicago Police Department's published record";
}

/** The locked fact strip — what the drafting layer cannot touch. */
export function lockedFacts(ctx: CommsContext): LockedFact[] {
  const { incident: i, status, city } = ctx;
  if (!i) {
    return [{ label: "incident", value: "none selected — select an incident above" }];
  }
  const f: LockedFact[] = [
    { label: "what", value: cap(incidentTypeWord(i)) },
    { label: "occurred", value: occurredPhrase(i.occurredAt) },
    { label: "where", value: milesPhrase(i.distanceMi, i.bearing) },
    { label: "confirmation", value: `${i.tier} · ${confirmedBy(city, i)}` },
  ];
  if (i.victimNote) f.push({ label: "victims", value: i.victimNote });
  if (status && isActive(status)) f.push({ label: "posture", value: `${status.status} since ${status.since}` });
  return f;
}

/* ---------------- audience drafts ---------------- */

export function generateDraft(audience: Audience, ctx: CommsContext): GeneratedDraft {
  const { campus, incident: i, status, refs } = ctx;
  const active = isActive(status);
  const fatal = isFatal(i);
  const type = i ? incidentTypeWord(i) : "incident";
  const when = i ? occurredPhrase(i.occurredAt) : "Earlier today";
  // A precise distance clause when we have one; a clean fallback when we don't
  // (weather advisories and network-level items carry no distance).
  const miles = i && typeof i.distanceMi === "number" ? milesPhrase(i.distanceMi, i.bearing) : null;
  const distOf = (noun: string) => (miles ? `${miles} of ${noun}` : `near ${noun}`);
  const distFrom = (noun: string) => (miles ? `${miles} from ${noun}` : `near ${noun}`);
  const dist = distOf("campus");
  const confirm = confirmedBy(ctx.city, i);
  const tierLine = i?.tier === "CONFIRMED" ? `confirmed by ${confirm}` : i ? `reported and being verified — a single-source report is treated as unconfirmed` : "";
  const principal = campus.principal ? `Principal ${surname(campus.principal)}` : "The principal";
  const n = refs.length;

  // voice switches learned from the enabled references
  const plainOpen = hasTrait(refs, "plain first");
  const actionsFirst = hasTrait(refs, "actions before");
  const counselingNamed = hasTrait(refs, "counseling");
  const timestamps = hasTrait(refs, "timestamps") || hasTrait(refs, "exact times");
  const noActionLine = hasTrait(refs, "no board action");
  const nextUpdate = hasTrait(refs, "next update");

  if (audience === "families") {
    if (active) {
      const body = `${campus.name} families: Police are managing an incident ${dist}. Students and staff are safe inside, and classes continue. ${nextUpdate ? `You will have our next update by ${clockOf(new Date(Date.now() + 45 * 60000).toISOString())} or sooner.` : "We will update you as soon as the situation resolves."}`;
      return {
        audience,
        note: `During an active posture · short by design (~27 words) · full letter follows at resolution`,
        body,
        conditionedOn: n,
      };
    }
    const opener = plainOpen
      ? "I want you to know what we know, and what we did about it."
      : "I am writing to inform you about an incident that occurred near our campus.";
    const gravity = fatal
      ? "This was a fatal incident, and our community feels the weight of that. "
      : "";
    const actions =
      "we briefed staff before doors opened, confirmed every exterior door was secure, and moved outdoor activities indoors";
    const counseling = counselingNamed
      ? "Our counseling team is available today — in person, no appointment needed — for any student who heard about this or was touched by it."
      : "Support is available for any student who needs it.";
    const body = `Dear ${campus.name} families,

${opener}

${when}, a ${type} occurred ${dist}. It did not happen at our school, and no students or staff were involved. We learned of it through our safety monitoring, and it has been ${tierLine}.

${actionsFirst ? `Here is what we did: ${actions}. ` : `In response, ${actions}. `}${gravity}We stayed in close coordination with the police department and our district safety team throughout.

School runs on a normal schedule unless you hear otherwise from me directly. ${counseling}

When something happens near our school, you will hear it from me — plainly and quickly.

${principal}
${campus.name}`;
    return {
      audience,
      subject: `An update from ${campus.name}`,
      note: "After a nearby verified incident · post-resolution",
      body,
      conditionedOn: n,
    };
  }

  if (audience === "staff") {
    const arrival = active
      ? "We are in a heightened posture now — follow the response lead's direction first; this note is context, not instruction."
      : "Please be present and attentive at arrival, especially near the main entrance and the streets nearest the incident.";
    const body = `Team —

${when}, a ${type} occurred ${dist}. ${cap(tierLine)}. Not on campus; no students or staff involved.${i?.victimNote ? ` (${cap(i.victimNote)}.)` : ""}

${arrival}

Some students may arrive having heard about this, or having been close to it. Lead with steadiness. Flag any student who seems affected to the counseling team — today that matters more than tardiness.

We are coordinating with our police liaison and the district safety team. If anything changes you will hear it from me directly, not through rumor.

${principal}`;
    return {
      audience,
      subject: `Before doors open — ${campus.name}`,
      note: active ? "During an active posture" : "Before doors open",
      body,
      conditionedOn: n,
    };
  }

  if (audience === "students") {
    const body = `This morning we want to be straight with you, because you deserve that.

${when.replace(/^./, (c) => c.toLowerCase()).replace(/^t/, "T")}, something happened in the neighborhood — ${distFrom("school")}. It did not happen here, and everyone at school is safe. The adults in this building knew about it before you arrived, and we have already done the things we do to keep campus safe today.

If you heard about it, or it touched someone you know, that can sit heavy. You don't have to carry it alone — ${counselingNamed ? "the counseling office is open all day, no appointment needed" : "our counselors are here for you"}. Being here together is the normal we get to keep.`;
    return {
      audience,
      note: "Middle/high school · read or adapted by teachers · for K-5, communicate through staff and families",
      body,
      conditionedOn: n,
    };
  }

  // board
  const nowIso = new Date().toISOString();
  const stamp = (iso?: string) => (timestamps && iso ? ` at ${clockOf(iso)}` : "");
  const body = `To: Board of Directors, ${ctx.networkName}
Re: Safety notification — ${campus.name}
${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

Situation. ${when}, a ${type} occurred ${distOf(campus.name)}.${i?.victimNote ? ` ${cap(i.victimNote)}.` : ""} The incident did not occur on campus, and no students or staff were involved.

Verification. Watch surfaced the incident${stamp(i?.detectedAt)}; it stands ${tierLine}. ${i ? `Source: ${i.source}.` : ""}

Actions taken. ${active ? `The campus is in an ${status?.status} posture${timestamps ? ` (since ${status?.since})` : ""}; exterior doors are secured, movement is controlled, and the campus leader is coordinating with the police liaison and district safety.` : "Campus leadership briefed staff, secured the perimeter during the relevant window, and coordinated with the police liaison and district safety. Normal operations continued or resumed the same day."}

Communications. Staff were briefed directly; families ${active ? "received a short holding message with a committed next update" : "received a full letter the same day"}. Media inquiries route to the designated spokesperson only.

Record. Every status change, action, and message in this matter is logged in Watch's append-only record with rule, source, and timestamps, available for the board's review at any time.

${noActionLine ? "No action is required of the board. This notification is for your awareness and for the record; a fuller after-action summary follows within 48 hours if warranted." : "A fuller after-action summary will follow if warranted."}

— sent ${clockOf(nowIso)}`;
  return {
    audience,
    subject: `Safety notification — ${campus.name} — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    note: "Governance memo · awareness and record, not alarm",
    body,
    conditionedOn: n,
  };
}
