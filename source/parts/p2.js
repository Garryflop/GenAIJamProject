
// ============================ ПРИМИТИВЫ ============================
function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); }
function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, Math.abs(r), 0, Math.PI * 2); }
function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function heart(c, x, y, s) {
  c.beginPath(); c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s, y - s * 0.35, x - s * 0.45, y - s, x, y - s * 0.45);
  c.bezierCurveTo(x + s * 0.45, y - s, x + s, y - s * 0.35, x, y + s * 0.35); c.closePath();
}
function star(c, x, y, r, n = 5) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}
function bowShape(c, x, y, s, col) {
  c.save(); c.translate(x, y); c.fillStyle = col; c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = s * 0.08;
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-s * 0.9, -s * 0.75, -s, 0); c.quadraticCurveTo(-s * 0.9, s * 0.6, 0, 0); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.9, -s * 0.75, s, 0); c.quadraticCurveTo(s * 0.9, s * 0.6, 0, 0); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-s * 0.1, s * 0.1); c.lineTo(-s * 0.35, s * 0.8); c.lineTo(-s * 0.1, s * 0.65); c.moveTo(s * 0.1, s * 0.1); c.lineTo(s * 0.35, s * 0.8); c.lineTo(s * 0.1, s * 0.65); c.fill();
  circ(c, 0, 0, s * 0.22); c.fill(); c.stroke();
  c.restore();
}
function flowerShape(c, x, y, s, col) {
  c.save(); c.translate(x, y); c.fillStyle = col;
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; circ(c, Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.45); c.fill(); }
  c.fillStyle = '#ffe066'; circ(c, 0, 0, s * 0.35); c.fill(); c.restore();
}
function charm(c, kind, x, y, s) {
  c.save(); c.translate(x, y);
  if (kind === 'pearl') { const g = c.createRadialGradient(-s * 0.3, -s * 0.3, s * 0.1, 0, 0, s); g.addColorStop(0, '#fff'); g.addColorStop(1, '#d9cfe8'); c.fillStyle = g; circ(c, 0, 0, s); c.fill(); }
  else if (kind === 'heart') { c.fillStyle = '#ff5c8a'; heart(c, 0, 0, s * 1.2); c.fill(); }
  else if (kind === 'star') { c.fillStyle = '#ffd24d'; star(c, 0, 0, s * 1.2); c.fill(); }
  else { // shell
    c.fillStyle = '#ffb3c7'; c.beginPath(); c.moveTo(0, s); c.arc(0, s * 0.2, s * 1.1, Math.PI * 1.15, Math.PI * 1.85); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(160,60,90,.5)'; c.lineWidth = s * 0.12;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(0, s); c.lineTo(i * s * 0.35, -s * 0.8); c.stroke(); }
  }
  c.restore();
}
function txt(c, s, x, y, px, col = '#fff', align = 'center', bold = true) {
  c.font = (bold ? '700 ' : '') + Math.max(6, Math.round(px)) + 'px "Segoe UI",system-ui,sans-serif';
  c.textAlign = align; c.textBaseline = 'middle'; c.fillStyle = col; c.fillText(s, x, y);
}
function txtO(c, s, x, y, px, col = '#fff', align = 'center') {
  px = Math.max(6, Math.round(px));
  c.font = '700 ' + px + 'px "Segoe UI",system-ui,sans-serif';
  c.textAlign = align; c.textBaseline = 'middle';
  c.lineWidth = Math.max(2, px / 5); c.strokeStyle = 'rgba(0,0,0,.75)'; c.strokeText(s, x, y);
  c.fillStyle = col; c.fillText(s, x, y);
}
function shadow(c, x, y, k, rx, flat) { c.fillStyle = 'rgba(0,0,0,.25)'; ell(c, x, y, rx * k, rx * k * flat); c.fill(); }

