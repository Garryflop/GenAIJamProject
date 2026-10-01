
// ============================ UI: ОВЕРЛЕИ ============================
const UI = { shop: false, help: false, cheat: false, intro: false, pause: false, settings: false, confirm: false, playing: false, speed: 1,
  tab: 'inv', setTab: 'ctrl', endShown: false, mdx: 0, mdy: 0, iris: null, mode: 'proto',
  scale: 1, selM: { inc: 1, press: 1 }, fx: null, leaving: null, tips: [], coinShow: 0 };
const $ = id => document.getElementById(id);
function uiOpen() { return UI.shop || UI.help || UI.cheat || UI.intro || UI.pause || UI.settings || UI.confirm; }
function simPaused() { return UI.help || UI.intro || UI.pause || (UI.settings && UI.playing) || UI.confirm; }
// все окна нарисованы под 1280×720 и целиком масштабируются под экран — размер не «прыгает»
function fitUI() { UI.scale = clamp(Math.min(innerWidth / 1280, innerHeight / 720), 0.5, 1.6); document.documentElement.style.setProperty('--s', UI.scale.toFixed(4)); }
window.addEventListener('resize', fitUI); fitUI();
function lockPointer() {
  const cv = SCENE && SCENE.game.canvas; if (!cv || document.pointerLockElement === cv) return;
  const plain = () => { try { cv.requestPointerLock(); } catch (e) { } };
  try { const p = cv.requestPointerLock({ unadjustedMovement: true }); if (p && p.catch) p.catch(plain); } catch (e) { plain(); }
}
function releaseInputs() {
  if (G) {
    if (G._eLock) { const L = G._eLock; G._eLock = null; if (L.part === 'button') L.e.hold = false; }
    for (const s of ['L', 'R']) { G.hands[s].down = false; G.hands[s].charging = false; G.hands[s].charge = 0; }
    if (G._poke) G._poke.hold = false;
  }
  Snd.setHold(false, 0); UI.mdx = UI.mdy = 0;
  if (document.pointerLockElement) document.exitPointerLock();
}
function showOv(id, on) { $(id).classList.toggle('hidden', !on); }
function confirmBox(title, text, yes) {
  UI.confirm = true; releaseInputs(); $('cfTitle').textContent = title; $('cfText').innerHTML = text; showOv('ovConfirm', true);
  $('cfYes').onclick = () => { UI.confirm = false; showOv('ovConfirm', false); yes(); if (UI.playing && !uiOpen()) lockPointer(); };
  $('cfNo').onclick = () => { UI.confirm = false; showOv('ovConfirm', false); if (UI.playing && !uiOpen()) lockPointer(); };
}

