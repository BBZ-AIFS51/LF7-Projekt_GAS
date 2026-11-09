'use strict';
/* global THREE, HEX, CSS, V3, rng */
// 3D assets of the presentation, all built from code (no model files):
// the parts of the alarm system (cm scale, real dimensions), extruded type,
// heart/skull shapes, the voxel skull, the room and the printed STL parts.

const A = {};                       // asset library, filled by A.init()

// ---------------------------------------------------------------------------
// basics
// ---------------------------------------------------------------------------
const GEO = {};
function std(color, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .45, metalness: 0 }, o)); }
function glow(color, k = 3, o = {}) {           // unlit and brighter than 1 -> bloom
  return new THREE.MeshBasicMaterial(Object.assign({ color: new THREE.Color(color).multiplyScalar(k) }, o));
}
function boxGeo(w, h, d) { const k = `b${w},${h},${d}`; return GEO[k] || (GEO[k] = new THREE.BoxGeometry(w, h, d)); }
function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (parent) parent.add(m);
  return m;
}
const box = (w, h, d, mat, x, y, z, parent) => mesh(boxGeo(w, h, d), mat, x, y, z, parent);
function cyl(rt, rb, h, mat, x, y, z, parent, seg = 32) {
  const k = `c${rt},${rb},${h},${seg}`;
  return mesh(GEO[k] || (GEO[k] = new THREE.CylinderGeometry(rt, rb, h, seg)), mat, x, y, z, parent);
}
// box with rounded edges (x = w, y = h, z = d)
function rbox(w, h, d, r = .08, seg = 3) {
  const k = `r${w},${h},${d},${r}`;
  if (GEO[k]) return GEO[k];
  r = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  const iw = w - 2 * r, ih = h - 2 * r, c = Math.min(iw, ih) * .15;
  const s = new THREE.Shape();
  s.moveTo(-iw / 2 + c, -ih / 2); s.lineTo(iw / 2 - c, -ih / 2); s.quadraticCurveTo(iw / 2, -ih / 2, iw / 2, -ih / 2 + c);
  s.lineTo(iw / 2, ih / 2 - c); s.quadraticCurveTo(iw / 2, ih / 2, iw / 2 - c, ih / 2);
  s.lineTo(-iw / 2 + c, ih / 2); s.quadraticCurveTo(-iw / 2, ih / 2, -iw / 2, ih / 2 - c);
  s.lineTo(-iw / 2, -ih / 2 + c); s.quadraticCurveTo(-iw / 2, -ih / 2, -iw / 2 + c, -ih / 2);
  const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(d - 2 * r, 1e-3), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: seg, curveSegments: 3 });
  g.translate(0, 0, -Math.max(d - 2 * r, 1e-3) / 2);
  return (GEO[k] = g);
}
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function setFont(g, font, stretch) {
  g.font = font;
  if (stretch && 'fontStretch' in g) g.fontStretch = stretch;
}
// world units -> group with a plane per letter layer (see xtext)
function addPins(n, x0, dx, y, z, mat, parent, axis = 'x') {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + i * dx;
    out.push(axis === 'x' ? box(.064, .6, .064, mat, x, y, z, parent) : box(.064, .6, .064, mat, z, y, x, parent));
  }
  return out;
}

