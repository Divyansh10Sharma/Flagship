import raw from "../data/countries.json";
import type { Country } from "./types";

export const COUNTRIES = raw as Country[];

export const BY_CODE: Record<string, Country> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c])
);

/** Alphabetical by display name — the picker's default order. */
export const ALPHABETICAL = [...COUNTRIES].sort((a, b) =>
  a.name.localeCompare(b.name)
);

export const byTier = (tier: 1 | 2 | 3) => COUNTRIES.filter((c) => c.tier === tier);
