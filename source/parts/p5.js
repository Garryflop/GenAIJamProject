
// ============================ СЕРВИС ============================
function say(text, col) { G._msgs.push({ text, t: G.t, col }); if (G._msgs.length > 30) G._msgs.shift(); }
function popText(x, y, text, col = '#ffd166', size = 26) {
  if (!G || !G._floaters) return;
  G._floaters.push({ x, y, text, col, size, t: 0 });
  if (G._floaters.length > 30) G._floaters.shift();
}
function addCoins(n, fx = false) {
  n = Math.round(n * (1 + 0.1 * (G.prestige || 0))); if (n <= 0) return;
  G.coins += n; G.stats.earned += n; G.runEarned = (G.runEarned || 0) + n; checkUnlocks();
  if (fx) for (let i = 0; i < Math.min(6, 1 + (n >> 3)); i++) G._coinFx.push({ x: W / 2 + rnd(-60, 60), y: H / 2 - 60 + rnd(-30, 30), t: -i * 0.05 });
}
function parts(x, y, z, n, col, spd = 2, size = 0.04, life = 0.8, g = 6) {
  for (let i = 0; i < n; i++) G._parts.push({ x, y, z, vx: rnd(-spd, spd), vy: rnd(0, spd * 1.3), vz: rnd(-spd, spd), life: life * rnd(0.6, 1), max: life, col, size: size * rnd(0.6, 1.3), g });
}
function shake(ms, amt) { if (SCENE && SET.shake) SCENE.cameras.main.shake(ms, amt); }
function rybCount() { let n = 0; for (const e of G.ents) if (e.type === 'ryb') n++; for (const s of ['L', 'R']) if (G.hands[s].item && G.hands[s].item.type === 'ryb') n++; return n; }
function scareRybs(x, z, rad, t) { for (const e of G.ents) if (e.type === 'ryb' && hyp(e.x, e.z, x, z) < rad) { e.fearT = Math.max(e.fearT, t); e.fx = x; e.fz = z; e.worT = 0; } }

// ============================ ИГРОК ============================
function collideCircle(o, r, tankR = TANK.r + 0.3) {
  o.x = clamp(o.x, -ROOM + r, ROOM - r); o.z = clamp(o.z, -ROOM + r, ROOM - r);
  let d = hyp(o.x, o.z, TANK.x, TANK.z), m = tankR + r;
  if (d < m) { const k = m / Math.max(d, 1e-3); o.x = TANK.x + (o.x - TANK.x) * k; o.z = TANK.z + (o.z - TANK.z) * k; }
  for (const e of G.ents) {
    if (!e.stat || e === o) continue;
    d = hyp(o.x, o.z, e.x, e.z); m = e.rad + r;
    if (d < m && d > 1e-4) { const k = m / d; o.x = e.x + (o.x - e.x) * k; o.z = e.z + (o.z - e.z) * k; }
  }
}
function updPlayer(dt) {
  const p = G.player;
  if (uiOpen()) { p.vx = p.vz = 0; return; }
  p.crouch = inDown('crouch');
  const run = inDown('run') && G.up.run > 0 && !p.crouch;
  if (inPressed('run') && !G.up.run) say('Бег — прокачка «Персонаж» в терминале', '#8db2b6');
  const sp = p.crouch ? 1.7 : run ? 5.8 : 3.2;
  const fx = Math.cos(p.yaw), fz = Math.sin(p.yaw), rx = -fz, rz = fx;
  let mx = 0, mz = 0;
  if (inDown('forward')) { mx += fx; mz += fz; } if (inDown('back')) { mx -= fx; mz -= fz; }
  if (inDown('right')) { mx += rx; mz += rz; } if (inDown('left')) { mx -= rx; mz -= rz; }
  const l = Math.hypot(mx, mz); if (l > 0) { mx /= l; mz /= l; }
  const a = clamp(dt * 12, 0, 1);
  p.vx = lerp(p.vx, mx * sp, a); p.vz = lerp(p.vz, mz * sp, a);
  p.x += p.vx * dt; p.z += p.vz * dt;
  if (l > 0 && p.y <= 0) p.bob += dt * sp * 1.9;
  if (inPressed('jump')) {
    if (G.up.jump && p.y <= 0.001) { p.vy = 4.4; SFX.jump(); } else if (!G.up.jump) say('Прыжок — прокачка «Персонаж» в терминале', '#8db2b6');
  }
  p.vy -= 13 * dt; p.y += p.vy * dt; if (p.y < 0) { p.y = 0; p.vy = 0; }
  collideCircle(p, 0.35);
}

