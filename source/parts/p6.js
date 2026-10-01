
// ============================ РУКИ / ВЗАИМОДЕЙСТВИЕ ============================
// ЛКМ — левая рука, ПКМ — правая (после прокачки «2 рука»): взять / положить / покормить, зажать — бросок.
// E — ткнуть пальцем или использовать инструмент; удерживай E, чтобы палец оставался вытянутым (кнопка инкубатора, рычаг пресса).
const other = s => s === 'L' ? 'R' : 'L';
const HKEY = s => s === 'L' ? 'ЛКМ' : 'ПКМ';
const PACK_NAME = { bow: 'Бантики', flower: 'Цветы', plate: 'Пластины', sticker: 'Стикеры', paint: 'Краска', repair: 'Ремкомплект стекла' };
const isFood = it => it && (it.type === 'ryb' || it.type === 'stack' || it.type === 'cutlet' || it.type === 'mass' || (it.type === 'tool' && it.load && it.load.length > 0));
function heldFood() { return isFood(G.hands.L.item) || isFood(G.hands.R.item); }
function heldType(t) { return (G.hands.L.item && G.hands.L.item.type === t) || (G.hands.R.item && G.hands.R.item.type === t); }
function heldTool() { for (const s of ['L', 'R']) { const it = G.hands[s].item; if (it && it.type === 'tool') return it; } return null; }

