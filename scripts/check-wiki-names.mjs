// Focused audit: the countries whose Wikipedia article title differs from, or
// is ambiguous with, the name we display. These are the only ones that can
// silently resolve to the wrong page. Run: node scripts/check-wiki-names.mjs
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const countries = JSON.parse(readFileSync(resolve(ROOT, "src/data/countries.json"), "utf8"));

const TITLE = {
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

// every mapped name, plus a spread of ordinary ones as a control
const WATCH = [...Object.keys(TITLE), "IN", "BF", "TV", "KP", "KR", "ZA", "MX", "JP"];

const UA = "Flagship/1.0 (https://flagship-flax.vercel.app; daily flag game)";
const ENDPOINT = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const title = (c) => TITLE[c.code] ?? c.name;

async function check(c, attempt = 0) {
  const url = ENDPOINT + encodeURIComponent(title(c).replace(/ /g, "_"));
  const res = await fetch(url, { headers: { accept: "application/json", "user-agent": UA } });
  if (res.status === 429 && attempt < 4) {
    await sleep(4000 * (attempt + 1));
    return check(c, attempt + 1);
  }
  if (!res.ok) return { ...c, problem: "HTTP " + res.status };
  const d = await res.json();
  const extract = (d.extract ?? "").replace(/\s+/g, " ").trim();
  const isPlace = /\b(country|state|nation|republic|island|territory|kingdom|city-state|landlocked|sovereign|microstate)\b/i.test(extract);
  return {
    code: c.code,
    name: c.name,
    asked: title(c),
    resolved: d.title,
    problem: d.type === "disambiguation" ? "DISAMBIGUATION" : !isPlace ? "not obviously a country" : null,
    extract,
  };
}

const rows = [];
for (const code of WATCH) {
  const c = countries.find((x) => x.code === code);
  if (!c) continue;
  rows.push(await check(c));
  process.stdout.write(".");
  await sleep(900);
}
process.stdout.write("\n\n");

const bad = rows.filter((r) => r.problem);
for (const r of rows) {
  const flag = r.problem ? "FAIL" : "ok  ";
  console.log(`${flag} ${r.code}  ${String(r.name).padEnd(24)} asked "${r.asked}" -> "${r.resolved ?? "-"}" ${r.problem ?? ""}`);
}
console.log(`\n${rows.length - bad.length}/${rows.length} resolve to a country article`);
if (bad.length) process.exit(1);

console.log("\nwhat a player would actually read:");
for (const code of ["CD", "TR", "CZ", "CI", "VA", "TV"]) {
  const r = rows.find((x) => x.code === code);
  if (r) console.log(`\n  ${r.name}:\n    ${r.extract.slice(0, 230)}…`);
}
