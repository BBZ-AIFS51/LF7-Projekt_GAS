'use strict';
/* global THREE, A */
// Runtime of the presentation: WebGL renderer with post-processing (bloom,
// chromatic aberration, grain, vignette), slide timeline, HUD and navigation.
// The slides themselves register in slides.js with slide({...}).

const W = 1920, H = 1080;
const HEX = { ink: 0x0d0d0f, cream: 0xefe9dd, red: 0xf04a35, blue: 0x2a2cf0 };
const CSS = { ink: '#0d0d0f', cream: '#efe9dd', red: '#f04a35', blue: '#2a2cf0' };
const QS = new URLSearchParams(location.search);
const RENDER = QS.has('render');

// ---------------------------------------------------------------------------
// math + easing (every animation is a pure function of the slide time t)
// ---------------------------------------------------------------------------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, t0, d) => clamp((t - t0) / d);
const back = (x, s = 1.7) => x <= 0 ? 0 : x >= 1 ? 1 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const expo = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const inout = (x) => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
function rng(seed) {             // mulberry32, deterministic
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------------------
// post-processing: scene -> MSAA float target -> 4-level bloom -> composite
// ---------------------------------------------------------------------------
const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FS_DOWN = `
uniform sampler2D tDiffuse; uniform vec2 texel; uniform float threshold; varying vec2 vUv;
void main() {
  vec3 c = texture2D(tDiffuse, vUv + texel * vec2(-.5, -.5)).rgb + texture2D(tDiffuse, vUv + texel * vec2(.5, -.5)).rgb
         + texture2D(tDiffuse, vUv + texel * vec2(-.5, .5)).rgb + texture2D(tDiffuse, vUv + texel * vec2(.5, .5)).rgb;
  c *= .25;
  if (threshold > 0.0) { float l = max(c.r, max(c.g, c.b)); c *= smoothstep(threshold, threshold + .35, l); }
  gl_FragColor = vec4(c, 1.0);
}`;
const FS_BLUR = `
uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb * .227027;
  c += (texture2D(tDiffuse, vUv + dir * 1.3846).rgb + texture2D(tDiffuse, vUv - dir * 1.3846).rgb) * .316216;
  c += (texture2D(tDiffuse, vUv + dir * 3.2308).rgb + texture2D(tDiffuse, vUv - dir * 3.2308).rgb) * .070270;
  gl_FragColor = vec4(c, 1.0);
}`;
const FS_COMP = `
uniform sampler2D tScene, tB0, tB1, tB2, tB3;
uniform float bloom, ca, grain, vig, time, flash; uniform vec3 flashColor; uniform vec2 res;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 srgb(vec3 c) { c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - .055, step(.0031308, c)); }
void main() {
  vec2 d = vUv - .5;
  vec2 off = d * ca * (.25 + dot(d, d));
  vec3 c = vec3(texture2D(tScene, vUv - off).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv + off).b);
  c += (texture2D(tB0, vUv).rgb * .5 + texture2D(tB1, vUv).rgb * .8 + texture2D(tB2, vUv).rgb + texture2D(tB3, vUv).rgb * 1.3) * bloom;
  c = mix(c, flashColor, flash);
  vec3 e = max(c - .85, 0.0);                       // soft shoulder, glow does not clip hard
  c = min(c, .85) + e / (1.0 + e * 6.6667);
  c *= 1.0 - vig * dot(d, d) * 1.4;
  c = srgb(c);
  c += (hash(vUv * res + fract(time) * 91.7) - .5) * grain;
  gl_FragColor = vec4(c, 1.0);
}`;

function makePost(r) {
  const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  quad.frustumCulled = false;
  quadScene.add(quad);
  const sm = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
  const down = sm(FS_DOWN, { tDiffuse: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: 0 } });
  const blur = sm(FS_BLUR, { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } });
  const comp = sm(FS_COMP, {
    tScene: { value: null }, tB0: { value: null }, tB1: { value: null }, tB2: { value: null }, tB3: { value: null },
    bloom: { value: 1 }, ca: { value: 0 }, grain: { value: 0 }, vig: { value: 0 }, time: { value: 0 },
    flash: { value: 0 }, flashColor: { value: new THREE.Color() }, res: { value: new THREE.Vector2() }
  });
  let rtScene = null, levels = [], w = 0, h = 0;
  function pass(m, target) { quad.material = m; r.setRenderTarget(target); r.render(quadScene, quadCam); }
  return {
    setSize(nw, nh) {
      w = nw; h = nh;
      if (rtScene) { rtScene.dispose(); levels.forEach((l) => { l.a.dispose(); l.b.dispose(); }); }
      rtScene = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
      levels = [2, 4, 8, 16].map((div) => {
        const lw = Math.max(1, Math.round(w / div)), lh = Math.max(1, Math.round(h / div));
        const o = { type: THREE.HalfFloatType };
        return { w: lw, h: lh, a: new THREE.WebGLRenderTarget(lw, lh, o), b: new THREE.WebGLRenderTarget(lw, lh, o) };
      });
      comp.uniforms.res.value.set(w, h);
    },
    render(scene, camera, o) {
      r.setRenderTarget(rtScene);
      r.render(scene, camera);
      let src = rtScene.texture, sw = w, sh = h;
      levels.forEach((L, i) => {
        down.uniforms.tDiffuse.value = src;
        down.uniforms.texel.value.set(1 / sw, 1 / sh);
        down.uniforms.threshold.value = i === 0 ? o.threshold : 0;
        pass(down, L.a);
        blur.uniforms.tDiffuse.value = L.a.texture; blur.uniforms.dir.value.set(1 / L.w, 0); pass(blur, L.b);
        blur.uniforms.tDiffuse.value = L.b.texture; blur.uniforms.dir.value.set(0, 1 / L.h); pass(blur, L.a);
        src = L.a.texture; sw = L.w; sh = L.h;
      });
      const u = comp.uniforms;
      u.tScene.value = rtScene.texture;
      [u.tB0, u.tB1, u.tB2, u.tB3].forEach((x, i) => { x.value = levels[i].a.texture; });
      u.bloom.value = o.bloom; u.ca.value = o.ca; u.grain.value = o.grain; u.vig.value = o.vig;
      u.time.value = o.time; u.flash.value = o.flash; u.flashColor.value.set(o.flashColor);
      pass(comp, null);
    }
  };
}