// ============================ ФИЗИКА ПРЕДМЕТОВ ============================
function updFlying(e, dt) {
  e.vy -= 9.8 * dt;
  e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
  const lim = ROOM - 0.2;
  if (e.x < -lim) { e.x = -lim; e.vx = -e.vx * 0.4; } if (e.x > lim) { e.x = lim; e.vx = -e.vx * 0.4; }
  if (e.z < -lim) { e.z = -lim; e.vz = -e.vz * 0.4; } if (e.z > lim) { e.z = lim; e.vz = -e.vz * 0.4; }
  if (e.y > CEIL - 0.2) { e.y = CEIL - 0.2; e.vy = -Math.abs(e.vy) * 0.3; }
  if (e.type === 'tool' && e.kind === 'box' && e.load.length < 8) {
    for (const o of G.ents.slice()) {
      if (o === e || e.load.length >= 8 || o.inPress || !['ryb', 'cutlet', 'mass', 'pack'].includes(o.type)) continue;
      if (hyp(o.x, o.z, e.x, e.z) < 0.65 && e.y - (o.y || 0) < 1.3) { rmEnt(o); if (o.type === 'ryb') { rmCarry(o); SFX.squeak(); } o.air = false; e.load.push(o); SFX.pick(); }
    }
  }
  const T = TANK, d = hyp(e.x, e.z, T.x, T.z);
  const df = hyp(e.x, e.z, FUNNEL.x, FUNNEL.z);
  if (df < 0.6 && e.y < 1.8 && e.y > 0.85 && e.vy < 0.5) { feedEnt(e, 'funnel'); return; }
  if (d < T.r + 0.12 && e.y < T.top + 0.35) {
    const nx = (e.x - T.x) / (d || 1), nz = (e.z - T.z) / (d || 1), vr = e.vx * nx + e.vz * nz;
    if (vr < 0) { e.vx -= 1.3 * vr * nx; e.vz -= 1.3 * vr * nz; e.vx *= 0.35; e.vz *= 0.35; if (Math.abs(vr) > 2) { SFX.knock(); if (!G.mer.rage && Math.random() < 0.5) MA.tapT = 1.2; } }
    e.x = T.x + nx * (T.r + 0.13); e.z = T.z + nz * (T.r + 0.13);
  }
  if (e.y < 1.4) {
    for (const m of G.ents) {
      if (m.type === 'bin' && hyp(e.x, e.z, m.x, m.z) < 0.6) { dispose(e); return; }
      if (e.type === 'ryb' && m.type === 'press' && !m.slot && hyp(e.x, e.z, m.x, m.z) < 0.7) { putInPress(e, m); return; }
    }
  }
  if (e.y <= 0) {
    e.y = 0;
    if (Math.abs(e.vy) > 1.6) { e.vy = -e.vy * 0.3; e.vx *= 0.55; e.vz *= 0.55; if (e.type === 'ryb') SFX.squeak(); else SFX.thud(); }
    else { e.vy = 0; e.vx = 0; e.vz = 0; e.air = false; if (e.type === 'ryb') { e.fearT = Math.max(e.fearT, 1.2); e.fx = G.player.x; e.fz = G.player.z; e.memT = 5; } }
  }
}
function dispose(e) {
  rmEnt(e); SFX.drop();
  if (e.type === 'mass') { addCoins(1); say('Старая масса утилизирована (+1)', '#8db2b6'); }
  else if (e.type === 'ryb') { say('Рыыбчелл утилизирован... заживо.', '#ffb347'); SFX.scream(); }
  else say('Утилизировано', '#8db2b6');
}
function putInPress(r, p) {
  const byPlayer = !r.carried;
  rmCarry(r);
  p.slot = r.id; r.inPress = p.id; r.x = p.x; r.z = p.z; r.y = 0; r.air = false; r.vx = r.vy = r.vz = 0; r.worT = 0;
  if (!G.ents.includes(r)) G.ents.push(r);
  SFX.squeak();
  if (byPlayer) progress('slot');
}
function rmCarry(r) {
  r.carried = null;
  for (const e of G.ents) if (e.type === 'ryb' && e.haul === r.id) e.haul = null;
}

