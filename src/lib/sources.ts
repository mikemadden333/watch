/* ============================================================
   Watch — plain-language source names (design clarity directive)
   The UI speaks English; dataset IDs live only in the Audit evidence
   column. "Chicago Police · official record", not "CPD VR gumc-mgzr".
   ============================================================ */

export interface SourceDisplay {
  name: string; // "Chicago Police"
  role: string; // "official shooting record"
  dataset?: string; // "gumc-mgzr" — shown only in Audit evidence
  tierWord?: "confirms" | "corroborates" | "live";
}

const MAP: { match: RegExp; d: SourceDisplay }[] = [
  { match: /CPD VR|gumc-mgzr/i, d: { name: "Chicago Police", role: "official shooting record", dataset: "gumc-mgzr", tierWord: "confirms" } },
  { match: /CPD Crimes|ijzp-q8t2|crime:/i, d: { name: "Chicago Police", role: "crimes record", dataset: "ijzp-q8t2", tierWord: "confirms" } },
  { match: /Cook County ME|cjeq-bs86|me:/i, d: { name: "Cook County Medical Examiner", role: "official record", dataset: "cjeq-bs86", tierWord: "confirms" } },
  { match: /NWS/i, d: { name: "National Weather Service", role: "live", tierWord: "live" } },
  { match: /Block Club/i, d: { name: "Block Club Chicago", role: "local news", tierWord: "corroborates" } },
  { match: /GDELT/i, d: { name: "GDELT", role: "news wire", tierWord: "corroborates" } },
  { match: /News ?×?2|News \(licensed\)|news:/i, d: { name: "Local news", role: "corroboration", tierWord: "corroborates" } },
  { match: /Dallas PD|9fxf-t2tr/i, d: { name: "Dallas Police", role: "active dispatch", dataset: "9fxf-t2tr", tierWord: "corroborates" } },
  { match: /RSS/i, d: { name: "Local RSS", role: "headlines", tierWord: "corroborates" } },
];

export function sourceDisplay(raw: string): SourceDisplay {
  for (const { match, d } of MAP) if (match.test(raw)) return d;
  return { name: raw, role: "source" };
}

/** "Chicago Police · official record" for chips / inline use. */
export function plainSource(raw: string): string {
  const d = sourceDisplay(raw);
  return `${d.name} · ${d.role}`;
}

/** Plain footer chip labels, keyed by source_health.key. */
const FOOT: Record<string, string> = {
  nws: "Weather",
  news: "Local news",
  gdelt: "News wire",
  cpdvr: "CPD shootings",
  me: "Medical Examiner",
  crimes: "CPD crimes",
  rss: "Local RSS",
  dpd: "Dispatch",
};

export function plainFootLabel(key: string): string {
  return FOOT[key] ?? key.toUpperCase();
}
