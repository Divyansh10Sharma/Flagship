export type Country = {
  code: string;
  name: string;
  capital: string | null;
  region: string;
  subregion: string | null;
  population: number;
  area: number;
  flagPng: string;
  flagSvg: string;
  coatOfArms: string | null;
  languages: string[];
  currency: string | null;
  currencySymbol: string | null;
  borders: number;
  landlocked: boolean;
  drivingSide: string;
  tld: string | null;
  tier: 1 | 2 | 3;
  searchKey: string;
};

export type RoundResult = {
  code: string;
  attempts: number;
  points: number;
  solved: boolean;
};

export type DayResult = {
  date: string;
  rounds: RoundResult[];
  base: number;
  multiplier: number;
  final: number;
};

export type InProgress = {
  date: string;
  roundIndex: 0 | 1 | 2;
  phase: "guessing" | "revealed";
  wrongGuesses: string[][];
  results: RoundResult[];
};