// ============================ КОРМЛЕНИЕ ============================
function feedEnt(e, via) {
  rmEnt(e); e.air = false;
  const far = e.thrownFrom && hyp(e.thrownFrom.x, e.thrownFrom.z, FUNNEL.x, FUNNEL.z) > 5;
  funnelFx();
  if (e.type === 'tool') { const load = e.load || []; e.load = []; for (const d of load) pushFood(d, far); }
  pushFood(e, far);
  if (e.type !== 'pack') { progress('feed'); if (e.thrownFrom) progress('throwFeed'); }
}
function feedList(list) { funnelFx(); list.forEach(c => pushFood(c, false)); if (list.length) progress('feed'); }
function funnelFx() { SFX.splash(); Snd.tone(260, 0.3, 'sine', 0.12, 900); parts(FUNNEL.x, 1.5, FUNNEL.z, 10, 'rgba(255,220,120,.9)', 1.2, 0.03, 0.5); }
function pushFood(e, far) {
  MA.food.push({ e, h: TANK.base + 0.1, top: rnd(1.7, 2.6), lat: rnd(-0.6, 0.6), sp: rnd(1.3, 1.9), far });
  for (let i = 0; i < 4; i++) MA.bubbles.push({ a: rnd(0, 6.28), r: rnd(0.1, 0.6), h: TANK.base + 0.1, s: rnd(0.03, 0.07) });
}
function eatFood(f) {
  const e = f.e, M = G.mer;
  let val = 0, food = 0, mood = 0;
  MA.tu = clamp(f.lat / (TANK.r * 0.55), -0.9, 0.9);
  if (e.type === 'ryb') {
    val = rybValue(e); food = 26 * e.lvl * (e.deco.plate ? 1.3 : 1);
    mood = 2 + (e.deco.bow ? 3 : 0) + (e.deco.flower ? 3 : 0) + (e.deco.st ? 2 : 0) + (decoCount(e) >= 2 ? 4 : 0);
    const sig = e.lvl + '|' + (e.deco.bow ? 1 : 0) + (e.deco.flower ? 1 : 0) + (e.deco.plate ? 1 : 0) + (e.deco.paint ? 1 : 0) + (e.deco.st > 0 ? 1 : 0);
    G.lastRyb.push(sig); if (G.lastRyb.length > 6) G.lastRyb.shift();
    if (G.lastRyb.length >= 5 && G.lastRyb.slice(-5).every(s => s === sig)) { mood -= 5; say('Ей скучно: поток одинаковых рыыбчеллов', '#8fb4ff'); }
    if (decoCount(e) >= 2) say('Нелепый рыыбчелл! Ей нравится', '#ff8fc0');
    if (e.fav) { mood -= 25; MA.cryT = 8; M.rel -= 10; M.favId = null; say('Ты скормил(а) её ЛЮБИМЧИКА... Она плачет, но ест.', '#8fb4ff'); }
    scareRybs(TANK.x, TANK.z, 9, 5);
    SFX.scream();
    parts(TANK.x, 2.4, TANK.z, 14, 'rgba(210,40,70,.8)', 0.8, 0.07, 1.2, -0.3);
    MA.eatT = 0.45; MA.eatGap = 0.5; G.stats.fed++;
  } else if (e.type === 'cutlet') {
    val = cutletValue(e); food = e.food; mood = 0.6 + (e.deco.bow ? 1.5 : 0) + (e.deco.flower ? 1.5 : 0);
    for (const r of G.ents) if (r.type === 'ryb' && r.fearT <= 0 && hyp(r.x, r.z, TANK.x, TANK.z) < 7) { r.fearT = 2.5; r.fx = TANK.x; r.fz = TANK.z; }
    MA.eatT = 0.16; MA.eatGap = 0.14; G.stats.fed++;
  } else if (e.type === 'mass') {
    val = 1; food = 6; mood = -8; MA.spitT = 1.3; MA.eatT = 0; MA.eatGap = 0.6;
    say('Фу! Ей скормили старую массу', '#ffb347'); SFX.gross();
  } else if (e.type === 'tool') {
    mood = -12; MA.spitT = 1.5; MA.eatGap = 0.8; M.emo = clamp(M.emo + mood, 0, 100);
    say('Она выплюнула инвентарь. Жрать лопатки ей НЕ нравится', '#ffb347'); SFX.gross();
    e.x = TANK.x + (G.player.x - TANK.x) / Math.max(1, hyp(G.player.x, G.player.z, TANK.x, TANK.z)) * 2.2;
    e.z = TANK.z + (G.player.z - TANK.z) / Math.max(1, hyp(G.player.x, G.player.z, TANK.x, TANK.z)) * 2.2;
    e.y = 2; e.vx = (G.player.x - TANK.x) * 0.3; e.vz = (G.player.z - TANK.z) * 0.3; e.vy = 3; e.air = true; e.thrownFrom = null; G.ents.push(e);
    return;
  } else if (e.type === 'pack') {
    mood = -6; MA.spitT = 1.1; MA.eatGap = 0.6;
    say('Декор просто так — ей это портит настроение', '#8fb4ff'); SFX.bad();
    M.emo = clamp(M.emo + mood, 0, 100); return;
  }
  M.sat = Math.min(satMax(), M.sat + food);
  M.emo = clamp(M.emo + mood, 0, 100);
  if (val > 0) registerFood(val, f.far);
  checkWishFood(e);
  if (e.type === 'cutlet') progress('cutletFeed');
}
function bonusDur(n) {
  const base = 5 + G.up.bDur, shrink = Math.max(0, 0.08 - 0.02 * G.up.bStab);
  return base * Math.max(0.35, 1 - shrink * Math.max(0, n - 2));
}
function registerFood(val, far) {
  const B = G.bonus;
  if (!unl('bonus')) {
    const g = Math.max(1, Math.round(val * moodMult() * (far ? 1.5 : 1))); addCoins(g, unl('coins'));
    popText(MA.headX || W / 2, (MA.headY || H / 2) - 20, unl('coins') ? '+' + g : '♥', '#ffd166', 26); SFX.chomp(0); SFX.coin(0); shake(90, 0.003); return;
  }
  if (B.timer > 0 || B.comboT > 0) B.streak++; else { B.streak = 1; B.pot = 0; }
  if (B.comboT > 0) { B.comboT = 0; B.pot = 0; }
  B.maxT = bonusDur(B.streak); B.timer = B.maxT;
  if (B.streak >= 2) B.pot += B.streak - 1;
  let gain = val * moodMult() * (far ? 1.5 : 1);
  gain = Math.max(1, Math.round(gain));
  addCoins(gain, true);
  const hx = MA.headX || W / 2, hy = (MA.headY || H / 2) - 20;
  popText(hx + rnd(-40, 40), hy, '+' + gain, far ? '#ff8fc0' : '#ffd166', 22 + Math.min(20, B.streak));
  if (far) popText(W / 2, H / 2 - 120, 'ДАЛЬНИЙ БРОСОК x1.5', '#ff8fc0', 24);
  G._punch = 1; SFX.chomp(B.streak); SFX.coin(B.streak);
  shake(90, 0.0025 + Math.min(0.006, B.streak * 0.0003));
  if (B.streak % 10 === 0) { G._flash = 0.6; popText(W - 110, 150, 'x' + B.streak + '!', '#ff8fc0', 40); }
  if (B.streak >= 2) progress('streak2');
}
function endBonus() {
  const B = G.bonus;
  if (B.streak >= 2) {
    const pay = Math.round(B.pot * (1 + 0.15 * G.up.bPow) * moodMult());
    addCoins(pay, true);
    popText(W / 2, H / 2 - 150, 'БОНУС x' + B.streak + '  +' + pay, '#ffd166', 34);
    say('Бонус x' + B.streak + ': +' + pay + ' (настроение x' + moodMult().toFixed(1) + ')', '#ffd166');
    SFX.bonusEnd(B.streak);
    G.stats.bestStreak = Math.max(G.stats.bestStreak, B.streak); G.run.best = Math.max(G.run.best || 0, B.streak);
    if (B.streak > B.best) {
      B.best = B.streak;
      if (B.streak >= 5) { G.mer.emo = Math.min(100, G.mer.emo + 8); G.mer.rel = Math.min(100, G.mer.rel + 1.5); MA.loveT = 2.5; say('Новый рекорд бонуса! Русалка в восторге', '#ff8fc0'); SFX.record(); }
    }
  }
  B.pot = 0;
  if (G.up.bCombo > 0 && B.streak >= 2) B.comboT = 1 + G.up.bCombo; else B.streak = 0;
}