// ---------------------------------------------------------------------------
// extruded type: the glyphs are drawn once into a canvas and stacked as
// layers (one instanced draw call), front layer in `front`, sides in `side`
// ---------------------------------------------------------------------------
function xtext(str, o = {}) {
  const font = o.font || '900 300px Archivo', pad = 24;
  const c = document.createElement('canvas'), g = c.getContext('2d');
  setFont(g, font, o.stretch ?? 'expanded');
  const m = g.measureText(str);
  const asc = Math.ceil(m.actualBoundingBoxAscent), desc = Math.ceil(m.actualBoundingBoxDescent);
  const left = Math.ceil(m.actualBoundingBoxLeft), right = Math.ceil(m.actualBoundingBoxRight);
  c.width = left + right + pad * 2; c.height = asc + desc + pad * 2;
  setFont(g, font, o.stretch ?? 'expanded');
  g.fillStyle = '#fff';
  g.fillText(str, pad + left, pad + asc);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  const size = o.size || 1, s = size / (asc + desc);
  const geo = new THREE.PlaneGeometry(c.width * s, c.height * s);
  const layers = o.layers ?? 48, depth = o.depth ?? size * .32;
  const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: .5, side: THREE.DoubleSide });
  const im = new THREE.InstancedMesh(geo, mat, layers + 1);
  const front = new THREE.Color(o.front ?? 0xffffff).multiplyScalar(o.glow ?? 1);
  const side = new THREE.Color(o.side ?? 0x333333), sideFar = new THREE.Color(o.sideFar ?? o.side ?? 0x111111);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  for (let i = 0; i <= layers; i++) {
    m4.makeTranslation(0, 0, -i * depth / layers);
    im.setMatrixAt(i, m4);
    im.setColorAt(i, i === 0 ? front : col.lerpColors(side, sideFar, i / layers));
  }
  const grp = new THREE.Group();
  grp.add(im);
  if (o.align === 'left') im.position.x = c.width * s / 2 - pad * s;
  grp.userData = { width: (left + right) * s, height: size, mesh: im, front };
  return grp;
}

// ---------------------------------------------------------------------------
// heart + skull as real 3D shapes (outline of drawHeart()/drawSkull() in the
// firmware, units = OLED pixels, y up)
// ---------------------------------------------------------------------------
function heartGeo(depth = 8, bevel = 2) {
  const s = new THREE.Shape();
  s.moveTo(0, -18);
  s.bezierCurveTo(-6, -11, -17, -4, -17, 4);
  s.bezierCurveTo(-17, 11, -12, 15, -8, 15);
  s.bezierCurveTo(-4, 15, -1, 13, 0, 9);
  s.bezierCurveTo(1, 13, 4, 15, 8, 15);
  s.bezierCurveTo(12, 15, 17, 11, 17, 4);
  s.bezierCurveTo(17, -4, 6, -11, 0, -18);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 24 });
  g.translate(0, 1.5, -depth / 2);
  return g;
}
function skullGeo(depth = 8, bevel = 1.6) {
  const a = Math.acos(1 / 3);                      // where the cranium curve meets the jaw (x = 11)
  const s = new THREE.Shape();
  s.moveTo(-7, 22); s.lineTo(7, 22);
  s.absarc(7, 10, 12, Math.PI / 2, 0, true);
  s.lineTo(19, 2);
  s.absarc(7, 2, 12, 0, -a, true);
  s.lineTo(11, -13);
  s.absarc(7, -13, 4, 0, -Math.PI / 2, true);
  s.lineTo(-7, -17);
  s.absarc(-7, -13, 4, -Math.PI / 2, -Math.PI, true);
  s.lineTo(-11, 2 - 12 * Math.sin(a));
  s.absarc(-7, 2, 12, -(Math.PI - a), -Math.PI, true);
  s.lineTo(-19, 10);
  s.absarc(-7, 10, 12, Math.PI, Math.PI / 2, true);
  const eye = (x) => { const p = new THREE.Path(); p.absarc(x, 7, 6, 0, Math.PI * 2, true); return p; };
  const nose = new THREE.Path(); nose.moveTo(0, 1); nose.lineTo(3, -4); nose.lineTo(-3, -4); nose.lineTo(0, 1);
  s.holes.push(eye(-9), eye(9), nose);
  for (let i = 0; i < 4; i++) {
    const x = -7 + i * 5, p = new THREE.Path();
    p.moveTo(x - .7, -6); p.lineTo(x - .7, -15); p.lineTo(x + .7, -15); p.lineTo(x + .7, -6); p.lineTo(x - .7, -6);
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * .6, bevelSegments: 3, curveSegments: 20 });
  g.translate(0, -2.5, -depth / 2);
  return g;
}

