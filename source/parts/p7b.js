
// ============================ СОХРАНЕНИЕ ============================
const SAVE_KEY = 'kolba_save_v1';
function saveGame() { if (!G || G.ended) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(G, (k, v) => k[0] === '_' ? undefined : v)); } catch (e) { } }
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); if (!s) return null; const g = JSON.parse(s); return g && g.ver === 1 ? g : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
const PITCH_DOWN = 1.45, PITCH_UP = 0.47; // ~83° вниз (под себя), ~27° вверх (как было)
function migrate(g) {
  if (g.player && Math.abs(g.player.pitch) > 2) g.player.pitch = Math.atan(g.player.pitch / FOCAL); // старые сейвы: наклон был в пикселях
  if (g.stage === undefined) { g.stage = STAGES.length - 1; g.step = 0; g.flags = {}; g.god = false; }
  if (!g.ents.some(e => e.type === 'funnel')) g.ents.push({ type: 'funnel', x: FUNNEL.x, z: FUNNEL.z, y: 0, vx: 0, vy: 0, vz: 0, rad: 0.45, stat: true, id: g.nextId++ });
  const U = g.up || {};
  for (const m of g.ents) {
    if (m.type === 'inc' && !m.up) m.up = { speed: U.incSpeed || 0, protect: U.protect || 0, auto: U.autoInc || 0, quality: U.quality || 0, paint: 0 };
    if (m.type === 'press' && !m.up) m.up = { speed: U.pressSpeed || 0, auto: U.autoPress || 0 };
    if ((m.type === 'inc' || m.type === 'press' || m.type === 'funnel') && m.face === undefined) m.face = Math.atan2(6 - m.z, 0 - m.x);
    if (m.type === 'term' && m.face === undefined) m.face = 0;
    if (m.type === 'bin' && m.face === undefined) m.face = Math.PI;
  }
  g.drawings = { ryb: true, cutlet: true, bow: true, flower: true, plate: true, sticker: true, pendant: true, earrings: true, bracelet: true };
  if (g.prestige === undefined) g.prestige = 0;
  if (g.runEarned === undefined) g.runEarned = g.stats.earned || 0;
  g.goals = g.goals || {}; g.newUnl = g.newUnl || {};
  if (!g.run) g.run = { best: g.bonus.best || 0, pressRyb: g.flags.pressRybHint ? 1 : 0 };
  delete g.dom;
}
function initTransient() {
  G._msgs = []; G._parts = []; G._coinFx = []; G._floaters = []; G._hits = []; G._target = null; G._eLock = null; G._poke = null; G._punch = 0; G._flash = 0; G._banner = null; G._stepFlash = 0;
  for (const s of ['L', 'R']) Object.assign(G.hands[s], { down: false, charging: false, charge: 0, throwT: 0 });
  G.ents.forEach(e => { if (e.type === 'inc') e.hold = false; });
}
function spawnWorld() {
  addEnt({ type: 'funnel', x: FUNNEL.x, z: FUNNEL.z, rad: 0.45, stat: true, face: Math.atan2(6 - FUNNEL.z, 0 - FUNNEL.x) });
  addEnt({ type: 'pad', x: -9.0, z: 8.9 });
  mkRyb(-1.4, 5.6, 1); mkRyb(1.9, 5.2, 1); mkRyb(0.2, 4.6, 1);
}
function startGame(saved, mode) {
  clear3D();
  if (saved) { G = saved; migrate(G); } else { clearSave(); G = newState({ mode: mode || 'proto' }); spawnWorld(); }
  MA = newAnim(); initTransient();
  UI.playing = true; UI.pause = UI.shop = UI.help = UI.cheat = UI.settings = false; UI.endShown = false; UI.speed = 1;
  for (const id of ['ovPlay', 'ovEnd', 'ovPause']) showOv(id, false);
  $('menu').classList.add('out'); setTimeout(() => $('menu').classList.add('hidden'), 600);
  Snd.init(); Snd.resume(); applySettings(); stopLayers(); stopEndingMusic(); playMenuMusic();
  if (!saved) { UI.intro = true; showOv('ovIntro', true); UI.iris = { t0: performance.now(), hold: true }; }
  else { UI.intro = false; say('Смена продолжается.', '#6ff0d9'); UI.iris = { t0: performance.now() }; lockPointer(); }
}
function beginShift() {
  UI.intro = false; showOv('ovIntro', false); lockPointer();
  UI.iris = { t0: performance.now() };
  G._stageFx = { head: 'ЭТАП 1 · ' + STAGES[0].name.toUpperCase(), sub: STAGES[0].unlock }; SFX.good();
}
// IRIS OUT: чёрная полупрозрачная шторка раскрывается кругом от центра и тает
function drawIris(c) {
  const I = UI.iris; if (!I) return;
  if (I.hold) { c.fillStyle = 'rgba(0,0,0,.92)'; c.fillRect(0, 0, W, H); return; }
  const t = (performance.now() - I.t0) / 1000, D = 1.8;
  if (t > D + 0.5) { UI.iris = null; return; }
  const p = clamp(t / D, 0, 1), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const R = 16 + e * (Math.hypot(W, H) / 2 + 20), fade = 1 - clamp((t - D) / 0.5, 0, 1) * 1;
  c.save();
  c.fillStyle = 'rgba(0,0,0,' + (0.9 * fade) + ')';
  c.beginPath(); c.rect(0, 0, W, H); c.arc(W / 2, H / 2, R + 70, 0, Math.PI * 2, true); c.fill();
  const g = c.createRadialGradient(W / 2, H / 2, R, W / 2, H / 2, R + 70);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,' + (0.9 * fade) + ')');
  c.fillStyle = g; c.beginPath(); c.arc(W / 2, H / 2, R + 70.5, 0, Math.PI * 2); c.fill();
  c.restore();
}
function toMenu() {
  saveGame(); releaseInputs();
  UI.playing = false; UI.pause = UI.shop = UI.help = UI.cheat = UI.settings = UI.intro = false; UI.iris = null;
  for (const id of ['ovPause', 'ovShop', 'ovHelp', 'ovCheat', 'ovEnd', 'ovIntro']) showOv(id, false);
  G = null; showMenu();
}