// ---------------------------------------------------------------------------
// slides, timeline, HUD
// ---------------------------------------------------------------------------
const SLIDES = [];
function slide(def) { SLIDES.push(def); }

const GAS = {
  renderer: null, post: null, env: null, quality: 1,
  cur: -1, built: [], sections: [], slideStart: 0, t0: 0, auto: QS.has('auto')
};

function makeEnv(r) {
  // a small studio: dark room with soft boxes, used for reflections only
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0x18181c, side: THREE.BackSide })));
  const panel = (w, h, pos, c) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(12, 5, [0, 9, 2], new THREE.Color(1, 1, 1).multiplyScalar(2.6));
  panel(5, 10, [-9, 1, 3], new THREE.Color(1, .97, .94).multiplyScalar(2));
  panel(4, 9, [9, 0, -2], new THREE.Color(1, .55, .45).multiplyScalar(1.6));
  panel(10, 2, [0, -2, -9], new THREE.Color(.5, .55, 1).multiplyScalar(1.4));
  const pm = new THREE.PMREMGenerator(r);
  const tex = pm.fromScene(s, .02).texture;
  pm.dispose();
  return tex;
}

function setQuality(q) {
  GAS.quality = q;
  const w = Math.round(W * q), h = Math.round(H * q);
  GAS.renderer.setSize(w, h, false);
  GAS.post.setSize(w, h);
}

function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  $('stage').style.transform = `scale(${s}) translate(-50%, -50%)`;
}

function hud(globalT) {
  const f = Math.floor(globalT * 60), fr = f % 60, s = Math.floor(f / 60);
  const p2 = (n) => String(n).padStart(2, '0');
  $('hudTc').textContent = `REC ● 00:${p2(Math.floor(s / 60))}:${p2(s % 60)}:${p2(fr)} · 60 FPS`;
}

