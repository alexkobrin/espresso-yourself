// Turn full-size images from images/originals/ into web-ready JPGs in images/.
//
// Usage: npm run optimize
// Workflow: save a Gemini download into images/originals/ with its final name
// (e.g. origin-kona.jpg or .png), then run this script.

import sharp from 'sharp';
import { readdir, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'images', 'originals');
const OUT = path.join(ROOT, 'images');
const MAX_WIDTH = 1200; // ~2x the largest on-page display width
const QUALITY = 80;

// Images shown full-screen (or close to it) need more pixels than the default.
const WIDTHS = {
  'xh-hero': 2400,
  'xh-gold-dust': 2400,
  'xh-reserve': 2400,
  'xh-box-closed': 2000,
  'xh-box-open': 2000,
};

await mkdir(SRC, { recursive: true });
const files = (await readdir(SRC)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
if (!files.length) {
  console.log('No images in images/originals/.');
  process.exit(0);
}

for (const file of files) {
  const name = path.parse(file).name;
  const input = path.join(SRC, file);
  const output = path.join(OUT, `${name}.jpg`);

  const info = await sharp(input)
    .rotate()
    .resize({ width: WIDTHS[name] ?? MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: QUALITY, mozjpeg: true, progressive: true })
    .toFile(output);

  const before = (await stat(input)).size / 1024;
  console.log(`✔ ${name}.jpg  ${info.width}x${info.height}  ${before.toFixed(0)} KB → ${(info.size / 1024).toFixed(0)} KB`);
}
