// =====================================================================
//  КОЛБА — прототип. Phaser 3 (цикл, ввод, твины, камера) + Canvas2D рендер
// =====================================================================
const W = 1280, H = 720;
const RES = Math.max(1, Math.min(2, Math.round(Math.min(innerWidth / W, innerHeight / H) * (window.devicePixelRatio || 1) * 4) / 4));
let FOV = 78 * Math.PI / 180, FOCAL = (W / 2) / Math.tan(FOV / 2);
function setFov(deg) { FOV = deg * Math.PI / 180; FOCAL = (W / 2) / Math.tan(FOV / 2); }
const PAINT_COLS = ['#6cff1f']; // краска всегда одна — токсично-зелёная
// Локализация. Пока переведены надписи на 3D-моделях; остальной текст игры можно переносить сюда постепенно.
let LANG = 'ru';
const L10N = {
  ru: { label_press: 'ПРЕСС', label_inc: 'ИНКУБАТОР', label_term: 'ТЕРМИНАЛ', label_bin: 'УТИЛИЗАЦИЯ', label_funnel: 'КОРМ' },
  en: { label_press: 'PRESS', label_inc: 'INCUBATOR', label_term: 'TERMINAL', label_bin: 'DISPOSAL', label_funnel: 'FOOD' }
};
function tr(k) { return (L10N[LANG] && L10N[LANG][k]) || L10N.ru[k] || k; }
const ROOM = 11, CEIL = 4.6, EYE = 1.62, EYE_CROUCH = 0.95;
const TANK = { x: 0, z: 0, r: 1.35, base: 0.55, top: 4.0, ringY: 1.2, ringR: 1.62 };
const FUNNEL = { x: 1.25, z: 1.95 };
const REACH = 2.8;
const LVLCOL = [null, '#ff9a5a', '#43d3c6', '#b48cff', '#ffd24d'];
const LVLCOL2 = [null, '#d0643a', '#23a095', '#7d5ad6', '#d1a21b'];
const LVLVAL = [0, 10, 22, 36, 52];
const PALETTE = ['#ff6fa8', '#ff4d5e', '#ffa84d', '#ffe66d', '#7be07b', '#4dd6ff', '#6f8cff', '#b77dff', '#ffffff', '#2a2f3a'];
const SESSION = { proto: 30 * 60, full: 150 * 60 };
const WISH_EVERY = { proto: 180, full: 300 };
const INC_SPOTS = [[-3.4, 2.9], [-6.8, -4.6], [6.8, -4.6], [-8.2, 3.4]];
const PRESS_SPOTS = [[3.4, 2.9], [0, -8.2], [8.2, 3.4]];
const MAX_RYB = 45;
const MAX_CUT = 150; // авто-прессы ждут, если на полу столько котлет (и игре легче)

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const hyp = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
const pick = a => a[Math.floor(Math.random() * a.length)];
const fmt = n => { n = Math.floor(n); return n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(n); };