// ============================ РЫЫБЧЕЛЛ ============================
// дальний рыыбчелл: упрощённая отрисовка (в несколько раз меньше вызовов канваса)
function drawRybLite(c, x, y, sc, r) {
  const f = r.face || 1, col = LVLCOL[r.lvl], col2 = LVLCOL2[r.lvl], sw = (r._mv || 0) > 0.15 ? Math.sin(r.walk) * 0.06 : 0;
  c.strokeStyle = col2; c.lineWidth = 0.05 * sc; c.beginPath();
  c.moveTo(x - 0.06 * sc, y - 0.16 * sc); c.lineTo(x + (-0.06 + sw) * sc, y); c.moveTo(x + 0.06 * sc, y - 0.16 * sc); c.lineTo(x + (0.06 - sw) * sc, y); c.stroke();
  c.fillStyle = col2; c.beginPath(); c.moveTo(x - f * 0.19 * sc, y - 0.33 * sc); c.lineTo(x - f * 0.37 * sc, y - 0.47 * sc); c.lineTo(x - f * 0.37 * sc, y - 0.19 * sc); c.fill();
  c.fillStyle = col; ell(c, x, y - 0.33 * sc, 0.23 * sc, 0.185 * sc); c.fill();
  if (r.deco.paint) { c.fillStyle = PAINT_COLS[0]; ell(c, x, y - 0.46 * sc, 0.17 * sc, 0.06 * sc); c.fill(); }
  if (r.deco.plate) { c.fillStyle = '#b9c6cc'; c.fillRect(x - f * 0.2 * sc, y - 0.56 * sc, 0.2 * sc, 0.1 * sc); }
  c.fillStyle = '#fff'; circ(c, x + f * 0.085 * sc, y - 0.395 * sc, 0.075 * sc); c.fill();
  c.fillStyle = '#111'; circ(c, x + f * 0.1 * sc, y - 0.395 * sc, 0.02 * sc); c.fill();
  if (r.deco.bow) { c.fillStyle = r.deco.bow; circ(c, x, y - 0.53 * sc, 0.05 * sc); c.fill(); }
}
function drawRyb(c, x, y, k, r, o = {}) {
  const sc = k * (1 + 0.08 * (r.lvl - 1)) * (r.deco.plate ? 1.15 : 1);
  if (sc < 85 && !o.squash && !o.noIcons && !(r._flop > 0)) { drawRybLite(c, x, y, sc, r); if (r.fav) { c.fillStyle = '#ff4d8a'; heart(c, x, y - 0.8 * sc, 0.07 * sc); c.fill(); } return; }
  c.save(); c.translate(x, y); c.scale(sc, sc);
  if (o.squash !== undefined && o.squash < 1) c.scale(1 + (1 - o.squash) * 0.7, o.squash);
  const f = r.face || 1, t = G.t;
  const kick = !!o.kick;
  const mv = (r._mv || 0) > 0.15 || kick;
  const ph = r.walk + (kick ? t * 22 : 0);
  const scared = r.fearT > 0 || kick || o.squash < 1, angry = r.angryT > 0, wor = r.worT > 0 && !scared;
  const col = LVLCOL[r.lvl], col2 = LVLCOL2[r.lvl];
  const sw = mv ? Math.sin(ph) * 0.06 : 0;
  // ПрессРыыбчелл падает целиком — вместе с ногами
  if (r._flop > 0) { const p = 1 - r._flop / 0.8, jump = p < 0.5 ? Math.sin(p / 0.5 * Math.PI / 2) * 0.45 : Math.max(0, 1 - (p - 0.5) / 0.12) * 0.45; c.translate(0, -jump - 0.25); c.rotate(f * Math.min(1, p / 0.55) * 1.45); c.translate(0, 0.25); }
  c.lineCap = 'round'; c.strokeStyle = col2; c.lineWidth = 0.05;
  c.beginPath(); c.moveTo(-0.06, -0.16); c.lineTo(-0.06 + sw, -0.025); c.moveTo(0.06, -0.16); c.lineTo(0.06 - sw, -0.025); c.stroke();
  c.fillStyle = '#f4f4f4';
  ell(c, -0.06 + sw + f * 0.015, -0.018, 0.042, 0.022); c.fill(); ell(c, 0.06 - sw + f * 0.015, -0.018, 0.042, 0.022); c.fill();
  const bob = mv ? Math.abs(Math.sin(ph)) * 0.025 : 0;
  c.translate(0, -bob);
  if (wor) { c.translate(0, -0.18); c.rotate(f * 0.5 * (0.5 + 0.5 * Math.sin(t * 5 + r.hue * 6))); c.translate(0, 0.18); }
  if (angry) c.translate(Math.sin(t * 45) * 0.012, 0);
  const wag = Math.sin(t * 8 + r.walk) * 0.04;
  const painted = r.deco.paint, py0 = -0.43 + 0.012 * Math.sin(r.hue * 7); // уровень краски (как в paintSplat)
  c.fillStyle = col2;
  c.beginPath(); c.moveTo(-f * 0.19, -0.33); c.lineTo(-f * 0.37, -0.47 + wag); c.lineTo(-f * 0.31, -0.33); c.lineTo(-f * 0.37, -0.19 - wag); c.closePath(); c.fill();
  if (painted) { c.save(); c.clip(); c.fillStyle = PAINT_COLS[0]; c.fillRect(-0.5, -0.7, 1, 0.7 + py0); c.restore(); } // краска стекает и на хвост
  c.fillStyle = painted ? PAINT_COLS[0] : col2; // спинной плавник сверху — заливается целиком
  c.beginPath(); c.moveTo(-f * 0.11, -0.49); c.quadraticCurveTo(-f * 0.02, -0.65, f * 0.08, -0.505); c.closePath(); c.fill();
  if (painted) { c.fillStyle = 'rgba(255,255,255,.45)'; ell(c, -f * 0.02, -0.55, 0.035, 0.01); c.fill(); }
  if (r.deco.plate) {
    c.save(); c.translate(-f * 0.09, -0.46); c.rotate(-f * 0.45);
    const g = c.createLinearGradient(-0.14, 0, 0.14, 0); g.addColorStop(0, '#6f7c84'); g.addColorStop(0.5, '#dfe7ea'); g.addColorStop(1, '#6f7c84');
    c.fillStyle = g; rrect(c, -0.15, -0.1, 0.3, 0.2, 0.03); c.fill();
    c.fillStyle = '#4a555b'; for (const [a, b] of [[-0.11, -0.06], [0.11, -0.06], [-0.11, 0.06], [0.11, 0.06]]) { circ(c, a, b, 0.012); c.fill(); }
    c.restore();
  }
  c.fillStyle = col; ell(c, 0, -0.33, 0.23, 0.185); c.fill();
  c.fillStyle = 'rgba(255,255,255,.33)'; ell(c, f * 0.04, -0.27, 0.15, 0.095); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 0.012;
  for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(-f * (0.02 + i * 0.055), -0.36, 0.04, -0.9, 0.9); c.stroke(); }
  if (r.deco.paint) paintSplat(c, PAINT_COLS[0], f, r.hue);
  const stc = ['#ffe66d', '#ff8fc0', '#6ff0d9'];
  for (let i = 0; i < Math.min(3, r.deco.st); i++) { c.fillStyle = stc[i]; star(c, -f * (0.1 - i * 0.07), -0.26 - (i % 2) * 0.06, 0.035); c.fill(); }
  // дальний глаз — нелепо косит
  c.fillStyle = '#fff'; circ(c, f * 0.17, -0.415, 0.04); c.fill();
  c.fillStyle = '#111'; circ(c, f * 0.18 + Math.sin(t * 1.3 + r.hue * 9) * 0.012, -0.415, 0.012); c.fill();
  const ex = f * 0.085, ey = -0.395;
  c.fillStyle = '#fff'; circ(c, ex, ey, 0.075); c.fill();
  c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 0.01; c.stroke();
  if (r._poked > 0) {
    c.strokeStyle = '#222'; c.lineWidth = 0.022;
    c.beginPath(); c.moveTo(ex - 0.035, ey - 0.035); c.lineTo(ex + 0.035, ey + 0.035); c.moveTo(ex + 0.035, ey - 0.035); c.lineTo(ex - 0.035, ey + 0.035); c.stroke();
  } else {
    const px = ex + f * 0.02 + Math.sin(t * 0.9 + r.hue * 20) * 0.02, py = ey + Math.cos(t * 1.1 + r.hue * 11) * 0.015;
    c.fillStyle = angry ? '#a00' : '#111'; circ(c, px, py, scared ? 0.012 : 0.02); c.fill();
  }
  if (angry) { c.strokeStyle = '#3a0000'; c.lineWidth = 0.02; c.beginPath(); c.moveTo(ex - f * 0.07, ey - 0.1); c.lineTo(ex + f * 0.05, ey - 0.065); c.stroke(); }
  c.fillStyle = '#ff7a8a'; ell(c, f * 0.215, -0.31, 0.035, scared ? 0.052 : 0.035); c.fill();
  c.fillStyle = '#5a1020'; ell(c, f * 0.222, -0.31, 0.018, scared ? 0.034 : 0.018); c.fill();
  c.strokeStyle = col2; c.lineWidth = 0.036;
  const up = scared || wor, sh = scared ? Math.sin(t * 30) * 0.02 : 0;
  c.beginPath();
  c.moveTo(f * 0.1, -0.25); c.lineTo(up ? f * 0.3 : f * 0.16, (up ? -0.42 : -0.15) + sh);
  c.moveTo(-f * 0.08, -0.25); c.lineTo(up ? -f * 0.25 : -f * 0.12, (up ? -0.44 : -0.15) - sh);
  c.stroke();
  if (scared) { c.fillStyle = '#9fe8ff'; c.beginPath(); c.moveTo(-f * 0.12, -0.6); c.quadraticCurveTo(-f * 0.16, -0.52, -f * 0.12, -0.51); c.quadraticCurveTo(-f * 0.08, -0.52, -f * 0.12, -0.6); c.fill(); }
  if (r.deco.bow) bowShape(c, -f * 0.02, -0.53, 0.085, r.deco.bow);
  if (r.deco.flower) flowerShape(c, f * 0.06, -0.5, 0.055, r.deco.flower);
  c.restore();
  if (!o.noIcons) {
    if (r.fav) { c.fillStyle = '#ff4d8a'; heart(c, x, y - 0.8 * sc, 0.07 * sc); c.fill(); }
    else if (r._alpha) { c.fillStyle = '#ffd24d'; star(c, x, y - 0.78 * sc, 0.05 * sc); c.fill(); }
    if (r.angryT > 0 && !o.squash) txtO(c, '#@!', x, y - 0.8 * sc, 0.14 * sc, '#ff6b6b');
  }
}

