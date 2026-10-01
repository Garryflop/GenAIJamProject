
// ============================ ЭТАПЫ: ПОСТЕПЕННОЕ ОТКРЫТИЕ ============================
// С какого этапа открывается механика / элемент интерфейса
const UNL = { coins: 1, inc: 1, throw: 2, bonus: 2, mood: 3, wish: 3, press: 4, shop: 5, rel: 5, cust: 6 };
function unl(k) { return !G || G.stage >= UNL[k]; }
const STAGES = [
  { name: 'Первое кормление', unlock: 'Возьми рыыбчелла и покорми её через воронку «КОРМ»', steps: [
    { id: 'pick', keys: 'ЛКМ', text: 'Подойди к рыыбчеллу и возьми его', mark: 'ryb' },
    { id: 'feed', keys: 'ЛКМ', text: 'Отнеси к жёлтой воронке «КОРМ» у колбы и нажми по ней', mark: 'funnel' }] },
  { name: 'Инкубатор', unlock: 'Теперь выращивай рыыбчеллов сам. Счёт монет открыт', enter() {
      if (!G.ents.some(e => e.type === 'inc')) popIn(mkMachine('inc', 1));
      if (!G.ents.some(e => e.type === 'bin')) popIn(addEnt({ type: 'bin', x: 10.3, z: 6.5, rad: 0.5, stat: true, face: Math.PI }));
    }, steps: [
    { id: 'incHold', keys: 'Зажать E', text: 'Наведись на инкубатор и зажми E', mark: 'inc' },
    { id: 'incPerfect', keys: 'Отпустить E', text: 'Отпусти, когда белая черта в ЗЕЛЁНОЙ зоне', mark: 'inc' },
    { id: 'feed', keys: 'ЛКМ', text: 'Покорми её новым рыыбчеллом', mark: 'funnel' }] },
  { name: 'Бросок и Бонус', unlock: 'Бросай еду издалека. Кормёжка подряд растит множитель', enter() {
      for (let i = 0; i < 3; i++) popIn(mkRyb(FUNNEL.x + 1.2 + i * 0.5, FUNNEL.z + 1.6, 1));
    }, steps: [
    { id: 'throwFeed', keys: 'Зажать ЛКМ', text: 'Зажми, прицелься в воронку и отпусти — бросок', mark: 'funnel' },
    { id: 'streak2', keys: 'ЛКМ', text: 'Покорми ещё раз, пока крутится таймер Бонуса', mark: 'funnel' }] },
  { name: 'Её настроение', unlock: 'У неё есть чувства и желания. Настроение влияет на доход', enter() { G.mer.wishTimer = 0.5; }, steps: [
    { id: 'wish', keys: '', text: 'Посмотри ей в лицо — она покажет хотелку карточками', mark: 'mer' },
    { id: 'laugh', keys: 'E', text: 'Ткни рыыбчелла в глаз — это её смешит', mark: 'ryb' }] },
  { name: 'Пресс', unlock: 'Пресс превращает рыыбчелла в котлеты', enter() {
      if (!G.ents.some(e => e.type === 'pad')) popIn(addEnt({ type: 'pad', x: -9.0, z: 8.9 }));
      if (!G.ents.some(e => e.type === 'press')) popIn(mkMachine('press', 1));
    }, steps: [
    { id: 'slot', keys: 'ЛКМ', text: 'Положи рыыбчелла в слот пресса', mark: 'press' },
    { id: 'squish', keys: 'Зажать E + ↓', text: 'Зажми E на прессе и веди мышь вниз', mark: 'press' },
    { id: 'cutletFeed', keys: 'ЛКМ', text: 'Возьми котлеты (до 5 в руку) и скорми их', mark: 'cutlet' }] },
  { name: 'Терминал', unlock: 'Прокачка аппаратов, персонажа и бонуса. Отношение открыто', enter() {
      if (!G.ents.some(e => e.type === 'term')) popIn(addEnt({ type: 'term', x: -10.2, z: 6.5, rad: 0.6, stat: true, face: 0 }));
    }, steps: [
    { id: 'shop', keys: 'Tab', text: 'Открой терминал', mark: 'term' },
    { id: 'buy', keys: '', text: 'Купи любое улучшение', mark: null }] },
  { name: 'Свободная смена', unlock: 'Наряды для неё в терминале. Дальше — цели смены', steps: [] }
];
function curStep() { const s = STAGES[G.stage]; return s ? s.steps[G.step] : null; }
function progress(id) {
  if (!G) return;
  const st = curStep(); if (!st || st.id !== id) return;
  G.step++; G._stepFlash = 1; SFX.good();
  if (G.step >= STAGES[G.stage].steps.length) enterStage(G.stage + 1);
}
function enterStage(n) {
  if (n >= STAGES.length) return;
  G.stage = n; G.step = 0;
  const S = STAGES[n];
  if (S.enter) S.enter();
  G._stageFx = { head: 'ЭТАП ' + (n + 1) + ' · ' + S.name.toUpperCase(), sub: S.unlock };
  SFX.record();
}
function banner(title, sub, col) { G._banner = { title, sub, col: col || '#6ff0d9', t: G.t }; }
function popIn(e) { parts(e.x, 1, e.z, 26, '#6ff0d9', 2, 0.05, 0.9, 3); SFX.tube(); return e; }

