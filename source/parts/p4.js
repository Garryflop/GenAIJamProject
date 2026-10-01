
// ============================ МИР ============================
const SIZE = { ryb: [0.55, 0.62], cutlet: [0.24, 0.1], mass: [0.4, 0.26], spatula: [0.62, 0.14], box: [0.62, 0.45], pack: [0.36, 0.3],
  inc: [1.1, 1.95], press: [1.5, 2.4], term: [1.1, 1.75], pad: [1.3, 0.25], bin: [0.8, 1.1], stack: [0.24, 0.2], funnel: [1.0, 1.55] };
// Декор стен. Ось текстуры = (nz, -nx): так текст читается слева направо, когда смотришь на стену
const WALL_DECO = [
  { x: 0, z: -ROOM, nx: 0, nz: 1, w: 7, h: 2.4, y: 2.3, kind: 'window', pw: 700, ph: 240, n: 18, every: 0.12 },
  { x: 0, z: ROOM, nx: 0, nz: -1, w: 1.7, h: 3.0, y: 1.5, kind: 'door', pw: 170, ph: 300, n: 6 },
  { x: -ROOM, z: 1.5, nx: 1, nz: 0, w: 1.3, h: 1.7, y: 2.0, kind: 'poster', pw: 200, ph: 260, n: 5, title: 'ТЕХНИКА БЕЗОПАСНОСТИ', lines: ['не кормить пальцами', 'не стучать по стеклу', 'не смотреть ей в глаза', 'долго'] },
  { x: -ROOM, z: -4, nx: 1, nz: 0, w: 1.4, h: 1.6, y: 2.0, kind: 'poster2', pw: 220, ph: 250, n: 5 },
  { x: -7.4, z: -ROOM, nx: 0, nz: 1, w: 2.6, h: 1.46, y: 2.3, kind: 'plan', pw: 836, ph: 470, n: 12 },
  { x: ROOM, z: -2, nx: -1, nz: 0, w: 1.8, h: 1.3, y: 2.2, kind: 'chart', pw: 260, ph: 190, n: 6, every: 1 },
  { x: ROOM, z: 3.5, nx: -1, nz: 0, w: 1.2, h: 1.5, y: 2.1, kind: 'poster', pw: 200, ph: 260, n: 5, title: 'ОБРАЗЕЦ «Р»', lines: ['разумна', 'не имеет голоса', 'щелчки = речь', 'голод = опасность'] }
];
const LAMPS = [];
for (const lx of [-6.5, 0, 6.5]) for (const lz of [-6.5, 0, 6.5]) if (lx || lz) LAMPS.push([lx, lz]);

// отрезок на высоте y: глубина вдоль взгляда >= near  <=>  d >= (near - (y - eye)*sin) / cos
function segCam(x1, z1, x2, z2, near0 = 0.12, y = CAM.eye) {
  const near = (near0 - (y - CAM.eye) * CAM.ps) / CAM.pc;
  let [l1, d1] = toCam(x1, z1), [l2, d2] = toCam(x2, z2);
  if (d1 < near && d2 < near) return null;
  if (d1 < near) { const t = (near - d1) / (d2 - d1); l1 += (l2 - l1) * t; d1 = near; }
  else if (d2 < near) { const t = (near - d2) / (d1 - d2); l2 += (l1 - l2) * t; d2 = near; }
  return [l1, d1, l2, d2];
}
// вертикальный кусок стены: при наклоне камеры ближняя плоскость режет его наискось — отсекаем многоугольник
function wallQuad(c, s, y0, y1, fill) {
  const P = [[s[0], s[1], y0], [s[0], s[1], y1], [s[2], s[3], y1], [s[2], s[3], y0]], out = [];
  for (let i = 0; i < 4; i++) {
    const a = P[i], b = P[(i + 1) % 4], da = camDep(a[0], a[1], a[2]) - 0.12, db = camDep(b[0], b[1], b[2]) - 0.12;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
  }
  if (out.length < 3) return;
  c.fillStyle = fill; c.beginPath();
  out.forEach((q, i) => { const p = projCam(q[0], q[1], q[2]); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); });
  c.closePath(); c.fill();
}
function floorLine(c, x1, z1, x2, z2, y = 0) {
  const s = segCam(x1, z1, x2, z2, 0.12, y); if (!s) return;
  const a = projCam(s[0], s[1], y), b = projCam(s[2], s[3], y);
  c.moveTo(a.x, a.y); c.lineTo(b.x, b.y);
}
// Кэш офскрин-текстур (плакаты, окно, наклейки)
const TEXC = {};
function tex(key, w, h, draw, every = 0) {
  let t = TEXC[key];
  if (!t) { const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2; t = TEXC[key] = { cv, x: cv.getContext('2d'), at: null }; }
  if (t.at === null || (every && Math.abs(G.t - t.at) >= every)) { t.at = G.t; t.x.setTransform(1, 0, 0, 1, 0, 0); t.x.clearRect(0, 0, w * 2, h * 2); t.x.setTransform(2, 0, 0, 2, 0, 0); draw(t.x, w, h); }
  return t.cv;
}
// Перспективно-корректный вывод плоской текстуры на стену: вертикальные полосы
// (вертикаль проецируется точно, горизонталь — кусочно-аффинно) + отсечение по ближней плоскости.
function drawWallTex(c, img, cx, cy, cz, tx, tz, w, h, n) {
  const iw = img.width, ih = img.height, near = 0.15;
  const P = u => ({ x: cx + tx * (u - 0.5) * w, z: cz + tz * (u - 0.5) * w });
  const depth = q => (q.x - CAM.x) * CAM.c + (q.z - CAM.z) * CAM.s;
  // число полос — по экранной ширине (~8 px на полосу), чтобы не было «ступенек» под углом
  const dA = depth(P(0)), dB = depth(P(1));
  if (dA < near && dB < near) return;
  if (dA >= near && dB >= near) { // целиком за краем экрана — не рисуем
    const qa = proj(P(0).x, cy, P(0).z), qb = proj(P(1).x, cy, P(1).z);
    if (qa && qb && ((qa.x < 0 && qb.x < 0) || (qa.x > W && qb.x > W))) return;
  }
  const dMin = Math.max(0.3, Math.min(dA > near ? dA : 1e9, dB > near ? dB : 1e9));
  const tp = Math.abs(CAM.ps / CAM.pc); // при наклоне вертикали сходятся — полосы делаем уже
  n = clamp(Math.ceil(w * FOCAL / dMin / 14 * (1 + 1.5 * tp)), 2, 64);
  const mMax = Math.max(1, Math.floor(420 / n)); // потолок на число кусков текстуры
  for (let i = 0; i < n; i++) {
    let u0 = i / n, u1 = (i + 1) / n, a = P(u0), b = P(u1);
    const da = depth(a), db = depth(b);
    if (da < near && db < near) continue;
    if (da < near) { u0 += (u1 - u0) * (near - da) / (db - da); a = P(u0); }
    else if (db < near) { u1 -= (u1 - u0) * (near - db) / (da - db); b = P(u1); }
    // при наклоне камеры часть полосы (верх или низ) может оказаться за камерой — обрезаем по высоте
    let yT = cy + h / 2, yB = cy - h / 2;
    const dm = Math.min(depth(a), depth(b)), NV = 0.13;
    if (CAM.ps < -1e-4) yT = Math.min(yT, CAM.eye + (dm * CAM.pc - NV) / -CAM.ps);
    else if (CAM.ps > 1e-4) yB = Math.max(yB, CAM.eye + (NV - dm * CAM.pc) / CAM.ps);
    if (yT - yB < 1e-3) continue;
    // по вертикали перспектива при наклоне нелинейна — дробим полосу, когда глубина сверху и снизу сильно разная
    const dT = dm * CAM.pc + (yT - CAM.eye) * CAM.ps, dB2 = dm * CAM.pc + (yB - CAM.eye) * CAM.ps;
    const dmc = Math.max(0.3, dm), mDepth = Math.ceil((Math.max(dT, dB2) / Math.max(0.05, Math.min(dT, dB2)) - 1) * 3);
    const mConv = Math.ceil(w / n * (yT - yB) * FOCAL * tp / (dmc * dmc * 6)); // «ступенька» на стыке полос ≤ ~6 px
    const m = clamp(Math.max(mDepth, mConv), 1, mMax);
    const sx = u0 * iw, sw = Math.max(0.5, (u1 - u0) * iw), sw2 = Math.min(sw * 1.06 + 1, iw - sx);
    for (let j = 0; j < m; j++) {
      const y0 = yT - (yT - yB) * j / m, y1 = yT - (yT - yB) * (j + 1) / m;
      const p0 = proj(a.x, y0, a.z), p1 = proj(b.x, y0, b.z), p3 = proj(a.x, y1, a.z), p2 = proj(b.x, y1, b.z);
      if (!p0 || !p1 || !p3 || !p2) continue;
      // кусок — трапеция; рисуем параллелограммом по её более широкому краю: вместо щелей — незаметный нахлёст
      const wide = Math.abs(p2.x - p3.x) > Math.abs(p1.x - p0.x), ux = wide ? p2.x - p3.x : p1.x - p0.x, uy = wide ? p2.y - p3.y : p1.y - p0.y;
      const sy = (cy + h / 2 - y0) / h * ih, sh = Math.max(0.5, (y0 - y1) / h * ih), sh2 = Math.min(sh + (m > 1 ? 1 : 0), ih - sy);
      c.save();
      c.setTransform(RES * ux / sw, RES * uy / sw, RES * (p3.x - p0.x) / sh, RES * (p3.y - p0.y) / sh, RES * p0.x, RES * p0.y);
      c.drawImage(img, sx, sy, sw2, sh2, 0, 0, sw2, sh2);
      c.restore();
    }
  }
}

