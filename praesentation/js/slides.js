'use strict';
/* global THREE, A, GAS, slide, HEX, CSS, W, H, V3, $, rng, clamp, lerp, prog, back, expo, inout, smooth */
// The 14 scenes of the talk. Every scene builds its own THREE.Scene + camera
// and an update(t) that sets everything from the slide time t (seconds), so
// the live show and the video export look the same. The texts live in
// index.html (section with the same order).

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function mkScene(bg) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(HEX[bg] ?? bg);
  s.environment = GAS.env;
  return s;
}
const mkCam = (fov = 35) => new THREE.PerspectiveCamera(fov, W / H, .05, 3000);
function lights(scene, o = {}) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x30303a, o.hemi ?? .7);
  const key = new THREE.DirectionalLight(0xfff4ea, o.key ?? 2.4); key.position.set(6, 10, 7);
  const rim = new THREE.DirectionalLight(o.rimColor ?? 0xc8d4ff, o.rim ?? 1.8); rim.position.set(-8, 5, -7);
  scene.add(hemi, key, rim);
  return { hemi, key, rim };
}
function orbit(cam, tx, ty, tz, r, theta, phi) {
  cam.position.set(tx + r * Math.sin(theta) * Math.cos(phi), ty + r * Math.sin(phi), tz + r * Math.cos(theta) * Math.cos(phi));
  cam.lookAt(tx, ty, tz);
}
const _v = V3();
// move the picture on screen without changing the perspective (sx, sy in screen widths/heights)
const shift = (cam, sx, sy = 0) => cam.setViewOffset(W, H, -sx * W, sy * H, W, H);
// put a DOM element (absolute, left/top 0) on the screen position of a 3D point
function place(el, v, cam, dx = 0, dy = 0) {
  cam.updateMatrixWorld();
  _v.copy(v).project(cam);
  el.style.transform = `translate(${((_v.x * .5 + .5) * W + dx).toFixed(1)}px, ${((-_v.y * .5 + .5) * H + dy).toFixed(1)}px)`;
  el.style.visibility = _v.z < 1 ? 'visible' : 'hidden';
}
// slam-in of a DOM element driven by t (for texts that change during a scene)
function slam(el, t, t0, dx = -480, dy = 0) {
  const k = prog(t, t0, .45), e = back(k, 1.6);
  el.style.opacity = t >= t0 ? 1 : 0;
  el.style.transform = `translate(${((1 - e) * dx).toFixed(1)}px, ${((1 - e) * dy).toFixed(1)}px)`;
  el.style.filter = `blur(${((1 - clamp(k * 1.8)) * 16).toFixed(1)}px)`;
}
const text = (el, s) => { if (el.textContent !== s) el.textContent = s; };
function dust(n, r, color, size = .05, seed = 1) {
  const R = rng(seed), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = V3(R() - .5, R() - .5, R() - .5).normalize().multiplyScalar(r * (.35 + R() * .65));
    p[i * 3] = v.x; p[i * 3 + 1] = v.y; p[i * 3 + 2] = v.z;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color, size, sizeAttenuation: true, transparent: true, opacity: .8, depthWrite: false }));
}
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = V3(), S = V3();
function setInst(im, i, x, y, z, rx, ry, rz, sx, sy, sz) {
  P.set(x, y, z); E.set(rx, ry, rz); Q.setFromEuler(E); S.set(sx, sy, sz);
  im.setMatrixAt(i, M4.compose(P, Q, S));
}
function center(obj) {        // move an object so its bounding box centre is at its parent's origin
  const b = new THREE.Box3().setFromObject(obj), c = b.getCenter(V3());
  obj.position.sub(c);
  return b.getSize(V3());
}
function wrap(obj, size) {    // scale + centre an object inside a new group
  const g = new THREE.Group(); g.add(obj);
  const s = center(obj); g.scale.setScalar(size / Math.max(s.x, s.y, s.z));
  return g;
}

// ===========================================================================
// 00 INTRO: a red dot bursts into the voxel skull of the OLED
// ===========================================================================
function voxelSkull(color) {
  const cells = A.skullCells, N = cells.length, s = .1;
  const mat = A.std(color, { roughness: .3, metalness: .15 });
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(s * .9, s * .9, s * .9), mat, N);
  const R = rng(11);
  const P0 = cells.map((c) => {
    const d = V3(R() - .5, R() - .5, R() - .5).normalize().multiplyScalar(3 + R() * 6);
    return { tx: c.x * s, ty: c.y * s, tz: c.z * s, bx: d.x, by: d.y, bz: d.z, sx: (R() - .5) * 14, sy: (R() - .5) * 14, j: R() };
  });
  return { im, mat, N, P: P0 };
}
slide({
  build() {
    const scene = mkScene('ink'), cam = mkCam(30);
    lights(scene, { key: 2.8, rim: 3.2, rimColor: 0xff7a60, hemi: .5 });
    const vx = voxelSkull(HEX.cream);
    scene.add(vx.im);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.16, 32, 16), A.glow(HEX.red, 6));
    scene.add(dot);
    const rings = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, .012, 6, 160), A.glow(HEX.red, 3, { transparent: true }));
      scene.add(m); return m;
    });
    const dd = dust(1600, 34, 0x8a8a92, .045, 3); scene.add(dd);
    const cream = new THREE.Color(HEX.cream), red = new THREE.Color(HEX.red);
    return {
      scene, camera: cam,
      update(t) {
        const kd = back(prog(t, .2, .5), 2.6) * (1 - expo(prog(t, 1.9, .2)));
        dot.scale.setScalar(Math.max(1e-4, kd * (1 + .35 * Math.sin(t * 16) * prog(t, .7, .4))));
        rings.forEach((m, i) => {
          const k = (((t - .6) * 1.2 + i / 3) % 1 + 1) % 1, on = t > .6 && t < 2.05;
          m.visible = on; m.scale.setScalar(.15 + k * 2.6); m.material.opacity = 1 - k; m.lookAt(cam.position);
        });
        const kb = expo(prog(t, 1.9, .7));
        for (let i = 0; i < vx.N; i++) {
          const a = vx.P[i];
          const ka = back(prog(t, 2.5 + a.j * .55 + (2.2 - a.ty) * .12, .9), 1.25);
          const spin = kb * (1 - ka), s = t < 1.9 ? 1e-4 : Math.min(1, kb * 4);
          setInst(vx.im, i, lerp(a.bx * kb, a.tx, ka), lerp(a.by * kb, a.ty, ka), lerp(a.bz * kb, a.tz, ka), a.sx * spin, a.sy * spin, 0, s, s, s);
        }
        vx.im.instanceMatrix.needsUpdate = true;
        const kc = prog(t, 4.35, .12);
        vx.mat.color.lerpColors(cream, red, kc);
        vx.mat.emissive.copy(red); vx.mat.emissiveIntensity = kc * (.75 + .3 * Math.sin(t * 5));
        dd.rotation.y = t * .03;
        const rad = lerp(4.2, 3.4, prog(t, 0, 1.9)) + 9.6 * inout(prog(t, 1.85, 1.7));
        orbit(cam, 0, .1, 0, rad, lerp(-.75, .5, inout(prog(t, 0, 6.5))) + Math.max(0, t - 6.5) * .1, lerp(.05, .2, inout(prog(t, 2, 3))));
        return { flash: t >= 4.35 && t < 4.47 ? .45 : 0, flashColor: HEX.red, bloom: 1.05 };
      }
    };
  }
});