// ============================ ХОТЕЛКИ ============================
function newWish() {
  const D = G.drawings, o = [];
  if (D.ryb) o.push({ pics: ['ryb'], intent: { type: 'food', food: 'ryb' } });
  const canCut = unl('press'), canDeco = unl('shop'), canAcc = unl('cust');
  if (canCut) o.push({ pics: ['cutlet'], intent: { type: 'food', food: 'cutlet', n: 5 } });
  if (canDeco) {
    o.push({ pics: ['ryb', 'bow'], intent: { type: 'food', food: 'ryb', deco: 'bow' } });
    o.push({ pics: ['bow'], intent: canAcc && Math.random() < 0.5 ? { type: 'acc', acc: 'bow' } : { type: 'food', food: 'any', deco: 'bow' } });
    if (canCut) o.push({ pics: ['cutlet', 'bow'], intent: { type: 'food', food: 'cutlet', deco: 'bow', n: 3 } });
  }
  if (canDeco) o.push({ pics: ['ryb', 'plate'], intent: { type: 'food', food: 'ryb', deco: 'plate' } });
  if (canDeco) o.push({ pics: ['sticker'], intent: { type: 'sticker' } });
  if (canAcc) o.push({ pics: ['pendant'], intent: { type: 'acc', acc: 'pendant' } });
  if (canAcc) o.push({ pics: ['earrings'], intent: { type: 'acc', acc: 'earrings' } });
  if (canAcc) o.push({ pics: ['bracelet'], intent: { type: 'acc', acc: 'bracelets' } });
  const w = o.length > 1 && Math.random() < 0.7 ? pick(o.slice(1)) : pick(o);
  G.mer.wish = { pics: w.pics, intent: w.intent, done: false, prog: 0 };
  MA.seenWish = false;
  say('Русалка о чём-то задумалась... посмотри на неё', '#ff8fc0');
}
function checkWishFood(e) {
  const w = G.mer.wish; if (!w || w.done || !MA.seenWish || w.intent.type !== 'food') return;
  const I = w.intent;
  if (I.food === 'ryb' && e.type !== 'ryb') return;
  if (I.food === 'cutlet' && e.type !== 'cutlet') return;
  if (I.deco && !e.deco[I.deco]) return;
  w.prog++;
  if (w.prog >= (I.n || 1)) fulfillWish(e.type === 'ryb' ? rybValue(e) : cutletValue(e) * 4);
}
function checkWishAcc(acc) { const w = G.mer.wish; if (w && !w.done && MA.seenWish && w.intent.type === 'acc' && w.intent.acc === acc) fulfillWish(40); }
function checkWishSticker() { const w = G.mer.wish; if (w && !w.done && MA.seenWish && w.intent.type === 'sticker' && glassCoverage() <= 0.3) fulfillWish(30); }
function fulfillWish(val) {
  const M = G.mer, w = M.wish; w.done = true;
  const rew = Math.round((60 + 160 * M.growth + val * 3) * moodMult());
  addCoins(rew, true); M.emo = Math.min(100, M.emo + 15); M.rel = Math.min(100, M.rel + 3);
  MA.loveT = 3; for (let i = 0; i < 8; i++) MA.hearts.push({ x: rnd(-0.2, 0.2), age: -i * 0.1 });
  SFX.love(); G.stats.wishes++;
  popText(W / 2, H / 2 - 170, 'ХОТЕЛКА ИСПОЛНЕНА  +' + rew, '#ff8fc0', 32);
  say('Хотелка исполнена! +' + rew + ' и много любви', '#ff8fc0');
}
function glassCoverage() { let n = 0; for (const s of G.stickers) if (s.surf === 'glass') n++; return n * 0.035; }