function renderWorld(c) {
  camSetup();
  G._hits = [];
  const M = G.mer;
  const flick = MA.lampFlick > 0 && Math.sin(G.t * 37) + Math.sin(G.t * 23) > 0.3;
  sync3DCam(flick, M.rage);
  c.fillStyle = M.rage ? '#1c1214' : '#15232a'; c.fillRect(0, 0, W, H);
  const hor = clamp(CAM.hor, -50, H + 50);
  const fg = c.createLinearGradient(0, hor, 0, H); fg.addColorStop(0, '#16262c'); fg.addColorStop(1, '#3a5960');
  c.fillStyle = fg; c.fillRect(0, hor, W, H - hor + 60);
  c.strokeStyle = 'rgba(160,210,220,.13)'; c.lineWidth = 1; c.beginPath();
  for (let i = -ROOM; i <= ROOM; i += 2) { floorLine(c, i, -ROOM, i, ROOM); floorLine(c, -ROOM, i, ROOM, i); }
  c.stroke();
  c.strokeStyle = 'rgba(255,204,51,.4)'; c.lineWidth = 2; c.beginPath();
  for (let i = 0; i < 48; i += 2) { const a0 = i / 48 * Math.PI * 2, a1 = (i + 1) / 48 * Math.PI * 2; floorLine(c, Math.cos(a0) * 2.9, Math.sin(a0) * 2.9, Math.cos(a1) * 2.9, Math.sin(a1) * 2.9); }
  c.stroke();
  const walls = [[-ROOM, -ROOM, ROOM, -ROOM, '#2c4a52', '#1f363d'], [ROOM, -ROOM, ROOM, ROOM, '#2a454d', '#1d3239'], [ROOM, ROOM, -ROOM, ROOM, '#2e4b53', '#20373e'], [-ROOM, ROOM, -ROOM, -ROOM, '#29434b', '#1c3138']];
  for (const w of walls) {
    const s = segCam(w[0], w[1], w[2], w[3], 0.12, CAM.ps < 0 ? 0 : CEIL); if (!s) continue;
    wallQuad(c, s, 0, CEIL, w[4]); wallQuad(c, s, 0, 1.1, w[5]);
    wallQuad(c, s, 1.08, 1.14, '#3f6670'); wallQuad(c, s, CEIL - 0.25, CEIL, '#243b42');
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1; c.beginPath();
    const len = Math.hypot(w[2] - w[0], w[3] - w[1]);
    for (let u = 2.2; u < len; u += 2.2) {
      const x = lerp(w[0], w[2], u / len), z = lerp(w[1], w[3], u / len), a = proj(x, 0, z), b = proj(x, CEIL, z);
      if (a && b) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    }
    c.stroke();
  }
  for (const d of WALL_DECO) {
    const img = tex('wd_' + d.kind + d.x + d.z + (d.kind === 'plan' ? posterReady() : ''), d.pw, d.ph, (c2, w, h) => drawDecoTex(c2, d, w, h), d.every || 0);
    drawWallTex(c, img, d.x + d.nx * 0.02, d.y, d.z + d.nz * 0.02, d.nz, -d.nx, d.w, d.h, d.n);
  }
  for (const s of G.stickers) if (s.surf === 'wall') {
    const img = tex('st_' + s.kind + s.col, 100, 100, (c2) => { c2.translate(50, 50); drawSticker(c2, s, 90); });
    drawWallTex(c, img, s.x + s.nx * 0.015, s.y, s.z + s.nz * 0.015, s.nz, -s.nx, 0.4, 0.4, 2);
  }
  for (const [lx, lz] of LAMPS) {
    const q = [proj(lx - 0.9, CEIL - 0.01, lz - 0.25), proj(lx + 0.9, CEIL - 0.01, lz - 0.25), proj(lx + 0.9, CEIL - 0.01, lz + 0.25), proj(lx - 0.9, CEIL - 0.01, lz + 0.25)];
    if (q.some(p => !p)) continue;
    const on = !flick;
    c.fillStyle = M.rage ? (on ? '#ff5a66' : '#3a1418') : on ? '#eafcff' : '#44565c';
    c.beginPath(); q.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath(); c.fill();
    if (on) { c.strokeStyle = M.rage ? 'rgba(255,60,60,.4)' : 'rgba(200,250,255,.25)'; c.lineWidth = 6; c.stroke(); }
  }
  const list = [];
  for (const e of G.ents) {
    if (e.inPress || e.type === 'pad') continue;
    const p = proj(e.x, e.y, e.z); if (!p) continue;
    const sz = SIZE[e.type === 'tool' ? e.kind : e.type] || [0.5, 0.5];
    if (p.x + sz[0] * p.k < -40 || p.x - sz[0] * p.k > W + 40) continue;
    list.push({ e, p, d: p.d });
  }
  const tc = toCam(TANK.x, TANK.z);
  list.push({ tank: true, d: Math.max(0.13, tc[1]) });
  list.sort((a, b) => b.d - a.d);
  G._tank = null;
  prep3D(list);
  for (const it of list) {
    if (it.tank) { drawTank(c); continue; }
    const e = it.e, p = it.p, flat = clamp(CAM.eye / Math.hypot(p.d, CAM.eye), 0.04, 0.95);
    const sz = SIZE[e.type === 'tool' ? e.kind : e.type] || [0.5, 0.5];
    const tiny = (e.type === 'cutlet' || e.type === 'mass' || e.type === 'pack') && p.k < 90;
    if (e.type !== 'pad' && !tiny) { const gp = e.y > 0.02 ? proj(e.x, 0, e.z) : p; if (gp) shadow(c, gp.x, gp.y, gp.k, sz[0] * 0.45, flat); }
    drawThing(c, e, p.x, p.y, p.k, { flat });
    if (T3.frameOk && MODEL_TYPES[e.type]) label2D(c, e);
    let w = sz[0] * p.k, h = sz[1] * p.k;
    if (e.type === 'ryb') { const s = (1 + 0.08 * (e.lvl - 1)) * (e.deco.plate ? 1.15 : 1); w *= s; h *= s; }
    if (T3.ok && MODEL_TYPES[e.type]) continue; // 3D-аппараты ловятся лучом
    const mw = Math.max(w, 38), mh = Math.max(h, 30);
    G._hits.push({ e, x: p.x - mw / 2, y: p.y - mh + Math.min(8, (mh - h) / 2), w: mw, h: mh, d: p.d, k: p.k, px: p.x, py: p.y });
  }
  for (const q of G._parts) {
    const p = proj(q.x, q.y, q.z); if (!p) continue;
    c.globalAlpha = clamp(q.life / q.max, 0, 1); c.fillStyle = q.col; circ(c, p.x, p.y, Math.max(1, q.size * p.k)); c.fill();
  }
  c.globalAlpha = 1;
  if (flick) { c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, 0, W, H); }
  if (M.rage) { c.fillStyle = 'rgba(255,0,30,' + (0.06 + 0.06 * Math.sin(G.t * 8)) + ')'; c.fillRect(0, 0, W, H); }
}