// ---------------------------------------------------------------------------
// OLED rasters (128 x 64) drawn with the firmware's primitives
// ---------------------------------------------------------------------------
const P2D = {
  rr(g, x, y, w, h, r, c) { g.fillStyle = c; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); },
  circ(g, x, y, r, c) { g.fillStyle = c; g.beginPath(); g.arc(x + .5, y + .5, r + .5, 0, 7); g.fill(); },
  tri(g, a, b, c2, d, e, f, c) { g.fillStyle = c; g.beginPath(); g.moveTo(a + .5, b + .5); g.lineTo(c2 + .5, d + .5); g.lineTo(e + .5, f + .5); g.closePath(); g.fill(); },
  rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
};
function drawSkull2d(g, cx, cy, fg, bg) {
  P2D.rr(g, cx - 19, cy - 22, 38, 32, 12, fg); P2D.rr(g, cx - 11, cy + 4, 22, 13, 4, fg);
  P2D.circ(g, cx - 9, cy - 7, 6, bg); P2D.circ(g, cx + 9, cy - 7, 6, bg);
  P2D.tri(g, cx, cy - 1, cx - 3, cy + 4, cx + 3, cy + 4, bg);
  P2D.rect(g, cx - 11, cy + 5, 22, 1, bg);
  for (let i = 0; i < 4; i++) P2D.rect(g, cx - 7 + i * 5, cy + 6, 1, 11, bg);
}
function drawHeart2d(g, cx, cy, fg) {
  P2D.circ(g, cx - 8, cy - 6, 9, fg); P2D.circ(g, cx + 8, cy - 6, 9, fg);
  P2D.tri(g, cx - 16, cy - 1, cx + 16, cy - 1, cx, cy + 18, fg);
}
function raster(draw, invert) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  P2D.rect(g, 0, 0, 128, 64, invert ? '#fff' : '#000');
  draw(g, invert ? '#000' : '#fff', invert ? '#fff' : '#000');
  const d = g.getImageData(0, 0, 128, 64).data, on = new Uint8Array(8192);
  for (let i = 0; i < 8192; i++) on[i] = d[i * 4] > 127 ? 1 : 0;
  return on;
}
function oledTex(on, color = '#f4f1ea') {
  const t = canvasTex(128, 64, (g) => {
    g.fillStyle = '#05060a'; g.fillRect(0, 0, 128, 64);
    g.fillStyle = color;
    for (let i = 0; i < 8192; i++) if (on[i]) g.fillRect(i % 128, (i / 128) | 0, 1, 1);
  });
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter;
  return t;
}

// voxel sculpture of the OLED skull: every lit pixel becomes a column of
// cubes, thicker inside (distance to the outline) -> rounded 3D shape
function voxelCells(on, x0 = 44, y0 = 8, w = 40, h = 44) {
  const lit = (x, y) => x >= 0 && y >= 0 && x < 128 && y < 64 && on[y * 128 + x];
  const dist = new Int16Array(8192).fill(0);
  const q = [];
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    if (!lit(x, y)) continue;
    if (!lit(x - 1, y) || !lit(x + 1, y) || !lit(x, y - 1) || !lit(x, y + 1)) { dist[y * 128 + x] = 1; q.push([x, y]); }
  }
  for (let qi = 0; qi < q.length; qi++) {
    const [x, y] = q[qi], dv = dist[y * 128 + x];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      if (lit(nx, ny) && !dist[ny * 128 + nx]) { dist[ny * 128 + nx] = dv + 1; q.push([nx, ny]); }
    });
  }
  const cells = [];
  let cx = 0, cy = 0, n = 0;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (lit(x, y)) { cx += x; cy += y; n++; }
  cx /= n; cy /= n;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const dv = dist[y * 128 + x];
    if (!dv) continue;
    const layers = Math.min(dv, 4);
    for (let z = -(layers - 1); z <= layers - 1; z++) cells.push({ x: x - cx, y: cy - y, z });
  }
  return cells;
}