// ============================ РУСАЛКА ============================
function startRage() {
  const M = G.mer; M.rage = true; G.stats.rages++; G.rages.push(G.t);
  M.emo = Math.max(0, M.emo - 35); M.rel = Math.max(0, M.rel - 8);
  MA.lampFlick = 2; MA.echoT = 0; MA.bangT = 1.2;
  say('ЯРОСТЬ! Она голодна и бьёт стекло!', '#ff5d6c'); SFX.bad(); shake(500, 0.01);
  if (!G.flags.rageHint) { G.flags.rageHint = 1; banner('⚠ ЯРОСТЬ', 'Она слишком голодна и бьёт стекло. Срочно корми её через воронку!', '#ff5d6c'); }
}
function endRage() { G.mer.rage = false; say('Ярость утихла. Она смотрит на тебя исподлобья.', '#cfe'); }
function bang() {
  const M = G.mer;
  M.glass -= 3.2 + M.growth * 2.5; MA.bangK = 1;
  SFX.knock(); SFX.crack(); shake(200, 0.007); MA.lampFlick = Math.max(MA.lampFlick, 0.5);
  const th = Math.atan2(G.player.z - TANK.z, G.player.x - TANK.x);
  M.cracks.push({ a: th + rnd(-0.55, 0.55), h: rnd(1.5, 3.3), seed: Math.random() * 1000, size: rnd(0.25, 0.5) });
  if (M.cracks.length > 40) M.cracks.shift();
  M.rel = Math.max(0, M.rel - 0.3);
  if (M.glass <= 0) { SFX.shatter(); endGame(1, 'glass'); }
}
function startFinale() { MA.finale = 0.001; say('Она выросла. Колба ей мала...', '#ff5d6c'); }
function updMermaid(dt) {
  const M = G.mer, T = TANK;
  if (MA.finale > 0) {
    MA.finale += dt; MA.fwd = lerp(MA.fwd, T.r - 0.4, dt * 2);
    if (Math.random() < dt * 4) { M.cracks.push({ a: Math.atan2(G.player.z, G.player.x) + rnd(-0.8, 0.8), h: rnd(0.8, 3.6), seed: Math.random() * 1000, size: rnd(0.3, 0.6) }); SFX.crack(); shake(200, 0.004 + MA.finale * 0.002); }
    M.glass = Math.max(0, 100 - MA.finale * 16);
    if (MA.finale > 6.5) { SFX.shatter(); G._flash = 1; endGame(M.rel >= 60 ? 3 : 2, 'grow'); }
  } else {
    M.growth = Math.min(1, M.growth + dt / SESSION[G.mode] * (1 + 0.05 * (G.prestige || 0)) * (satPct() > 0.3 ? 1 : 0.35));
    if (M.growth >= 1) startFinale();
  }
  const layers = Math.min(5, 1 + Math.floor(M.growth * 4.4));
  if (layers > M.layers) { M.layers = layers; say('Шкала сытости выросла: слой ' + layers, '#ffd166'); }
  if (!MA.finale) {
    const decay = G.god ? 0 : (0.75 + 1.9 * M.growth) * (1 - 0.09 * G.up.life) * (M.rage ? 1.25 : 1) * (G.stage < 3 ? 0.35 : G.stage < 5 ? 0.7 : 1);
    M.sat = Math.max(0, M.sat - decay * dt);
  }
  const sp = satPct();
  if (!M.rage && sp < 0.12 && !MA.finale) startRage();
  if (M.rage && sp >= 0.3) endRage();
  if (M.sat <= 0 && !MA.finale) { M.starveT += dt; if (M.starveT > 30) { endGame(1, 'starve'); return; } }
  else M.starveT = Math.max(0, M.starveT - dt * 2);
  if (M.rage) {
    MA.bangT -= dt; if (MA.bangT <= 0) { bang(); MA.bangT = rnd(0.9, 1.5); }
    M.emo = Math.max(0, M.emo - 2 * dt);
    scareRybs(T.x, T.z, 30, 1);
  }
  MA.bangK = Math.max(0, MA.bangK - dt * 3);
  // эмоции
  let base = 52;
  if (sp < 0.3) base = 30;
  if (glassCoverage() > 0.3) base -= 15;
  base -= G.rages.filter(t => G.t - t < 600).length * 6;
  const dd = base - M.emo; M.emo += Math.sign(dd) * Math.min(Math.abs(dd), 0.12 * dt);
  M.emo = clamp(M.emo, 0, 100);
  M.state = M.emo > 65 && sp >= 0.6 ? 'joy' : M.emo < 40 ? 'sad' : 'neutral';
  if (M.state === 'joy' && !M.rage) M.rel += 0.02 * dt; else if (M.state === 'sad' || M.rage) M.rel -= 0.015 * dt;
  M.rel = clamp(M.rel, 0, 100);
  // хотелки
  if (unl('wish')) { M.wishTimer -= dt; if (M.wishTimer <= 0) { newWish(); M.wishTimer = WISH_EVERY[G.mode]; } }
  MA.wishCD -= dt;
  if (MA.looking && !M.rage && unl('wish')) {
    MA.lookT += dt;
    if (MA.lookT > 0.5 && MA.showWishT <= 0 && MA.wishCD <= 0 && M.wish && !M.wish.done) {
      MA.showWishT = 5; MA.wishCD = 10; MA.cards = M.wish.pics; MA.seenWish = true; SFX.echo(false); progress('wish');
    }
  } else MA.lookT = 0;
  for (const k of ['eatT', 'spitT', 'cryT', 'laughT', 'loveT', 'showWishT', 'tapT', 'eatGap']) MA[k] = Math.max(0, MA[k] - dt);
  MA.blinkT -= dt; if (MA.blinkT <= 0) { MA.blink = 0.13; MA.blinkT = rnd(2, 5); } MA.blink = Math.max(0, MA.blink - dt);
  MA.echoT -= dt;
  if (MA.echoT <= 0) {
    MA.echoes.push({ age: 0, rage: M.rage }); SFX.echo(M.rage);
    MA.echoT = M.rage ? rnd(0.6, 1.0) : rnd(7, 13);
    if (M.rage) MA.lampFlick = Math.max(MA.lampFlick, 0.8);
  }
  for (const e of MA.echoes) e.age += dt * 1.2; MA.echoes = MA.echoes.filter(e => e.age < 1);
  if (sp < 0.35 && !M.rage) { MA.humT -= dt; if (MA.humT <= 0) { SFX.hum(); MA.humT = rnd(3.5, 5.5); shake(400, 0.0018); MA.echoes.push({ age: 0.3, rage: false }); } }
  for (const h of MA.hearts) h.age += dt * 0.6; MA.hearts = MA.hearts.filter(h => h.age < 1);
  if ((MA.cryT > 0 || M.state === 'sad') && Math.random() < dt * 3) MA.tears.push({ x: pick([-0.05, 0.045]), age: 0 });
  for (const d of MA.tears) d.age += dt; MA.tears = MA.tears.filter(d => d.age < 1);
  if (M.state === 'joy' && !M.rage && Math.random() < dt * 0.8) MA.hearts.push({ x: rnd(-0.15, 0.15), age: 0 });
  if (Math.random() < dt * 5) MA.bubbles.push({ a: rnd(0, 6.28), r: rnd(0.2, T.r - 0.15), h: T.base + 0.1, s: rnd(0.02, 0.06) });
  for (const b of MA.bubbles) b.h += dt * (0.4 + b.s * 8); MA.bubbles = MA.bubbles.filter(b => b.h < T.top - 0.2);
  MA.lampFlick = Math.max(0, MA.lampFlick - dt);
  if (MA.eatT <= 0 && !M.rage && Math.random() < dt * 0.3) MA.tu = rnd(-0.7, 0.7);
  MA.u = lerp(MA.u, MA.tu, clamp(dt * (MA.eatT > 0 ? 7 : 1), 0, 1));
  const tf = M.rage ? T.r - 0.45 : MA.eatT > 0 ? 0.4 : MA.tapT > 0 ? T.r - 0.5 : MA.lastPose === 'joy' ? 0.3 : 0;
  MA.fwd = lerp(MA.fwd, tf, clamp(dt * 3, 0, 1));
  MA.v = Math.sin(G.t * 0.8) * 0.12;
  for (const f of MA.food) f.h = Math.min(f.top, f.h + f.sp * dt);
  if (MA.food.length && MA.food[0].h > T.base + 0.9 && MA.eatGap <= 0 && MA.eatT <= 0.05 && MA.spitT <= 0.3) eatFood(MA.food.shift());
}