function drawDecoTex(c2, d, w, h) {
  c2.textAlign = 'center'; c2.textBaseline = 'middle';
  if (d.kind === 'plan') { if (posterReady()) { c2.drawImage(POSTER, 0, 0, w, h); c2.strokeStyle = '#4a3a26'; c2.lineWidth = 5; c2.strokeRect(0, 0, w, h); } else drawPlan(c2, w, h); return; }
  if (d.kind === 'window') {
    const g = c2.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0e5f86'); g.addColorStop(1, '#03182a');
    c2.fillStyle = g; c2.fillRect(0, 0, w, h);
    c2.fillStyle = 'rgba(180,240,255,.08)';
    for (let i = 0; i < 5; i++) { const x0 = 80 + i * 130 + Math.sin(G.t * 0.3 + i) * 20; c2.beginPath(); c2.moveTo(x0, 0); c2.lineTo(x0 + 40, 0); c2.lineTo(x0 + 110, h); c2.lineTo(x0 + 30, h); c2.fill(); }
    c2.fillStyle = 'rgba(0,20,30,.8)';
    for (let i = 0; i < 6; i++) { const fx = ((G.t * (12 + i * 5) + i * 150) % 820) - 60, fy = 40 + i * 30 + Math.sin(G.t + i) * 8; ell(c2, fx, fy, 16 - i, 6); c2.fill(); c2.beginPath(); c2.moveTo(fx - 14, fy); c2.lineTo(fx - 26, fy - 7); c2.lineTo(fx - 26, fy + 7); c2.fill(); }
    c2.fillStyle = '#0a2a35'; for (let i = 0; i < 12; i++) { c2.beginPath(); c2.moveTo(i * 60, h); c2.quadraticCurveTo(i * 60 + 10 + Math.sin(G.t + i) * 10, h - 60, i * 60 + 5, h - 90 - (i % 3) * 20); c2.lineTo(i * 60 + 14, h); c2.fill(); }
    c2.strokeStyle = '#56666e'; c2.lineWidth = 12; c2.strokeRect(0, 0, w, h);
    c2.beginPath(); c2.moveTo(w / 3, 0); c2.lineTo(w / 3, h); c2.moveTo(w * 2 / 3, 0); c2.lineTo(w * 2 / 3, h); c2.stroke();
  } else if (d.kind === 'door') {
    const top = 40;
    c2.fillStyle = '#2bd46a'; rrect(c2, w / 2 - 44, 6, 88, 26, 4); c2.fill();
    c2.fillStyle = '#fff'; c2.font = '700 16px sans-serif'; c2.fillText('ВЫХОД', w / 2, 20);
    c2.fillStyle = '#3d4d55'; c2.fillRect(0, top, w, h - top);
    c2.fillStyle = '#56686f'; c2.fillRect(10, top + 10, w / 2 - 14, h - top - 10); c2.fillRect(w / 2 + 4, top + 10, w / 2 - 14, h - top - 10);
    c2.fillStyle = '#1c2a2f'; c2.fillRect(w / 2 - 3, top + 10, 6, h - top - 10);
    c2.fillStyle = '#ffcc33'; c2.fillRect(w / 2 - 50, top + 110, 30, 40);
  } else if (d.kind === 'poster') {
    c2.fillStyle = '#f2ead7'; c2.fillRect(0, 0, w, h); c2.fillStyle = '#c23a3a'; c2.fillRect(0, 0, w, 44);
    c2.fillStyle = '#fff'; c2.font = '700 15px sans-serif'; c2.fillText(d.title, w / 2, 22);
    c2.fillStyle = '#333'; c2.font = '15px sans-serif'; d.lines.forEach((l, i) => c2.fillText('• ' + l, w / 2, 76 + i * 36));
  } else if (d.kind === 'poster2') {
    c2.fillStyle = '#ffe9f2'; c2.fillRect(0, 0, w, h);
    c2.fillStyle = '#e06498'; c2.font = '700 20px sans-serif'; c2.fillText('РЫЫБЧЕЛЛ', w / 2, 28);
    drawRyb(c2, w / 2, 190, 220, ICON_RYB, { noIcons: true });
    c2.fillStyle = '#6a3050'; c2.font = '15px sans-serif'; c2.fillText('это — ЕДА. не друг.', w / 2, 228);
  } else if (d.kind === 'chart') {
    c2.fillStyle = '#0c1d22'; c2.fillRect(0, 0, w, h); c2.strokeStyle = '#6ff0d9'; c2.lineWidth = 2; c2.strokeRect(2, 2, w - 4, h - 4);
    c2.textAlign = 'left'; c2.fillStyle = '#6ff0d9'; c2.font = '700 15px sans-serif'; c2.fillText('РОСТ ОБРАЗЦА: ' + Math.round(merHeight() * 100) + ' см', 12, 20);
    c2.strokeStyle = 'rgba(111,240,217,.2)'; c2.lineWidth = 1; for (let i = 1; i < 5; i++) { c2.beginPath(); c2.moveTo(10, 40 + i * 28); c2.lineTo(w - 10, 40 + i * 28); c2.stroke(); }
    c2.strokeStyle = '#ff8fc0'; c2.lineWidth = 3; c2.beginPath(); const gr = G.mer.growth;
    for (let i = 0; i <= 40; i++) { const u = i / 40; if (u > gr) break; c2.lineTo(12 + u * (w - 24), h - 14 - u * u * 0.6 * (h - 60) - u * 0.4 * (h - 60)); } c2.stroke();
    if (gr > 0.8) { c2.fillStyle = '#ff5d6c'; c2.fillText('!! КРИТИЧЕСКИЙ РАЗМЕР !!', 12, h - 12); }
  }
}