// ============================ ЦЕЛИ СМЕНЫ (после обучения) ============================
// Цепочка ведёт по механикам; за каждую — награда. Уже выполненные пропускаются.
const GOALS = [
  { id: 'autoInc', keys: 'Tab', text: 'Купи авто-режим инкубатору (Терминал → Аппараты)', mark: 'term', reward: 150, done: () => G.ents.some(e => e.type === 'inc' && mUp(e).auto) },
  { id: 'streak5', keys: 'ЛКМ', text: 'Сделай бонус ×5 — корми её без перерыва', mark: 'funnel', reward: 150, done: () => G.run.best >= 5, prog: () => [Math.min(G.run.best, 5), 5] },
  { id: 'inc2', keys: 'Tab', text: 'Построй второй инкубатор', mark: 'term', reward: 250, done: () => G.ents.filter(e => e.type === 'inc').length >= 2 },
  { id: 'pressRyb', keys: 'Tab', text: 'Купи пластину и сделай ПрессРыыбчелла', mark: 'term', reward: 300, done: () => !!G.run.pressRyb || G.ents.some(e => e.type === 'ryb' && e.deco.plate) },
  { id: 'autoPress', keys: 'Tab', text: 'Купи авто-режим прессу', mark: 'term', reward: 300, done: () => G.ents.some(e => e.type === 'press' && mUp(e).auto) },
  // наряды не сбрасываются — эта цель только в первом забеге
  { id: 'outfit', keys: 'Tab', text: 'Подари ей украшение (Терминал → Русалка)', mark: 'term', reward: 500, skip: () => G.prestige > 0, done: () => Object.keys(G.cust.owned).length > 0 },
  { id: 'grow195', keys: 'ЛКМ', text: 'Дорасти её до 195 см — откроется престиж', mark: 'funnel', reward: 400, done: () => merHeight() >= 1.95, prog: () => [Math.min(195, Math.round(merHeight() * 100)), 195] },
  { id: 'final', keys: 'Tab', text: 'Сделай престиж (Терминал → Бонус) — или расти до 300 см: финал смены', mark: 'term', reward: 0, done: () => false, prog: () => [Math.round(merHeight() * 100), 300] }
];
const goalSkip = g => !!(g.skip && g.skip());
const goalReward = g => Math.round(g.reward * pm()); // награды растут вместе с ценами
function freeMode() { return G.stage >= STAGES.length - 1 && !curStep(); }
function updGoals(dt) {
  if (!freeMode() || (G._goalT = (G._goalT || 0) + dt) < 0.5) return;
  G._goalT = 0; G.goals = G.goals || {};
  for (const g of GOALS) {
    if (G.goals[g.id] || goalSkip(g)) continue;
    if (!g.done()) break;
    G.goals[g.id] = 1; G._stepFlash = 1; SFX.good();
    const rw = goalReward(g);
    if (rw) { addCoins(rw, true); say('Цель выполнена! +' + rw + ' монет', '#7be07b'); } else say('Цель выполнена!', '#7be07b');
  }
}
// Текущая задача для панели и маркера: шаг обучения → срочное → цель смены
function curTask() {
  const st = curStep();
  if (st) return { id: 's' + G.stage + '_' + G.step, sid: st.id, keys: st.keys, text: st.text, mark: st.mark, head: 'ШАГ ' + (G.step + 1) + ' / ' + STAGES[G.stage].steps.length };
  if (!freeMode()) return null;
  const M = G.mer, sp = satPct();
  if (M.rage || sp < 0.2) G._hungry = true; else if (sp > 0.35) G._hungry = false;
  if (G._hungry) return { id: 'hungry', keys: 'ЛКМ', text: M.rage ? 'ЯРОСТЬ! Срочно покорми её через воронку' : 'Она голодна — покорми её через воронку', mark: 'funnel', urgent: true, head: 'СРОЧНО' };
  G.goals = G.goals || {};
  const list = GOALS.filter(g => !goalSkip(g)), i = list.findIndex(g => !G.goals[g.id]), g = list[i], rw = goalReward(g);
  return { id: 'g' + (G.prestige || 0) + '_' + g.id, keys: g.keys, text: g.text, mark: typeof g.mark === 'function' ? g.mark() : g.mark, reward: rw, prog: g.prog ? g.prog() : null,
    head: 'ЦЕЛЬ ' + (i + 1) + ' / ' + list.length + (rw ? ' · +' + rw + ' 🪙' : '') };
}

