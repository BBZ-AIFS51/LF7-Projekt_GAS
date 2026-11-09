// Exports praesentation/index.html as an MP4 (no sound), frame by frame, so the
// video is smooth even on a slow machine. Needs Playwright + Chromium and ffmpeg.
//
// Usage (from the repo root):
//   node tools/render-praesentation.mjs                        -> praesentation/praesentation.mp4
//   node tools/render-praesentation.mjs out.mp4 --fps 30 --jobs 3
//   node tools/render-praesentation.mjs out.mp4 --slides 4-6   (only some scenes, 0-based)
//   node tools/render-praesentation.mjs --stills out_dir       (one PNG per scene, for checking)
//
// --jobs renders groups of scenes in parallel browsers and joins the parts
// with ffmpeg. Without a graphics card (software WebGL) a frame takes 1-2 s.

import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const URL = pathToFileURL(join(ROOT, 'praesentation', 'index.html')).href + '?render';
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

async function loadPlaywright() {
  for (const name of ['playwright', '@playwright/test']) {
    try { return await import(name); } catch { /* next */ }
    try { return createRequire(import.meta.url)(name); } catch { /* next */ }
  }
  console.error('Playwright is missing: npm install --no-save playwright && npx playwright install chromium');
  process.exit(1);
}

const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv.splice(i, 2)[1] : def; };
const stills = argv.includes('--stills') && argv.splice(argv.indexOf('--stills'), 1);
const fps = +opt('--fps', 30), jobs = +opt('--jobs', 1), only = opt('--slides', null);
const out = resolve(argv[0] || join(ROOT, 'praesentation', stills ? 'stills' : 'praesentation.mp4'));
const { chromium } = await loadPlaywright();

async function openPage() {
  const browser = await chromium.launch({ args: ARGS });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.goto(URL);
  await page.waitForFunction(() => window.GAS && window.GAS.ready, null, { timeout: 300000 });
  return { browser, page };
}

const probe = await openPage();
const durations = await probe.page.evaluate(() => window.GAS.durations());
let slides = durations.map((_, i) => i);
if (only) { const [a, b = a] = only.split('-').map(Number); slides = slides.filter((i) => i >= a && i <= b); }
const startOf = (i) => durations.slice(0, i).reduce((s, d) => s + d, 0);

if (stills) {
  mkdirSync(out, { recursive: true });
  for (const i of slides) {
    await probe.page.evaluate(([i, t, g]) => window.GAS.seek(i, t, g), [i, durations[i] - .4, startOf(i) + durations[i] - .4]);
    await probe.page.screenshot({ path: join(out, `${String(i).padStart(2, '0')}.png`) });
  }
  await probe.browser.close();
  console.log(`${slides.length} stills -> ${out}`);
  process.exit(0);
}
await probe.browser.close();

// split the scenes into `jobs` groups with about the same number of frames
const groups = Array.from({ length: Math.min(jobs, slides.length) }, () => []);
const total = slides.reduce((s, i) => s + durations[i], 0);
let acc = 0;
slides.forEach((i) => { groups[Math.min(groups.length - 1, Math.floor(acc / total * groups.length))].push(i); acc += durations[i]; });

const tmp = mkdtempSync(join(tmpdir(), 'gas-render-'));
const done = new Array(groups.length).fill(0), all = groups.map((g) => g.reduce((s, i) => s + Math.round(durations[i] * fps), 0));
const report = () => process.stdout.write(`\r${groups.map((_, j) => `job ${j + 1}: ${done[j]}/${all[j]}`).join('  ')}   `);

async function renderGroup(g, j) {
  const { browser, page } = await openPage();
  const file = join(tmp, `part${j}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '19', '-preset', 'medium', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (const i of g) {
    const frames = Math.round(durations[i] * fps);
    for (let f = 0; f < frames; f++) {
      const t = f / fps;
      await page.evaluate(([i, t, gt]) => window.GAS.seek(i, t, gt), [i, t, startOf(i) + t]);
      const jpg = await page.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
      done[j]++; report();
    }
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  return file;
}

const parts = await Promise.all(groups.map(renderGroup));
writeFileSync(join(tmp, 'list.txt'), parts.map((p) => `file '${p}'`).join('\n'));
const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', join(tmp, 'list.txt'), '-c', 'copy', '-movflags', '+faststart', out], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
console.log(r.status === 0 ? `\n${total.toFixed(1)} s -> ${out}` : '\nffmpeg concat failed');