// Краска: глянцевые кляксы и подтёки поверх тела, цвет рыыбчелла сохраняется
function paintSplat(c, col, f, seed) {
  c.save(); ell(c, 0, -0.33, 0.23, 0.185); c.clip();
  const y0 = -0.43 + 0.012 * Math.sin(seed * 7);
  const drips = [[0.12 * f, 0.05 + 0.03 * srand(seed * 9)], [0.01 * f, 0.09 + 0.04 * srand(seed * 13)], [-0.1 * f, 0.04 + 0.03 * srand(seed * 17)]].sort((a, b) => b[0] - a[0]);
  c.fillStyle = col; c.beginPath(); c.moveTo(-0.26, -0.62); c.lineTo(0.26, -0.62); c.lineTo(0.26, y0);
  for (const [x, l] of drips) { c.lineTo(x + 0.03, y0); c.lineTo(x + 0.02, y0 + l); c.arc(x, y0 + l, 0.02, 0, Math.PI); c.lineTo(x - 0.03, y0); }
  c.lineTo(-0.26, y0); c.closePath(); c.fill();
  c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(-0.26, y0 - 0.012, 0.52, 0.012);
  c.fillStyle = 'rgba(255,255,255,.45)'; ell(c, -0.06 * f, -0.49, 0.06, 0.013); c.fill();
  c.restore();
}

