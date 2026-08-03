/* ============================================================
   Watch — Privacy Policy, Terms of Service, and SMS/messaging
   program disclosures. DRAFT language for counsel review.

   These pages exist in large part to satisfy A2P 10DLC campaign
   registration (Twilio): a public privacy policy (error 30908), a
   public terms of service (30882), and a described opt-in / consent
   flow with message frequency, "message & data rates," STOP/HELP,
   and the explicit "we do not share mobile opt-in data for marketing"
   language (30909). Keep the URLs stable — they are submitted to the
   carrier campaign.
   ============================================================ */

import { COMPANY } from "./legal";

export const LEGAL_EFFECTIVE = "August 2026";
export const CONTACT_EMAIL = "privacy@maddeneducationadvisory.com";
export const SUPPORT_EMAIL = "support@maddeneducationadvisory.com";

export interface LegalSection {
  heading: string;
  body?: string;
  bullets?: string[];
}
export interface LegalDoc {
  title: string;
  intro: string;
  sections: LegalSection[];
}

/* ---------------- Privacy Policy ---------------- */

export const PRIVACY: LegalDoc = {
  title: "Privacy Policy",
  intro: `${COMPANY} ("Madden Education Advisory," "we," "us") operates Watch, a decision-support tool for K–12 school networks. This policy explains what information we collect from the authorized users of Watch, how we use it, and the choices you have. It covers our text-message (SMS) program in its own section below.`,
  sections: [
    {
      heading: "Who this policy is for",
      body: "Watch is a business tool used by the leaders and staff of subscribing school networks. It is not a consumer product and is not directed to children. We do not knowingly collect information from students or from anyone under 13.",
    },
    {
      heading: "Information we collect",
      bullets: [
        "Account and contact information for authorized users — name, work email, role, and (only if you opt in to alerts) a mobile phone number.",
        "Usage and audit records — the actions taken in Watch, timestamps, and the source records behind each status, kept as an append-only log.",
        "Public safety information we ingest about incidents near your campuses (for example police and medical-examiner records, weather alerts, and news reporting). This describes public events, not our users.",
      ],
    },
    {
      heading: "What we do not collect",
      body: "We do not collect student personally identifiable information. We do not track the location of any individual. We do not build advertising profiles, and we do not sell personal information to anyone.",
    },
    {
      heading: "How we use information",
      bullets: [
        "To provide Watch — to authenticate users, present briefings, and deliver the notifications you have asked to receive.",
        "To maintain the integrity and audit trail of the service.",
        "To secure the service and to comply with law.",
      ],
    },
    {
      heading: "SMS / text-message data",
      body: "If you opt in to Watch text alerts, we collect your mobile number solely to deliver the safety notifications you requested. No mobile information (including your phone number and your SMS opt-in or consent) is shared with, sold to, or rented to any third party or affiliate for their marketing or promotional purposes. Your number is disclosed only to our messaging provider, Twilio, and only for the purpose of transmitting the messages you asked to receive. You can stop the messages at any time by replying STOP.",
    },
    {
      heading: "How we share information",
      body: "We share information only with service providers who help us operate Watch (such as our hosting, database, and messaging providers), under contracts that limit them to that purpose; and where required by law. We do not share personal information for third-party marketing.",
    },
    {
      heading: "Retention and security",
      body: "We keep audit records for as long as needed to provide the service and to meet the record-keeping expectations of a safety tool, then delete or de-identify them. We protect information with encryption in transit, access controls scoped to each school network, and least-privilege practices. No system is perfectly secure.",
    },
    {
      heading: "Your choices",
      body: "You may access or correct your account information, opt out of text alerts at any time (reply STOP, or ask your administrator), and request deletion of your personal information, subject to the record-keeping needs of the service and applicable law.",
    },
    {
      heading: "Changes and contact",
      body: `We may update this policy; material changes will be reflected by a new effective date. Questions or requests: ${CONTACT_EMAIL}.`,
    },
  ],
};

/* ---------------- Terms of Service ---------------- */

