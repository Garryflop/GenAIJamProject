
// ============================ НАСТРОЙКИ ============================
const ACTIONS = [
  ['forward', 'Вперёд', 'KeyW'], ['back', 'Назад', 'KeyS'], ['left', 'Влево', 'KeyA'], ['right', 'Вправо', 'KeyD'],
  ['run', 'Бег', 'ShiftLeft'], ['jump', 'Прыжок', 'Space'], ['crouch', 'Присесть', 'KeyC'], ['poke', 'Ткнуть / инструмент', 'KeyE'],
  ['terminal', 'Терминал', 'Tab'], ['help', 'Справка', 'KeyH'], ['cheat', 'Чит-меню', 'Backquote']
];
const DEF_SET = { sens: 1, invertY: false, fov: 78, hints: true, shake: true, vol: { master: 0.8, music: 0.6, sfx: 0.8 }, keys: Object.fromEntries(ACTIONS.map(a => [a[0], a[2]])) };
function loadSettings() {
  let s = {}; try { s = JSON.parse(localStorage.getItem('siren_settings') || '{}'); } catch (e) { }
  const o = JSON.parse(JSON.stringify(DEF_SET));
  for (const k of ['sens', 'invertY', 'fov', 'hints', 'shake']) if (s[k] !== undefined) o[k] = s[k];
  Object.assign(o.vol, s.vol || {}); Object.assign(o.keys, s.keys || {});
  return o;
}
let SET = loadSettings();
function saveSettings() { try { localStorage.setItem('siren_settings', JSON.stringify(SET)); } catch (e) { } }
function applySettings() { setFov(SET.fov); Snd.applyVolumes(); }
function keyLabel(code) {
  if (!code) return '—';
  const m = { Space: 'Space', Backquote: '` / Ё', Tab: 'Tab', ShiftLeft: 'Shift', ShiftRight: 'R-Shift', ControlLeft: 'Ctrl', ControlRight: 'R-Ctrl', AltLeft: 'Alt', Enter: 'Enter', Backspace: 'Backspace', CapsLock: 'Caps' };
  if (m[code]) return m[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }[code] || code;
}

// ============================ ВВОД (переназначаемые клавиши) ============================
const IN = { down: {}, just: {}, rebind: null };
function inDown(a) { const k = SET.keys[a]; return !!(IN.down[k] || (k === 'ShiftLeft' && IN.down.ShiftRight)); }
function inPressed(a) { const k = SET.keys[a]; if (IN.just[k] || (k === 'ShiftLeft' && IN.just.ShiftRight)) { IN.just[k] = false; IN.just.ShiftRight = false; return true; } return false; }
function keyTxt(s) { return s.replace(/E/, keyLabel(SET.keys.poke)).replace('Tab', keyLabel(SET.keys.terminal)); }
function inAction(code) { for (const a in SET.keys) if (SET.keys[a] === code || (SET.keys[a] === 'ShiftLeft' && code === 'ShiftRight')) return a; return null; }
window.addEventListener('keydown', e => {
  if (IN.rebind) {
    e.preventDefault();
    if (e.code !== 'Escape') { for (const a in SET.keys) if (SET.keys[a] === e.code) SET.keys[a] = SET.keys[IN.rebind]; SET.keys[IN.rebind] = e.code; saveSettings(); }
    IN.rebind = null; if (typeof renderSettings === 'function') renderSettings(); return;
  }
  if (!IN.down[e.code]) IN.just[e.code] = true;
  IN.down[e.code] = true;
  if (typeof onKeyAction === 'function') onKeyAction(e);
});
window.addEventListener('keyup', e => { IN.down[e.code] = false; });
window.addEventListener('blur', () => { IN.down = {}; IN.just = {}; });