// ============================ ПРЕДМЕТЫ ============================
const CUT_COL = {};
function cutCol(l) { return CUT_COL[l] || (CUT_COL[l] = mixCol('#8a4f26', LVLCOL[l], 0.5)); }
function drawCutlet(c, x, y, k, o) {
  if (k < 70) { c.fillStyle = cutCol(o.lvl || 1); ell(c, x, y - 0.045 * k, 0.105 * k, 0.035 * k); c.fill(); return; }
  c.save(); c.translate(x, y); c.scale(k, k);
  const top = cutCol(o.lvl || 1);
  c.fillStyle = shade(top, 0.62); ell(c, 0, -0.035, 0.11, 0.035); c.fill();
  c.fillStyle = top; ell(c, 0, -0.052, 0.104, 0.03); c.fill();
  c.strokeStyle = 'rgba(40,15,5,.6)'; c.lineWidth = 0.012;
  c.beginPath(); for (let i = -1; i <= 1; i++) { c.moveTo(i * 0.04 - 0.015, -0.07); c.lineTo(i * 0.04 + 0.015, -0.035); } c.stroke();
  if (o.deco.bow) bowShape(c, 0.03, -0.09, 0.05, o.deco.bow);
  if (o.deco.flower) flowerShape(c, -0.04, -0.082, 0.035, o.deco.flower);
  c.restore();
}
function drawMass(c, x, y, k, o) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.fillStyle = '#6d7355';
  for (const [a, b, r] of [[-0.1, -0.08, 0.1], [0.06, -0.09, 0.11], [0, -0.16, 0.09], [0.14, -0.05, 0.06], [-0.16, -0.04, 0.05]]) { circ(c, a, b, r); c.fill(); }
  c.fillStyle = '#4d523a'; for (const [a, b] of [[-0.05, -0.12], [0.08, -0.1], [0.02, -0.18]]) { circ(c, a, b, 0.025); c.fill(); }
  c.fillStyle = '#9a8f5a'; circ(c, -0.08, -0.1, 0.02); c.fill();
  c.fillStyle = '#111';
  for (let i = 0; i < 3; i++) { const a = G.t * (3 + i) + i * 2; circ(c, Math.cos(a) * 0.2, -0.3 + Math.sin(a * 1.3) * 0.08, 0.012); c.fill(); }
  c.restore();
}
function drawSpatula(c, x, y, k, o, rot = 0) {
  c.save(); c.translate(x, y); c.scale(k, k); c.rotate(rot);
  c.fillStyle = '#2b2b2b'; rrect(c, -0.34, -0.035, 0.26, 0.05, 0.02); c.fill();
  c.fillStyle = '#9aa7ad'; c.fillRect(-0.09, -0.025, 0.08, 0.03);
  const g = c.createLinearGradient(0, -0.05, 0, 0); g.addColorStop(0, '#e6eef1'); g.addColorStop(1, '#8e9ba1');
  c.fillStyle = g; rrect(c, -0.02, -0.04, 0.3, 0.05, 0.015); c.fill();
  const n = o.load ? o.load.length : 0;
  for (let i = 0; i < Math.min(n, 8); i++) drawCutlet(c, 0.05 + (i % 3) * 0.08, -0.04 - Math.floor(i / 3) * 0.035, 1, o.load[i]);
  c.restore();
  if (n > 0) txtO(c, '×' + n, x + 0.15 * k, y - 0.25 * k, Math.max(10, 0.12 * k), '#ffd166');
}
function drawBox(c, x, y, k, o) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.fillStyle = '#b98a52'; c.fillRect(-0.23, -0.32, 0.46, 0.32);
  c.fillStyle = '#9c7040'; c.fillRect(-0.23, -0.32, 0.46, 0.06);
  c.fillStyle = '#d0a26a'; c.beginPath(); c.moveTo(-0.23, -0.32); c.lineTo(-0.33, -0.42); c.lineTo(-0.1, -0.4); c.lineTo(-0.02, -0.32); c.fill();
  c.beginPath(); c.moveTo(0.23, -0.32); c.lineTo(0.33, -0.42); c.lineTo(0.1, -0.4); c.lineTo(0.02, -0.32); c.fill();
  c.strokeStyle = 'rgba(80,50,20,.5)'; c.lineWidth = 0.012; c.strokeRect(-0.23, -0.32, 0.46, 0.32);
  c.restore();
  const n = o.load ? o.load.length : 0;
  txtO(c, n + '/8', x, y - 0.16 * k, Math.max(9, 0.11 * k), '#fff');
}
function drawPack(c, x, y, k, o) {
  c.save(); c.translate(x, y); c.scale(k, k);
  const kd = o.kind;
  if (kd === 'paint') {
    c.fillStyle = '#c9d1d4'; c.beginPath(); c.moveTo(-0.13, -0.26); c.lineTo(0.13, -0.26); c.lineTo(0.11, 0); c.lineTo(-0.11, 0); c.closePath(); c.fill();
    c.fillStyle = PAINT_COLS[0]; ell(c, 0, -0.26, 0.13, 0.035); c.fill(); c.fillRect(0.05, -0.26, 0.03, 0.12);
    c.strokeStyle = '#555'; c.lineWidth = 0.012; c.beginPath(); c.arc(0, -0.26, 0.13, Math.PI, 0); c.stroke();
  } else if (kd === 'plate') {
    for (let i = 0; i < Math.min(o.n, 4); i++) {
      const g = c.createLinearGradient(-0.16, 0, 0.16, 0); g.addColorStop(0, '#6f7c84'); g.addColorStop(0.5, '#e3eaed'); g.addColorStop(1, '#6f7c84');
      c.fillStyle = g; rrect(c, -0.17, -0.05 - i * 0.045, 0.34, 0.04, 0.01); c.fill();
    }
  } else if (kd === 'repair') {
    c.fillStyle = '#d33b3b'; rrect(c, -0.18, -0.2, 0.36, 0.2, 0.03); c.fill();
    c.strokeStyle = '#333'; c.lineWidth = 0.025; c.beginPath(); c.arc(0, -0.2, 0.07, Math.PI, 0); c.stroke();
    c.fillStyle = '#fff'; c.fillRect(-0.02, -0.16, 0.04, 0.12); c.fillRect(-0.06, -0.12, 0.12, 0.04);
  } else if (kd === 'sticker') {
    c.fillStyle = '#f4f7f8'; rrect(c, -0.14, -0.26, 0.28, 0.26, 0.02); c.fill();
    const cs = ['#ff8fc0', '#ffe66d', '#6ff0d9', '#b77dff'];
    for (let i = 0; i < 4; i++) { c.fillStyle = cs[i]; star(c, -0.065 + (i % 2) * 0.13, -0.19 + Math.floor(i / 2) * 0.12, 0.045); c.fill(); }
  } else {
    c.fillStyle = kd === 'bow' ? '#ffd1e3' : '#d8f7c9'; rrect(c, -0.15, -0.22, 0.3, 0.22, 0.03); c.fill();
    if (kd === 'bow') bowShape(c, 0, -0.24, 0.09, o.col || '#ff6fa8'); else flowerShape(c, 0, -0.24, 0.06, o.col || '#ff6fa8');
  }
  c.restore();
  if (o.n > 1) txtO(c, '×' + o.n, x + 0.16 * k, y - 0.3 * k, Math.max(9, 0.1 * k), '#ffd166');
}

