import type { Country } from "./types";

export function formatPop(n: number): string {
  if (n >= 1_000_000_000) return `${round1(n / 1_000_000_000)}B`;
  if (n >= 1_000_000) return `${round1(n / 1_000_000)}M`;
  if (n >= 1_000) return `${round1(n / 1_000)}K`;
  return String(n);
}

function round1(n: number): string {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function formatArea(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** FNV-1a over the country code — same country, same fact, forever. */
function hashCode(code: string): number {
  let h = 2166136261;
  for (let i = 0; i < code.length; i++) {
    h ^= code.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Template = (c: Country) => string | null;

const TEMPLATES: Template[] = [
  // 1 — the guaranteed fallback.
  (c) =>
    c.capital
      ? `${c.capital} is the capital, and about ${formatPop(c.population)} people live in ${c.name}.`
      : `About ${formatPop(c.population)} people live in ${c.name}.`,

  // 2
  (c) =>
    c.area && c.subregion
      ? `${c.name} covers ${formatArea(c.area)} km² of ${c.subregion}.`
      : null,

  // 3
  (c) => {
    const l = c.languages;
    if (!l.length) return null;
    if (l.length === 1) return `Everyone here speaks ${l[0]}.`;
    if (l.length === 2) return `${l[0]} and ${l[1]} are both official here.`;
    if (l.length === 3) return `${l[0]}, ${l[1]} and ${l[2]} are all official here.`;
    return null;
  },

  // 4
  (c) =>
    c.currency
      ? `Money here is the ${c.currency}${c.currencySymbol ? ` (${c.currencySymbol})` : ""}.`
      : null,

  // 5
  (c) => {
    if (c.borders === 0 && !c.landlocked)
      return `${c.name} is surrounded by water — no land borders at all.`;
    if (c.landlocked)
      return `${c.name} is landlocked, hemmed in by ${c.borders} neighbours.`;
    return `${c.name} shares a land border with ${c.borders} countries.`;
  },

  // 6
  (c) =>
    c.tld
      ? `They drive on the ${c.drivingSide} here, and websites end in ${c.tld}.`
      : null,
];

/** Deterministic: picks a start template from the code hash, then falls
 *  through to the next one whose data is present. Template 1 always works. */
export function factFor(country: Country): string {
  const start = hashCode(country.code) % TEMPLATES.length;
  for (let i = 0; i < TEMPLATES.length; i++) {
    const out = TEMPLATES[(start + i) % TEMPLATES.length](country);
    if (out) return out;
  }
  return TEMPLATES[0](country)!;
}