// ---------------------------------------------------------------------------
// the parts of the alarm system, in cm with their real outline dimensions
// ---------------------------------------------------------------------------
function pcbTex(w, h, draw, base = '#1b22c4') {
  return canvasTex(w, h, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const r = rng(w + h);
    g.strokeStyle = 'rgba(140,160,255,.35)'; g.lineWidth = 3;
    for (let i = 0; i < 26; i++) {           // random traces
      let x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 3; k++) { if (r() < .5) x += (r() - .5) * w * .5; else y += (r() - .5) * h * .5; g.lineTo(x, y); }
      g.stroke();
    }
    draw(g, w, h);
  });
}
function boardWithTop(w, d, t, tex, sideMat) {
  const top = new THREE.MeshStandardMaterial({ map: tex, roughness: .5 });
  return new THREE.Mesh(boxGeo(w, t, d), [sideMat, sideMat, top, sideMat, sideMat, sideMat]);
}

function buildUno() {
  const g = new THREE.Group(), M = A.M;
  const tex = pcbTex(1372, 1066, (c, w, h) => {
    c.fillStyle = '#eef0ff';
    setFont(c, '900 170px Archivo', 'expanded'); c.fillText('UNO', w * .43, h * .62);
    setFont(c, '700 58px "JetBrains Mono"'); c.fillText('ARDUINO', w * .44, h * .74);
    c.fillText('DIGITAL (PWM~)', w * .48, h * .2);
    c.fillText('ANALOG IN', w * .7, h * .86);
    c.fillText('POWER', w * .37, h * .86);
    c.strokeStyle = '#eef0ff'; c.lineWidth = 5; c.strokeRect(w * .42, h * .48, w * .36, h * .3);
  });
  const pcb = boardWithTop(6.86, 5.33, .16, tex, M.pcbSide);
  pcb.position.y = .08; g.add(pcb);
  box(3.6, .32, .95, M.ink, .75, .32, .95, g);                  // ATmega328P
  for (let i = 0; i < 14; i++) { box(.07, .1, .22, M.silver, -1 + .75 + i * .254 + .1, .2, .95 - .55, g); box(.07, .1, .22, M.silver, -1 + .75 + i * .254 + .1, .2, .95 + .55, g); }
  box(1.6, 1.1, 1.2, M.silver, -3.0, .63, -1.25, g);           // USB-B
  box(1.35, 1.05, .9, M.ink, -2.95, .6, 1.75, g);              // barrel jack
  box(.6, .25, .6, M.ink, -1.6, .25, -.9, g);                  // USB chip
  cyl(.12, .12, .5, M.silver, -2.0, .25, .2, g).rotation.z = Math.PI / 2;   // crystal
  cyl(.18, .18, .2, M.red, -2.45, .25, -2.1, g);                // reset
  [[-.9, -1.7, M.ledG], [-.6, -1.7, M.ledY], [-1.2, -1.2, M.ledG]].forEach(([x, z, m]) => box(.14, .1, .08, m, x, .22, z, g));
  // headers: digital along the far edge (z = -2.45), power + analog along the near edge
  const pins = {};
  const hdr = (x0, n, z) => {
    box(n * .254, .85, .254, M.ink, x0 + (n - 1) * .254 / 2, .16 + .425, z, g);
    for (let i = 0; i < n; i++) box(.06, .25, .06, M.gold, x0 + i * .254, .16 + .85 + .05, z, g);
  };
  hdr(-0.03, 10, -2.45);                    // D13.. + GND, AREF, SDA, SCL (left part)
  hdr(2.7 - 8 * .254 + .254, 8, -2.45);     // D7..D0
  hdr(-1.05, 8, 2.45);                      // power
  hdr(1.48, 6, 2.45);                       // analog
  const top = .16 + .85 + .15;
  for (let i = 0; i <= 7; i++) pins['D' + i] = V3(2.7 - i * .254, top, -2.45);
  for (let i = 8; i <= 13; i++) pins['D' + i] = V3(-0.03 + (5 - (i - 8)) * .254 + 4 * .254, top, -2.45);
  for (let i = 0; i <= 5; i++) pins['A' + i] = V3(1.48 + i * .254, top, 2.45);
  pins['5V'] = V3(-1.05 + 4 * .254, top, 2.45); pins['GND'] = V3(-1.05 + 5 * .254, top, 2.45);
  pins['3V3'] = V3(-1.05 + 3 * .254, top, 2.45); pins['VIN'] = V3(-1.05 + 7 * .254, top, 2.45);
  g.userData.pins = pins;
  return g;
}

