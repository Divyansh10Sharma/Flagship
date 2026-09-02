import { ALIASES, normalise } from "./aliases";
import type { Country } from "./types";

/** Names starting with the query first, then names containing it, each group
 *  alphabetical (the input list already is). Aliases match on prefix too. */
export function filterCountries(query: string, list: Country[]): Country[] {
  const q = normalise(query);
  if (!q) return list;

  const exactName: Country[] = [];
  const exactAlias: Country[] = [];
  const starts: Country[] = [];
  const contains: Country[] = [];

  for (const c of list) {
    const key = c.searchKey;
    const aliases = ALIASES[c.code];

    // An alias typed in full wins outright, otherwise "uk" lands on Ukraine.
    if (key === q) {
      exactName.push(c);
      continue;
    }
    if (aliases?.includes(q)) {
      exactAlias.push(c);
      continue;
    }

    if (key.startsWith(q)) {
      starts.push(c);
      continue;
    }

    let aliasRank = 0; // 1 = prefix, 2 = substring
    if (aliases) {
      for (const a of aliases) {
        if (a.startsWith(q)) {
          aliasRank = 1;
          break;
        }
        if (a.includes(q)) aliasRank = 2;
      }
    }

    if (aliasRank === 1) starts.push(c);
    else if (key.includes(q) || aliasRank === 2) contains.push(c);
  }

  return exactName.concat(exactAlias, starts, contains);
}
