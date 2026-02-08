import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const GF_INPUT = path.join(ROOT, 'public/assets/sprites/sprite_sheet_my_gf.png');
const ME_INPUT = path.join(ROOT, 'public/assets/sprites/sprite_sheet_me.png');
const GF_OUT_DIR = path.join(ROOT, 'public/assets/sprites/gf_frames');
const ME_OUT_DIR = path.join(ROOT, 'public/assets/sprites/me_frames');
const DEBUG_OUT = path.join(GF_OUT_DIR, 'debug_overlay.png');
const DEBUG_ME_OUT = path.join(ME_OUT_DIR, 'debug_overlay.png');

const EXPECT_COLS = 7;
const EXPECT_ROWS = 3;
const EMPTY_RATIO = 0.02; // columns/rows with <=2% alpha are treated as gutters
const PADDING = 8;

type Span = { start: number; end: number };

function sumAlphaByColumn(data: Buffer, width: number, height: number) {
  const sums = new Array<number>(width).fill(0);
  for (let y = 0; y < height; y++) {
    let rowIdx = y * width * 4;
    for (let x = 0; x < width; x++) {
      sums[x] += data[rowIdx + x * 4 + 3];
    }
  }
  return sums;
}

function sumAlphaByRow(data: Buffer, width: number, height: number) {
  const sums = new Array<number>(height).fill(0);
  for (let y = 0; y < height; y++) {
    let rowIdx = y * width * 4;
    let sum = 0;
    for (let x = 0; x < width; x++) {
      sum += data[rowIdx + x * 4 + 3];
    }
    sums[y] = sum;
  }
  return sums;
}

function spansFromSums(
  sums: number[],
  maxPer: number,
  expected: number,
  axis: 'x' | 'y',
) {
  const isEmpty = sums.map((v) => v <= maxPer * EMPTY_RATIO);
  const buildSpans = (emptyArr: boolean[]) => {
    const spans: Span[] = [];
    let inSpan = false;
    let start = 0;
    for (let i = 0; i < emptyArr.length; i++) {
      const empty = emptyArr[i];
      if (!empty && !inSpan) {
        inSpan = true;
        start = i;
      }
      if ((empty || i === emptyArr.length - 1) && inSpan) {
        const end = empty ? i - 1 : i;
        if (end >= start) spans.push({ start, end });
        inSpan = false;
      }
    }
    return spans;
  };

  let spans = buildSpans(isEmpty);
  if (spans.length === expected) return { spans, isEmpty };

  // Try to merge tiny empty gaps inside sprites.
  const emptyRuns: number[] = [];
  let run = 0;
  for (let i = 0; i < isEmpty.length; i++) {
    if (isEmpty[i]) run++;
    else if (run > 0) {
      emptyRuns.push(run);
      run = 0;
    }
  }
  if (run > 0) emptyRuns.push(run);
  const maxGap = emptyRuns.length ? Math.max(...emptyRuns) : 0;
  const mergeGap = Math.max(1, Math.floor(maxGap * 0.4));
  const filled = isEmpty.slice();
  let r = 0;
  for (let i = 0; i < filled.length; i++) {
    if (filled[i]) r++;
    else if (r > 0) {
      if (r <= mergeGap) {
        for (let k = i - r; k < i; k++) filled[k] = false;
      }
      r = 0;
    }
  }
  if (r > 0 && r <= mergeGap) {
    for (let k = filled.length - r; k < filled.length; k++) filled[k] = false;
  }

  spans = buildSpans(filled);
  if (spans.length !== expected) {
    throw new Error(
      `Failed to detect ${expected} ${axis}-spans. Got ${spans.length}. Try inspecting ${DEBUG_OUT}.`,
    );
  }
  return { spans, isEmpty };
}