// ============================ МУЗЫКА И ЗВУКИ ИЗ ФАЙЛОВ ============================
// Список файлов и разметка — в assets/audio/audio.js (AUDIO_MANIFEST, MUSIC_META, ENDING_MUSIC).
// Слои настроения (calm/joy/sad/rage) играют одновременно; слышен слой текущего настроения, остальные
// беззвучно подстраиваются под его такт, поэтому смена настроения — плавный кроссфейд точно в долю.
// Петли — по целым тактам между вступлением и концовкой трека. Нет файла — работает встроенный синтез.
const AUD = { el: {}, lv: {}, lag: {}, seekT: {}, ie: {}, layersOn: false, want: null, ref: null, ending: null, menuOn: false };
const LAYERS = ['calm', 'joy', 'sad', 'rage'];
const mMeta = k => (window.MUSIC_META || {})[k] || null;
function loadAudioFiles() {
  const man = window.AUDIO_MANIFEST || {};
  for (const [key, file] of Object.entries(man)) {
    const a = new Audio(); a.preload = 'auto';
    a.addEventListener('canplaythrough', () => { AUD.el[key] = a; }, { once: true });
    a.src = 'assets/audio/' + file;
  }
}
const lay = k => AUD.el['music_' + k];
function loopTick(el, m) { if (m && el.currentTime >= m.loopEnd) el.currentTime = m.loopStart + (el.currentTime - m.loopEnd); }
function stopLayers() { for (const k of LAYERS) if (lay(k)) lay(k).pause(); AUD.layersOn = false; }
function stopMenuMusic() { const el = AUD.el.music_menu; if (el) el.pause(); AUD.menuOn = false; }
function stopEndingMusic() { if (AUD.ending) AUD.ending.el.pause(); AUD.ending = null; }
function stopAllMusic() { stopLayers(); stopMenuMusic(); stopEndingMusic(); }
// меню: calm целиком, с вступлением, дальше по петле
function playMenuMusic() {
  stopLayers(); stopEndingMusic();
  const el = AUD.el.music_menu; if (!el) return false;
  if (!AUD.menuOn) { setRate(el, 1); el.loop = true; el.currentTime = 0; el.volume = 0; el.play().catch(() => { }); AUD.menuOn = true; AUD.lv.menu = 0; }
  return true;
}
// вызывается из синтез-музыки игры: если слои есть — выбираем нужный и глушим синтез
function musicLayers(mood, rage) {
  const have = LAYERS.filter(lay); if (!have.length) return false;
  if (!AUD.layersOn) {
    // из меню в игру без шва: calm продолжает с того же места и той же громкости
    const menu = AUD.menuOn && AUD.el.music_menu, from = menu ? menu.currentTime : 0, lv0 = menu ? AUD.lv.menu || 0 : 0;
    for (const k of have) { const el = lay(k), m = mMeta(k); setRate(el, 1); el.loop = true; el.currentTime = k === 'calm' ? from : (m ? m.loopStart : 0); el.volume = menu && k === 'calm' ? menu.volume : 0; el.play().catch(() => { }); AUD.lv[k] = k === 'calm' ? lv0 : 0; }
    AUD.layersOn = true; AUD.ref = have.includes('calm') ? 'calm' : have[0];
  }
  stopMenuMusic();
  AUD.want = rage && lay('rage') ? 'rage' : mood === 'joy' && lay('joy') ? 'joy' : mood === 'sad' && lay('sad') ? 'sad' : lay('calm') ? 'calm' : have[0];
  return true;
}
// концовки: отрезки треков (см. ENDING_MUSIC)
function playEndingMusic(type) {
  stopLayers(); stopMenuMusic(); stopEndingMusic();
  const E = (window.ENDING_MUSIC || {})[type]; if (!E) return;
  const el = lay(E.track); if (!el) return;
  setRate(el, 1); el.loop = false; el.currentTime = E.from; el.volume = 0; el.play().catch(() => { });
  AUD.ending = { el, E, t0: performance.now() };
}
function setRate(el, r) { if (Math.abs(el.playbackRate - r) > 0.0015) { el.preservesPitch = true; el.playbackRate = r; } }
function approach(v, to, step) { return v < to ? Math.min(to, v + step) : Math.max(to, v - step); }
function musicTick(dt) {
  const V = SET.vol.music * SET.vol.master;
  if (AUD.menuOn && AUD.el.music_menu) { const el = AUD.el.music_menu; AUD.lv.menu = approach(AUD.lv.menu || 0, 1, dt / 1.5); el.volume = clamp(AUD.lv.menu * V, 0, 1); loopTick(el, mMeta('calm')); }
  if (AUD.ending) {
    const A = AUD.ending, t = (performance.now() - A.t0) / 1000, E = A.E;
    let v = Math.min(1, t / (E.fadeIn || 1));
    if (E.stopAt) { const f = E.fadeOut || 0.3; if (t >= E.stopAt) { A.el.pause(); AUD.ending = null; return; } if (t > E.stopAt - f) v *= (E.stopAt - t) / f; }
    A.el.volume = clamp(v * V * (E.vol || 1), 0, 1);
  }
  if (!AUD.layersOn) return;
  const have = LAYERS.filter(lay);
  let loud = AUD.ref, best = -1;
  for (const k of have) { AUD.lv[k] = approach(AUD.lv[k] || 0, k === AUD.want ? 1 : 0, dt / 1.5); if (AUD.lv[k] > best) { best = AUD.lv[k]; loud = k; } }
  AUD.ref = loud;
  const ref = lay(AUD.ref), rm = mMeta(AUD.ref);
  const refBeats = rm ? (ref.currentTime - rm.loopStart) / rm.beat : 0;
  for (const k of have) {
    const el = lay(k), m = mMeta(k);
    el.volume = clamp(AUD.lv[k] * V, 0, 1);
    loopTick(el, m);
    // остальные слои держим в том же месте такта, что и слышимый: темп подгоняем под него
    // (плюс мягкая поправка скоростью), а тихий слой при большом расхождении просто перематываем
    if (k === AUD.ref || !m || !rm) { setRate(el, 1); continue; }
    const base = m.beat / rm.beat, now = performance.now();
    if (el.seeking || now - (AUD.seekT[k] || 0) < 400) continue; // после перемотки даём плееру раскачаться
    const beats = (el.currentTime - m.loopStart) / m.beat;
    let d = ((refBeats - beats) % 4 + 4) % 4; if (d > 2) d -= 4;
    const err = d * m.beat;
    // перемотка всегда «опаздывает» на время буферизации — запоминаем, на сколько, и целимся с запасом
    if (AUD.seekT[k]) { AUD.lag[k] = clamp((AUD.lag[k] ?? 0.05) + err * 0.7, 0, 0.3); AUD.seekT[k] = 0; }
    if (AUD.lv[k] < 0.05 && Math.abs(err) > 0.08) {
      const nt = el.currentTime + err + (AUD.lag[k] ?? 0.05);
      setRate(el, base); el.currentTime = nt < (el.currentTime >= m.loopStart ? m.loopStart : 0) ? nt + (m.loopEnd - m.loopStart) : nt;
      AUD.seekT[k] = now; AUD.ie[k] = 0; continue;
    }
    const lim = AUD.lv[k] < 0.05 ? 0.04 : 0.015; // тихий слой догоняем смелее, слышимый — незаметно
    AUD.ie[k] = clamp((AUD.ie[k] || 0) + err * dt, -0.04, 0.04); // накопленная ошибка убирает постоянный сдвиг
    setRate(el, base * (1 + clamp(err * 0.6 + AUD.ie[k] * 0.5, -lim, lim)));
  }
}
// браузер не даёт играть звук до первого действия игрока — запускаем музыку меню при первом клике/клавише
window.addEventListener('pointerdown', () => { if (!UI.playing && !$('menu').classList.contains('hidden')) { Snd.init(); playMenuMusic(); } });
window.addEventListener('keydown', () => { if (!UI.playing && !$('menu').classList.contains('hidden')) playMenuMusic(); });
const POSTER = new Image(); POSTER.src = 'assets/posterMermaid2Human.png';
const posterReady = () => !!(POSTER.complete && POSTER.naturalWidth);
for (const k of Object.keys(SFX)) {
  const f = SFX[k];
  SFX[k] = (...a) => {
    const el = AUD.el['sfx_' + k];
    if (el) { const n = el.cloneNode(); n.volume = SET.vol.sfx * SET.vol.master; n.play().catch(() => { }); return; }
    f(...a);
  };
}