// ===========================================================================
// 01 TITLE: GAS as extruded letters over a rippling dot field
// ===========================================================================
slide({
  build() {
    const scene = mkScene('red'), cam = mkCam(34);
    lights(scene, { key: 2, hemi: .9 });
    const grp = new THREE.Group(); grp.position.y = .7; scene.add(grp);
    const L = ['G', 'A', 'S'].map((ch) => A.xtext(ch, { size: 3.4, front: HEX.ink, side: 0x7d1d10, sideFar: 0x2a0905, depth: 1.5, layers: 64 }));
    const gap = .3, total = L.reduce((s, l) => s + l.userData.width, 0) + gap * 2;
    let x = -total / 2;
    L.forEach((l) => { l.userData.x = x + l.userData.width / 2; x += l.userData.width + gap; grp.add(l); });
    const cols = 60, rows = 32, n = cols * rows;
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 8, 6), A.std(0xffc1b5, { roughness: .6 }), n);
    scene.add(dots);
    return {
      scene, camera: cam,
      update(t) {
        let ca = 0;
        L.forEach((l, i) => {
          const t0 = .35 + i * .17, k = back(prog(t, t0, .7), 1.45);
          l.position.set(l.userData.x, lerp(3, 0, k), lerp(16, 0, k));
          l.rotation.set((1 - k) * -1.5, (1 - k) * (i - 1) * .9, 0);
          l.visible = t >= t0;
          if (t > t0 + .45) ca += .06 * (1 - prog(t, t0 + .45, .3));
        });
        grp.rotation.y = Math.sin(t * .45) * .26 * smooth(prog(t, 1.2, 1.2));
        grp.rotation.x = -.06 + Math.sin(t * .6) * .05;
        const amp = smooth(prog(t, .2, 1.5));
        for (let i = 0; i < n; i++) {
          const c = i % cols, r = (i / cols) | 0, px = (c - cols / 2) * .52, py = (r - rows / 2) * .52;
          const d = Math.hypot(px, py), z = -6 + Math.sin(d * .55 - t * 3.2) * .5 * amp;
          const s = .6 + .5 * Math.max(0, Math.sin(d * .55 - t * 3.2)) * amp;
          setInst(dots, i, px, py, z, 0, 0, 0, s, s, s);
        }
        dots.instanceMatrix.needsUpdate = true;
        cam.position.set(0, .3, lerp(20, 17.5, inout(prog(t, 0, 5))));
        cam.lookAt(0, .2, 0);
        return { ca: .006 + ca + .09 * (1 - expo(prog(t, 0, .5))), bloom: .6 };
      }
    };
  }
});

// ===========================================================================
// 02 IDEA: someone walks through the door into the PIR cone -> alarm
// ===========================================================================
slide({
  build(sec) {
    const scene = mkScene('cream'), cam = mkCam(30);
    lights(scene, { key: 1.7, hemi: .8, rim: .4 });
    const wallM = A.std(0xf6f1e8, { roughness: .9 }), floorM = A.std(0xe0d7c6, { roughness: .9 }), outM = A.std(0xd4cab7, { roughness: .9 });
    const edgeM = new THREE.LineBasicMaterial({ color: HEX.ink });
    const edged = (m) => { m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeM)); return m; };
    edged(A.box(9, .14, 9, floorM, 0, -.07, 0, scene));
    edged(A.box(4, .14, 9, outM, -6.6, -.07, 0, scene));
    const grid = new THREE.GridHelper(9, 18, HEX.ink, HEX.ink); grid.material.transparent = true; grid.material.opacity = .12; grid.position.y = .005; scene.add(grid);
    edged(A.box(9, 2.8, .14, wallM, 0, 1.4, -4.5, scene));
    edged(A.box(.14, 2.8, 4.6, wallM, -4.5, 1.4, -2.2, scene));
    edged(A.box(.14, 2.8, 3.4, wallM, -4.5, 1.4, 2.8, scene));
    edged(A.box(.14, .7, 1.0, wallM, -4.5, 2.45, .6, scene));
    const hinge = new THREE.Group(); hinge.position.set(-4.5, 0, .1); scene.add(hinge);
    edged(A.box(.06, 2.08, .98, A.std(HEX.blue, { roughness: .5 }), 0, 1.05, .49, hinge));
    // the sensor unit on the back wall, looking at the door (like the 60° wedge)
    const sens = new THREE.Group(); sens.position.set(3.6, 2.35, -4.38); scene.add(sens);
    A.mesh(A.rbox(.34, .3, .16, .03), A.M.cream, 0, 0, 0, sens);
    A.mesh(new THREE.SphereGeometry(.11, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), A.M.dome, 0, 0, .08, sens).rotation.x = Math.PI / 2;
    const apex = V3(3.6, 2.35, -4.25), dir = V3(-1.2, .9, -.2).sub(apex).normalize();
    const len = 10, half = .2;
    const coneGeo = new THREE.ConeGeometry(len * Math.tan(half), len, 64, 1, true); coneGeo.translate(0, -len / 2, 0);
    const coneMat = new THREE.MeshBasicMaterial({ color: HEX.blue, transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.copy(apex); cone.quaternion.setFromUnitVectors(V3(0, -1, 0), dir); scene.add(cone);
    const lp = [];
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; lp.push(0, 0, 0, Math.cos(a) * len * Math.tan(half), -len, Math.sin(a) * len * Math.tan(half)); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    const lineMat = new THREE.LineBasicMaterial({ color: HEX.blue, transparent: true, opacity: .45 });
    const lines = new THREE.LineSegments(lg, lineMat); cone.add(lines);
    const scan = new THREE.Mesh(new THREE.TorusGeometry(1, .02, 6, 96), A.glow(HEX.blue, 1.4, { transparent: true }));
    scan.rotation.x = Math.PI / 2; cone.add(scan);
    const person = A.person(A.std(HEX.ink, { roughness: .5 })); scene.add(person);
    const path = [V3(-8.2, 0, .55), V3(-4.5, 0, .6), V3(-1.4, 0, .1), V3(-.4, 0, -.4)];
    const seg = path.slice(1).map((p, i) => p.distanceTo(path[i])), total = seg.reduce((a, b) => a + b, 0);
    function at(u) {
      let d = u * total;
      for (let i = 0; i < seg.length; i++) {
        if (d <= seg[i] || i === seg.length - 1) return { p: path[i].clone().lerp(path[i + 1], clamp(d / seg[i])), dir: path[i + 1].clone().sub(path[i]) };
        d -= seg[i];
      }
    }
    const walkU = (t) => smooth(prog(t, 1.3, 3.6));
    const inCone = (p) => { const v = p.clone().add(V3(0, 1.1, 0)).sub(apex); return v.length() < len && v.normalize().dot(dir) > Math.cos(half); };
    let tAlarm = 99;
    for (let t = 0; t < 8; t += .01) if (inCone(at(walkU(t)).p)) { tAlarm = t; break; }
    const alarmLight = new THREE.PointLight(HEX.red, 0, 14, 1.4); alarmLight.position.set(0, 2.4, 0); scene.add(alarmLight);
    const tag = sec.querySelector('.pin-sensor'), tagA = sec.querySelector('.pin-alarm');
    const cream = new THREE.Color(HEX.cream), red = new THREE.Color(HEX.red);
    return {
      scene, camera: cam,
      update(t) {
        hinge.rotation.y = 1.45 * back(prog(t, .7, .9), 1.3);
        const u = walkU(t), a = at(u);
        person.position.copy(a.p);
        person.rotation.y = Math.atan2(a.dir.x, a.dir.z);
        A.walk(person, u * total * 4.2, u > 0 && u < 1 ? 1 : 0);
        const alarm = t >= tAlarm, ka = t - tAlarm;
        coneMat.color.set(alarm ? HEX.red : HEX.blue); lineMat.color.set(alarm ? HEX.red : HEX.blue);
        scan.material.color.set(alarm ? HEX.red : HEX.blue).multiplyScalar(1.6);
        coneMat.opacity = alarm ? .22 + .08 * Math.sin(t * 14) : .13;
        const sk = (t * .7) % 1, sd = sk * len;
        scan.position.set(0, -sd, 0); scan.scale.setScalar(Math.max(.01, sd * Math.tan(half))); scan.material.opacity = 1 - sk;
        alarmLight.intensity = alarm ? 18 * (.5 + .5 * Math.sin(ka * 20)) : 0;
        const flashOn = alarm && ka < 1.15 && Math.floor(ka / .19) % 2 === 0;
        scene.background.copy(flashOn ? red : cream);
        const ck = inout(prog(t, 0, 7));
        cam.position.set(lerp(12.5, 11, ck), lerp(11.5, 10, ck), lerp(17, 15, ck));
        cam.lookAt(-1.6, .2, -1.2);
        shift(cam, .19, -.1);
        place(tag, apex, cam, 14, -40);
        place(tagA, person.position.clone().add(V3(0, 2.1, 0)), cam, -40, -10);
        tagA.style.opacity = alarm ? (Math.floor(ka / .25) % 2 ? .35 : 1) : 0;
        return { threshold: 1.7, bloom: .5 };
      }
    };
  }
});