function drawThing(c, e, x, y, k, o = {}) {
  switch (e.type) {
    case 'ryb': drawRyb(c, x, y, k, e, o); break;
    case 'cutlet': drawCutlet(c, x, y, k, e); break;
    case 'mass': drawMass(c, x, y, k, e); break;
    case 'tool': if (e.kind === 'spatula') drawSpatula(c, x, y, k, e, o.rot || 0); else drawBox(c, x, y, k, e); break;
    case 'pack': drawPack(c, x, y, k, e); break;
    case 'stack': for (let i = 0; i < e.list.length; i++) drawCutlet(c, x + ((i % 2) - 0.5) * 0.05 * k, y - i * 0.035 * k, k, e.list[i]); break;
    case 'inc': if (!draw3D(c, e)) drawInc(c, x, y, k, e); break;
    case 'press': if (!draw3D(c, e)) drawPress(c, x, y, k, e); break;
    case 'term': if (!draw3D(c, e)) drawTerm(c, x, y, k, e); break;
    case 'pad': break;
    case 'bin': if (!draw3D(c, e)) drawBin(c, x, y, k, e); break;
    case 'funnel': drawFunnel(c, x, y, k, e); break;
  }
}

// ============================ ЦЕЛЬ ПРИЦЕЛА ============================
function resolveTarget() {
  const cx = W / 2, cy = H / 2;
  let best = null;
  for (const h of G._hits) {
    if (cx < h.x || cx > h.x + h.w || cy < h.y || cy > h.y + h.h) continue;
    if (h.e.type === 'pad') continue;
    const dist = hyp(h.e.x, h.e.z, CAM.x, CAM.z);
    if (dist > REACH + (h.e.rad || 0.25)) continue;
    if (!best || h.d < best.d) best = h;
  }
  const T = G._tank;
  const glass = T && T.inSil && T.glassDist < REACH + 0.3 ? { d: T.glassDist } : null;
  const r3 = ray3D();
  if (r3 && hyp(r3.e.x, r3.e.z, CAM.x, CAM.z) <= REACH + (r3.e.rad || 0.4) && (!best || r3.d < best.d) && (!glass || r3.d < glass.d)) best = { e: r3.e, d: r3.d, part3: part3D(r3.e, r3.name) };
  if (glass && (!best || glass.d < best.d)) G._target = { kind: 'glass' };
  else if (best && best.part3) G._target = { kind: 'ent', e: best.e, part: best.part3 };
  else if (best) G._target = { kind: 'ent', e: best.e, part: partOf(best), hit: best };
  else G._target = null;
  MA.looking = false;
  if (T && T.merRect && T.glassDist < 9) {
    const r = T.merRect;
    if (cx > r.x && cx < r.x + r.w && cy > r.y && cy < r.y + r.h && !(best && best.d < T.glassDist)) MA.looking = true;
  }
  if (MA.headX !== undefined) { MA.gazeX = (cx - MA.headX) / 250; MA.gazeY = (cy - MA.headY) / 250; }
  const p = G.player, fx = CAM.c, fz = CAM.s;
  G._floor = null; G._wall = null;
  if (p.pitch < -0.01) { const d = CAM.eye / Math.tan(-p.pitch); if (d < REACH + 0.6) G._floor = { x: CAM.x + fx * d, z: CAM.z + fz * d, d }; }
  let tw = 1e9, nx = 0, nz = 0;
  if (fx > 1e-3) { const t = (ROOM - CAM.x) / fx; if (t < tw) { tw = t; nx = -1; nz = 0; } }
  if (fx < -1e-3) { const t = (-ROOM - CAM.x) / fx; if (t < tw) { tw = t; nx = 1; nz = 0; } }
  if (fz > 1e-3) { const t = (ROOM - CAM.z) / fz; if (t < tw) { tw = t; nx = 0; nz = -1; } }
  if (fz < -1e-3) { const t = (-ROOM - CAM.z) / fz; if (t < tw) { tw = t; nx = 0; nz = 1; } }
  const wy = CAM.eye + Math.tan(p.pitch) * tw;
  if (tw < REACH + 0.4 && wy > 0.2 && wy < CEIL - 0.2) G._wall = { x: CAM.x + fx * tw, y: wy, z: CAM.z + fz * tw, nx, nz };
}
function partOf(h) {
  const lx = (W / 2 - h.px) / h.k, ly = (H / 2 - h.py) / h.k, e = h.e, ch = e._chip;
  if (ch && W / 2 >= ch.x && W / 2 <= ch.x + ch.w && H / 2 >= ch.y && H / 2 <= ch.y + ch.h) return 'switch';
  if (e.type === 'inc') return 'button';
  if (e.type === 'press') return ly > -1.0 ? 'slot' : 'lever';
  if (e.type === 'ryb') { const s = (1 + 0.08 * (e.lvl - 1)) * (e.deco.plate ? 1.15 : 1); return ly < -0.3 * s ? 'eye' : 'body'; }
  return 'body';
}