// ============================ КОНЦОВКИ ============================
const ENDINGS = {
  1: { title: 'Концовка 1 — Тишина', text: {
    glass: 'Стекло не выдержало её ярости. Вода ушла в стоки за минуту. Она ещё долго щёлкала на мокром полу — пока щелчки не стали тише твоего дыхания.',
    starve: 'Щелчки становились всё реже. В одну из смен ты пришёл(ла) — а в колбе была только тишина и медленно оседающие чешуйки.' } },
  2: { title: 'Концовка 2 — Колба стала мала', text: { grow: 'Она выросла. Ноги, о которых мечтала русалочка, — и память обо всём: о голоде, о ярости, о прессе за стеклом. Колба лопнула от её роста. Последнее, что ты слышишь, — мягкий щелчок. Почти ласковый.' } },
  3: { title: 'Концовка 3 — На руках', text: { grow: 'Колба лопнула от её роста. Она шагнула на новых ногах, подняла тебя на руки — бережно, как ты когда-то держал(а) рыыбчеллов, — и вынесла из лаборатории. Снаружи пахнет морем.' } }
};
function endGame(type, reason) {
  if (G.ended) return;
  G.ended = { type, reason, t: 0, cues: {} };
  playEndingMusic(type);
  MA.echoes = []; MA.hearts = []; MA.tears = [];
  releaseInputs();
  UI.shop = UI.help = UI.cheat = UI.pause = UI.settings = false; ['ovShop', 'ovHelp', 'ovCheat', 'ovPause', 'ovSettings'].forEach(id => showOv(id, false));
  UI.playing = false; UI.iris = null; clearSave();
}
function endPose(kind) {
  return { tilt: 0, headTilt: kind === 'carry' ? 0.12 : 0, legT: kind === 'dead' ? 0 : 1, curl: kind === 'dead' ? 0.3 : 0, swim: kind === 'dead' ? 0 : 0.3, swimSpd: 1,
    face: kind === 'dead' ? 'sad' : kind === 'kill' ? 'rage' : 'love', lid: kind === 'dead' ? 1 : 0, blush: kind === 'carry' ? 1 : 0,
    pale: kind === 'dead' ? 1 : 0, cards: null, rage: kind === 'kill', handBig: null, gazeDown: 0,
    handL: kind === 'kill' ? { x: -0.2, y: -0.7 } : kind === 'carry' ? { x: -0.2, y: -0.3 } : { x: -0.25, y: -0.2 },
    handR: kind === 'kill' ? { x: 0.2, y: -0.72 } : kind === 'carry' ? { x: 0.2, y: -0.33 } : { x: 0.2, y: 0.0 } };
}
// лаборант(ка): белый халат, синие перчатки, пучок. Начало координат — таз, «вверх» = -y, масштаб: s px на метр
function drawPerson(c, x, y, s, rot, swing = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.lineCap = 'round';
  c.strokeStyle = '#2b3440'; c.lineWidth = 0.12;
  c.beginPath(); c.moveTo(-0.06, 0); c.lineTo(-0.08 + swing * 0.1, 0.78); c.moveTo(0.06, 0); c.lineTo(0.08 - swing * 0.1, 0.78); c.stroke();
  c.fillStyle = '#1a1f26'; ell(c, -0.08 + swing * 0.1, 0.82, 0.08, 0.04); c.fill(); ell(c, 0.08 - swing * 0.1, 0.82, 0.08, 0.04); c.fill();
  c.fillStyle = '#f2f6f7'; c.strokeStyle = '#aebcc3'; c.lineWidth = 0.02;
  c.beginPath(); c.moveTo(-0.17, -0.55); c.lineTo(0.17, -0.55); c.lineTo(0.22, 0.28); c.lineTo(-0.22, 0.28); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#cfd9de'; c.beginPath(); c.moveTo(0, -0.5); c.lineTo(0, 0.28); c.stroke();
  c.strokeStyle = '#f2f6f7'; c.lineWidth = 0.09;
  c.beginPath(); c.moveTo(-0.16, -0.5); c.lineTo(-0.22, -0.12 - swing * 0.1); c.moveTo(0.16, -0.5); c.lineTo(0.22, -0.12 + swing * 0.1); c.stroke();
  c.fillStyle = GLOVE; circ(c, -0.22, -0.08 - swing * 0.1, 0.05); c.fill(); circ(c, 0.22, -0.08 + swing * 0.1, 0.05); c.fill();
  c.fillStyle = '#ffd9cc'; circ(c, 0, -0.7, 0.12); c.fill();
  c.fillStyle = '#3a2a2a'; c.beginPath(); c.arc(0, -0.72, 0.125, Math.PI, 0); c.fill(); circ(c, 0, -0.85, 0.06); c.fill();
  c.strokeStyle = '#3a2440'; c.lineWidth = 0.012;
  c.beginPath(); c.arc(-0.04, -0.69, 0.018, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); c.beginPath(); c.arc(0.04, -0.69, 0.018, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  c.fillStyle = 'rgba(255,120,150,.45)'; ell(c, -0.07, -0.65, 0.025, 0.013); c.fill(); ell(c, 0.07, -0.65, 0.025, 0.013); c.fill();
  c.restore();
}
function cue(name, fn) { if (!G.ended.cues[name]) { G.ended.cues[name] = 1; fn(); } }
function caption(c, s, a) { c.globalAlpha = a; c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, H - 92, W, 50); txtO(c, s, W / 2, H - 67, 22, '#fff'); c.globalAlpha = 1; }
function renderEnding(c, dt) {
  const E = G.ended; E.t += dt; const t = E.t;
  G.t += dt;
  c.setTransform(RES, 0, 0, RES, 0, 0);
  const unit = merHeight() / 1.87;
  if (E.type === 1) {
    c.fillStyle = '#050809'; c.fillRect(0, 0, W, H);
    if (Math.sin(t * 13) + Math.sin(t * 7.3) > -0.7) {
      const g = c.createRadialGradient(W / 2, 80, 20, W / 2, 420, 560); g.addColorStop(0, 'rgba(200,240,255,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    c.fillStyle = 'rgba(60,120,150,.35)'; ell(c, W / 2, 580, 520, 80); c.fill();
    c.fillStyle = 'rgba(200,240,255,.35)';
    for (let i = 0; i < 16; i++) { const x = 180 + srand(i) * 920, y = 540 + srand(i + 9) * 90; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 20 + srand(i + 3) * 30, y - 8); c.lineTo(x + 8, y + 10); c.fill(); }
    c.save(); c.translate(W / 2 + 40, 545); c.rotate(-Math.PI / 2 + 0.06); drawMermaid(c, 0, 0, 260, endPose('dead')); c.restore();
    cue('s', () => SFX.hum());
  } else if (E.type === 2) {
    c.fillStyle = '#0a0204'; c.fillRect(0, 0, W, H);
    const zoom = t < 3 ? 1 : 1 + (t - 3) * 3;
    if (t < 4.2) {
      const g = c.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 700); g.addColorStop(0, 'rgba(120,0,20,.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const k = 300 * zoom;
      c.save(); c.translate(W / 2, 240 + 0.62 * unit * k); c.rotate(Math.sin(t * 0.7) * 0.05); drawMermaid(c, 0, 0, k, endPose('kill')); c.restore();
      cue('a', () => SFX.echo(true));
      if (t > 3.4) cue('b', () => { SFX.chomp(10); SFX.scream(); shake(400, 0.02); });
    }
  } else {
    // 3: «На руках» — А) тянется к тебе, Б) несёт тебя на руках к выходу, В) снаружи море
    if (t < 3.5) {
      c.fillStyle = '#15232a'; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(200,240,255,.3)';
      for (let i = 0; i < 18; i++) { const x = srand(i) * W, y = 420 + srand(i + 5) * 300; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30, y - 12); c.lineTo(x + 10, y + 14); c.fill(); }
      const k = 380 + t * 60;
      c.save(); c.translate(W / 2, 260 + 0.62 * unit * k); drawMermaid(c, 0, 0, k, endPose('carry')); c.restore();
      const reach = clamp(t / 3, 0, 1);
      for (const s of [-1, 1]) { const x = W / 2 + s * (360 - reach * 170), y = H + 80 - reach * 170; c.fillStyle = '#ffd9cc'; c.strokeStyle = '#f0b4a4'; c.lineWidth = 4; circ(c, x, y, 70); c.fill(); c.stroke(); }
      caption(c, 'Она тянется к тебе…', clamp(t - 0.5, 0, 1));
      cue('a', () => SFX.love());
    } else if (t < 10) {
      const tt = t - 3.5, scroll = tt * 160;
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1f3a42'); g.addColorStop(1, '#2c4c55'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = '#3a5960'; c.fillRect(0, H * 0.78, W, H * 0.22);
      c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 2;
      for (let i = -1; i < 8; i++) { const x = ((i * 220 - scroll) % 1540 + 1540) % 1540 - 220; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H * 0.78); c.stroke(); }
      const dx = W + 260 - tt * 170;
      if (dx > -300) {
        c.fillStyle = '#3d4d55'; c.fillRect(dx, H * 0.22, 240, H * 0.56);
        const open = clamp((tt - 4.2) / 1.2, 0, 1);
        const lg = c.createLinearGradient(dx, 0, dx + 240, 0); lg.addColorStop(0, 'rgba(255,240,200,' + open + ')'); lg.addColorStop(1, 'rgba(255,200,150,' + open + ')');
        c.fillStyle = lg; c.fillRect(dx + 10, H * 0.24, 220, H * 0.54);
        c.fillStyle = '#2bd46a'; c.fillRect(dx + 60, H * 0.14, 120, 34); txt(c, 'ВЫХОД', dx + 120, H * 0.14 + 17, 20, '#fff');
      }
      const sc = H * 0.7 / 1.69, k = sc / unit, bob = Math.abs(Math.sin(tt * 5)) * 8, mx = W * 0.4 + Math.min(tt, 5) * 25;
      const my = H * 0.8 - 0.95 * sc + bob;
      c.save(); c.translate(mx, my); drawMermaid(c, 0, 0, k, endPose('carry')); c.restore();
      const py = my - 0.3 * sc;
      drawPerson(c, mx + 0.02 * sc, py, sc * 0.5, Math.PI / 2 + 0.15, Math.sin(tt * 5) * 0.3);
      c.fillStyle = '#ffd9cc'; c.strokeStyle = '#f0b4a4'; c.lineWidth = 2;
      circ(c, mx - 0.2 * sc, py + 0.05 * sc, 0.03 * sc); c.fill(); c.stroke(); circ(c, mx + 0.2 * sc, py + 0.02 * sc, 0.03 * sc); c.fill(); c.stroke();
      for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(255,90,140,.8)'; heart(c, mx + Math.sin(tt * 2 + i) * 60, my - 0.8 * sc - ((tt * 40 + i * 30) % 120), 10); c.fill(); }
      caption(c, '…она поднимает тебя на руки и уносит из лаборатории', clamp(tt - 0.3, 0, 1));
      if (tt > 5.4) { c.fillStyle = 'rgba(255,245,225,' + clamp((tt - 5.4) / 1.1, 0, 1) + ')'; c.fillRect(0, 0, W, H); }
    } else {
      const tt = t - 10;
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffb38a'); g.addColorStop(0.5, '#ff8fa8'); g.addColorStop(0.62, '#6c78c8'); g.addColorStop(1, '#e8c89a');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = '#ffe9b0'; circ(c, W * 0.72, H * 0.5, 70); c.fill();
      c.fillStyle = '#5663b0'; c.fillRect(0, H * 0.55, W, H * 0.15);
      c.fillStyle = 'rgba(255,240,200,.6)'; for (let i = 0; i < 20; i++) c.fillRect(W * 0.72 - 120 + srand(i) * 240 + Math.sin(tt * 2 + i) * 6, H * 0.56 + srand(i + 3) * 70, 26, 3);
      c.fillStyle = '#e3c48f'; c.fillRect(0, H * 0.7, W, H * 0.3);
      const sc = H * 0.46 / 1.69, k = sc / unit, mx = W * 0.25 + tt * 40, my = H * 0.84 - 0.95 * sc;
      c.save(); c.globalAlpha = 0.85; c.filter = 'brightness(0.25)';
      c.save(); c.translate(mx, my); drawMermaid(c, 0, 0, k, endPose('carry')); c.restore();
      drawPerson(c, mx, my - 0.3 * sc, sc * 0.5, Math.PI / 2 + 0.15, 0.2);
      c.restore(); c.filter = 'none'; c.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(255,90,140,.7)'; heart(c, W / 2 + Math.sin(tt + i) * 320, H - ((tt * 60 + i * 110) % H), 14); c.fill(); }
      caption(c, 'Снаружи пахнет морем.', clamp(tt, 0, 1));
      if (tt < 1) { c.fillStyle = 'rgba(255,245,225,' + (1 - tt) + ')'; c.fillRect(0, 0, W, H); }
    }
  }
  if (t > 1.2) { c.globalAlpha = clamp((t - 1.2) / 1.5, 0, 1); txtO(c, ENDINGS[E.type].title, W / 2, 60, 32, '#fff'); c.globalAlpha = 1; }
  if (t > (E.type === 3 ? 13 : 7) && !UI.endShown) {
    UI.endShown = true;
    const S = G.stats;
    $('endTitle').textContent = ENDINGS[E.type].title;
    $('endText').textContent = ENDINGS[E.type].text[E.reason] || '';
    $('endStats').innerHTML = `Смена: ${Math.floor(G.t / 60)} мин · Рост: ${Math.round(merHeight() * 100)} см · Отношение: ${Math.round(G.mer.rel)}/100 · Престиж: ${G.prestige || 0}<br>
      Выращено рыыбчеллов: ${S.made} · Брак: ${S.old} · Раздавлено: ${S.pressed} · Котлет: ${S.cutlets}<br>
      Скормлено: ${S.fed} · Лучший бонус: x${Math.max(S.bestStreak, G.bonus.best)} · Хотелок: ${S.wishes} · Ярость: ${S.rages} раз · Заработано: ${fmt(S.earned)}<br>
      <span class="note">Концовка 3 требует Отношения ≥ 60 к моменту, когда она вырастет.</span>`;
    showOv('ovEnd', true);
  }
}