// ===========================================================================
// 03 PARTS: six new models on a turntable ring
// ===========================================================================
const PARTS = [
  ['Uno R3', 'das Gehirn', 'ATmega328P · 16 MHz · 2 KB SRAM', 'uno', 5],
  ['Keypad', 'PIN eintippen', '4×4-Matrix · D2–D9', 'keypad', 4.8],
  ['OLED', 'Herz & Totenkopf', 'SH1106 · 128 × 64 · I²C 0x3C', 'oled', 4.2],
  ['RC522', 'Karte auflegen', 'RFID 13,56 MHz · SPI · 3,3 V', 'rfid', 4.8],
  ['PIR', 'sieht Bewegung', 'HC-SR501 · A2', 'pir', 4.2],
  ['Buzzer', 'piept & heult', 'passiv · D10', 'buzzer', 3.4]
];
slide({
  build(sec) {
    const scene = mkScene('ink'), cam = mkCam(30);
    lights(scene, { key: 2.8, rim: 2.6, rimColor: 0x8fa0ff, hemi: .45 });
    const R = 7.5, ring = new THREE.Group(); scene.add(ring);
    const items = PARTS.map((p, k) => {
      const model = A[p[3]]();
      const holder = new THREE.Group(), tilt = new THREE.Group(), spin = new THREE.Group();
      const a = k / PARTS.length * Math.PI * 2;
      holder.position.set(Math.sin(a) * R, 0, Math.cos(a) * R); holder.rotation.y = a;
      tilt.rotation.x = .62;
      spin.add(wrap(model, p[4]));
      holder.add(tilt); tilt.add(spin); ring.add(holder);
      return { holder, spin, model };
    });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R + 8, 96), A.std(0x0f0f13, { roughness: .22, metalness: .6 }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = -2.6; scene.add(disc);
    [R, R + .4, R - 2.6].forEach((r, i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, i === 0 ? .035 : .012, 6, 200), A.glow(i === 0 ? HEX.red : 0x55555f, i === 0 ? 3 : 1));
      m.rotation.x = Math.PI / 2; m.position.y = -2.58; scene.add(m);
    });
    const T = PARTS.map((_, k) => .3 + k * 1.45);
    const el = { idx: sec.querySelector('.p-idx'), name: sec.querySelector('.p-name'), desc: sec.querySelector('.p-desc'), spec: sec.querySelector('.p-spec') };
    return {
      scene, camera: cam,
      update(t) {
        let idx = 0;
        for (let k = 1; k < PARTS.length; k++) idx += back(prog(t, T[k] - .5, .55), 1.3);
        ring.rotation.y = -idx / PARTS.length * Math.PI * 2;
        items.forEach((it, k) => {
          const d = Math.abs(((k - idx) % 6 + 9) % 6 - 3);         // 3 = in front
          const focus = smooth(clamp((d - 2) / 1));
          it.holder.scale.setScalar(lerp(.6, 1, focus));
          it.holder.position.y = Math.sin(t * 1.6 + k) * .18 + focus * .4;
          it.spin.rotation.y = t * .45 + k * 1.3;
        });
        items[3].model.userData.card.position.y = 1.6 + Math.sin(t * 2.2) * .35;
        const oled = items[2].model.userData;
        oled.screen.material.map = Math.floor(t / 1.2) % 2 ? oled.screens.skull : oled.screens.heart;
        let k = 0; T.forEach((x, i) => { if (t >= x) k = i; });
        const p = PARTS[k];
        text(el.idx, `0${k + 1} / 06`); text(el.name, p[0]); text(el.desc, p[1]); text(el.spec, p[2]);
        slam(el.name, t, T[k]); slam(el.desc, t, T[k] + .08); slam(el.spec, t, T[k] + .14); slam(el.idx, t, T[k], 0, -40);
        const kc = inout(prog(t, 9.0, 1.4));
        cam.position.set(0, lerp(4.4, 21, kc), lerp(R + 14.5, 8, kc));
        cam.lookAt(0, lerp(.9, -2, kc), lerp(R, 0, kc));
        return { bloom: .9, threshold: 1.35 };
      }
    };
  }
});

// ===========================================================================
// 04 STATES: a glowing orb runs along a track through the four states
// ===========================================================================
const STATES = [
  ['Unscharf', '♥ Herz auf dem Display, der Sensor wird ignoriert', 'PIN + # oder Karte'],
  ['Verzögerung', '10 Sekunden, um den Raum zu verlassen', 'nach 10 s'],
  ['Scharf', '☠ Totenkopf — jetzt zählt jede Bewegung', 'Bewegung erkannt'],
  ['Alarm', 'Totenkopf blinkt, 30 Sekunden Sirene', '']
];
slide({
  build(sec) {
    const scene = mkScene('blue'), cam = mkCam(32);
    lights(scene, { key: 2.4, hemi: .8, rim: 1.4, rimColor: 0xffffff });
    const PED = [V3(-10, 0, 1.5), V3(-3.5, 0, -1.5), V3(3.5, 0, 1.5), V3(10, 0, -1.5)];
    const curve = new THREE.CatmullRomCurve3([V3(-17, .7, 3.5), V3(-10, .7, 1.5), V3(-6.6, .7, -1), V3(-3.5, .7, -1.5), V3(0, .7, 0),
      V3(3.5, .7, 1.5), V3(6.8, .7, 1), V3(10, .7, -1.5), V3(16, .7, -3.5)]);
    const uAt = PED.map((p) => {
      let best = 0, bd = 1e9;
      for (let i = 0; i <= 2000; i++) { const q = curve.getPointAt(i / 2000); const d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = i / 2000; } }
      return best;
    });
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 400, .05, 8), A.glow(HEX.cream, 1.15)));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), A.std(0x2326d8, { roughness: .35, metalness: .3 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.01; scene.add(floor);
    const icons = [];
    PED.forEach((p, k) => {
      A.cyl(1.3, 1.5, .6, A.M.cream, p.x, .3, p.z, scene, 64);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.32, .04, 8, 96), A.glow(k === 3 ? HEX.red : HEX.cream, 2.2));
      ring.rotation.x = Math.PI / 2; ring.position.set(p.x, .61, p.z); scene.add(ring);
      const ic = new THREE.Group(); ic.position.set(p.x, 2.6, p.z); scene.add(ic);
      icons.push(ic);
    });
    const heart = A.mesh(A.heartGeo(), A.std(HEX.red, { roughness: .3 })); heart.scale.setScalar(.055); icons[0].add(heart);
    const timer = [];
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2;
      const b = A.box(.14, .4, .14, A.glow(HEX.cream, 1.6), Math.sin(a) * 1, Math.cos(a) * 1, 0, icons[1]);
      b.rotation.z = -a; timer.push(b);
    }
    const tnum = A.xtext('10', { size: .7, front: HEX.cream, side: 0x9aa0ff, depth: .25, layers: 16 }); icons[1].add(tnum);
    const skull = A.mesh(A.skullGeo(), A.std(HEX.cream, { roughness: .3 })); skull.scale.setScalar(.05); icons[2].add(skull);
    const skullR = A.mesh(A.skullGeo(), A.std(HEX.red, { roughness: .3, emissive: HEX.red, emissiveIntensity: .6 })); skullR.scale.setScalar(.05); icons[3].add(skullR);
    const siren = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.TorusGeometry(1, .03, 6, 96), A.glow(HEX.red, 2.5, { transparent: true })); icons[3].add(m); return m; });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(.3, 32, 16), A.glow(HEX.cream, 3.2)); scene.add(orb);
    const trail = [];
    for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.22 * (1 - i / 18), 12, 8), A.glow(HEX.cream, 2, { transparent: true, opacity: .5 * (1 - i / 16) })); scene.add(m); trail.push(m); }
    const ARR = [.7, 2.5, 4.3, 6.1];
    const uOf = (t) => {
      if (t < ARR[0]) return lerp(0, uAt[0], expo(prog(t, 0, ARR[0])));
      for (let k = 1; k < 4; k++) if (t < ARR[k]) return lerp(uAt[k - 1], uAt[k], inout(prog(t, ARR[k - 1] + .25, ARR[k] - ARR[k - 1] - .25)));
      return uAt[3];
    };
    const el = { name: sec.querySelector('.s-name'), note: sec.querySelector('.s-note'), cond: sec.querySelector('.s-cond'), idx: sec.querySelector('.s-idx') };
    const blue = new THREE.Color(HEX.blue), red = new THREE.Color(HEX.red);
    const camP = V3(), camT = V3();
    return {
      scene, camera: cam,
      update(t) {
        const u = uOf(t), o = curve.getPointAt(u);
        orb.position.copy(o);
        trail.forEach((m, i) => m.position.copy(curve.getPointAt(Math.max(0, uOf(t - (i + 1) * .018)))));
        icons.forEach((ic, k) => {
          const s = back(prog(t, ARR[k] - .15, .55), 2.2);
          ic.scale.setScalar(Math.max(1e-4, s));
          ic.rotation.y = Math.sin(t * .9 + k) * .45;
          ic.position.y = 2.6 + Math.sin(t * 1.7 + k) * .12;
        });
        const left = 1 - prog(t, ARR[1], ARR[2] - ARR[1] - .2);
        timer.forEach((b, i) => { b.visible = i / 24 < left || t < ARR[1]; });
        siren.forEach((m, i) => { const k = (((t - ARR[3]) * 1.2 + i / 3) % 1 + 1) % 1; m.visible = t > ARR[3]; m.scale.setScalar(1.2 + k * 3); m.material.opacity = 1 - k; });
        const ka = t - ARR[3];
        scene.background.copy(ka > 0 && ka < 1.2 && Math.floor(ka / .2) % 2 === 0 ? red : blue);
        let k = 0; ARR.forEach((x, i) => { if (t >= x - .15) k = i; });
        text(el.name, STATES[k][0]); text(el.note, STATES[k][1]); text(el.idx, `0${k + 1} / 04`);
        el.name.style.color = k === 3 ? CSS.red : '';
        slam(el.name, t, ARR[k] - .15); slam(el.note, t, ARR[k]); slam(el.idx, t, ARR[k] - .15, 0, -40);
        const moving = ARR.findIndex((x) => t < x);
        const cond = moving > 0 && t > ARR[moving - 1] + .2 ? STATES[moving - 1][2] : '';
        text(el.cond, cond ? '→ ' + cond : ''); el.cond.style.opacity = cond ? 1 : 0;
        camP.copy(o).add(V3(-2.2, 3.4, 9.6)); camT.copy(o).add(V3(1.6, 1.2, 0));
        const kw = inout(prog(t, 6.9, 1.4));
        cam.position.copy(camP).lerp(V3(0, 10.5, 25), kw);
        cam.lookAt(camT.lerp(V3(0, 1.2, 0), kw));
        return { bloom: 1 };
      }
    };
  }
});