// ============================ РЫЫБЧЕЛЛЫ ============================
let flockT = 0, haulT = 0, favT = 0;
function updFlocks() {
  const rs = G.ents.filter(e => e.type === 'ryb' && !e.air && !e.inPress && !e.carried);
  for (const r of rs) { r._alpha = false; r._lead = false; r._fol = 0; r._score = decoCount(r) * 2 + (r.deco.plate ? 3 : 0) + (r.lvl - 1) * 2 - (r.deco.paint ? 99 : 0); }
  const leaders = rs.filter(r => r._score >= 2).sort((a, b) => b._score - a._score).slice(0, 5);
  leaders.forEach(a => { a._alpha = true; a._lead = true; });
  const need = Math.ceil(rs.length / 8);
  if (leaders.length < need) {
    for (const r of rs.filter(r => !r._lead && !r.deco.paint && r.age > 15).sort((a, b) => a.id - b.id)) { if (leaders.length >= need) break; r._lead = true; leaders.push(r); }
  }
  for (const r of rs) {
    r.leader = null; if (r._lead || r.deco.paint) continue;
    let best = null, bd = 9;
    for (const a of leaders) { const d = hyp(r.x, r.z, a.x, a.z); if (d < bd && a._fol < 9) { bd = d; best = a; } }
    if (best) { r.leader = best.id; best._fol++; }
  }
}
function updHaul() {
  for (const p of G.ents) {
    if (p.type !== 'ryb' || !p.deco.paint || p.air || p.inPress || p.carried) continue;
    let hs = G.ents.filter(e => e.type === 'ryb' && e.haul === p.id);
    if (hs.length >= 2) continue;
    const free = G.ents.filter(e => e.type === 'ryb' && e !== p && !e.deco.paint && !e.haul && !e.air && !e.inPress && !e.carried && hyp(e.x, e.z, p.x, p.z) < 8)
      .sort((a, b) => hyp(a.x, a.z, p.x, p.z) - hyp(b.x, b.z, p.x, p.z));
    for (const f of free) { if (hs.length >= 2) break; f.haul = p.id; hs.push(f); }
  }
}
function nearestFreePress(x, z) {
  let best = null, bd = 1e9;
  for (const m of G.ents) if (m.type === 'press' && !m.slot) { const d = hyp(x, z, m.x, m.z); if (d < bd) { bd = d; best = m; } }
  return best;
}
function updRyb(r, dt) {
  r.age += dt;
  for (const k of ['fearT', 'memT', 'angryT', 'worT', '_poked', 'pushT']) if (r[k] > 0) r[k] = Math.max(0, r[k] - dt);
  if (r.air) { updFlying(r, dt); return; }
  if (r.inPress) { const p = byId(r.inPress); if (!p || p.slot !== r.id) { r.inPress = null; } else { r.x = p.x; r.z = p.z; return; } }
  if (r.carried) {
    const a = byId(r.carried[0]), b = byId(r.carried[1]);
    if (!a || !b || a.air || b.air || a.haul !== r.id || b.haul !== r.id || r.carryT > 12) { rmCarry(r); r.y = 0.45; r.air = true; r.carryT = 0; return; }
    r.carryT = (r.carryT || 0) + dt;
    r.x = (a.x + b.x) / 2; r.z = (a.z + b.z) / 2; r.y = 0.45 + Math.abs(Math.sin(G.t * 8)) * 0.05; r._mv = 1; r.walk += dt * 12;
    const pr = byId(r.dest);
    if (pr && !pr.slot && hyp(r.x, r.z, pr.x, pr.z) < 1.0) { putInPress(r, pr); say('Рыыбчеллы сами сдали окрашенного в пресс...', '#b7e07b'); }
    else if (!pr || pr.slot) { const np = nearestFreePress(r.x, r.z); r.dest = np ? np.id : null; }
    return;
  }
  if (r.deco.plate) {
    if (r._flop > 0) {
      r._flop -= dt; r.vx *= 0.85; r.vz *= 0.85;
      if (!r._hit && r._flop < 0.8 * 0.4) { r._hit = true; pressRybSlam(r); }
      if (r._flop > 0) return;
    }
    r.flopCD = (r.flopCD === undefined ? rnd(6, 12) : r.flopCD) - dt;
    if (r.flopCD <= 0 && r.fearT <= 0 && r.worT <= 0) { r.flopCD = rnd(8, 14); r._flop = 0.8; r._hit = false; SFX.jump(); return; }
  }
  const M = G.mer, T = TANK, P = G.player;
  let tx = r.tx, tz = r.tz, sp = 0.85;
  const dp = hyp(r.x, r.z, P.x, P.z), dT = hyp(r.x, r.z, T.x, T.z);
  let steer = !(r.pushT > 0);
  if (r.fearT > 0) { const a = Math.atan2(r.z - r.fz, r.x - r.fx); tx = r.x + Math.cos(a) * 3; tz = r.z + Math.sin(a) * 3; sp = 2.5; r.worT = 0; }
  else if (r.memT > 0 && dp < 3.5) { const a = Math.atan2(r.z - P.z, r.x - P.x); tx = r.x + Math.cos(a) * 3; tz = r.z + Math.sin(a) * 3; sp = 1.9; }
  else if (r.angryT > 0) { tx = r.x; tz = r.z; sp = 0; const lat = toCam(P.x, P.z)[0] - toCam(r.x, r.z)[0]; r.face = lat > 0 ? 1 : -1; r._mv = 1; r.walk += dt * 20; }
  else if (r.haul) {
    const tg = byId(r.haul);
    if (!tg || !tg.deco.paint || tg.air || tg.inPress || tg.type !== 'ryb') r.haul = null;
    else if (tg.carried) { const pr = byId(tg.dest); if (pr) { const s = tg.carried[0] === r.id ? -1 : 1; tx = pr.x + s * 0.3; tz = pr.z + 0.5; sp = 1.1; } else { tx = r.x; tz = r.z; } }
    else {
      tx = tg.x; tz = tg.z; sp = 1.6;
      const hs = G.ents.filter(e => e.type === 'ryb' && e.haul === tg.id && hyp(e.x, e.z, tg.x, tg.z) < 0.65);
      if (hs.length >= 2) { const pr = nearestFreePress(tg.x, tg.z); tg.carried = [hs[0].id, hs[1].id]; tg.dest = pr ? pr.id : null; tg.carryT = 0; SFX.squeak(); }
    }
  }
  else if (r.worT > 0) { tx = r.x; tz = r.z; sp = 0; const lat = toCam(T.x, T.z)[0] - toCam(r.x, r.z)[0]; r.face = lat > 0 ? 1 : -1; }
  else {
    r.tT -= dt;
    const lead = r.leader ? byId(r.leader) : null;
    if (lead && !lead.air && !lead.inPress) { const a = (r.id * 2.39) % (Math.PI * 2); tx = lead.x + Math.cos(a) * 1.1; tz = lead.z + Math.sin(a) * 1.1; sp = hyp(r.x, r.z, tx, tz) > 2 ? 1.4 : 0.6; }
    else if (r.tT <= 0) {
      const a = rnd(0, Math.PI * 2);
      let rad = M.state === 'joy' ? rnd(2.6, 5) : M.state === 'sad' ? rnd(7, 10) : rnd(2.5, 10);
      r.tx = Math.cos(a) * rad; r.tz = Math.sin(a) * rad; r.tT = rnd(2, 5); tx = r.tx; tz = r.tz;
    }
    if (dT < 6.5 && !M.rage && M.state !== 'sad' && Math.random() < dt * 0.025) { r.worT = 3; r.bond += 3; }
  }
  if (steer) {
    const dx = tx - r.x, dz = tz - r.z, dl = Math.hypot(dx, dz);
    if (dl > 0.1 && sp > 0) { const v = Math.min(sp, dl * 2); r.vx = lerp(r.vx, dx / dl * v, clamp(dt * 6, 0, 1)); r.vz = lerp(r.vz, dz / dl * v, clamp(dt * 6, 0, 1)); }
    else { r.vx *= 0.8; r.vz *= 0.8; }
  } else { r.vx *= Math.pow(0.2, dt); r.vz *= Math.pow(0.2, dt); }
  r.x += r.vx * dt; r.z += r.vz * dt;
  const spd = Math.hypot(r.vx, r.vz);
  if (r.angryT <= 0) { r._mv = spd; r.walk += spd * dt * 9; }
  const lat = -r.vx * CAM.s + r.vz * CAM.c;
  if (Math.abs(lat) > 0.08 && r.worT <= 0 && r.angryT <= 0) r.face = lat > 0 ? 1 : -1;
  if (dT < 4.5) r.bond += dt * 0.4;
  if (r.pushT > 0) for (const m of G.ents) if (m.type === 'press' && !m.slot && hyp(r.x, r.z, m.x, m.z) < 0.9) { putInPress(r, m); break; }
}
function rybCollisions() {
  const rs = G.ents.filter(e => e.type === 'ryb' && !e.air && !e.inPress && !e.carried);
  for (let i = 0; i < rs.length; i++) {
    const a = rs[i];
    for (let j = i + 1; j < rs.length; j++) {
      const b = rs[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d < 0.42 && d > 1e-4) { const push = (0.42 - d) / 2, nx = dx / d, nz = dz / d; a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push; }
    }
    const P = G.player, d = hyp(a.x, a.z, P.x, P.z);
    if (d < 0.6 && d > 1e-4) { const k = 0.6 / d; a.x = P.x + (a.x - P.x) * k; a.z = P.z + (a.z - P.z) * k; }
    collideCircle(a, 0.22, TANK.r + 0.25);
  }
}
function updFavorite() {
  const M = G.mer;
  if (M.favId && !byId(M.favId) && !G.hands.L.item?.fav && !G.hands.R.item?.fav) M.favId = null;
  if (M.favId) return;
  let best = null;
  for (const e of G.ents) if (e.type === 'ryb' && e.bond > 40 && !e.deco.paint && (!best || e.bond > best.bond)) best = e;
  if (best) { best.fav = true; M.favId = best.id; say('У русалки появился любимчик ♥ (не корми его ей!)', '#ff8fc0'); }
}