// Иконки для карточек-хотелок и HUD (единичный квадрат, центр в x,y)
function drawIcon(c, kind, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s);
  if (kind === 'ryb') drawRyb(c, 0, 0.38, 1.1, ICON_RYB, { noIcons: true });
  else if (kind === 'cutlet') { drawCutlet(c, -0.12, 0.12, 2.6, { lvl: 1, deco: {} }); drawCutlet(c, 0.14, 0.2, 2.2, { lvl: 1, deco: {} }); }
  else if (kind === 'bow') bowShape(c, 0, 0, 0.3, '#ff6fa8');
  else if (kind === 'flower') flowerShape(c, 0, 0, 0.2, '#ff8fc0');
  else if (kind === 'plate') { const g = c.createLinearGradient(-0.3, 0, 0.3, 0); g.addColorStop(0, '#6f7c84'); g.addColorStop(0.5, '#e3eaed'); g.addColorStop(1, '#6f7c84'); c.fillStyle = g; rrect(c, -0.32, -0.18, 0.64, 0.36, 0.06); c.fill(); }
  else if (kind === 'sticker') { c.fillStyle = '#ffe66d'; star(c, 0, 0, 0.32); c.fill(); }
  else if (kind === 'pendant') { c.strokeStyle = '#d8c28a'; c.lineWidth = 0.04; c.beginPath(); c.arc(0, -0.25, 0.3, 0.3, Math.PI - 0.3); c.stroke(); charm(c, 'shell', 0, 0.12, 0.14); }
  else if (kind === 'earrings') { c.strokeStyle = '#d8c28a'; c.lineWidth = 0.04; for (const sx of [-0.16, 0.16]) { c.beginPath(); c.moveTo(sx, -0.3); c.lineTo(sx, 0); c.stroke(); c.fillStyle = '#6ff0d9'; circ(c, sx, 0.1, 0.1); c.fill(); } }
  else if (kind === 'bracelet') { c.strokeStyle = '#ffb347'; c.lineWidth = 0.08; ell(c, 0, 0, 0.3, 0.14); c.stroke(); }
  c.restore();
}
const ICON_RYB = { lvl: 1, deco: { bow: null, flower: null, plate: false, paint: false, st: 0 }, face: 1, walk: 0, hue: 0.3, fearT: 0, angryT: 0, worT: 0 };

