/* ============================================================
   Headline signal extraction — pure, testable.
   From a headline (+ summary) pull: is this a violent incident,
   what kind, and any location cue. Two grades of location:
     · block   — a cross-street or hundred-block ("63rd and Halsted",
                 "6300 block of S Halsted"). Precise enough for a ring.
     · neighborhood — a named community area ("Englewood"). Coarse;
                 useful for context, never for a ring.
   No location → the item is network-scope only.
   ============================================================ */

import { findPlaceIn, CHICAGO_PLACES, type Place } from "./gazetteer";
import { DALLAS_PLACES } from "./gazetteer-dallas";

export type EventType = "homicide" | "shooting" | "stabbing" | "sexual-assault" | "robbery" | "violent";
export type GeoGrade = "block" | "neighborhood" | "city";

/** A city the news-intelligence layer is tuned for: its geocode suffix and
 *  neighborhood gazetteer. Adding a city is adding one entry here. */
export type CityKey = "chicago" | "dallas";

const CITY_CTX: Record<CityKey, { suffix: string; places: Place[] }> = {
  chicago: { suffix: "Chicago, IL", places: CHICAGO_PLACES },
  dallas: { suffix: "Dallas, TX", places: DALLAS_PLACES },
};

export interface Extracted {
  isViolent: boolean;
  eventType: EventType | null;
  /** normalized cross-street/block string to geocode, if present */
  blockCue: string | null;
  /** named neighborhood, if present */
  place: Place | null;
  /** stable content tokens for clustering (event + location + key nouns) */
  tokens: string[];
}

/* ------------------------------------------------------------------
   Serious-violent-crime filter. Deliberately NARROW: the incidents a
   principal must know about — death, gunfire, stabbing, sexual violence,
   armed robbery/carjacking. NOT simple battery, theft, burglary, vandalism,
   or the many non-incident uses of these words (firearms policy, accidental
   death, sports, "today in history", court proceedings, figurative "shot").
   One filter, applied to every news source by headline. ------------------ */

const SERIOUS_RE = new RegExp(
  [
    "murder(?:ed|s)?", "homicide", "manslaughter", "\\bslain\\b", "\\bslaying\\b",
    "shooting", "\\bshot\\b", "shots?\\s+fired", "gunfire", "gunshots?",
    "gunman", "gunmen", "gunpoint", "gunned\\s+down", "opened\\s+fire", "drive[-\\s]?by",
    "\\bkilled\\b", "\\bfatally\\b", "fatal\\s+(?:shooting|stabbing|crash\\b)?",
    "stab(?:bed|bing|s)?", "knife\\s+attack",
    "\\brape[ds]?\\b", "sexual(?:ly)?\\s+assault(?:ed|s)?", "molest(?:ed|ation|s)?",
    "carjack(?:ing|ed|ers?)?", "armed\\s+robbery",
  ].join("|"),
  "i"
);

const EXCLUDE_RE = new RegExp(
  [
    // false-positive incident language
    "no injuries", "\\bhoax\\b", "false alarm", "unfounded",
    // history / anniversary / retrospective (GDELT loves these)
    "today in history", "this day in", "on this day", "\\bin history\\b", "years ago", "throwback",
    // sports
    "\\bMLB\\b", "\\bNFL\\b", "\\bNBA\\b", "\\bNHL\\b", "\\bMLS\\b", "roundup", "standings",
    "scores?\\s+(?:twice|once|\\d)", "home\\s+debut", "playoffs?", "\\bvs\\.?\\b", "matchup",
    // court / aftermath (a proceeding is not an active incident)
    "\\btrial\\b", "verdict", "sentenced", "convicted", "acquitted", "pleads?\\s+guilty",
    "arraigned", "indicted", "lawsuit", "appeals?\\s+court", "years?\\s+in\\s+prison", "parole",
    // firearms policy / politics, not an incident
    "gun\\s+(?:control|law|laws|reform|rights|buy-?back|show|shows|bill|legislation|policy|debate|lobby|permit|permits|owners?|store|shop|range|violence\\s+(?:prevention|summit|rally|awareness|forum|memorial|vigil))",
    // entertainment / figurative
    "video\\s?game", "for\\s+(?:a\\s+)?(?:movie|film|music\\s+video)", "movie\\s+(?:scene|set|shoot)",
    "film(?:ing|\\s+scene|\\s+set)", "stages?\\s+(?:a\\s+)?(?:fake|mock)",
    "murder\\s+mystery", "murder\\s+hornet", "true\\s+crime", "documentary", "podcast",
    "photo\\s?shoot", "flu\\s+shot", "booster\\s+shot", "\\bvaccine\\b",
    "shot\\s+clock", "moon\\s?shot", "screenshot", "big\\s+shot", "long\\s+shot", "shot\\s+put",
    "shot\\s+down\\s+(?:the|a|plans?|proposals?|bids?|rumors?|ideas?|offers?)", "poker",
    // accidental / natural / non-crime death
    "killed\\s+in\\s+(?:a\\s+)?(?:crash|collision|accident|wreck|rollover|fire|dui|derailment|drowning|fall|explosion|storm|tornado|flooding)",
    "(?:car|truck|train|traffic|pedestrian|motorcycle|\\bbus\\b)\\s+(?:crash|accident|collision)", "overdose",
    // low-level property crime
    "shoplift", "\\btheft\\b", "burglar", "larceny", "\\bstolen\\b", "vandal", "catalytic\\s+converter", "porch\\s+pirate",
  ].join("|"),
  "i"
);