// ============================ ЗВУК (WebAudio синтез) ============================
const Snd = {
  ac: null, ready: false, muted: false,
  init() {
    if (this.ac) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ac = new AC(); } catch (e) { return; }
    const ac = this.ac;
    this.master = ac.createGain(); this.master.gain.value = 0.8; this.master.connect(ac.destination);
    this.sfx = ac.createGain(); this.sfx.gain.value = 0.6; this.sfx.connect(this.master);
    this.mus = ac.createGain(); this.mus.gain.value = 0.3; this.mus.connect(this.master);
    const len = ac.sampleRate * 2, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.nbuf = b;
    this.holdO = ac.createOscillator(); this.holdO.type = 'sawtooth';
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    this.holdG = ac.createGain(); this.holdG.gain.value = 0;
    this.holdO.connect(f); f.connect(this.holdG); this.holdG.connect(this.sfx); this.holdO.start();
    this.ready = true; Music.init(); this.applyVolumes();
  },
  resume() { if (this.ac && this.ac.state === 'suspended') this.ac.resume(); },
  mute(m) { this.muted = m; this.applyVolumes(); },
  applyVolumes() {
    if (!this.ready) return; const t = this.ac.currentTime, V = SET.vol;
    this.master.gain.setTargetAtTime(this.muted ? 0 : V.master, t, 0.05); this.sfx.gain.setTargetAtTime(0.75 * V.sfx, t, 0.05); this.mus.gain.setTargetAtTime(0.4 * V.music, t, 0.05);
  },
  tone(f, dur = 0.15, type = 'sine', vol = 0.2, f2 = 0, delay = 0, out = null) {
    if (!this.ready) return;
    const ac = this.ac, t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.015, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out || this.sfx); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur = 0.2, vol = 0.2, freq = 1000, ft = 'bandpass', delay = 0, q = 1, f2 = 0) {
    if (!this.ready) return;
    const ac = this.ac, t = ac.currentTime + delay;
    const s = ac.createBufferSource(); s.buffer = this.nbuf;
    const fl = ac.createBiquadFilter(); fl.type = ft; fl.frequency.setValueAtTime(freq, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    fl.Q.value = q;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.sfx);
    s.start(t, Math.random() * 0.3, dur + 0.05);
  },
  setHold(on, p) {
    if (!this.ready) return;
    const t = this.ac.currentTime;
    this.holdG.gain.setTargetAtTime(on ? 0.05 : 0, t, 0.04);
    this.holdO.frequency.setTargetAtTime(70 + p * 280, t, 0.05);
  }
};

const SFX = {
  pick() { Snd.tone(520, 0.08, 'triangle', 0.2, 880); },
  drop() { Snd.tone(240, 0.1, 'sine', 0.2, 140); },
  thud() { Snd.tone(120, 0.12, 'sine', 0.25, 60); Snd.noise(0.06, 0.12, 400, 'lowpass'); },
  throw(p = 0.5) { Snd.noise(0.25, 0.1 + 0.25 * p, 700, 'bandpass', 0, 0.8, 2600); },
  splash() { Snd.noise(0.45, 0.3, 900, 'lowpass', 0, 1, 250); Snd.tone(320, 0.15, 'sine', 0.08, 120); },
  chomp(k = 0) { const p = Math.pow(1.045, Math.min(k, 30)); Snd.tone(120 * p, 0.12, 'square', 0.14, 55); Snd.noise(0.08, 0.3, 2200 * p, 'bandpass', 0.02, 2); },
  coin(k = 0) { const f = 880 * Math.pow(1.05, Math.min(k, 30)); Snd.tone(f, 0.07, 'square', 0.06); Snd.tone(f * 1.5, 0.12, 'square', 0.06, 0, 0.06); },
  knock() { Snd.tone(170, 0.2, 'sine', 0.35, 90); Snd.noise(0.05, 0.25, 600, 'lowpass'); },
  poke() { Snd.tone(900, 0.04, 'triangle', 0.12); },
  squeak() { Snd.tone(rnd(900, 1400), 0.12, 'triangle', 0.12, rnd(1700, 2300)); },
  scream() { Snd.tone(1500, 0.4, 'sawtooth', 0.07, 2600); Snd.tone(1200, 0.4, 'square', 0.04, 2000, 0.05); },
  squish() { Snd.noise(0.4, 0.45, 500, 'lowpass', 0, 1, 120); Snd.tone(140, 0.35, 'sawtooth', 0.12, 40); },
  good() { [660, 880, 1320].forEach((f, i) => Snd.tone(f, 0.12, 'triangle', 0.15, 0, i * 0.07)); },
  bad() { Snd.tone(190, 0.25, 'sawtooth', 0.14, 90); },
  gross() { Snd.noise(0.5, 0.25, 300, 'lowpass'); Snd.tone(95, 0.45, 'square', 0.1, 50); },
  echo(rage) { const n = rage ? 6 : 3; for (let i = 0; i < n; i++) Snd.tone(rage ? rnd(1800, 3400) : 2700, 0.03, 'sine', rage ? 0.22 : 0.1, 0, i * (rage ? 0.045 : 0.09)); },
  giggle() { for (let i = 0; i < 5; i++) Snd.tone(2400 + i * 180, 0.04, 'sine', 0.1, 0, i * 0.06); },
  hum() { Snd.tone(52, 1.1, 'sine', 0.4, 44); Snd.tone(104, 0.9, 'sine', 0.08, 88); },
  crack() { Snd.noise(0.25, 0.45, 3200, 'highpass'); Snd.tone(320, 0.1, 'square', 0.08, 80); },
  shatter() { Snd.noise(1.4, 0.6, 4200, 'highpass'); Snd.noise(1.8, 0.5, 600, 'lowpass', 0.1); },
  buy() { Snd.tone(1200, 0.06, 'square', 0.08); Snd.tone(1600, 0.12, 'square', 0.08, 0, 0.07); },
  tube() { Snd.noise(0.5, 0.25, 400, 'bandpass', 0, 2, 2400); },
  love() { [523, 659, 784, 1046].forEach((f, i) => Snd.tone(f, 0.28, 'sine', 0.12, 0, i * 0.08)); },
  record() { [523, 659, 784, 1046, 1318].forEach((f, i) => Snd.tone(f, 0.2, 'square', 0.06, 0, i * 0.06)); },
  bonusEnd(n) { const c = Math.min(8, 2 + (n >> 2)); for (let i = 0; i < c; i++) Snd.tone(660 * Math.pow(1.122, i), 0.1, 'triangle', 0.12, 0, i * 0.05); },
  perfect() { Snd.tone(880, 0.1, 'triangle', 0.18); Snd.tone(1320, 0.18, 'triangle', 0.16, 0, 0.08); },
  fail() { Snd.tone(300, 0.2, 'square', 0.08, 120); },
  click() { Snd.tone(1400, 0.02, 'square', 0.08); },
  jump() { Snd.tone(300, 0.1, 'sine', 0.1, 500); }
};

