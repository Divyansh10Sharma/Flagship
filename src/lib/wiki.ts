import { BY_CODE } from "./countries";
import type { Country } from "./types";

export type LiveFact = { text: string; url: string };

const CACHE_KEY = "flagship:facts:v1";
const ENDPOINT = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const MAX_CHARS = 240;

/**
 * Wikipedia article titles that differ from the name we display. The REST API
 * follows redirects, so most names resolve on their own — this map only holds
 * the ones that genuinely land somewhere else or are ambiguous.
 * Verified against all 195 by scripts/check-wiki.mjs.
 */
const TITLE: Record<string, string> = {
  CD: "Democratic Republic of the Congo",
  CG: "Republic of the Congo",
  TL: "East Timor",
  TR: "Turkey",
  CZ: "Czech Republic",
  MM: "Myanmar",
  SZ: "Eswatini",
  CI: "Ivory Coast",
  CV: "Cape Verde",
  VA: "Vatican City",
  PS: "State of Palestine",
  MK: "North Macedonia",
  GE: "Georgia (country)",
  IE: "Republic of Ireland",
  NL: "Netherlands",
  SR: "Suriname",
  NE: "Niger",
  DO: "Dominican Republic",
  CF: "Central African Republic",
  AE: "United Arab Emirates",
};

const titleFor = (c: Country) => TITLE[c.code] ?? c.name;

/** Trim an extract to a couple of sentences without cutting mid-word. */
export function condense(extract: string, limit = MAX_CHARS): string {
  const clean = extract.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;

  // prefer a sentence boundary inside the budget
  const cut = clean.slice(0, limit + 1);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  if (stop > limit * 0.5) return clean.slice(0, stop + 1).trim();

  const space = cut.lastIndexOf(" ");
  return clean.slice(0, space > 0 ? space : limit).trim() + "…";
}

type Cache = Record<string, Record<string, LiveFact>>; // date -> code -> fact

function readCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Cache, keepDates: string[]): void {
  try {
    // only today and tomorrow are ever needed; drop the rest
    const trimmed: Cache = {};
    for (const d of keepDates) if (cache[d]) trimmed[d] = cache[d];
    localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    // private mode or quota — facts just fall back to the local templates
  }
}

async function fetchOne(country: Country, signal: AbortSignal): Promise<LiveFact | null> {
  const url = ENDPOINT + encodeURIComponent(titleFor(country).replace(/ /g, "_"));
  try {
    const res = await fetch(url, { signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const extract: string | undefined = data?.extract;
    if (!extract || data?.type === "disambiguation") return null;
    return {
      text: condense(extract),
      url: data?.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${titleFor(country)}`,
    };
  } catch {
    return null; // offline, blocked, rate-limited — caller falls back
  }
}

/**
 * Fetch the day's facts, reusing anything already cached for that date.
 * Never throws and never blocks the game: a null result just means the caller
 * keeps using the deterministic template from facts.ts.
 */
export async function loadDailyFacts(
  codes: string[],
  date: string,
  signal: AbortSignal
): Promise<Record<string, LiveFact>> {
  const cache = readCache();
  const forDate = { ...(cache[date] ?? {}) };

  const missing = codes.filter((c) => !forDate[c] && BY_CODE[c]);
  if (missing.length) {
    const results = await Promise.all(
      missing.map((code) => fetchOne(BY_CODE[code], signal))
    );
    results.forEach((fact, i) => {
      if (fact) forDate[missing[i]] = fact;
    });
    cache[date] = forDate;
    writeCache(cache, [date]);
  }

  return forDate;
}
