/**
 * Generates `public/og/fallback.png` — the 1200×630 static fallback bytes
 * that the per-route `opengraph-image.tsx` / `twitter-image.tsx` modules read
 * at module load and return when edge-runtime rendering throws.
 *
 * The image is intentionally minimal: a solid brand-cream background that
 * satisfies the 1200×630 dimension contract for Facebook / LinkedIn / Twitter
 * crawlers. Refining the artwork is a documented follow-up — the priority
 * for task 7.3 is materialising the file and wiring.
 *
 * Writes raw PNG byte chunks so we avoid adding a new image-processing
 * dependency. Run once via `npx tsx scripts/generate-og-fallback.ts`.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const WIDTH = 1200;
const HEIGHT = 630;

// Brand cream used as the start colour of SocialPreviewImage's gradient.
const FILL = { r: 0xf7, g: 0xf4, b: 0xee } as const;

function generateScanlines(): Buffer {
  // PNG uses one leading filter byte per scanline followed by the pixel data.
  // Filter type 0 (None) is the smallest thing a decoder must support and
  // compresses trivially when the pixels are a flat colour.
  const stride = 1 + WIDTH * 3;
  const buffer = Buffer.alloc(stride * HEIGHT);

  for (let y = 0; y < HEIGHT; y++) {
    const rowStart = y * stride;
    buffer[rowStart] = 0;
    for (let x = 0; x < WIDTH; x++) {
      const pixel = rowStart + 1 + x * 3;
      buffer[pixel] = FILL.r;
      buffer[pixel + 1] = FILL.g;
      buffer[pixel + 2] = FILL.b;
    }
  }

  return buffer;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBuffer, data]);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(crcData), 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function createPng(): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB (no alpha)
  ihdr[10] = 0; // compression: deflate
  ihdr[11] = 0; // filter: adaptive (per-scanline filter byte)
  ihdr[12] = 0; // interlace: none

  const compressed = deflateSync(generateScanlines(), { level: 9 });

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function main(): void {
  const outputDir = join(process.cwd(), "public", "og");
  mkdirSync(outputDir, { recursive: true });

  const outputPath = join(outputDir, "fallback.png");
  const png = createPng();
  writeFileSync(outputPath, png);

  console.log(
    `Wrote ${outputPath} (${png.length} bytes, ${WIDTH}x${HEIGHT}).`,
  );
}

main();