function show(i) {
  i = clamp(i, 0, SLIDES.length - 1);
  GAS.sections.forEach((s) => s.classList.remove('on'));
  void $('stage').offsetWidth;                          // restart CSS animations
  const sec = GAS.sections[i];
  sec.classList.add('on');
  GAS.cur = i; GAS.slideStart = performance.now();
  $('hud').classList.toggle('dark', sec.classList.contains('dark'));
  $('hudName').textContent = `${String(i).padStart(2, '0')} — ${sec.dataset.name}`;
  const sq = SLIDES.map((_, k) => `<span class="sq${k === i ? ' f' : ''}"></span>`).join('');
  $('hudRight').innerHTML = `Uno R3 · 16 MHz · ${String(i + 1).padStart(2, '0')}/${SLIDES.length} ${sq}`;
  $('hudBar').style.width = `${(W - 172) * (i + 1) / SLIDES.length}px`;
  if (!RENDER) history.replaceState(null, '', `#${i}`);
}

function draw(t, globalT) {
  const s = GAS.built[GAS.cur];
  const o = Object.assign({
    bloom: .85, threshold: 1.25, grain: .045, vig: .45, flash: 0, flashColor: 0xffffff,
    ca: .006 + .09 * (1 - expo(prog(t, 0, .5)))           // RGB split on every cut
  }, s.update(t) || {});
  o.time = globalT;
  GAS.post.render(s.scene, s.camera, o);
  hud(globalT);
}

GAS.boot = async function boot() {
  fit();
  addEventListener('resize', fit);
  try {
    await Promise.all(['900 100px Archivo', 'italic 40px "Instrument Serif"', '400 20px "JetBrains Mono"', '700 20px "JetBrains Mono"']
      .map((f) => document.fonts.load(f)));
    const r = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: false, preserveDrawingBuffer: RENDER, powerPreference: 'high-performance' });
    r.setPixelRatio(1);
    r.localClippingEnabled = true;
    GAS.renderer = r;
    GAS.post = makePost(r);
    setQuality(QS.has('low') ? .6 : 1);
    GAS.env = makeEnv(r);
    A.init();
    GAS.sections = [...document.querySelectorAll('#ov .slide')];
    GAS.sections.forEach((s) => {
      const w = document.createElement('div');
      w.className = 'wipe'; w.style.background = s.dataset.wipe || CSS.red;
      s.appendChild(w);
    });
    for (let i = 0; i < SLIDES.length; i++) {
      $('bootMsg').textContent = `Baue Szene ${i + 1}/${SLIDES.length} …`;
      await new Promise((res) => setTimeout(res, 0));
      const b = SLIDES[i].build(GAS.sections[i]);
      b.scene.updateMatrixWorld(true);
      b.update(0);
      r.compile(b.scene, b.camera);
      GAS.built.push(b);
    }
  } catch (e) {
    $('bootMsg').textContent = '3D konnte nicht starten: ' + e.message;
    console.error(e);
    return;
  }
  $('boot').style.display = 'none';
  GAS.ready = true;
  if (RENDER) return;

  const go = (d) => show(GAS.cur + d);
  addEventListener('keydown', (e) => {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(1); }
    else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') show(0);
    else if (e.key === 'End') show(SLIDES.length - 1);
    else if (e.key === 'f' || e.key === 'F') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    else if (e.key === 'a' || e.key === 'A') GAS.auto = !GAS.auto;
    else if (e.key === 'q' || e.key === 'Q') setQuality(GAS.quality === 1 ? .6 : 1);
  });
  addEventListener('click', () => go(1));
  addEventListener('contextmenu', (e) => { e.preventDefault(); go(-1); });
  GAS.t0 = performance.now();
  show(parseInt(location.hash.slice(1), 10) || 0);
  (function loop(now) {
    const t = (now - GAS.slideStart) / 1000;
    draw(t, (now - GAS.t0) / 1000);
    if (GAS.auto && t > +GAS.sections[GAS.cur].dataset.dur && GAS.cur < SLIDES.length - 1) show(GAS.cur + 1);
    requestAnimationFrame(loop);
  })(performance.now());
};

// deterministic frame stepping for tools/render-praesentation.mjs
GAS.durations = () => GAS.sections.map((s) => +s.dataset.dur);
GAS.seek = function seek(i, t, globalT) {
  if (i !== GAS.cur) show(i);
  GAS.sections[i].getAnimations({ subtree: true }).forEach((a) => { a.pause(); a.currentTime = t * 1000; });
  draw(t, globalT);
};
window.GAS = GAS;
