// What the 3D model shows on every slide (and step). Names are used in
// index.html as data-scene. All keys are optional, defaults are in scene.js.
// cam: t = target (cm), az/el = angles (deg), dist, fov, cx/cy = where the
// target sits on screen (0..1). Positions in cm, the control unit is 9 cm wide.
(function () {
  'use strict';
  const all = (v) => ({ uno: v, kp: v, oled: v, rc: v, buz: v, pir: v, mb: v, bat: v });
  const only = (ids) => {
    const o = all({ vis: 0 });
    Object.keys(o).forEach((k) => { o[k] = { vis: ids.includes(k) ? 1 : 0 }; });
    return o;
  };
  const cycle = (list) => (t) => {
    const total = list.reduce((a, x) => a + x[1], 0);
    let u = t % total;
    for (const [m, d] of list) { if (u < d) return m; u -= d; }
    return list[0][0];
  };

  // shared set-ups
  const HERO = { cam: { t: [4, 8.6, 0], az: 0, el: 8, dist: 84, cx: 0.7 }, yaw: -22, wires: 0, suP: [15, 0, -4], suR: -40 };
  const FRONT = { cam: { t: [0, 9.6, 0], az: 0, el: 4, dist: 50, cx: 0.73 }, yaw: -14, wires: 0, su: 0 };
  const FLAT = { flat: 1, caseCu: 0, caseSu: 0, su: 0, cable: 0, yaw: 0, wires: 0, cam: { t: [4.2, 9.4, 0], az: 9, el: 6, dist: 82, cx: 0.74 } };
  const XRAY = { caseCu: 0.13, caseSu: 0.13, wires: 1, cam: { t: [3, 9, 0], az: -26, el: 10, dist: 74, cx: 0.72 }, yaw: 0, suP: [15, 0, -4], suR: -40 };
  const WALL = { wall: 1, fan: 1, cuP: [-10, 4, 2.24], cuR: 0, suP: [4, 7, -4], suR: 180, yaw: 0, floor: 140, wires: 0, cable: 1 };
  const OLEDCAM = { cam: { t: [0, 15.4, 4.4], az: 0, el: 3, dist: 21, cx: 0.72 }, yaw: -10, wires: 0, su: 0 };
  const m = (a, b) => Object.assign({}, a, b, { cam: Object.assign({}, a.cam || {}, (b && b.cam) || {}) });

  const S = {
    title: m(HERO, { spin: 4, cam: { dist: 80 } }),
    agenda: m(HERO, { yaw: -40, cam: { dist: 88, el: 12 } }),
    idea: m(WALL, { cam: { t: [-12, 12, 2], az: 40, el: 20, dist: 112, cx: 0.73 } }),
    reqs: m(HERO, { cam: { dist: 175, cx: 0.92, cy: 0.6, el: 10 }, yaw: -30 }),
    site: m(WALL, { cam: { t: [-8, 11, -2], az: 52, el: 24, dist: 96, cx: 0.74 },
      labels: [{ at: 'cu', text: 'Bedienteil, außen' }, { at: 'su', text: 'Sensorteil, innen' }] }),

    'st-disarmed': m(FRONT, { oled: 'heart' }),
    'st-exit': m(FRONT, { oled: 'exit', buzz: (t) => (t % 1000) < 140, card: (t) => (t < 1300 ? 1 : 0) }),
    'st-armed': m(FRONT, { oled: 'armed' }),
    'st-alarm': m(FRONT, { oled: 'alarm', buzz: 1, alarm: 1 }),
    'st-disarm': m(FRONT, { oled: (t) => (t < 900 ? 'alarm' : 'heart'), card: (t) => (t < 1500 ? 1 : 0) }),
    'st-admin': m(FRONT, { oled: 'admin', key: 'A0000#' }),
    feedback: m(FRONT, { cam: { az: -18, el: 6 }, oled: cycle([['stars', 2400], ['heart', 2000], ['cross', 2000], ['exit', 3000], ['alarm', 3000]]) }),

    'parts-0': m(FLAT, { mods: only([]) }),
    'parts-1': m(FLAT, { mods: only(['uno']), labels: [{ at: 'uno', text: 'Arduino Uno R3' }] }),
    'parts-2': m(FLAT, { mods: only(['uno', 'kp']), labels: [{ at: 'kp', text: 'Keypad 4x4' }] }),
    'parts-3': m(FLAT, { mods: only(['uno', 'kp', 'oled']), labels: [{ at: 'oled', text: 'OLED SH1106' }] }),
    'parts-4': m(FLAT, { mods: only(['uno', 'kp', 'oled', 'rc']), labels: [{ at: 'rc', text: 'RFID-RC522' }] }),
    'parts-5': m(FLAT, { mods: only(['uno', 'kp', 'oled', 'rc', 'pir']), labels: [{ at: 'pir', text: 'HC-SR501' }] }),
    'parts-6': m(FLAT, { mods: only(['uno', 'kp', 'oled', 'rc', 'pir', 'buz']), labels: [{ at: 'buz', text: 'Buzzer' }] }),
    'parts-7': m(FLAT, { mods: only(['uno', 'kp', 'oled', 'rc', 'pir', 'buz', 'mb', 'bat']), labels: [{ at: 'mb', text: 'Mini-Breadboard', side: 'l' }, { at: 'bat', text: '9-V-Block' }] }),

    'pins-all': m(FLAT, { wires: 1 }),
    'pins-kp': m(FLAT, { wires: { kp: 1 }, hi: ['kp'], pulse: ['kp'] }),
    'pins-i2c': m(FLAT, { wires: { kp: 1, i2c: 1 }, hi: ['i2c'], pulse: ['i2c'] }),
    'pins-spi': m(FLAT, { wires: { kp: 1, i2c: 1, spi: 1 }, hi: ['spi'], pulse: ['spi'] }),
    'pins-spi2': m(FLAT, { wires: { kp: 1, i2c: 1, spi: 1, spis: 1, rc3v: 1 }, hi: ['spis', 'rc3v'], pulse: ['spis'], labels: [{ at: 'v33', text: '3,3 V', cls: 'warn' }] }),
    'pins-io': m(FLAT, { wires: 1, hi: ['pir', 'buz'], pulse: ['pir', 'buz'] }),
    'pins-schem': m(FLAT, { wires: 1 }),

    power: m(FLAT, { mods: only(['uno', 'mb', 'bat']), wires: { pwr: 1, bat: 1 }, hi: ['bat'], pulse: ['pwr', 'bat'],
      cam: { t: [7, 13, 0], dist: 48, az: 12, el: 10, cx: 0.74 }, labels: [{ at: 'vin', text: 'VIN' }, { at: 'mb', text: 'Spalte 13, 15, 17' }] }),
    real: { lid: 1, wires: 1, su: 0, yaw: 0, cam: { t: [-1.5, 9, 2], az: 6, el: 42, dist: 76, cx: 0.85 } },

    'case-0': { lid: 1, wires: 1, su: 0, yaw: 0, cam: { t: [-1.5, 9, 2], az: 6, el: 42, dist: 66, cx: 0.73 } },
    'case-1': { lid: 1, wires: 1, su: 0, yaw: 0, cam: { t: [-2, 9, 2], az: 22, el: 30, dist: 72, cx: 0.73 } },
    'case-2': m(FRONT, { cam: { az: -24, el: 10, dist: 58 } }),
    'case-3': m(FRONT, { cam: { az: -10, el: 6, dist: 46 }, card: (t) => ((t % 6000) < 2600 ? 1 : 0), oled: (t) => ((t % 6000) > 1500 && (t % 6000) < 4600 ? 'exit' : 'heart') }),
    'case-4': m(HERO, { cam: { dist: 86, cx: 0.7 }, yaw: -28 }),

    source: m(HERO, { cam: { dist: 100, cx: 0.76 }, yaw: -34 }),
    loop: m(XRAY, { pulse: ['kp', 'i2c', 'spi', 'spis', 'pir', 'buz'] }),
    fsm: m(FRONT, { oled: cycle([['heart', 2500], ['exit', 4000], ['armed', 2500], ['alarm', 4000]]),
      buzz: (t) => { const u = t % 13000; return (u > 2500 && u < 6500 && (u % 1000) < 140) || u > 9000; },
      alarm: 0 }),
    access: m(FRONT, { cam: { az: -16 }, card: (t) => ((t % 8000) < 2400 ? 1 : 0), oled: (t) => ((t % 8000) < 1600 ? 'heart' : 'exit') }),
    sound: m(XRAY, { caseCu: 0.22, oled: 'alarm', buzz: 1, alarm: 0.7, wires: { buz: 1, pwr: 1 }, hi: ['buz'], pulse: ['buz'],
      cam: { t: [1.5, 13.5, 0], az: -22, el: 8, dist: 44 } }),

    keypad: m(FRONT, { cam: { t: [0, 7.2, 1], el: 8, dist: 44, cx: 0.76 }, scan: 1, oled: 'stars' }),
    motion: m(WALL, { alarm: 0.6, oled: 'alarm', cam: { t: [-2, 7, -12], az: 200, el: 34, dist: 92, cx: 0.75 } }),
    rfid: m(XRAY, { caseCu: 0.18, wires: { spi: 1, spis: 1, rc3v: 1 }, hi: ['spi'], pulse: ['spi', 'spis'], card: (t) => ((t % 7000) < 2600 ? 1 : 0),
      oled: (t) => ((t % 7000) > 1400 && (t % 7000) < 5200 ? 'exit' : 'heart'), cam: { t: [1, 10, 0], az: -22, el: 8, dist: 62 } }),
    admin: m(FRONT, { oled: 'admin' }),
    'admin-add': m(FRONT, { oled: (t) => ((t % 7000) < 2200 ? 'scan' : 'saved'), card: (t) => ((t % 7000) > 800 && (t % 7000) < 3200 ? 1 : 0) }),
    'admin-list': m(FRONT, { oled: 'list' }),

    'way-0': m(FLAT, { mods: only([]) }),
    'way-1': m(FLAT, { mods: only(['uno', 'kp', 'oled', 'buz', 'pir']), wires: { kp: 1, i2c: 1, buz: 1, pir: 1 }, pirD11: 1, oled: 'garbage' }),
    'way-2': m(FLAT, { mods: only(['uno', 'kp', 'oled', 'buz', 'pir', 'rc']), wires: { kp: 1, i2c: 1, buz: 1, pir: 1, spi: 1, spis: 1, rc3v: 1 }, pulse: ['spi'] }),
    'way-3': m(XRAY, { caseCu: 0.3, caseSu: 0.3, wires: 1, cam: { cx: 0.72 } }),
    'way-4': m(XRAY, { caseCu: 0.3, caseSu: 0.3, wires: 1, oled: 'alarm', buzz: 1, alarm: 0.6 }),
    'way-5': { lid: 1, wires: 1, su: 1, suP: [16, 0, -2], suR: -30, yaw: 0, cam: { t: [3, 9, 1], az: 10, el: 34, dist: 80, cx: 0.73 } },
    'way-6': m(HERO, { spin: 4, cam: { dist: 84 } }),

    'sh-0': m(OLEDCAM, { oled: 'stripes' }),
    'sh-1': m(OLEDCAM, { oled: 'heart' }),
    'ram-0': m(OLEDCAM, { oled: 'garbage', cam: { az: -14, el: 6, dist: 26 } }),
    'ram-1': m(OLEDCAM, { oled: 'heart', cam: { az: -14, el: 6, dist: 26 } }),
    'bug-0': m(FRONT, { oled: 'alarm', buzz: 1, alarm: 1, secsFn: (t) => 30 - Math.floor((t % 30000) / 1000) }),
    'bug-1': m(FRONT, { oled: (t) => { const u = t % 12000; return u > 4400 && u < 6800 ? 'stars' : 'alarm'; }, buzz: 1, alarm: 1, key: { seq: '5555#', at: 4000, every: 12000 },
      stars: 4,
      secsFn: (t) => { const u = t % 12000; return u < 6800 ? 30 - Math.floor(u / 1000) : 30 - Math.floor((u - 6800) / 1000); } }),

    'pin-0': m(FLAT, { mods: only(['uno', 'rc', 'pir', 'buz']), wires: { pir: 1, spi: 1 }, pirD11: 1, hi: ['pir', 'spi'],
      cam: { t: [8, 6, 0], dist: 58, az: 4 }, labels: [{ at: 'd11', text: 'D11: MOSI und Bewegungsmelder', cls: 'warn' }] }),
    'pin-1': m(FLAT, { mods: only(['uno', 'rc', 'pir', 'buz']), wires: { pir: 1, spi: 1 }, pirD11: 0, hi: ['pir'], pulse: ['pir'],
      cam: { t: [8, 6, 0], dist: 58, az: 4 }, labels: [{ at: 'a2', text: 'A2: Bewegungsmelder' }, { at: 'd11', text: 'D11: MOSI' }] }),
    'pin-2': m(FLAT, { mods: only(['uno', 'rc', 'pir', 'buz']), wires: { pir: 1, spi: 1, buz: 1 }, hi: ['buz'], pulse: ['buz'],
      cam: { t: [8, 6, 0], dist: 58, az: 4 }, labels: [{ at: 'd10', text: 'D10: SS und Buzzer', cls: 'warn' }] }),
    'rc-0': m(FLAT, { mods: only(['uno', 'rc']), wires: { spi: 1, spis: 1, rc3v: 1 }, hi: ['rc3v'], cam: { t: [9, 10.5, 0], dist: 52, az: 6 },
      labels: [{ at: 'v33', text: '3,3 V, nicht 5 V', cls: 'warn' }] }),
    'rc-1': m(FLAT, { mods: only(['uno', 'rc']), wires: { spi: 1, spis: 1, rc3v: 1 }, pulse: ['spi', 'spis'], cam: { t: [9, 10.5, 0], dist: 52, az: 6 },
      card: (t) => ((t % 6000) < 2600 ? 1 : 0), labels: [{ at: 'rc', text: 'Version 0xB2' }] }),
    'wedge-0': m(WALL, { wedge: 0.5, cam: { t: [-4, 6, -14], az: 200, el: 42, dist: 110, cx: 0.75 } }),
    'wedge-1': m(WALL, { wedge: 30, cam: { t: [-4, 6, -14], az: 200, el: 42, dist: 110, cx: 0.75 } }),
    'wedge-2': m(WALL, { wedge: 60, cam: { t: [-4, 6, -14], az: 200, el: 42, dist: 110, cx: 0.75 }, labels: [{ at: 'wedge', text: '60°-Keil' }] }),
    print: m(HERO, { cam: { t: [15, 4.5, -4], az: -20, el: 14, dist: 54, cx: 0.86 }, yaw: 0, suR: -20, cuP: [-40, 0, -30] }),

    final: m(HERO, { spin: 4, cam: { dist: 82 } }),
    outlook: m(HERO, { cam: { dist: 140, cx: 0.9, el: 12 }, yaw: -40 }),
    ai: m(HERO, { cam: { dist: 96, cx: 0.75 }, yaw: -10, oled: 'stars' }),
    demo: m(FRONT, { cam: { az: -12, el: 6, dist: 52 }, oled: 'heart', su: 1, suP: [15, 0, -4], suR: -40 }),
    end: m(HERO, { spin: 4, cam: { dist: 84, cx: 0.72 } })
  };
  window.GAS_SCENES = S;
})();
