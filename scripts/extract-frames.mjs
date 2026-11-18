// Cut a video into still frames for a scroll-driven image-sequence animation.
// No ffmpeg needed: the video is decoded by the locally installed Microsoft Edge (same as screenshot.mjs),
// each frame is drawn to a canvas, and sharp resizes and encodes it.
//
// Usage:
//   node scripts/extract-frames.mjs <video> <outDir> [--frames 120] [--width 1600] [--quality 70] [--start 0] [--end <duration>]
//   node scripts/extract-frames.mjs <video> <sheet.jpg> --sheet [--frames 16]    (one contact-sheet image, to preview the video)
//
// Output: <outDir>/frame-0001.webp … plus <outDir>/frames.json ({ count, width, height, pattern }).

import puppeteer from 'puppeteer-core';
import sharp from 'sharp';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDGE = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const [videoArg, outArg, ...rest] = process.argv.slice(2);
if (!videoArg || !outArg) {
  console.error('Usage: node scripts/extract-frames.mjs <video> <outDir|sheet.jpg> [--sheet] [--frames N] [--width W] [--quality Q] [--start s] [--end s]');
  process.exit(1);
}
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(rest[i + 1]);
};
const sheetMode = rest.includes('--sheet');
const count = opt('frames', sheetMode ? 16 : 120);
const width = opt('width', 1600);
const quality = opt('quality', 70);

const videoPath = path.resolve(ROOT, videoArg);
const out = path.resolve(ROOT, outArg);

// --allow-file-access-from-files keeps the canvas untainted when it draws a file:// video
const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});

try {
  const tab = await browser.newPage();
  // Opening the video file directly gives a media page with a single <video> in it
  await tab.goto(pathToFileURL(videoPath).href);
  const meta = await tab.evaluate(async () => {
    const v = document.querySelector('video');
    v.pause();
    v.muted = true;
    if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    return { duration: v.duration, w: v.videoWidth, h: v.videoHeight };
  });

  const start = opt('start', 0);
  const end = Math.min(opt('end', meta.duration), meta.duration);
  console.log(`video: ${path.relative(ROOT, videoPath)}  ${meta.w}×${meta.h}  ${meta.duration.toFixed(2)} s  → ${count} frames from ${start}s to ${end.toFixed(2)}s`);

  // Seek to a time and return that frame as a high-quality JPEG (base64)
  const grab = (t) => tab.evaluate(async (time) => {
    const v = document.querySelector('video');
    await new Promise((r) => {
      v.addEventListener('seeked', r, { once: true });
      v.currentTime = time;
    });
    // Wait for the seeked frame to actually be presented before drawing it
    if (v.requestVideoFrameCallback) await new Promise((r) => { v.requestVideoFrameCallback(r); setTimeout(r, 250); });
    const c = document.createElement('canvas');
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    return c.toDataURL('image/jpeg', 0.95).split(',')[1];
  }, t);

  // Spread frames evenly; stay a hair before the very end, where seeking can land on a blank frame
  const span = Math.max(0, end - start - 0.04);
  const times = Array.from({ length: count }, (_, i) => start + (count === 1 ? 0 : (span * i) / (count - 1)));

  if (sheetMode) {
    const cols = 4;
    const tw = 480;
    const th = Math.round((tw * meta.h) / meta.w);
    const tiles = [];
    for (const [i, t] of times.entries()) {
      const buf = Buffer.from(await grab(t), 'base64');
      tiles.push({ input: await sharp(buf).resize(tw, th).toBuffer(), left: (i % cols) * tw, top: Math.floor(i / cols) * th });
    }
    await sharp({ create: { width: cols * tw, height: Math.ceil(count / cols) * th, channels: 3, background: '#000' } })
      .composite(tiles).jpeg({ quality: 80 }).toFile(out);
    console.log(`✔ sheet → ${out}`);
  } else {
    await mkdir(out, { recursive: true });
    for (const f of await readdir(out)) if (/^frame-\d+\.(webp|jpg)$/.test(f)) await rm(path.join(out, f));
    const outW = Math.min(width, meta.w);
    const outH = Math.round((outW * meta.h) / meta.w);
    let bytes = 0;
    for (const [i, t] of times.entries()) {
      const file = path.join(out, `frame-${String(i + 1).padStart(4, '0')}.webp`);
      const info = await sharp(Buffer.from(await grab(t), 'base64'))
        .resize(outW, outH)
        .webp({ quality, effort: 5 })
        .toFile(file);
      bytes += info.size;
      if ((i + 1) % 20 === 0 || i === count - 1) process.stdout.write(`  ${i + 1}/${count}\r`);
    }
    await writeFile(path.join(out, 'frames.json'), JSON.stringify({ count, width: outW, height: outH, pattern: 'frame-{n}.webp', pad: 4 }, null, 2));
    console.log(`\n✔ ${count} frames ${outW}×${outH} → ${path.relative(ROOT, out)}  (${(bytes / 1024 / 1024).toFixed(1)} MB total, ~${Math.round(bytes / count / 1024)} KB each)`);
  }
} finally {
  await browser.close();
}
