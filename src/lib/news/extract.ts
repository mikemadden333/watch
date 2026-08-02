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

import { findPlace, type Place } from "./gazetteer";

export type EventType = "homicide" | "shooting" | "stabbing" | "robbery" | "violent";
export type GeoGrade = "block" | "neighborhood" | "city";

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

const VIOLENT_RE = /\b(shot|shots|shoot(?:ing|s)?|gunfire|gun(?:man|men|point)?|homicide|murder|killed|fatally|stab(?:bed|bing)?|armed robbery|carjack)/i;
const NEG_RE = /\b(no injuries|hoax|false alarm|movie|film|game|video game|anniversary)\b/i;

function classify(text: string): EventType | null {
  const t = text.toLowerCase();
  if (/\bhomicide|murder|killed|fatally|dead\b/.test(t)) return "homicide";
  if (/\bstab/.test(t)) return "stabbing";
  if (/\bcarjack|armed robbery|robbed at gunpoint\b/.test(t)) return "robbery";
  if (/\bshot|shoot|gunfire|gun\b/.test(t)) return "shooting";
  if (VIOLENT_RE.test(t)) return "violent";
  return null;
}

// "63rd and Halsted", "63rd & Halsted" — the numbered street must carry an
// ordinal suffix (so a bare "1 and Dec" can't masquerade as a cross-street).
const CROSS_RE = /\b(\d{1,3}(?:st|nd|rd|th))\s*(?:street\s*)?(?:and|&|at)\s*([A-Z][a-z]+)\b/;
// "6300 block of South Halsted", "1400 block of W 79th"
const BLOCK_RE = /\b(\d{3,5})\s*block\s+of\s+([NSEW]\.?\s*[A-Za-z0-9 ]{3,24})/i;
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

function blockCue(text: string): string | null {
  const b = text.match(BLOCK_RE);
  if (b) {
    const street = cleanStreet(b[2]);
    if (street.length >= 3) return `${b[1]} ${street}, Chicago, IL`;
  }
  const c = text.match(CROSS_RE);
  if (c && !NOT_STREET.has(c[2].toLowerCase())) {
    return `${c[1]} and ${c[2]}, Chicago, IL`;
  }
  return null;
}

const STOP = new Set(["the", "a", "an", "in", "of", "on", "at", "to", "and", "for", "with", "after", "near", "chicago", "police", "news", "man", "woman", "boy", "girl", "say", "says"]);

export function extract(headline: string, summary = ""): Extracted {
  const text = `${headline} ${summary}`;
  const isViolent = VIOLENT_RE.test(text) && !NEG_RE.test(text);
  const eventType = isViolent ? classify(text) : null;
  const block = isViolent ? blockCue(text) : null;
  const place = isViolent ? findPlace(text) : null;

  const tokens = headline
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));

  return { isViolent, eventType, blockCue: block, place, tokens };
}