function keyAtlas() {
  return canvasTex(1024, 1024, (c) => {
    const K = ['123A', '456B', '789C', '*0#D'];
    c.clearRect(0, 0, 1024, 1024);
    setFont(c, '900 150px Archivo', 'normal');
    c.textAlign = 'center'; c.textBaseline = 'middle';
    K.forEach((row, r) => [...row].forEach((ch, k) => {
      c.fillStyle = /[A-D]/.test(ch) || ch === '*' || ch === '#' ? '#fff8ef' : '#0d0d0f';
      c.fillText(ch, k * 256 + 128, r * 256 + 140);
    }));
  });
}
function buildKeypad() {
  const g = new THREE.Group(), M = A.M;
  box(6.9, .12, 7.7, M.ink, 0, .06, 0, g);
  const atlas = A.keyAtlas || (A.keyAtlas = keyAtlas());
  const keys = [];
  const K = ['123A', '456B', '789C', '*0#D'];
  K.forEach((row, r) => [...row].forEach((ch, c) => {
    const x = (c - 1.5) * 1.6, z = (r - 1.5) * 1.75;
    const accent = /[A-D]/.test(ch) ? 'red' : (ch === '*' || ch === '#') ? 'blue' : 'cream';
    const kg = new THREE.Group(); kg.position.set(x, .12, z); g.add(kg);
    const keyMat = M['key_' + accent].clone();
    mesh(rbox(1.36, 1.5, .34, .12), keyMat, 0, .17, 0, kg).rotation.x = -Math.PI / 2;
    const pg = new THREE.PlaneGeometry(1.1, 1.1);
    const uv = pg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (c + uv.getX(i)) / 4, 1 - (r + 1 - uv.getY(i)) / 4);
    const label = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ map: atlas, transparent: true, depthWrite: false }));
    label.rotation.x = -Math.PI / 2; label.position.y = .355; kg.add(label);
    keys.push({ ch, r, c, group: kg, mat: keyMat, base: keyMat.color.clone() });
  }));
  box(2.2, .03, 3.2, M.silver, 0, .03, 3.85 + 1.6, g);          // ribbon cable
  box(2.4, .3, .5, M.ink, 0, .15, 3.85 + 3.2, g);
  g.userData.keys = keys;
  return g;
}

function buildOled() {
  const g = new THREE.Group(), M = A.M;
  const tex = pcbTex(540, 560, (c) => {
    c.fillStyle = '#eef0ff'; setFont(c, '700 34px "JetBrains Mono"');
    c.fillText('VCC GND SCL SDA', 120, 52);
  });
  box(2.7, .12, 2.8, M.pcbSide, 0, .06, 0, g).material = [M.pcbSide, M.pcbSide, new THREE.MeshStandardMaterial({ map: tex, roughness: .5 }), M.pcbSide, M.pcbSide, M.pcbSide];
  box(2.66, .1, 1.95, M.glass, 0, .17, .2, g);
  const screens = { heart: oledTex(A.PX.heart), skull: oledTex(A.PX.skull), skullInv: oledTex(A.PX.skullInv, '#ffffff') };
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.46, 1.23), new THREE.MeshBasicMaterial({ map: screens.heart, color: new THREE.Color(1, 1, 1).multiplyScalar(1.9) }));
  scr.rotation.x = -Math.PI / 2; scr.position.set(0, .226, .2); g.add(scr);
  for (let i = 0; i < 4; i++) box(.06, .5, .06, M.gold, -.38 + i * .254, -.15, -1.2, g);
  g.userData = { screen: scr, screens };
  return g;
}