// ============================ ИКОНКИ (SVG, цвет — currentColor) ============================
const SVGI = {
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" stroke="none"/>',
  egg: '<path d="M12 3c-4 0-7 6.5-7 10.5a7 7 0 0 0 14 0C19 9.5 16 3 12 3z"/><path d="M9 13.5a3 3 0 0 0 3 3"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  drop: '<path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z" fill="currentColor" fill-opacity=".25"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  gear: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  plus: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7.5v9M7.5 12h9"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  dumb: '<path d="M3 9.5v5M6.5 7v10M17.5 7v10M21 9.5v5M6.5 12h11"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M5 13a7 7 0 0 0 14 0M8.5 10.5h7"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  life: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/><path d="M7.5 12h2.5l1.5-3 2 5 1.5-2h1.5"/>',
  crown: '<path d="M3 8l4.5 4L12 4.5 16.5 12 21 8l-2 11H5z" fill="currentColor" fill-opacity=".22"/><path d="M5 19h14"/>',
  run: '<path d="M5 6l6 6-6 6M13 6l6 6-6 6"/>',
  hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a5 5 0 0 1-4-2l-3-4a1.5 1.5 0 0 1 2.3-2L8 14"/>',
  jump: '<path d="M12 18V5M6.5 10.5 12 5l5.5 5.5M5 21h14"/>',
  throw: '<path d="M4 19C6 11 11 7 19 6.5"/><path d="M14.5 3.5 19 6.5l-3 4.5"/>',
  glass: '<path d="M7 3h10l-1.5 18h-7z"/><path d="m11 8 2 3-2 2 1.5 3"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  box: '<path d="M3 8l9-4 9 4v9l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v9"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z"/>',
  bow: '<path d="M12 12 4 7.5v9zM12 12l8-4.5v9z" fill="currentColor" fill-opacity=".25"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>',
  earrings: '<path d="M8 3v4M16 3v4"/><path d="M8 7c-2.6 3-2.6 6.5 0 10 2.6-3.5 2.6-7 0-10zM16 7c-2.6 3-2.6 6.5 0 10 2.6-3.5 2.6-7 0-10z" fill="currentColor" fill-opacity=".25"/>',
  bracelets: '<ellipse cx="12" cy="9" rx="8" ry="3.5"/><ellipse cx="12" cy="15" rx="8" ry="3.5"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.6 0 2-1 2-2s-1-1.6-1-2.6 1-1.4 2-1.4h2a4 4 0 0 0 4-4c0-4.5-4-8-9-8z"/><circle cx="7.5" cy="11" r="1.3" fill="currentColor"/><circle cx="10" cy="7" r="1.3" fill="currentColor"/><circle cx="15" cy="7.5" r="1.3" fill="currentColor"/>',
  necklace: '<path d="M5 3c0 7 3 10 7 10s7-3 7-10"/><circle cx="12" cy="16.5" r="3.5" fill="currentColor" fill-opacity=".25"/>',
  scissors: '<circle cx="6" cy="18" r="2.6"/><circle cx="6" cy="6" r="2.6"/><path d="M8.2 7.5 20 17M8.2 16.5 20 7"/>',
  shell: '<path d="M12 20 4 10.5a8 8 0 0 1 16 0z" fill="currentColor" fill-opacity=".2"/><path d="M12 20V8.5M12 20 8.2 9.2M12 20l3.8-10.8"/>',
  pearl: '<circle cx="12" cy="12" r="6.5" fill="currentColor" fill-opacity=".2"/><circle cx="10" cy="10" r="1.6" fill="currentColor"/>',
  hstar: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L3.4 9.3l6-.7z" fill="currentColor" fill-opacity=".2"/>',
  hheart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="currentColor" fill-opacity=".2"/>'
};
function ico(k, cls = 'ic') { return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${SVGI[k] || ''}</svg>`; }

// ============================ НАСТРОЙКИ (UI) ============================
const SET_TABS = [['ctrl', 'Управление'], ['audio', 'Аудио'], ['game', 'Игра']];
function rng(key, min, max, step, val, fmtv) { return `<input type="range" data-set="${key}" min="${min}" max="${max}" step="${step}" value="${val}"><div class="val">${fmtv}</div>`; }
function tgl(key, on) { return `<div style="text-align:right"><button class="tg${on ? ' on' : ''}" data-tgl="${key}">${on ? 'ВКЛ' : 'ВЫКЛ'}</button></div>`; }
function row(name, desc, ctrl) { return `<div class="set-row"><div><div class="pn">${name}</div>${desc ? `<div class="pd">${desc}</div>` : ''}</div><div>${ctrl}</div></div>`; }
function renderSettings() {
  $('setTabs').innerHTML = SET_TABS.map(([k, n]) => `<div class="gtab${UI.setTab === k ? ' on' : ''}" data-stab="${k}">${n}</div>`).join('');
  let h = '';
  const R = c => `<div style="text-align:right">${c}</div>`;
  if (UI.setTab === 'ctrl') {
    h += row('Чувствительность мыши', '', rng('sens', 0.2, 3, 0.05, SET.sens, SET.sens.toFixed(2) + '×'));
    h += row('Инвертировать ось Y', '', tgl('invertY', SET.invertY));
    h += row('ЛКМ', 'Левая рука: взять / положить / покормить, зажать — бросок', R('<span class="kbd">ЛКМ</span>'));
    h += row('ПКМ', 'Правая рука (после прокачки «2 рука»)', R('<span class="kbd">ПКМ</span>'));
    for (const [a, name] of ACTIONS) h += row(name, '', R(`<button class="keycap${IN.rebind === a ? ' wait' : ''}" data-rebind="${a}">${IN.rebind === a ? 'Нажми клавишу…' : keyLabel(SET.keys[a])}</button>`));
    h += '<div class="row" style="margin-top:14px"><button class="gb sm steel" data-reset="keys">Сбросить клавиши</button></div>';
  } else if (UI.setTab === 'audio') {
    h += row('Общая громкость', '', rng('vol.master', 0, 1, 0.01, SET.vol.master, Math.round(SET.vol.master * 100) + '%'));
    h += row('Музыка', '', rng('vol.music', 0, 1, 0.01, SET.vol.music, Math.round(SET.vol.music * 100) + '%'));
    h += row('Эффекты', '', rng('vol.sfx', 0, 1, 0.01, SET.vol.sfx, Math.round(SET.vol.sfx * 100) + '%'));
    const n = Object.keys(AUD.el).length;
    h += row('Аудиофайлы', 'Кладутся в assets/audio/ и перечисляются в assets/audio/audio.js. Без файлов играет встроенный синтез.', R(`<span class="note">${n ? 'подключено: ' + n : 'пока нет файлов'}</span>`));
  } else {
    h += row('Поле зрения (FOV)', '', rng('fov', 60, 100, 1, SET.fov, SET.fov + '°'));
    h += row('Подсказки под прицелом', 'Какая кнопка что делает', tgl('hints', SET.hints));
    h += row('Тряска камеры', 'Удары, кормёжка, ярость', tgl('shake', SET.shake));
    h += '<div class="row" style="margin-top:14px"><button class="gb sm red" data-reset="all">Сбросить все настройки</button></div>';
  }
  $('setBody').innerHTML = h;
}
function openSettings() { releaseInputs(); UI.settings = true; renderSettings(); showOv('ovSettings', true); }
function closeSettings() { UI.settings = false; IN.rebind = null; showOv('ovSettings', false); saveSettings(); if (UI.playing && !uiOpen()) lockPointer(); }
$('setBody').addEventListener('input', ev => {
  const k = ev.target.dataset.set; if (!k) return;
  const v = parseFloat(ev.target.value);
  if (k.startsWith('vol.')) SET.vol[k.slice(4)] = v; else SET[k] = v;
  applySettings(); saveSettings();
  const lab = ev.target.nextElementSibling; if (lab) lab.textContent = k === 'sens' ? v.toFixed(2) + '×' : k === 'fov' ? v + '°' : Math.round(v * 100) + '%';
});
$('setBody').addEventListener('click', ev => {
  const b = ev.target.closest('[data-tgl],[data-rebind],[data-reset]'); if (!b) return;
  if (b.dataset.tgl) { SET[b.dataset.tgl] = !SET[b.dataset.tgl]; }
  else if (b.dataset.rebind) { IN.rebind = b.dataset.rebind; }
  else if (b.dataset.reset === 'keys') { SET.keys = JSON.parse(JSON.stringify(DEF_SET.keys)); }
  else if (b.dataset.reset === 'all') { SET = JSON.parse(JSON.stringify(DEF_SET)); }
  SFX.click(); applySettings(); saveSettings(); renderSettings();
});
$('setTabs').addEventListener('click', ev => { const t = ev.target.closest('[data-stab]'); if (t) { UI.setTab = t.dataset.stab; IN.rebind = null; SFX.click(); renderSettings(); } });

// ============================ ТЕРМИНАЛ: ДАННЫЕ ============================
// вкладки: [ключ, имя, с какого этапа, иконка]; «Персонаж» — всегда справа отдельной колонкой
const TABS = [['inv', 'Инвентарь', 5, 'box'], ['mach', 'Аппараты', 5, 'gear'], ['bonus', 'Бонус', 5, 'bolt'], ['cust', 'Русалка', 6, 'heart']];
const PRESTIGE_H = 1.95; // престиж открывается с 195 см
const pm = () => Math.pow(1.2, G.prestige || 0); // каждый престиж: цены +20%
const price = c => Math.round(c * pm());
const pf = n => Math.round(n).toLocaleString('ru-RU');
const INV = [
  { k: 'spatula', name: 'Лопатка', desc: 'Инструмент. E по котлетам — подцепить до 15 штук, E по воронке — скормить все разом. Котлеты «приклеены» даже при броске.', cost: 80 },
  { k: 'bow', n: 5, name: 'Бантики', desc: 'Декор еды: пачку в руку и клик по рыыбчеллу или котлете. Ей так вкуснее.', cost: 40 },
  { k: 'paint', n: 3, name: 'Краска', desc: 'Облей рыыбчелла — сородичи сами отнесут его в пресс. Каждой банки хватает на 3 покраса.', cost: 60 },
  { k: 'box', name: 'Коробка', desc: 'Инструмент на 8 предметов. Брось — соберёт всё на пути. Положи внутрь пачки декора или краски и жми E по рыыбчеллам — раздаёт (8 банок краски × 3 = 24 покраса).', cost: 120 },
  { k: 'plate', n: 1, name: 'Пластина', desc: 'Делает ПрессРыыбчелла: он падает и давит сородичей в котлеты. Сам крупнее, дороже, ведёт стаю. Многоразовая: когда его прессуют, пластина выпадает обратно.', cost: 300 },
  { k: 'sticker', n: 5, name: 'Стикеры', desc: 'На стены (уют), на колбу (ей нравится, пока закрыто не больше 30%), на рыыбчеллов.', cost: 30 }
];
const MUP = {
  inc: [
    { key: 'speed', name: 'Скорость', ic: 'bolt', desc: '+18% к росту икры за уровень.', max: 5, cost: [60, 150, 350, 800, 1800] },
    { key: 'protect', name: 'Защита кнопки', ic: 'shield', desc: 'Шкала застывает в зелёной зоне — без брака.', max: 1, cost: [250] },
    { key: 'auto', name: 'Авто-режим', ic: 'gear', desc: 'Сам растит и выпускает рыыбчеллов (медленнее). После покупки здесь появится переключатель.', max: 1, cost: [600] },
    { key: 'quality', name: 'Качество икры', ic: 'egg', desc: 'Шанс на рыыбчелла ур.2 / 3 / 4.', max: 3, cost: [400, 1200, 3000] },
    { key: 'paint', name: 'Окрашенная икра', ic: 'drop', desc: '+10% за уровень: рыыбчелл родится в краске — его сразу понесут под пресс.', max: 5, cost: [1500, 3000, 6000, 12000, 24000] }
  ],
  press: [
    { key: 'speed', name: 'Скорость', ic: 'bolt', desc: 'Короче свайп рычага, быстрее авто-режим.', max: 5, cost: [60, 150, 350, 800, 1800] },
    { key: 'auto', name: 'Авто-режим', ic: 'gear', desc: 'Сам давит рыыбчелла в слоте. После покупки здесь появится переключатель.', max: 1, cost: [900] }
  ]
};
const MORDER = { inc: ['speed', 'quality', 'protect', 'paint', 'auto'], press: ['speed', 'auto'] };
const NEWM = { inc: [300, 1200, 3500], press: [400, 1500] };
const SHOP = [
  { id: 'run', tab: 'char', name: 'Бег', ic: 'run', desc: 'Shift — бег.', max: 1, cost: () => 120, lvl: () => G.up.run, buy: () => G.up.run = 1 },
  { id: 'hand2', tab: 'char', name: '2 рука', ic: 'hand', desc: 'Открывает правую руку на ПКМ: носи две вещи сразу.', max: 1, cost: () => 400, lvl: () => G.up.hand2, buy: () => G.up.hand2 = 1 },
  { id: 'jump', tab: 'char', name: 'Прыжок', ic: 'jump', desc: 'Space — прыжок.', max: 1, cost: () => 150, lvl: () => G.up.jump, buy: () => G.up.jump = 1 },
  { id: 'throw', tab: 'char', name: 'Бросок', ic: 'throw', desc: 'Сильнее и быстрее заряжается бросок.', max: 3, cost: lc => [100, 350, 900][lc], lvl: () => G.up.throw, buy: () => G.up.throw++ },
  { id: 'life', tab: 'bonus', name: 'Жизнеобеспечение', ic: 'life', desc: '−9% потери сытости за уровень: она дольше остаётся сытой.', max: 5, cost: l => [200, 500, 1100, 2400, 5000][l], lvl: () => G.up.life, buy: () => G.up.life++ },
  { id: 'dur', tab: 'bonus', name: 'Длительность', ic: 'clock', desc: '+1 с к таймеру бонуса.', max: 4, cost: l => [100, 250, 600, 1400][l], lvl: () => G.up.bDur, buy: () => G.up.bDur++ },
  { id: 'pow', tab: 'bonus', name: 'Сила', ic: 'dumb', desc: '+15% к выплате бонуса.', max: 4, cost: l => [150, 400, 1000, 2500][l], lvl: () => G.up.bPow, buy: () => G.up.bPow++ },
  { id: 'stab', tab: 'bonus', name: 'Стабильность', ic: 'anchor', desc: 'Таймер бонуса сжимается за итерацию на 2% меньше (база −8%).', max: 4, cost: l => [120, 300, 700, 1500][l], lvl: () => G.up.bStab, buy: () => G.up.bStab++ },
  { id: 'combo', tab: 'bonus', name: 'Комбо', ic: 'link', desc: 'После бонуса есть окно (1 с + уровень), чтобы продолжить с последней цифры.', max: 3, cost: l => [300, 900, 2000][l], lvl: () => G.up.bCombo, buy: () => G.up.bCombo++ }
];
const shopIt = id => SHOP.find(s => s.id === id);
// Товары открываются по мере заработка за текущий забег (после престижа — заново)
const UNLOCK = { 'inv:paint': 100, 'inv:box': 200, 'inv:plate': 500,
  'mup:inc:protect': 150, 'mup:inc:auto': 350, 'mup:inc:quality': 600, 'mup:inc:paint': 1500, 'new:inc': 200,
  'mup:press:auto': 500, 'new:press': 600,
  'bon:pow': 100, 'bon:life': 150, 'bon:stab': 300, 'bon:combo': 500,
  'char:jump': 80, 'char:throw': 120, 'char:hand2': 250,
  'cust:bow': 1500, 'cust:hair': 2000, 'cust:bracelets': 2500, 'cust:earrings': 3000, 'cust:pendant': 4000, 'cust:style': 5000 };
const unlockAt = k => Math.round((UNLOCK[k] || 0) * pm());
const isOpen = k => !UNLOCK[k] || (G.runEarned || 0) >= unlockAt(k);
const CUST_NAME = { bow: 'Бантик', earrings: 'Серьги', bracelets: 'Браслеты', hair: 'Цвет волос', pendant: 'Кулон', style: 'Причёска' };
function unlName(k) {
  const [a, b, c2] = k.split(':');
  if (a === 'inv') return INV.find(i => i.k === b).name;
  if (a === 'mup') return (b === 'inc' ? 'Инкубатор' : 'Пресс') + ' · ' + MUP[b].find(d => d.key === c2).name;
  if (a === 'new') return b === 'inc' ? 'Новый инкубатор' : 'Новый пресс';
  if (a === 'cust') return CUST_NAME[b];
  return shopIt(b).name;
}
const keyTab = k => ({ inv: 'inv', mup: 'mach', new: 'mach', bon: 'bonus', cust: 'cust', char: 'side' })[k.split(':')[0]];
function checkUnlocks(silent) {
  if (!G) return; G.unl = G.unl || {}; G.newUnl = G.newUnl || {};
  for (const k in UNLOCK) if (!G.unl[k] && isOpen(k)) {
    G.unl[k] = 1; if (silent) continue;
    G.newUnl[k] = 1;
    if (unl('shop') && (keyTab(k) !== 'cust' || unl('cust'))) { say('В терминале открылось: ' + unlName(k), '#ffd166'); SFX.coin && SFX.coin(); }
  }
}
function clearNew(tab) { if (G && G.newUnl) for (const k in G.newUnl) if (keyTab(k) === tab) delete G.newUnl[k]; }
const newB = k => G.newUnl && G.newUnl[k] ? '<div class="newb">НОВОЕ</div>' : '';
function lockHTML(k) {
  const thr = unlockAt(k), e = Math.min(G.runEarned || 0, thr);
  return `<div class="lockb">${ico('lock')}<div class="bar"><i style="width:${(e / thr * 100).toFixed(1)}%"></i></div><div class="lvl">${pf(e)} / ${pf(thr)}</div></div>`;
}
const lockTip = k => 'Откроется, когда заработаешь ещё ' + pf(Math.max(0, unlockAt(k) - (G.runEarned || 0))) + ' монет';
const SIDE = ['run', 'hand2', 'jump', 'throw'];
const CUST_X = 30; // наряды для неё — в 30 раз дороже
const ACCS = [['bow', 'Бантик', 150, 'bow'], ['earrings', 'Серьги', 180, 'earrings'], ['bracelets', 'Браслеты', 160, 'bracelets']];
const PENDANTS = [['shell', 'Ракушка', 'shell'], ['pearl', 'Жемчуг', 'pearl'], ['heart', 'Сердце', 'hheart'], ['star', 'Звезда', 'hstar']];
const STYLES = [['bob', 'Каре'], ['long', 'Длинные'], ['bun', 'Пучок'], ['twin', 'Хвостики']];
const HAIR_DEF = '#8a63ff';
const C_HAIR = 120, C_PEND = 200, C_STYLE = 250;
const pendOwned = () => G.cust.owned.pendant || PENDANTS.some(p => G.cust.owned['p_' + p[0]]);
const styleOwned = () => G.cust.owned.style || STYLES.some(s => s[0] !== 'long' && G.cust.styles[s[0]]);

// ============================ ТЕРМИНАЛ: ИКОНКИ ПРЕДМЕТОВ ============================
const ICONS = {};
function iconURL(k) {
  if (ICONS[k]) return ICONS[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = 160; const c = cv.getContext('2d');
  if (k === 'spatula') drawSpatula(c, 74, 96, 370, { load: [] }, -0.5);
  else if (k === 'box') drawBox(c, 80, 128, 240, { load: [] });
  else if (k === 'bow') bowShape(c, 80, 72, 62, '#ff6fa8');
  else if (k === 'plate') { // одна пластина, как на ПрессРыыбчелле
    c.save(); c.translate(80, 82); c.rotate(-0.28);
    const g = c.createLinearGradient(-56, 0, 56, 0); g.addColorStop(0, '#6f7c84'); g.addColorStop(0.5, '#e3eaed'); g.addColorStop(1, '#6f7c84');
    c.fillStyle = g; rrect(c, -56, -37, 112, 74, 11); c.fill();
    c.fillStyle = '#4a555b'; for (const [a, b] of [[-41, -22], [41, -22], [-41, 22], [41, 22]]) { circ(c, a, b, 5.5); c.fill(); }
    c.restore();
  } else if (k === 'sticker') { // три наклейки веером
    const S = [[-34, 8, -0.3, '#ffe66d', 'star'], [34, 8, 0.28, '#ff8fc0', 'heart'], [0, -12, 0, '#6ff0d9', 'star']];
    for (const [dx, dy, r, col, kind] of S) {
      c.save(); c.translate(80 + dx, 80 + dy); c.rotate(r);
      c.fillStyle = '#f7fbfb'; rrect(c, -30, -30, 60, 60, 12); c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = col; if (kind === 'star') star(c, 0, 0, 20); else heart(c, 0, 2, 20); c.fill();
      c.restore();
    }
  } else drawPack(c, 80, 128, 320, { kind: k, n: 1, col: k === 'paint' ? PAINT_COLS[0] : '#ff6fa8' });
  try { ICONS[k] = cv.toDataURL(); } catch (e) { ICONS[k] = ''; }
  return ICONS[k];
}
function deliver(kind, n) {
  const pad = G.ents.find(e => e.type === 'pad');
  const x = (pad ? pad.x : -9) + rnd(-0.4, 0.4), z = (pad ? pad.z : 8.8) + rnd(-0.4, 0.4);
  const e = kind === 'spatula' || kind === 'box' ? mkTool(kind, x, z) : mkPack(kind, n, x, z);
  if (kind === 'paint') e.col = pick(PAINT_COLS);
  e.y = 3.6; e.air = true; e.vy = -1;
  SFX.tube(); say('Доставлено к терминалу: ' + (PACK_NAME[kind] || (kind === 'spatula' ? 'Лопатка' : 'Коробка')), '#9fe8ff');
}

// ============================ ТЕРМИНАЛ: ОТРИСОВКА ============================
function tip(title, text, extra) { UI.tips.push(`<div class="tt">${title}</div>${text || ''}${extra ? `<div class="tq">${extra}</div>` : ''}`); return ` data-tip="${UI.tips.length - 1}"`; }
function pbtn(cost, act) { return `<button class="gb sm wide${G.coins < cost ? ' poor' : ''}" data-cost="${cost}" ${act}><i class="coin"></i>${pf(cost)}</button>`; }
function pipsHTML(l, max, key) {
  const fresh = UI.fx && UI.fx.k === key;
  let h = '<div class="pips">'; for (let i = 0; i < max; i++) h += `<div class="pip${i < l ? ' on' : ''}${fresh && i === l - 1 ? ' new' : ''}"></div>`;
  return h + '</div>';
}
const lvTxt = (l, max) => max > 1 ? `Уровень ${l} / ${max}` : (l ? 'Куплено' : '');
function invHTML() {
  return '<div class="ginv pane">' + INV.map((it, i) => {
    const c = price(it.cost), qty = it.n ? 'В наборе: ' + it.n + ' шт.' : 'Инструмент · 1 шт.', k = 'inv:' + it.k;
    if (!isOpen(k)) return `<div class="cd lockd" data-k="${k}"${tip(it.name, it.desc, lockTip(k))}><div class="art"><img src="${iconURL(it.k)}" alt=""></div>
      <div class="info"><div class="nm">${it.name}</div>${lockHTML(k)}</div></div>`;
    return `<div class="cd" data-k="${k}"${tip(it.name, it.desc, qty)}>${newB(k)}<div class="art"><img src="${iconURL(it.k)}" alt=""></div>
      <div class="info"><div class="nm">${it.name}</div><div class="qty">${it.n ? it.n + ' шт.' : 'инструмент'}</div>${pbtn(c, `data-act="inv" data-i="${i}"`)}</div></div>`;
  }).join('') + '</div>';
}
function machCard(m, d) {
  const u = mUp(m), l = u[d.key] || 0, max = l >= d.max, key = `mup:${m.type}:${d.key}`;
  if (!isOpen(key)) return `<div class="cd lockd" data-k="${key}"${tip(d.name, d.desc, lockTip(key))}>${ico(d.ic)}<div class="mid"><div class="nm">${d.name}</div></div>${lockHTML(key)}</div>`;
  let foot = max ? '' : pbtn(price(d.cost[l]), `data-act="mup" data-id="${m.id}" data-key="${d.key}"`);
  const sw = d.key === 'auto' && max; // купленный авто-режим не серый: на нём переключатель
  if (sw) foot = `<button class="tgx${m.auto ? ' on' : ''}" data-act="mt" data-id="${m.id}">${m.auto ? 'АВТО: ВКЛ' : 'АВТО: ВЫКЛ'}</button>`;
  const body = `${ico(d.ic)}<div class="mid"><div class="nm">${d.name}</div>${d.max > 1 ? pipsHTML(l, d.max, key) : ''}</div>`;
  return `<div class="cd${max ? (sw ? ' own' : ' max') : ''}" data-k="${key}"${tip(d.name, d.desc, lvTxt(l, d.max))}>${newB(key)}${max ? `<div class="stampx">${d.max > 1 ? 'МАКС' : 'ЕСТЬ'}</div>` : ''}${body}${foot}</div>`;
}
const glassCost = () => price(30 + (100 - G.mer.glass) * 2);
function machHTML() {
  let h = '';
  for (const type of ['inc', 'press']) {
    const list = G.ents.filter(e => e.type === type).sort((a, b) => a.n - b.n); if (!list.length) continue;
    const sel = list.find(m => m.n === UI.selM[type]) || list[0]; UI.selM[type] = sel.n;
    const nm = type === 'inc' ? 'Инкубатор' : 'Пресс';
    let cards = MORDER[type].map(k => machCard(sel, MUP[type].find(d => d.key === k))).join('');
    const nc = NEWM[type][list.length - 1];
    const nk = 'new:' + type;
    cards += nc !== undefined && !isOpen(nk)
      ? `<div class="cd newm lockd" data-k="${nk}"${tip('+ ' + nm, 'Построить ещё один аппарат.', lockTip(nk))}>${ico('plus')}<div class="mid"><div class="nm">+${nm}</div></div>${lockHTML(nk)}</div>`
      : nc !== undefined
      ? `<div class="cd newm" data-k="new:${type}"${tip('+ ' + nm, 'Построить ещё один аппарат. У каждого — свои улучшения: выбирай номер слева.', 'Сейчас: ' + list.length + ' шт.')}>${newB(nk)}${ico('plus')}<div class="mid"><div class="nm">+${nm}</div></div>${pbtn(price(nc), `data-act="newm" data-t="${type}"`)}</div>`
      : `<div class="cd newm max"${tip('+ ' + nm, 'Построены все аппараты этого типа.')}><div class="stampx">МАКС</div>${ico('plus')}<div class="mid"><div class="nm">+${nm}</div></div></div>`;
    const selH = list.map(m => `<button class="${m.n === sel.n ? 'on' : ''}${UI.fx && UI.fx.k === 'sel:' + type + ':' + m.n ? ' new' : ''}" data-act="sel" data-t="${type}" data-n="${m.n}">${m.n}</button>`).join('');
    const st = sel.up && sel.up.auto ? (sel.auto ? 'Авто-режим работает' : 'Авто-режим выключен') : 'Улучшения у каждого свои';
    h += `<div class="mrow"><div class="mhead"><div class="mn">${nm}</div><div class="msel">${selH}</div><div class="ms">№${sel.n} · ${st}</div></div><div class="mcards ${type === 'inc' ? 'n6' : 'n3'}">${cards}</div></div>`;
  }
  if (G.mer.glass < 100) h += `<div class="glassbar">${ico('glass')}<div class="gt">Стекло колбы ${Math.round(G.mer.glass)}%</div><div class="bar"><i style="width:${G.mer.glass}%"></i></div><div style="width:170px"${tip('Ремонт стекла', 'Заделать все трещины колбы. Чем сильнее повреждение, тем дороже.')}>${pbtn(glassCost(), 'data-act="glass"')}</div></div>`;
  return `<div class="gmach pane">${h}</div>`;
}
function bonusCard(id, cls = '') {
  const it = shopIt(id), l = it.lvl(), max = l >= it.max, key = 'bon:' + id;
  if (!isOpen(key)) return `<div class="cd ${cls} lockd" data-k="${key}"${tip(it.name, it.desc, lockTip(key))}>${ico(it.ic)}<div class="nm">${it.name}</div>${lockHTML(key)}</div>`;
  return `<div class="cd ${cls}${max ? ' max' : ''}" data-k="${key}"${tip(it.name, it.desc, lvTxt(l, it.max))}>${newB(key)}${max ? '<div class="stampx">МАКС</div>' : ''}${ico(it.ic)}<div class="nm">${it.name}</div>${pipsHTML(l, it.max, key)}<div class="lvl">${l} / ${it.max}</div>${max ? '' : pbtn(price(it.cost(l)), `data-act="buy" data-id="${id}"`)}</div>`;
}
function bonusHTML() {
  const h = merHeight(), ok = h >= PRESTIGE_H, p = clamp((h - 1.5) / (PRESTIGE_H - 1.5), 0, 1);
  const pp = G.prestige || 0;
  const prest = `<div class="cd prest" data-k="prest"${tip('Престиж', 'Всё начинается заново: монеты, аппараты, улучшения, её рост — 150 см. Навсегда за каждый престиж: <b>+5% к её росту</b> и <b>+10% к доходу</b>. Цены — на 20% выше. Наряды и отношение сохраняются.', pp ? 'Сейчас: рост +' + 5 * pp + '%, доход +' + 10 * pp + '%, цены +' + Math.round((pm() - 1) * 100) + '%' : '')}>
    ${ico('crown')}<div class="nm">ПРЕСТИЖ${G.prestige ? ' ' + G.prestige : ''}</div><div class="note">${ok ? 'Готово! Можно начинать заново — сильнее.' : 'Открывается с ' + Math.round(PRESTIGE_H * 100) + ' см роста'}</div>
    <div class="bar"><i style="width:${(p * 100).toFixed(1)}%"></i></div><div class="lvl">${Math.round(h * 100)} / ${Math.round(PRESTIGE_H * 100)} СМ</div>
    ${ok ? '<button class="gb big" data-act="prestige">Сделать престиж</button>' : ''}</div>`;
  return `<div class="gbon pane">${prest}${bonusCard('dur')}${bonusCard('combo')}${bonusCard('life', 'tall')}${bonusCard('pow')}${bonusCard('stab')}</div>`;
}
function palGrid(key, cur, owned) { return `<div class="palg${owned ? '' : ' off'}">` + PALETTE.map(c => `<button class="${c === cur ? 'on' : ''}" style="background:${c}" data-act="col" data-k="${key}" data-c="${c}"></button>`).join('') + '</div>'; }
function custFoot(owned, cost, key) { return owned ? '<div class="owned">✓ КУПЛЕНО</div>' : pbtn(cost, `data-act="cbuy" data-k="${key}"`); }
function custHTML() {
  const C = G.cust, o = C.owned, h = [];
  const locked = (k, n, ic) => `<div class="cd lockd" data-k="cust:${k}"${tip(n, 'Украшение для неё.', lockTip('cust:' + k))}><div class="chead">${ico(ic)}<div class="nm">${n}</div></div>${lockHTML('cust:' + k)}</div>`;
  for (const [k, n, c0, ic] of ACCS) {
    if (!o[k] && !isOpen('cust:' + k)) { h.push(locked(k, n, ic)); continue; }
    const own = !!o[k], cur = C[k] ? C[k].color : C['_' + k];
    h.push(`<div class="cd" data-k="cust:${k}"${tip(n, 'Украшение для неё. Галочка — надеть или снять, цвет — любой из палитры.', own ? (C[k] ? 'Надето' : 'Снято') : '')}>
      ${newB('cust:' + k)}<div class="chead">${ico(ic)}<div class="nm">${n}</div><button class="chk${C[k] ? ' on' : ''}" data-act="wear" data-k="${k}" ${own ? '' : 'disabled'}></button></div>
      ${palGrid(k, cur, own)}${custFoot(own, price(c0 * CUST_X), k)}</div>`);
  }
  const hOwn = !!o.hair, hOn = hOwn && C.hairOn !== false;
  if (!hOwn && !isOpen('cust:hair')) h.push(locked('hair', 'Цвет волос', 'palette')); else h.push(`<div class="cd" data-k="cust:hair"${tip('Цвет волос', 'Перекрась ей волосы. Галочка снята — родной цвет.')}>
    <div class="chead">${ico('palette')}<div class="nm">Цвет волос</div><button class="chk${hOn ? ' on' : ''}" data-act="hairOn" ${hOwn ? '' : 'disabled'}></button></div>
    ${palGrid('hair', hOn ? C.hairColor : C._hair, hOwn)}${custFoot(hOwn, price(C_HAIR * CUST_X), 'hair')}</div>`);
  const pOwn = pendOwned(), pCur = C.pendant ? C.pendant.type : null;
  const pend = !pOwn && !isOpen('cust:pendant') ? locked('pendant', 'Кулон', 'necklace') : `<div class="cd" data-k="cust:pendant"${tip('Кулон', 'Кулон на шею. Выбери форму; галочка — надеть или снять.')}>
    <div class="chead">${ico('necklace')}<div class="nm">Кулон</div><button class="chk${pCur ? ' on' : ''}" data-act="pendOn" ${pOwn ? '' : 'disabled'}></button></div>
    <div class="opts${pOwn ? '' : ' off'}">${PENDANTS.map(([k, n, ic]) => `<button class="${pCur === k ? 'on' : ''}" data-act="pend" data-k="${k}" title="${n}">${ico(ic)}</button>`).join('')}</div>
    ${custFoot(pOwn, price(C_PEND * CUST_X), 'pendant')}</div>`;
  const sOwn = styleOwned(), sOn = sOwn && C.styleOn !== false;
  const style = !sOwn && !isOpen('cust:style') ? locked('style', 'Причёска', 'scissors') : `<div class="cd" data-k="cust:style"${tip('Причёска', 'Сделай ей новую причёску. Галочка снята — обычные длинные волосы.')}>
    <div class="chead">${ico('scissors')}<div class="nm">Причёска</div><button class="chk${sOn ? ' on' : ''}" data-act="styleOn" ${sOwn ? '' : 'disabled'}></button></div>
    <div class="opts${sOwn ? '' : ' off'}">${STYLES.map(([k, n]) => `<button class="${C.hairStyle === k && sOn ? 'on' : ''}" data-act="style" data-k="${k}">${n}</button>`).join('')}</div>
    ${custFoot(sOwn, price(C_STYLE * CUST_X), 'style')}</div>`;
  return `<div class="gcust pane">${h.join('')}<div class="low">${pend}${style}</div></div>`;
}
function sideHTML() {
  const items = SIDE.map(shopIt).filter(it => it.lvl() < it.max || UI.leaving === it.id);
  if (!items.length) return '';
  return '<div class="cap">ПЕРСОНАЖ</div>' + items.map(it => {
    const l = it.lvl(), leave = UI.leaving === it.id, key = 'char:' + it.id;
    if (!isOpen(key)) return `<div class="cd side-cd lockd" data-k="${key}"${tip(it.name, it.desc, lockTip(key))}>${ico(it.ic)}<div class="nm">${it.name}</div>${lockHTML(key)}</div>`;
    return `<div class="cd side-cd${leave ? ' leave' : ''}" data-k="${key}"${tip(it.name, it.desc, lvTxt(l, it.max))}>${newB(key)}${ico(it.ic)}<div class="nm">${it.name}</div>${it.max > 1 ? pipsHTML(l, it.max, key) : ''}${leave ? '' : pbtn(price(it.cost(l)), `data-act="buy" data-id="${it.id}"`)}</div>`;
  }).join('');
}
function renderShop() {
  if (!G) return;
  const open = TABS.filter(t => G.stage >= t[2]);
  if (open.length && !open.some(t => t[0] === UI.tab)) UI.tab = open[0][0];
  UI.tips = []; const tipEl = $('tip'); tipEl._i = -1; tipEl.classList.remove('on');
  $('shopTabs').innerHTML = TABS.map(([k, n, st, ic]) => G.stage >= st
    ? `<div class="gtab${UI.tab === k ? ' on' : ''}${G.newUnl && Object.keys(G.newUnl).some(q => keyTab(q) === k) && UI.tab !== k ? ' hasnew' : ''}" data-act="tab" data-tab="${k}">${ico(ic)}${n}</div>`
    : `<div class="gtab lock">${ico('lock')}${n}</div>`).join('');
  const prevTab = $('shopList').dataset.tab;
  $('shopList').innerHTML = UI.tab === 'inv' ? invHTML() : UI.tab === 'mach' ? machHTML() : UI.tab === 'bonus' ? bonusHTML() : custHTML();
  if (prevTab === UI.tab) { const p = $('shopList').querySelector('.pane'); if (p) p.style.animation = 'none'; } // въезд — только при смене вкладки
  $('shopList').dataset.tab = UI.tab;
  $('shopSide').innerHTML = sideHTML();
  const mult = $('coinMult'); if (mult) mult.textContent = G.prestige ? 'цены ×' + pm().toFixed(2) : '';
  // эффект покупки: вспышка карточки + искры
  if (UI.fx) {
    const el = document.querySelector(`#ovShop [data-k="${UI.fx.k}"]`);
    if (el) { el.classList.add('buy'); const b = document.createElement('div'); b.className = 'burst'; b.innerHTML = Array.from({ length: 10 }, (_, i) => `<i style="--a:${i * 36}deg"></i>`).join(''); el.appendChild(b); }
    UI.fx = null;
  }
}
// ---------- живое обновление: счётчик монет «докручивается», недоступные цены гаснут ----------
function coinLoop() {
  if (!UI.shop || !G) return;
  const d = G.coins - UI.coinShow; UI.coinShow = Math.abs(d) < 1 ? G.coins : UI.coinShow + d * 0.22;
  const n = $('coinNum'); if (n) n.textContent = pf(UI.coinShow);
  if ((UI._cl = (UI._cl || 0) + 1) % 8 === 0) document.querySelectorAll('#ovShop [data-cost]').forEach(b => b.classList.toggle('poor', G.coins < +b.dataset.cost));
  requestAnimationFrame(coinLoop);
}
function coinFloat(cost) {
  const box = $('shopCoins'), f = document.createElement('div'); f.className = 'cfloat'; f.textContent = '−' + pf(cost); box.appendChild(f);
  box.classList.remove('tick'); void box.offsetWidth; box.classList.add('tick'); setTimeout(() => f.remove(), 900);
}
function poorFx(card) {
  SFX.bad(); const el = card || $('shopCoins');
  el.classList.remove('poor'); void el.offsetWidth; el.classList.add('poor'); setTimeout(() => el.classList.remove('poor'), 400);
  const box = $('shopCoins'); box.classList.remove('poor'); void box.offsetWidth; box.classList.add('poor');
}
function custReact(acc, isNew) {
  const M = G.mer;
  if (isNew) { M.emo = Math.min(100, M.emo + 10); M.rel = Math.min(100, M.rel + 1); MA.loveT = 2.5; SFX.love(); say('Ей нравится новое украшение!', '#ff8fc0'); }
  else if (G.t - (G._lastCust || -99) > 30) { G._lastCust = G.t; M.emo = Math.min(100, M.emo + 3); MA.loveT = 1.2; }
  if (acc) checkWishAcc(acc);
}
function spend(c) { if (G.coins < c) return false; G.coins -= c; SFX.buy(); progress('buy'); return true; }
// Престиж: всё начинается заново, кроме нарядов, отношения и пройденного обучения
function doPrestige() {
  const M = G.mer;
  G.prestige = (G.prestige || 0) + 1;
  for (const s of ['L', 'R']) { G.hands[s].item = null; G.hands[s].down = G.hands[s].charging = false; }
  G._eLock = null;
  G.ents = G.ents.filter(e => e.type === 'funnel' || e.type === 'term' || e.type === 'bin' || e.type === 'pad');
  clear3D(); popIn(mkMachine('inc', 1)); popIn(mkMachine('press', 1));
  for (const k in G.up) G.up[k] = 0; G.up.incCount = 1; G.up.pressCount = 1;
  G.coins = 40; G.runEarned = 0; G.unl = {}; G.newUnl = {}; checkUnlocks(true);
  G.bonus = { streak: 0, timer: 0, pot: 0, comboT: 0, best: G.bonus.best, maxT: 1 };
  G.stickers = []; G.lastRyb = [];
  M.growth = 0; M.layers = 1; M.sat = 80; M.emo = 55; M.glass = 100; M.cracks = []; M.rage = false; M.starveT = 0; M.wish = null; M.wishTimer = 20;
  MA.finale = 0; MA.food = [];
  for (let i = 0; i < 3; i++) popIn(mkRyb(FUNNEL.x + 1.2 + i * 0.5, FUNNEL.z + 1.6, 1));
  UI.selM = { inc: 1, press: 1 };
  G.goals = {}; G.run = { best: 0, pressRyb: 0 }; // цели смены — заново, с наградами под новые цены
  const p = G.prestige;
  G._stageFx = { head: 'ПРЕСТИЖ ' + p + ' · ВСЁ С НУЛЯ', sub: 'Навсегда: рост +' + 5 * p + '%, доход +' + 10 * p + '% · цены +' + Math.round((pm() - 1) * 100) + '%' }; SFX.record();
}
function onShopClick(ev) {
  const b = ev.target.closest('[data-act]'); if (!b || b.disabled || !G) return;
  const d = b.dataset, C = G.cust, card = b.closest ? b.closest('.cd') : null, key = card ? card.dataset.k : null;
  const buy = (cost, fn, fxKey) => {
    if (G.coins < cost) { poorFx(card); return false; }
    spend(cost); coinFloat(cost); fn(); UI.fx = { k: fxKey || key }; return true;
  };
  switch (d.act) {
    case 'tab': if (UI.tab === d.tab) return; clearNew(UI.tab); UI.tab = d.tab; SFX.click(); break;
    case 'inv': { const it = INV[+d.i]; buy(price(it.cost), () => deliver(it.k, it.n)); break; }
    case 'buy': { const it = shopIt(d.id); buy(price(it.cost(it.lvl())), () => { it.buy(); if (it.tab === 'char' && it.lvl() >= it.max) UI.leaving = it.id; });
      if (UI.leaving) setTimeout(() => { UI.leaving = null; if (UI.shop) renderShop(); }, 460); break; }
    case 'mup': { const m = byId(+d.id), u = mUp(m), def = MUP[m.type].find(x => x.key === d.key);
      buy(price(def.cost[u[d.key] || 0]), () => { u[d.key] = (u[d.key] || 0) + 1; if (d.key === 'auto') m.auto = true; }); break; }
    case 'mt': { const m = byId(+d.id); m.auto = !m.auto; SFX.click(); break; }
    case 'sel': if (UI.selM[d.t] === +d.n) return; UI.selM[d.t] = +d.n; SFX.click(); break;
    case 'newm': { const t = d.t, cnt = G.ents.filter(e => e.type === t).length;
      buy(price(NEWM[t][cnt - 1]), () => { popIn(mkMachine(t, cnt + 1)); if (t === 'inc') G.up.incCount = cnt + 1; else G.up.pressCount = cnt + 1; UI.selM[t] = cnt + 1; }, 'sel:' + t + ':' + (cnt + 1)); break; }
    case 'glass': buy(glassCost(), () => { G.mer.glass = 100; G.mer.cracks = []; }); break;
    case 'prestige': { const np = (G.prestige || 0) + 1; confirmBox('ПРЕСТИЖ?', `<b style="color:var(--red)">Сбросится:</b> монеты, аппараты и их улучшения, навыки, бонусы, всё на полу; её рост — снова 150 см.<br><b style="color:var(--ok)">Останется:</b> наряды, отношение, пройденное обучение.<br><b style="color:var(--gold)">Навсегда:</b> рост +${5 * np}%, доход +${10 * np}%. Цены станут +${Math.round((Math.pow(1.2, np) - 1) * 100)}%.`, () => { doPrestige(); if (UI.shop) closeShop(); }); return; }
    case 'cbuy': {
      const k = d.k, c0 = k === 'hair' ? C_HAIR : k === 'pendant' ? C_PEND : k === 'style' ? C_STYLE : ACCS.find(a => a[0] === k)[2];
      buy(price(c0 * CUST_X), () => {
        C.owned[k] = true;
        if (k === 'hair') { C.hairOn = true; C.hairColor = C._hair || pick(PALETTE.slice(0, 8)); custReact(null, true); }
        else if (k === 'pendant') { C.pendant = { type: C._pend || 'pearl' }; custReact('pendant', true); }
        else if (k === 'style') { for (const [s] of STYLES) C.styles[s] = true; C.styleOn = true; C.hairStyle = C._style || 'bob'; custReact(null, true); }
        else { C[k] = { color: C['_' + k] || pick(PALETTE.slice(0, 8)) }; custReact(k, true); }
      }); break;
    }
    case 'wear': { const k = d.k; if (C[k]) { C['_' + k] = C[k].color; C[k] = null; } else { C[k] = { color: C['_' + k] || pick(PALETTE.slice(0, 8)) }; custReact(k, false); } SFX.click(); break; }
    case 'col': {
      const k = d.k, col = d.c;
      if (k === 'hair') { C._hair = col; C.hairColor = col; C.hairOn = true; custReact(null, false); }
      else { C['_' + k] = col; C[k] = { color: col }; custReact(k, false); }
      SFX.click(); break;
    }
    case 'hairOn': if (C.hairOn !== false) { C._hair = C.hairColor; C.hairOn = false; C.hairColor = HAIR_DEF; } else { C.hairOn = true; C.hairColor = C._hair || C.hairColor; } SFX.click(); break;
    case 'pend': C.pendant = { type: d.k }; C._pend = d.k; custReact('pendant', false); SFX.click(); break;
    case 'pendOn': if (C.pendant) { C._pend = C.pendant.type; C.pendant = null; } else { C.pendant = { type: C._pend || 'pearl' }; custReact('pendant', false); } SFX.click(); break;
    case 'style': C.hairStyle = d.k; C._style = d.k; C.styleOn = true; custReact(null, false); SFX.click(); break;
    case 'styleOn': if (C.styleOn !== false) { C._style = C.hairStyle; C.styleOn = false; C.hairStyle = 'long'; } else { C.styleOn = true; C.hairStyle = C._style || 'bob'; } SFX.click(); break;
    default: return;
  }
  renderShop();
}
function openShop() {
  if (!G || G.ended || uiOpen()) return;
  if (!unl('shop')) { say('Терминал ещё не подключён — он откроется позже', '#8db2b6'); return; }
  releaseInputs(); UI.shop = true; UI.coinShow = G.coins;
  $('shopCoins').innerHTML = '<i class="coin big"></i><span id="coinNum">' + pf(G.coins) + '</span><span class="mult" id="coinMult"></span>';
  $('shopList').dataset.tab = ''; renderShop(); showOv('ovShop', true); progress('shop'); requestAnimationFrame(coinLoop);
}
function closeShop() { clearNew(UI.tab); clearNew('side'); UI.shop = false; $('tip').classList.remove('on'); showOv('ovShop', false); saveGame(); lockPointer(); }
function toggleShop() { if (!UI.playing) return; if (UI.shop) closeShop(); else openShop(); }
function openHelp() { if (!G || G.ended || uiOpen()) return; releaseInputs(); UI.help = true; $('helpBody').innerHTML = helpHTML(); showOv('ovHelp', true); }
function closeHelp() { UI.help = false; showOv('ovHelp', false); lockPointer(); }
function toggleHelp() { if (!UI.playing) return; if (UI.help) closeHelp(); else openHelp(); }
// подсказка при наведении (описание, количество, уровень)
function tipMove(ev) {
  const t = $('tip'), el = ev.target.closest && ev.target.closest('[data-tip]');
  if (!el) { t.classList.remove('on'); return; }
  const i = +el.dataset.tip; if (t._i !== i) { t.innerHTML = UI.tips[i] || ''; t._i = i; }
  t.classList.add('on');
  const s = UI.scale, w = t.offsetWidth * s, h = t.offsetHeight * s;
  let x = ev.clientX + 18, y = ev.clientY + 18;
  if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
  if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
  t.style.left = Math.max(4, x) + 'px'; t.style.top = Math.max(4, y) + 'px';
}

