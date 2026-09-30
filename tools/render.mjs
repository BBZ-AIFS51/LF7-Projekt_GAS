// Renders the enclosure pictures (Gehaeuse/bilder/*.png) and the GitHub
// social preview (docs/social-preview.png) with the 3D viewer, so the
// pictures always show the current STL files and the same parts as the viewer.
//
// Usage (from the repo root):
//   npm install --no-save playwright && npx playwright install chromium   (once)
//   optional: pngquant (apt/brew/choco) makes the PNGs about 5x smaller
//   node tools/stl2viewer.mjs        (only if an STL changed)
//   node tools/render.mjs            (all pictures)
//   node tools/render.mjs sensor     (only some of them)
//
// Every picture is a call of window.gasShot() in docs/viewer/index.html?shot.
// Units: scene in cm, label positions in mm in the frame of gehaeuse.scad.

import { writeFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VIEWER = pathToFileURL(join(ROOT, 'docs', 'viewer', 'index.html')).href + '?shot';
const BG = 'radial-gradient(ellipse 80% 75% at 50% 40%, #243145 0%, #161d2a 55%, #0e131c 100%)';
const PI = Math.PI;

const SHOTS = {
  zusammengebaut: {
    size: [1600, 1000],
    cfg: {
      housing: 'solid',
      cu: { pos: [-9.5, 0, -2], rot: [0, -0.42, 0] },
      su: { pos: [6.5, 0, 2.5], rot: [0, -1.5, 0] },
      camera: { dir: [0.14, 0.2, 1], fov: 26, fit: 0.78, shift: [0, -0.07] },
      labels: [
        { text: 'Bedienteil · außen', frame: 'cu', at: [45, 190, 30] },
        { text: 'Sensorteil · innen, auf 60°-Keil', frame: 'sBack', at: [26, 58, 20] }
      ]
    }
  },
  explosion: {
    size: [1600, 1000],
    cfg: {
      housing: 'solid', open: 1, wires: false,
      cu: { pos: [-11, 0, 9.5], rot: [-PI / 2, 0, 0] },
      su: { pos: [4.5, 0, 5], rot: [-PI / 2, 0, -0.9] },
      camera: { dir: [0.08, 0.95, 0.85], fov: 28, fit: 0.84, shift: [0, -0.04] },
      labels: [
        { text: 'Frontplatte', frame: 'lid', at: [45, 176, 3] },
        { text: 'Rückteil mit Uno', frame: 'cu', at: [100, 45, 42] },
        { text: 'Keil', frame: 'su', at: [0, 44, 50] },
        { text: 'Sensor-Rückteil', frame: 'sBack', at: [26, 44, 33] },
        { text: 'Sensor-Front', frame: 'sLid', at: [26, 44, 12] }
      ]
    }
  },
  sensor: {
    size: [1200, 1000],
    cfg: {
      housing: 'solid', open: 1,
      su: { pos: [0, 0, 0], rot: [0, -1.46, 0] },
      camera: { dir: [0.62, 0.42, 0.8], fov: 28, fit: 0.72, shift: [0, -0.06] },
      labels: [
        { text: 'Keil 60° (Wandseite)', frame: 'su', at: [10, 58, 10] },
        { text: 'Sensor-Rückteil', frame: 'sBack', at: [26, 44, 30] },
        { text: 'Front mit HC-SR501', frame: 'sLid', at: [26, 44, 3] }
      ]
    }
  },
  frontansicht: {
    size: [900, 1200],
    cfg: {
      housing: 'solid', modules: false, parts: ['control_front'], edges: 0.75, floor: false,
      cu: { pos: [0, 0, 0] },
      camera: { dir: [0, 0, 1], fov: 5, fit: 0.8, shift: [0, -0.03] },
      labels: [
        { text: 'OLED-Fenster', frame: 'lid', at: [45, 160.5, 2.4] },
        { text: 'Schalllöcher', frame: 'lid', at: [75, 157, 2.4] },
        { text: 'RFID-Feld', frame: 'lid', at: [45, 126.5, 2.4] },
        { text: 'Eckmarken fürs Keypad', frame: 'lid', at: [45, 86.9, 2.4] },
        { text: 'Schlitz fürs Flachkabel', frame: 'lid', at: [45, 9.5, 2.4] }
      ]
    }
  },
  front_innen: {
    size: [900, 1200],
    cfg: {
      housing: 'solid', modules: false, parts: ['control_front'], edges: 0.6,
      cu: { pos: [0, 0, 0], rot: [PI / 2, 0, PI] },
      camera: { dir: [0.28, 1, 0.62], fov: 28, fit: 0.84 },
      labels: [
        { text: 'OLED-Führungen', frame: 'lid', at: [25, 153, -5] },
        { text: 'Buzzer-Ring', frame: 'lid', at: [75, 159, -4] },
        { text: 'RC522-Eckführungen', frame: 'lid', at: [45, 131, -5] },
        { text: 'Rand (Lippe)', frame: 'lid', at: [4, 60, -4] },
        { text: 'Keypad-Schlitz', frame: 'lid', at: [45, 10, -4] }
      ]
    }
  },
  rueckteil: {
    size: [900, 1200],
    cfg: {
      housing: 'solid', modules: false, parts: ['control_back'], edges: 0.6,
      cu: { pos: [0, 0, 0], rot: [-PI / 2, 0, 0] },
      camera: { dir: [0.32, 1, 0.72], fov: 28, fit: 0.84 },
      labels: [
        { text: 'Kabelloch Ø 8 mm', frame: 'cu', at: [45, 145, 3] },
        { text: 'Kabelkerbe', frame: 'cu', at: [89, 150, 42.4] },
        { text: 'Wandmontage', frame: 'cu', at: [45, 88, 3] },
        { text: 'Abstandshalter Uno', frame: 'cu', at: [64, 75, 7.4] },
        { text: 'USB-B + Hohlstecker', frame: 'cu', at: [45, 0, 22] }
      ]
    }
  },
  druckplatte: {
    size: [1600, 1000],
    cfg: {
      housing: 'solid', print: true, edges: 0.5,
      camera: { dir: [0, 1, 0.78], fov: 28, fit: 0.86 },
      labels: [
        { text: 'control_back', frame: 'print', at: [50, 43, -97] },
        { text: 'control_front', frame: 'print', at: [149, 8, -97] },
        { text: 'sensor_back', frame: 'print', at: [235, 33, -35] },
        { text: 'sensor_front', frame: 'print', at: [235, 8, -96] },
        { text: 'sensor_wedge', frame: 'print', at: [245, 51, -170] }
      ]
    }
  },
  // the 3D part of the social preview, transparent background
  social: {
    size: [1120, 1280], transparent: true, out: null,
    cfg: {
      housing: 'solid', floor: false,
      cu: { pos: [-6.5, 0, 0], rot: [0, -0.5, 0] },
      su: { pos: [6.8, 0, 3.5], rot: [0, -1.45, 0] },
      camera: { dir: [0.15, 0.13, 1], fov: 26, fit: 0.84 }
    }
  }
};

// pngquant (if installed) shrinks the pictures to about a fifth, no visible difference
const HAS_PNGQUANT = spawnSync('pngquant', ['--version']).status === 0;
if (!HAS_PNGQUANT) console.log('note: pngquant not found, pictures stay uncompressed (large)');
function save(file, png) {
  writeFileSync(file, png);
  if (HAS_PNGQUANT) spawnSync('pngquant', ['--quality=80-95', '--speed', '1', '--force', '--skip-if-larger', '--output', file, file]);
  return Math.round(statSync(file).size / 1024);
}

async function loadPlaywright() {
  for (const name of ['playwright', '@playwright/test']) {
    try { return await import(name); } catch { /* try the next one */ }
  }
  console.error('Playwright is missing: npm install --no-save playwright && npx playwright install chromium');
  process.exit(1);
}

const { chromium } = await loadPlaywright();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function render(name) {
  const s = SHOTS[name];
  const page = await browser.newPage({ viewport: { width: s.size[0], height: s.size[1] } });
  page.on('pageerror', (e) => console.error(name + ': ' + e.message));
  await page.goto(VIEWER);
  await page.waitForFunction(() => window.gasShot, null, { timeout: 60000 });
  if (!s.transparent) await page.addStyleTag({ content: 'html.shot body { background: ' + BG + '; }' });
  await page.evaluate((cfg) => window.gasShot(cfg), s.cfg);
  const png = await page.screenshot({ omitBackground: !!s.transparent });
  await page.close();
  if (s.out !== null) {
    const kb = save(join(ROOT, 'Gehaeuse', 'bilder', name + '.png'), png);
    console.log('written: Gehaeuse/bilder/' + name + '.png (' + kb + ' KB)');
  }
  return png;
}

// GitHub: 1280 x 640 px, PNG/JPG/GIF under 1 MB
async function socialPreview() {
  const hero = await render('social');
  const page = await browser.newPage({ viewport: { width: 1280, height: 640 } });
  await page.goto(pathToFileURL(join(ROOT, 'tools', 'social-preview.html')).href);
  await page.evaluate(async (src) => {
    const img = document.getElementById('hero');
    img.src = src;
    await img.decode();
    await document.fonts.ready;
  }, 'data:image/png;base64,' + hero.toString('base64'));
  const kb = save(join(ROOT, 'docs', 'social-preview.png'), await page.screenshot());
  await page.close();
  console.log('written: docs/social-preview.png (' + kb + ' KB' + (kb >= 1000 ? ', TOO BIG for GitHub (max 1 MB)' : '') + ')');
}

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : [...Object.keys(SHOTS).filter((n) => n !== 'social'), 'social'];
for (const n of names) {
  if (n === 'social') await socialPreview();
  else if (SHOTS[n]) await render(n);
  else console.error('unknown picture: ' + n + ' (' + Object.keys(SHOTS).join(', ') + ')');
}
await browser.close();
