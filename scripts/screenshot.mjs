// Take full-page screenshots of a page using the locally installed Microsoft Edge.
//
// Usage: node scripts/screenshot.mjs [page.html] [outDir]
// Defaults: coffe-new.html, ./screenshots

import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = process.argv[2] || 'coffe-new.html';
const outDir = path.resolve(ROOT, process.argv[3] || 'screenshots');
const EDGE = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

const viewports = [
  { name: 'desktop', width: 1440, height: 900, deviceScaleFactor: 1 },
  { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
];

await mkdir(outDir, { recursive: true });
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true });

try {
  for (const vp of viewports) {
    const tab = await browser.newPage();
    await tab.setViewport(vp);
    await tab.goto(pathToFileURL(path.join(ROOT, page)).href, { waitUntil: 'networkidle0' });

    // Show every scroll-reveal element and wait for lazy images, so the full-page shot is complete.
    await tab.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation-play-state:paused!important} [data-reveal]{opacity:1!important;transform:none!important}' });
    await tab.evaluate(async () => {
      const pending = [...document.images].filter((img) => !img.complete).map((img) => new Promise((r) => {
        img.addEventListener('load', r, { once: true });
        img.addEventListener('error', r, { once: true });
      }));
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = 'eager'; });
      await Promise.all(pending);
    });

    const file = path.join(outDir, `${path.parse(page).name}-${vp.name}.png`);
    await tab.screenshot({ path: file, fullPage: true });
    const overflow = await tab.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    console.log(`✔ ${path.relative(ROOT, file)}${overflow > 0 ? `  ⚠ horizontal overflow: ${overflow}px` : ''}`);
    await tab.close();
  }
} finally {
  await browser.close();
}
