/* ============================================================
   Communications — the reference library.
   A district loads examples of its own past communications;
   Watch extracts the traits of that voice and drafts within it.
   Three network-archive examples ship as the default so the
   mechanism is visible from day one. Facts NEVER come from
   references — only voice does. Facts come from the verified
   incident record and are locked.
   ============================================================ */

export interface RefExample {
  id: string;
  title: string;
  date: string;
  kind: "family-letter" | "board-memo" | "urgent-message" | "custom";
  excerpt: string;
  traits: string[]; // what Watch learned from it
  builtin: boolean;
}

export const BUILTIN_REFS: RefExample[] = [
  {
    id: "ref-family-2024",
    title: "Family letter after a nearby incident",
    date: "Network archive · May 2024",
    kind: "family-letter",
    excerpt:
      "“I want you to know what we know, and what we did about it. Yesterday afternoon, a shooting occurred two blocks from our campus…”",
    traits: ["Plain first sentence", "Actions before reassurance", "Principal signs alone", "Counseling named, not implied"],
    builtin: true,
  },
  {
    id: "ref-board-2025",
    title: "Board safety memo",
    date: "Network archive · Feb 2025",
    kind: "board-memo",
    excerpt:
      "“Situation. At 14:22 on Tuesday, February 11, a confirmed armed robbery occurred 0.3 miles from…”",
    traits: ["Fact pattern first", "Timestamps throughout", "Decision-support framing", "Explicit 'no board action required'"],
    builtin: true,
  },
  {
    id: "ref-urgent-2025",
    title: "Urgent message during an active posture",
    date: "Network archive · Sep 2025",
    kind: "urgent-message",
    excerpt:
      "“Police are managing an incident near campus. Students and staff are safe inside; classes continue…”",
    traits: ["~27 words", "Three points, no more", "Next update promised with a time"],
    builtin: true,
  },
];

/** Staged trait extraction for user-pasted examples — deliberately simple,
 *  visibly honest: it reads surface features, it does not claim to "understand". */
export function extractTraits(text: string): string[] {
  const t: string[] = [];
  const words = text.trim().split(/\s+/).length;
  if (/^dear\b/i.test(text.trim())) t.push("Opens 'Dear …'");
  if (words < 60) t.push("Short-form message");
  else if (words > 220) t.push("Full-letter length");
  if (/\b(I|we)\b/.test(text)) t.push("First-person voice");
  if (/counsel/i.test(text)) t.push("Counseling named");
  if (/\d{1,2}:\d{2}/.test(text)) t.push("Uses exact times");
  if (/principal|director|superintendent/i.test(text)) t.push("Leader signs by title");
  if (t.length === 0) t.push("General tone reference");
  return t.slice(0, 4);
}
