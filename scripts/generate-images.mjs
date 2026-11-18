// Generate page images with the Gemini API.
//
// Usage:
//   node scripts/generate-images.mjs            -> generate missing images
//   node scripts/generate-images.mjs hero       -> only the "hero" image
//   node scripts/generate-images.mjs --force    -> regenerate even if the file exists
//
// Requires the GEMINI_API_KEY environment variable.
// Override the model with GEMINI_IMAGE_MODEL if needed.

import 'dotenv/config'; // loads GEMINI_API_KEY from .env
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'images');
const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const API_KEY = process.env.GEMINI_API_KEY;

// Shared style so every image on the page looks like one set.
const STYLE = [
  'Moody, cinematic specialty-coffee product photography.',
  'Very dark espresso-brown background (close to #120a06) that fades to near black at the edges,',
  'warm amber and gold rim light, rich roasted-brown tones, soft natural shadows, shallow depth of field.',
  'Premium, editorial, minimal composition. No text, no logos, no watermarks, no people.',
].join(' ');

const IMAGES = {
  hero: {
    file: 'hero.png',
    aspectRatio: '4:5',
    prompt:
      'A handmade matte ceramic espresso cup on a saucer, centered, filled with espresso with thick ' +
      'golden crema and a delicate heart latte-art. Wisps of steam rising and catching the light. ' +
      'A few dark roasted coffee beans scattered on the surface around the saucer. ' +
      'Three-quarter view from slightly above. Plenty of dark empty space around the subject so it ' +
      'blends into a dark web page.',
  },
};

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

async function generate(name, { file, aspectRatio, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${prompt}\n\nStyle: ${STYLE}` }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio },
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${data?.error?.message || JSON.stringify(data)}`);
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const img = parts.find((p) => p.inlineData?.data);
  if (!img) {
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason || 'unknown';
    const text = parts.map((p) => p.text).filter(Boolean).join(' ');
    throw new Error(`No image returned (reason: ${reason}). ${text}`);
  }

  const ext = img.inlineData.mimeType === 'image/jpeg' ? '.jpg' : '.png';
  const outFile = path.join(OUT_DIR, file.replace(/\.\w+$/, ext));
  await writeFile(outFile, Buffer.from(img.inlineData.data, 'base64'));
  console.log(`✔ ${name} -> ${path.relative(ROOT, outFile)}`);
}

async function main() {
  if (!API_KEY) {
    console.error('GEMINI_API_KEY is not set. Set it, restart your terminal/VS Code, and try again.');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const names = args.filter((a) => !a.startsWith('--'));
  const selected = names.length ? names : Object.keys(IMAGES);

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`Model: ${MODEL}`);

  let failed = 0;
  for (const name of selected) {
    const spec = IMAGES[name];
    if (!spec) { console.error(`✘ Unknown image "${name}". Known: ${Object.keys(IMAGES).join(', ')}`); failed++; continue; }
    if (!force && await exists(path.join(OUT_DIR, spec.file))) { console.log(`• ${name} exists, skipping (use --force)`); continue; }
    try {
      console.log(`… generating ${name}`);
      await generate(name, spec);
    } catch (err) {
      console.error(`✘ ${name}: ${err.message}`);
      failed++;
    }
  }
  process.exit(failed ? 1 : 0);
}

main();
