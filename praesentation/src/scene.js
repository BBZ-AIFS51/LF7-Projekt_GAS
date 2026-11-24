// 3D scene of the presentation: detailed models of all parts, the printed
// case from the real STL files (docs/viewer/enclosure.js) and a small rig that
// moves between named scenes. Units: cm. Case layout uses the same formulas as
// Gehaeuse/gehaeuse.scad and buildCase() in docs/viewer/index.html.
(function () {
  'use strict';
  const T = THREE;
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const deg = Math.PI / 180;
  const mm = (v) => v / 10;
  const UP = V(0, 1, 0);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const ease = (k) => k * k * (3 - 2 * k);

  // ===========================================================================
  // renderer, studio light, floor
  // ===========================================================================
  const canvas = document.getElementById('gl');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new T.Scene();
  scene.background = new T.Color(0x000000);
  const camera = new T.PerspectiveCamera(28, 16 / 9, 1, 900);

  // environment for reflections: a dark room with a few soft boxes
  (function studio() {
    const env = new T.Scene();
    const room = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: 0x020203, side: T.BackSide }));
    room.scale.set(60, 30, 60);
    env.add(room);
    const box = (w, h, x, y, z, k, c) => {
      const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(c || 0xffffff).multiplyScalar(k), side: T.DoubleSide }));
      m.position.set(x, y, z);
      m.lookAt(0, 0, 0);
      env.add(m);
    };
    box(22, 8, 0, 13, 9, 3.2);              // overhead soft box, slightly in front
    box(6, 16, -22, 4, 6, 1.6);             // left strip
    box(6, 16, 22, 5, -6, 2.4, 0x8fb8ff);   // right strip, cool
    box(30, 4, 0, 3, -24, 0.9, 0x5a8fe0);   // back, blue
    box(14, 3, 0, -6, 20, 0.5);             // floor bounce
    const pm = new T.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.03).texture;
    pm.dispose();
  })();

  const keyLight = new T.DirectionalLight(0xfff6ec, 2.6);
  keyLight.position.set(35, 50, 60);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  Object.assign(keyLight.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 200 });
  keyLight.shadow.bias = -0.0003;
  keyLight.shadow.normalBias = 0.02;
  keyLight.shadow.radius = 4;
  scene.add(keyLight, keyLight.target);
  const rimBlue = new T.DirectionalLight(0x3d8bff, 2.2);
  rimBlue.position.set(-40, 25, -50);
  scene.add(rimBlue);
  const rimWhite = new T.DirectionalLight(0xdfe8ff, 1.0);
  rimWhite.position.set(50, 20, -35);
  scene.add(rimWhite);
  scene.add(new T.HemisphereLight(0x9fb6d8, 0x050505, 0.35));
  const fillLight = new T.DirectionalLight(0xe8eeff, 0.55);
  scene.add(fillLight);
  const alarmLight = new T.PointLight(0xff2a2a, 0, 60, 1.2);
  scene.add(alarmLight);

  // ===========================================================================
  // helpers: textures, materials, meshes
  // ===========================================================================
  function canvasTex(w, h, draw, opts) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c);
    if (!opts || !opts.linear) t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return t;
  }
  function rr(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const std = (color, o) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.5, metalness: 0 }, o || {}));
  const phys = (color, o) => new T.MeshPhysicalMaterial(Object.assign({ color, roughness: 0.45, metalness: 0 }, o || {}));
  const M = {
    gold: std(0xe2bd6a, { metalness: 1, roughness: 0.22 }),
    tin: std(0xd9dde2, { metalness: 1, roughness: 0.28 }),
    steel: std(0xb8bec7, { metalness: 1, roughness: 0.35 }),
    blackPlastic: std(0x0f1013, { roughness: 0.55 }),
    chip: phys(0x111216, { roughness: 0.38, clearcoat: 0.2 }),
    smdBlack: std(0x16171a, { roughness: 0.5 }),
    smdCap: std(0xa88a62, { roughness: 0.55 }),
    ledGreen: std(0x1a5c2a, { emissive: 0x39ff6e, emissiveIntensity: 2.4, roughness: 0.3 }),
    ledAmber: std(0x5a4210, { emissive: 0xffb02e, emissiveIntensity: 0, roughness: 0.3 }),
    white: phys(0xf1f2f4, { roughness: 0.35, clearcoat: 0.3 })
  };

  function mesh(geo, m, x, y, z, parent) {
    const o = new T.Mesh(geo, m);
    o.position.set(x || 0, y || 0, z || 0);
    o.castShadow = true;
    o.receiveShadow = true;
    if (parent) parent.add(o);
    return o;
  }
  const boxG = (w, h, d) => new T.BoxGeometry(w, h, d);
  const box = (w, h, d, m, x, y, z, p) => mesh(boxG(w, h, d), m, x, y, z, p);
  const cyl = (r, h, m, x, y, z, p, seg) => mesh(new T.CylinderGeometry(r, r, h, seg || 32), m, x, y, z, p);

  function rrShape(w, h, r) {
    const s = new T.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  // rounded box lying in xz, from y = 0 to y = h; top cap UV = (x/w+.5, -z/d+.5)
  function slab(w, d, h, r, bevel) {
    const b = bevel || 0;
    const g = new T.ExtrudeGeometry(rrShape(w - 2 * b, d - 2 * b, Math.max(0.001, r - b)), {
      depth: Math.max(0.0005, h - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 10
    });
    g.rotateX(-Math.PI / 2);
    g.translate(0, b, 0);
    // planar UVs from the top view so caps can carry a texture
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w + 0.5, -p.getZ(i) / d + 0.5);
    g.computeVertexNormals();
    return g;
  }
  // rounded box centred on the origin (all edges rounded)
  function rbox(w, h, d, r) {
    const g = new T.ExtrudeGeometry(rrShape(w - 2 * r, h - 2 * r, Math.max(0.001, r * 0.6)), {
      depth: Math.max(0.0005, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 8
    });
    g.translate(0, 0, -(d - 2 * r) / 2);
    g.computeVertexNormals();
    return g;
  }
  // top-textured slab with plain sides
  function texSlab(w, d, h, r, tex, sideMat, o, parent) {
    const top = phys(0xffffff, Object.assign({ map: tex, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.35 }, o || {}));
    const g = slab(w, d, h, r, Math.min(0.012, h * 0.2));
    // cap faces = group 0, sides = group 1
    const m = mesh(g, [top, sideMat], 0, 0, 0, parent);
    return m;
  }
  // small label texture, e.g. text on chips
  function textTex(w, h, lines, o) {
    o = o || {};
    return canvasTex(w, h, (g) => {
      g.fillStyle = o.bg || '#111216';
      g.fillRect(0, 0, w, h);
      g.fillStyle = o.fg || '#8d9098';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      lines.forEach((l, i) => {
        g.font = (l.f || 'bold 22px') + ' "Segoe UI", Carlito, Arial, sans-serif';
        g.fillText(l.t, w / 2 + (l.dx || 0), h * (l.y || (i + 1) / (lines.length + 1)));
      });
      if (o.dot) { g.beginPath(); g.arc(o.dot[0], o.dot[1], o.dot[2], 0, 7); g.fillStyle = 'rgba(255,255,255,.18)'; g.fill(); }
    });
  }

  // glow sprite (additive), used for the OLED and LEDs
  const glowTex = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.25, 'rgba(255,255,255,.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
  function glow(color, size, parent, x, y, z) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    s.scale.setScalar(size);
    s.position.set(x || 0, y || 0, z || 0);
    parent.add(s);
    return s;
  }

  // PCB: solder mask with clear coat, FR4 edge
  function pcb(w, d, t, r, tex, edge, parent) {
    return texSlab(w, d, t, r, tex, std(edge, { roughness: 0.6 }), {}, parent);
  }
  // straight male pin header along x, pins pointing +y (local), base on y = 0
  function maleHeader(n, parent, x0, z, pitch, up, below) {
    const p = pitch || 0.254;
    const len = n * p;
    box(len, 0.25, 0.25, M.blackPlastic, x0 + (n - 1) * p / 2, 0.125, z, parent);
    for (let i = 0; i < n; i++) {
      box(0.064, (up || 0.6) + (below || 0.3), 0.064, M.gold, x0 + i * p, ((up || 0.6) - (below || 0.3)) / 2, z, parent);
    }
  }
  // female header strip on a board, top at y0 + 0.85
  const femaleTex = (n) => canvasTex(64 * n, 64, (g, w, h) => {
    g.fillStyle = '#121316';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      g.fillStyle = '#040405';
      g.fillRect(i * 64 + 20, 20, 24, 24);
      g.strokeStyle = 'rgba(255,255,255,.06)';
      g.strokeRect(i * 64 + 4, 4, 56, 56);
    }
  });
  function femaleHeader(n, parent, xs, z, y0) {
    const len = n * 0.254;
    const top = std(0xffffff, { map: femaleTex(n), roughness: 0.5 });
    const g = mesh(boxG(len, 0.85, 0.25), [M.blackPlastic, M.blackPlastic, top, M.blackPlastic, M.blackPlastic, M.blackPlastic], xs, y0 + 0.425, z, parent);
    return g;
  }

  // ===========================================================================
  // Arduino Uno R3 (Elegoo, blue). Lying: USB at +x, digital header at +z,
  // parts on top (+y), board from y = 0 to UNO_T. Same pin map as docs/viewer.
  // ===========================================================================
  const UNO_W = 6.86, UNO_D = 5.33, UNO_T = 0.16, UNO_TOP = UNO_T;
  const UNO_HOLES = [[2.03, -2.41], [1.9, 2.41], [-3.18, -1.9], [-3.18, 0.89]];
  const pinX = {};
  ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'].forEach((n, i) => { pinX[n] = [-3.0 + i * 0.254, 2.42]; });
  ['D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'GND2', 'AREF', 'SDA', 'SCL'].forEach((n, i) => { pinX[n] = [-0.85 + i * 0.254, 2.42]; });
  ['A5', 'A4', 'A3', 'A2', 'A1', 'A0'].forEach((n, i) => { pinX[n] = [-2.9 + i * 0.254, -2.42]; });
  ['VIN', 'GND', 'GND1', '5V', '3V3', 'RESET', 'IOREF', 'NC'].forEach((n, i) => { pinX[n] = [-1.2 + i * 0.254, -2.42]; });
  const unoPinLocal = (n) => V(pinX[n][0], UNO_TOP + 0.85, pinX[n][1]);

  function unoTexture() {
    const cw = 2048, ch = Math.round(2048 * UNO_D / UNO_W);
    const X = (x) => (x / UNO_W + 0.5) * cw, Y = (z) => (z / UNO_D + 0.5) * ch, S = cw / UNO_W;
    return canvasTex(cw, ch, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0c4aa8');
      grad.addColorStop(1, '#083b8a');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
      // copper under the mask: traces with 45 degree bends, vias
      seed = 23;
      g.lineCap = 'round';
      for (let i = 0; i < 150; i++) {
        let x = rnd() * w, y = rnd() * h;
        g.strokeStyle = rnd() > 0.5 ? 'rgba(80,150,255,.22)' : 'rgba(40,110,230,.3)';
        g.lineWidth = 3 + rnd() * 5;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 3; k++) {
          const l = 40 + rnd() * 260, dir = Math.floor(rnd() * 4);
          if (dir === 0) x += l; else if (dir === 1) y += l * 0.7; else if (dir === 2) { x += l * 0.5; y += l * 0.5; } else { x -= l * 0.4; y += l * 0.4; }
          g.lineTo(x, y);
        }
        g.stroke();
        g.beginPath();
        g.arc(x, y, 7, 0, 7);
        g.fillStyle = '#b9c2cc';
        g.fill();
        g.beginPath();
        g.arc(x, y, 3, 0, 7);
        g.fillStyle = '#061e44';
        g.fill();
      }
      // header pads, mounting holes
      Object.keys(pinX).forEach((n) => {
        g.fillStyle = '#c9ced5';
        g.fillRect(X(pinX[n][0]) - 15, Y(pinX[n][1]) - 15, 30, 30);
      });
      UNO_HOLES.forEach(([x, z]) => {
        g.beginPath(); g.arc(X(x), Y(z), 0.32 * S, 0, 7); g.fillStyle = '#cfd4da'; g.fill();
        g.beginPath(); g.arc(X(x), Y(z), 0.16 * S, 0, 7); g.fillStyle = '#05070a'; g.fill();
      });
      // silkscreen
      g.fillStyle = '#f2f6ff';
      g.strokeStyle = '#f2f6ff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const font = (s, b) => { g.font = (b ? 'bold ' : '') + s + 'px "Segoe UI", Carlito, Arial, sans-serif'; };
      Object.keys(pinX).forEach((n) => {
        const [x, z] = pinX[n];
        const front = z > 0;
        let t = n.replace(/^D/, '').replace('GND2', 'GND').replace('GND1', 'GND');
        if (['3', '5', '6', '9', '10', '11'].includes(t) && front) t = '~' + t;
        g.save();
        g.translate(X(x), Y(z) + (front ? -0.42 : 0.42) * S);
        g.rotate(-Math.PI / 2);
        font(t.length > 3 ? 19 : 24, true);
        g.fillText(t, 0, 0);
        g.restore();
      });
      font(30, true);
      g.fillText('DIGITAL (PWM~)', X(-1.1), Y(1.55));
      g.fillText('ANALOG IN', X(-2.26), Y(-1.55));
      g.fillText('POWER', X(-0.31), Y(-1.55));
      g.save();
      g.translate(X(-1.55), Y(0.6));
      g.font = 'italic 900 ' + Math.round(0.95 * S) + 'px "Segoe UI", Carlito, Arial, sans-serif';
      g.fillText('UNO', 0, 0);
      g.restore();
      font(40, true);
      g.fillText('R3', X(-0.25), Y(1.0));
      font(24, true);
      g.fillText('ON', X(0.9), Y(1.3));
      g.fillText('L', X(-0.2), Y(1.3));
      g.fillText('TX', X(0.0), Y(2.05));
      g.fillText('RX', X(0.35), Y(2.05));
      g.fillText('ICSP', X(-2.7), Y(-0.75));
      g.fillText('RESET', X(2.75), Y(1.55));
      g.lineWidth = 4;
      [[-0.7, -0.8, 3.95, 1.1], [1.62, -0.45, 1.05, 0.5], [3.0, -1.85, 1.55, 1.0], [-2.78, 0, 0.62, 0.9]].forEach(([x, z, ww, dd]) => {
        g.strokeRect(X(x - ww / 2), Y(z - dd / 2), ww * S, dd * S);
      });
      g.beginPath(); g.arc(X(0.85), Y(-1.95), 0.34 * S, 0, 7); g.stroke();
      g.beginPath(); g.arc(X(1.5), Y(-1.95), 0.34 * S, 0, 7); g.stroke();
      // SMD pads
      seed = 5;
      for (let i = 0; i < 70; i++) {
        const x = X(-0.6 + rnd() * 3.7), y = Y(-1.2 + rnd() * 2.8);
        g.fillStyle = 'rgba(205,212,220,.85)';
        g.fillRect(x, y, 14, 10);
        g.fillRect(x + 26, y, 14, 10);
      }
    });
  }
  const unoLeds = [];
  function buildUno() {
    const g = new T.Group();
    g.name = 'uno';
    const tex = unoTexture();
    pcb(UNO_W, UNO_D, UNO_T, 0.12, tex, 0x0a2f66, g);
    femaleHeader(8, g, -3.0 + 3.5 * 0.254, 2.42, UNO_TOP);
    femaleHeader(10, g, -0.85 + 4.5 * 0.254, 2.42, UNO_TOP);
    femaleHeader(6, g, -2.9 + 2.5 * 0.254, -2.42, UNO_TOP);
    femaleHeader(8, g, -1.2 + 3.5 * 0.254, -2.42, UNO_TOP);
    // ATmega328P in its DIP socket
    box(3.9, 0.16, 1.02, M.blackPlastic, -0.7, UNO_TOP + 0.08, -0.8, g);
    const chipTex = textTex(512, 128, [{ t: 'ATMEGA328P-PU', f: 'bold 40px', y: 0.42 }, { t: '1952  AU', f: '28px', y: 0.75 }], { fg: '#7e828b', dot: [30, 64, 14] });
    const chipTop = phys(0xffffff, { map: chipTex, roughness: 0.42, clearcoat: 0.15 });
    mesh(slab(3.6, 0.74, 0.32, 0.03, 0.03), [chipTop, M.chip], -0.7, UNO_TOP + 0.2, -0.8, g);
    for (let i = 0; i < 14; i++) {
      [-1, 1].forEach((s) => {
        const leg = box(0.08, 0.26, 0.05, M.tin, -2.35 + i * 0.254, UNO_TOP + 0.24, -0.8 + s * 0.4, g);
        leg.rotation.x = s * 0.15;
      });
    }
    // 16 MHz crystal (HC-49)
    const xtal = new T.Shape();
    xtal.absarc(-0.3, 0, 0.18, Math.PI / 2, Math.PI * 1.5);
    xtal.absarc(0.3, 0, 0.18, -Math.PI / 2, Math.PI / 2);
    const xg = new T.ExtrudeGeometry(xtal, { depth: 0.32, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2, curveSegments: 16 });
    xg.rotateX(-Math.PI / 2);
    mesh(xg, M.tin, 1.62, UNO_TOP + 0.02, -0.45, g);
    // USB-B: metal shell, opening at +x with the white tongue
    mesh(rbox(1.6, 1.08, 1.2, 0.05), M.steel, 3.25, UNO_TOP + 0.56, 1.13, g);
    box(0.02, 0.86, 0.94, std(0x050506), 4.06, UNO_TOP + 0.56, 1.13, g);
    box(0.06, 0.3, 0.5, std(0xe8e8e4, { roughness: 0.6 }), 4.08, UNO_TOP + 0.6, 1.13, g);
    // barrel jack
    mesh(rbox(1.45, 1.1, 0.9, 0.04), M.blackPlastic, 3.0, UNO_TOP + 0.55, -1.85, g);
    const hole = cyl(0.3, 0.05, std(0x020202), 3.72, UNO_TOP + 0.55, -1.85, g);
    hole.rotation.z = Math.PI / 2;
    cyl(0.06, 0.1, M.tin, 3.7, UNO_TOP + 0.55, -1.85, g, 12).rotation.z = Math.PI / 2;
    // electrolytic caps: dark sleeve, scored aluminium top
    const capTex = canvasTex(256, 64, (c, w, h) => {
      c.fillStyle = '#1b2230'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#8f98a8'; c.fillRect(w * 0.7, 0, w * 0.12, h);
    });
    const capTop = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#c7ccd3'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#7b8189'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(w / 2, 8); c.lineTo(w / 2, h - 8); c.moveTo(8, h / 2); c.lineTo(w - 8, h / 2); c.stroke();
    });
    [0.85, 1.5].forEach((x) => {
      cyl(0.3, 0.56, phys(0xffffff, { map: capTex, roughness: 0.35, clearcoat: 0.6 }), x, UNO_TOP + 0.28, -1.95, g);
      cyl(0.285, 0.02, std(0xffffff, { map: capTop, metalness: 0.9, roughness: 0.35 }), x, UNO_TOP + 0.57, -1.95, g);
    });
    // regulator, USB chip, reset button, ICSP, LEDs, small parts
    box(0.65, 0.16, 0.35, M.chip, 2.0, UNO_TOP + 0.08, -1.25, g);
    box(0.32, 0.03, 0.22, M.tin, 2.0, UNO_TOP + 0.015, -1.5, g);
    box(0.5, 0.09, 0.5, M.chip, 2.05, UNO_TOP + 0.045, 0.55, g);
    box(0.62, 0.2, 0.62, M.tin, 2.75, UNO_TOP + 0.1, 2.0, g);
    cyl(0.2, 0.14, phys(0xd63a33, { roughness: 0.4 }), 2.75, UNO_TOP + 0.27, 2.0, g, 20);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      box(0.064, 0.85, 0.064, M.gold, -3.0 + c * 0.254, UNO_TOP + 0.3, -0.254 + r * 0.254, g);
    }
    box(0.5, 0.25, 0.76, M.blackPlastic, -2.873, UNO_TOP + 0.125, 0, g);
    const led = (m, x, z) => box(0.2, 0.08, 0.12, m, x, UNO_TOP + 0.04, z, g);
    led(M.ledGreen, 0.9, 1.6);
    const ledL = led(M.ledAmber.clone(), -0.2, 1.6);
    const ledTx = led(M.ledAmber.clone(), 0.0, 1.85);
    const glowOn = glow(0x39ff6e, 0.9, g, 0.9, UNO_TOP + 0.12, 1.6);
    glowOn.material.opacity = 0.55;
    unoLeds.push({ L: ledL, tx: ledTx });
    seed = 9;
    const smdGeo = boxG(0.16, 0.06, 0.08);
    const inst = new T.InstancedMesh(smdGeo, M.smdBlack, 40);
    const inst2 = new T.InstancedMesh(smdGeo, M.smdCap, 30);
    const o = new T.Object3D();
    let a = 0, b = 0;
    for (let i = 0; i < 70; i++) {
      const x = -0.6 + rnd() * 3.7, z = -1.2 + rnd() * 2.8;
      if (Math.abs(x - 1.62) < 0.6 && Math.abs(z + 0.45) < 0.3) continue;
      if (Math.abs(x - 2.05) < 0.4 && Math.abs(z - 0.55) < 0.4) continue;
      if (Math.abs(z + 0.8) < 0.6 && x < 1.3) continue;
      if (Math.abs(x - 2.0) < 0.45 && Math.abs(z + 1.25) < 0.35) continue;
      if (Math.abs(z + 1.95) < 0.4 && x > 0.4 && x < 1.9) continue;
      o.position.set(x, UNO_TOP + 0.03, z);
      o.rotation.y = rnd() > 0.5 ? Math.PI / 2 : 0;
      o.updateMatrix();
      if (rnd() > 0.45 && a < 40) inst.setMatrixAt(a++, o.matrix); else if (b < 30) inst2.setMatrixAt(b++, o.matrix);
    }
    inst.count = a;
    inst2.count = b;
    inst.castShadow = inst2.castShadow = true;
    g.add(inst, inst2);
    const pins = {};
    Object.keys(pinX).forEach((n) => { pins[n] = { p: unoPinLocal(n), d: UP.clone() }; });
    return { g, pins };
  }

  // ===========================================================================
  // 4x4 membrane keypad: keys on +y, row 1 at -z, ribbon tail at +z
  // ===========================================================================
  const KEYS = [['1', '2', '3', 'A'], ['4', '5', '6', 'B'], ['7', '8', '9', 'C'], ['*', '0', '#', 'D']];
  const keyMeshes = {};
  function buildKeypad() {
    const g = new T.Group();
    const baseTex = canvasTex(690, 760, (c, w, h) => {
      c.fillStyle = '#0d0e10';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = '#e9ebee';
      c.lineWidth = 6;
      rr(c, 26, 26, w - 52, h - 52, 34);
      c.stroke();
    });
    texSlab(6.9, 7.6, 0.08, 0.35, baseTex, std(0x0d0e10), { roughness: 0.55, clearcoat: 0.25 }, g);
    const blue = phys(0x2f9be6, { roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 });
    const red = phys(0xd83a3f, { roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 });
    const keyGeo = slab(1.28, 1.38, 0.07, 0.16, 0.025);
    const glyphGeo = new T.PlaneGeometry(1.1, 1.1);
    glyphGeo.rotateX(-Math.PI / 2);
    KEYS.forEach((row, r) => row.forEach((k, c) => {
      const num = /[0-9]/.test(k);
      const x = (c - 1.5) * 1.6, z = -0.35 + (r - 1.5) * 1.72;
      const mat = (num ? blue : red).clone();
      mat.emissive = new T.Color(num ? 0x2f9be6 : 0xd83a3f);
      mat.emissiveIntensity = 0;
      const km = mesh(keyGeo, mat, x, 0.08, z, g);
      const gt = canvasTex(128, 128, (cc, w, h) => {
        cc.clearRect(0, 0, w, h);
        cc.fillStyle = '#ffffff';
        cc.font = (k === '*' ? 'bold 96px' : 'bold 64px') + ' Arial, "Segoe UI", sans-serif';
        cc.textAlign = 'center';
        cc.textBaseline = 'middle';
        cc.fillText(k, w / 2, h / 2 + (k === '*' ? 18 : 3));
      });
      const glyph = new T.Mesh(glyphGeo, new T.MeshStandardMaterial({ map: gt, transparent: true, roughness: 0.4, depthWrite: false }));
      glyph.position.set(x, 0.152, z);
      g.add(glyph);
      keyMeshes[k] = km;
    }));
    // ribbon tail with the 8-pin plug (shown when the keypad floats on its own)
    const tail = new T.Group();
    g.add(tail);
    const ribTex = canvasTex(256, 64, (c, w, h) => {
      c.fillStyle = 'rgba(210,214,220,.55)';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(160,166,175,.95)'; c.fillRect(18 + i * 28.5, 0, 10, h); }
    });
    const rib = mesh(new T.PlaneGeometry(2.1, 2.6), std(0xffffff, { map: ribTex, transparent: true, roughness: 0.35, side: T.DoubleSide, depthWrite: false }), 0, 0.04, 5.1, tail);
    rib.rotation.x = -Math.PI / 2;
    rib.castShadow = false;
    box(2.3, 0.42, 0.42, M.blackPlastic, 0, 0.22, 6.55, tail);
    const pins = {};
    for (let i = 0; i < 8; i++) {
      const x = -0.889 + i * 0.254;
      pins['P' + i] = { p: V(x, 0.22, 6.76), d: V(0, 0, 1) };
    }
    return { g, pins, tail };
  }

  // ===========================================================================
  // OLED 1.3" SH1106: screen on +y, header at -z (top edge), pins to -y
  // ===========================================================================
  const OLED = window.GAS_OLED;
  const oledTex = new T.CanvasTexture(OLED.canvas);
  oledTex.colorSpace = T.SRGBColorSpace;
  oledTex.anisotropy = maxAniso;
  const oledGlows = [];
  function buildOled() {
    const g = new T.Group();
    const tex = canvasTex(700, 680, (c, w, h) => {
      c.fillStyle = '#0d4bb0';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(90,160,255,.3)';
      c.lineWidth = 6;
      for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(250 + i * 40, 30); c.lineTo(250 + i * 40, 120); c.lineTo(200 + i * 60, 200); c.stroke(); }
      c.fillStyle = '#eef4ff';
      c.font = 'bold 26px Arial, sans-serif';
      c.textAlign = 'center';
      ['GND', 'VCC', 'SCL', 'SDA'].forEach((t, i) => c.fillText(t, w / 2 + (i - 1.5) * 50.8, 110));
      [[50, 50], [w - 50, 50], [50, h - 50], [w - 50, h - 50]].forEach(([x, y]) => {
        c.beginPath(); c.arc(x, y, 30, 0, 7); c.fillStyle = '#cfd4da'; c.fill();
        c.beginPath(); c.arc(x, y, 16, 0, 7); c.fillStyle = '#020306'; c.fill();
      });
    });
    pcb(3.5, 3.4, 0.12, 0.08, tex, 0x0a3270, g);
    // glass module with the active area
    const glass = phys(0x050608, { roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, metalness: 0.2 });
    box(3.25, 0.14, 2.25, glass, 0, 0.19, 0.3, g);
    const screen = new T.Mesh(new T.PlaneGeometry(2.94, 1.47), new T.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: oledTex, roughness: 0.12, metalness: 0 }));
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.262, 0.25);
    g.add(screen);
    // amber flex cable around the lower edge
    const fpc = phys(0xc9791c, { roughness: 0.3, clearcoat: 0.6, transmission: 0, transparent: true, opacity: 0.92 });
    box(1.3, 0.02, 0.32, fpc, 0, 0.13, 1.55, g);
    box(1.3, 0.22, 0.02, fpc, 0, 0.03, 1.71, g);
    const gl = glow(0x7fd7ff, 3.6, g, 0, 0.45, 0.25);
    gl.scale.set(4.2, 2.6, 1);
    oledGlows.push(gl);
    box(1.02, 0.25, 0.25, M.blackPlastic, 0, -0.125, -1.45, g);
    const pins = {};
    ['GND', 'VCC', 'SCL', 'SDA'].forEach((n, i) => {
      const x = -0.381 + i * 0.254;
      box(0.064, 0.72, 0.064, M.gold, x, -0.3, -1.45, g);
      pins[n] = { p: V(x, -0.66, -1.45), d: V(0, -1, 0) };
    });
    return { g, pins };
  }

  // ===========================================================================
  // RFID-RC522: parts on +y, header at +z
  // ===========================================================================
  const RC_PINS = ['SDA', 'SCK', 'MOSI', 'MISO', 'IRQ', 'GND', 'RST', '3.3V'];
  function buildRc() {
    const g = new T.Group();
    const tex = canvasTex(800, 1200, (c, w, h) => {
      c.fillStyle = '#1259c4';
      c.fillRect(0, 0, w, h);
      c.lineWidth = 14;
      for (let i = 0; i < 4; i++) {
        c.strokeStyle = i % 2 ? 'rgba(120,180,255,.55)' : 'rgba(150,200,255,.65)';
        rr(c, 70 + i * 34, 90 + i * 34, w - 140 - i * 68, 640 - i * 68, 70 - i * 10);
        c.stroke();
      }
      c.strokeStyle = 'rgba(120,180,255,.5)';
      c.lineWidth = 8;
      for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(180 + i * 55, 760); c.lineTo(180 + i * 55, 860); c.lineTo(260 + i * 35, 960); c.lineTo(260 + i * 35, 1080); c.stroke(); }
      c.fillStyle = '#eef4ff';
      c.textAlign = 'center';
      c.font = 'bold 46px Arial, sans-serif';
      c.fillText('RFID-RC522', w / 2, 58);
      c.font = 'bold 30px Arial, sans-serif';
      RC_PINS.forEach((t, i) => {
        c.save();
        c.translate(w / 2 + (i - 3.5) * 50.8, h - 135);
        c.rotate(-Math.PI / 2);
        c.fillText(t, 0, 10);
        c.restore();
      });
      [[70, 70], [w - 70, 70], [70, h - 280], [w - 70, h - 280]].forEach(([x, y]) => {
        c.beginPath(); c.arc(x, y, 40, 0, 7); c.fillStyle = '#cfd4da'; c.fill();
        c.beginPath(); c.arc(x, y, 22, 0, 7); c.fillStyle = '#020306'; c.fill();
      });
      for (let i = 0; i < 8; i++) { c.fillStyle = '#cfd4da'; c.fillRect(w / 2 + (i - 3.5) * 50.8 - 17, h - 58, 34, 34); }
    });
    pcb(4.0, 6.0, 0.16, 0.12, tex, 0x0a3a80, g);
    const qfnTex = textTex(256, 256, [{ t: 'MFRC522', f: 'bold 40px', y: 0.45 }, { t: 'NXP 01', f: '30px', y: 0.65 }], { fg: '#777b83', dot: [40, 40, 12] });
    mesh(slab(0.6, 0.6, 0.09, 0.02, 0.015), [phys(0xffffff, { map: qfnTex, roughness: 0.45 }), M.chip], 0.15, 0.16, 1.15, g);
    const xtal = mesh(rbox(1.05, 0.38, 0.34, 0.12), M.tin, -1.0, 0.36, 1.0, g);
    xtal.rotation.y = Math.PI / 2;
    seed = 31;
    for (let i = 0; i < 16; i++) box(0.17, 0.07, 0.09, rnd() > 0.4 ? M.smdBlack : M.smdCap, -1.3 + rnd() * 2.6, 0.195, 0.55 + rnd() * 1.4, g);
    [[0.9, 0.8], [1.15, 1.55], [-0.4, 1.8]].forEach(([x, z]) => box(0.38, 0.22, 0.3, std(0x2a2b2f), x, 0.27, z, g));
    maleHeaderOn(g);
    function maleHeaderOn(p) {
      const h = new T.Group();
      h.position.set(0, 0.16, 2.75);
      p.add(h);
      maleHeader(8, h, -0.889, 0, 0.254, 0.6, 0.25);
    }
    const pins = {};
    RC_PINS.forEach((n, i) => { pins[n] = { p: V(-0.889 + i * 0.254, 0.16 + 0.6, 2.75), d: V(0, 1, 0) }; });
    return { g, pins };
  }

  // ===========================================================================
  // passive buzzer module: buzzer on +y, pins at +z pointing -y
  // ===========================================================================
  const buzzRings = [];
  function buildBuzzer() {
    const g = new T.Group();
    const tex = canvasTex(360, 400, (c, w, h) => {
      c.fillStyle = '#141519';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#d8dbe0';
      c.font = 'bold 30px Arial, sans-serif';
      c.textAlign = 'center';
      ['S', '+', '-'].forEach((t, i) => c.fillText(t, w / 2 + (i - 1) * 50.8, h - 70));
    });
    pcb(1.8, 2.0, 0.12, 0.08, tex, 0x0c0d10, g);
    const sleeve = phys(0x0a0b0d, { roughness: 0.5, clearcoat: 0.25 });
    cyl(0.6, 0.85, sleeve, 0, 0.12 + 0.425, -0.15, g, 48);
    const topTex = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#131417'; c.fillRect(0, 0, w, h);
      c.beginPath(); c.arc(w / 2, h / 2, 26, 0, 7); c.fillStyle = '#000'; c.fill();
      c.fillStyle = '#e8e8e8'; c.font = 'bold 44px Arial'; c.textAlign = 'center'; c.fillText('+', w * 0.24, h * 0.32);
    });
    cyl(0.595, 0.01, std(0xffffff, { map: topTex, roughness: 0.7 }), 0, 0.976, -0.15, g, 48);
    const pins = {};
    ['S', '+', '-'].forEach((n, i) => {
      const x = -0.254 + i * 0.254;
      box(0.064, 0.7, 0.064, M.gold, x, -0.25, 0.8, g);
      pins[n] = { p: V(x, -0.6, 0.8), d: V(0, -1, 0) };
    });
    box(0.78, 0.25, 0.25, M.blackPlastic, 0, -0.125, 0.8, g);
    const rings = [0, 1, 2].map(() => {
      const m = new T.Mesh(new T.RingGeometry(0.66, 0.72, 64), new T.MeshBasicMaterial({ color: 0x7fd7ff, transparent: true, opacity: 0, depthWrite: false, depthTest: false, side: T.DoubleSide, toneMapped: false }));
      m.renderOrder = 10;
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 1.0, -0.15);
      g.add(m);
      return m;
    });
    buzzRings.push(rings);
    return { g, pins };
  }

  // ===========================================================================
  // HC-SR501: board in the xy plane, lens towards +z, pins at the back (-z)
  // ===========================================================================
  function buildPir() {
    const g = new T.Group();
    const tex = canvasTex(640, 480, (c, w, h) => {
      c.fillStyle = '#167a3c';
      c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(120,230,150,.25)';
      c.lineWidth = 6;
      for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(40 + i * 48, 30); c.lineTo(40 + i * 48, 120); c.lineTo(80 + i * 40, 200); c.stroke(); }
      [[40, 40], [w - 40, 40], [40, h - 40], [w - 40, h - 40]].forEach(([x, y]) => {
        c.beginPath(); c.arc(x, y, 26, 0, 7); c.fillStyle = '#cfd4da'; c.fill();
        c.beginPath(); c.arc(x, y, 13, 0, 7); c.fillStyle = '#020306'; c.fill();
      });
    });
    // lying parts turned up: local +y (top) -> +z (lens side)
    const board = pcb(3.23, 2.43, 0.12, 0.06, tex, 0x0d4a23, g);
    board.rotation.x = Math.PI / 2;
    board.position.z = -0.12;
    const base = mesh(slab(2.4, 2.4, 0.22, 0.12, 0.02), M.white, 0, 0, 0, g);
    base.rotation.x = Math.PI / 2;
    const lens = phys(0xf6f6f2, { roughness: 0.6, sheen: 0.6, sheenColor: new T.Color(0xffffff), sheenRoughness: 0.5, flatShading: true, emissive: 0xff2a2a, emissiveIntensity: 0 });
    const dome = mesh(new T.SphereGeometry(1.12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), lens, 0, 0, 0.22, g);
    dome.rotation.x = Math.PI / 2;
    dome.scale.set(1, 0.82, 1);
    // back side: BISS0001, two trim pots, jumper, header
    box(0.9, 0.5, 0.12, M.chip, 0.6, 0.2, -0.18, g);
    [-0.95, 0.95].forEach((x) => {
      const pot = cyl(0.3, 0.26, phys(0xf1a02a, { roughness: 0.45 }), x, 0.6, -0.25, g, 24);
      pot.rotation.x = Math.PI / 2;
      box(0.06, 0.34, 0.03, std(0x6b4310), x, 0.6, -0.39, g);
    });
    box(0.8, 0.25, 0.25, M.blackPlastic, 0, -1.0, -0.245, g);
    const pins = {};
    ['VCC', 'OUT', 'GND'].forEach((n, i) => {
      const x = -0.254 + i * 0.254;
      box(0.064, 0.064, 0.9, M.gold, x, -1.0, -0.57, g);
      pins[n] = { p: V(x, -1.0, -1.02), d: V(0, 0, -1) };
    });
    return { g, pins, lens };
  }

  // ===========================================================================
  // mini breadboard SYB-170 (orange, like ours): holes on +y
  // ===========================================================================
  const mbHoleLocal = (col, row) => V((col - 8) * 0.254, 0.85, row < 5 ? -(0.3 + (4 - row) * 0.254) : 0.3 + (row - 5) * 0.254);
  function buildMiniBB() {
    const g = new T.Group();
    const W = 4.7, D = 3.5;
    const tex = canvasTex(940, 700, (c, w, h) => {
      c.fillStyle = '#f2a516';
      c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(0,0,0,.12)';
      c.fillRect(0, h / 2 - 22, w, 44);
      for (let col = 0; col < 17; col++) for (let row = 0; row < 10; row++) {
        const p = mbHoleLocal(col, row);
        const x = (p.x / W + 0.5) * w, y = (p.z / D + 0.5) * h;
        c.fillStyle = '#3a2405';
        c.fillRect(x - 11, y - 11, 22, 22);
        c.fillStyle = '#0b0703';
        c.fillRect(x - 7, y - 7, 14, 14);
      }
      c.fillStyle = 'rgba(80,45,0,.55)';
      c.font = 'bold 22px Arial';
      c.textAlign = 'center';
      for (let col = 0; col < 17; col += 2) c.fillText(String(col + 1), ((col - 8) * 0.254 / W + 0.5) * w, 34);
    });
    texSlab(W, D, 0.85, 0.06, tex, std(0xe8960c, { roughness: 0.55 }), { roughness: 0.55, clearcoat: 0.15 }, g);
    return { g, hole: (c, r) => ({ p: mbHoleLocal(c, r), d: UP.clone() }) };
  }

  // ===========================================================================
  // 9 V block with snap clip, same frame as the viewer: terminals at -z
  // ===========================================================================
  function buildBattery() {
    const g = new T.Group();
    const lbl = canvasTex(256, 128, (c, w, h) => {
      c.fillStyle = '#16171b'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#e8e2d8'; c.font = 'bold 72px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('9V', w / 2, h / 2 + 4);
    });
    const body = phys(0x16171b, { roughness: 0.38, clearcoat: 0.5 });
    const copper = std(0xb8722f, { metalness: 0.75, roughness: 0.32 });
    mesh(rbox(2.6, 1.75, 3.1, 0.1), body, 0, 0.875, 0.88, g);
    mesh(rbox(2.6, 1.75, 1.75, 0.1), copper, 0, 0.875, -1.55, g);
    const lp = new T.Mesh(new T.PlaneGeometry(1.6, 0.8), std(0xffffff, { map: lbl, roughness: 0.5 }));
    lp.rotation.x = -Math.PI / 2;
    lp.position.set(0, 1.756, 0.9);
    g.add(lp);
    cyl(0.32, 0.28, M.tin, -0.6, 0.9, -2.55, g, 24).rotation.x = Math.PI / 2;
    cyl(0.34, 0.28, M.tin, 0.6, 0.9, -2.55, g, 6).rotation.x = Math.PI / 2;
    mesh(rbox(2.2, 1.0, 0.4, 0.06), M.blackPlastic, 0, 0.9, -2.88, g);
    return { g, leads: { '+': { p: V(-0.4, 0.9, -3.08), d: V(0, 0, -1) }, '-': { p: V(0.4, 0.9, -3.08), d: V(0, 0, -1) } } };
  }

  // RFID card used in the animations (white, rounded, faint print)
  function buildCard() {
    const g = new T.Group();
    const tex = canvasTex(856, 540, (c, w, h) => {
      c.fillStyle = '#f4f5f7'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#0969DA'; c.lineWidth = 10;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(140, h / 2, 40 + i * 34, -0.9, 0.9); c.stroke(); }
      c.fillStyle = '#0B3D6E'; c.font = 'bold 64px Carlito, Arial'; c.fillText('RFID', 330, h / 2 + 22);
    });
    const m = mesh(slab(8.56, 5.4, 0.08, 0.32, 0.01), [phys(0xffffff, { map: tex, roughness: 0.3, clearcoat: 0.7 }), phys(0xe9eaec, { roughness: 0.4 })], 0, 0, 0, g);
    m.position.y = -0.04;
    return g;
  }

  // ===========================================================================
  // printed case from enclosure.js (= Gehaeuse/stl), black PLA with layer lines
  // ===========================================================================
  const G = {
    wall: 2.4, floor_t: 2.4, lid_t: 2.4, cu_w: 90, cu_depth: 40, keypad_h: 77,
    ribbon_slot_h: 4, rfid_h: 40, oled_w: 36, oled_h: 34, guide_t: 1.2, fit: 0.25, uno_standoff_h: 5,
    su_w: 52, su_h: 44, su_depth: 30, pir_post_h: 3, su_angle: 60, wedge_min: 5, cable_y: 145,
    bb_cy: 115, bat_t: 17.5, bat_l: 48.5, bat_y: 82
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
  G.wedge_max = G.wedge_min + G.su_w * Math.sin(G.su_angle * deg);

  function decode(name) {
    const d = window.GAS_ENCLOSURE[name];
    const bin = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;
    const q = new Int16Array(bin(d.v));
    const idx = d.i32 ? new Uint32Array(bin(d.i)) : new Uint16Array(bin(d.i));
    const pos = new Float32Array(q.length);
    for (let i = 0; i < q.length; i++) pos[i] = q[i] / 1000;
    return creased(pos, idx, 32);
  }
  function creased(pos, idx, angle) {
    const nt = idx.length / 3, nv = pos.length / 3;
    const fn = new Float32Array(nt * 3);
    const a = V(0, 0, 0), b = V(0, 0, 0), c = V(0, 0, 0);
    for (let t = 0; t < nt; t++) {
      a.fromArray(pos, idx[t * 3] * 3);
      b.fromArray(pos, idx[t * 3 + 1] * 3);
      c.fromArray(pos, idx[t * 3 + 2] * 3);
      c.sub(b).cross(a.sub(b)).normalize();
      fn[t * 3] = c.x; fn[t * 3 + 1] = c.y; fn[t * 3 + 2] = c.z;
    }
    const start = new Uint32Array(nv + 1);
    for (let i = 0; i < idx.length; i++) start[idx[i] + 1]++;
    for (let v = 0; v < nv; v++) start[v + 1] += start[v];
    const fill = start.slice(0, nv), vf = new Uint32Array(idx.length);
    for (let i = 0; i < idx.length; i++) vf[fill[idx[i]]++] = (i / 3) | 0;
    const cosA = Math.cos(angle * deg);
    const P = new Float32Array(nt * 9), N = new Float32Array(nt * 9);
    for (let t = 0; t < nt; t++) {
      for (let k = 0; k < 3; k++) {
        const v = idx[t * 3 + k], o = (t * 3 + k) * 3;
        P[o] = pos[v * 3]; P[o + 1] = pos[v * 3 + 1]; P[o + 2] = pos[v * 3 + 2];
        let x = 0, y = 0, z = 0;
        for (let j = start[v]; j < start[v + 1]; j++) {
          const f = vf[j] * 3;
          if (fn[f] * fn[t * 3] + fn[f + 1] * fn[t * 3 + 1] + fn[f + 2] * fn[t * 3 + 2] >= cosA) { x += fn[f]; y += fn[f + 1]; z += fn[f + 2]; }
        }
        const l = Math.hypot(x, y, z) || 1;
        N[o] = x / l; N[o + 1] = y / l; N[o + 2] = z / l;
      }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(P, 3));
    g.setAttribute('normal', new T.BufferAttribute(N, 3));
    g.computeBoundingSphere();
    return g;
  }
  // matte black PLA; print layers (0.2 mm along the STL z axis) as a fine bump
  function plaMaterial() {
    const m = phys(0x16171a, { roughness: 0.62, sheen: 0.35, sheenRoughness: 0.7, sheenColor: new T.Color(0x4a5060), transparent: false });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vObjPos;
vec3 gasLayerBump(vec3 surfPos, vec3 surfNorm, float h) {
  vec3 sx = dFdx(surfPos), sy = dFdy(surfPos);
  vec3 r1 = cross(sy, surfNorm), r2 = cross(surfNorm, sx);
  float det = dot(sx, r1);
  vec2 dh = vec2(dFdx(h), dFdy(h));
  vec3 grad = sign(det) * (dh.x * r1 + dh.y * r2);
  return normalize(abs(det) * surfNorm - grad);
}`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  float f = vObjPos.z / 0.02;
  float fw = fwidth(f);
  float fade = 1.0 - smoothstep(0.18, 0.45, fw);
  float h = sin(f * 6.2831853) * 0.0012 * fade;
  normal = gasLayerBump(-vViewPosition, normal, h);
}`);
    };
    return m;
  }
  const housing = [];
  function housingPart(name, parent) {
    const geo = decode(name);
    const solid = plaMaterial();
    const m = mesh(geo, solid, 0, 0, 0, parent);
    const h = { name, m, solid, op: 1 };
    housing.push(h);
    return m;
  }
  function setHousingOpacity(h, k) {
    if (Math.abs(h.op - k) < 0.001) return;
    h.op = k;
    const tr = k < 0.999;
    if (h.solid.transparent !== tr) { h.solid.transparent = tr; h.solid.needsUpdate = true; }
    h.solid.opacity = k;
    h.solid.depthWrite = !tr;
    h.m.visible = k > 0.01;
    h.m.castShadow = k > 0.6;
  }

  // ===========================================================================
  // assemble: control unit (cu) and sensor unit (su) in the frame of
  // gehaeuse.scad (x right, y up, z out of the wall). All modules live in
  // `world` and blend between their place in the case and a flat layout.
  // ===========================================================================
  const world = new T.Group();
  scene.add(world);
  const cuPlace = new T.Group();          // where the control unit stands
  world.add(cuPlace);
  const cu = new T.Group();               // case frame, centred under cuPlace
  cu.position.set(-mm(G.cu_w) / 2, 0, -mm(G.cu_th) / 2);
  cuPlace.add(cu);
  housingPart('control_back', cu);
  const hinge = new T.Group();            // left front edge of the back part
  hinge.position.set(0, 0, mm(G.cu_th));
  cu.add(hinge);
  const lid = new T.Group();
  hinge.add(lid);
  const front = housingPart('control_front', lid);
  front.rotation.y = Math.PI;
  front.position.set(mm(G.cu_w), 0, mm(G.lid_t));
  // countersunk lid screws
  const screwTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#9aa0a8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2a2d33'; c.fillRect(w / 2 - 8, 22, 16, h - 44); c.fillRect(22, h / 2 - 8, w - 44, 16);
  });
  const screws = [];
  [[6.5, 6.5], [83.5, 6.5], [6.5, G.cu_h - 6.5], [83.5, G.cu_h - 6.5]].forEach(([x, y]) => {
    const s = cyl(0.27, 0.03, std(0xffffff, { map: screwTex, metalness: 0.9, roughness: 0.35 }), mm(x), mm(y), mm(G.lid_t) + 0.01, lid, 24);
    s.rotation.x = Math.PI / 2;
    screws.push(s);
  });

  const su = new T.Group();               // wedge on the wall
  world.add(su);
  const suWedge = housingPart('sensor_wedge', su);
  const sBox = new T.Group();
  sBox.position.z = mm(G.wedge_max);
  sBox.rotation.y = G.su_angle * deg;
  su.add(sBox);
  const sBack = new T.Group();
  sBox.add(sBack);
  housingPart('sensor_back', sBack);
  const sLid = new T.Group();
  sLid.position.z = mm(G.su_th);
  sBack.add(sLid);
  const sFront = housingPart('sensor_front', sLid);
  sFront.rotation.y = Math.PI;
  sFront.position.set(mm(G.su_w), 0, mm(G.lid_t));
  const hCu = housing.filter((h) => h.name.startsWith('control'));
  const hSu = housing.filter((h) => h.name.startsWith('sensor'));

  const basis = (x, y, z) => new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
  const qRotX = (a) => new T.Quaternion().setFromAxisAngle(V(1, 0, 0), a);
  const mods = {};
  function addModule(id, built, caseParent, casePos, caseQuat, flatPos, flatQuat) {
    const g = built.g;
    g.matrixAutoUpdate = false;
    world.add(g);
    const caseM = new T.Matrix4().compose(casePos, caseQuat, V(1, 1, 1));
    mods[id] = Object.assign(built, {
      id, caseParent, caseM, flatPos: flatPos.clone(), flatQuat: flatQuat || caseQuat.clone(),
      k: 0, vis: 1, pop: 0
    });
    return mods[id];
  }
  const Q0 = new T.Quaternion();
  const qFace = qRotX(Math.PI / 2);       // lying part -> facing +z
  addModule('uno', buildUno(), cu, V(mm(G.uno_x + 53.34 / 2), mm(G.uno_y + 68.58 / 2), mm(G.uno_z)), basis(V(0, -1, 0), V(0, 0, 1), V(-1, 0, 0)), V(4.5, 9.0, 2.0), qFace);
  addModule('kp', buildKeypad(), lid, V(mm(G.cu_cx), mm(G.kp_y + G.keypad_h / 2), mm(G.lid_t)), qRotX(Math.PI / 2), V(-5.4, 6.4, 2.6), qFace);
  addModule('oled', buildOled(), lid, V(mm(G.cu_cx), mm(G.oled_cy) + 0.3, -0.23), qRotX(Math.PI / 2), V(-5.0, 15.2, 3.0), qFace);
  addModule('rc', buildRc(), lid, V(mm(G.cu_cx), mm(G.rfid_cy), 0), basis(V(0, -1, 0), V(0, 0, -1), V(1, 0, 0)), V(14.2, 13.4, 2.4), qFace);
  addModule('buz', buildBuzzer(), lid, V(mm(G.buzzer_x), mm(G.oled_cy) - 0.15, -0.96), qRotX(Math.PI / 2), V(14.2, 6.6, 3.0), qFace);
  addModule('mb', buildMiniBB(), cu, V(mm(G.cu_cx), mm(G.bb_cy), mm(G.floor_t)), qRotX(Math.PI / 2), V(4.5, 16.2, 2.0), qFace);
  addModule('bat', buildBattery(), cu, V(mm(G.wall) + 0.02, mm(G.bat_y + G.bat_l / 2) + 0.02, mm(G.floor_t) + 1.32), basis(V(0, 0, -1), V(1, 0, 0), V(0, -1, 0)), V(10.6, 16.6, 1.6), basis(V(0, 0, -1), V(0, 1, 0), V(1, 0, 0)));
  addModule('pir', buildPir(), sLid, V(mm(G.su_w / 2), mm(G.su_h / 2), -mm(G.pir_post_h)), Q0, V(14.2, 2.0, 3.0), Q0);
  const keypadRibbon = new T.Group();      // ribbon through the slot when glued on the lid
  lid.add(keypadRibbon);
  {
    const rib = std(0xb9bec6, { roughness: 0.35, transparent: true, opacity: 0.8 });
    const sy = mm(G.slot_y + G.ribbon_slot_h / 2);
    box(2.1, mm(G.kp_y) - sy + 0.05, 0.02, rib, mm(G.cu_cx), (mm(G.kp_y) + sy) / 2, mm(G.lid_t) + 0.01, keypadRibbon);
    box(2.1, 0.02, 1.5, rib, mm(G.cu_cx), sy, mm(G.lid_t) - 0.75, keypadRibbon);
    box(2.3, 0.42, 0.42, M.blackPlastic, mm(G.cu_cx), sy + 0.05, -1.45, keypadRibbon);
  }
  const kpPlugCase = (i) => ({ o: lid, p: V(mm(G.cu_cx) - 0.889 + i * 0.254, mm(G.slot_y + G.ribbon_slot_h / 2) + 0.27, -1.45), d: V(0, 1, 0) });

  // the card for the RFID animations
  const card = buildCard();
  world.add(card);
  card.visible = false;

  // ===========================================================================
  // wires: Uno pin -> module pin; endpoints are recomputed every frame the
  // parts move, so the same wires work in the case and in the flat layout
  // ===========================================================================
  const wires = [];
  const DUP = 1.0;
  const dupGeo = rbox(0.25, DUP, 0.25, 0.03);
  dupGeo.translate(0, DUP / 2, 0);
  const dupMat = phys(0x0c0d0f, { roughness: 0.45, clearcoat: 0.3 });
  const worldInv = new T.Matrix4();
  const wireW = new T.Group();
  world.add(wireW);
  const _m = new T.Matrix4(), _p = V(0, 0, 0), _d = V(0, 0, 0), _q = new T.Quaternion();
  // endpoint in world space; e = { m: module id, pin } or { m, hole: [c, r] } or { o, p, d }
  function endWorld(e) {
    if (e.o) {
      _m.multiplyMatrices(worldInv, e.o.matrixWorld);
      _p.copy(e.p).applyMatrix4(_m);
      _d.copy(e.d).transformDirection(_m);
      return { p: _p.clone(), d: _d.clone() };
    }
    const mod = mods[e.m];
    const pin = e.hole ? mod.hole(e.hole[0], e.hole[1]) : e.lead ? mod.leads[e.lead] : mod.pins[e.pin];
    _p.copy(pin.p).applyMatrix4(mod.g.matrix);
    _d.copy(pin.d).transformDirection(mod.g.matrix);
    return { p: _p.clone(), d: _d.clone() };
  }
  function addWire(group, a, b, color, opt) {
    opt = opt || {};
    const mat = phys(color, { roughness: 0.34, clearcoat: 0.45, clearcoatRoughness: 0.4, emissive: color, emissiveIntensity: 0 });
    const tube = new T.Mesh(new T.BufferGeometry(), mat);
    tube.castShadow = true;
    wireW.add(tube);
    const du = [mesh(dupGeo, dupMat, 0, 0, 0, wireW), mesh(dupGeo, dupMat, 0, 0, 0, wireW)];
    const w = { group, a, b, color, mat, tube, du, curve: null, prog: 1, shown: 1, bare: opt.bare, alt: opt.alt, slack: opt.slack || 1, hi: 0, segs: 40 };
    wires.push(w);
    return w;
  }
  const lerpEnd = (A, B, k) => ({ p: A.p.clone().lerp(B.p, k), d: A.d.clone().lerp(B.d, k).normalize() });
  function layoutWire(w) {
    let A = endWorld(w.a), B = endWorld(w.b);
    if (w.alt) { const k = w.alt(); if (k > 0) B = lerpEnd(B, endWorld(w.altB), k); }
    if (w.altA) { const k = w.altA(); if (k > 0) A = lerpEnd(A, endWorld(w.altAe), k); }
    const off = DUP;
    const pa = A.p.clone().addScaledVector(A.d, w.bare ? 0 : off), pb = B.p.clone().addScaledVector(B.d, off);
    const inCase = 1 - Math.max(...[w.a, w.b].map((e) => (e.m ? mods[e.m].k : 0)));
    const h = (0.4 + pa.distanceTo(pb) * (0.26 - 0.12 * inCase)) * w.slack;
    w.curve = new T.CubicBezierCurve3(pa, pa.clone().addScaledVector(A.d, h), pb.clone().addScaledVector(B.d, h), pb);
    w.tube.geometry.dispose();
    w.tube.geometry = new T.TubeGeometry(w.curve, w.segs, 0.055, 7, false);
    const place = (m, E) => {
      m.position.copy(E.p);
      m.quaternion.setFromUnitVectors(UP, E.d);
    };
    if (!w.bare) place(w.du[0], A); else w.du[0].visible = false;
    place(w.du[1], B);
    w.du[1].visible = true;
  }
  function applyWireProgress(w) {
    const k = w.prog * w.shown;
    const idx = w.tube.geometry.index;
    if (idx) w.tube.geometry.setDrawRange(0, Math.floor(idx.count * clamp01(k) / 42) * 42);
    w.tube.visible = k > 0.002;
    if (!w.bare) w.du[0].visible = k > 0.002;
    w.du[1].visible = k > 0.98;
    w.mat.emissiveIntensity = w.hi * 0.9;
  }

  const KP_COLORS = [0x86efac, 0xa78bfa, 0xbef264, 0xf0abfc, 0x5eead4, 0x60a5fa, 0x84cc16, 0x2dd4bf];
  ['D9', 'D8', 'D7', 'D6', 'D5', 'D4', 'D3', 'D2'].forEach((pin, i) => {
    const w = addWire('kp', { m: 'uno', pin }, kpPlugCase(i), KP_COLORS[i]);
    w.altB = { m: 'kp', pin: 'P' + i };
    w.alt = () => mods.kp.k;
  });
  const MW = [
    ['i2c', 'A4', 'oled', 'SDA', 0xfb7185], ['i2c', 'A5', 'oled', 'SCL', 0xe879f9],
    ['spi', 'D11', 'rc', 'MOSI', 0x22d3ee], ['spi', 'D12', 'rc', 'MISO', 0x34d399], ['spi', 'D13', 'rc', 'SCK', 0xa3e635],
    ['spis', 'A0', 'rc', 'SDA', 0xfb923c], ['spis', 'A1', 'rc', 'RST', 0xf472b6],
    ['rc3v', '3V3', 'rc', '3.3V', 0xfca5a5], ['rc3v', 'GND1', 'rc', 'GND', 0x475569],
    ['buz', 'D10', 'buz', 'S', 0xfacc15]
  ];
  const W = {};
  MW.forEach(([group, pin, m, to, color]) => { W[pin] = addWire(group, { m: 'uno', pin }, { m, pin: to }, color); });
  const hole = (c, r) => ({ m: 'mb', hole: [c, r] });
  const MB5V = 12, MBGND = 14, MB9V = 16;
  addWire('pwr', { m: 'uno', pin: '5V' }, hole(MB5V, 3), 0xdc2626);
  addWire('pwr', { m: 'uno', pin: 'GND' }, hole(MBGND, 3), 0x3b4352);
  addWire('pwr', hole(MB5V, 2), { m: 'oled', pin: 'VCC' }, 0xdc2626);
  addWire('pwr', hole(MBGND, 2), { m: 'oled', pin: 'GND' }, 0x3b4352);
  addWire('pwr', hole(MB5V, 1), { m: 'buz', pin: '+' }, 0xdc2626);
  addWire('pwr', hole(MBGND, 1), { m: 'buz', pin: '-' }, 0x3b4352);
  addWire('bat', { m: 'bat', lead: '+' }, hole(MB9V, 5), 0xdc2626, { bare: true });
  addWire('bat', { m: 'bat', lead: '-' }, hole(MBGND, 4), 0x1f2229, { bare: true });
  addWire('bat', { m: 'uno', pin: 'VIN' }, hole(MB9V, 9), 0xf59e0b);
  // PIR: straight to the sensor pins in the flat layout, into the cable in the case
  const cableEnd = { o: cu, p: V(mm(G.cu_cx) + 0.3, mm(G.cable_y) - 0.5, 1.1), d: V(0.25, -1, 0.35).normalize() };
  const pirW = {
    OUT: addWire('pir', { m: 'uno', pin: 'A2' }, cableEnd, 0xf97316),
    VCC: addWire('pir', hole(MB5V, 0), cableEnd, 0xdc2626),
    GND: addWire('pir', hole(MBGND, 0), cableEnd, 0x3b4352)
  };
  Object.keys(pirW).forEach((n) => {
    pirW[n].altB = { m: 'pir', pin: n };
    pirW[n].alt = () => mods.pir.k;
  });
  // challenge "two parts, one pin": the PIR wire starts on D11 and moves to A2
  pirW.OUT.a = { m: 'uno', pin: 'A2' };
  pirW.OUT.altAe = { m: 'uno', pin: 'D11' };
  let pirOnD11 = 0;
  pirW.OUT.altA = () => pirOnD11;
  // 3-wire cable from the control unit through the wall to the sensor unit
  const jacket = mesh(new T.BufferGeometry(), phys(0x2b2f37, { roughness: 0.5, clearcoat: 0.2 }), 0, 0, 0, world);
  function layoutCable() {
    const a = endWorld(cableEnd).p;
    const b = endWorld({ o: sBack, p: V(mm(G.su_w / 2), 0.12, 2.95), d: UP }).p;
    const mid1 = a.clone().add(V(0, -2, -2.5));
    const mid2 = b.clone().add(V(0, -2.5, 0.5));
    const curve = new T.CatmullRomCurve3([a, mid1, mid1.clone().lerp(mid2, 0.5).add(V(0, -1.5, 0)), mid2, b], false, 'centripetal');
    jacket.geometry.dispose();
    jacket.geometry = new T.TubeGeometry(curve, 80, 0.16 * cur.scale, 8, false);
  }

  // ===========================================================================
  // wall scene for "Einsatzort": wall with door, detection fan
  // ===========================================================================
  const wallG = new T.Group();
  world.add(wallG);
  const WALL_T = 4;
  const concrete = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#34373d'; c.fillRect(0, 0, w, h);
    seed = 3;
    for (let i = 0; i < 4000; i++) { c.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.06)'; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
  });
  concrete.wrapS = concrete.wrapT = T.RepeatWrapping;
  concrete.repeat.set(3, 1);
  const wallMat = std(0xffffff, { map: concrete, roughness: 0.92, transparent: true, opacity: 0.5, depthWrite: false });
  const WALL = { x0: -110, door0: -62, door1: -28, x1: 60, h: 30 };
  box(WALL.door0 - WALL.x0, WALL.h, WALL_T, wallMat, (WALL.x0 + WALL.door0) / 2, WALL.h / 2, -WALL_T / 2, wallG);
  box(WALL.x1 - WALL.door1, WALL.h, WALL_T, wallMat, (WALL.door1 + WALL.x1) / 2, WALL.h / 2, -WALL_T / 2, wallG);
  // bright top edge so the wall reads as a cut
  const edgeMat = new T.MeshBasicMaterial({ color: 0x5f7fa8, transparent: true, opacity: 0.6, toneMapped: false });
  box(WALL.door0 - WALL.x0, 0.15, WALL_T, edgeMat, (WALL.x0 + WALL.door0) / 2, WALL.h + 0.08, -WALL_T / 2, wallG).castShadow = false;
  box(WALL.x1 - WALL.door1, 0.15, WALL_T, edgeMat, (WALL.door1 + WALL.x1) / 2, WALL.h + 0.08, -WALL_T / 2, wallG).castShadow = false;
  // door leaf, hinge away from the sensor, opened into the room
  const leafW = WALL.door1 - WALL.door0 - 1;
  const leafPivot = new T.Group();
  leafPivot.position.set(WALL.door0 + 0.5, 0, -WALL_T - 0.4);
  const leaf = box(leafW, WALL.h - 1, 0.8, std(0x3c4048, { roughness: 0.7, transparent: true, opacity: 0.7 }), leafW / 2, (WALL.h - 1) / 2, 0, leafPivot);
  leafPivot.rotation.y = 70 * deg;
  wallG.add(leafPivot);
  void leaf;
  const fanMat = new T.MeshBasicMaterial({ color: 0x0969da, transparent: true, opacity: 0.0, depthWrite: false, side: T.DoubleSide, toneMapped: false, vertexColors: true });
  const fan = new T.Mesh(new T.BufferGeometry(), fanMat);
  world.add(fan);
  function layoutFan(alpha) {
    // sector around the lens direction, only on the room side of the wall
    const pir = mods.pir;
    const lensP = V(0, 0, 1.2).applyMatrix4(pir.g.matrix);
    const dir = V(0, 0, 1).transformDirection(pir.g.matrix);
    const a0 = Math.atan2(dir.x, dir.z);
    const pos = [], col = [];
    const R = 62, half = 55 * deg, steps = 48;
    const y = 0.15;
    for (let i = 0; i < steps; i++) {
      const t0 = a0 - half + (2 * half) * i / steps, t1 = a0 - half + (2 * half) * (i + 1) / steps;
      const p0 = V(lensP.x + Math.sin(t0) * R, y, lensP.z + Math.cos(t0) * R);
      const p1 = V(lensP.x + Math.sin(t1) * R, y, lensP.z + Math.cos(t1) * R);
      // stop the rays at the wall plane (room side is z < -WALL_T)
      [p0, p1].forEach((p) => {
        if (p.z > -WALL_T - 0.2) {
          const k = (-WALL_T - 0.2 - lensP.z) / (p.z - lensP.z);
          p.set(lensP.x + (p.x - lensP.x) * Math.max(0, k), y, -WALL_T - 0.2);
        }
      });
      pos.push(lensP.x, y, lensP.z, p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
      col.push(1, 1, 1, 0.25, 0.25, 0.25, 0.25, 0.25, 0.25);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    fan.geometry.dispose();
    fan.geometry = g;
    fanMat.opacity = alpha;
  }

  // floor: soft pool of light that fades into black
  const floorTex = canvasTex(512, 512, (c, w, h) => {
    const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    for (let i = 0; i <= 10; i++) gr.addColorStop(i / 10, 'rgba(255,255,255,' + Math.pow(1 - i / 10, 2.2).toFixed(3) + ')');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
  }, { linear: true });
  const floorMat = phys(0x07080a, { roughness: 1, metalness: 0, specularIntensity: 0, envMapIntensity: 0, alphaMap: floorTex, transparent: true, depthWrite: false });
  const floor = new T.Mesh(new T.PlaneGeometry(1, 1), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.renderOrder = -1;
  world.add(floor);

  // signal pulses along a wire group
  const pulseGeo = new T.SphereGeometry(0.16, 12, 8);
  const pulses = [];
  for (let i = 0; i < 40; i++) {
    const m = new T.Mesh(pulseGeo, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    m.visible = false;
    world.add(m);
    pulses.push(m);
  }

  // ===========================================================================
  // scenes: every slide names one; values are smoothed towards the goal
  // ===========================================================================
  const DEF = {
    cam: { t: [0, 9.5, 0], az: 22, el: 9, dist: 78, fov: 26, cx: 0.7, cy: 0.5 },
    spin: 0, yaw: -18,
    cuP: [0, 0, 0], cuR: 0, scale: 1, cable: 1,
    suP: [17, 0, -3], suR: -62, su: 1,
    caseCu: 1, caseSu: 1, lid: 0, lidOut: 0,
    flat: 0, vis: 1, mods: null,
    wires: 1, wiresOnly: null, hi: null,
    wall: 0, fan: 0, wedge: 60, floor: 36,
    oled: 'heart', secs: undefined, stars: 4,
    buzz: 0, alarm: 0, card: 0, key: null, scan: 0, pirD11: 0, pulse: null,
    labels: null
  };
  const MOD_IDS = Object.keys(mods);
  const cur = {
    camT: V(0, 9.5, 0), az: 22, el: 9, dist: 78, fov: 26, cx: 0.7, cy: 0.5, yaw: -18, spinAngle: 0,
    cuP: V(0, 0, 0), cuR: 0, suP: V(17, 0, -3), suR: -62, su: 1, scale: 1, cable: 1,
    caseCu: 1, caseSu: 1, lid: 0, lidOut: 0, wall: 0, fan: 0, wedge: 60, floor: 36, alarm: 0, card: 0, pirD11: 0,
    mk: {}, mv: {}, wp: {}
  };
  MOD_IDS.forEach((id) => { cur.mk[id] = 0; cur.mv[id] = 1; });
  let goal = null, sceneName = '', instant = false, labelsWanted = [];
  const L = (a) => V(a[0], a[1], a[2]);
  function resolveScene(s) {
    const g = Object.assign({}, DEF, s);
    g.cam = Object.assign({}, DEF.cam, s.cam || {});
    return g;
  }
  let sceneT0 = 0;
  function go(name, def, jump) {
    const s = resolveScene(def || {});
    goal = s;
    sceneName = name;
    sceneT0 = performance.now();
    instant = !!jump;
    labelsWanted = s.labels || [];
    if (jump) step(1 / 60, true);
  }

  // ---- labels (HTML), anchored to parts ----
  const labelLayer = document.getElementById('labels3d');
  const labelEls = {};
  const ANCHOR = {
    uno: () => V(0, 0.9, 0).applyMatrix4(mods.uno.g.matrixWorld),
    kp: () => V(0, 0.2, -3.4).applyMatrix4(mods.kp.g.matrixWorld),
    oled: () => V(0, 0.3, -1.4).applyMatrix4(mods.oled.g.matrixWorld),
    rc: () => V(0, 0.2, -2.6).applyMatrix4(mods.rc.g.matrixWorld),
    buz: () => V(0, 1.0, -0.15).applyMatrix4(mods.buz.g.matrixWorld),
    pir: () => V(0, 1.1, 0.4).applyMatrix4(mods.pir.g.matrixWorld),
    mb: () => V(0, 0.9, -1.5).applyMatrix4(mods.mb.g.matrixWorld),
    bat: () => V(0, 1.8, 0).applyMatrix4(mods.bat.g.matrixWorld),
    cu: () => V(mm(G.cu_cx), mm(G.cu_h) + 1, mm(G.cu_th)).applyMatrix4(cu.matrixWorld),
    su: () => V(mm(G.su_w / 2), mm(G.su_h) + 1, 1).applyMatrix4(sBack.matrixWorld),
    d11: () => V(...[pinX.D11[0], UNO_TOP + 1.2, pinX.D11[1]]).applyMatrix4(mods.uno.g.matrixWorld),
    a2: () => V(...[pinX.A2[0], UNO_TOP + 1.2, pinX.A2[1]]).applyMatrix4(mods.uno.g.matrixWorld),
    d10: () => V(...[pinX.D10[0], UNO_TOP + 1.2, pinX.D10[1]]).applyMatrix4(mods.uno.g.matrixWorld),
    v33: () => V(...[pinX['3V3'][0], UNO_TOP + 1.2, pinX['3V3'][1]]).applyMatrix4(mods.uno.g.matrixWorld),
    vin: () => V(...[pinX.VIN[0], UNO_TOP + 1.2, pinX.VIN[1]]).applyMatrix4(mods.uno.g.matrixWorld),
    door: () => V((WALL.door0 + WALL.door1) / 2, 2, -WALL_T - 22).applyMatrix4(world.matrixWorld),
    wedge: () => V(mm(G.su_w), mm(G.su_h) * 0.5, 0).applyMatrix4(su.matrixWorld)
  };
  function updateLabels() {
    const sx = canvas.clientWidth, sy = canvas.clientHeight;
    const keep = new Set();
    labelsWanted.forEach((l) => {
      const id = l.at + '|' + l.text;
      keep.add(id);
      let el = labelEls[id];
      if (!el) {
        el = document.createElement('div');
        el.className = 'lbl' + (l.side === 'l' ? ' left' : '') + (l.cls ? ' ' + l.cls : '');
        el.innerHTML = '<i></i><span></span>';
        el.querySelector('span').textContent = l.text;
        labelLayer.appendChild(el);
        labelEls[id] = el;
        requestAnimationFrame(() => el.classList.add('on'));
      }
      const p = ANCHOR[l.at] && ANCHOR[l.at]();
      if (!p) return;
      p.project(camera);
      const x = (p.x * 0.5 + 0.5) * sx, y = (-p.y * 0.5 + 0.5) * sy;
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      el.style.visibility = p.z < 1 ? 'visible' : 'hidden';
    });
    Object.keys(labelEls).forEach((id) => {
      if (!keep.has(id)) {
        const el = labelEls[id];
        delete labelEls[id];
        el.classList.remove('on');
        setTimeout(() => el.remove(), 300);
      }
    });
  }

  // ===========================================================================
  // per frame
  // ===========================================================================
  const tmpM = new T.Matrix4(), mA = new T.Matrix4(), pA = V(0, 0, 0), qA = new T.Quaternion(), sA = V(1, 1, 1);
  const pB = V(0, 0, 0), qB = new T.Quaternion(), sB = V(1, 1, 1);
  let last = performance.now(), dirty = true, oledMode = '', layoutFrames = 0;
  function approach(a, b, r) { return a + (b - a) * r; }
  let flashUntil = 0, flashProps = null, jumpTick = false;
  function step(dt, jump) {
    if (!goal) return;
    const s = flashProps && performance.now() < flashUntil ? Object.assign({}, goal, flashProps) : goal;
    const r = jump || instant || reduced ? 1 : 1 - Math.exp(-dt * 3.0);
    const rf = jump || instant || reduced ? 1 : 1 - Math.exp(-dt * 4.2);
    const c = cur;
    let moved = 0;
    const A = (key, val, rate) => { const old = c[key]; c[key] = approach(c[key], val, rate || r); moved += Math.abs(c[key] - old); };
    c.camT.lerp(L(s.cam.t), r);
    A('az', s.cam.az); A('el', s.cam.el); A('dist', s.cam.dist); A('fov', s.cam.fov); A('cx', s.cam.cx); A('cy', s.cam.cy);
    A('yaw', s.yaw);
    moved = 0;               // camera moves alone do not need new wires
    if (s.spin && !reduced) c.spinAngle += s.spin * deg * dt; else c.spinAngle = approach(c.spinAngle, Math.round(c.spinAngle / (2 * Math.PI)) * 2 * Math.PI, r);
    const oldP = c.cuP.clone();
    c.cuP.lerp(L(s.cuP), r); moved += oldP.distanceTo(c.cuP);
    A('cuR', s.cuR);
    const oldS = c.suP.clone();
    c.suP.lerp(L(s.suP), r); moved += oldS.distanceTo(c.suP);
    A('suR', s.suR); A('su', s.su); A('scale', s.scale); A('cable', s.cable, rf);
    A('caseCu', s.caseCu, rf); A('caseSu', s.caseSu * s.su, rf); A('lid', s.lid); A('lidOut', s.lidOut);
    A('wall', s.wall, rf); A('fan', s.fan, rf); A('wedge', s.wedge); A('floor', s.floor); A('alarm', s.alarm, rf);
    A('pirD11', s.pirD11);
    MOD_IDS.forEach((id) => {
      const mk = s.mods && s.mods[id] && s.mods[id].flat !== undefined ? s.mods[id].flat : s.flat;
      const mv = s.mods && s.mods[id] && s.mods[id].vis !== undefined ? s.mods[id].vis : s.vis;
      const o1 = c.mk[id], o2 = c.mv[id];
      c.mk[id] = approach(c.mk[id], mk, r);
      c.mv[id] = approach(c.mv[id], mv, rf);
      moved += Math.abs(c.mk[id] - o1) + Math.abs(c.mv[id] - o2);
    });
    // place the units; turntable rotates around the stage centre
    world.rotation.y = (c.yaw * deg) + c.spinAngle;
    cuPlace.position.copy(c.cuP);
    cuPlace.rotation.y = c.cuR * deg;
    cuPlace.scale.setScalar(c.scale);
    su.position.copy(c.suP);
    su.rotation.y = c.suR * deg;
    su.scale.setScalar(c.scale);
    su.visible = c.su > 0.01;
    // wedge 30 -> 60 degrees
    sBox.rotation.y = c.wedge * deg;
    sBox.position.z = mm(G.wedge_min + G.su_w * Math.sin(c.wedge * deg));
    suWedge.scale.z = (G.wedge_min + G.su_w * Math.sin(c.wedge * deg)) / G.wedge_max;
    hinge.rotation.y = -152 * deg * ease(clamp01(c.lid));
    lid.position.z = 7 * c.lidOut;
    hCu.forEach((h) => setHousingOpacity(h, clamp01(c.caseCu)));
    screws.forEach((sc) => { sc.visible = c.caseCu > 0.6; });
    hSu.forEach((h) => setHousingOpacity(h, clamp01(c.caseSu)));
    world.updateMatrixWorld(true);
    worldInv.copy(world.matrixWorld).invert();
    // modules: blend case <-> flat, pop in/out
    const wInv = worldInv;
    MOD_IDS.forEach((id) => {
      const m = mods[id];
      m.k = clamp01(c.mk[id]);
      m.vis = clamp01(c.mv[id]);
      const caseW = mA.multiplyMatrices(m.caseParent.matrixWorld, m.caseM).premultiply(wInv);
      caseW.decompose(pA, qA, sA);
      const flatW = new T.Matrix4().compose(m.flatPos, m.flatQuat, V(1, 1, 1)).premultiply(cu.matrix).premultiply(cuPlace.matrix);
      flatW.decompose(pB, qB, sB);
      const k = ease(m.k);
      pA.lerp(pB, k);
      qA.slerp(qB, k);
      const base = sA.x + (sB.x - sA.x) * k;
      // pop: parts fly in from above while they appear
      const v = ease(m.vis);
      pA.y += (1 - v) * 6;
      const sc = (0.001 + 0.999 * v) * base;
      m.g.matrix.compose(pA, qA, V(sc, sc, sc));
      m.g.visible = v > 0.01;
    });
    keypadRibbon.visible = mods.kp.k < 0.5 && mods.kp.vis > 0.5;
    mods.kp.tail.visible = mods.kp.k >= 0.5;
    // wires
    pirOnD11 = c.pirD11;
    const wireGoal = (w) => {
      if (s.wiresOnly) return s.wiresOnly.includes(w.group) ? 1 : 0;
      if (typeof s.wires === 'object') return s.wires[w.group] !== undefined ? s.wires[w.group] : 0;
      return s.wires;
    };
    const bothVis = (w) => {
      const ends = [w.a, w.b].map((e) => e.m ? mods[e.m].vis : 1);
      return Math.min(ends[0], ends[1]);
    };
    if (moved > 1e-4 || dirty || layoutFrames-- > 0) {
      wires.forEach(layoutWire);
      layoutCable();
      layoutFan(c.fan * 0.32);
      dirty = false;
    }
    wires.forEach((w) => {
      const gw = wireGoal(w);
      w.prog = approach(w.prog, gw, jump || instant || reduced ? 1 : 1 - Math.exp(-dt * 2.4));
      w.shown = bothVis(w) > 0.95 ? 1 : 0;
      const hiGoal = s.hi && s.hi.includes(w.group) ? 1 : 0;
      w.hi = approach(w.hi, hiGoal, rf);
      applyWireProgress(w);
    });
    // PIR wires only make sense in the flat layout or with the case and cable
    const pirFlat = mods.pir.k;
    jacket.visible = pirFlat < 0.5 && c.su > 0.5 && c.cable > 0.5;
    fan.visible = c.fan > 0.01;
    wallG.visible = c.wall > 0.01;
    wallG.scale.y = Math.max(0.001, ease(clamp01(c.wall)));
    floor.scale.set(c.floor * 2, c.floor * 2, 1);
    alarmLight.intensity = c.alarm * (0.6 + 0.4 * Math.sin(performance.now() / 90)) * 60;
    alarmLight.position.copy(V(mm(G.cu_cx), mm(G.oled_cy), mm(G.cu_th) + 6).applyMatrix4(cu.matrixWorld));
    jumpTick = !!(jump || instant);
    sceneTick(s, dt);
    if (jump) { instant = false; }
  }

  // camera with lens shift: the model can sit left or right of the text
  function placeCamera() {
    const c = cur;
    const az = c.az * deg, el = c.el * deg;
    const dir = V(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    camera.position.copy(c.camT).addScaledVector(dir, c.dist);
    camera.fov = c.fov;
    camera.up.set(0, 1, 0);
    camera.lookAt(c.camT);
    fillLight.position.copy(camera.position).add(V(-10, 20, 0));
    fillLight.target.position.copy(c.camT);
    fillLight.target.updateMatrixWorld();
    // filmOffset moves the frustum sideways: object ends up at screen x = cx
    const tanH = Math.tan(c.fov * deg / 2);
    camera.filmOffset = -(c.cx - 0.5) * 2 * tanH * camera.aspect * camera.getFilmWidth();
    camera.updateProjectionMatrix();
    // vertical shift via the projection matrix
    camera.projectionMatrix.elements[9] += (c.cy - 0.5) * 2;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  // ---- animated details: OLED, buzzer, card, keys, pulses ----
  const keyBase = {};
  Object.keys(keyMeshes).forEach((k) => { keyBase[k] = keyMeshes[k].position.y; });
  let litFrac = 0;
  function sceneTick(s, dt) {
    const t = performance.now() - sceneT0;
    const now = performance.now();
    // OLED
    let mode = s.oled;
    if (typeof mode === 'function') mode = mode(t);
    OLED.draw(mode, mode === 'alarm' && s.secsFn ? t : (mode === 'exit' ? t : now), { secs: s.secsFn ? s.secsFn(t) : s.secs, n: s.stars });
    if (OLED.paint()) {
      oledTex.needsUpdate = true;
      const ctx = OLED.canvas.getContext('2d');
      litFrac = mode === 'off' ? 0 : mode === 'alarm' ? 0.6 : 0.25;
      void ctx;
    }
    const flash = mode === 'alarm' && Math.floor(now / 250) % 2 === 0;
    oledGlows.forEach((gl) => { gl.material.opacity = (flash ? 0.55 : litFrac * 0.6) * mods.oled.vis; });
    // buzzer rings
    const buzzing = typeof s.buzz === 'function' ? s.buzz(t) : s.buzz;
    buzzRings.forEach((rings) => rings.forEach((m, i) => {
      const k = ((now / 650) + i / 3) % 1;
      m.scale.setScalar(1 + k * 2.6);
      m.material.opacity = buzzing ? (1 - k) * 0.7 : Math.max(0, m.material.opacity - dt * 2);
      m.material.color.set(mode === 'alarm' ? 0xff6b6b : 0x7fd7ff);
    }));
    // PIR lens glows red while it "sees" motion
    mods.pir.lens.emissiveIntensity = s.alarm ? 0.25 + 0.25 * Math.sin(now / 120) : 0;
    // Uno L LED flickers with SPI traffic
    unoLeds.forEach((l) => {
      l.L.material.emissiveIntensity = (s.pulse && s.pulse.includes('spi')) ? (Math.sin(now / 40) > 0 ? 2.2 : 0.2) : 0.15;
      l.tx.material.emissiveIntensity = Math.sin(now / 70) > 0.6 ? 1.5 : 0;
    });
    // key presses: e.g. key: '1234#' types one key every 450 ms
    Object.keys(keyMeshes).forEach((k) => {
      const km = keyMeshes[k];
      km.material.emissiveIntensity = Math.max(0, km.material.emissiveIntensity - dt * 4);
      km.position.y = keyBase[k];
    });
    if (s.key) {
      // 'A0000#' loops, { seq, at, every } types once per cycle at a fixed time
      const ko = typeof s.key === 'object' ? s.key : { seq: s.key, at: 0, every: s.key.length * 520 + 1600 };
      const seq = ko.seq, per = 520;
      const u = (t % ko.every) - ko.at;
      const i = u >= 0 ? Math.floor(u / per) : -1;
      if (i >= 0 && i < seq.length) {
        const km = keyMeshes[seq[i]];
        if (km && (u % per) < 260) { km.material.emissiveIntensity = 0.9; km.position.y = keyBase[seq[i]] - 0.035; }
      }
    }
    // keypad scan: columns light one after another
    if (s.scan) {
      const col = Math.floor(now / 380) % 4;
      KEYS.forEach((row) => row.forEach((k, ci) => { if (ci === col) keyMeshes[k].material.emissiveIntensity = Math.max(keyMeshes[k].material.emissiveIntensity, 0.35); }));
      if (col === 1) { keyMeshes['5'].material.emissiveIntensity = 1.2; }
    }
    // card flies to the RFID field and back
    const cardK = typeof s.card === 'function' ? s.card(t) : s.card;
    cur.card = approach(cur.card, cardK, reduced || jumpTick ? 1 : 1 - Math.exp(-dt * 5));
    card.visible = cur.card > 0.01 && mods.rc.vis > 0.5;
    if (card.visible) {
      const field = mods.rc.k > 0.5
        ? V(0.6, 2.2, -0.4).applyMatrix4(mods.rc.g.matrix)
        : V(mm(G.cu_cx) + 2.2, mm(G.rfid_cy) - 0.6, mm(G.lid_t) + 1.4).applyMatrix4(lid.matrixWorld).applyMatrix4(worldInv);
      const away = field.clone().add(V(16, -4, 3));
      card.position.copy(away).lerp(field, ease(cur.card));
      card.quaternion.setFromEuler(new T.Euler(Math.PI / 2, -0.35 - 0.4 * (1 - cur.card), 0.12, 'XYZ'));
    }
    // signal pulses
    let pi = 0;
    if (s.pulse) {
      wires.forEach((w) => {
        if (!s.pulse.includes(w.group) || w.prog * w.shown < 0.95 || !w.curve) return;
        for (let k = 0; k < 2 && pi < pulses.length; k++) {
          const m = pulses[pi++];
          const u = ((now / 1300) + k * 0.5 + (w.color % 7) * 0.13) % 1;
          m.position.copy(w.curve.getPointAt(w.group === 'pir' ? 1 - u : u));
          m.material.color.set(w.color);
          m.material.opacity = Math.sin(u * Math.PI) * 0.95;
          m.visible = true;
        }
      });
    }
    for (; pi < pulses.length; pi++) pulses[pi].visible = false;
  }

  // ===========================================================================
  // size, loop, API
  // ===========================================================================
  let reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function resize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    dirty = true;
  }
  let running = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    placeCamera();
    renderer.render(scene, camera);
    updateLabels();
    if (running) requestAnimationFrame(frame);
  }
  layoutFrames = 3;
  requestAnimationFrame(frame);

  window.GAS3D = {
    go,
    flash(props, ms) { flashProps = props; flashUntil = performance.now() + ms; },
    resize,
    setReduced(v) { reduced = !!v; },
    get reduced() { return reduced; },
    renderer, scene, camera, mods, wires, cur,
    get scene_() { return sceneName; }
  };
})();