// ============================ АППАРАТЫ ============================
function metalGrad(c, x0, x1, a = '#8fa3ad', b = '#d8e4ea') {
  const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, a); g.addColorStop(0.5, b); g.addColorStop(1, a); return g;
}
function drawInc(c, x, y, k, m) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.fillStyle = metalGrad(c, -0.55, 0.55); rrect(c, -0.55, -1.25, 1.1, 1.25, 0.06); c.fill();
  c.fillStyle = '#51636c'; c.fillRect(-0.55, -0.08, 1.1, 0.08);
  c.fillStyle = '#6c7f88'; c.fillRect(-0.5, -1.3, 1.0, 0.07);
  // купол с икрой
  c.save(); c.beginPath(); c.moveTo(-0.46, -1.3); c.bezierCurveTo(-0.46, -2.0, 0.46, -2.0, 0.46, -1.3); c.closePath();
  c.fillStyle = 'rgba(160,230,255,.22)'; c.fill(); c.clip();
  c.fillStyle = 'rgba(255,150,195,.28)'; c.fillRect(-0.5, -1.62, 1, 0.4);
  const over = m.prog > 0.82, n = 5 + Math.floor(m.prog * 11);
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996, rr = 0.06 + 0.3 * ((i * 0.37) % 1);
    const ex = Math.cos(a) * rr, ey = -1.38 - Math.abs(Math.sin(a)) * rr * 0.75;
    const sz = 0.035 + m.prog * 0.055 * (0.6 + 0.4 * ((i * 0.61) % 1)) + Math.sin(G.t * 3 + i) * 0.004;
    c.fillStyle = over ? '#9b8f7a' : '#ff9cc4'; circ(c, ex, ey, sz); c.fill();
    c.fillStyle = over ? '#5a5040' : '#7a2748'; circ(c, ex + sz * 0.2, ey + sz * 0.1, sz * (0.2 + m.prog * 0.3)); c.fill();
    c.fillStyle = 'rgba(255,255,255,.6)'; circ(c, ex - sz * 0.35, ey - sz * 0.35, sz * 0.2); c.fill();
  }
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 0.02; c.beginPath(); c.arc(-0.05, -1.45, 0.34, -2.6, -1.9); c.stroke();
  // шкала
  const bx = -0.44, bw = 0.15, by0 = -0.18, bh = 0.92;
  c.fillStyle = '#1f2a30'; c.fillRect(bx - 0.02, by0 - bh - 0.02, bw + 0.04, bh + 0.04);
  c.fillStyle = '#3f6b86'; c.fillRect(bx, by0 - bh * 0.62, bw, bh * 0.62);
  c.fillStyle = '#3ccf7a'; c.fillRect(bx, by0 - bh * 0.82, bw, bh * 0.2);
  c.fillStyle = '#8a5a2b'; c.fillRect(bx, by0 - bh, bw, bh * 0.18);
  if (mUp(m).protect) { c.fillStyle = '#ffd166'; c.fillRect(bx - 0.03, by0 - bh * 0.8 - 0.006, bw + 0.06, 0.012); }
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(bx, by0 - bh * m.prog, bw, bh * m.prog);
  c.fillStyle = '#fff'; c.fillRect(bx - 0.04, by0 - bh * m.prog - 0.012, bw + 0.08, 0.024);
  // кнопка
  const pr = m.hold;
  c.fillStyle = '#4a1418'; circ(c, 0.06, -0.6, 0.17); c.fill();
  c.fillStyle = pr ? '#b0202a' : '#ff3b47'; circ(c, 0.06, -0.6 + (pr ? 0.012 : 0), 0.13); c.fill();
  c.fillStyle = 'rgba(255,255,255,.45)'; ell(c, 0.02, -0.66, 0.05, 0.03); c.fill();
  // рубильник авто
  c.fillStyle = '#2d3a41'; rrect(c, 0.26, -1.18, 0.24, 0.36, 0.03); c.fill();
  c.strokeStyle = '#cfd8dc'; c.lineWidth = 0.035; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0.38, -1.0); c.lineTo(0.38 + (m.auto ? -0.06 : 0.06), m.auto ? -1.13 : -0.87); c.stroke();
  c.fillStyle = !mUp(m).auto ? '#444' : m.auto ? '#46ff7a' : '#ff4a4a'; circ(c, 0.38, -0.78, 0.035); c.fill();
  if (m.flash > 0) { c.fillStyle = m.flashCol || 'rgba(120,255,160,' + m.flash + ')'; c.globalAlpha = m.flash; rrect(c, -0.55, -1.25, 1.1, 1.25, 0.06); c.fill(); c.globalAlpha = 1; }
  c.restore();
  txtO(c, 'ИНКУБАТОР ' + m.n + (m.auto ? ' · АВТО' : ''), x, y - 1.14 * k, Math.max(8, 0.085 * k), '#cfe');
  if (m.prog > 0.82 && !mUp(m).protect && Math.floor(G.t * 4) % 2) txtO(c, '!', x - 0.37 * k, y - 1.2 * k, 0.2 * k, '#ffb347');
}
function drawPress(c, x, y, k, m) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.fillStyle = '#3b4449'; rrect(c, -0.66, -0.3, 1.32, 0.3, 0.04); c.fill();
  const st = Math.min(9, G.stats.pressed);
  for (let i = 0; i < st; i++) { c.fillStyle = 'rgba(120,20,30,.55)'; ell(c, -0.5 + ((i * 0.37) % 1) * 1.0, -0.12 + ((i * 0.53) % 1) * 0.1, 0.05 + ((i * 0.29) % 1) * 0.05, 0.02); c.fill(); }
  c.fillStyle = metalGrad(c, -0.6, -0.46, '#5d6b72', '#b9c6cc'); c.fillRect(-0.6, -2.15, 0.13, 1.88);
  c.fillStyle = metalGrad(c, 0.47, 0.6, '#5d6b72', '#b9c6cc'); c.fillRect(0.47, -2.15, 0.13, 1.88);
  c.fillStyle = '#56646b'; rrect(c, -0.68, -2.38, 1.36, 0.32, 0.05); c.fill();
  c.save(); c.beginPath(); c.rect(-0.66, -2.12, 1.32, 0.05); c.clip();
  for (let i = -8; i < 8; i++) { c.fillStyle = i % 2 ? '#222' : '#ffcc33'; c.beginPath(); c.moveTo(i * 0.1, -2.12); c.lineTo(i * 0.1 + 0.1, -2.12); c.lineTo(i * 0.1 + 0.05, -2.07); c.lineTo(i * 0.1 - 0.05, -2.07); c.fill(); }
  c.restore();
  const ease = m.lever * m.lever;
  const py = lerp(-1.55, -0.5, ease);
  c.fillStyle = '#c9d3d8'; c.fillRect(-0.06, -2.06, 0.12, py - 0.14 + 2.06);
  c.fillStyle = metalGrad(c, -0.44, 0.44, '#77858c', '#dde5e8'); rrect(c, -0.44, py - 0.15, 0.88, 0.15, 0.02); c.fill();
  c.fillStyle = '#20272b'; c.fillRect(-0.46, -0.37, 0.92, 0.08);
  if (m.slot) {
    const r = byId(m.slot);
    if (r) { const top = -0.36 - 0.62; const sq = py > top ? clamp((-py - 0.36) / 0.62, 0.12, 1) : 1; drawRyb(c, 0, -0.36, 1, r, { squash: sq, kick: true, noIcons: true }); }
  }
  // рычаг (свайп)
  const ang = lerp(-1.05, 0.95, m.lever);
  c.fillStyle = '#39444a'; circ(c, 0.7, -1.25, 0.07); c.fill();
  c.strokeStyle = '#b7c3c8'; c.lineWidth = 0.05; c.lineCap = 'round';
  const hx = 0.7 + Math.cos(ang) * 0.48, hy = -1.25 + Math.sin(ang) * 0.48;
  c.beginPath(); c.moveTo(0.7, -1.25); c.lineTo(hx, hy); c.stroke();
  c.fillStyle = '#ff3b47'; circ(c, hx, hy, 0.075); c.fill();
  // рубильник авто
  c.fillStyle = '#2d3a41'; rrect(c, -0.86, -1.72, 0.22, 0.32, 0.03); c.fill();
  c.strokeStyle = '#cfd8dc'; c.lineWidth = 0.035;
  c.beginPath(); c.moveTo(-0.75, -1.56); c.lineTo(-0.75 + (m.auto ? -0.05 : 0.05), m.auto ? -1.68 : -1.45); c.stroke();
  c.fillStyle = !mUp(m).auto ? '#444' : m.auto ? '#46ff7a' : '#ff4a4a'; circ(c, -0.75, -1.37, 0.03); c.fill();
  if (m.flash > 0) { c.globalAlpha = m.flash * 0.7; c.fillStyle = '#ff3355'; c.fillRect(-0.66, -0.6, 1.32, 0.6); c.globalAlpha = 1; }
  c.restore();
  txtO(c, 'ПРЕСС ' + m.n + (m.auto ? ' · АВТО' : ''), x, y - 2.22 * k, Math.max(8, 0.09 * k), '#cfe');
  if (m.slot && !m.auto && m.lever < 0.05) txtO(c, '↓', x + (0.7 + Math.cos(ang) * 0.48) * k, y + (-1.25 + Math.sin(ang) * 0.48 + 0.25) * k, 0.2 * k, '#ffd166');
}
function drawTerm(c, x, y, k, m) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.fillStyle = '#2b3940'; c.fillRect(-0.16, -0.95, 0.32, 0.95);
  c.fillStyle = '#1e292e'; ell(c, 0, 0, 0.35, 0.06); c.fill();
  c.fillStyle = '#394b53'; rrect(c, -0.55, -1.72, 1.1, 0.74, 0.05); c.fill();
  const g = c.createLinearGradient(0, -1.66, 0, -1.06); g.addColorStop(0, '#0f3b44'); g.addColorStop(1, '#0a2127');
  c.fillStyle = g; rrect(c, -0.49, -1.66, 0.98, 0.6, 0.03); c.fill();
  c.fillStyle = 'rgba(111,240,217,' + (0.15 + 0.1 * Math.sin(G.t * 3)) + ')'; c.fillRect(-0.49, -1.66, 0.98, 0.6);
  c.fillStyle = '#56666d'; c.beginPath(); c.moveTo(-0.5, -0.98); c.lineTo(0.5, -0.98); c.lineTo(0.42, -0.86); c.lineTo(-0.42, -0.86); c.fill();
  c.restore();
  txt(c, 'ТЕРМИНАЛ', x, y - 1.5 * k, Math.max(7, 0.12 * k), '#6ff0d9');
  txt(c, '🪙 ' + fmt(G.coins), x, y - 1.28 * k, Math.max(7, 0.11 * k), '#ffd166');
}
function drawPad(c, x, y, k, m, flat) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.fillStyle = '#26333a'; ell(c, 0, 0, 0.62, 0.62 * flat); c.fill();
  c.strokeStyle = 'rgba(111,240,217,' + (0.4 + 0.3 * Math.sin(G.t * 4)) + ')'; c.lineWidth = 0.04; ell(c, 0, 0, 0.5, 0.5 * flat); c.stroke();
  c.fillStyle = 'rgba(160,230,255,.18)'; c.fillRect(-0.16, -CEIL, 0.32, CEIL - 2.1);
  c.strokeStyle = 'rgba(200,240,255,.35)'; c.lineWidth = 0.02; c.strokeRect(-0.16, -CEIL, 0.32, CEIL - 2.1);
  c.fillStyle = '#56666d'; c.fillRect(-0.22, -2.15, 0.44, 0.1);
  c.restore();
  txtO(c, 'ДОСТАВКА', x, y - 2.3 * k, Math.max(7, 0.1 * k), '#9fe8ff');
}
function drawBin(c, x, y, k, m) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.fillStyle = '#e0b21e'; c.fillRect(-0.4, -1.1, 0.8, 1.1);
  c.save(); c.beginPath(); c.rect(-0.4, -0.3, 0.8, 0.22); c.clip();
  for (let i = -6; i < 6; i++) { c.fillStyle = '#222'; c.beginPath(); c.moveTo(i * 0.16, -0.3); c.lineTo(i * 0.16 + 0.08, -0.3); c.lineTo(i * 0.16 + 0.3, -0.08); c.lineTo(i * 0.16 + 0.22, -0.08); c.fill(); }
  c.restore();
  c.fillStyle = '#1a1a1a'; rrect(c, -0.3, -1.02, 0.6, 0.3, 0.04); c.fill();
  c.restore();
  txt(c, 'УТИЛИЗАЦИЯ', x, y - 0.55 * k, Math.max(7, 0.085 * k), '#222');
}
