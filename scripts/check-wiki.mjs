// Verifies every country resolves to a real Wikipedia summary, and that the
// article is actually about the country (not a disambiguation or a person).
// Run: node scripts/check-wiki.mjs
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const countries = JSON.parse(readFileSync(resolve(ROOT, "src/data/countries.json"), "utf8"));

// mirror of the TITLE map in src/lib/wiki.ts
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

const ENDPOINT = "https://en.wikipedia.org/api/rest_v1/page/summary/";
const title = (c) => TITLE[c.code] ?? c.name;

async function check(c) {
  const url = ENDPOINT + encodeURIComponent(title(c).replace(/ /g, "_"));
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": "Flagship/1.0 (dev check)" },
    });
    if (!res.ok) return { code: c.code, name: c.name, status: res.status, problem: "HTTP " + res.status };
    const d = await res.json();
    if (d.type === "disambiguation") return { code: c.code, name: c.name, problem: "disambiguation" };
    const extract = (d.extract ?? "").trim();
    if (extract.length < 40) return { code: c.code, name: c.name, problem: "extract too short" };
    // sanity: the summary should describe a place, not a person or a film
    const looksLikePlace = /\b(country|state|nation|republic|island|territory|kingdom|city-state|landlocked|sovereign)\b/i.test(extract);
    return {
      code: c.code, name: c.name, resolved: d.title, extract,
      problem: looksLikePlace ? null : "may not be the country article",
    };
  } catch (e) {
    return { code: c.code, name: c.name, problem: "fetch failed: " + e.message };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wikipedia rate-limits bursts hard. Production only ever asks for 3 a day, so
// this throttle exists purely so the bulk audit can finish in one pass.
const out = [];
for (let i = 0; i < countries.length; i += 3) {
  const batch = countries.slice(i, i + 3);
  let res = await Promise.all(batch.map(check));
  if (res.some((r) => r.status === 429)) {
    await sleep(3000);
    res = await Promise.all(batch.map(check));
  }
  out.push(...res);
  process.stdout.write(".");
  await sleep(250);
}
process.stdout.write("\n");

const bad = out.filter((r) => r.problem);
console.log(`checked ${out.length} countries`);
console.log(`clean: ${out.length - bad.length}`);
if (bad.length) {
  console.log(`\nneeds attention (${bad.length}):`);
  for (const r of bad) console.log(`  ${r.code} ${r.name.padEnd(26)} ${r.problem}${r.resolved ? "  -> " + r.resolved : ""}`);
}

const redirected = out.filter((r) => !r.problem && r.resolved && r.resolved !== title(countries.find((c) => c.code === r.code)));
if (redirected.length) {
  console.log(`\nfollowed a redirect (fine, just noting):`);
  for (const r of redirected.slice(0, 40)) console.log(`  ${r.code} ${r.name} -> ${r.resolved}`);
}

console.log("\nsamples:");
for (const code of ["IN", "BF", "HR", "BO", "VA", "TV", "KP", "CD"]) {
  const r = out.find((x) => x.code === code);
  if (r?.extract) console.log(`  ${code}: ${r.extract.slice(0, 150).replace(/\s+/g, " ")}…`);
}
process.exit(bad.length ? 1 : 0);