// ===========================================================================
// 05 DISPLAY: 8192 pixel columns, the icons ripple in as a wave
// ===========================================================================
const OLED_SEQ = [
  [.5, 'heart', 'Unscharf', 'Herz — der Sensor wird ignoriert'],
  [2.4, 'skull', 'Scharf', 'Totenkopf — jetzt zählt jede Bewegung'],
  [4.3, 'alarm', 'Alarm', 'Totenkopf blinkt, 30 s Sirene'],
  [6.4, 'heart', 'Entschärft', 'PIN oder Karte beendet den Alarm']
];
slide({
  build(sec) {
    const scene = mkScene('ink'), cam = mkCam(34);
    lights(scene, { key: 2.6, rim: 2.2, hemi: .5, rimColor: 0x9aa8ff });
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(.82, .82, 1), A.std(0xffffff, { roughness: .35, metalness: .1 }), 8192);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(8192 * 3), 3);
    scene.add(im);
    const bez = A.std(0x1d1d23, { roughness: .4 });
    A.box(134, 3, 2, bez, 0, 34.5, 0, scene); A.box(134, 3, 2, bez, 0, -34.5, 0, scene);
    A.box(3, 72, 2, bez, -65.5, 0, 0, scene); A.box(3, 72, 2, bez, 65.5, 0, 0, scene);
    const dist = new Float32Array(8192);
    for (let i = 0; i < 8192; i++) dist[i] = Math.hypot((i % 128) - 64, ((i / 128) | 0) - 32);
    const C = { off: new THREE.Color(0x202027), on: new THREE.Color(HEX.cream).multiplyScalar(1.35), red: new THREE.Color(HEX.red).multiplyScalar(1.6), front: new THREE.Color(HEX.blue).multiplyScalar(2.2) };
    const el = { name: sec.querySelector('.o-name'), note: sec.querySelector('.o-note') };
    return {
      scene, camera: cam,
      update(t) {
        const inv = Math.floor((t - OLED_SEQ[2][0]) / .3) % 2 === 1;
        for (let i = 0; i < 8192; i++) {
          let st = -1, front = 0;
          for (let k = OLED_SEQ.length - 1; k >= 0; k--) {
            const tk = OLED_SEQ[k][0] + dist[i] * .009;
            if (t >= tk) { st = k; front = 1 - clamp((t - tk) / .14); break; }
          }
          let on = 0, col = C.on;
          if (st >= 0) {
            const kind = OLED_SEQ[st][1];
            on = (kind === 'alarm' ? (inv ? A.PX.skullInv : A.PX.skull) : A.PX[kind])[i];
            if (kind === 'alarm') col = C.red;
          }
          const h = front > 0 ? 1.5 + front * 6 : on ? 2.6 : .35;
          setInst(im, i, (i % 128) - 63.5, 31.5 - ((i / 128) | 0), h / 2, 0, 0, 0, 1, 1, h);
          im.setColorAt(i, front > 0 ? C.front : on ? col : C.off);
        }
        im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
        const kc = inout(prog(t, 0, 8.5));
        cam.position.set(lerp(-74, 6, kc), lerp(-62, -40, kc), lerp(44, 92, kc));
        cam.lookAt(lerp(-6, 0, kc), lerp(-6, -9, kc), 0);
        let k = 0; OLED_SEQ.forEach((s, i) => { if (t >= s[0]) k = i; });
        text(el.name, OLED_SEQ[k][2]); text(el.note, OLED_SEQ[k][3]);
        el.name.style.color = k === 2 ? CSS.red : '';
        slam(el.name, t, OLED_SEQ[k][0], k % 2 ? 600 : -600); slam(el.note, t, OLED_SEQ[k][0] + .12, 0, 30);
        return { bloom: 1.05, threshold: .95 };
      }
    };
  }
});

