/**
 * Cleans and right-sizes the generated art assets.
 *
 * Three problems arrive with every generated cut-out:
 *
 *  1. A keying fringe. sheet.webp's semi-transparent rim averages
 *     rgb(170,64,28) — a strong orange halo that is invisible against the dark
 *     chart backdrop the asset was previewed on, and glaringly visible once
 *     the sheet is composited as cream paper. Eroding the alpha channel by a
 *     pixel or two removes the rim outright, which is more reliable than
 *     trying to colour-correct it: the paper is legitimately warm, so any
 *     "reduce red" rule strong enough to kill the fringe also drains the art.
 *
 *  2. Colour left behind on transparent pixels. A pixel at alpha 0 still
 *     carrying dark RGB bleeds back in when the browser interpolates during
 *     downscale, greying every edge.
 *
 *  3. Print resolution. These render at 20-60px and ship at 2172px.
 *
 * Idempotent — safe to re-run after dropping in a replacement asset.
 *
 *   node scripts/clean-assets.mjs
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const PUBLIC = join(import.meta.dirname, "..", "public");

const JOBS = [
  // erode: how many pixels of rim to eat. Driven by the measured fringe —
  // sheet's is the worst by a wide margin, the rest only need a shave.
  { file: "plate.webp", width: 1100, erode: 1, quality: 82 },
  { file: "sheet.webp", width: 900, erode: 3, quality: 82 },
  { file: "seal.webp", width: 360, erode: 1, quality: 88 },
  { file: "flourish.webp", width: 700, erode: 1, quality: 88 },
  { file: "pennant.webp", width: 220, erode: 1, quality: 88 },
];

const kb = (n) => `${Math.round(n / 1024)}KB`.padStart(6);

/** Minimum filter on the alpha channel: each pixel takes the lowest alpha in
 *  its neighbourhood, so the shape shrinks and the feathered rim disappears.
 *  Separable — two 1D passes rather than one r*r window. */
function erodeAlpha(data, W, H, C, r) {
  const tmp = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let m = 255;
      for (let d = -r; d <= r; d++) {
        const nx = x + d;
        if (nx < 0 || nx >= W) continue;
        const a = data[(y * W + nx) * C + 3];
        if (a < m) m = a;
      }
      tmp[y * W + x] = m;
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      let m = 255;
      for (let d = -r; d <= r; d++) {
        const ny = y + d;
        if (ny < 0 || ny >= H) continue;
        const a = tmp[ny * W + x];
        if (a < m) m = a;
      }
      data[(y * W + x) * C + 3] = m;
    }
  }
}

/** Content bounds by alpha mass — ignores specks by construction, since a
 *  speck contributes a rounding error to its row and the artwork thousands. */
function contentBounds(data, W, H, C, frac = 0.004) {
  const cols = new Float64Array(W);
  const rows = new Float64Array(H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = data[(y * W + x) * C + 3];
      cols[x] += a;
      rows[y] += a;
    }
  }
  const span = (sums) => {
    const cut = Math.max(...sums) * frac;
    let lo = 0;
    let hi = sums.length - 1;
    while (lo < hi && sums[lo] <= cut) lo++;
    while (hi > lo && sums[hi] <= cut) hi--;
    return [lo, hi];
  };
  const [left, right] = span(cols);
  const [top, bottom] = span(rows);
  return { left, top, width: Math.max(1, right - left + 1), height: Math.max(1, bottom - top + 1) };
}

for (const { file, width, erode, quality } of JOBS) {
  const path = join(PUBLIC, file);
  const before = (await stat(path)).size;

  const { data, info } = await sharp(await readFile(path))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;

  if (erode > 0) erodeAlpha(data, W, H, C, erode);
  for (let i = 0; i < W * H; i++) {
    if (data[i * C + 3] === 0) {
      data[i * C] = data[i * C + 1] = data[i * C + 2] = 0;
    }
  }

  const box = contentBounds(data, W, H, C);
  const out = await sharp(data, { raw: { width: W, height: H, channels: C } })
    .extract(box)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, alphaQuality: 100 })
    .toBuffer();

  await writeFile(path, out);
  const m = await sharp(out).metadata();
  console.log(
    `${file.padEnd(14)} ${String(W).padStart(4)}x${String(H).padEnd(4)} ${kb(before)}` +
      `  ->  ${String(m.width).padStart(4)}x${String(m.height).padEnd(4)} ${kb(out.length)}`
  );
}