export const TERMS: LegalDoc = {
  title: "Terms of Service",
  intro: `These terms govern access to and use of Watch, provided by ${COMPANY}. By using Watch you agree to these terms. If you are using Watch on behalf of a school network, you agree on its behalf.`,
  sections: [
    {
      heading: "What Watch is — and is not",
      body: "Watch is a decision-support tool that organizes publicly available safety information against your campuses. It is not a security, surveillance, emergency-response, or life-safety system. It does not detect, monitor in real time, prevent, interrupt, or respond to any incident, and it cannot capture every event. A “Clear” status is not a guarantee of safety. See our published Limitations, which are part of these terms.",
    },
    {
      heading: "Emergencies",
      body: "In an emergency, always call 911 and follow the protocols of your school, district, and local authorities. Watch cannot summon help and never instructs a lockdown or any specific action; all safety decisions and actions remain the responsibility of the school and its personnel.",
    },
    {
      heading: "Accounts and acceptable use",
      body: "Access is limited to authorized personnel of subscribing school networks. Keep your credentials confidential. Do not misuse the service, attempt to access data belonging to another network, or use Watch to harass, profile, or stigmatize any individual, block, or community.",
    },
    {
      heading: "Text messages",
      body: "Watch offers an optional SMS alert program. By opting in you agree to the messaging terms described on our Messaging page, including that message and data rates may apply and that you may opt out at any time by replying STOP.",
    },
    {
      heading: "Intellectual property",
      body: `Watch, including its software, design, and content, is owned by ${COMPANY} and provided to you under a limited, non-transferable right to use the service for its intended purpose. The public safety data itself belongs to its respective sources.`,
    },
    {
      heading: "Disclaimers and limitation of liability",
      body: `Watch is provided “as is” and “as available,” without warranties of any kind, express or implied, including accuracy, completeness, timeliness, availability, or fitness for a particular purpose. To the fullest extent permitted by law, ${COMPANY} disclaims all liability for any loss, injury, or damage arising from any decision made, or action taken or not taken, in reliance on Watch. These in-product terms support but do not replace the limitation-of-liability and warranty terms in the customer agreement.`,
    },
    {
      heading: "Termination and governing law",
      body: "We may suspend or end access for misuse or as required by law or contract. These terms are governed by the laws of the State of Illinois, without regard to conflict-of-laws rules.",
    },
    {
      heading: "Contact",
      body: `Questions about these terms: ${SUPPORT_EMAIL}.`,
    },
  ],
};

/* ---------------- SMS / Messaging program ---------------- */

export const MESSAGING: LegalDoc = {
  title: "Text-message alerts",
  intro:
    "Watch Safety Alerts is an optional text-message program for the authorized leaders and staff of subscribing school networks. It delivers safety notifications and scheduled briefings about verified public-safety signals near your campuses. This page describes the program, how consent works, and how to stop.",
  sections: [
    {
      heading: "What you receive",
      bullets: [
        "Incident alerts — when a campus escalates to ALERT because a verified incident qualifies near it.",
        "Scheduled briefings — an optional morning briefing and a pre-dismissal outlook.",
        "Every message points you back to Watch to verify and includes a 911 reminder.",
      ],
    },
    {
      heading: "How you opt in (consent)",
      body: "Only authorized personnel of a subscribing school network can enroll. You opt in during account onboarding by providing your mobile number and affirmatively agreeing to receive Watch text alerts — by checking the (un-checked by default) consent box on the onboarding form, or by confirming enrollment with your network administrator. Consent to receive texts is not a condition of any purchase, and enrollment is never bought, sold, or shared for marketing.",
    },
    {
      heading: "Message frequency",
      body: "Frequency varies by conditions on the blocks around your campuses. On quiet days you may receive few or no messages; during an active incident you may receive several in a day.",
    },
    {
      heading: "Cost",
      body: "Message and data rates may apply, according to your mobile carrier plan. Watch does not charge for the messages.",
    },
    {
      heading: "How to stop or get help",
      body: "Reply STOP to any message to unsubscribe at any time; you will receive one confirmation and no further messages. Reply HELP for help, or contact us at " + SUPPORT_EMAIL + ". You can also ask your network administrator to remove your number.",
    },
    {
      heading: "Privacy",
      body: "We collect your mobile number only to send the alerts you requested. No mobile information (including your number and your opt-in) is shared with third parties or affiliates for marketing or promotional purposes; it is disclosed only to our messaging provider to transmit the messages. See our Privacy Policy.",
    },
    {
      heading: "Sample messages",
      bullets: [
        "WATCH ALERT — Garfield Park Academy: Confirmed shooting 2 blocks NE (occurred 6:41 AM). Open Watch to verify. In an emergency call 911; not a guarantee of safety. — Madden Education Advisory. Reply STOP to opt out.",
        "WATCH — Good morning. All six campuses are clear. Open Watch for the full briefing.",
      ],
    },
  ],
};

/** Plain-text "Message Flow" / opt-in description to paste into the Twilio
 *  A2P campaign registration (Campaign & Use-Case → Message Flow). */
export const A2P_MESSAGE_FLOW = `End users are the authorized leaders and staff of a subscribing K-12 school network. They provide consent to receive SMS during account onboarding by entering their mobile number and affirmatively checking a consent checkbox (unchecked by default) that reads: "I agree to receive Watch safety-alert text messages at this number. Message and data rates may apply. Message frequency varies. Reply STOP to cancel, HELP for help." The opt-in web form and the program details are published at https://<domain>/messaging, the privacy policy at https://<domain>/privacy, and the terms at https://<domain>/terms. Consent is not a condition of purchase, and mobile opt-in data is never shared with third parties or affiliates for marketing. Messages are transactional safety notifications (incident alerts and scheduled campus briefings). Users can opt out anytime by replying STOP and get help by replying HELP.`;