// ===========================================================================
// 06 WIRING: the Uno, five parts and 17 wires growing from the pins
// ===========================================================================
slide({
  build(sec) {
    const scene = mkScene('cream'), cam = mkCam(32);
    lights(scene, { key: 2.4, hemi: 1.05, rim: .8 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), A.std(0xe7e0d2, { roughness: .95 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.6; scene.add(floor);
    const grid = new THREE.GridHelper(120, 60, HEX.ink, HEX.ink); grid.material.transparent = true; grid.material.opacity = .08; grid.position.y = -.59; scene.add(grid);
    const uno = A.uno(); uno.scale.setScalar(1.6); scene.add(uno);
    const comp = {
      keypad: { m: A.keypad(), p: [-16, -.4, 1], s: 1.25, ry: .5, at: [V3(0, .3, 7.05)], t: 1.0 },
      oled: { m: A.oled(), p: [-7, -.4, -12.5], s: 1.7, ry: .2, at: [], t: 2.4 },
      rfid: { m: A.rfid(), p: [8, -.4, -13], s: 1.35, ry: -.25, at: [], t: 1.8 },
      pir: { m: A.pir(), p: [16.5, -.2, -1], s: 1.7, ry: -.5, at: [V3(1.4, -.2, 0)], t: 2.9 },
      buzzer: { m: A.buzzer(), p: [11.5, .2, 10], s: 2.1, ry: 0, at: [V3(.2, -.3, 0)], t: 3.2 }
    };
    Object.values(comp).forEach((c) => { c.g = new THREE.Group(); c.g.position.set(...c.p); c.g.rotation.y = c.ry; c.g.add(c.m); scene.add(c.g); });
    scene.updateMatrixWorld(true);
    const pinW = (n) => uno.localToWorld(uno.userData.pins[n].clone());
    const W8 = [];
    const wire = (pin, c, local, color, t0) => {
      const p0 = pinW(pin), p3 = c.m.localToWorld(local.clone());
      c.g.updateMatrixWorld(true); const p3w = c.m.localToWorld(local.clone());
      const h = 2.5 + p0.distanceTo(p3w) * .18;
      const curve = new THREE.CubicBezierCurve3(p0, p0.clone().add(V3(0, h, 0)), p3w.clone().add(V3(0, h, 0)), p3w);
      const geo = new THREE.TubeGeometry(curve, 56, .075, 6);
      const m = new THREE.Mesh(geo, A.std(color, { roughness: .35 })); scene.add(m);
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 8), A.glow(color === HEX.ink ? HEX.cream : color, 2.6)); scene.add(pulse);
      W8.push({ m, geo, curve, t0, pulse, n: geo.index.count });
      return p3;
    };
    for (let i = 2; i <= 9; i++) wire('D' + i, comp.keypad, V3(-.9 + (i - 2) * .254, .3, 7.05), HEX.blue, 1.15 + (i - 2) * .06);
    ['D11', 'D12', 'D13', 'A0', 'A1'].forEach((n, i) => wire(n, comp.rfid, V3(2.75, .3, -.5 + i * .254), HEX.red, 2.0 + i * .08));
    ['A4', 'A5'].forEach((n, i) => wire(n, comp.oled, V3(-.38 + (3 - i) * .254, -.1, -1.2), HEX.ink, 2.6 + i * .08));
    wire('A2', comp.pir, V3(1.4, -.2, 0), 0x6a6a74, 3.1);
    wire('D10', comp.buzzer, V3(.2, -.3, 0), HEX.ink, 3.4);
    const free = ['D0', 'D1', 'A3'].map((n) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(.32, .05, 8, 40), A.glow(HEX.red, 2.4));
      m.position.copy(pinW(n)).add(V3(0, .15, 0)); m.rotation.x = Math.PI / 2; scene.add(m); return m;
    });
    const tags = [...sec.querySelectorAll('.w-tag')], tagFor = ['keypad', 'rfid', 'oled', 'pir', 'buzzer'];
    const freeTags = [...sec.querySelectorAll('.w-free')];
    return {
      scene, camera: cam,
      update(t) {
        Object.values(comp).forEach((c) => {
          c.g.scale.setScalar(Math.max(1e-4, c.s * back(prog(t, c.t - .45, .5), 1.8)));
          c.g.position.y = c.p[1] + Math.sin(t * 1.3 + c.p[0]) * .12;
        });
        W8.forEach((w) => {
          const k = expo(prog(t, w.t0, .9));
          w.geo.setDrawRange(0, Math.floor(k * 56) * 6 * 6);
          w.m.visible = k > 0;
          const run = t - w.t0 - .9;
          w.pulse.visible = run > 0;
          if (run > 0) w.pulse.position.copy(w.curve.getPointAt(((run * .55 + w.t0 * 1.7) % 1)));
        });
        free.forEach((m, i) => { const on = t > 3.9; m.visible = on && Math.floor(t * 2.5 + i) % 3 !== 0; m.scale.setScalar(back(prog(t, 3.9 + i * .1, .4), 2)); });
        const kc = inout(prog(t, .8, 3.4));
        orbit(cam, lerp(1.0, .5, kc), 0, lerp(-3.8, -2.5, kc), lerp(13, 42, kc), lerp(.15, -.18, kc) + Math.max(0, t - 4.2) * .035, lerp(1.42, .8, kc));
        shift(cam, 0, -.06 * kc);
        tags.forEach((el, i) => {
          const c = comp[tagFor[i]];
          place(el, c.g.position.clone().add(V3(0, 2.6, 0)), cam, 0, 0);
          el.style.opacity = clamp((t - c.t) * 3);
        });
        freeTags.forEach((el, i) => { place(el, free[i].position, cam, 10, -36); el.style.opacity = t > 4 ? 1 : 0; });
        return { bloom: .55, threshold: 1.7 };
      }
    };
  }
});

// ===========================================================================
// 07 ENCLOSURE: the real STL parts are printed, assembled, X-rayed, opened
// ===========================================================================
slide({
  build(sec) {
    const scene = mkScene('ink'), cam = mkCam(30);
    lights(scene, { key: 2.8, rim: 2.8, hemi: .45, rimColor: 0x9fb2ff });
    const G = A.CASE, mm = (v) => v / 10;
    const clip = new THREE.Plane(V3(0, -1, 0), 100);
    const PARTS7 = {
      control_back: { color: HEX.cream, print: [0.5, 0.95] }, control_front: { color: HEX.red, print: [10.4, 0.95] },
      sensor_back: { color: HEX.cream, print: [20.9, 1.3] }, sensor_front: { color: HEX.red, print: [20.9, 7.4] },
      sensor_wedge: { color: 0x34343c, print: [21.9, 13.4] }
    };
    // print bed + print transforms
    const bed = new THREE.Group(); scene.add(bed);
    const pei = A.canvasTex(1080, 780, (g, w, h) => {
      g.fillStyle = '#1f1f26'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2;
      for (let x = 0; x <= w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    });
    const side = A.std(0x15151a);
    bed.add(new THREE.Mesh(new THREE.BoxGeometry(28, .5, 21), [side, side, A.std(0xffffff, { map: pei, roughness: .7 }), side, side, side]));
    bed.children[0].position.y = -.25;
    const printRoot = new THREE.Group(); printRoot.position.set(-13.5, 0, 9.75); scene.add(printRoot);
    // assembly tree like buildCase() in the viewer (cm)
    const asm = new THREE.Group(); scene.add(asm);
    const cu = new THREE.Group(); cu.position.set(-10.5, 0, -2.5); cu.rotation.y = .28; asm.add(cu);
    const lid = new THREE.Group(); lid.position.z = mm(G.cu_th); cu.add(lid);
    const su = new THREE.Group(); su.position.set(8.5, 0, 2); su.rotation.y = -1.1; asm.add(su);
    const sBox = new THREE.Group(); sBox.position.z = mm(G.wedge_max); sBox.rotation.y = G.su_angle * Math.PI / 180; su.add(sBox);
    const sBack = new THREE.Group(); sBox.add(sBack);
    const sLid = new THREE.Group(); sLid.position.z = mm(G.su_th); sBack.add(sLid);
    const anchorParent = { control_back: cu, control_front: lid, sensor_back: sBack, sensor_front: sLid, sensor_wedge: su };
    const parts = Object.entries(PARTS7).map(([name, d], i) => {
      const geo = A.stlGeo(name);
      const solid = A.std(d.color, { roughness: .55, clippingPlanes: [clip], clipShadows: true, side: THREE.DoubleSide });
      const xray = A.std(d.color, { roughness: .3, transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide });
      const m = new THREE.Mesh(geo, solid); m.matrixAutoUpdate = false; scene.add(m);
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: .3 });
      m.add(new THREE.LineSegments(geo.userData.edges, edgeMat));
      const pr = new THREE.Object3D(); pr.rotation.x = -Math.PI / 2; pr.position.set(d.print[0], 0, -d.print[1]); printRoot.add(pr);
      const an = new THREE.Object3D(); anchorParent[name].add(an);
      if (name.endsWith('front')) { an.rotation.y = Math.PI; an.position.set(name === 'control_front' ? mm(G.cu_w) : mm(G.su_w), 0, mm(G.lid_t)); }
      return { name, m, solid, xray, edgeMat, pr, an, i, color: d.color };
    });
    // parts inside (visible in the X-ray phase)
    const inner = [];
    const put = (obj, parent, x, y, z, rx = 0, basis) => {
      const g = new THREE.Group(); g.add(obj); parent.add(g); g.position.set(x, y, z); g.rotation.x = rx;
      if (basis) g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(...basis));
      inner.push(g); return g;
    };
    put(A.uno(), cu, mm(G.uno_x + 26.67), mm(G.uno_y + 34.29), mm(G.uno_z), 0, [V3(0, 1, 0), V3(0, 0, 1), V3(1, 0, 0)]);
    put(A.keypad(), lid, mm(G.cu_cx), mm(G.kp_y + G.keypad_h / 2), mm(G.lid_t), Math.PI / 2);
    put(A.oled(), lid, mm(G.cu_cx), mm(G.oled_cy), -.4, Math.PI / 2);
    put(A.rfid(), lid, mm(G.cu_cx), mm(G.rfid_cy), -.35, Math.PI / 2).children[0].userData.card.visible = false;
    put(A.buzzer(), lid, mm(G.buzzer_x), mm(G.oled_cy), -1.0, Math.PI / 2);
    put(A.battery(), cu, 1.75, mm(G.bat_y - G.bat_l / 2) - .3, mm(G.floor_t) + .9);
    put(A.breadboard(), cu, 5.9, mm(G.bb_cy), mm(G.floor_t), Math.PI / 2);
    put(A.pir(), sLid, mm(G.su_w / 2), mm(G.su_h / 2), -mm(G.pir_post_h) - .1, Math.PI / 2);
    // printing effects: glowing slice plane + nozzle
    const slice = A.box(28, .02, 21, A.glow(HEX.red, 2.2, { transparent: true, opacity: .5, depthWrite: false }), 0, 0, 0, scene);
    const nozzle = A.mesh(new THREE.ConeGeometry(.35, .9, 24), A.glow(HEX.cream, 2.5)); nozzle.rotation.x = Math.PI; scene.add(nozzle);
    const pP = V3(), pQ = new THREE.Quaternion(), pS = V3(), aP = V3(), aQ = new THREE.Quaternion(), aS = V3();
    const el = { phase: sec.querySelector('.g-phase'), z: sec.querySelector('.g-z') };
    const PH = [[0, '01 · Drucken'], [3.5, '02 · Zusammenbauen'], [5.6, '03 · X-Ray'], [7.0, '04 · Aufklappen']];
    return {
      scene, camera: cam,
      update(t) {
        const h = lerp(-.02, 5.3, prog(t, .3, 3));
        const printing = t < 3.4;
        clip.constant = printing ? h : 100;
        slice.position.y = h + .01; slice.visible = printing && t > .3;
        nozzle.visible = slice.visible;
        nozzle.position.set(Math.sin(t * 9.3) * 11 + Math.sin(t * 23) * 1.5, h + .5, Math.cos(t * 6.1) * 7.5);
        bed.position.y = -14 * expo(prog(t, 3.7, 1.3));
        const ex = back(prog(t, 7.0, 1.2), 1.4);
        lid.position.z = mm(G.cu_th) + 7 * ex; sBack.position.z = 1.2 * ex; sLid.position.z = mm(G.su_th) + 3.6 * ex;
        scene.updateMatrixWorld(true);
        const xr = t >= 5.6;
        parts.forEach((p) => {
          const kf = inout(prog(t, 3.6 + p.i * .12, 1.5));
          p.pr.matrixWorld.decompose(pP, pQ, pS); p.an.matrixWorld.decompose(aP, aQ, aS);
          p.m.matrix.compose(pP.lerp(aP, kf), pQ.slerp(aQ, kf), pS);
          p.m.matrixWorldNeedsUpdate = true;
          p.m.material = xr ? p.xray : p.solid;
          p.edgeMat.color.set(xr ? (p.color === HEX.red ? HEX.red : HEX.cream) : 0x000000);
          if (xr) p.edgeMat.color.multiplyScalar(1.7);
          p.edgeMat.opacity = xr ? .75 : .3;
        });
        inner.forEach((g, i) => { const s = back(prog(t, 5.7 + i * .07, .5), 1.8); g.visible = s > 0; g.scale.setScalar(Math.max(1e-4, s)); });
        const kA = inout(prog(t, 3.4, 2.2));
        orbit(cam, lerp(0, -4.5, kA), lerp(1.2, 9, kA), lerp(0, 1, kA), lerp(60, 70, kA), lerp(-.6, .62, inout(prog(t, 0, 10))) + Math.max(0, t - 10) * .05, lerp(.8, .2, kA));
        shift(cam, lerp(.1, .2, kA), -.02);
        let k = 0; PH.forEach((p, i) => { if (t >= p[0]) k = i; });
        text(el.phase, PH[k][1]); slam(el.phase, t, PH[k][0]);
        text(el.z, printing ? `Z ${h.toFixed(2).replace('.', ',')} cm` : '5 Druckteile · PLA');
        return { bloom: .95, threshold: 1.7, flash: t >= 5.6 && t < 5.7 ? .6 : 0, flashColor: HEX.blue };
      }
    };
  }
});

