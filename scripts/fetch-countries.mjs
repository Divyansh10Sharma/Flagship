// Generates src/data/countries.json. Run once: node scripts/fetch-countries.mjs
//
// NOTE ON THE SOURCE: the plan called for restcountries.com/v3.1. That API was
// shut down — v1..v4 now return {success:false} for every request, and v5
// requires an account API key. This script uses the same underlying dataset
// restcountries was built from (mledoze/countries) plus World Bank population,
// and produces the identical output shape the plan specifies.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "src/data/countries.json");

const COUNTRIES_URL =
  "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";
const WB_URL = (page) =>
  `https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=500&date=2015:2025&page=${page}`;

// Left-hand traffic, UN members only. Static because it never changes.
const DRIVES_LEFT = new Set(
  ("AG AU BS BD BB BT BW BN CY DM TL FJ GD GY IN ID IE JM JP KE KI LS MW MY MV " +
   "MT MU MZ NA NR NP NZ PK PG WS SC SG SB ZA LK KN LC VC SR SZ TZ TH TO TT TV " +
   "UG GB ZM ZW").split(" ")
);

// World Bank has no series for these. Values are current UN/official estimates.
const POP_FALLBACK = { VA: 882 };

async function getJson(url, label) {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`\n${label} failed: ${url}`);
    console.error(`Status: ${res.status} ${res.statusText}`);
    console.error(`Body: ${body.slice(0, 2000)}`);
    process.exit(1);
  }
  return res.json();
}

function searchKeyOf(name) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/['\u2019.\-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const tierOf = (p) => (p >= 20_000_000 ? 1 : p >= 5_000_000 ? 2 : 3);

// --- 1. Base country records -------------------------------------------------
const raw = await getJson(COUNTRIES_URL, "Country dataset");
console.log(`Fetched ${raw.length} territory records.`);

// 193 UN members + the two permanent observers = exactly 195.
const keep = (c) => c.unMember === true || c.cca2 === "VA" || c.cca2 === "PS";
const kept = raw.filter(keep);
if (kept.length !== 195) {
  console.error(`Expected 195 countries, got ${kept.length}. Check the filter.`);
  process.exit(1);
}

// --- 2. Population -----------------------------------------------------------
const wbRows = [];
for (let page = 1; page <= 10; page++) {
  const d = await getJson(WB_URL(page), "World Bank population");
  if (!Array.isArray(d) || !d[1]) break;
  wbRows.push(...d[1]);
  if (page >= (d[0]?.pages ?? 1)) break;
}
console.log(`Fetched ${wbRows.length} population observations.`);

const latestPop = new Map(); // cca3 -> {date, value}
for (const r of wbRows) {
  if (r.value == null || !r.countryiso3code) continue;
  const prev = latestPop.get(r.countryiso3code);
  if (!prev || Number(r.date) > Number(prev.date)) latestPop.set(r.countryiso3code, r);
}

// --- 3. Coat of arms availability -------------------------------------------
// restcountries served these from mainfacts.com. Probe once so nulls are real.
const coatUrl = (code) =>
  `https://mainfacts.com/media/images/coats_of_arms/${code.toLowerCase()}.svg`;

async function hasCoat(code) {
  try {
    const r = await fetch(coatUrl(code), {
      method: "HEAD",
      signal: AbortSignal.timeout(8_000),
    });
    return r.ok;
  } catch {
    return null; // network-level failure, distinct from a clean 404
  }
}

process.stdout.write("Probing coats of arms");
const coatOk = new Map();
let netFailures = 0;
for (let i = 0; i < kept.length; i += 12) {
  const batch = kept.slice(i, i + 12);
  const results = await Promise.all(batch.map((c) => hasCoat(c.cca2)));
  results.forEach((ok, n) => {
    if (ok === null) netFailures++;
    coatOk.set(batch[n].cca2, ok === true);
  });
  process.stdout.write(".");
}
process.stdout.write("\n");
if (netFailures > kept.length * 0.5) {
  console.warn(`Coat-of-arms host unreachable (${netFailures} failures) — writing all null.`);
  for (const c of kept) coatOk.set(c.cca2, false);
}

// --- 4. Map to the output shape ---------------------------------------------
const countries = kept
  .map((c) => {
    const code = String(c.cca2).toUpperCase();
    const lower = code.toLowerCase();
    const currencies = c.currencies ? Object.values(c.currencies) : [];
    const first = currencies[0];
    const population = latestPop.get(c.cca3)?.value ?? POP_FALLBACK[code] ?? 0;
    return {
      code,
      name: c.name?.common ?? "",
      capital: c.capital?.[0] ?? null,
      region: c.region ?? "",
      subregion: c.subregion || null,
      population,
      area: c.area ?? 0,
      flagPng: `https://flagcdn.com/w320/${lower}.png`,
      flagSvg: `https://flagcdn.com/${lower}.svg`,
      coatOfArms: coatOk.get(code) ? coatUrl(code) : null,
      languages: c.languages ? Object.values(c.languages) : [],
      currency: first?.name ?? null,
      currencySymbol: first?.symbol ?? null,
      borders: c.borders?.length ?? 0,
      landlocked: Boolean(c.landlocked),
      drivingSide: DRIVES_LEFT.has(code) ? "left" : "right",
      tld: c.tld?.[0] ?? null,
      tier: tierOf(population),
      searchKey: searchKeyOf(c.name?.common ?? ""),
    };
  })
  .sort((x, y) => x.code.localeCompare(y.code));

// --- 5. Sanity checks --------------------------------------------------------
const noPop = countries.filter((c) => !c.population);
if (noPop.length) {
  console.error("No population for:", noPop.map((c) => `${c.code} ${c.name}`).join(", "));
  process.exit(1);
}

const counts = { 1: 0, 2: 0, 3: 0 };
for (const c of countries) counts[c.tier]++;
console.log(`\nKept ${countries.length} countries.`);
console.log(`tier 1 (>=20M): ${counts[1]}`);
console.log(`tier 2 (5-20M): ${counts[2]}`);
console.log(`tier 3 (<5M):   ${counts[3]}`);
for (const t of [1, 2, 3]) {
  if (counts[t] < 30) {
    console.error(`\nTier ${t} has only ${counts[t]} — buckets are wrong. Check the filter.`);
    process.exit(1);
  }
}
console.log(`coats of arms: ${countries.filter((c) => c.coatOfArms).length}/195`);

console.log("\nNames to alias against:");
for (const c of countries) {
  if (["KR", "KP", "CD", "CG", "CI", "TR", "CZ", "CV", "MK", "SZ", "TL", "VA", "PS", "NL", "AE", "GB", "US", "MM"].includes(c.code))
    console.log(`  ${c.code}  ${c.name}`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(countries, null, 2) + "\n", "utf8");
console.log(`\nWrote ${OUT}`);