// ============================ МАРКЕР ЦЕЛИ ============================
function drawMarker(c) {
  const m = markTarget(); if (!m) return;
  const [l, d] = toCam(m.x, m.z), bob = Math.sin(G.t * 5) * 6;
  const p = d > 0.3 ? proj(m.x, m.y, m.z) : null;
  const idle = taskIdle();
  if (p && p.x > 50 && p.x < W - 50 && p.y > 150 && p.y < H - 90) {
    if (idle) { const q = (G.t * 1.6) % 1; c.strokeStyle = 'rgba(255,209,102,' + (1 - q) + ')'; c.lineWidth = 3; circ(c, p.x, p.y - 20 + bob, 14 + q * 34); c.stroke(); }
    c.fillStyle = '#ffd166'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(p.x - 13, p.y - 28 + bob); c.lineTo(p.x + 13, p.y - 28 + bob); c.lineTo(p.x, p.y - 10 + bob); c.closePath(); c.fill(); c.stroke();
    txtO(c, m.label, p.x, p.y - 42 + bob, 13, '#ffd166');
    return;
  }
  // цель вне экрана: стрелка по краю в сторону цели (если цель впереди — по её экранной позиции)
  let vx = p ? p.x - W / 2 : l, vy = p ? p.y - H / 2 : -d; const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
  const rx = W / 2 - 80, ry = 190;
  const s = 1 / Math.max(Math.abs(vx) / rx, Math.abs(vy) / ry);
  const ax = W / 2 + vx * s, ay = H / 2 + 30 + vy * s, an = Math.atan2(vy, vx);
  c.save(); c.translate(ax, ay); c.rotate(an);
  c.fillStyle = '#ffd166'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(18 + bob * 0.5, 0); c.lineTo(-8, -13); c.lineTo(-8, 13); c.closePath(); c.fill(); c.stroke();
  c.restore();
  txtO(c, m.label, ax - vx * 34, ay - vy * 34, 12, '#ffd166');
}

// ============================ HUD ============================
const LAYER_COL = ['#ff6b6b', '#ffb347', '#ffe66d', '#7be07b', '#4dd6ff', '#b77dff'];
const FONT = '"Segoe UI",system-ui,sans-serif';
function panel(c, x, y, w, h, acc) {
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(24,44,50,.96)'); g.addColorStop(1, 'rgba(10,22,26,.96)');
  c.fillStyle = g; rrect(c, x, y, w, h, 12); c.fill(); c.strokeStyle = '#040b0d'; c.lineWidth = 2; c.stroke();
  c.strokeStyle = 'rgba(111,240,217,.16)'; c.lineWidth = 1; rrect(c, x + 2.5, y + 2.5, w - 5, h - 5, 10); c.stroke();
  if (acc) { c.fillStyle = acc; rrect(c, x + 14, y - 1, w - 28, 4, 2); c.fill(); }
}
function keycap(c, x, y, label) {
  c.font = '700 12px ' + FONT;
  const w = Math.max(24, c.measureText(label).width + 14);
  c.fillStyle = '#9fb8bb'; rrect(c, x, y - 10, w, 23, 5); c.fill();
  c.fillStyle = '#eef8f8'; rrect(c, x, y - 11, w, 20, 5); c.fill();
  c.fillStyle = '#0b1418'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x + w / 2, y - 1);
  return w;
}
function wrap(c, s, maxW) {
  const words = s.split(' '), out = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}