// ===========================================================================
// 08 SECTION: truchet field in 3D, PROBLEME rises out of it
// ===========================================================================
slide({
  build() {
    const scene = mkScene('red'), cam = mkCam(36);
    lights(scene, { key: 2.4, hemi: .9, rim: 1.2 });
    const cols = 26, rows = 16, n = cols * rows;
    const arc = new THREE.TorusGeometry(1, .17, 8, 18, Math.PI / 2); arc.rotateX(Math.PI / 2); arc.translate(-1, 0, -1);
    const im = new THREE.InstancedMesh(arc, A.std(0xffffff, { roughness: .4 }), n * 2);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 6), 3);
    scene.add(im);
    const R = rng(4), base = Array.from({ length: n }, () => (R() < .5 ? 0 : 1));
    const word = A.xtext('PROBLEME.', { size: 1.35, front: HEX.cream, side: 0x4a0f07, sideFar: 0x1a0402, depth: 1.1, layers: 52 });
    scene.add(word);
    const cream = new THREE.Color(HEX.cream), ink = new THREE.Color(HEX.ink);
    return {
      scene, camera: cam,
      update(t) {
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const id = j * cols + i, x = (i - cols / 2 + .5) * 2, z = (j - rows / 2 + .5) * 2;
          const d = Math.hypot(x, z * 1.1), w = t * 1.7 - d * .11;
          const flips = Math.max(0, Math.floor(w)), fr = w - Math.floor(w);
          const rot = (base[id] + flips + (w > 0 ? back(clamp(fr * 2.6), 1.8) : 0)) * Math.PI / 2;
          const pop = back(prog(t, d * .02, .45), 2), lift = w > 0 && fr < .38 ? Math.sin(fr / .38 * Math.PI) * .7 : 0;
          const s = Math.max(1e-4, pop);
          setInst(im, id * 2, x, lift, z, 0, rot, 0, s, s, s);
          setInst(im, id * 2 + 1, x, lift, z, 0, rot + Math.PI, 0, s, s, s);
          const c = w > 0 && fr < .3 ? ink : cream;
          im.setColorAt(id * 2, c); im.setColorAt(id * 2 + 1, c);
        }
        im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
        const kw = back(prog(t, .9, .9), 1.5);
        word.position.set(0, lerp(-7, 2.6, kw), 3);
        word.rotation.set(-.15 + (1 - kw) * -1, Math.sin(t * .6) * .18, 0);
        word.visible = t > .9;
        cam.position.set(Math.sin(t * .25) * 2, lerp(13, 9.5, inout(prog(t, 0, 4.5))), lerp(22, 17.5, inout(prog(t, 0, 4.5))));
        cam.lookAt(0, 1.2, 0);
        return { bloom: .5, threshold: 1.5 };
      }
    };
  }
});

