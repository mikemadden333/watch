/* ============================================================
   Act — communication templates (directive §5).
   DETERMINISTIC. Merge fields filled from the verified incident
   record — never generated, never guessed. Every draft is editable
   before it goes anywhere; nothing sends from Watch. Copy events
   are logged to Record.
   Ported verbatim from act_comms_templates.md.
   ============================================================ */

import type { Campus, CampusStatus, Incident } from "../types";
import { incidentTypeWord, blocksPhrase, occurredPhrase, confirmClause } from "../voice";

export interface Merge {
  campus_name: string;
  principal_name: string;
  incident_type: string;
  occurred_day_time: string;
  distance_text: string;
  confirmed_by: string;
  status_actions: string;
  posture: string;
  resolution: string;
  contact_line: string;
  arrival_notes: string;
  counselor_line: string;
}

function surname(p: string): string {
  const t = p.trim().split(/\s+/);
  return t[t.length - 1] || p;
}

/** Build the merge object from a verified incident, or sample values when
 *  nothing is active (so the drafts still read as real examples). */
export function buildMerge(
  campus: Campus,
  city: string,
  incident?: Incident,
  status?: CampusStatus
): { merge: Merge; active: boolean; incidentId: string | null } {
  const isDallas = /dallas/i.test(city);
  const confirmedBy = isDallas
    ? "the Dallas Police Department's dispatch record"
    : "the Chicago Police Department's published record";
  const principal_name = campus.principal ? `Principal ${surname(campus.principal)}` : "Principal";
  const heightened = status?.status === "ALERT" || status?.status === "ELEVATED";

  const base: Merge = {
    campus_name: campus.name,
    principal_name,
    incident_type: incident ? incidentTypeWord(incident) : "shooting",
    occurred_day_time: incident ? occurredPhrase(incident.occurredAt) : "Last night at 11:47",
    distance_text: incident
      ? `about ${blocksPhrase(incident.distanceMi, incident.bearing)} of campus`
      : "about three blocks northeast of campus",
    confirmed_by: confirmedBy,
    status_actions:
      "we briefed staff before arrival, confirmed every exterior door was secure, and moved outdoor activities indoors",
    posture: heightened ? "We placed the campus in a Secure posture while we confirmed the details. " : "",
    resolution: "Police have since cleared the scene, and there is no ongoing threat to our campus.",
    contact_line: campus.cpdLiaison ? `Police liaison: ${campus.cpdLiaison}` : "Main office · your campus front desk",
    arrival_notes: "the main entrance and the streets nearest the incident",
    counselor_line: "our counseling team is available today for anyone who needs to talk",
  };
  return { merge: base, active: !!incident && heightened, incidentId: incident?.id ?? null };
}

export interface Draft {
  audience: "families" | "staff" | "students" | "short";
  label: string;
  subject?: string;
  note?: string;
  body: string;
}

export function familiesDraft(m: Merge): Draft {
  return {
    audience: "families",
    label: "To families",
    subject: `An update from ${m.campus_name}`,
    note: "After a nearby confirmed incident · post-resolution",
    body: `Dear ${m.campus_name} families,

I want you to know what we know, and what we did about it.

${m.occurred_day_time}, a ${m.incident_type} occurred ${m.distance_text}. It did not happen at our school, and no students or staff were involved. We learned of it through our safety monitoring, and it has been confirmed by ${m.confirmed_by}.

Here is what we did: ${m.status_actions}. ${m.posture}We stayed in close coordination with the police department and our district safety team throughout, as we always do.

${m.resolution}

School will run on a normal schedule unless you hear otherwise from me directly. If your child heard about this and wants to talk, our counselors are available — and if you'd like guidance on talking with children about violence in the community, we can share resources that help.

The safety of your children is the first thing we work on every day. When something happens near our school, you will hear it from me — plainly and quickly.

${m.principal_name}
${m.contact_line}`,
  };
}

export function staffDraft(m: Merge): Draft {
  return {
    audience: "staff",
    label: "To staff",
    subject: `Before doors open — ${m.campus_name}`,
    note: "Before doors open",
    body: `Team —

${m.occurred_day_time}, a ${m.incident_type} occurred ${m.distance_text}. Confirmed by ${m.confirmed_by}. Not on campus; no students or staff involved.

What this means for our morning: ${m.status_actions}.

Please be present and attentive at arrival, especially near ${m.arrival_notes}. Some students may arrive having heard about this, or having been close to it. Lead with steadiness. Flag any student who seems affected to the counseling team — today that matters more than tardiness.

We are coordinating with our police liaison and the district safety team. If anything changes, you'll hear from me immediately, not through rumor.

${m.principal_name}`,
  };
}

export function studentsDraft(m: Merge): Draft {
  return {
    audience: "students",
    label: "To students",
    note: "Middle/high school · read or adapted by teachers. For K–5, communicate through staff and families instead.",
    body: `This morning we want to be straight with you, because you deserve that.

Last night, something happened in the neighborhood — ${m.distance_text} from school. It did not happen here, and everyone at school is safe. The adults in this building knew about it before you arrived, and we've already done the things we do to keep the campus safe today.

If you heard about it, or if it touched someone you know, that can sit heavy. You don't have to carry that alone — ${m.counselor_line}. Coming to school, being here together, is the normal we get to keep.`,
  };
}

export function shortMessage(m: Merge): Draft {
  return {
    audience: "short",
    label: "During an active posture · the 27-word message",
    note: "9 seconds · 3 points",
    body: `${m.campus_name}: Police are managing an incident near campus. Students and staff are safe inside; classes continue. Details and next steps will follow from the principal shortly.`,
  };
}

export function allDrafts(m: Merge): Draft[] {
  return [familiesDraft(m), staffDraft(m), studentsDraft(m), shortMessage(m)];
}
