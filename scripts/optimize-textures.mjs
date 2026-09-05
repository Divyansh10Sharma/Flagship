/**
 * Texture assets arrive from the image generator at print resolution — the
 * brass tile came in at 1259px and 791KB to be painted onto a 56px button.
 * This re-encodes them at the size they are actually sampled at.
 *
 * Idempotent: re-running on already-optimised files is a no-op in effect,
 * so it is safe to run after dropping in a replacement texture.
 *
 *   node scripts/optimize-textures.mjs
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const PUBLIC = join(import.meta.dirname, "..", "public");

const JOBS = [
  // Full-viewport backdrop. Wide enough for a 2x phone, quality can be low
  // because the image is nearly black and heavily vignetted.
  { file: "chart.webp", width: 900, quality: 72 },
  // Tiles at 256px in CSS, so 512 covers 2x with room to spare.
  { file: "brass.webp", width: 512, quality: 78 },
];

const kb = (n) => `${Math.round(n / 1024)}KB`;

for (const { file, width, quality } of JOBS) {
  const path = join(PUBLIC, file);
  const before = (await stat(path)).size;

  const out = await sharp(await readFile(path))
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();

  if (out.length >= before) {
    console.log(`${file}  ${kb(before)} — already optimal, skipped`);
    continue;
  }

  await writeFile(path, out);
  console.log(`${file}  ${kb(before)} -> ${kb(out.length)}`);
}