// ============================ АППАРАТЫ (у каждого свои улучшения) ============================
function mUp(m) { if (!m.up) m.up = m.type === 'inc' ? { speed: 0, protect: 0, auto: 0, quality: 0, paint: 0 } : { speed: 0, auto: 0 }; return m.up; }
function rollLevel(m) {
  const q = mUp(m).quality, r = Math.random();
  if (q >= 3 && r < 0.1) return 4;
  if (q >= 2 && r < 0.22) return 3;
  if (q >= 1 && r < 0.45) return 2;
  return 1;
}
function harvest(m) {
  const p = m.prog; m.prog = 0; m.hold = false; Snd.setHold(false, 0);
  const P = G.player, d = Math.max(0.5, hyp(P.x, P.z, m.x, m.z)), dx = (P.x - m.x) / d, dz = (P.z - m.z) / d;
  if (p < 0.62) { m.flash = 1; m.flashCol = 'rgba(80,140,255,.6)'; SFX.fail(); if (!m.auto) say('Недостаточно — прогресс сброшен', '#8fb4ff'); return; }
  if (p <= 0.82) {
    if (rybCount() >= MAX_RYB) { say('Слишком много рыыбчеллов в лаборатории (макс. ' + MAX_RYB + ')', '#ffb347'); return; }
    const lvl = rollLevel(m), r = mkRyb(m.x + dx * 0.8, m.z + dz * 0.8, lvl);
    r.air = true; r.y = 1.2; r.vy = 2.2; r.vx = dx * 1.2; r.vz = dz * 1.2;
    if (Math.random() < 0.1 * mUp(m).paint) r.deco.paint = pick(PAINT_COLS);
    m.flash = 1; m.flashCol = 'rgba(120,255,160,.7)'; SFX.perfect(); G.stats.made++;
    if (!m.auto || lvl > 1) say('Идеально! Рыыбчелл ур.' + lvl + (r.deco.paint ? ' (окрашен)' : ''), lvl > 1 ? LVLCOL[lvl] : '#7be07b');
    progress('incPerfect');
  } else {
    addEnt({ type: 'mass', x: m.x + dx * 0.8, z: m.z + dz * 0.8, y: 1.2, vy: 2, vx: dx, vz: dz, air: true });
    m.flash = 1; m.flashCol = 'rgba(160,120,60,.7)'; SFX.gross(); G.stats.old++;
    say('Брак: старая масса. Отпускай в зелёной зоне', '#ffb347');
  }
}
// раздавить рыыбчелла в котлеты (прессом или ПрессРыыбчеллом)
function crushRyb(r, x, z) {
  rmEnt(r); rmCarry(r);
  const n = cutletsPer(r), cd = cutletData(r);
  for (let i = 0; i < n; i++) {
    const c = Object.assign({}, cd, { deco: { bow: null, flower: null } });
    c.x = x + rnd(-0.2, 0.2); c.z = z + rnd(-0.2, 0.2); c.y = 0.5; c.vx = rnd(-1.6, 1.6); c.vz = rnd(-1.6, 1.6); c.vy = rnd(2, 3.6); c.air = true;
    addEnt(c);
  }
  if (r.deco.plate) { const pk = mkPack('plate', 1, x, z); pk.y = 0.6; pk.vy = 3; pk.vx = rnd(-1, 1); pk.vz = rnd(-1, 1); pk.air = true; }
  SFX.squish(); SFX.scream();
  parts(x, 0.4, z, 22, 'rgba(200,30,60,.85)', 2.2, 0.05, 1.0);
  G.stats.pressed++; G.stats.cutlets += n;
  scareRybs(x, z, 6, 4);
  const M = G.mer;
  if (r.fav) { M.emo = Math.max(0, M.emo - 15); M.rel -= 6; MA.cryT = 6; M.favId = null; say('Это был её любимчик...', '#8fb4ff'); }
  return n;
}
function squish(p) {
  const r = byId(p.slot); p.slot = null; p.flash = 1;
  if (!r) { SFX.knock(); return; }
  crushRyb(r, p.x, p.z); shake(220, 0.008);
  const M = G.mer;
  if (hyp(p.x, p.z, TANK.x, TANK.z) < 6 && !M.rage) { M.emo = Math.max(0, M.emo - 6); MA.cryT = Math.max(MA.cryT, 1.8); say('Русалка видела, как рыыбчелла раздавили...', '#8fb4ff'); }
  progress('squish');
}
function pressRybSlam(r) {
  SFX.thud(); shake(120, 0.004);
  parts(r.x, 0.1, r.z, 10, 'rgba(210,220,230,.8)', 1.5, 0.03, 0.5);
  if ((G._nCut || 0) >= MAX_CUT + 50) return;
  const vs = G.ents.filter(v => v.type === 'ryb' && v !== r && !v.deco.plate && !v.air && !v.inPress && !v.carried && hyp(v.x, v.z, r.x, r.z) < 0.8);
  for (const v of vs) crushRyb(v, v.x, v.z);
  if (!vs.length) return;
  G.run.pressRyb = 1;
  if (!G.flags.pressRybHint) { G.flags.pressRybHint = 1; banner('ПрессРыыбчелл', 'Рыыбчелл с пластиной падает и давит сородичей в котлеты', '#ffd166'); }
  else say('ПрессРыыбчелл раздавил: ' + vs.length, '#ffd166');
  if (hyp(r.x, r.z, TANK.x, TANK.z) < 6 && !G.mer.rage) { G.mer.emo = Math.max(0, G.mer.emo - 3); MA.cryT = Math.max(MA.cryT, 1.2); }
}
function updMachines(dt) {
  const mm = machineMult();
  for (const m of G.ents) {
    if (m.flash > 0) m.flash = Math.max(0, m.flash - dt * 2);
    if (m.type === 'inc') {
      const u = mUp(m), rate = 0.42 * (1 + 0.18 * u.speed) * mm;
      if (m.hold) {
        m.prog += rate * dt; if (u.protect) m.prog = Math.min(m.prog, 0.8);
        Snd.setHold(true, m.prog);
        if (m.prog >= 1) { m.prog = 1; harvest(m); }
      } else if (u.auto && m.auto) { m.prog += rate * 0.4 * dt; if (m.prog >= 0.72) harvest(m); }
    } else if (m.type === 'press') {
      const u = mUp(m), locked = G._eLock && G._eLock.e === m && G._eLock.part === 'lever';
      if (u.auto && m.auto && m.slot && !locked && (G._nCut || 0) < MAX_CUT) { m.lever += dt * 0.45 * (1 + 0.2 * u.speed) * mm; if (m.lever >= 1) { squish(m); m.lever = 1; } }
      else if (!locked) m.lever = Math.max(0, m.lever - dt * 2.5);
    }
  }
}