// ============================ ЧИТ-МЕНЮ ============================
function spawnNear(kind, n) {
  const p = G.player;
  for (let i = 0; i < n; i++) {
    const x = clamp(p.x + Math.cos(p.yaw) * 1.8 + rnd(-0.8, 0.8), -ROOM + 0.5, ROOM - 0.5), z = clamp(p.z + Math.sin(p.yaw) * 1.8 + rnd(-0.8, 0.8), -ROOM + 0.5, ROOM - 0.5);
    if (kind === 'cutlet') addEnt(Object.assign(cutletData(rybData(1 + (i % 4))), { x, z }));
    else { if (rybCount() >= MAX_RYB) break; const r = mkRyb(x, z, kind === 'ryb4' ? 4 : 1); if (kind === 'pressryb') r.deco.plate = true; }
  }
}
function openAll() { while (G.stage < STAGES.length - 1) enterStage(G.stage + 1); }
function allUpgrades() {
  openAll();
  while (G.ents.filter(e => e.type === 'inc').length < 4) { const n = G.ents.filter(e => e.type === 'inc').length + 1; mkMachine('inc', n); G.up.incCount = n; }
  while (G.ents.filter(e => e.type === 'press').length < 3) { const n = G.ents.filter(e => e.type === 'press').length + 1; mkMachine('press', n); G.up.pressCount = n; }
  for (const m of G.ents) if (m.type === 'inc' || m.type === 'press') { const u = mUp(m); for (const d of MUP[m.type]) u[d.key] = d.max; m.auto = true; }
  for (const it of SHOP) while (it.lvl() < it.max) it.buy();
  const C = G.cust; for (const [k] of ACCS) { C.owned[k] = true; if (!C[k]) C[k] = { color: pick(PALETTE.slice(0, 8)) }; }
  C.owned.pendant = true; C.pendant = C.pendant || { type: 'pearl' }; C.owned.hair = true; C.owned.style = true;
  for (const [k] of STYLES) C.styles[k] = true;
  G.runEarned = Math.max(G.runEarned || 0, 1e6); checkUnlocks(true);
  say('Все улучшения и наряды открыты', '#ffd166');
}
const CHEATS = [
  ['Монеты', [['+1 000', () => cheatCoins(1000)], ['+10 000', () => cheatCoins(10000)], ['+100 000', () => cheatCoins(100000)]]],
  ['Сытость', [['Накормить досыта', () => { G.mer.sat = satMax(); if (G.mer.rage) endRage(); }], ['Почти голод → Ярость', () => { G.mer.sat = satMax() * 0.05; }], ['Бессмертие вкл/выкл', () => { G.god = !G.god; say('Бессмертие: ' + (G.god ? 'ВКЛ' : 'ВЫКЛ'), '#ffd166'); }]]],
  ['Настроение', [['Радость', () => { G.mer.emo = 90; G.mer.sat = Math.max(G.mer.sat, satMax() * 0.8); }], ['Нейтрал', () => { G.mer.emo = 52; }], ['Грусть', () => { G.mer.emo = 20; }], ['Отношение 100', () => { G.mer.rel = 100; }], ['Отношение 0', () => { G.mer.rel = 0; }]]],
  ['Рост', [['+10%', () => { G.mer.growth = Math.min(0.99, G.mer.growth + 0.1); }], ['До 195 см (престиж)', () => { G.mer.growth = Math.max(G.mer.growth, (PRESTIGE_H - 1.5) / 1.5 + 0.001); }], ['До 95%', () => { G.mer.growth = 0.95; }]]],
  ['Спавн', [['5 рыыбчеллов', () => spawnNear('ryb', 5)], ['ПрессРыыбчелл', () => spawnNear('pressryb', 1)], ['Рыыбчелл ур.4', () => spawnNear('ryb4', 1)], ['10 котлет', () => spawnNear('cutlet', 10)],
    ['Все предметы', () => { deliver('spatula'); deliver('box'); for (const it of INV) if (it.n) deliver(it.k, it.n); }]]],
  ['Прогресс', [['Следующий шаг', () => { const st = curStep(); if (st) progress(st.id); else enterStage(G.stage + 1); }], ['Открыть все этапы', openAll], ['Все улучшения + наряды', allUpgrades]]],
  ['Колба', [['Починить стекло', () => { G.mer.glass = 100; G.mer.cracks = []; }], ['Стекло 30%', () => { G.mer.glass = 30; for (let i = 0; i < 8; i++) G.mer.cracks.push({ a: rnd(0, 6.28), h: rnd(1, 3.5), seed: Math.random() * 1000, size: rnd(0.25, 0.5) }); }],
    ['Новая хотелка', () => { newWish(); MA.showWishT = 5; MA.cards = G.mer.wish.pics; MA.seenWish = true; }], ['Исполнить хотелку', () => { if (G.mer.wish && !G.mer.wish.done) fulfillWish(40); }]]],
  ['Время', [['x1', () => setSpeed(1)], ['x4', () => setSpeed(4)], ['x10', () => setSpeed(10)]]],
  ['Концовки', [['1 · Смерть', () => cheatEnd(1, 'glass')], ['2 · Убивает', () => cheatEnd(2, 'grow')], ['3 · Уносит на руках', () => cheatEnd(3, 'grow')]]]
];
function cheatCoins(n) { G.coins += n; G.runEarned = (G.runEarned || 0) + n; checkUnlocks(); }
function setSpeed(n) { UI.speed = n; say('Скорость времени x' + n, '#ffd166'); }
function cheatEnd(t, r) { closeCheat(); endGame(t, r); }
function renderCheat() {
  $('cheatBody').innerHTML = `<p class="note">Этап ${G.stage + 1}/${STAGES.length} · монеты ${fmt(G.coins)} · скорость x${UI.speed} · бессмертие ${G.god ? 'вкл' : 'выкл'} · престиж ${G.prestige || 0}</p>` +
    CHEATS.map(([t, list], i) => `<h3>${t}</h3><div class="cgrid">` + list.map(([n], j) => `<button class="gb sm steel" data-cheat="${i}|${j}">${n}</button>`).join('') + '</div>').join('');
}
function openCheat() { if (!G || G.ended || uiOpen()) return; releaseInputs(); UI.cheat = true; renderCheat(); showOv('ovCheat', true); }
function closeCheat() { UI.cheat = false; showOv('ovCheat', false); if (G && !G.ended) lockPointer(); }
function toggleCheat() { if (!UI.playing) return; if (UI.cheat) closeCheat(); else openCheat(); }
