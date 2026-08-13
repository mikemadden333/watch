/* ============================================================
   Action — the emergency response runbook.
   A national-standard default (NIMS-aligned school incident
   command, SRP 2025 vocabulary, state drill-act practice) that a
   district REPLACES with its own emergency operations plan at
   onboarding. Structured as phases, not a straight line — real
   incidents don't run in order. Every step completion is stamped
   (actor + time) and the whole run is written to Record on close.
   Watch is decision support, not dispatch.
   ============================================================ */

export type PhaseKey = "assess" | "protect" | "communicate" | "resolve";

export interface RunbookPhase {
  key: PhaseKey;
  label: string;
  lead: string; // one-line explanation under the phase header
}

export interface RunbookStep {
  id: string;
  phase: PhaseKey;
  title: string;
  detail: string;
  role: string; // who owns it, from the school incident-command roles
}

export const PHASES: RunbookPhase[] = [
  {
    key: "assess",
    label: "Assess & activate",
    lead: "Is it credible, and what posture does it demand? Minutes matter; guessing doesn't help.",
  },
  {
    key: "protect",
    label: "Protect & account",
    lead: "Everyone behind locked doors, everyone counted. Nothing else proceeds until this does.",
  },
  {
    key: "communicate",
    label: "Communicate",
    lead: "Staff first, families fast, one voice to the media. Drafts are ready in Communications.",
  },
  {
    key: "resolve",
    label: "Resolve",
    lead: "External postures lift on an authority's all-clear — never on elapsed time.",
  },
];

/** SRP postures with their exact public-address language (spoken twice). */
export const POSTURES: { key: string; pa: string; when: string }[] = [
  { key: "HOLD", pa: "Hold! In your room or area. Clear the halls.", when: "localized situation inside" },
  { key: "SECURE", pa: "Secure! Get inside. Lock outside doors.", when: "threat outside the building" },
  { key: "LOCKDOWN", pa: "Lockdown! Locks, lights, out of sight.", when: "threat inside the building" },
  { key: "EVACUATE", pa: "Evacuate! To the announced location.", when: "building unsafe" },
  { key: "SHELTER", pa: "Shelter for the stated hazard using the stated strategy.", when: "environmental hazard" },
];

export const DEFAULT_RUNBOOK: RunbookStep[] = [
  // ---- assess & activate ----------------------------------------
  {
    id: "a1",
    phase: "assess",
    title: "Confirm what is actually known",
    detail:
      "What happened, where, when, and on whose word. A single unconfirmed report is treated as unconfirmed — act on the posture it warrants, not the rumor.",
    role: "Incident Commander",
  },
  {
    id: "a2",
    phase: "assess",
    title: "Call 911 if there is imminent danger",
    detail: "Police presence needed or any threat to life — call first, coordinate after.",
    role: "Incident Commander",
  },
  {
    id: "a3",
    phase: "assess",
    title: "Set the building posture and announce it",
    detail:
      "Choose Hold / Secure / Lockdown / Evacuate / Shelter above. Use the exact PA language, spoken twice.",
    role: "Incident Commander",
  },
  {
    id: "a4",
    phase: "assess",
    title: "Notify the district safety office and police liaison",
    detail:
      "Your district requires the safety office to know whenever police are called — before or immediately after. They coordinate upward on your behalf.",
    role: "Liaison Officer",
  },
  {
    id: "a5",
    phase: "assess",
    title: "Activate the response team and open the command post",
    detail:
      "Team members report to the incident command post. Classroom teachers on the team are relieved by their designated alternates first.",
    role: "Incident Commander",
  },
  // ---- protect & account ----------------------------------------
  {
    id: "p1",
    phase: "protect",
    title: "Secure the perimeter",
    detail:
      "Exterior doors and windows locked, front entrance monitored, no one in or out. Outdoor activities move inside; exterior transitions suspended.",
    role: "Safety Officer",
  },
  {
    id: "p2",
    phase: "protect",
    title: "Sweep halls, bathrooms, and common areas",
    detail: "Anyone outside a classroom is moved to the nearest securable room while it is safe to do so.",
    role: "Safety Officer",
  },
  {
    id: "p3",
    phase: "protect",
    title: "Account for every person in the building",
    detail:
      "Every class reports attendance. Missing or extra people are flagged to the accounting coordinator immediately — this list drives everything that follows.",
    role: "Search Team Coordinator",
  },
  {
    id: "p4",
    phase: "protect",
    title: "Confirm students and staff who need assistance",
    detail:
      "Everyone requiring physical assistance is accounted for, with their assigned helper, at their designated location or area of rescue assistance.",
    role: "Diverse Needs Coordinator",
  },
  {
    id: "p5",
    phase: "protect",
    title: "Stand up first aid if there are injuries",
    detail: "Treat and stabilize until responders arrive; log every injury for the record.",
    role: "First-Aid Coordinator",
  },
  // ---- communicate -----------------------------------------------
  {
    id: "c1",
    phase: "communicate",
    title: "Brief the staff",
    detail:
      "What we know, what we're doing, what not to say. Staff hear it from you before they hear it from students' phones.",
    role: "Public Information Officer",
  },
  {
    id: "c2",
    phase: "communicate",
    title: "Send the first family message",
    detail:
      "~27 words, 9 seconds, 3 points: what's happening, students are safe, next update coming. The draft is ready in the Communications tab.",
    role: "Public Information Officer",
  },
  {
    id: "c3",
    phase: "communicate",
    title: "Notify network leadership and the board",
    detail:
      "Leadership hears it from you, not from the news. The board memo draft is ready in the Communications tab.",
    role: "Incident Commander",
  },
  {
    id: "c4",
    phase: "communicate",
    title: "Route all media to one voice",
    detail:
      "The PIO speaks; no one else does. Media do not reach students or staff. A staging area is designated away from entrances.",
    role: "Public Information Officer",
  },
  // ---- resolve ---------------------------------------------------
  {
    id: "r1",
    phase: "resolve",
    title: "Receive the authority's all-clear",
    detail:
      "Police or responding agency confirms the situation is resolved. External postures never lift on elapsed time alone.",
    role: "Liaison Officer",
  },
  {
    id: "r2",
    phase: "resolve",
    title: "Announce All Clear and set the dismissal plan",
    detail:
      "Normal schedule, delayed dismissal, or controlled release — decide with the facts, adjust transportation and walking routes, and say it once, clearly.",
    role: "Incident Commander",
  },
  {
    id: "r3",
    phase: "resolve",
    title: "Send the full follow-up to families",
    detail:
      "The complete letter: what happened, what you did, what happens tomorrow. Counseling availability named. Draft ready in Communications.",
    role: "Public Information Officer",
  },
  {
    id: "r4",
    phase: "resolve",
    title: "Flag affected students to the counseling team",
    detail:
      "Anyone who was close to it, knew someone involved, or arrived carrying it. Today that matters more than tardiness.",
    role: "Incident Commander",
  },
];

/** After-action review — asked at close-out, answered yes / no / n/a.
 *  The run cannot close without it; the answers are part of the record. */
export const AAR_QUESTIONS: string[] = [
  "Was the emergency reported to everyone who needed to know?",
  "Did staff understand their roles and responsibilities?",
  "Did students, staff, and visitors get clear, accurate information?",
  "Could responding authorities reach and enter the site easily?",
  "Were injuries handled properly?",
  "Were public statements managed through one voice?",
  "Was the response documented as it happened?",
];

export function stepsFor(phase: PhaseKey): RunbookStep[] {
  return DEFAULT_RUNBOOK.filter((s) => s.phase === phase);
}
