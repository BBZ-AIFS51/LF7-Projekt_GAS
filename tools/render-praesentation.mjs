// Exports praesentation/index.html as an MP4 (no sound), frame by frame, so the
// video is smooth even on a slow machine. Needs Playwright + Chromium and ffmpeg.
//
// Usage (from the repo root):
//   node tools/render-praesentation.mjs                      -> praesentation/praesentation.mp4
//   node tools/render-praesentation.mjs out.mp4 30           (file, frames per second)
//   node tools/render-praesentation.mjs --stills out_dir     (one PNG per slide, for checking)

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = pathToFileURL(join(ROOT, 'praesentation', 'index.html')).href + '?render';

async function loadPlaywright() {
  for (const name of ['playwright', '@playwright/test']) {
    try { return await import(name); } catch { /* next */ }
    try { return createRequire(import.meta.url)(name); } catch { /* next */ }
  }
  console.error('Playwright is missing: npm install --no-save playwright && npx playwright install chromium');
  process.exit(1);
}

const args = process.argv.slice(2);
const stills = args[0] === '--stills';
const out = stills ? (args[1] || join(ROOT, 'praesentation', 'stills')) : (args[0] || join(ROOT, 'praesentation', 'praesentation.mp4'));
const fps = stills ? 1 : +(args[1] || 30);

const { chromium } = await loadPlaywright();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(URL);
await page.waitForFunction(() => window.GAS && window.GAS.ready);
const durations = await page.evaluate(() => window.GAS.durations);

if (stills) {
  mkdirSync(out, { recursive: true });
  for (let i = 0; i < durations.length; i++) {
    await page.evaluate(([i, t]) => window.GAS.seek(i, t, t), [i, durations[i] - .4]);
    await page.screenshot({ path: join(out, `${String(i).padStart(2, '0')}.png`) });
  }
  console.log(`${durations.length} stills -> ${out}`);
} else {
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  let total = 0;
  for (let i = 0; i < durations.length; i++) {
    const frames = Math.round(durations[i] * fps);
    for (let f = 0; f < frames; f++) {
      const t = f / fps;
      await page.evaluate(([i, t, g]) => window.GAS.seek(i, t, g), [i, t, total + t]);
      const jpg = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    total += durations[i];
    process.stdout.write(`slide ${i + 1}/${durations.length}\r`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`\n${total.toFixed(1)} s -> ${out}`);
}
await browser.close();