function renderHUD(c) {
  const M = G.mer, sp = satPct();
  if (sp < 0.25 || M.rage) {
    const a = M.rage ? 0.45 : (0.25 - sp) * 1.6 * (0.6 + 0.4 * Math.sin(G.t * 4));
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
    g.addColorStop(0, 'rgba(120,0,10,0)'); g.addColorStop(1, 'rgba(160,0,20,' + clamp(a, 0, 0.6) + ')');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }
  drawMarker(c);
  hudObjective(c);
  hudVitals(c);
  hudRight(c);
  drawTaskFx(c);
  // уведомления — слева снизу, над рукой
  let my = H - 175, shown = 0;
  for (let i = G._msgs.length - 1; i >= 0 && shown < 4; i--) {
    const m = G._msgs[i], a = clamp(4.5 - (G.t - m.t), 0, 1); if (a <= 0) continue;
    c.globalAlpha = a; c.font = '600 13px ' + FONT;
    const tw = c.measureText(m.text).width;
    c.fillStyle = 'rgba(6,14,17,.7)'; rrect(c, 14, my - 13, tw + 20, 26, 8); c.fill();
    c.fillStyle = m.col || '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(m.text, 24, my);
    my -= 32; shown++;
  }
  c.globalAlpha = 1;
  // баннер «НОВОЕ»
  const bn = G._banner;
  if (bn && G.t - bn.t < 5) {
    const age = G.t - bn.t, a = clamp(Math.min(age * 4, (5 - age) * 2), 0, 1), yy = 175 - (1 - a) * 20;
    c.globalAlpha = a; c.font = '700 22px ' + FONT;
    const tw = c.measureText(bn.title).width; c.font = '14px ' + FONT;
    const w = Math.max(360, tw + 60, c.measureText(bn.sub).width + 40);
    panel(c, W / 2 - w / 2, yy - 30, w, 72);
    c.fillStyle = bn.col; c.fillRect(W / 2 - w / 2 + 10, yy - 30, w - 20, 3);
    txt(c, bn.title, W / 2, yy - 6, 22, bn.col); txt(c, bn.sub, W / 2, yy + 22, 14, '#d7eeee', 'center', false);
    c.globalAlpha = 1;
  }
  // прицел и контекстные подсказки
  const tg = G._target;
  c.strokeStyle = tg ? '#6ff0d9' : 'rgba(255,255,255,.85)'; c.lineWidth = 2; circ(c, W / 2, H / 2, tg ? 9 : 3); c.stroke();
  if (MA.looking && !tg && unl('wish')) { c.strokeStyle = '#ff8fc0'; circ(c, W / 2, H / 2, 12); c.stroke(); }
  let py = H / 2 + 36;
  for (const [key, text] of prompts().filter(r => SET.hints || !r[0] || G._eLock)) {
    c.font = (key ? '600 14px ' : '700 14px ') + FONT;
    const tw = c.measureText(text).width;
    let kw = 0; if (key) { c.font = '700 12px ' + FONT; kw = Math.max(24, c.measureText(key).width + 14) + 8; }
    const tot = kw + tw, x0 = W / 2 - tot / 2;
    c.fillStyle = 'rgba(6,14,17,.62)'; rrect(c, x0 - 8, py - 13, tot + 16, 26, 8); c.fill();
    if (key) keycap(c, x0, py, keyTxt(key));
    c.font = (key ? '600 14px ' : '700 14px ') + FONT; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillStyle = key ? '#e9f7f6' : '#6ff0d9'; c.fillText(text, x0 + kw, py);
    py += 30;
  }
  drawHands(c);
  for (const s of ['L', 'R']) {
    const h = G.hands[s]; if (!h.charging) continue;
    const ox = s === 'L' ? -34 : 34;
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 6; c.beginPath(); c.arc(W / 2 + ox, H / 2, 20, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = h.charge > 0.95 ? '#ff5d6c' : '#ffd166'; c.beginPath(); c.arc(W / 2 + ox, H / 2, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * h.charge); c.stroke();
  }
  for (const q of G._floaters) {
    const e = 1 - Math.pow(1 - q.t, 3);
    c.globalAlpha = clamp(1 - q.t, 0, 1); txtO(c, q.text, q.x, q.y - 70 * e, q.size * (1 + 0.25 * e), q.col);
  }
  for (const q of G._coinFx) { c.globalAlpha = clamp(1 - q.t, 0, 1); txt(c, '🪙', lerp(q.x, W - 60, q.t * q.t), lerp(q.y, 34, q.t * q.t), 16); }
  c.globalAlpha = 1;
  if (G._flash > 0) { c.fillStyle = 'rgba(255,255,255,' + G._flash * 0.5 + ')'; c.fillRect(0, 0, W, H); }
}
const taskIdle = () => !!(G._taskId && G.t - (G._taskSince || G.t) > 20);
function hudObjective(c) {
  const x = 14, y = 14, w = 392, M = G.mer;
  const t = curTask(), S = STAGES[G.stage];
  // новая задача → карточка вылетает из центра экрана в панель
  if (t && t.id !== G._taskId) {
    const first = G._taskId === undefined, sfx = G._stageFx; G._stageFx = null;
    G._taskId = t.id; G._taskSince = G.t; G._seen = G._seen || {};
    if ((!first || sfx) && (!G._seen[t.id] || t.urgent || sfx)) {
      G._taskFx = { t0: performance.now(), head: sfx ? sfx.head : t.urgent ? '⚠ СРОЧНО' : /^ЦЕЛЬ/.test(t.head) ? 'НОВАЯ ЦЕЛЬ' : 'НОВАЯ ЗАДАЧА', sub: sfx ? sfx.sub : '', keys: t.keys, text: t.text, urgent: t.urgent };
      if (!sfx) SFX.good();
    }
    G._seen[t.id] = 1;
  }
  const side = [];
  if (freeMode()) {
    if (unl('wish') && M.wish && !M.wish.done) side.push([MA.seenWish ? '♥ Хотелка: исполни её — карточки под сытостью' : '♥ Она о чём-то думает — посмотри на неё', '#ff8fc0']);
    if (M.glass < 70) side.push(['⚠ Стекло ' + Math.round(M.glass) + '% — почини в терминале (Аппараты)', '#9fe8ff']);
  }
  c.font = '700 15px ' + FONT;
  const lines = t ? wrap(c, t.text, w - 50) : [];
  const taskH = t ? 30 + (t.keys ? 28 : 0) + lines.length * 20 + (t.prog ? 22 : 0) + 6 : 0;
  const h = 66 + (t ? taskH + 8 : 26) + side.length * 20 + (side.length ? 4 : 0);
  panel(c, x, y, w, h);
  txt(c, 'ЦЕЛЬ', x + 14, y + 17, 11, '#8db2b6', 'left');
  txt(c, 'Вырасти её до 300 см', x + 54, y + 17, 15, '#ffd166', 'left');
  c.fillStyle = '#0a1518'; rrect(c, x + 14, y + 30, w - 28, 10, 5); c.fill();
  c.fillStyle = '#ff8fc0'; rrect(c, x + 14, y + 30, Math.max(10, (w - 28) * clamp(G.mer.growth, 0, 1)), 10, 5); c.fill();
  txt(c, 'ЭТАП ' + (G.stage + 1) + '/' + STAGES.length + ' · ' + S.name.toUpperCase() + (G.prestige ? ' · ПРЕСТИЖ ' + G.prestige : ''), x + 14, y + 53, 11, '#6ff0d9', 'left');
  txt(c, Math.round(merHeight() * 100) + ' / 300 см', x + w - 14, y + 53, 11, '#cfe', 'right', false);
  if (!t) { txt(c, 'Справка — H', x + 14, y + 80, 13, '#cfe', 'left', false); return; }
  const tx = x + 8, ty = y + 64, tw = w - 16, acc = t.urgent ? '#ff5d6c' : '#ffc21f';
  G._taskBox = { x: tx, y: ty, w: tw, h: taskH };
  const now = performance.now(), fl = G._taskFx ? 0 : clamp(1 - (now - (G._taskFlashT || 0)) / 900, 0, 1);
  c.fillStyle = t.urgent ? 'rgba(255,93,108,.13)' : 'rgba(255,194,31,.08)'; rrect(c, tx, ty, tw, taskH, 10); c.fill();
  const pulse = t.urgent || taskIdle() ? 0.45 + 0.45 * Math.sin(G.t * 6) : 0;
  if (pulse || fl) { c.strokeStyle = t.urgent ? 'rgba(255,93,108,' + Math.max(pulse, fl) + ')' : 'rgba(255,194,31,' + Math.max(pulse, fl) + ')'; c.lineWidth = 2.5; rrect(c, tx, ty, tw, taskH, 10); c.stroke(); }
  const sf = G._stepFlash || 0; if (sf > 0) { c.fillStyle = 'rgba(123,224,123,' + sf * 0.3 + ')'; rrect(c, tx, ty, tw, taskH, 10); c.fill(); }
  c.fillStyle = acc; rrect(c, tx, ty, 5, taskH, 2.5); c.fill();
  txt(c, t.urgent ? '⚠ СРОЧНО' : 'ЗАДАЧА', tx + 16, ty + 15, 11, acc, 'left');
  if (!t.urgent) txt(c, t.head, tx + tw - 10, ty + 15, 11, '#8db2b6', 'right', false);
  let yy = ty + 38;
  if (t.keys) { keycap(c, tx + 16, yy, keyTxt(t.keys)); yy += 28; }
  c.font = '700 15px ' + FONT; c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle';
  lines.forEach((l, i) => c.fillText(l, tx + 16, yy + i * 20));
  yy += lines.length * 20 - 4;
  if (t.prog) {
    const [pv, pmx] = t.prog, bw = tw - 90;
    c.fillStyle = '#0a1518'; rrect(c, tx + 16, yy + 8, bw, 8, 4); c.fill();
    c.fillStyle = acc; rrect(c, tx + 16, yy + 8, Math.max(8, bw * clamp(pv / pmx, 0, 1)), 8, 4); c.fill();
    txt(c, pv + ' / ' + pmx, tx + tw - 12, yy + 12, 12, '#ffd166', 'right');
  }
  let sy = y + 64 + taskH + 18;
  for (const [s, col] of side) { txt(c, s, x + 16, sy, 12, col, 'left', false); sy += 20; }
}
// карточка новой задачи: крупно в центре → улетает в панель слева сверху
function drawTaskFx(c) {
  const F = G._taskFx; if (!F || !G._taskBox) return;
  const a = (performance.now() - F.t0) / 1000, hold = F.sub ? 3.2 : 2.0, fly = 0.55;
  if (a > hold + fly) { G._taskFx = null; G._taskFlashT = performance.now(); return; }
  const cw = 620, ch = F.sub ? 156 : 118, tb = G._taskBox;
  let cx = W / 2, cy = H * 0.33, s = 1, al = 1;
  if (a < 0.3) { const e = a / 0.3, b = 1 + 2.2 * Math.pow(e - 1, 3) + 1.2 * Math.pow(e - 1, 2); s = 0.6 + 0.4 * b; al = Math.min(1, e * 1.5); }
  else if (a > hold) { const u = (a - hold) / fly, e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; cx = lerp(cx, tb.x + tb.w / 2, e); cy = lerp(cy, tb.y + tb.h / 2, e); s = lerp(1, tb.w / cw, e); al = 1 - e * 0.5; }
  const acc = F.urgent ? '#ff5d6c' : '#ffc21f';
  c.save(); c.globalAlpha = al; c.translate(cx, cy); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.35)'; rrect(c, -cw / 2 + 4, -ch / 2 + 8, cw, ch, 16); c.fill();
  panel(c, -cw / 2, -ch / 2, cw, ch, acc);
  let y = -ch / 2 + 28;
  if (F.sub) { txt(c, F.head, 0, y, 24, '#6ff0d9'); y += 28; txt(c, F.sub, 0, y, 15, '#cfe', 'center', false); y += 36; }
  else { txt(c, F.head, 0, y, 13, acc); y += 38; }
  let fs = 21; c.font = '800 ' + fs + 'px ' + FONT; let tw = c.measureText(F.text).width;
  if (tw > cw - 120) { fs = 17; c.font = '800 ' + fs + 'px ' + FONT; tw = c.measureText(F.text).width; }
  let kw = 0; if (F.keys) { c.font = '700 12px ' + FONT; kw = Math.max(24, c.measureText(keyTxt(F.keys)).width + 14) + 12; }
  const x0 = -(tw + kw) / 2;
  if (F.keys) keycap(c, x0, y, keyTxt(F.keys));
  c.font = '800 ' + fs + 'px ' + FONT; c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText(F.text, x0 + kw, y);
  c.restore();
}
function hudVitals(c) {
  const M = G.mer, sp = satPct();
  const w = 440, x = W / 2 - w / 2, y = 12;
  const showMood = unl('mood');
  const h = 44 + (showMood ? 30 : 0) + (M.glass < 100 ? 20 : 0);
  panel(c, x, y, w, h);
  const bx = x + 14, bw = w - 28;
  const crit = sp < 0.2;
  txt(c, 'СЫТОСТЬ', bx, y + 15, 11, '#8db2b6', 'left');
  txt(c, (crit ? '⚠ ' : '') + Math.round(sp * 100) + '%', bx + bw, y + 15, 12, crit && Math.floor(G.t * 4) % 2 ? '#ff5d6c' : '#fff', 'right');
  const full = Math.floor(M.sat / 100 + 1e-6), part = M.sat - full * 100;
  if (M.layers > 1) for (let i = 0; i < M.layers; i++) { c.fillStyle = i < full ? LAYER_COL[Math.min(i, 5)] : '#33444a'; c.fillRect(bx + 70 + i * 14, y + 12, 11, 6); }
  const by = y + 24;
  c.fillStyle = '#1a262b'; rrect(c, bx, by, bw, 12, 4); c.fill();
  if (full > 0) { c.fillStyle = LAYER_COL[Math.min(full - 1, 5)]; c.globalAlpha = 0.5; rrect(c, bx, by, bw, 12, 4); c.fill(); c.globalAlpha = 1; }
  if (full < M.layers) { if (part > 0.5) { c.fillStyle = LAYER_COL[Math.min(full, 5)]; rrect(c, bx, by, bw * part / 100, 12, 4); c.fill(); } }
  else { c.fillStyle = LAYER_COL[Math.min(full - 1, 5)]; rrect(c, bx, by, bw, 12, 4); c.fill(); }
  c.fillStyle = 'rgba(255,93,108,.9)'; c.fillRect(bx + bw * 0.12, by - 2, 2, 16);
  let yy = y + 44;
  if (showMood) {
    txt(c, 'ГРУСТЬ', bx, yy + 4, 11, '#8fb4ff', 'left');
    txt(c, 'РАДОСТЬ', bx + bw, yy + 4, 11, '#ff8fc0', 'right');
    const eg = c.createLinearGradient(bx, 0, bx + bw, 0); eg.addColorStop(0, '#4a7bd0'); eg.addColorStop(0.4, '#6a7b82'); eg.addColorStop(0.65, '#8a8f95'); eg.addColorStop(1, '#ff8fc0');
    c.fillStyle = eg; rrect(c, bx, yy + 13, bw, 6, 3); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(bx + bw * 0.4 - 1, yy + 11, 2, 10); c.fillRect(bx + bw * 0.65 - 1, yy + 11, 2, 10);
    c.fillStyle = '#fff'; circ(c, bx + bw * M.emo / 100, yy + 16, 6); c.fill();
    yy += 30;
  }
  if (M.glass < 100) {
    txt(c, 'СТЕКЛО', bx, yy + 3, 11, '#8db2b6', 'left');
    c.fillStyle = '#1a262b'; c.fillRect(bx + 60, yy, bw - 60, 6); c.fillStyle = M.glass < 35 ? '#ff5d6c' : '#9fe8ff'; c.fillRect(bx + 60, yy, (bw - 60) * M.glass / 100, 6);
  }
  let ay = y + h + 8;
  if (M.rage) {
    c.globalAlpha = 0.7 + 0.3 * Math.sin(G.t * 10); c.fillStyle = 'rgba(120,10,20,.85)'; rrect(c, W / 2 - 170, ay, 340, 30, 8); c.fill();
    txt(c, '⚠ ЯРОСТЬ — СРОЧНО КОРМИ ЕЁ', W / 2, ay + 15, 15, '#fff'); c.globalAlpha = 1; ay += 38;
  }
  if (unl('wish') && M.wish) {
    if (M.wish.done) txt(c, 'Хотелка выполнена ♥', W / 2, ay + 10, 13, '#ff8fc0');
    else if (MA.seenWish) {
      const n = M.wish.pics.length, cw = 46, tot = 70 + n * (cw + 6);
      panel(c, W / 2 - tot / 2, ay, tot, 54);
      txt(c, 'Хочет:', W / 2 - tot / 2 + 12, ay + 27, 12, '#ff8fc0', 'left');
      M.wish.pics.forEach((kd, i) => { const cx = W / 2 - tot / 2 + 62 + i * (cw + 6); c.fillStyle = '#fffaf2'; rrect(c, cx, ay + 5, cw, 44, 6); c.fill(); drawIcon(c, kd, cx + cw / 2, ay + 27, 34); });
    } else if (Math.floor(G.t) % 4 < 3) txt(c, 'Она о чём-то думает — посмотри на неё', W / 2, ay + 10, 12, '#ff8fc0', 'center', false);
  }
}
function hudRight(c) {
  const M = G.mer, B = G.bonus;
  if (unl('coins')) {
    const w = 190, x = W - 14 - w, y = 14;
    const h = 44 + (unl('shop') ? 26 : 0) + (unl('rel') ? 22 : 0);
    panel(c, x, y, w, h);
    txt(c, '🪙', x + 26, y + 23, 22);
    txt(c, fmt(G.coins), x + w - 14, y + 23, 24, '#ffd166', 'right');
    let yy = y + 50;
    if (unl('shop')) {
      const kw = keycap(c, x + 14, yy, keyLabel(SET.keys.terminal)); txt(c, 'Терминал', x + 22 + kw, yy - 1, 13, '#cfe', 'left', false);
      if (G.newUnl && Object.keys(G.newUnl).length) { const bx2 = x + w - 62, pu = 0.85 + 0.15 * Math.sin(G.t * 6); c.fillStyle = 'rgba(255,194,31,' + pu + ')'; rrect(c, bx2, yy - 10, 50, 18, 9); c.fill(); txt(c, 'НОВОЕ', bx2 + 25, yy - 1, 10, '#2b1b00'); }
      yy += 24;
    }
    if (unl('rel')) { let hs = ''; const hr = Math.round(M.rel / 20); for (let i = 0; i < 5; i++) hs += i < hr ? '♥' : '♡'; txt(c, 'Отношение', x + 14, yy - 2, 12, '#8db2b6', 'left', false); txt(c, hs, x + w - 14, yy - 2, 15, '#ff8fc0', 'right'); }
  }
  if (unl('bonus') && (B.streak >= 2 || B.comboT > 0)) {
    const cxB = W - 100, cyB = 250, pu = 1 + (G._punch || 0) * 0.5;
    c.fillStyle = 'rgba(6,14,17,.72)'; circ(c, cxB, cyB, 68); c.fill();
    c.strokeStyle = '#243238'; c.lineWidth = 8; circ(c, cxB, cyB, 58); c.stroke();
    const fr = B.comboT > 0 ? B.comboT / Math.max(0.01, 1 + G.up.bCombo) : B.timer / Math.max(0.01, B.maxT);
    c.strokeStyle = B.comboT > 0 ? '#b77dff' : fr < 0.3 ? '#ff5d6c' : '#ffd166'; c.beginPath(); c.arc(cxB, cyB, 58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(fr, 0, 1)); c.stroke();
    txt(c, 'БОНУС', cxB, cyB - 34, 11, '#8db2b6');
    txtO(c, 'x' + B.streak, cxB, cyB - 4, 38 * pu, B.streak >= 10 ? '#ff8fc0' : '#ffd166');
    txtO(c, B.comboT > 0 ? 'КОМБО!' : '+' + fmt(B.pot), cxB, cyB + 28, 14, B.comboT > 0 ? '#d7b8ff' : '#fff');
    txt(c, 'рекорд x' + B.best, cxB, cyB + 82, 12, '#8db2b6');
  }
}

