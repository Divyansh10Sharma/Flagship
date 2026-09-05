/**
 * Slices the generated brass emblem sheet into individual icons.
 *
 * The sheet is authored as one image on purpose: six separate generations
 * drift in lighting, patina and stroke weight, and the drift is obvious once
 * they sit in a column together. One sheet, sliced, keeps them a set.
 *
 * Segmentation is by connected component, NOT by cutting the sheet into a 3x2
 * grid. The generator does not honour cell boundaries — on this sheet the
 * flame's tip crosses the row line and lands inside the arrow's cell, which
 * inflates the arrow's bounding box by 60% and makes it render visibly
 * undersized next to its neighbours. Finding the emblems by their own pixels
 * sidesteps that entirely and survives a re-generated sheet laid out with
 * different spacing.
 *
 * Source lives in assets-src/ rather than public/ — it is 2.5MB and only the
 * sliced output is ever served.
 *
 *   node scripts/slice-icons.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..");

const SHEETS = [
  {
    src: join(ROOT, "assets-src", "brassItems.png"),
    out: join(ROOT, "public", "icons"),
    /** Reading order: left to right, top to bottom. */
    names: ["compass", "arrow", "anchor", "logbook", "flame", "trophy"],
    /** Normalised canvas. Each piece is fitted inside this box preserving its
     *  own aspect, so a 2:1 arrow and a 1:1.3 anchor share an optical size
     *  rather than a bounding-box size. */
    box: 256,
  },
  {
    src: join(ROOT, "assets-src", "medallions-sheet.webp"),
    out: join(ROOT, "public", "ranks"),
    names: ["gold", "silver", "bronze"],
    // Rank plates are square by construction and carry live text on top, so
    // they keep more resolution than the emblems.
    box: 320,
  },
];

/** The generator leaves a faint glow in the gutters — alpha 1-3 rather than a
 *  clean 0. Left alone it survives as a grey halo once a piece is composited
 *  onto light parchment, and it also bridges neighbours into one connected
 *  component. */
const ALPHA_FLOOR = 12;

/** A component smaller than this is a generator speck, not artwork. */
const MIN_AREA = 2000;

async function sliceSheet({ src, out: OUT, names: NAMES, box: BOX }) {
const SRC = src;
const { data, info } = await sharp(SRC)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels } = info;
console.log(`\n${SRC.split(/[\\/]/).pop()}  ${W}x${H}`);

const solid = new Uint8Array(W * H);
for (let i = 0; i < W * H; i++) {
  if (data[i * channels + 3] >= ALPHA_FLOOR) solid[i] = 1;
}

// --- connected components, 8-connectivity, iterative so it cannot blow the
// --- call stack on a 1.5M-pixel sheet.
const seen = new Uint8Array(W * H);
const boxes = [];
const stack = [];

for (let start = 0; start < W * H; start++) {
  if (!solid[start] || seen[start]) continue;

  let minX = W;
  let maxX = -1;
  let minY = H;
  let maxY = -1;
  let area = 0;

  stack.push(start);
  seen[start] = 1;

  while (stack.length) {
    const p = stack.pop();
    const x = p % W;
    const y = (p / W) | 0;
    area++;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (solid[q] && !seen[q]) {
          seen[q] = 1;
          stack.push(q);
        }
      }
    }
  }

  if (area >= MIN_AREA) {
    boxes.push({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1, area });
  }
}

// A piece can break into more than one component — the trophy's handles read
// as separate blobs at this alpha floor. Merge any boxes that overlap.
const overlaps = (a, b) =>
  a.left <= b.left + b.width &&
  b.left <= a.left + a.width &&
  a.top <= b.top + b.height &&
  b.top <= a.top + a.height;

let merged = true;
while (merged) {
  merged = false;
  outer: for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (!overlaps(boxes[i], boxes[j])) continue;
      const l = Math.min(boxes[i].left, boxes[j].left);
      const t = Math.min(boxes[i].top, boxes[j].top);
      const r = Math.max(boxes[i].left + boxes[i].width, boxes[j].left + boxes[j].width);
      const b = Math.max(boxes[i].top + boxes[i].height, boxes[j].top + boxes[j].height);
      boxes[i] = { left: l, top: t, width: r - l, height: b - t, area: boxes[i].area + boxes[j].area };
      boxes.splice(j, 1);
      merged = true;
      break outer;
    }
  }
}

if (boxes.length !== NAMES.length) {
  console.error(
    `\nExpected ${NAMES.length} pieces, found ${boxes.length}. ` +
      `Adjust MIN_AREA or ALPHA_FLOOR, or check the sheet.`
  );
  for (const b of boxes) console.error("  ", b);
  process.exit(1);
}

// Reading order: band the boxes into rows by vertical centre, then sort each
// row left to right. Row count is derived rather than assumed, so a 2x3 or a
// 1x6 sheet slices correctly too.
const midY = (b) => b.top + b.height / 2;
const typical = Math.min(...boxes.map((b) => b.height));
boxes.sort((a, b) => midY(a) - midY(b));

const rows = [];
for (const b of boxes) {
  const row = rows.find((r) => Math.abs(midY(r[0]) - midY(b)) < typical * 0.6);
  if (row) row.push(b);
  else rows.push([b]);
}
for (const r of rows) r.sort((a, b) => a.left - b.left);
const ordered = rows.flat();

await mkdir(OUT, { recursive: true });

for (let i = 0; i < ordered.length; i++) {
  const name = NAMES[i];
  const { left, top, width, height } = ordered[i];

  // Zero the colour of near-transparent pixels as well as their alpha: a fully
  // transparent pixel that still carries dark RGB bleeds back in when the
  // browser interpolates during downscale, greying the emblem's edge.
  const cell = await sharp(SRC).extract({ left, top, width, height }).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  for (let p = 0; p < cell.data.length; p += cell.info.channels) {
    if (cell.data[p + 3] < ALPHA_FLOOR) {
      cell.data[p] = cell.data[p + 1] = cell.data[p + 2] = cell.data[p + 3] = 0;
    }
  }

  const out = await sharp(cell.data, {
    raw: { width: cell.info.width, height: cell.info.height, channels: cell.info.channels },
  })
    .resize(BOX, BOX, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 88, alphaQuality: 100 })
    .toBuffer();

  await writeFile(join(OUT, `${name}.webp`), out);
  console.log(
    `  ${name.padEnd(9)} at ${String(left).padStart(4)},${String(top).padStart(4)} ` +
      `${String(width).padStart(4)}x${String(height).padStart(4)}  ->  ${BOX}x${BOX}  ` +
      `${String(Math.round(out.length / 1024)).padStart(3)}KB`
  );
}
}

for (const sheet of SHEETS) await sliceSheet(sheet);
