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
  setInterval(() => { $('.clock', notes).textContent = fmt(started ? performance.now() - started : 0); }, 250);

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
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') goto(0, 0);
    else if (k === 'End') goto(slides.length - 1, 0);
    else if (k === 'f' || k === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      else document.exitFullscreen && document.exitFullscreen();
    } else if (k === 'n' || k === 'N') notes.classList.toggle('on');
    else if (k === 'o' || k === 'O' || k === 'Escape') { ov.classList.toggle('on', k === 'Escape' ? false : !ov.classList.contains('on')); renderOverview(); }
    else if (k === 'h' || k === 'H' || k === '?') $('#help').classList.toggle('on');
    else if (k === 't' || k === 'T') started = performance.now();
    else if (k === 'b' || k === 'B' || k === '.') { black = !black; frame.style.opacity = black ? 0 : 1; }
    else if (k === 'm' || k === 'M') {
      reduced = !reduced;
      try { localStorage.setItem(reducedKey, reduced ? '1' : '0'); } catch (err) { /* ignore */ }
      applyReduced();
      render(true);
    }
  });
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
  window.GAS_DECK = { next, prev, goto, get cur() { return cur; }, get step() { return step; }, slides, steps };
})();
