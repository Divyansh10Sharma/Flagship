// Generates src/data/geo.json: ISO numeric id + centre point per country, so
// the map mode can join world-atlas shapes (keyed by ISO numeric) to our
// alpha-2 codes. Run once: node scripts/fetch-geo.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "src/data/geo.json");
const ours = JSON.parse(readFileSync(resolve(ROOT, "src/data/countries.json"), "utf8"));

const res = await fetch(
  "https://raw.githubusercontent.com/mledoze/countries/master/countries.json",
  { signal: AbortSignal.timeout(45_000) }
);
if (!res.ok) throw new Error(`Country dataset failed: ${res.status}`);
const raw = await res.json();
const byCca2 = new Map(raw.map((c) => [String(c.cca2).toUpperCase(), c]));

const out = {};
for (const c of ours) {
  const r = byCca2.get(c.code);
  if (!r) throw new Error(`No record for ${c.code}`);
  out[c.code] = { id: r.ccn3 ?? null, lat: r.latlng[0], lng: r.latlng[1] };
}
writeFileSync(OUT, JSON.stringify(out) + "\n", "utf8");
console.log(`Wrote ${Object.keys(out).length} entries to ${OUT}`);
