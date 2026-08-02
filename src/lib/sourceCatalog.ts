/* Plain-English description of every data source, per city. Powers the
   Sources page. No jargon; dataset IDs stay in the Audit evidence. */

export interface SourceCard {
  name: string; // "Chicago Police · official shooting record"
  role: "Confirms" | "Corroborates" | "Live weather" | "Dispatch";
  what: string; // what it is
  provides: string; // what it gives Watch
  latency: string; // expected latency in plain words
}

export const SOURCE_CATALOG: Record<string, SourceCard[]> = {
  chicago: [
    {
      name: "National Weather Service · live",
      role: "Live weather",
      what: "The federal weather service, polled at each campus's exact location.",
      provides: "Severe-weather warnings and watches — the only truly real-time authoritative source.",
      latency: "Real-time (seconds to minutes).",
    },
    {
      name: "Chicago Police · official shooting record",
      role: "Confirms",
      what: "The city's official record of shooting and homicide victims, block-level.",
      provides: "The authoritative confirmation that settles the record — what morning posture is built on.",
      latency: "13–37 hours behind the event.",
    },
    {
      name: "Cook County Medical Examiner · official record",
      role: "Confirms",
      what: "The county's official record of deaths, including a gun-related flag.",
      provides: "Independent confirmation of fatalities. Date-validated on ingest (the dataset has typos).",
      latency: "Days.",
    },
    {
      name: "Chicago Police · crimes record",
      role: "Confirms",
      what: "The city's full reported-crime dataset.",
      provides: "An 8-day backfill and context layer — not used for alerting.",
      latency: "About 8 days behind, by policy.",
    },
    {
      name: "Local news · licensed",
      role: "Corroborates",
      what: "A licensed commercial news feed.",
      provides: "Fast corroboration ahead of the official record — never confirms alone.",
      latency: "15–90 minutes behind publication.",
    },
    {
      name: "GDELT · news wire",
      role: "Corroborates",
      what: "A global open news-event wire.",
      provides: "Headline-level corroboration, commercially clean.",
      latency: "15–60 minutes.",
    },
    {
      name: "Local news · Block Club / CWB (RSS)",
      role: "Corroborates",
      what: "Neighborhood Chicago newsrooms via their public feeds.",
      provides: "Headline-level early signal — corroboration only.",
      latency: "15–90 minutes.",
    },
  ],
  dallas: [
    {
      name: "Dallas Police · active dispatch",
      role: "Dispatch",
      what: "The city's live 911 active-call feed, refreshed roughly every two minutes.",
      provides: "Preliminary situational awareness (REPORTED tier). Never confirms alone; every poll is archived because the feed keeps no history.",
      latency: "About 2 minutes.",
    },
    {
      name: "National Weather Service · live",
      role: "Live weather",
      what: "The federal weather service, polled at each campus's exact location.",
      provides: "Severe-weather warnings and watches — real-time and authoritative.",
      latency: "Real-time (seconds to minutes).",
    },
    {
      name: "Local news · licensed",
      role: "Corroborates",
      what: "A licensed commercial news feed.",
      provides: "Fast corroboration of dispatch signal.",
      latency: "15–90 minutes.",
    },
    {
      name: "GDELT · news wire",
      role: "Corroborates",
      what: "A global open news-event wire.",
      provides: "Headline-level corroboration.",
      latency: "15–60 minutes.",
    },
    {
      name: "Local news · RSS",
      role: "Corroborates",
      what: "Dallas-area newsrooms via public feeds.",
      provides: "Headline-level early signal.",
      latency: "15–90 minutes.",
    },
  ],
};

export const CONFIRMATION_NOTE: Record<string, string> = {
  chicago:
    "The confirmed clock (Chicago Police, 13–37 h) is exactly on time for morning posture — nobody else attempts it. Everything faster corroborates; nothing is labeled Confirmed on news or crowd reports alone.",
  dallas:
    "Dallas publishes live dispatch, so the live clock covers the afternoon risk window — but dispatch is preliminary. Confirmation comes from the daily official incident record.",
};