async function writeDebugOverlay(
  inputPath: string,
  width: number,
  height: number,
  xSpans: Span[] | null,
  ySpans: Span[] | null,
  outPath: string,
) {
  const lines: string[] = [];
  if (xSpans) {
    for (const s of xSpans) {
      lines.push(`<line x1="${s.start}" y1="0" x2="${s.start}" y2="${height}" stroke="red" stroke-width="1"/>`);
      lines.push(`<line x1="${s.end}" y1="0" x2="${s.end}" y2="${height}" stroke="red" stroke-width="1"/>`);
    }
  }
  if (ySpans) {
    for (const s of ySpans) {
      lines.push(`<line x1="0" y1="${s.start}" x2="${width}" y2="${s.start}" stroke="lime" stroke-width="1"/>`);
      lines.push(`<line x1="0" y1="${s.end}" x2="${width}" y2="${s.end}" stroke="lime" stroke-width="1"/>`);
    }
  }
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${lines.join('')}</svg>`;
  await sharp(inputPath).composite([{ input: Buffer.from(svg), top: 0, left: 0 }]).png().toFile(outPath);
}

function bboxInCell(
  data: Buffer,
  width: number,
  height: number,
  cell: { left: number; top: number; w: number; h: number },
) {
  let minX = cell.left + cell.w;
  let minY = cell.top + cell.h;
  let maxX = cell.left;
  let maxY = cell.top;
  let found = false;
  for (let y = cell.top; y < cell.top + cell.h; y++) {
    let rowIdx = y * width * 4;
    for (let x = cell.left; x < cell.left + cell.w; x++) {
      const a = data[rowIdx + x * 4 + 3];
      if (a > 0) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) {
    return { left: cell.left, top: cell.top, w: 1, h: 1 };
  }
  return { left: minX, top: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

async function sliceSheetToFrames(inputPath: string, outDir: string, debugOut: string) {
  await fs.mkdir(outDir, { recursive: true });

  const img = sharp(inputPath);
  const meta = await img.metadata();
  if (!meta.width || !meta.height) throw new Error(`Invalid image: ${inputPath}`);

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  let xSpans: Span[] | null = null;
  let ySpans: Span[] | null = null;
  try {
    const xSums = sumAlphaByColumn(data, w, h);
    const ySums = sumAlphaByRow(data, w, h);
    xSpans = spansFromSums(xSums, h * 255, EXPECT_COLS, 'x').spans;
    ySpans = spansFromSums(ySums, w * 255, EXPECT_ROWS, 'y').spans;
  } catch (err) {
    await writeDebugOverlay(inputPath, w, h, xSpans, ySpans, debugOut);
    throw err;
  }

  const cells = [];
  for (let ry = 0; ry < ySpans.length; ry++) {
    for (let cx = 0; cx < xSpans.length; cx++) {
      const xs = xSpans[cx];
      const ys = ySpans[ry];
      cells.push({ left: xs.start, top: ys.start, w: xs.end - xs.start + 1, h: ys.end - ys.start + 1 });
    }
  }
  if (cells.length !== 21) {
    await writeDebugOverlay(inputPath, w, h, xSpans, ySpans, debugOut);
    throw new Error(`Expected 21 cells, got ${cells.length}`);
  }

  const bboxes = cells.map((c) => bboxInCell(data, w, h, c));
  const maxW = Math.max(...bboxes.map((b) => b.w));
  const maxH = Math.max(...bboxes.map((b) => b.h));
  const outW = maxW + PADDING;
  const outH = maxH + PADDING;

  const frames = [];
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const bb = bboxes[i];
    const frameName = `frame_${String(i).padStart(2, '0')}.png`;
    const outPath = path.join(outDir, frameName);

    const trimmed = await sharp(inputPath)
      .extract({ left: bb.left, top: bb.top, width: bb.w, height: bb.h })
      .png()
      .toBuffer();

    const dx = Math.round((outW - bb.w) / 2);
    const dy = outH - bb.h;

    await sharp({
      create: {
        width: outW,
        height: outH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: trimmed, left: dx, top: dy }])
      .png()
      .toFile(outPath);

    frames.push({
      name: frameName,
      cell,
      trim: bb,
      draw: { x: dx, y: dy },
    });
  }

  const atlas = { outW, outH, frames };
  await fs.writeFile(path.join(outDir, 'atlas.json'), JSON.stringify(atlas, null, 2));
  return { outW, outH };
}

async function main() {
  await sliceSheetToFrames(GF_INPUT, GF_OUT_DIR, DEBUG_OUT);
  await sliceSheetToFrames(ME_INPUT, ME_OUT_DIR, DEBUG_ME_OUT);
  // eslint-disable-next-line no-console
  console.log('Done. GF frames + atlas + ME frames + atlas generated.');
}

main().catch(async (err) => {
  try {
    // If we failed before overlay, at least attempt a debug overlay.
    const meta = await sharp(GF_INPUT).metadata();
    if (meta.width && meta.height) {
      await writeDebugOverlay(GF_INPUT, meta.width, meta.height, null, null, DEBUG_OUT);
    }
  } catch {
    // ignore
  }
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