// ===========================================================================
// 09 SRAM: 2048 cubes = 2048 bytes; the keypad library launches out
// ===========================================================================
slide({
  build(sec) {
    const scene = mkScene('blue'), cam = mkCam(30);
    lights(scene, { key: 1.9, hemi: .6, rim: 1.2, rimColor: 0xffffff });
    const N = 2048;
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(.86, 1, .86), A.std(0xffffff, { roughness: .38, metalness: .05 }), N);
    im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
    scene.add(im);
    const kind = (i) => i < 1024 ? 0 : i < 1723 ? 1 : i < 1843 ? 2 : 3;
    const COL = [new THREE.Color(HEX.cream), new THREE.Color(0x15174f), new THREE.Color(HEX.red).multiplyScalar(1.3), new THREE.Color(0x8486ff)];
    const HGT = [1, .75, 1.7, .25];
    const R = rng(9), fly = Array.from({ length: N }, () => [(R() - .5) * 30, 18 + R() * 25, (R() - .5) * 20, R() * 8, R() * 8, R()]);
    const freeBright = new THREE.Color(0xb8b9ff).multiplyScalar(1.4), tmp = new THREE.Color();
    const cnt = sec.querySelector('.m-free');
    return {
      scene, camera: cam,
      update(t) {
        for (let i = 0; i < N; i++) {
          const x = (i % 64) - 31.5, z = ((i / 64) | 0) - 15.5, k = kind(i);
          const kr = back(prog(t, .4 + i / N * 2.4, .45), 1.6);
          let h = HGT[k], y = lerp(-9, 0, kr), rx = 0, ry = 0, s = Math.max(1e-4, kr);
          tmp.copy(COL[k]);
          if (k === 3) tmp.lerp(freeBright, Math.max(0, Math.sin(t * 6 + i * .3)) * smooth(prog(t, 3, .5)));
          if (k === 2) {
            const kl = prog(t, 3.9 + (i - 1723) * .004, 1.3), f = fly[i];
            if (kl > 0) {
              const e = expo(kl);
              y += f[1] * e; rx = f[3] * e; ry = f[4] * e; s *= 1 - smooth(prog(kl, .55, .45));
              setInst(im, i, x + f[0] * e, y + h / 2, z + f[2] * e, rx, ry, 0, s, h * s, s);
              im.setColorAt(i, tmp);
              continue;
            }
          }
          setInst(im, i, x, y + h * s / 2, z, rx, ry, 0, s, h * s, s);
          im.setColorAt(i, tmp);
        }
        im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
        const kc = inout(prog(t, 4.6, 3.2));
        orbit(cam, lerp(2, 10, kc), 0, lerp(2, 5, kc), lerp(118, 100, kc), lerp(-.42, -.16, inout(prog(t, 0, 8.5))), lerp(.62, .55, kc));
        shift(cam, 0, -.04);
        const free = Math.round(lerp(205, 325, smooth(prog(t, 4.4, 1.4))));
        text(cnt, `frei: ${free} Byte`);
        return { bloom: .8, threshold: 1.5 };
      }
    };
  }
});

// ===========================================================================
// 10 FIXES: fly through a tunnel past four 3D statements
// ===========================================================================
const FIXES = [
  ['SH1106', 'Das Display hat einen SH1106, keinen SSD1306 — andere Library, sonst bleibt es schwarz.', HEX.cream],
  ['D11 → A2', 'Der Bewegungsmelder macht Platz für den SPI-Bus des RFID-Lesers.', HEX.blue],
  ['3,3 VOLT', 'Der RFID-Leser bekommt 3,3 V — an 5 V wäre er kaputt.', HEX.red],
  ['200 MS', 'Den Kartenleser nur alle 200 ms abfragen, sonst stockt die Sirene.', HEX.cream]
];
slide({
  build(sec) {
    const scene = mkScene('ink'), cam = mkCam(42);
    const texts = FIXES.map((f, k) => {
      const g = A.xtext(f[0], { size: 2.4, front: f[2], glow: f[2] === HEX.blue ? 1.6 : 1, side: 0x2a2a33, sideFar: 0x08080a, depth: 1.6, layers: 56 });
      g.position.set(0, .4, -k * 60); scene.add(g); return g;
    });
    const nF = 46, frames = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), nF * 4);
    for (let f = 0; f < nF; f++) {
      const z = 30 - f * 6;
      setInst(frames, f * 4, 0, 9, z, 0, 0, 0, 34, .07, .07); setInst(frames, f * 4 + 1, 0, -9, z, 0, 0, 0, 34, .07, .07);
      setInst(frames, f * 4 + 2, -17, 0, z, 0, 0, 0, .07, 18, .07); setInst(frames, f * 4 + 3, 17, 0, z, 0, 0, 0, .07, 18, .07);
    }
    scene.add(frames);
    const nS = 360, R = rng(21), speed = new THREE.InstancedMesh(new THREE.BoxGeometry(.04, .04, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), nS);
    const sp = Array.from({ length: nS }, () => [(R() - .5) * 32, (R() - .5) * 17, 30 - R() * 260]);
    scene.add(speed);
    const ST = FIXES.map((_, k) => .35 + k * 2.4);
    const camZ = (t) => 16 - 60 * ST.slice(1).reduce((s, x) => s + inout(prog(t, x - .9, .9)), 0) + (1 - expo(prog(t, 0, .5))) * 50;
    const el = { idx: sec.querySelector('.f-idx'), txt: sec.querySelector('.f-txt') };
    const fc = new THREE.Color();
    return {
      scene, camera: cam,
      update(t) {
        const z = camZ(t), v = Math.abs(z - camZ(t - .02)) / .02;
        let k = 0; ST.forEach((x, i) => { if (t >= x - .45) k = i; });
        fc.set(FIXES[k][2]).multiplyScalar(.5); frames.material.color.copy(fc);
        speed.material.color.set(0xffffff).multiplyScalar(.4 + Math.min(1.6, v / 40));
        sp.forEach((p, i) => setInst(speed, i, p[0], p[1], p[2], 0, 0, 0, 1, 1, 1 + Math.min(14, v * .12)));
        speed.instanceMatrix.needsUpdate = true;
        texts.forEach((g, i) => { g.rotation.y = Math.sin(t * .8 + i * 1.7) * .32; g.rotation.x = Math.sin(t * .6 + i) * .07; });
        cam.position.set(Math.sin(t * .7) * .6, .6 + Math.sin(t * .5) * .3, z);
        cam.lookAt(0, .4, z - 20);
        text(el.idx, `0${k + 1} / 04`); text(el.txt, FIXES[k][1]);
        slam(el.idx, t, ST[k] - .3, 0, -40); slam(el.txt, t, ST[k] - .2, 0, 40);
        return { bloom: .9, ca: .006 + Math.min(.12, v * .0011) + .09 * (1 - expo(prog(t, 0, .5))) };
      }
    };
  }
});