function handDown(s) {
  if (uiOpen()) return;
  if (!handAllowed(s)) { say('Правая рука (ПКМ) — прокачка «2 рука» в терминале', '#8db2b6'); return; }
  const h = G.hands[s]; h.down = true; h.downT = 0; h.charging = false; h.charge = 0;
}
function handUp(s) {
  const h = G.hands[s]; if (!h.down) return; h.down = false;
  if (h.charging) { const ch = h.charge; h.charging = false; h.charge = 0; throwHeld(s, ch); return; }
  if (!h.item) { tryPick(s); return; }
  if (useHeld(s)) return;
  throwHeld(s, 0);
}
function pokeDown() {
  if (uiOpen()) return;
  const tg = G._target, tool = heldTool();
  if (tool && toolRelevant(tool, tg)) { useTool(tool, tg); return; }
  poke(tg);
}
function updHands(dt) {
  const eDown = inPressed('poke');
  if (uiOpen()) return;
  for (const s of ['L', 'R']) {
    const h = G.hands[s];
    if (h.down) { h.downT += dt; if (h.item && unl('throw') && h.downT > 0.2) { h.charging = true; h.charge = Math.min(1, (h.downT - 0.2) * (1.1 + 0.35 * G.up.throw)); } }
    h.throwT = Math.max(0, (h.throwT || 0) - dt * 4);
  }
  if (eDown) pokeDown();
  if (G._eLock && !inDown('poke')) eRelease();
  if (G._poke && G._poke.hold && !G._eLock && !inDown('poke')) { G._poke.hold = false; G._poke.t = 0.15; }
  if (G._eLock && G._eLock.part === 'lever' && G._poke) G._poke.swipe = G._eLock.e.lever;
}
function gatherCutlets(x, z, max, rad = 0.8) {
  const cand = G.ents.filter(e => e.type === 'cutlet' && !e.air && hyp(e.x, e.z, x, z) < rad).sort((a, b) => hyp(a.x, a.z, x, z) - hyp(b.x, b.z, x, z));
  const out = [];
  for (const c of cand) { if (out.length >= max) break; rmEnt(c); out.push(c); }
  return out;
}
function tryPick(s) {
  const tg = G._target, h = G.hands[s];
  if (!tg || tg.kind !== 'ent') return false;
  let e = tg.e;
  if (e.type === 'press') {
    if (!e.slot) { say('Слот пуст — положи туда рыыбчелла', '#8db2b6'); return false; }
    const r = byId(e.slot); e.slot = null; if (!r) return false; r.inPress = null; e = r;
  }
  if (e.type === 'cutlet') {
    const list = gatherCutlets(e.x, e.z, 5);
    if (!list.includes(e) && list.length < 5) { rmEnt(e); list.push(e); }
    h.item = { type: 'stack', list }; SFX.pick(); return true;
  }
  if (!['ryb', 'mass', 'tool', 'pack'].includes(e.type)) return false;
  if (e.type === 'tool' && heldTool()) { say('Два инструмента сразу не удержать', '#ffb347'); return false; }
  if (e.type === 'ryb') { rmCarry(e); e.memT = 5; e.worT = 0; e.leader = null; e.haul = null; e.inPress = null; e._flop = 0; SFX.squeak(); progress('pick'); }
  rmEnt(e); e.air = false; e.y = 0; h.item = e; SFX.pick();
  return true;
}
function useHeld(s) {
  const h = G.hands[s], it = h.item, tg = G._target;
  const usePack = () => { if (it.type === 'pack' && applyPack(it, tg)) { if (it.n <= 0) h.item = null; return true; } return false; };
  if (!tg) return usePack();
  if (tg.kind === 'glass') {
    if (usePack()) return true;
    if (isFood(it)) { say('Еду — в жёлтую воронку «КОРМ» рядом с колбой', '#ffd166'); return true; }
    return false;
  }
  const e = tg.e;
  if (it.type === 'stack' && e.type === 'cutlet') {
    if (it.list.length >= 5) { say('В руку влезает 5 котлет. Лопатка из терминала — до 15', '#8db2b6'); return true; }
    it.list.push(...gatherCutlets(e.x, e.z, 5 - it.list.length)); SFX.pick(); return true;
  }
  if (usePack()) return true;
  if (e.type === 'funnel') { h.item = null; if (it.type === 'stack') feedList(it.list); else feedEnt(it, 'funnel'); return true; }
  if (e.type === 'press' && it.type === 'ryb') { if (!e.slot) { putInPress(it, e); h.item = null; } else say('Слот пресса занят', '#8db2b6'); return true; }
  if (e.type === 'bin') { h.item = null; if (it.type === 'stack') it.list.forEach(c => dispose(c)); else dispose(it); return true; }
  if (e.type === 'tool' && e.kind === 'box' && it.type !== 'tool') {
    const add = it.type === 'stack' ? it.list : [it];
    if (e.load.length + add.length > 8) { say('Коробка полна (8)', '#8db2b6'); return true; }
    e.load.push(...add); h.item = null; SFX.pick(); return true;
  }
  // свободная вторая рука: подобрать ещё один предмет
  const o = other(s);
  if (handAllowed(o) && !G.hands[o].item && ['ryb', 'cutlet', 'mass', 'pack', 'tool'].includes(e.type)) return tryPick(o);
  return false;
}
function throwHeld(s, charge) {
  const h = G.hands[s], it = h.item; if (!it) return;
  h.item = null; h.throwT = 1;
  const p = G.player, fx = Math.cos(p.yaw), fz = Math.sin(p.yaw), rx = -fz, rz = fx, slope = Math.tan(p.pitch);
  const spd = charge > 0 ? 3 + charge * (8 + 2.5 * G.up.throw) : 2.2;
  let dx = fx, dy = slope, dz = fz; const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
  const sg = s === 'L' ? -1 : 1;
  const ox = clamp(p.x + fx * 0.45 + rx * sg * 0.2, -ROOM + 0.3, ROOM - 0.3), oz = clamp(p.z + fz * 0.45 + rz * sg * 0.2, -ROOM + 0.3, ROOM - 0.3), oy = CAM.eye - 0.25;
  const launch = (e, j) => {
    e.x = ox; e.y = oy; e.z = oz;
    e.vx = dx * spd + rnd(-j, j); e.vy = dy * spd + (charge > 0 ? 1.2 + charge * 1.2 : 0.5) + rnd(-j, j); e.vz = dz * spd + rnd(-j, j);
    e.air = true; e.thrownFrom = charge > 0.2 ? { x: p.x, z: p.z } : null;
    if (!G.ents.includes(e)) G.ents.push(e);
  };
  if (it.type === 'stack') it.list.forEach((c, i) => { launch(c, 0.25 + charge * 0.35); c.y += i * 0.03; });
  else launch(it, 0);
  if (it.type === 'ryb') { it.memT = 5; SFX.squeak(); }
  if (charge > 0) SFX.throw(charge); else SFX.drop();
}
function rayCyl(R) {
  const ox = CAM.x - TANK.x, oz = CAM.z - TANK.z, dx = CAM.c, dz = CAM.s;
  const b = ox * dx + oz * dz, cc = ox * ox + oz * oz - R * R, disc = b * b - cc;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc); if (t < 0) return null;
  return { a: Math.atan2(oz + dz * t, ox + dx * t), h: CAM.eye + Math.tan(G.player.pitch) * t };
}
function packFits(pk, e) {
  if (!e || (e.type !== 'ryb' && e.type !== 'cutlet')) return false;
  const d = e.deco, k = pk.kind;
  if (k === 'bow') return !d.bow; if (k === 'flower') return !d.flower;
  if (e.type !== 'ryb') return false;
  if (k === 'plate') return !d.plate; if (k === 'paint') return !d.paint; if (k === 'sticker') return d.st < 3;
  return false;
}
function applyPack(pk, tg) {
  const k = pk.kind;
  if (tg && tg.kind === 'ent' && (tg.e.type === 'ryb' || tg.e.type === 'cutlet')) {
    const e = tg.e, d = e.deco;
    if (!packFits(pk, e)) { if (['bow', 'flower', 'plate', 'paint', 'sticker'].includes(k)) { say('Сюда это уже не приклеить', '#8db2b6'); return true; } return false; }
    if (k === 'bow') d.bow = pk.col;
    else if (k === 'flower') d.flower = pk.col;
    else if (k === 'plate') { d.plate = true; say('Пластина! Теперь это ПрессРыыбчелл — он будет давить сородичей', '#ffd166'); }
    else if (k === 'paint') { d.paint = PAINT_COLS.includes(pk.col) ? pk.col : pick(PAINT_COLS); say('Облит краской! Сородичи отнесут его в пресс', '#b7e07b'); }
    else if (k === 'sticker') d.st++;
    pk.n--; SFX.pick(); parts(e.x, 0.4, e.z, 8, '#ffe66d', 1, 0.02, 0.6);
    if (e.type === 'ryb') e.memT = 2;
    return true;
  }
  if (k === 'sticker') {
    if (tg && tg.kind === 'glass') {
      const hit = rayCyl(TANK.r); if (!hit) return false;
      G.stickers.push({ surf: 'glass', a: hit.a, h: clamp(hit.h, TANK.base + 0.2, TANK.top - 0.2), kind: pick(['star', 'heart', 'flower', 'fish']), col: pick(PALETTE.slice(0, 8)) });
      pk.n--; SFX.pick();
      const M = G.mer;
      if (glassCoverage() > 0.3) { M.emo = Math.max(0, M.emo - 4); say('Слишком много наклеек — ей тебя не видно!', '#8fb4ff'); }
      else { M.emo = Math.min(100, M.emo + 4); say('Наклейка на колбе — ей нравится (' + Math.round(glassCoverage() * 100) + '% закрыто)', '#ff8fc0'); checkWishSticker(); }
      return true;
    }
    if (G._wall && !tg) {
      const w = G._wall;
      G.stickers.push({ surf: 'wall', x: w.x, y: w.y, z: w.z, nx: w.nx, nz: w.nz, kind: pick(['star', 'heart', 'flower', 'fish']), col: pick(PALETTE.slice(0, 8)) });
      pk.n--; SFX.pick(); say('Наклейка на стене — уютнее', '#cfe'); return true;
    }
  }
  if (k === 'repair' && tg && tg.kind === 'glass') {
    const M = G.mer; M.glass = Math.min(100, M.glass + 40); M.cracks.splice(0, Math.ceil(M.cracks.length * 0.5));
    pk.n--; SFX.good(); say('Стекло подлатано (+40%)', '#9fe8ff'); return true;
  }
  return false;
}
function toolRelevant(tool, tg) {
  if (!tg) return true;
  if (tg.kind === 'glass') return false;
  const t = tg.e.type;
  if (t === 'funnel') return tool.load.length > 0;
  if (tool.kind === 'spatula') return t === 'cutlet';
  return t === 'ryb' || t === 'cutlet' || t === 'mass' || t === 'pack' || (t === 'press' && tg.part === 'slot');
}
function poke(tg) {
  const side = G.hands.R.item && !G.hands.L.item ? 'L' : 'R';
  G._poke = { t: 0, side, hold: inDown('poke'), swipe: 0 };
  SFX.poke();
  if (!tg) return;
  if (tg.kind === 'glass') { knockGlass(); return; }
  const e = tg.e;
  switch (e.type) {
    case 'ryb': pokeRyb(e, tg.part); break;
    case 'inc': case 'press':
      if (tg.part === 'switch') { if (mUp(e).auto) { e.auto = !e.auto; SFX.click(); say((e.type === 'inc' ? 'Инкубатор ' : 'Пресс ') + e.n + ': авто ' + (e.auto ? 'ВКЛ' : 'ВЫКЛ'), '#cfe'); } break; }
      if (e.type === 'inc') { G._eLock = { e, part: 'button' }; e.hold = true; progress('incHold'); }
      else G._eLock = { e, part: 'lever' };
      G._poke.hold = true;
      break;
    case 'term': openShop(); break;
    case 'funnel': say('Воронка: возьми еду и кликни по ней той рукой, в которой еда', '#ffd166'); break;
    case 'cutlet': e.vy = 1.8; e.air = true; break;
    case 'mass': SFX.gross(); break;
  }
}
function eRelease() {
  const L = G._eLock; G._eLock = null;
  if (G._poke) { G._poke.hold = false; G._poke.t = 0.15; }
  if (L && L.part === 'button' && L.e.hold) { L.e.hold = false; Snd.setHold(false, 0); harvest(L.e); }
}
function onSwipe(dy) {
  const L = G._eLock; if (!L || L.part !== 'lever') return false;
  const e = L.e;
  if (dy > 0) e.lever = clamp(e.lever + dy / (300 * (1 - 0.1 * mUp(e).speed)), 0, 1);
  if (e.lever >= 1) { if (e.slot) squish(e); else { SFX.knock(); say('Пресс пуст', '#8db2b6'); } G._eLock = null; if (G._poke) G._poke.hold = false; }
  return true;
}
function useTool(tool, tg) {
  const feed = tg && tg.kind === 'ent' && tg.e.type === 'funnel';
  if (tool.kind === 'spatula') {
    if (feed) { if (!tool.load.length) { say('Лопатка пуста', '#8db2b6'); return; } say('В воронку: ' + tool.load.length + ' котлет', '#ffd166'); feedList(tool.load); tool.load = []; return; }
    const pt = tg && tg.kind === 'ent' ? { x: tg.e.x, z: tg.e.z } : G._floor;
    if (!pt) { say('Наведи лопатку на котлеты на полу', '#8db2b6'); return; }
    const got = gatherCutlets(pt.x, pt.z, 15 - tool.load.length, 1.5);
    if (got.length) { tool.load.push(...got); SFX.pick(); say('На лопатке: ' + tool.load.length + '/15', '#ffd166'); }
    else say(tool.load.length >= 15 ? 'Лопатка полна (15)' : 'Рядом нет котлет', '#8db2b6');
    return;
  }
  // КОРОБКА
  if (feed) {
    const food = tool.load.filter(e => e.type !== 'pack');
    if (!food.length) { say('В коробке нет еды', '#8db2b6'); return; }
    const list = []; food.forEach(e => { if (e.type === 'stack') list.push(...e.list); else list.push(e); });
    tool.load = tool.load.filter(e => e.type === 'pack'); feedList(list); return;
  }
  if (tg && tg.kind === 'ent' && (tg.e.type === 'ryb' || tg.e.type === 'cutlet')) {
    // коробка как «раздатчик»: если в ней есть подходящий декор/краска — применяем, иначе кладём цель в коробку
    const pk = tool.load.find(p => p.type === 'pack' && p.n > 0 && packFits(p, tg.e));
    if (pk) { applyPack(pk, tg); tool.load = tool.load.filter(p => p.type !== 'pack' || p.n > 0); return; }
  }
  if (tg && tg.kind === 'ent' && ['ryb', 'cutlet', 'mass', 'pack'].includes(tg.e.type)) {
    if (tool.load.length >= 8) { say('Коробка полна (8)', '#8db2b6'); return; }
    const e = tg.e; rmEnt(e); if (e.type === 'ryb') { rmCarry(e); e.memT = 5; SFX.squeak(); }
    tool.load.push(e); SFX.pick(); return;
  }
  if (tg && tg.kind === 'ent' && tg.e.type === 'press' && !tg.e.slot) {
    const i = tool.load.findIndex(e => e.type === 'ryb');
    if (i >= 0) { putInPress(tool.load.splice(i, 1)[0], tg.e); return; }
  }
  if (tool.load.length) {
    const p = G.player;
    tool.load.forEach(e => {
      const list = e.type === 'stack' ? e.list : [e];
      for (const x of list) { x.x = clamp(p.x + Math.cos(p.yaw) * 0.9 + rnd(-0.3, 0.3), -ROOM + 0.3, ROOM - 0.3); x.z = clamp(p.z + Math.sin(p.yaw) * 0.9 + rnd(-0.3, 0.3), -ROOM + 0.3, ROOM - 0.3); x.y = 0.7; x.vx = rnd(-0.5, 0.5); x.vz = rnd(-0.5, 0.5); x.vy = 1; x.air = true; G.ents.push(x); }
    });
    tool.load = []; SFX.drop();
  }
}
function knockGlass() {
  SFX.knock();
  const M = G.mer; MA.knocks.push(G.t); MA.knocks = MA.knocks.filter(t => G.t - t < 10);
  if (M.rage) { M.emo = Math.max(0, M.emo - 1); return; }
  if (MA.knocks.length > 5) { M.emo = Math.max(0, M.emo - 2); say('Хватит стучать! Ей неприятно', '#8fb4ff'); MA.tapT = 0; return; }
  if (G.t - MA.lastKnockReact > 5) {
    MA.tapT = 2.2; MA.lastKnockReact = G.t; MA.tu = 0; M.emo = Math.min(100, M.emo + 1.5);
    MA.hearts.push({ x: 0.1, age: 0 }); SFX.echo(false);
  }
}
function pokeRyb(r, part) {
  r.memT = 5;
  if (part === 'eye') {
    r._poked = 1.2; r.angryT = 4; SFX.squeak();
    const M = G.mer;
    if (unl('mood') && hyp(r.x, r.z, TANK.x, TANK.z) < 9 && !M.rage && G.t - MA.lastLaugh > 3.5) {
      MA.laughT = 2.2; MA.lastLaugh = G.t; M.emo = Math.min(100, M.emo + 3); SFX.giggle(); say('Русалка хихикает щелчками', '#ff8fc0'); progress('laugh');
    }
  } else { r.vx += CAM.c * 2.4; r.vz += CAM.s * 2.4; r.pushT = 0.8; r.worT = 0; SFX.squeak(); }
}