function buildRfid() {
  const g = new THREE.Group(), M = A.M;
  const tex = pcbTex(1200, 800, (c, w, h) => {
    c.strokeStyle = '#e9a13b'; c.lineWidth = 16;
    for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(60 + i * 34, 60 + i * 34, 620 - i * 68, h - 120 - i * 68, 50 - i * 8); c.stroke(); }
    c.fillStyle = '#eef0ff'; setFont(c, '700 54px "JetBrains Mono"'); c.fillText('RFID-RC522', 760, 720);
  });
  const pcb = boardWithTop(6.0, 4.0, .12, tex, M.pcbSide);
  pcb.position.y = .06; g.add(pcb);
  box(.9, .16, .9, M.ink, 1.9, .2, .1, g);
  cyl(.12, .12, .4, M.silver, 1.9, .2, -1.1, g).rotation.z = Math.PI / 2;
  box(.254 * 8, .25, .254, M.ink, 2.75, .2, 0, g).rotation.y = Math.PI / 2;
  // card hovering above the reader
  const cardTex = canvasTex(856, 540, (c, w, h) => {
    c.fillStyle = CSS.cream; c.fillRect(0, 0, w, h);
    c.fillStyle = CSS.red; c.fillRect(0, h * .62, w, h * .2);
    c.fillStyle = CSS.ink; setFont(c, '900 96px Archivo', 'expanded'); c.fillText('GAS', 48, 150);
    setFont(c, '400 34px "JetBrains Mono"'); c.fillText('RFID · 13,56 MHZ', 52, 215);
    c.fillStyle = '#c9a24a'; c.beginPath(); c.roundRect(w - 220, 80, 140, 110, 16); c.fill();
  });
  const card = new THREE.Mesh(rbox(8.56, 5.4, .08, .03), [new THREE.MeshStandardMaterial({ map: cardTex, roughness: .35 }), M.cream]);
  // extrude caps use group 0 (front/back), sides group 1; fix UVs of the caps to 0..1
  const uv = card.geometry.attributes.uv, pos = card.geometry.attributes.position;
  if (!card.geometry.userData.uvFixed) {
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 8.56 + .5, pos.getY(i) / 5.4 + .5);
    card.geometry.userData.uvFixed = true;
  }
  const cardG = new THREE.Group(); cardG.add(card); card.rotation.x = -Math.PI / 2; card.scale.setScalar(.62);
  cardG.position.set(-.6, 1.6, 0); g.add(cardG);
  g.userData = { card: cardG };
  return g;
}

function buildPir() {
  const g = new THREE.Group(), M = A.M;
  const pcb = boardWithTop(3.2, 2.4, .12, pcbTex(320, 240, () => {}, '#1d6b3a'), M.pirSide);
  pcb.position.y = .06; g.add(pcb);
  box(2.3, .25, 2.3, M.cream, 0, .25, 0, g);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.12, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2), M.dome);
  dome.position.y = .37; g.add(dome);
  cyl(.22, .22, .3, M.orange, -1.15, -.12, .75, g);
  cyl(.22, .22, .3, M.orange, -1.15, -.12, -.75, g);
  for (let i = 0; i < 3; i++) box(.06, .5, .06, M.gold, 1.4, -.3, -.254 + i * .254, g);
  return g;
}