/** Is this headline a serious violent-crime incident? One gate for every
 *  news source (GDELT / local news / licensed). */
export function isSeriousViolentCrime(text: string): boolean {
  return SERIOUS_RE.test(text) && !EXCLUDE_RE.test(text);
}

function classify(text: string): EventType | null {
  const t = text.toLowerCase();
  if (/\b(homicide|murder|manslaughter|slain|slaying|killed|fatally|shot\s+(?:dead|and\s+killed|to\s+death))\b/.test(t)) return "homicide";
  if (/\b(rape|raped|sexual(?:ly)?\s+assault|molest)/.test(t)) return "sexual-assault";
  if (/\bstab/.test(t)) return "stabbing";
  if (/\b(shoot|shooting|shot|gunfire|gunshot|gunman|gunmen|gunpoint|gunned|opened\s+fire)/.test(t)) return "shooting";
  if (/\b(carjack|armed\s+robbery)/.test(t)) return "robbery";
  return "violent";
}

/** Serious-crime classification for a headline, or null if it isn't one. */
export function classifyCrime(text: string): EventType | null {
  return isSeriousViolentCrime(text) ? classify(text) : null;
}

// "63rd and Halsted", "63rd & Halsted" — the numbered street must carry an
// ordinal suffix (so a bare "1 and Dec" can't masquerade as a cross-street).
const CROSS_RE = /\b(\d{1,3}(?:st|nd|rd|th))\s*(?:street\s*)?(?:and|&|at)\s*([A-Z][a-z]+)\b/;
// "6300 block of South Halsted", "1400 block of W 79th", "3400 block of
// Malcolm X Blvd" — the directional prefix is optional (Dallas and many
// cities have named streets without N/S/E/W). Comma/period bound the street.
const BLOCK_RE = /\b(\d{3,5})\s*block\s+of\s+((?:[NSEW]\.?\s+)?[A-Za-z0-9][A-Za-z0-9 ]{2,28})/i;
// street name shouldn't be a month/day/common non-street word
const NOT_STREET = new Set([
  "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
  "the", "police", "man", "woman", "there", "here", "chicago",
]);
// where a captured street name really ends (drop trailing prose)
const STREET_END = /\s+(?:in|just|near|after|before|between|where|as|while|when|amid|following|according|early|late|around|about|on|at|for|and|to)\b.*$/i;

function cleanStreet(s: string): string {
  return s.replace(STREET_END, "").replace(/\s{2,}/g, " ").trim();
}

function blockCue(text: string, suffix: string): string | null {
  const b = text.match(BLOCK_RE);
  if (b) {
    const street = cleanStreet(b[2]);
    if (street.length >= 3) return `${b[1]} ${street}, ${suffix}`;
  }
  const c = text.match(CROSS_RE);
  if (c && !NOT_STREET.has(c[2].toLowerCase())) {
    return `${c[1]} and ${c[2]}, ${suffix}`;
  }
  return null;
}

const STOP = new Set(["the", "a", "an", "in", "of", "on", "at", "to", "and", "for", "with", "after", "near", "chicago", "police", "news", "man", "woman", "boy", "girl", "say", "says"]);

export function extract(headline: string, summary = "", city: CityKey = "chicago"): Extracted {
  const ctx = CITY_CTX[city] ?? CITY_CTX.chicago;
  const text = `${headline} ${summary}`;
  const isViolent = isSeriousViolentCrime(text);
  const eventType = isViolent ? classify(text) : null;
  const block = isViolent ? blockCue(text, ctx.suffix) : null;
  const place = isViolent ? findPlaceIn(ctx.places, text) : null;

  const tokens = headline
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

  return { isViolent, eventType, blockCue: block, place, tokens };
}