// Цель для маркера над объектом
function markTarget() {
  const st = curTask(); if (!st || !st.mark) return null;
  const P = G.player;
  const nearest = (type, f) => { let b = null, bd = 1e9; for (const e of G.ents) if (e.type === type && !e.air && !e.inPress && (!f || f(e))) { const d = hyp(e.x, e.z, P.x, P.z); if (d < bd) { bd = d; b = e; } } return b; };
  const at = (e, y, label) => e ? { x: e.x, y, z: e.z, label } : null;
  const food = heldFood();
  switch (st.mark) {
    case 'ryb': return heldType('ryb') && st.sid === 'pick' ? null : at(nearest('ryb'), 0.8, st.sid === 'laugh' ? 'Ткни в глаз' : 'Рыыбчелл');
    case 'funnel': return food ? at(nearest('funnel'), 2.0, 'КОРМ') : at(nearest('ryb') || nearest('cutlet'), 0.8, 'Возьми еду');
    case 'inc': return at(nearest('inc'), 2.1, 'Инкубатор');
    case 'press': return st.sid === 'slot' && !heldType('ryb') ? at(nearest('ryb'), 0.8, 'Возьми рыыбчелла') : at(nearest('press'), 2.5, 'Пресс');
    case 'cutlet': return food ? at(nearest('funnel'), 2.0, 'КОРМ') : at(nearest('cutlet'), 0.4, 'Котлеты');
    case 'mer': return { x: TANK.x, y: 3.2, z: TANK.z, label: 'Посмотри на неё' };
    case 'term': return at(nearest('term'), 1.9, 'Терминал');
  }
  return null;
}