function buildBuzzer() {
  const g = new THREE.Group(), M = A.M;
  cyl(.6, .6, .85, M.inkGloss, 0, .425, 0, g, 48);
  cyl(.12, .12, .02, M.hole, 0, .86, 0, g);
  box(.22, .02, .05, M.white, .32, .86, -.25, g); box(.05, .02, .22, M.white, .32, .86, -.25, g);
  cyl(.03, .03, .8, M.silver, -.2, -.3, 0, g); cyl(.03, .03, .8, M.silver, .2, -.3, 0, g);
  return g;
}

function buildBattery() {
  const g = new THREE.Group(), M = A.M;
  const tex = canvasTex(512, 1024, (c, w, h) => {
    c.fillStyle = CSS.ink; c.fillRect(0, 0, w, h);
    c.fillStyle = CSS.red; c.fillRect(0, h * .55, w, h * .2);
    c.fillStyle = CSS.cream; setFont(c, '900 150px Archivo', 'expanded'); c.fillText('9V', 70, h * .45);
  });
  const body = new THREE.Mesh(boxGeo(2.65, 4.85, 1.75), [M.ink, M.ink, M.ink, M.ink, new THREE.MeshStandardMaterial({ map: tex, roughness: .4 }), M.ink]);
  body.position.y = 2.425; g.add(body);
  cyl(.3, .3, .3, M.silver, -.6, 5.0, 0, g, 6); cyl(.3, .3, .3, M.silver, .6, 5.0, 0, g, 16);
  return g;
}

function buildBreadboard() {
  const g = new THREE.Group();
  const tex = canvasTex(900, 700, (c, w, h) => {
    c.fillStyle = '#f2f0ea'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#4a4a50';
    for (let x = 0; x < 17; x++) for (let y = 0; y < 10; y++) c.fillRect(40 + x * 50, 60 + y * 55 + (y >= 5 ? 40 : 0), 16, 16);
  });
  box(4.6, .85, 3.5, A.M.white, 0, .425, 0, g).material = [A.M.white, A.M.white, new THREE.MeshStandardMaterial({ map: tex, roughness: .6 }), A.M.white, A.M.white, A.M.white];
  return g;
}

// stylised person (m): body, head, swinging arms and legs
function buildPerson(mat) {
  const g = new THREE.Group();
  const part = (r, l, x, y, parent) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0); parent.add(pivot);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), mat); m.position.y = -l / 2 - r * .3; pivot.add(m);
    return pivot;
  };
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.2, .55, 6, 14), mat); torso.position.y = 1.2; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.16, 20, 14), mat); head.position.y = 1.72; g.add(head);
  const legL = part(.085, .62, -.1, .88, g), legR = part(.085, .62, .1, .88, g);
  const armL = part(.065, .5, -.29, 1.48, g), armR = part(.065, .5, .29, 1.48, g);
  g.userData = { legL, legR, armL, armR };
  return g;
}
function walk(person, phase, amount = 1) {
  const s = Math.sin(phase) * .55 * amount, u = person.userData;
  u.legL.rotation.x = s; u.legR.rotation.x = -s; u.armL.rotation.x = -s * .8; u.armR.rotation.x = s * .8;
}

