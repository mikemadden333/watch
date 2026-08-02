/* ============================================================
   Watch — legal / liability copy, centralized.
   DRAFT language for counsel review. This is the single place to edit
   the words; every surface (splash line, first-run acknowledgment,
   persistent footer, Limitations page) reads from here so the wording
   stays consistent and a lawyer can bless one file.

   NOTE: in-product notices support but do NOT replace the contractual
   limitation-of-liability / disclaimer-of-warranties / indemnification
   terms in the customer agreement. That contract is the primary shield.
   ============================================================ */

export const COMPANY = "Madden Education Advisory, LLC";

/** One line, always visible in the footer of every screen. */
export const FOOTER_DISCLAIMER =
  "Decision support, not a safety system. Publicly sourced — may be incomplete or delayed; the absence of an incident is not a guarantee of safety. In an emergency, call 911 and follow district protocol.";

/** Single quiet line for the splash / city-select. */
export const SPLASH_DISCLAIMER =
  "Decision support for school safety — not a guarantee.";

/** First-run acknowledgment card, shown once, recorded on accept. */
export const FIRST_RUN = {
  title: "How to use Watch",
  points: [
    "Watch consolidates **publicly available** information — police and medical-examiner records, weather alerts, and local news — to support your safety decisions.",
    "It is **not** a security or emergency system. It cannot capture every incident, and its sources can be delayed or incomplete. **A “Clear” status is not a guarantee of safety.**",
    "In an emergency, call **911** and follow your district’s protocols. Watch supports your judgment — it never replaces it, and it never guarantees safety.",
  ],
  accept: "I understand — continue",
} as const;

/** Full Limitations page — the legally-oriented text. */
export const LIMITATIONS: { heading: string; body: string }[] = [
  {
    heading: "What Watch is",
    body: "Watch consolidates publicly available safety information — including police and medical-examiner records, National Weather Service alerts, and local news reporting — and organizes it against your campuses so school leaders can make better-informed decisions. Every item shows its source, its verification tier, and its timing.",
  },
  {
    heading: "What Watch is not",
    body: "Watch is a decision-support tool. It is not a security, surveillance, emergency-response, or life-safety system. It does not detect, monitor in real time, prevent, interrupt, or respond to any incident, and it cannot and does not capture every event.",
  },
  {
    heading: "Sources may be incomplete or delayed",
    body: "The information in Watch comes from third-party public sources that Watch does not control and that may be delayed, incomplete, inaccurate, superseded, or entirely unavailable. The absence of an incident in Watch does not mean that none has occurred. A “Clear” status reflects only the absence of qualifying signals in the sources Watch reads — it is not a determination that any place is safe.",
  },
  {
    heading: "Your responsibilities",
    body: "Watch supports professional judgment; it does not replace it. In an emergency, always call 911 and follow the protocols of your school, district, and local authorities. All safety decisions, communications, and actions remain the sole responsibility of the school and its personnel. Watch never instructs a lockdown or any specific action.",
  },
  {
    heading: "No warranty; limitation of liability",
    body: `Watch is provided “as is” and “as available,” without warranties of any kind, express or implied, including any warranty of accuracy, completeness, timeliness, availability, or fitness for a particular purpose. No monitoring or detection system is complete or infallible. To the fullest extent permitted by law, ${COMPANY} disclaims all liability for any loss, injury, or damage arising from any decision made, or action taken or not taken, in reliance on Watch or the information it presents.`,
  },
];

/** Strengthened version of the on-page permanent disclaimer. */
export const PERMANENT_DISCLAIMER =
  "Decision support, not dispatch. Watch never instructs lockdown — defer to police and district protocol. Publicly sourced and may be incomplete; the absence of an incident is not a guarantee of safety. In an emergency, call 911.";
