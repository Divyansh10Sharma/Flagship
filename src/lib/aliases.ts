/** What people actually type. Keys are country codes, values are alias strings
 *  already in the normalised form `normalise()` produces (lowercase, no
 *  diacritics, no apostrophes / hyphens / periods). Matched on prefix too, so
 *  "ame" surfaces the United States. */
export const ALIASES: Record<string, string[]> = {
  US: ["usa", "us", "america", "united states of america", "the states"],
  GB: ["uk", "britain", "england", "great britain", "scotland", "wales"],
  AE: ["uae", "emirates"],
  NL: ["holland", "the netherlands"],
  KR: ["korea south", "korea", "republic of korea", "rok"],
  KP: ["korea north", "dprk"],
  MM: ["burma"],
  SZ: ["swaziland"],
  CI: ["cote divoire", "cote d ivoire", "ivory coast"],
  TR: ["turkey"],
  CZ: ["czech republic", "czech"],
  CV: ["cabo verde"],
  MK: ["macedonia"],
  VA: ["vatican", "holy see", "the vatican"],
  CD: ["drc", "congo kinshasa", "democratic republic of the congo", "zaire"],
  CG: ["congo brazzaville", "republic of the congo"],
  TL: ["east timor"],
  RU: ["russian federation"],
  SY: ["syrian arab republic"],
  LA: ["laos"],
  VN: ["viet nam"],
  IR: ["persia"],
  CH: ["swiss"],
  DE: ["germany", "deutschland"],
  ES: ["spain"],
  GR: ["hellas"],
  IE: ["eire", "republic of ireland"],
  BN: ["brunei darussalam"],
  BO: ["plurinational state of bolivia"],
  TZ: ["tanganyika"],
  MD: ["moldova"],
  ST: ["sao tome", "sao tome and principe"],
  KN: ["st kitts", "st kitts and nevis"],
  LC: ["st lucia"],
  VC: ["st vincent", "st vincent and the grenadines"],
  BA: ["bosnia"],
  AG: ["antigua"],
  TT: ["trinidad"],
  DO: ["dominican rep"],
  PG: ["png"],
  NZ: ["nz", "aotearoa"],
  ZA: ["rsa"],
  CF: ["car", "centrafrique"],
  AU: ["oz"],
};

/** Same normalisation the data file's `searchKey` was built with. */
export function normalise(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['\u2019.\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