// ============================ ОБЩИЙ ТИК ============================
function simStep(dt) {
  G.t += dt;
  let nc = 0; for (const e of G.ents) if (e.type === 'cutlet') nc++; G._nCut = nc;
  updPlayer(dt);
  updHands(dt);
  flockT -= dt; if (flockT <= 0) { updFlocks(); flockT = 1; }
  haulT -= dt; if (haulT <= 0) { updHaul(); haulT = 0.5; }
  favT -= dt; if (favT <= 0) { updFavorite(); favT = 2; }
  for (const e of G.ents.slice()) {
    if (e.type === 'ryb') updRyb(e, dt);
    else if (e.air) updFlying(e, dt);
  }
  rybCollisions();
  updMachines(dt);
  updMermaid(dt);
  const B = G.bonus;
  if (B.timer > 0) { B.timer -= dt; if (B.timer <= 0) { B.timer = 0; endBonus(); } }
  else if (B.comboT > 0) { B.comboT -= dt; if (B.comboT <= 0) { B.comboT = 0; B.streak = 0; } }
  for (const q of G._parts) { q.vy -= q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt; q.life -= dt; if (q.y < 0) { q.y = 0; q.vx *= 0.5; q.vz *= 0.5; } }
  G._parts = G._parts.filter(q => q.life > 0); if (G._parts.length > 300) G._parts.splice(0, G._parts.length - 300);
  for (const q of G._coinFx) q.t += dt * 1.6; G._coinFx = G._coinFx.filter(q => q.t < 1);
  for (const q of G._floaters) q.t += dt / 1.1; G._floaters = G._floaters.filter(q => q.t < 1);
  G._punch = Math.max(0, (G._punch || 0) - dt * 4);
  G._flash = Math.max(0, (G._flash || 0) - dt * 2);
  if (G._poke) { G._poke.t += dt; if (!G._poke.hold && G._poke.t > 0.25) G._poke = null; }
  G._stepFlash = Math.max(0, (G._stepFlash || 0) - dt * 1.2);
  updGoals(dt);
  Music.update(G.mer.state, G.mer.rage);
}
