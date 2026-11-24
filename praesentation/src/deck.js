// Slide control: navigation, steps, chrome, notes with stopwatch, overview,
// buzzer sounds (WebAudio, same frequencies as the firmware), code colours.
(function () {
  'use strict';
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  const frame = $('#frame');
  const slides = $$('.slide');
  const SECS = [['idee', 'Idee'], ['funktion', 'Funktion'], ['aufbau', 'Aufbau'], ['code', 'Code'], ['huerden', 'Herausforderungen'], ['fazit', 'Fazit'], ['demo', 'Demo']];

  // ---- fit the 1920x1080 frame into the window ----
  let scale = 1;
  function fit() {
    const w = window.innerWidth, h = window.innerHeight;
    scale = Math.min(w / 1920, h / 1080);
    const x = (w - 1920 * scale) / 2, y = (h - 1080 * scale) / 2;
    frame.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + scale + ')';
    if (window.GAS3D) {
      const pr = Math.min(2, Math.max(0.5, scale * (window.devicePixelRatio || 1)));
      GAS3D.renderer.setPixelRatio(pr);
      GAS3D.resize(1920, 1080);
    }
  }
  window.addEventListener('resize', fit);

  // ---- C++ colours for <pre class="code"> ----
  const KW = /\b(void|if|else|for|return|switch|case|break|const|static|while|enum|bool|true|false|unsigned|long|int|char|byte)\b/;
  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function colour(line) {
    let out = '', rest = line;
    const ci = rest.indexOf('//');
    let comment = '';
    if (ci >= 0) { comment = rest.slice(ci); rest = rest.slice(0, ci); }
    const re = /("[^"]*")|(\b\d+(?:UL|L)?\b|\b0x[0-9A-Fa-f]+\b)|\b([A-Za-z_]\w*)\b(?=\s*\()|\b(void|if|else|for|return|switch|case|break|const|static|while|enum|bool|true|false|unsigned|long|int|char|byte)\b|([A-Z][A-Z0-9_]{2,})/g;
    let last = 0, mm;
    while ((mm = re.exec(rest))) {
      out += esc(rest.slice(last, mm.index));
      const tok = esc(mm[0]);
      if (mm[1]) out += '<span class="s">' + tok + '</span>';
      else if (mm[2]) out += '<span class="n">' + tok + '</span>';
      else if (mm[3]) out += KW.test(mm[3]) ? '<span class="k">' + tok + '</span>' : '<span class="f">' + tok + '</span>';
      else if (mm[4]) out += '<span class="k">' + tok + '</span>';
      else out += '<span class="ty">' + tok + '</span>';
      last = mm.index + mm[0].length;
    }
    out += esc(rest.slice(last));
    if (comment) out += '<span class="c">' + esc(comment) + '</span>';
    return out;
  }
  $$('pre.code').forEach((pre) => {
    const hl = (pre.dataset.hl || '').split(',').map(Number).filter(Boolean);
    const lines = pre.textContent.replace(/\n$/, '').split('\n');
    pre.innerHTML = lines.map((l, i) => (hl.includes(i + 1) ? '<span class="hl">' + (colour(l) || ' ') + '</span>' : colour(l))).join('\n');
  });

  // ---- keypad matrix on the keypad slide, same clock as the 3D scan ----
  const KEYS = [['1', '2', '3', 'A'], ['4', '5', '6', 'B'], ['7', '8', '9', 'C'], ['*', '0', '#', 'D']];
  const matrix = $('#matrix');
  const mcells = [];
  if (matrix) {
    matrix.appendChild(Object.assign(document.createElement('span'), { className: 'h', textContent: '' }));
    ['C1 D5', 'C2 D4', 'C3 D3', 'C4 D2'].forEach((t) => matrix.appendChild(Object.assign(document.createElement('span'), { className: 'h colh', textContent: t })));
    KEYS.forEach((row, r) => {
      matrix.appendChild(Object.assign(document.createElement('span'), { className: 'h', textContent: 'R' + (r + 1) + ' D' + (9 - r) }));
      row.forEach((k, c) => {
        const el = Object.assign(document.createElement('span'), { className: 'k' + (/[0-9]/.test(k) ? '' : ' fn'), textContent: k });
        matrix.appendChild(el);
        mcells.push({ el, r, c, k });
      });
    });
  }
  function tickMatrix() {
    if (matrix && slides[cur] && slides[cur].contains(matrix)) {
      const col = Math.floor(performance.now() / 380) % 4;
      mcells.forEach((m) => {
        m.el.classList.toggle('on-col', m.c === col);
        m.el.classList.toggle('hit', m.c === col && m.k === '5');
      });
      $$('.colh', matrix).forEach((h, i) => h.classList.toggle('on-col', i === col));
    }
    requestAnimationFrame(tickMatrix);
  }

  // ---- sounds: square wave like the passive buzzer ----
  let ac = null;
  function audio() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function playPattern(steps) {
    const a = audio();
    const osc = a.createOscillator(), g = a.createGain();
    osc.type = 'square';
    g.gain.value = 0;
    osc.connect(g).connect(a.destination);
    let t = a.currentTime + 0.03;
    steps.forEach(([f, ms]) => {
      if (f > 0) { osc.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.06, t); } else g.gain.setValueAtTime(0, t);
      t += ms / 1000;
    });
    g.gain.setValueAtTime(0, t);
    osc.start();
    osc.stop(t + 0.05);
    return (t - a.currentTime) * 1000;
  }
  const SOUNDS = {
    ok: () => [[1568, 110], [0, 30], [2093, 200]],
    error: () => { const s = []; for (let t = 0; t < 2000; t += 35) s.push([((t / 35) % 2) ? 95 : 135, 35]); return s; },
    beep: () => [[1200, 60], [0, 940], [1200, 60], [0, 940], [1200, 60]],
    siren: () => {
      const s = [];
      for (let t = 0; t < 3000; t += 10) {
        const phase = t % 500, step = Math.floor((phase % 250) / 10);
        s.push([phase < 250 ? 2500 + step * 50 : 3700 - step * 50, 10]);
      }
      return s;
    }
  };
  const OLED_FOR = { ok: 'heart', error: 'cross', beep: 'exit', siren: 'alarm' };
  $$('[data-sound]').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const name = b.dataset.sound;
    const ms = playPattern(SOUNDS[name]());
    b.classList.add('playing');
    if (window.GAS3D) GAS3D.flash({ oled: OLED_FOR[name], buzz: 1, alarm: name === 'siren' ? 1 : 0 }, ms);
    setTimeout(() => b.classList.remove('playing'), ms);
  }));

  // ---- progress bar ----
  const prog = $('#progress');
  SECS.forEach(([id, name]) => {
    const el = document.createElement('div');
    el.className = 'sec';
    el.dataset.sec = id;
    el.textContent = name;
    prog.appendChild(el);
  });
  const num = document.createElement('div');
  num.className = 'num';
  prog.appendChild(num);

  // ---- steps ----
  slides.forEach((s) => $$('.step.shown', s).forEach((el) => { el.dataset.init = '1'; }));
  // a dd right after a dt step belongs to that step (term and text in one click)
  const partner = (el) => (el.tagName === 'DD' && el.previousElementSibling && el.previousElementSibling.tagName === 'DT' &&
    el.previousElementSibling.classList.contains('step') ? el.previousElementSibling : el);
  const steps = slides.map((s) => $$('.step', s).filter((el) => !el.classList.contains('shown') && partner(el) === el));

  // ---- state ----
  let cur = 0, step = 0, started = 0, black = false;
  const reducedKey = 'gas-reduced';
  let reduced = false;
  try { reduced = localStorage.getItem(reducedKey) === '1'; } catch (e) { /* private mode */ }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) reduced = true;
  function applyReduced() {
    document.documentElement.classList.toggle('reduced', reduced);
    if (window.GAS3D) GAS3D.setReduced(reduced);
  }

  function sceneFor(i, k) {
    const s = slides[i];
    let name = s.dataset.scene;
    const shown = $$('.step', s).filter((el) => el.dataset.init || partner(el).dataset.init || (steps[i].indexOf(partner(el)) >= 0 && steps[i].indexOf(partner(el)) < k));
    shown.forEach((el) => { if (el.dataset.scene) name = el.dataset.scene; });
    return { name, shown };
  }

  function render(jump) {
    const s = slides[cur];
    slides.forEach((x, i) => x.classList.toggle('on', i === cur));
    const { name, shown } = sceneFor(cur, step);
    $$('.step', s).forEach((el) => el.classList.toggle('shown', shown.includes(el)));
    // older list items fade back a little, the last step shows the whole list again
    const done = step >= steps[cur].length;
    $$('.step', s).forEach((el) => el.classList.toggle('past', !done && shown.includes(el) && shown[shown.length - 1] !== el));
    // state diagram
    if (s.id === 's-states') {
      let st = 'disarmed';
      shown.forEach((el) => { if (el.dataset.st) st = el.dataset.st; });
      $$('.st', s).forEach((el) => el.classList.toggle('on', el.dataset.st === st));
    }
    // top view: wedge angle 0, 30 or 60 degrees
    $$('svg.plan', s).forEach((svg) => {
      let a = Number(svg.dataset.angle) || 0;
      shown.forEach((el) => { if (el.dataset.angle) a = Number(el.dataset.angle); });
      $$('.pl-rot', svg).forEach((g) => { g.style.transform = 'rotate(' + (-a) + 'deg)'; g.style.transformOrigin = '285px 141px'; });
      const r = a * Math.PI / 180;
      $('.pl-wedge', svg).setAttribute('points', '285,141 225,141 ' + (285 - 60 * Math.cos(r)).toFixed(1) + ',' + (141 + 60 * Math.sin(r)).toFixed(1));
      $('.pl-ang', svg).textContent = a ? a + '°' : 'flach';
    });
    // SRAM bar
    const bar = $('#rambar', s);
    if (bar) {
      let ram = 205;
      shown.forEach((el) => { if (el.dataset.ram) ram = Number(el.dataset.ram); });
      const free = bar.querySelector('.free'), used = bar.querySelector('.used');
      free.style.flexGrow = ram;
      used.style.flexGrow = 2048 - 1024 - ram;
      free.textContent = ram;
      free.classList.toggle('bad', ram < 250);
    }
    // chrome
    $('#kap b').textContent = s.dataset.kap || '';
    $('#kap span').textContent = s.dataset.kapname || '';
    $('#who span').textContent = s.dataset.who || '';
    $('#shade').className = s.dataset.shade || 'left';
    const secIdx = SECS.findIndex(([id]) => id === s.dataset.sec);
    $$('.sec', prog).forEach((el, i) => {
      const inSec = slides.filter((x) => x.dataset.sec === el.dataset.sec);
      const pos = inSec.indexOf(s);
      el.classList.toggle('on', i === secIdx);
      el.style.setProperty('--p', i < secIdx ? '100%' : i > secIdx ? '0%' : ((pos + 1) / inSec.length * 100) + '%');
    });
    num.textContent = (cur + 1) + ' / ' + slides.length;
    // 3D
    if (window.GAS3D) GAS3D.go(name, (window.GAS_SCENES || {})[name] || {}, jump || reduced);
    // url
    try { history.replaceState(null, '', '#' + (cur + 1) + (step ? '.' + step : '')); } catch (e) { /* file:// in some browsers */ }
    renderNotes();
    renderOverview();
    renderPresenter();
  }

  function next() {
    if (!started) started = performance.now();
    if (step < steps[cur].length) { step++; render(); return; }
    if (cur < slides.length - 1) { cur++; step = 0; render(); }
  }
  function prev() {
    if (step > 0) { step--; render(); return; }
    if (cur > 0) { cur--; step = steps[cur].length; render(); }
  }
  function goto(i, k, jump) {
    cur = Math.max(0, Math.min(slides.length - 1, i));
    step = Math.max(0, Math.min(steps[cur].length, k || 0));
    render(jump);
  }

  // ---- notes + stopwatch ----
  const notes = $('#notes');
  const cum = [];
  slides.reduce((a, s, i) => { cum[i] = a + Number(s.dataset.min || 1); return cum[i]; }, 0);
  function renderNotes() {
    const s = slides[cur];
    const a = $('aside.notes', s);
    $('.txt', notes).innerHTML = a ? a.innerHTML : '';
    const n = slides[cur + 1];
    $('.next', notes).innerHTML = n ? 'Danach: <b>' + n.dataset.title + '</b> (' + (n.dataset.who || '') + ')' : 'Letzte Folie';
    $('.goal', notes).textContent = 'Ziel bis hier: ' + fmt(cum[cur] * 60000) + ' (gesamt etwa ' + Math.round(cum[cum.length - 1]) + ' min)';
  }
  function fmt(ms) {
    const sec = Math.floor(ms / 1000);
    return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
  }
  setInterval(() => {
    $('.clock', notes).textContent = fmt(started ? performance.now() - started : 0);
    tickPresenter();
  }, 250);

  // ---- presenter view: second window with current and next slide, notes, stopwatch ----
  // Only in the version with speaker notes (Praesentation_GAS_Vortrag.html).
  const HAS_NOTES = $$('aside.notes').length > 0;
  if (!HAS_NOTES) $$('[data-vortrag]').forEach((el) => el.remove());
  let pw = null, pdoc = null, mirror = null, mirrorN = 0;
  const PRES_CSS = `
body.pres { margin: 0; height: 100vh; display: grid; grid-template-rows: auto minmax(0, 1fr); background: #0d1117; color: #e6edf3; overflow: hidden;
  font: 16px/1.4 "GAS Sans", Calibri, Carlito, "Segoe UI", Arial, sans-serif; }
.pres header { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 22px; padding: 8px 14px; background: #161b22; border-bottom: 1px solid #30363d; }
.pres .pos b { font-size: 24px; }
.pres .pos span { margin-left: 10px; font-size: 19px; color: #c9d1d9; }
.pres .who { font-size: 22px; font-weight: 700; color: #58a6ff; }
.pres .clk { display: flex; flex-direction: column; line-height: 1.05; }
.pres .clk span { font-size: 32px; font-variant-numeric: tabular-nums; }
.pres .clk small { font-size: 13px; color: #9da7b3; }
.pres .clk.late span { color: #f0883e; }
.pres .btns { margin-left: auto; display: flex; flex-wrap: wrap; gap: 6px; }
.pres button, .pres select { font: inherit; font-size: 15px; padding: 6px 12px; border-radius: 6px; border: 1px solid #30363d; background: #21262d; color: #e6edf3; cursor: pointer; }
.pres button.on { background: #8b1d1d; border-color: #da3633; }
.pres main { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 14px; padding: 12px 14px; min-height: 0; }
.pres .left { display: flex; flex-direction: column; gap: 6px; min-height: 0; overflow: auto; }
.pres .lab { font-size: 15px; color: #9da7b3; }
.pres .lab b { color: #e6edf3; }
.pres .lab .clicks { color: #e3b341; font-weight: 700; }
.pres .pv { position: relative; flex: none; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background: #000; border: 2px solid #2f81f7; border-radius: 4px; cursor: pointer; }
.pres .pv.next { width: 62%; border-color: #30363d; }
.pres .pv canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.pres .pv .fr { position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; transform-origin: 0 0; pointer-events: none; }
.pres .pv .fr .slide { opacity: 1; visibility: visible; }
.pres .pv .fr .slide, .pres .pv .fr .step, .pres .pv .fr .in, .pres .pv .fr #shade { transition: none !important; }
.pres .pv .fr .slide .in { transform: none; }
.pres #p-notes { overflow: auto; padding: 12px 20px; background: #0b0f15; border: 1px solid #30363d; border-radius: 6px; font-size: var(--nf, 21px); line-height: 1.5; color: #e6edf3; }
.pres #p-notes p { margin: 0 0 .7em; font-size: 1em; line-height: 1.5; color: #e6edf3; }
.pres #p-notes h4 { margin: 1em 0 .3em; font-size: .78em; letter-spacing: .02em; color: #58a6ff; }
.pres #p-notes h4:first-child { margin-top: 0; }
.pres #p-notes ul, .pres #p-notes ol { margin: 0 0 .7em; padding-left: 1.3em; }
.pres #p-notes li { margin: .25em 0; }
.pres #p-notes i { color: #e3b341; font-style: normal; font-weight: 700; }
.pres #p-notes code { font-size: .85em; }
`;
  function openPresenter() {
    if (!HAS_NOTES) return;
    pw = window.open('', 'gas-referent', 'width=1400,height=880');
    if (!pw) { alert('Das Fenster wurde blockiert. Bitte Popups für diese Datei erlauben und P noch einmal drücken.'); return; }
    const styles = $$('style, link[rel="stylesheet"]').map((n) => (n.tagName === 'LINK' ? '<link rel="stylesheet" href="' + n.href + '">' : '<style>' + n.textContent + '</style>')).join('\n');
    pdoc = pw.document;
    pdoc.open();
    pdoc.write('<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Referentenansicht Projekt GAS</title><base href="' + location.href.replace(/"/g, '&quot;') + '">' +
      styles + '<style>' + PRES_CSS + '</style></head><body class="pres">' +
      '<header><div class="pos"><b id="p-num"></b><span id="p-title"></span></div><div class="who" id="p-who"></div>' +
      '<div class="clk" id="p-clk"><span id="p-elapsed">00:00</span><small id="p-goal"></small></div>' +
      '<div class="clk"><span id="p-time"></span><small>Uhrzeit</small></div>' +
      '<div class="btns"><button data-a="prev">Zurück</button><button data-a="next">Weiter</button><select id="p-jump" title="Zu Folie springen"></select>' +
      '<button data-a="timer">Stoppuhr auf 0</button><button data-a="black" id="p-black">Bild schwarz</button><button data-a="smaller">Notizen kleiner</button><button data-a="bigger">Notizen größer</button></div></header>' +
      '<main><section class="left"><div class="lab" id="p-now"></div><div class="pv" id="pv-cur"><canvas></canvas><div class="fr"></div></div>' +
      '<div class="lab" id="p-nextlab"></div><div class="pv next" id="pv-next"><div class="fr"></div></div></section>' +
      '<section id="p-notes"></section></main></body></html>');
    pdoc.close();
    const sel = pdoc.getElementById('p-jump');
    slides.forEach((s, i) => {
      const o = pdoc.createElement('option');
      o.value = i;
      o.textContent = (i + 1) + ' ' + s.dataset.title + ' (' + (s.dataset.who || '') + ')';
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => goto(Number(sel.value), 0));
    let nf = 21;
    try { nf = Number(localStorage.getItem('gas-nf')) || 21; } catch (e) { /* ignore */ }
    pdoc.body.style.setProperty('--nf', nf + 'px');
    pdoc.querySelector('header').addEventListener('click', (e) => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a === 'prev') prev();
      else if (a === 'next') next();
      else if (a === 'timer') started = performance.now();
      else if (a === 'black') toggleBlack();
      else if (a === 'smaller' || a === 'bigger') {
        nf = Math.max(14, Math.min(34, nf + (a === 'bigger' ? 2 : -2)));
        pdoc.body.style.setProperty('--nf', nf + 'px');
        try { localStorage.setItem('gas-nf', nf); } catch (err) { /* ignore */ }
      }
    });
    pdoc.getElementById('pv-cur').addEventListener('click', next);
    pdoc.getElementById('pv-next').addEventListener('click', next);
    pdoc.addEventListener('keydown', (e) => onKey(e, true));
    pw.addEventListener('resize', layoutPresenter);
    mirror = pdoc.querySelector('#pv-cur canvas');
    layoutPresenter();
    renderPresenter();
  }
  function presenterOpen() { return pw && !pw.closed && pdoc; }
  function layoutPresenter() {
    if (!presenterOpen()) return;
    ['pv-cur', 'pv-next'].forEach((id) => {
      const pv = pdoc.getElementById(id);
      pv.querySelector('.fr').style.transform = 'scale(' + (pv.clientWidth / 1920) + ')';
    });
    mirror.width = Math.round(mirror.clientWidth);
    mirror.height = Math.round(mirror.clientHeight);
  }
  // copy of a slide in the state it has at step k
  function cloneSlide(i, k) {
    const src = slides[i];
    const c = pdoc.importNode(src, true);
    c.classList.add('on');
    const { shown } = sceneFor(i, k);
    const a = $$('.step', src), b = $$('.step', c);
    a.forEach((el, j) => { b[j].classList.toggle('shown', shown.includes(el)); b[j].classList.remove('past'); });
    c.querySelectorAll('aside.notes').forEach((n) => n.remove());
    return c;
  }
  function fillPreview(id, i, k, shade) {
    const fr = pdoc.querySelector('#' + id + ' .fr');
    fr.innerHTML = '';
    const sh = pdoc.createElement('div');
    sh.id = 'shade';
    sh.className = shade;
    sh.style.position = 'absolute';
    fr.appendChild(sh);
    fr.appendChild(cloneSlide(i, k));
  }
  function renderPresenter() {
    if (!presenterOpen()) return;
    const s = slides[cur], total = steps[cur].length;
    pdoc.getElementById('p-num').textContent = (cur + 1) + ' / ' + slides.length;
    pdoc.getElementById('p-title').textContent = (s.dataset.kap ? 'Kap. ' + s.dataset.kap + ', ' : '') + s.dataset.title;
    pdoc.getElementById('p-who').textContent = s.dataset.who || '';
    pdoc.getElementById('p-jump').value = cur;
    pdoc.getElementById('p-now').innerHTML = '<b>Jetzt</b>' + (total ? ' <span class="clicks">Klick ' + step + ' von ' + total + '</span>' : '');
    fillPreview('pv-cur', cur, step, s.dataset.shade || 'left');
    let ni = cur, nk = step + 1;
    if (step >= total) { ni = cur + 1; nk = 0; }
    const nl = pdoc.getElementById('p-nextlab'), nv = pdoc.getElementById('pv-next');
    if (ni < slides.length) {
      const n = slides[ni];
      nl.innerHTML = ni === cur ? '<b>Nächster Klick</b> auf dieser Folie' : '<b>Nächste Folie:</b> ' + (ni + 1) + ' ' + n.dataset.title + ' (' + (n.dataset.who || '') + ')';
      fillPreview('pv-next', ni, nk, n.dataset.shade || 'left');
      nv.style.display = '';
    } else {
      nl.innerHTML = '<b>Ende</b> der Präsentation';
      nv.style.display = 'none';
    }
    const a = $('aside.notes', s);
    const box = pdoc.getElementById('p-notes');
    box.innerHTML = a ? a.innerHTML : '';
    box.scrollTop = 0;
    pdoc.getElementById('p-black').classList.toggle('on', black);
    tickPresenter();
  }
  function tickPresenter() {
    if (!presenterOpen()) return;
    const el = started ? performance.now() - started : 0;
    pdoc.getElementById('p-elapsed').textContent = fmt(el);
    pdoc.getElementById('p-goal').textContent = 'Ziel bis Ende dieser Folie ' + fmt(cum[cur] * 60000);
    pdoc.getElementById('p-clk').classList.toggle('late', el > cum[cur] * 60000 + 30000);
    const d = new Date();
    pdoc.getElementById('p-time').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  // live picture of the 3D model in the current preview (every third frame)
  if (window.GAS3D) {
    GAS3D.onFrame = (glCanvas) => {
      if (!presenterOpen() || !mirror || (mirrorN++ % 3)) return;
      try { mirror.getContext('2d').drawImage(glCanvas, 0, 0, mirror.width, mirror.height); } catch (e) { /* ignore */ }
    };
  }
  function toggleBlack() {
    black = !black;
    frame.style.opacity = black ? 0 : 1;
    if (presenterOpen()) pdoc.getElementById('p-black').classList.toggle('on', black);
  }

  // ---- overview ----
  const ov = $('#overview');
  function renderOverview() {
    if (!ov.classList.contains('on')) return;
    ov.innerHTML = '';
    SECS.forEach(([id, name]) => {
      const h = document.createElement('h2');
      h.textContent = name;
      ov.appendChild(h);
      const g = document.createElement('div');
      g.className = 'g';
      slides.forEach((s, i) => {
        if (s.dataset.sec !== id) return;
        const b = document.createElement('button');
        b.innerHTML = '<i>' + (i + 1) + '</i>' + s.dataset.title + ' <i>' + (s.dataset.who || '') + '</i>';
        if (i === cur) b.className = 'cur';
        b.addEventListener('click', (e) => { e.stopPropagation(); ov.classList.remove('on'); goto(i, 0); });
        g.appendChild(b);
      });
      ov.appendChild(g);
    });
  }

  // ---- input ----
  // keys from the slide window and from the presenter window; the presenter
  // window only steers, it never opens notes or menus on the projector
  function onKey(e, fromPresenter) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (fromPresenter && e.target && e.target.tagName === 'SELECT') return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') goto(0, 0);
    else if (k === 'End') goto(slides.length - 1, 0);
    else if (k === 't' || k === 'T') started = performance.now();
    else if (k === 'b' || k === 'B' || k === '.') toggleBlack();
    else if (fromPresenter) return;
    else if (k === 'p' || k === 'P') openPresenter();
    else if (k === 'f' || k === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      else document.exitFullscreen && document.exitFullscreen();
    } else if ((k === 'n' || k === 'N') && HAS_NOTES) notes.classList.toggle('on');
    else if (k === 'o' || k === 'O' || k === 'Escape') { ov.classList.toggle('on', k === 'Escape' ? false : !ov.classList.contains('on')); renderOverview(); }
    else if (k === 'h' || k === 'H' || k === '?') $('#help').classList.toggle('on');
    else if (k === 'm' || k === 'M') {
      reduced = !reduced;
      try { localStorage.setItem(reducedKey, reduced ? '1' : '0'); } catch (err) { /* ignore */ }
      applyReduced();
      render(true);
    }
  }
  document.addEventListener('keydown', (e) => onKey(e, false));
  frame.addEventListener('click', (e) => {
    if (e.target.closest('button, a, #overview, #notes')) return;
    if (e.clientX < window.innerWidth * 0.2) prev(); else next();
  });
  let touchX = null;
  frame.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  frame.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    touchX = null;
  });

  // ---- start ----
  applyReduced();
  fit();
  const h = (location.hash || '').replace('#', '').split('.');
  goto((Number(h[0]) || 1) - 1, Number(h[1]) || 0, true);
  if (location.search.indexOf('bare') >= 0) document.documentElement.classList.add('bare');
  requestAnimationFrame(tickMatrix);
  window.GAS_DECK = { next, prev, goto, openPresenter, get presenter() { return pw; }, get cur() { return cur; }, get step() { return step; }, slides, steps };
})();