// ===========================================================================
// 11 CODE: scanKeypad() types itself next to the keypad it scans
// ===========================================================================
const CODE = [
  'char scanKeypad() {',
  '  char found = 0;',
  '  for (byte c = 0; c < 4 && found == 0; c++) {',
  '    pinMode(COL_PINS[c], OUTPUT);     // column LOW',
  '    delayMicroseconds(5);',
  '    for (byte r = 0; r < 4; r++) {',
  '      if (digitalRead(ROW_PINS[r]) == LOW) {',
  '        found = pgm_read_byte(&KEYS[r][c]);',
  '        break;',
  '      }',
  '    }',
  '    pinMode(COL_PINS[c], INPUT);      // back to high-Z',
  '  }',
  '  return found;',
  '}'
];
slide({
  build() {
    const scene = mkScene('cream'), cam = mkCam(32);
    lights(scene, { key: 2.4, hemi: 1.0, rim: .9 });
    const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1000;
    const g2 = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const panel = new THREE.Mesh(A.rbox(11.2, 7, .3, .12), [new THREE.MeshBasicMaterial({ map: tex }), A.M.ink]);
    const uv = panel.geometry.attributes.uv, pos = panel.geometry.attributes.position;
    if (!panel.geometry.userData.uvFixed) { for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 11.2 + .5, pos.getY(i) / 7 + .5); panel.geometry.userData.uvFixed = true; }
    panel.position.set(-4.3, -1.3, 0); panel.rotation.y = .3; scene.add(panel);
    const kp = A.keypad(); const kpG = new THREE.Group(); kpG.add(kp); kp.position.z = -.8;
    kpG.scale.setScalar(.9); kpG.position.set(7.2, -1.6, 1.2); kpG.rotation.set(1.05, -.42, 0); scene.add(kpG);
    const keys = kp.userData.keys, k5 = keys.find((k) => k.ch === '5');
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 10), A.glow(HEX.red, 3)); scene.add(pulse);
    const blueC = new THREE.Color(HEX.blue), redC = new THREE.Color(HEX.red);
    const lineH = 52, x0 = 70, y0 = 120;
    function drawCode(t, n, mode, col) {
      g2.fillStyle = CSS.ink; g2.fillRect(0, 0, 1600, 1000);
      g2.fillStyle = 'rgba(239,233,221,.45)'; A.setFont(g2, '400 24px "JetBrains Mono"');
      g2.fillText('ALARM_SYSTEM.INO · SCANKEYPAD()', x0, 64);
      const hl = mode === 'scan' ? (Math.floor(t * 10) % 2 ? 3 : 6) : mode === 'found' ? 7 : -1;
      if (hl >= 0) { g2.fillStyle = mode === 'found' ? CSS.red : CSS.blue; g2.fillRect(x0 - 16, y0 + hl * lineH - 38, 1460, lineH); }
      A.setFont(g2, '400 31px "JetBrains Mono"');
      let left = n;
      CODE.forEach((line, i) => {
        if (left <= 0) return;
        const s = line.slice(0, left); left -= line.length;
        const ci = s.indexOf('//');
        g2.fillStyle = CSS.cream; g2.fillText(ci >= 0 ? s.slice(0, ci) : s, x0, y0 + i * lineH);
        if (ci >= 0) { g2.fillStyle = 'rgba(239,233,221,.45)'; g2.fillText(s.slice(ci), x0 + g2.measureText(s.slice(0, ci)).width, y0 + i * lineH); }
        const kw = s.match(/^\s*(char|for|if|return|break)\b/);
        if (kw) { g2.fillStyle = CSS.red; g2.fillText(kw[0], x0, y0 + i * lineH); }
        if (left <= 0 && Math.floor(t * 2.5) % 2 === 0) { g2.fillStyle = CSS.red; g2.fillRect(x0 + g2.measureText(s).width + 4, y0 + i * lineH - 28, 16, 34); }
      });
      if (col >= 0) { g2.fillStyle = CSS.cream; A.setFont(g2, '700 30px "JetBrains Mono"'); g2.fillText(`c = ${col}`, 1360, y0 + 3 * lineH); }
      if (mode === 'found') { g2.fillStyle = CSS.red; A.setFont(g2, '900 120px Archivo', 'expanded'); g2.fillText("'5'", 1240, 880); }
      tex.needsUpdate = true;
    }
    const target = V3();
    return {
      scene, camera: cam,
      update(t) {
        const n = Math.max(0, Math.floor((t - .6) * 140));
        const found = t >= 5.0 && t < 6.3, scanning = t >= 3.0 && !found;
        const col = scanning ? Math.floor((t - 3.0) * 5) % 4 : found ? 1 : -1;
        drawCode(t, n, found ? 'found' : scanning ? 'scan' : '', col);
        keys.forEach((k) => {
          const lit = (scanning && k.c === col) || (found && k === k5);
          k.mat.emissive.copy(found && k === k5 ? redC : blueC);
          k.mat.emissiveIntensity = lit ? (found ? 1.6 : 1.1) : 0;
          k.group.position.y = .12 - (k === k5 ? .22 * Math.sin(Math.PI * prog(t, 4.85, .5)) : 0);
        });
        kpG.updateMatrixWorld(true);
        const from = k5.group.getWorldPosition(V3()), to = panel.localToWorld(target.set(3, -2.2, .3));
        const kp2 = smooth(prog(t, 5.0, .55));
        pulse.visible = kp2 > 0 && kp2 < 1;
        pulse.position.copy(from).lerp(to, kp2).add(V3(0, Math.sin(kp2 * Math.PI) * 2.5, 0));
        const kc = inout(prog(t, 0, 8));
        cam.position.set(lerp(-1.5, 1, kc), lerp(2.2, 1.2, kc), lerp(27, 23.5, kc));
        cam.lookAt(lerp(.2, .8, kc), .2, 0);
        return { bloom: .5, threshold: 1.6 };
      }
    };
  }
});

// ===========================================================================
// 12 NUMBERS: five extruded numbers spin in on an arc
// ===========================================================================
const NUMS = [['6', 'Bauteile am Uno', HEX.cream], ['4', 'Arduino-Sketches', HEX.red], ['24', 'Arbeitsschritte', HEX.blue],
  ['5', 'Zustände', HEX.cream], ['5', 'Druckteile', HEX.red]];
slide({
  build(sec) {
    const scene = mkScene('ink'), cam = mkCam(34);
    const nums = NUMS.map((n, k) => {
      const g = A.xtext(n[0], { size: 2.5, front: n[2], glow: n[2] === HEX.blue ? 1.7 : 1.05, side: 0x303038, sideFar: 0x0a0a0c, depth: 1.8, layers: 56 });
      const holder = new THREE.Group(); holder.add(g); scene.add(holder);
      holder.position.set((k - 2) * 6.2, 0, -Math.abs(k - 2) * 1.6); holder.rotation.y = -(k - 2) * .14;
      return { g, holder };
    });
    const dd = dust(2600, 40, 0x6a6a74, .06, 7); scene.add(dd);
    const fl = new THREE.GridHelper(80, 40, 0x2a2a33, 0x2a2a33); fl.position.y = -3.6; scene.add(fl);
    const labels = [...sec.querySelectorAll('.n-lab')];
    return {
      scene, camera: cam,
      update(t) {
        nums.forEach((n, k) => {
          const t0 = .3 + k * .2, kk = back(prog(t, t0, 1.0), 1.35);
          n.g.rotation.y = (1 - kk) * -4.7 + Math.sin(t * .7 + k) * .14;
          n.g.position.y = lerp(9, 0, expo(prog(t, t0, .7)));
          n.g.visible = t >= t0;
          place(labels[k], n.holder.position.clone().add(V3(0, -2.4, 0)), cam, 0, 0);
          labels[k].style.opacity = clamp((t - t0 - .5) * 3);
        });
        dd.rotation.y = t * .02;
        cam.position.set(Math.sin(t * .3) * 2.5, lerp(2.4, .9, inout(prog(t, 0, 6))), lerp(30, 27, inout(prog(t, 0, 6))));
        cam.lookAt(0, -.3, 0);
        return { bloom: .9 };
      }
    };
  }
});

// ===========================================================================
// 13 FINALE: the voxel skull assembles once more, GAS, thank you
// ===========================================================================
slide({
  build() {
    const scene = mkScene('red'), cam = mkCam(32);
    lights(scene, { key: 2.6, hemi: .8, rim: 2.4, rimColor: 0xffd0c0 });
    const vx = voxelSkull(HEX.ink);
    const skullG = new THREE.Group(); skullG.add(vx.im); skullG.position.set(-4.6, .2, 0); scene.add(skullG);
    const word = A.xtext('GAS', { size: 2.15, front: HEX.cream, side: 0x7d1d10, sideFar: 0x2a0905, depth: 1.3, layers: 56 });
    word.position.set(3.0, .5, 0); scene.add(word);
    const R = rng(13), np = 700, pp = new Float32Array(np * 3), dirs = [];
    for (let i = 0; i < np; i++) dirs.push(V3(R() - .5, R() - .5, R() - .5).normalize().multiplyScalar(4 + R() * 14));
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: HEX.cream, size: .12, transparent: true }));
    pts.position.copy(skullG.position); scene.add(pts);
    return {
      scene, camera: cam,
      update(t) {
        for (let i = 0; i < vx.N; i++) {
          const a = vx.P[i], ka = back(prog(t, .15 + a.j * .5 + (2.2 - a.ty) * .1, .9), 1.3);
          setInst(vx.im, i, lerp(a.bx * 2.2, a.tx, ka), lerp(a.by * 2.2, a.ty, ka), lerp(a.bz * 2.2, a.tz, ka), a.sx * (1 - ka), a.sy * (1 - ka), 0, 1, 1, 1);
        }
        vx.im.instanceMatrix.needsUpdate = true;
        skullG.rotation.y = Math.sin(t * .5) * .45 + .2;
        skullG.rotation.x = Math.sin(t * .4) * .06;
        const kw = back(prog(t, 1.2, .7), 1.5);
        word.position.z = lerp(14, 0, kw); word.rotation.set((1 - kw) * -1.3, -.22 + Math.sin(t * .5) * .12, 0);
        word.visible = t > 1.2;
        const kb = prog(t, 1.3, 2.2), e = 1 - Math.pow(1 - kb, 3);
        for (let i = 0; i < np; i++) { pp[i * 3] = dirs[i].x * e; pp[i * 3 + 1] = dirs[i].y * e; pp[i * 3 + 2] = dirs[i].z * e; }
        pg.attributes.position.needsUpdate = true;
        pts.material.opacity = kb > 0 && kb < 1 ? 1 - kb : 0;
        cam.position.set(Math.sin(t * .3) * 1.2 - .5, .6, lerp(21, 18.5, inout(prog(t, 0, 6))));
        cam.lookAt(-.4, .5, 0);
        return { bloom: .7 };
      }
    };
  }
});