// ============================ PHASER-СЦЕНА ============================
class Lab extends Phaser.Scene {
  constructor() { super('lab'); }
  create() {
    SCENE = this;
    this.tex = this.textures.createCanvas('view', W * RES, H * RES);
    ctx = this.tex.getContext();
    this.add.image(0, 0, 'view').setOrigin(0, 0).setDepth(0);
    this.input.mouse.disableContextMenu();
    this.saveT = 0;
    this.input.on('pointerdown', p => {
      if (!G || !UI.playing || uiOpen()) return;
      if (!this.input.mouse.locked) { lockPointer(); return; }
      if (p.button === 0) handDown('L'); else if (p.button === 2) handDown('R');
    });
    this.input.on('pointerup', p => {
      if (!G || !UI.playing || uiOpen()) return;
      if (p.button === 0) handUp('L'); else if (p.button === 2) handUp('R');
    });
    // мышь копим за кадр и отсекаем всплески (браузеры иногда выдают скачок movementX при клике)
    this.input.on('pointermove', p => {
      if (!G || !UI.playing || uiOpen() || !this.input.mouse.locked) return;
      const dx = p.movementX || 0, dy = p.movementY || 0;
      if (Math.abs(dx) > 250 || Math.abs(dy) > 250) return;
      UI.mdx += dx; UI.mdy += dy;
    });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && UI.playing && !uiOpen() && G && !G.ended) { releaseInputs(); UI.pause = true; showOv('ovPause', true); }
    });
  }
  applyMouse() {
    const dx = clamp(UI.mdx, -200, 200), dy = clamp(UI.mdy, -200, 200); UI.mdx = UI.mdy = 0;
    if (G._eLock && G._eLock.part === 'lever') { onSwipe(dy); return; }
    G.player.yaw += dx * 0.0026 * SET.sens;
    G.player.pitch = clamp(G.player.pitch - dy * 0.9 / FOCAL * SET.sens * (SET.invertY ? -1 : 1), -PITCH_DOWN, PITCH_UP);
  }
  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    musicTick(dt);
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    if (!G) { ctx.fillStyle = '#061318'; ctx.fillRect(0, 0, W, H); this.tex.refresh(); IN.just = {}; return; }
    if (G.ended) { renderEnding(ctx, dt); this.tex.refresh(); IN.just = {}; return; }
    this.applyMouse();
    if (!simPaused()) for (let i = 0; i < UI.speed; i++) { simStep(dt); if (G.ended) break; }
    if (G.ended) { this.tex.refresh(); return; }
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    renderWorld(ctx); resolveTarget(); renderHUD(ctx); drawIris(ctx);
    if (!this.input.mouse.locked && UI.playing && !uiOpen() && !UI.iris) {
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, H - 190, W, 50); txtO(ctx, 'Кликни по экрану, чтобы управлять', W / 2, H - 165, 20, '#fff');
    }
    if (UI.shop) $('shopCoins').textContent = '🪙 ' + fmt(G.coins);
    this.tex.refresh();
    IN.just = {};
    this.saveT += delta / 1000; if (this.saveT > 20) { this.saveT = 0; saveGame(); }
  }
}