// Справка: темы открываются вместе с этапами
const HELP = [
  { s: 0, t: 'Кормление', d: '<span class="kbd">ЛКМ</span> — взять левой рукой. Подойди к жёлтой воронке <b>«КОРМ»</b> у колбы и кликни по ней той же кнопкой — еда уйдёт по трубе к ней. Полоска <b>Сытость</b> сверху растёт; красная черта на ней — порог Ярости.' },
  { s: 1, t: 'Инкубатор', d: 'Наведись на инкубатор и зажми <span class="kbd">E</span> — икра растёт, над аппаратом видна шкала. Отпусти в <b>зелёной</b> зоне: выйдет рыыбчелл. Синяя — рано (сброс), коричневая — брак: <b>старая масса</b>, её лучше выбросить в утилизацию.' },
  { s: 2, t: 'Бросок и Бонус', d: 'Зажми кнопку руки с предметом — у прицела заполняется шкала силы, отпусти — бросок. Попадание в воронку издалека даёт ×1.5. <b>Бонус</b>: каждая еда подряд, пока идёт таймер, повышает множитель x2, x3…; в конце — выплата. Котлеты особенно хороши для бонуса.' },
  { s: 3, t: 'Её настроение и хотелки', d: '<b>Радость</b> (выше 65% и сытость ≥ 60%): ×1.3 к доходу, аппараты быстрее. <b>Грусть</b> (ниже 40%): ×0.8. Ей нравятся украшенные и нелепые рыыбчеллы, рекорды бонуса, наклейки, новые украшения. Не нравятся: одинаковая еда подряд, старая масса, инвентарь в воронке, пресс у неё на глазах, скормленный любимчик. <span class="kbd">E</span> по рыыбчеллу в глаз — она смеётся. Посмотри ей в лицо — покажет <b>хотелку</b>.' },
  { s: 4, t: 'Пресс, котлеты, лопатка', d: 'Положи рыыбчелла в слот (клик рукой с рыыбчеллом по прессу), зажми <span class="kbd">E</span> на прессе и веди мышь вниз. Котлеты окрашены под уровень рыбы. В руку — до 5, на <b>лопатку</b> (покупается в терминале) до 15: лопатка в руке + <span class="kbd">E</span> по котлетам, затем <span class="kbd">E</span> по воронке.' },
  { s: 5, t: 'Терминал, вторая рука, отношение', d: '<span class="kbd">Tab</span> — терминал. «2 рука» открывает правую руку на <span class="kbd">ПКМ</span>. У каждого инкубатора и пресса свои улучшения; «АВТО» включается кнопкой над аппаратом (<span class="kbd">E</span>). <b>Отношение</b> (сердечки) решает концовку.' },
  { s: 6, t: 'Декор, коробка, ПрессРыыбчеллы', d: 'Пачку декора в руку и клик по рыыбчеллу. <b>Коробка</b>: брось её — соберёт предметы на пути; положи в неё пачки (например 8 банок краски × 3 = 24 покраса) и жми <span class="kbd">E</span> по рыыбчеллам — коробка работает как раздатчик. <b>Пластина</b> делает <b>ПрессРыыбчелла</b>: он бродит и иногда падает, давя соседей в котлеты. <b>Краска</b>: сородичи сами несут окрашенного под пресс.' },
  { s: 6, t: 'Цели, престиж и Ярость', d: 'После обучения слева сверху — <b>цели смены</b> с наградой. Товары в терминале <b>открываются по мере заработка</b>. С 195 см в терминале («Бонус») доступен <b>престиж</b>: всё начинается заново (монеты, аппараты, улучшения, её рост — 150 см), зато навсегда <b>+5% к её росту</b> и <b>+10% к доходу</b> за каждый престиж; цены — на 20% выше. Наряды и отношение сохраняются. <b>Ярость</b>: при сытости ниже 12% она бьёт стекло — корми скорее, стекло чинится в терминале.' }
];
const HELP_ALWAYS = '<span class="kbd">W</span><span class="kbd">A</span><span class="kbd">S</span><span class="kbd">D</span> ходить · <span class="kbd">ЛКМ</span> левая рука · <span class="kbd">ПКМ</span> правая рука (прокачка) · <span class="kbd">E</span> ткнуть / нажать / инструмент · <span class="kbd">C</span> присесть · <span class="kbd">H</span> справка · <span class="kbd">`</span> чит-меню · <span class="kbd">Esc</span> пауза. Клавиши меняются в Настройках.';
function helpHTML() {
  let h = '<div class="goal" style="font-size:18px">Цель: вырасти русалку до 300 см (сейчас ' + Math.round(merHeight() * 100) + ' см)</div>';
  h += '<p class="sub">Сейчас: этап ' + (G.stage + 1) + ' из ' + STAGES.length + ' — ' + STAGES[G.stage].name + (curStep() ? '. Шаг: ' + curStep().text : '') + '</p>';
  h += '<div class="topic"><b>Управление</b><br>' + HELP_ALWAYS + (G.up.run ? ' · <span class="kbd">Shift</span> бег' : '') + (G.up.jump ? ' · <span class="kbd">Space</span> прыжок' : '') + '</div>';
  for (const t of HELP) h += G.stage >= t.s ? '<div class="topic"><b>' + t.t + '</b><br>' + t.d + '</div>' : '<div class="topic locked"><b>??? — откроется на этапе ' + (t.s + 1) + '</b></div>';
  return h;
}