// ---------------------------------------------------------------------------
// the printed enclosure: STL meshes from docs/viewer/enclosure.js (cm), the
// layout follows gehaeuse.scad like buildCase() in docs/viewer/index.html
// ---------------------------------------------------------------------------
function stlGeo(name) {
  const k = 'stl_' + name;
  if (GEO[k]) return GEO[k];
  const d = window.GAS_ENCLOSURE[name];
  const bin = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;
  const q = new Int16Array(bin(d.v));
  const idx = d.i32 ? new Uint32Array(bin(d.i)) : new Uint16Array(bin(d.i));
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(idx.length * 3);
  for (let i = 0; i < idx.length; i++) for (let a = 0; a < 3; a++) pos[i * 3 + a] = q[idx[i] * 3 + a] / 1000;  // 1/100 mm -> cm
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();                         // flat facets, fine for printed parts
  g.computeBoundingBox();
  g.userData.edges = new THREE.EdgesGeometry(g, 30);
  return (GEO[k] = g);
}
const CASE = (() => {
  const G = {
    wall: 2.4, floor_t: 2.4, lid_t: 2.4, cu_w: 90, cu_depth: 40, keypad_h: 77, ribbon_slot_h: 4, rfid_h: 40,
    oled_w: 36, oled_h: 34, guide_t: 1.2, fit: 0.25, uno_standoff_h: 5, su_w: 52, su_h: 44, su_depth: 30,
    pir_post_h: 3, su_angle: 60, wedge_min: 5, bb_cy: 115, bat_t: 17.5, bat_l: 48.5, bat_y: 82
  };
  const lipIn = G.wall + 0.3 + 1.6;
  G.cu_cx = G.cu_w / 2;
  G.slot_y = lipIn + 0.8;
  G.kp_y = G.slot_y + G.ribbon_slot_h;
  G.rfid_cy = G.kp_y + G.keypad_h + 4 + G.rfid_h / 2;
  G.oled_cy = G.rfid_cy + G.rfid_h / 2 + 3 + G.guide_t + G.oled_h / 2;
  G.cu_h = Math.ceil(G.oled_cy + G.oled_h / 2 + 3 + lipIn);
  G.cu_th = G.floor_t + G.cu_depth;
  G.buzzer_x = (G.cu_cx + G.oled_w / 2 + G.fit + G.guide_t + G.cu_w - lipIn) / 2;
  G.uno_x = G.cu_cx - 53.34 / 2;
  G.uno_y = G.wall + 6.2 + 0.4;
  G.uno_z = G.floor_t + G.uno_standoff_h;
  G.su_th = G.floor_t + G.su_depth;
  G.wedge_max = G.wedge_min + G.su_w * Math.sin(G.su_angle * Math.PI / 180);
  return G;
})();

// ---------------------------------------------------------------------------
A.init = function init() {
  const M = A.M = {
    cream: std(HEX.cream, { roughness: .5 }), ink: std(0x18181c, { roughness: .45 }), inkGloss: std(0x141418, { roughness: .2 }),
    red: std(HEX.red, { roughness: .4 }), blue: std(HEX.blue, { roughness: .4 }), white: std(0xf4f2ee, { roughness: .55 }),
    pcbSide: std(0x141a8a, { roughness: .5 }), pirSide: std(0x14502b, { roughness: .5 }),
    gold: std(0xd9b25a, { metalness: .9, roughness: .3 }), silver: std(0xc9ccd2, { metalness: .9, roughness: .28 }),
    glass: std(0x050507, { roughness: .08, metalness: .2 }), hole: std(0x000000, { roughness: 1 }),
    orange: std(0xe58a2b, { roughness: .4 }), dome: std(0xf7f5f0, { roughness: .3, flatShading: true }),
    key_cream: std(HEX.cream, { roughness: .35 }), key_red: std(HEX.red, { roughness: .35 }), key_blue: std(HEX.blue, { roughness: .35 }),
    ledG: glow(0x7dffb0, 2.5), ledY: glow(0xffd36b, 2.5)
  };
  A.PX = {
    heart: raster((g, f) => drawHeart2d(g, 64, 30, f)),
    skull: raster((g, f, b) => drawSkull2d(g, 64, 32, f, b)),
    skullInv: raster((g, f, b) => drawSkull2d(g, 64, 32, f, b), true)
  };
  A.skullCells = voxelCells(A.PX.skull);
};
Object.assign(A, {
  std, glow, box, cyl, mesh, rbox, canvasTex, setFont, xtext, heartGeo, skullGeo, oledTex, raster,
  uno: buildUno, keypad: buildKeypad, oled: buildOled, rfid: buildRfid, pir: buildPir, buzzer: buildBuzzer,
  battery: buildBattery, breadboard: buildBreadboard, person: buildPerson, walk, stlGeo, CASE
});
