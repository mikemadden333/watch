/* Default emergency response plan — national best practice (SRP 2025 v4.2,
   Standard Reunification Method V3, federal K-12 EOP guidance). A placeholder
   a district replaces with its own plan in Admin. Ported from
   act_response_plan_template.md. Watch is decision support, not dispatch. */

export const DEFAULT_RESPONSE_PLAN = `# Emergency Response Plan — Placeholder Template

> **[PLACEHOLDER — REPLACE WITH YOUR PLAN]** This template reflects national best practice (Standard Response Protocol 2025 v4.2, Standard Reunification Method V3, federal K-12 EOP guidance). It is a starting point. Replace it with your school system's own emergency response plan in Admin → Response Plan. Watch is decision support, not dispatch: your protocol and law enforcement always lead.

## The five actions (Standard Response Protocol)

Watch uses the national SRP vocabulary. Each action has exact public-address language, spoken twice.

**HOLD** — "Hold! In your room or area. Clear the halls." Hallways clear; classes continue in rooms. For localized situations: medical event, altercation, hallway hazard. Released by "All Clear" announcement.

**SECURE** — "Secure! Get inside. Lock outside doors." Threat is OUTSIDE the building. Everyone indoors, perimeter locked, business as usual inside. This is the standard posture for verified violent crime or police activity near campus — Watch's domain. A Secure can outlast the school day; dismissal may shift to controlled release.

**LOCKDOWN** — "Lockdown! Locks, lights, out of sight." Threat is INSIDE the building. Locked doors, lights off, silence. Lockdown is never initiated by Watch and never released by announcement — it ends only with law enforcement opening doors room by room.

**EVACUATE** — "Evacuate! To [location]." Move to a stated location with attendance materials; account for everyone at the destination.

**SHELTER** — "Shelter for [hazard] using [strategy]." Environmental hazards. Never dismiss students into an active tornado or severe thunderstorm warning — hold buses and delay release until the warning clears.

## Graduated response to nearby incidents — default matrix

| Situation near campus | Default posture | Notes |
|---|---|---|
| Confirmed shooting or armed offender, active/unresolved, within the alert ring | SECURE | Suspend outdoor activity and exterior transitions; verify with police liaison; consider controlled release if unresolved at dismissal |
| Shots-fired report, unconfirmed, within earshot / blocks away | SECURE (precautionary) | Initiate without delay; verify; lift on police all-clear |
| Police activity in the area (search, pursuit, perimeter) | SECURE | The textbook Secure trigger; typical duration 1–3 hours, until police all-clear |
| Violent incident nearby, resolved (suspect in custody / scene cleared) | HOLD or normal operations with heightened awareness | Indoor recess as judgment dictates; same-day communication to families |
| Threat crosses onto campus | LOCKDOWN | Immediately; 911; your district plan and police govern from this point |
| Unsafe conditions on walking routes at dismissal | Controlled release / delayed dismissal | Modified pickup; parents remain in vehicles; reunification per your district method if needed |
| Tornado/severe thunderstorm WATCH | Monitor; postpone outdoor activities | Move students out of portable classrooms and large-span rooms |
| Tornado/severe thunderstorm WARNING intersecting campus | SHELTER | Interior windowless spaces; hold dismissal until the warning expires |

## Who decides, and how it ends

- The **school leader** (or designee) initiates Hold and Secure at the campus; any staff member may initiate Lockdown on direct observation of an interior threat.
- **[PLACEHOLDER: your district's notification chain — who the leader calls, in order]**
- External-threat postures are lifted on **police all-clear**, then announced as "All Clear" — never on elapsed time alone.
- **[PLACEHOLDER: your CPD/local police liaison name and number per campus]**
- After any escalation: complete the after-action record. Watch assembles the timeline automatically (what fired, when, who was told, what was done, when it cleared) in the Record tab; attach your team's debrief notes to it.

## Communication timing defaults

- Lockdown or Shelter: immediate multi-channel notification to families (overrides quiet hours).
- Secure or Hold: same-day communication, normally after resolution — use the Act tab drafts.
- During any event: keep messages to ~27 words, 9 seconds, 3 points; the full letter follows after resolution.`;
