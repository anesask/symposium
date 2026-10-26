import { z } from "zod";
import { hasKey, structured } from "@/lib/llm";
import { stripDashesDeep } from "@/lib/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Today's topics: recent headlines from a few public RSS feeds, turned into personal questions
// a reader could bring to the table. Cached in memory for an hour.

const FEEDS = [
  { source: "BBC Technology", url: "https://feeds.bbci.co.uk/news/technology/rss.xml" },
  { source: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { source: "The Guardian Money", url: "https://www.theguardian.com/money/rss" },
  { source: "The Guardian Life", url: "https://www.theguardian.com/lifeandstyle/rss" },
];

export interface Topic {
  question: string;
  headline: string;
  source: string;
  link: string;
}

interface Headline {
  title: string;
  link: string;
  source: string;
}

const TTL = 60 * 60 * 1000;
let cache: { at: number; topics: Topic[] } | null = null;

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

async function readFeed(feed: (typeof FEEDS)[number]): Promise<Headline[]> {
  try {
    const res = await fetch(feed.url, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "Symposium/1.0 (hackathon project)" } });
    if (!res.ok) return [];
    const xml = await res.text();
    return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/g)].slice(0, 8).flatMap((m) => {
      const title = decode(m[0].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
      const link = decode(m[0].match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
      return title && link.startsWith("http") ? [{ title, link, source: feed.source }] : [];
    });
  } catch {
    return [];
  }
}

const schema = z.object({
  topics: z
    .array(
      z.object({
        index: z.number().int().describe("Index of the headline this question comes from"),
        question: z.string().describe("A personal decision question in the first person, under 90 characters"),
      }),
    )
    .max(8),
});

export async function GET() {
  if (cache && Date.now() - cache.at < TTL) return Response.json({ topics: cache.topics });

  const headlines = (await Promise.all(FEEDS.map(readFeed))).flat();
  if (!headlines.length) return Response.json({ topics: [] });

  let topics: Topic[] = [];
  if (hasKey()) {
    try {
      const out = await structured(schema, {
        system:
          "You turn news headlines into personal questions an ordinary reader might bring to a table of ancient Greek philosophers. Each question is a real decision about the reader's own life, in the first person (\"Should I…\", \"Is it worth…\", \"A or B?\"), concrete and under 90 characters. Skip headlines about crime, death, war, disasters or named private individuals. Never invent facts beyond the headline.",
        user: `Pick the 6 headlines that make the best personal questions, and write one question for each.\n\n${headlines.map((h, i) => `${i}. ${h.title}`).join("\n")}`,
        maxTokens: 800,
      });
      topics = out.topics.flatMap((t) => {
        const h = headlines[t.index];
        return h ? [{ question: t.question.trim(), headline: h.title, source: h.source, link: h.link }] : [];
      });
    } catch {
      topics = [];
    }
  }
  topics = stripDashesDeep(topics);
  cache = { at: Date.now(), topics };
  return Response.json({ topics });
}
