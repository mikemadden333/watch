/* ============================================================
   RSS adapter — local newsroom feeds (free)
   Block Club Chicago, CWB Chicago (and Dallas-area feeds). Headline-
   level, 15–90 min. Like GDELT/news: REPORTED, network-scope — it
   corroborates a located signal, never confirms, never triggers a
   ring alone. Per-feed graceful degrade (some feeds sit behind bot
   walls and return no items).

   Block Club is a nonprofit; republication terms are unverified —
   headline-level linking is defensible, but confirm before relying on
   it commercially (a legal item, not a code one).
   ============================================================ */

import type { SourceHealth } from "./contract";
import type { RawHeadline } from "../news/cluster";

// Local newsroom feeds, verified serving usable RSS. This is the honest
// version of "screen-grabbing the local stations" — the outlets publish
// these headlines for syndication. Headline-level only; per-feed degrade.
const FEEDS: Record<string, { name: string; url: string }[]> = {
  chicago: [
    { name: "ABC7 Chicago", url: "https://abc7chicago.com/feed/" },
    { name: "NBC5 Chicago", url: "https://www.nbcchicago.com/news/local/feed/" },
    { name: "WGN", url: "https://wgntv.com/feed/" },
    { name: "FOX 32 Chicago", url: "https://www.fox32chicago.com/rss/category/news" },
    { name: "WTTW News", url: "https://news.wttw.com/rss.xml" },
    { name: "Block Club Chicago", url: "https://blockclubchicago.org/feed/" },
    { name: "CWB Chicago", url: "https://www.cwbchicago.com/feed" },
  ],
  dallas: [
    { name: "NBC5 DFW", url: "https://www.nbcdfw.com/news/local/feed/" },
    { name: "FOX 4 Dallas", url: "https://www.fox4news.com/rss/category/news" },
    { name: "WFAA", url: "https://www.wfaa.com/feeds/syndication/rss/news/local/" },
  ],
};

interface FeedItem {
  title: string;
  summary?: string;
  link: string;
  pubDate?: string;
  source: string;
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#8217;|&#039;|&apos;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, "–")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function field(block: string, tag: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decode(m[1]) : undefined;
}

function parseFeed(xml: string, source: string): FeedItem[] {
  const items: FeedItem[] = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const b of blocks) {
    const title = field(b, "title");
    const link = field(b, "link") || field(b, "guid");
    if (!title || !link) continue;
    const summary = field(b, "description") || field(b, "content:encoded");
    items.push({ title, summary, link, pubDate: field(b, "pubDate"), source });
  }
  return items;
}

/** Fetch + parse every feed for a city into raw headlines, plus a health
 *  row. Fetching is separated from normalization so the news-intelligence
 *  layer (extract → cluster → geocode) can consume the raw stream. */
export async function fetchCityHeadlines(
  city: string
): Promise<{ headlines: RawHeadline[]; health: SourceHealth; liveFeeds: number; totalFeeds: number; errors: string[] }> {
  const feeds = FEEDS[city.toLowerCase()] ?? [];
  const errors: string[] = [];
  const all: FeedItem[] = [];
  let liveFeeds = 0;

  for (const f of feeds) {
    try {
      const res = await fetch(f.url, {
        headers: { "User-Agent": "Watch/1.0 (ops@example.com)", Accept: "application/rss+xml, application/xml, text/xml" },
        cache: "no-store",
      });
      if (!res.ok) {
        errors.push(`${f.name} ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const items = parseFeed(xml, f.name);
      if (items.length) liveFeeds++;
      all.push(...items);
    } catch (e) {
      errors.push(`${f.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const headlines: RawHeadline[] = all.map((it) => ({
    outlet: it.source,
    title: it.title,
    summary: it.summary,
    url: it.link,
    publishedAt: it.pubDate ? new Date(it.pubDate).toISOString() : undefined,
  }));

  const health: SourceHealth = {
    key: "localnews",
    label: "Local news (RSS)",
    ageLabel: liveFeeds ? `${liveFeeds}/${feeds.length} feeds live` : "no feeds",
    expectedWindow: "≤90m window",
    inWindow: liveFeeds > 0,
    state: liveFeeds ? "ok" : "warn",
  };

  return { headlines, health, liveFeeds, totalFeeds: feeds.length, errors };
}