// ============================ ЧЕРТЁЖ «ПРОЕКТ СИРЕНА» (фон меню + плакат в лабе) ============================
function sk(c, pts, seed, w = 3) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    c.lineWidth = pass ? w * 0.55 : w; c.globalAlpha = pass ? 0.5 : 0.9;
    c.beginPath();
    pts.forEach((p, i) => { const jx = (srand(seed + i * 7 + pass * 31) - 0.5) * w * 0.9, jy = (srand(seed + i * 13 + pass * 17) - 0.5) * w * 0.9; i ? c.lineTo(p[0] + jx, p[1] + jy) : c.moveTo(p[0] + jx, p[1] + jy); });
    c.stroke();
  }
  c.globalAlpha = 1;
}
function skCurve(c, pts, seed, w) { // сглаживание Catmull-Rom → ломаная для скетча
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let t = 0; t < 1; t += 0.2) {
      const t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  out.push(pts[pts.length - 1]); sk(c, out, seed, w);
}
function skEll(c, x, y, rx, ry, seed, w) { const p = []; for (let i = 0; i <= 18; i++) { const a = i / 18 * Math.PI * 2; p.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]); } skCurve(c, p, seed, w); }
function skHair(c, x, y, rw, rh, seed, w) {
  const p = []; const n = 9;
  for (let i = 0; i <= n; i++) { const a = Math.PI + i / n * Math.PI; const b = 1 + 0.18 * Math.sin(i * 2.3 + seed); p.push([x + Math.cos(a) * rw * b, y + Math.sin(a) * rh * b]); }
  p.push([x + rw * 0.8, y + rh * 0.35]); p.push([x + rw * 0.35, y + rh * 0.15]); p.push([x - rw * 0.35, y + rh * 0.15]); p.push([x - rw * 0.8, y + rh * 0.35]); p.push(p[0]);
  skCurve(c, p, seed, w);
}
function skFigure(c, x, base, Hh, legs, seed, w) {
  const u = Hh;
  skHair(c, x, base - u * 0.9, u * 0.2, u * 0.1, seed, w);
  skEll(c, x, base - u * 0.8, u * 0.055, u * 0.065, seed + 3, w);
  skCurve(c, [[x - u * 0.06, base - u * 0.72], [x - u * 0.075, base - u * 0.6], [x - u * 0.06, base - u * (legs ? 0.46 : 0.52)], [x + u * 0.06, base - u * (legs ? 0.46 : 0.52)], [x + u * 0.075, base - u * 0.6], [x + u * 0.06, base - u * 0.72], [x - u * 0.06, base - u * 0.72]], seed + 5, w);
  skCurve(c, [[x - u * 0.07, base - u * 0.7], [x - u * 0.14, base - u * 0.58], [x - u * 0.19, base - u * 0.47]], seed + 7, w);
  skCurve(c, [[x + u * 0.07, base - u * 0.7], [x + u * 0.14, base - u * 0.58], [x + u * 0.19, base - u * 0.47]], seed + 9, w);
  if (legs) {
    skCurve(c, [[x - u * 0.04, base - u * 0.46], [x - u * 0.06, base - u * 0.22], [x - u * 0.08, base]], seed + 11, w);
    skCurve(c, [[x + u * 0.04, base - u * 0.46], [x + u * 0.06, base - u * 0.22], [x + u * 0.08, base]], seed + 13, w);
  } else {
    skCurve(c, [[x - u * 0.05, base - u * 0.52], [x - u * 0.1, base - u * 0.38], [x + u * 0.02, base - u * 0.24], [x - u * 0.06, base - u * 0.1], [x + u * 0.06, base - u * 0.02], [x + u * 0.14, base - u * 0.08], [x + u * 0.08, base - u * 0.16], [x + u * 0.02, base - u * 0.08]], seed + 11, w);
    skCurve(c, [[x + u * 0.05, base - u * 0.52], [x + u * 0.04, base - u * 0.38], [x + u * 0.12, base - u * 0.26], [x + u * 0.04, base - u * 0.12]], seed + 13, w);
  }
}
function drawPlan(c, w, h, t = 0) {
  c.save();
  const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#f1e8d4'); g.addColorStop(1, '#e2d5b8');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(70,110,160,.12)'; c.lineWidth = 1;
  const gs = Math.max(12, w / 60);
  for (let x = 0; x < w; x += gs) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
  for (let y = 0; y < h; y += gs) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  c.strokeStyle = 'rgba(120,80,40,.18)'; c.lineWidth = w * 0.006; c.beginPath(); c.arc(w * 0.84, h * 0.78, w * 0.07, 0.3, 5.9); c.stroke();
  const vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(80,55,20,.35)'); c.fillStyle = vg; c.fillRect(0, 0, w, h);
  const f = Math.min(w, h);
  c.fillStyle = '#2b2b2b'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.font = '700 ' + (f * 0.055) + 'px "Courier New",monospace'; c.fillText('ПРОЕКТ «СИРЕНА»', w * 0.05, h * 0.11);
  c.font = (f * 0.028) + 'px "Courier New",monospace'; c.fillText('Образец Р-1 · программа ускоренного роста · лист 3/7', w * 0.05, h * 0.16);
  c.save(); c.translate(w * 0.5, h * 0.4); c.rotate(-0.18); c.strokeStyle = 'rgba(190,30,40,.75)'; c.fillStyle = 'rgba(190,30,40,.75)'; c.lineWidth = f * 0.008;
  c.strokeRect(-f * 0.14, -f * 0.045, f * 0.28, f * 0.08); c.font = '800 ' + (f * 0.05) + 'px "Courier New",monospace'; c.textAlign = 'center'; c.fillText('СЕКРЕТНО', 0, f * 0.018); c.restore();
  const base = h * 0.9, H3 = h * 0.6, ink = '#262626', lw = Math.max(2, f * 0.006);
  c.strokeStyle = ink;
  const x1 = w * 0.32, x2 = w * 0.66;
  skFigure(c, x1, base, H3 * 0.5, false, 11, lw);
  skFigure(c, x2, base, H3, true, 29, lw);
  sk(c, [[w * 0.18, base], [w * 0.82, base]], 51, lw * 0.6);
  const ay = base - H3 * 0.3;
  skCurve(c, [[w * 0.41, ay], [w * 0.47, ay - h * 0.02], [w * 0.53, ay]], 61, lw * 1.2);
  sk(c, [[w * 0.505, ay - h * 0.03], [w * 0.535, ay], [w * 0.5, ay + h * 0.02]], 67, lw * 1.2);
  for (const [xx, hh, lab] of [[w * 0.22, H3 * 0.5, '150 см'], [w * 0.78, H3, '300 см']]) {
    c.strokeStyle = 'rgba(40,70,140,.8)'; sk(c, [[xx, base], [xx, base - hh]], 71, lw * 0.5);
    sk(c, [[xx - f * 0.012, base - hh], [xx + f * 0.012, base - hh]], 73, lw * 0.5);
    c.fillStyle = 'rgba(40,70,140,.9)'; c.font = (f * 0.032) + 'px "Segoe Print","Comic Sans MS",cursive'; c.textAlign = 'center';
    c.fillText(lab, xx, base - hh - f * 0.02);
  }
  c.fillStyle = 'rgba(40,40,40,.85)'; c.font = (f * 0.026) + 'px "Segoe Print","Comic Sans MS",cursive'; c.textAlign = 'left';
  c.fillText('хвост → ноги (?)', w * 0.41, ay + h * 0.07);
  c.fillText('рост ×2 · голод растёт слоями', w * 0.05, h * 0.24);
  c.fillText('НЕ ДОПУСКАТЬ ЯРОСТИ', w * 0.05, h * 0.29);
  c.restore();
}

