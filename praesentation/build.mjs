// Builds the single-file presentation: inlines CSS, fonts, scripts and pictures
// from praesentation/src/ so it runs offline from a USB stick. No dependencies.
//
//   Praesentation_GAS.html          for handing in: slides only, no speaker notes
//   Praesentation_GAS_Vortrag.html  for presenting: speaker notes and the
//                                   presenter window (key P)
//
// Usage (from the repo root):  node praesentation/build.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'src');
const MIME = { '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml' };

const dataUri = (file) => `data:${MIME[extname(file).toLowerCase()]};base64,${readFileSync(file).toString('base64')}`;
const read = (file) => readFileSync(file, 'utf8');

let html = read(join(SRC, 'index.html'));

// stylesheet with its fonts
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => {
  const cssFile = join(SRC, href);
  const css = read(cssFile).replace(/url\(([^)]+)\)/g, (m, u) => {
    const path = u.replace(/["']/g, '');
    return /^(#|data:)/.test(path) ? m : `url(${dataUri(join(dirname(cssFile), path))})`;
  });
  return `<style>\n${css}</style>`;
});

// scripts
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const js = read(join(SRC, src)).replace(/<\/script/gi, '<\\/script');
  return `<script>\n${js}\n</script>`;
});

// pictures
html = html.replace(/<img src="([^"]+)"/g, (_, src) => `<img src="${dataUri(join(SRC, src))}"`);

function write(name, text) {
  const out = join(HERE, name);
  writeFileSync(out, text);
  console.log(`${out}: ${(Buffer.byteLength(text) / 1024 / 1024).toFixed(2)} MB`);
}

// presenting: everything
write('Praesentation_GAS_Vortrag.html', html.replace('<title>Projekt GAS Präsentation</title>', '<title>Projekt GAS Vortrag</title>'));

// handing in: without the speaker notes
const notes = /\s*<aside class="notes">[\s\S]*?<\/aside>/g;
write('Praesentation_GAS.html', html.replace(notes, ''));