const Music = {
  chords: [[45, 57, 60, 64], [41, 53, 57, 60], [36, 52, 55, 60], [43, 55, 59, 62]],
  ci: 0, next: 0, arpT: 0, ai: 0, on: false,
  mf(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  init() {
    const ac = Snd.ac;
    this.f = ac.createBiquadFilter(); this.f.type = 'lowpass'; this.f.frequency.value = 1200;
    this.pg = ac.createGain(); this.pg.gain.value = 0.45; this.f.connect(this.pg); this.pg.connect(Snd.mus);
    this.osc = [];
    for (let i = 0; i < 4; i++) {
      const o = ac.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle';
      const g = ac.createGain(); g.gain.value = i === 0 ? 0.35 : 0.1;
      o.connect(g); g.connect(this.f); o.start(); this.osc.push(o);
    }
    this.ag = ac.createGain(); this.ag.gain.value = 0.5; this.ag.connect(Snd.mus);
    // слой «русалка поёт»: низкий вибрирующий тон, звучит только в Радости
    this.hum = ac.createOscillator(); this.hum.type = 'sine';
    const lfo = ac.createOscillator(); lfo.frequency.value = 4.6;
    const lg = ac.createGain(); lg.gain.value = 5; lfo.connect(lg); lg.connect(this.hum.frequency); lfo.start();
    this.hum2 = ac.createOscillator(); this.hum2.type = 'triangle';
    this.hf = ac.createBiquadFilter(); this.hf.type = 'lowpass'; this.hf.frequency.value = 700;
    this.hg = ac.createGain(); this.hg.gain.value = 0;
    this.hum.connect(this.hf); this.hum2.connect(this.hf); this.hf.connect(this.hg); this.hg.connect(Snd.mus);
    this.hum.start(); this.hum2.start();
    this.apply(); this.on = true;
  },
  apply() {
    const t = Snd.ac.currentTime, ch = this.chords[this.ci];
    this.osc.forEach((o, i) => o.frequency.setTargetAtTime(this.mf(ch[i]), t, 0.4));
    this.hum.frequency.setTargetAtTime(this.mf(ch[0] + 12), t, 0.6);
    this.hum2.frequency.setTargetAtTime(this.mf(ch[2]), t, 0.6);
  },
  update(mood, rage) {
    const files = musicLayers(mood, rage);
    if (!this.on) return;
    const t = Snd.ac.currentTime;
    if (files) { this.pg.gain.setTargetAtTime(0, t, 0.3); this.hg.gain.setTargetAtTime(0, t, 0.3); return; }
    if (t > this.next) { this.ci = (this.ci + 1) % 4; this.apply(); this.next = t + 4.2; }
    const joy = mood === 'joy', sad = mood === 'sad';
    this.f.frequency.setTargetAtTime(rage ? 260 : sad ? 480 : joy ? 2400 : 1300, t, 0.5);
    this.pg.gain.setTargetAtTime(rage ? 0.12 : sad ? 0.3 : 0.45, t, 0.5);
    this.hg.gain.setTargetAtTime(joy && !rage ? 0.11 : 0, t, 0.8);
    const rate = rage ? 0 : sad ? 0.95 : joy ? 0.21 : 0.42;
    if (rate && t > this.arpT) {
      const ch = this.chords[this.ci];
      const n = ch[1 + (this.ai++ % 3)] + 12 + (joy && this.ai % 4 === 0 ? 12 : 0);
      Snd.tone(this.mf(n), sad ? 0.7 : 0.35, 'sine', sad ? 0.045 : 0.075, 0, 0, this.ag);
      this.arpT = t + rate;
    }
    if (!rate) this.arpT = t;
  }
};

// ============================ СОСТОЯНИЕ ============================
let G = null;       // сохраняемое состояние (ключи с '_' не сохраняются)
let MA = null;      // анимационное состояние русалки (не сохраняется)
let CAM = { x: 0, z: 0, c: 1, s: 0, pc: 1, ps: 0, eye: EYE, hor: H / 2 };
let SCENE = null;   // Phaser-сцена
let ctx = null;     // 2D-контекст экрана

function newState(opts) {
  return {
    ver: 1, t: 0, mode: opts.mode || 'proto', coins: 40, nextId: 1, prestige: 0,
    player: { x: 0, z: 7.6, y: 0, vy: 0, yaw: -Math.PI / 2, pitch: -0.05, crouch: false, bob: 0, vx: 0, vz: 0 },
    hands: { L: { item: null }, R: { item: null } },
    ents: [],
    up: { incSpeed: 0, pressSpeed: 0, protect: 0, autoInc: 0, autoPress: 0, incCount: 1, pressCount: 1, life: 0, quality: 0,
          jump: 0, hand2: 0, run: 0, throw: 0, bDur: 0, bPow: 0, bStab: 0, bCombo: 0 },
    drawings: { ryb: true, cutlet: true, bow: true, flower: true, plate: true, sticker: true, pendant: true, earrings: true, bracelet: true },
    cust: { owned: {}, bow: null, pendant: null, earrings: null, bracelets: null, hairColor: '#8a63ff', hairStyle: 'long', styles: { long: true } },
    mer: { growth: 0, sat: 75, emo: 55, rel: 50, state: 'neutral', rage: false, glass: 100, cracks: [], starveT: 0,
           wish: null, wishTimer: 25, layers: 1, favId: null, lastRecordMood: 0 },
    bonus: { streak: 0, timer: 0, pot: 0, comboT: 0, best: 0, maxT: 1 },
    stickers: [],
    stats: { made: 0, old: 0, cutlets: 0, pressed: 0, fed: 0, earned: 0, rages: 0, wishes: 0, bestStreak: 0 },
    rages: [], lastRyb: [], stage: 0, step: 0, flags: {}, god: false, ended: null, runEarned: 0, goals: {}, unl: {}, newUnl: {}, run: { best: 0, pressRyb: 0 }
  };
}

function newAnim() {
  return {
    u: 0, tu: 0, fwd: 0, v: 0, tilt: 0, headTilt: 0,
    eatT: 0, spitT: 0, cryT: 0, laughT: 0, loveT: 0, tapT: 0, showWishT: 0, lookT: 0, wishCD: 0,
    blinkT: 2, blink: 0, echoT: 4, echoes: [], humT: 3, bangT: 1, bangK: 0, hearts: [], tears: [], bubbles: [],
    food: [], eatGap: 0, lampFlick: 0, lastLaugh: -10, knocks: [], lastKnockReact: -10, lastPressSeen: -10,
    boredT: 0, shake: 0, finale: 0, rect: null, gazeX: 0, gazeY: 0
  };
}

// ============================ СУЩНОСТИ ============================
function addEnt(o) {
  o.id = G.nextId++;
  o.y = o.y || 0; o.vx = o.vx || 0; o.vy = o.vy || 0; o.vz = o.vz || 0;
  G.ents.push(o); return o;
}
function rmEnt(e) { const i = G.ents.indexOf(e); if (i >= 0) G.ents.splice(i, 1); }
function byId(id) { for (const e of G.ents) if (e.id === id) return e; return null; }

function rybData(lvl) {
  return { type: 'ryb', lvl, deco: { bow: null, flower: null, plate: false, paint: false, st: 0 },
    tx: 0, tz: 0, tT: 0, fearT: 0, fx: 0, fz: 0, memT: 0, angryT: 0, worT: 0, bond: 0, fav: false, age: 0,
    face: 1, walk: Math.random() * 6, leader: null, haul: null, carriers: null, inPress: null, hue: Math.random() };
}
function mkRyb(x, z, lvl = 1) { const r = rybData(lvl); r.x = x; r.z = z; r.tx = x; r.tz = z; return addEnt(r); }
function cutletData(r) {
  const n = cutletsPer(r);
  return { type: 'cutlet', lvl: r.lvl, base: LVLVAL[r.lvl] * 0.9 / n, food: 26 * r.lvl * 1.05 / n, deco: { bow: null, flower: null } };
}
function mkMachine(type, n) {
  const spot = type === 'inc' ? INC_SPOTS[n - 1] : PRESS_SPOTS[n - 1];
  const o = type === 'inc'
    ? { type: 'inc', n, x: spot[0], z: spot[1], prog: 0, hold: false, auto: false, rad: 0.75, stat: true, flash: 0, up: { speed: 0, protect: 0, auto: 0, quality: 0, paint: 0 } }
    : { type: 'press', n, x: spot[0], z: spot[1], slot: null, lever: 0, auto: false, autoT: 0, rad: 0.85, stat: true, flash: 0, up: { speed: 0, auto: 0 } };
  o.face = Math.atan2(6 - o.z, 0 - o.x); // лицом к «жилой» части лаборатории
  return addEnt(o);
}
function mkPack(kind, n, x, z) { return addEnt({ type: 'pack', kind, n, x, z, col: pick(PALETTE.slice(0, 8)) }); }
function mkTool(kind, x, z) { return addEnt({ type: 'tool', kind, load: [], x, z }); }

function decoCount(o) {
  const d = o.deco;
  return (d.bow ? 1 : 0) + (d.flower ? 1 : 0) + (d.plate ? 1 : 0) + (d.paint ? 1 : 0) + (d.st > 0 ? 1 : 0);
}
function cutletsPer(r) { return 2 + r.lvl + (r.deco.plate ? 1 : 0); }
function rybValue(r) {
  let v = LVLVAL[r.lvl];
  const d = r.deco;
  if (d.bow) v += 6; if (d.flower) v += 6; if (d.plate) v += 15; v += d.st * 3;
  if (decoCount(r) >= 2) v *= 1.25;
  return v;
}
function cutletValue(c) { return c.base + (c.deco.bow ? 3 : 0) + (c.deco.flower ? 3 : 0); }
function merHeight() { return 1.5 + 1.5 * G.mer.growth; }
function satMax() { return G.mer.layers * 100; }
function satPct() { return G.mer.sat / satMax(); }
function moodMult() { const M = G.mer; return M.rage ? 0.6 : M.state === 'joy' ? 1.3 : M.state === 'sad' ? 0.8 : 1; }
function machineMult() { const s = G.mer.state; return G.mer.rage ? 0.7 : s === 'joy' ? 1.2 : s === 'sad' ? 0.8 : 1; }
function handAllowed(side) { return side === 'L' || G.up.hand2 > 0; }