function drawHands(c) {
  const p = G.player, bob = Math.sin(p.bob * 2) * 7, pk = G._poke;
  for (const s of ['L', 'R']) {
    const h = G.hands[s], sg = s === 'L' ? -1 : 1, ok = handAllowed(s), poking = pk && pk.side === s;
    let wx = W / 2 + sg * 390, wy = H - 28 + bob * sg, ang = -Math.PI / 2 - sg * 0.22, mode = h.item ? 'hold' : 'idle';
    if (h.charging) { wy += 50 * h.charge; wx += sg * 30 * h.charge + Math.sin(G.t * 50) * 3 * h.charge; }
    if (h.throwT > 0) { wy -= 90 * h.throwT; wx -= sg * 140 * h.throwT; }
    if (poking) {
      // тычок «как с петициями»: рука уходит вперёд к прицелу, указательный палец вытянут; при удержании E остаётся вытянутым
      const ext = pk.hold ? 1 : Math.sin(clamp(pk.t / 0.3, 0, 1) * Math.PI), sw = (pk.swipe || 0) * 110;
      const tx = W / 2 + sg * 150, ty = H / 2 + 185 + sw;
      wx = lerp(wx, tx, ext); wy = lerp(wy, ty, ext);
      ang = lerp(ang, Math.atan2(H / 2 + 25 + sw - wy, W / 2 + sg * 14 - wx), ext); mode = 'point';
    }
    c.globalAlpha = ok || poking ? 1 : 0.35;
    drawHand(c, sg, wx, wy, ang, mode);
    c.globalAlpha = 1;
    if (!ok && !poking) txtO(c, '🔒 ПКМ — 2-я рука', wx, H - 22, 13, '#cfe');
    if (h.item && !poking) {
      const it = h.item, ix = wx - sg * 6;
      if (it.type === 'tool' && it.kind === 'spatula') drawSpatula(c, ix + sg * 26, wy - 70, 520, it, sg * -0.5);
      else if (it.type === 'tool') drawBox(c, ix, wy - 36, 360, it);
      else if (it.type === 'ryb') drawRyb(c, ix + Math.sin(G.t * 3) * 3, wy - 26, 230, it, { noIcons: true });
      else drawThing(c, it, ix, wy - 60, it.type === 'pack' ? 380 : 480, { noIcons: true });
    }
  }
}
function drawGlove(c, x, y, sg, point, hold) { drawHand(c, sg, x, y - 40, -Math.PI / 2 - sg * 0.2, point ? 'point' : hold ? 'hold' : 'idle'); }