// ============================ РУКИ ЛАБОРАНТА (от первого лица) ============================
const GLOVE = '#6fa8ff', GLOVE_D = '#3f6fc0', GLOVE_L = '#9cc4ff', COAT = '#eef3f5', COAT_D = '#aebcc3';
// side: -1 левая, +1 правая; (wx,wy) — запястье; ang — направление пальцев; mode: idle | hold | point
function drawHand(c, side, wx, wy, ang, mode) {
  const sx = W / 2 + side * (W / 2 + 120), sy = H + 260;
  const dx = wx - sx, dy = wy - sy, len = Math.hypot(dx, dy);
  c.save(); c.translate(sx, sy); c.rotate(Math.atan2(dy, dx));
  c.fillStyle = COAT; c.strokeStyle = COAT_D; c.lineWidth = 3;
  rrect(c, -40, -62, len + 20, 124, 46); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(120,140,150,.35)'; c.lineWidth = 2;
  for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(len * i / 4, -40); c.quadraticCurveTo(len * i / 4 + 18, 0, len * i / 4, 40); c.stroke(); }
  c.fillStyle = GLOVE_L; c.strokeStyle = GLOVE_D; c.lineWidth = 3; rrect(c, len - 30, -48, 44, 96, 16); c.fill(); c.stroke();
  c.restore();
  c.save(); c.translate(wx, wy); c.rotate(ang); if (side < 0) c.scale(1, -1);
  c.fillStyle = GLOVE; c.strokeStyle = GLOVE_D; c.lineWidth = 3;
  const fing = (x, y, l, w, a = 0) => { c.save(); c.translate(x, y); c.rotate(a); rrect(c, 0, -w / 2, l, w, w / 2); c.fill(); c.stroke(); c.restore(); };
  if (mode === 'point') {
    // кулак, вытянут только указательный (со стороны большого пальца) — жест «тычок»
    rrect(c, -4, -38, 80, 76, 28); c.fill(); c.stroke();
    fing(64, -24, 96, 24);
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(76 - i * 3, -2 + i * 16, 16, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
    fing(18, -40, 60, 22, 0.12);
    c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(80, -30); c.lineTo(148, -30); c.stroke();
  } else if (mode === 'hold') {
    rrect(c, -4, -40, 82, 80, 30); c.fill(); c.stroke();
    for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(80, -27 + i * 18, 14, 10, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
    fing(20, -44, 54, 22, -0.35);
  } else {
    rrect(c, -4, -40, 82, 80, 30); c.fill(); c.stroke();
    const L = [54, 64, 60, 48];
    for (let i = 0; i < 4; i++) fing(66, -28 + i * 18.5, L[i], 17, (i - 1.5) * 0.06);
    fing(16, -40, 52, 21, -0.75);
  }
  c.strokeStyle = 'rgba(255,255,255,.3)'; c.lineWidth = 4; c.beginPath(); c.moveTo(8, -24); c.quadraticCurveTo(36, -30, 60, -22); c.stroke();
  c.restore();
}