// Контекстные подсказки под прицелом: [клавиша, действие]; клавиша '' — заголовок
function prompts() {
  const tg = G._target, L = G.hands.L.item, R = G.hands.R.item, P = [], tool = heldTool();
  const r2 = handAllowed('R');
  const freeKey = !L ? 'ЛКМ' : (r2 && !R ? 'ПКМ' : null);
  const itemKey = (pred) => (L && pred(L)) ? 'ЛКМ' : (R && pred(R)) ? 'ПКМ' : null;
  if (G._eLock) return G._eLock.part === 'lever' ? [['E + ↓', 'держи E и веди мышь вниз']] : [['E', 'отпусти в ЗЕЛЁНОЙ зоне']];
  if (!tg) {
    if (MA.looking && unl('wish')) P.push(['', 'Она смотрит на тебя…']);
    const st = itemKey(i => i.type === 'pack' && i.kind === 'sticker'); if (st && G._wall) P.push([st, 'наклеить на стену']);
    if (tool) { if (tool.kind === 'spatula' && G._floor) P.push(['E', 'подцепить котлеты']); if (tool.kind === 'box' && tool.load.length) P.push(['E', 'высыпать']); }
    if (L) P.push(['ЛКМ', 'положить' + (unl('throw') ? ' · зажать — бросок' : '')]);
    if (R) P.push(['ПКМ', 'положить' + (unl('throw') ? ' · зажать — бросок' : '')]);
    return P;
  }
  if (tg.kind === 'glass') {
    P.push(['', 'Колба']);
    const st = itemKey(i => i.type === 'pack' && i.kind === 'sticker'), rp = itemKey(i => i.type === 'pack' && i.kind === 'repair');
    if (st) P.push([st, 'наклейка на стекло']); else if (rp) P.push([rp, 'починить стекло']);
    else if (heldFood()) P.push(['', 'еду — в воронку «КОРМ» рядом']);
    P.push(['E', 'постучать по стеклу']);
    return P;
  }
  const e = tg.e;
  const packKey = itemKey(i => i.type === 'pack' && packFits(i, e));
  switch (e.type) {
    case 'funnel': {
      P.push(['', 'Воронка «КОРМ»']);
      const fk = itemKey(i => isFood(i) && i.type !== 'tool');
      if (fk) P.push([fk, 'покормить']);
      else if (tool && tool.load.some(x => x.type !== 'pack')) P.push(['E', 'высыпать в воронку']);
      else { const dk = itemKey(i => i.type === 'pack'); if (dk) P.push([dk, 'бросить декор (ей не понравится)']); else P.push(['', 'принеси рыыбчелла или котлеты']); }
      break;
    }
    case 'ryb':
      P.push(['', 'Рыыбчелл ур.' + e.lvl + (e.fav ? ' ♥ любимчик' : '') + (e.deco.plate ? ' · ПрессРыыбчелл' : '') + (e.deco.paint ? ' · окрашен' : '') + (e._alpha && !e.deco.plate ? ' · альфа' : '')]);
      if (packKey) P.push([packKey, 'украсить: ' + PACK_NAME[(L && L.type === 'pack' && packFits(L, e) ? L : R).kind].toLowerCase()]);
      else if (freeKey) P.push([freeKey, 'взять']);
      if (tool && tool.kind === 'box') P.push(['E', tool.load.some(p => p.type === 'pack' && packFits(p, e)) ? 'декор из коробки' : 'в коробку']);
      else if (unl('mood')) P.push(['E', tg.part === 'eye' ? 'ткнуть в глаз' : 'толкнуть']);
      break;
    case 'cutlet':
      P.push(['', 'Котлета ур.' + (e.lvl || 1)]);
      if (packKey) P.push([packKey, 'украсить']);
      else if (freeKey) P.push([freeKey, 'взять (до 5)']);
      else { const sk2 = itemKey(i => i.type === 'stack' && i.list.length < 5); if (sk2) P.push([sk2, 'взять ещё']); }
      if (tool) P.push(['E', tool.kind === 'spatula' ? 'подцепить лопаткой' : 'в коробку']);
      break;
    case 'mass': P.push(['', 'Старая масса (брак)']); if (freeKey) P.push([freeKey, 'взять → в утилизацию']); break;
    case 'inc':
      P.push(['', 'Инкубатор ' + e.n + ' · ' + Math.round(e.prog * 100) + '%']);
      P.push(tg.part === 'switch' ? ['E', 'авто вкл/выкл'] : ['Зажать E', 'растить икру']);
      break;
    case 'press': {
      P.push(['', 'Пресс ' + e.n + (hyp(e.x, e.z, TANK.x, TANK.z) < 6 ? ' (она это видит)' : '')]);
      if (tg.part === 'switch') { P.push(['E', 'авто вкл/выкл']); break; }
      if (e.auto && mUp(e).auto && (G._nCut || 0) >= MAX_CUT) P.push(['', 'авто ждёт: на полу слишком много котлет']);
      const rk = itemKey(i => i.type === 'ryb');
      if (e.slot) { P.push(['Зажать E + ↓', 'раздавить']); if (freeKey) P.push([freeKey, 'забрать']); }
      else P.push(rk ? [rk, 'положить в слот'] : ['', 'слот пуст — принеси рыыбчелла']);
      break;
    }
    case 'term': P.push(['', 'Терминал']); P.push(['E', 'открыть']); break;
    case 'tool': P.push(['', e.kind === 'spatula' ? 'Лопатка (до 15 котлет)' : 'Коробка (до 8 предметов, декор внутри — раздатчик)']); if (freeKey) P.push([freeKey, 'взять']); break;
    case 'pack': P.push(['', PACK_NAME[e.kind] + ' ×' + e.n]); if (freeKey) P.push([freeKey, 'взять']); break;
    case 'bin': P.push(['', 'Утилизация']); { const any = L ? 'ЛКМ' : R ? 'ПКМ' : null; if (any) P.push([any, 'выбросить']); } break;
  }
  return P;
}