// ============================ КЛАВИШИ-ДЕЙСТВИЯ ============================
function onKeyAction(e) {
  if (e.code === 'Escape') {
    if (UI.confirm) { UI.confirm = false; showOv('ovConfirm', false); }
    else if (UI.settings) closeSettings(); else if (UI.shop) closeShop(); else if (UI.help) closeHelp(); else if (UI.cheat) closeCheat();
    else if (!$('ovPlay').classList.contains('hidden')) showOv('ovPlay', false);
    else if (!$('ovCredits').classList.contains('hidden')) showOv('ovCredits', false);
    return;
  }
  if (UI.playing && (e.code === 'Tab' || e.code === 'Space' || e.code === SET.keys.terminal)) e.preventDefault();
  if (!UI.playing || UI.intro || UI.confirm || UI.settings) return;
  const a = inAction(e.code);
  if (a === 'terminal') toggleShop();
  else if (a === 'help') toggleHelp();
  else if (a === 'cheat') toggleCheat();
}

// ============================ ИНТРО И ГЛАВНОЕ МЕНЮ ============================
function drawMenuBg() {
  const cv = $('menuBg'), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
  const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = innerWidth, h = innerHeight;
  c.fillStyle = '#0b1316'; c.fillRect(0, 0, w, h);
  const ar = 1672 / 941, pw = Math.min(w * 0.74, h * 0.68 * ar), ph = pw / ar, px = w - pw - w * 0.04, py = h - ph - h * 0.05;
  c.save(); c.translate(px + pw / 2, py + ph / 2); c.rotate(-0.02); c.translate(-pw / 2, -ph / 2);
  c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 40; c.fillStyle = '#e8dfca'; c.fillRect(0, 0, pw, ph); c.shadowBlur = 0;
  if (posterReady()) c.drawImage(POSTER, 0, 0, pw, ph); else drawPlan(c, pw, ph);
  c.fillStyle = 'rgba(200,200,190,.6)'; c.save(); c.translate(pw * 0.5, -8); c.rotate(0.04); c.fillRect(-50, 0, 100, 26); c.restore();
  c.restore();
}
function showMenu() {
  showOv('menu', true); $('menu').classList.remove('hidden', 'out');
  $('bCont').classList.toggle('hidden', !loadSave());
  drawMenuBg();
  playMenuMusic();
}
POSTER.addEventListener('load', () => { if (!$('menu').classList.contains('hidden')) drawMenuBg(); });
function runSplash() {
  const sp = $('splash'); let done = false;
  const finish = () => { if (done) return; done = true; sp.classList.add('out'); setTimeout(() => { sp.classList.add('hidden'); }, 800); showMenu(); };
  setTimeout(() => sp.classList.add('show'), 60);
  setTimeout(finish, 3000);
  sp.addEventListener('click', finish); window.addEventListener('keydown', function k() { finish(); window.removeEventListener('keydown', k); });
}
window.addEventListener('resize', () => { if (!$('menu').classList.contains('hidden')) drawMenuBg(); });
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => { const id = b.dataset.close; if (id === 'ovSettings') closeSettings(); else showOv(id, false); });
$('mPlay').onclick = () => { Snd.init(); Snd.resume(); $('bCont').classList.toggle('hidden', !loadSave()); showOv('ovPlay', true); };
$('mSettings').onclick = () => { Snd.init(); openSettings(); };
$('mCredits').onclick = () => showOv('ovCredits', true);
document.querySelectorAll('[data-newgame]').forEach(b => b.onclick = () => {
  const go = () => startGame(null, b.dataset.newgame);
  if (loadSave()) { showOv('ovPlay', false); confirmBox('Новая смена?', 'Текущее сохранение будет удалено.', go); } else go();
});
$('bCont').onclick = () => { const s = loadSave(); if (s) startGame(s); };
$('bIntro').onclick = beginShift;
$('bResume').onclick = () => { UI.pause = false; showOv('ovPause', false); Snd.resume(); lockPointer(); };
$('bSetP').onclick = () => { UI.pause = false; showOv('ovPause', false); openSettings(); };
$('bMenu').onclick = toMenu;
$('bEndNew').onclick = () => { showOv('ovEnd', false); G = null; showMenu(); };
$('bCloseShop').onclick = closeShop;
$('bCloseHelp').onclick = closeHelp;
$('bCloseCheat').onclick = closeCheat;
$('ovShop').addEventListener('click', onShopClick);
$('ovShop').addEventListener('mousemove', tipMove);
$('ovShop').addEventListener('mouseleave', () => $('tip').classList.remove('on'));
$('cheatBody').addEventListener('click', ev => {
  const b = ev.target.closest('[data-cheat]'); if (!b || !G) return;
  const [i, j] = b.dataset.cheat.split('|').map(Number);
  CHEATS[i][1][j][1](); SFX.click(); if (UI.cheat) renderCheat();
});
window.addEventListener('beforeunload', () => saveGame());

setFov(SET.fov); loadAudioFiles(); init3D();
new Phaser.Game({
  type: Phaser.CANVAS, parent: 'game', width: W * RES, height: H * RES, backgroundColor: '#03080a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { noAudio: true }, scene: [Lab]
});
runSplash();
</script>
</body>
</html>
