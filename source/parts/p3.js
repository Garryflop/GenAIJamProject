
// ============================ КАМЕРА / ПРОЕКЦИЯ ============================
function camSetup() {
  const p = G.player;
  CAM.x = p.x; CAM.z = p.z; CAM.c = Math.cos(p.yaw); CAM.s = Math.sin(p.yaw);
  const bob = Math.sin(p.bob) * 0.035;
  CAM.eye = (p.crouch ? EYE_CROUCH : EYE) + p.y + bob;
  CAM.pc = Math.cos(p.pitch); CAM.ps = Math.sin(p.pitch);
  CAM.hor = H / 2 + FOCAL * Math.tan(p.pitch); // где на экране горизонт
}
function toCam(x, z) { const dx = x - CAM.x, dz = z - CAM.z; return [-dx * CAM.s + dz * CAM.c, dx * CAM.c + dz * CAM.s]; }
// камера с наклоном: d — расстояние вперёд по горизонтали (для сортировки), dep — глубина вдоль взгляда
function proj(x, y, z) {
  const dx = x - CAM.x, dz = z - CAM.z, v = y - CAM.eye;
  const d = dx * CAM.c + dz * CAM.s, dep = d * CAM.pc + v * CAM.ps; if (dep < 0.12) return null;
  const l = -dx * CAM.s + dz * CAM.c, k = FOCAL / dep;
  return { x: W / 2 + l * k, y: H / 2 - (v * CAM.pc - d * CAM.ps) * k, k, d };
}
function camDep(l, d, y) { return d * CAM.pc + (y - CAM.eye) * CAM.ps; }
function projCam(l, d, y) {
  const v = y - CAM.eye, k = FOCAL / Math.max(1e-3, d * CAM.pc + v * CAM.ps);
  return { x: W / 2 + l * k, y: H / 2 - (v * CAM.pc - d * CAM.ps) * k, k };
}
function srand(s) { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r * amt), 0, 255); g = clamp(Math.round(g * amt), 0, 255); b = clamp(Math.round(b * amt), 0, 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function mixCol(a, b, t) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(A >> 16, B >> 16, t)), g = Math.round(lerp((A >> 8) & 255, (B >> 8) & 255, t)), bl = Math.round(lerp(A & 255, B & 255, t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
}

// ============================ ПОЗА РУСАЛКИ ============================
function merPose() {
  const M = G.mer, t = G.t, A = {};
  const g = M.growth;
  A.legT = MA.finale > 0 ? 1 : clamp((g - 0.8) / 0.18, 0, 1);
  A.cramp = clamp((g - 0.55) / 0.35, 0, 1);
  A.curl = A.cramp * 0.9;
  A.swim = 1; A.swimSpd = 2.2; A.tilt = Math.sin(t * 0.7) * 0.05; A.headTilt = Math.sin(t * 0.9) * 0.05;
  A.lid = 0; A.blush = 0; A.face = 'smile'; A.cards = null; A.rage = false; A.handBig = null; A.gazeDown = 0;
  const sp = satPct();
  A.pale = sp < 0.3 ? (0.3 - sp) / 0.3 : 0;
  let pose;
  if (M.rage) pose = 'rage';
  else if (MA.eatT > 0) pose = 'eat';
  else if (MA.spitT > 0) pose = 'spit';
  else if (MA.cryT > 0) pose = 'cry';
  else if (MA.laughT > 0) pose = 'laugh';
  else if (MA.loveT > 0) pose = 'love';
  else if (MA.showWishT > 0) pose = 'wish';
  else if (MA.tapT > 0) pose = 'tap';
  else if (sp < 0.35) pose = 'hungry';
  else pose = M.state;
  A.pose = pose;
  let L = { x: -0.2, y: -0.12 }, R = { x: 0.2, y: -0.12 };
  switch (pose) {
    case 'joy':
      A.face = 'bigsmile'; A.blush = 0.6; A.swimSpd = 3.2; A.tilt = Math.sin(t * 1.2) * 0.12;
      R = { x: 0.24 + Math.sin(t * 7) * 0.05, y: -0.7 }; L = { x: -0.24, y: -0.26 + Math.sin(t * 2) * 0.05 }; break;
    case 'neutral':
      A.face = 'flat'; A.lid = 0.42; A.headTilt = 0.12 + Math.sin(t * 0.5) * 0.04;
      R = { x: 0.035, y: -0.545 }; L = { x: -0.13, y: -0.04 }; break;
    case 'sad':
      A.face = 'sad'; A.lid = 0.35; A.gazeDown = 1; A.headTilt = -0.1; A.swim = 0.4; A.swimSpd = 1.2;
      L = { x: 0.03, y: -0.28 }; R = { x: -0.03, y: -0.31 }; break;
    case 'hungry':
      A.face = 'sad'; A.lid = 0.2; A.swim = 0.5;
      L = { x: -0.045, y: -0.1 }; R = { x: 0.045, y: -0.12 }; break;
    case 'rage': {
      A.rage = true; A.face = 'rage'; A.swimSpd = 7; A.tilt = Math.sin(t * 22) * 0.03;
      const b = MA.bangK;
      L = { x: -0.13, y: -0.66 + b * 0.24 }; R = { x: 0.13, y: -0.66 + (1 - b) * 0.24 }; A.handBig = 'both'; break;
    }
    case 'eat':
      A.face = MA.eatT > 0.18 ? 'chomp' : 'munch'; A.swimSpd = 4;
      L = { x: -0.19, y: -0.46 }; R = { x: 0.19, y: -0.46 }; break;
    case 'spit':
      A.face = 'gross'; L = { x: -0.03, y: -0.52 }; R = { x: 0.22, y: -0.3 }; break;
    case 'cry':
      A.face = 'cry'; A.headTilt = 0.12; L = { x: -0.045, y: -0.6 }; R = { x: 0.045, y: -0.6 }; break;
    case 'laugh':
      A.face = 'laugh'; A.blush = 1; A.tilt = Math.sin(t * 18) * 0.05;
      L = { x: -0.025, y: -0.53 }; R = { x: 0.035, y: -0.5 }; break;
    case 'love':
      A.face = 'love'; A.blush = 1; A.tilt = Math.sin(t * 3) * 0.15;
      L = { x: -0.03, y: -0.37 }; R = { x: 0.03, y: -0.37 }; break;
    case 'wish':
      A.face = 'o'; A.cards = MA.cards;
      L = { x: -0.1, y: -0.27 }; R = { x: 0.1, y: -0.27 }; break;
    case 'tap':
      A.face = 'o'; A.blush = 0.5; R = { x: 0.1, y: -0.5 }; L = { x: -0.18, y: -0.15 }; A.handBig = 'R'; break;
  }
  if (A.cramp > 0.3 && (pose === 'joy' || pose === 'neutral' || pose === 'sad' || pose === 'hungry')) {
    const k = A.cramp;
    L = { x: lerp(L.x, -0.15, k), y: lerp(L.y, -0.88, k) }; R = { x: lerp(R.x, 0.17, k), y: lerp(R.y, -0.88, k) };
    A.headTilt += 0.15 * k;
  }
  A.handL = L; A.handR = R;
  if (MA.blink > 0 && A.face !== 'laugh' && A.face !== 'love') A.lid = 1;
  return A;
}

function ik(sx, sy, hx, hy, l1, l2, bend) {
  let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy);
  const mx = l1 + l2 - 0.002;
  if (d > mx) { hx = sx + dx / d * mx; hy = sy + dy / d * mx; d = mx; }
  d = Math.max(d, 1e-4);
  const a = Math.atan2(hy - sy, hx - sx);
  const ca = clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const an = a + bend * Math.acos(ca);
  return { ex: sx + Math.cos(an) * l1, ey: sy + Math.sin(an) * l1, hx, hy };
}

// ============================ РУСАЛКА ============================
function drawMermaid(c, cx, cy, k, A) {
  const M = G.mer, C = G.cust, t = G.t;
  const unit = merHeight() / 1.87, sc = k * unit;
  c.save(); c.translate(cx, cy); c.scale(sc, sc); c.rotate(A.tilt);
  const skin = mixCol('#ffd9cc', '#d9d4d6', A.pale), skinSh = mixCol('#f0b4a4', '#b9b0b4', A.pale);
  const hair = C.hairColor, hairD = shade(hair, 0.7);
  if (A.rage) {
    const g = c.createRadialGradient(0, -0.4, 0.05, 0, -0.4, 0.8);
    g.addColorStop(0, 'rgba(255,30,40,.35)'); g.addColorStop(1, 'rgba(255,0,0,0)');
    c.fillStyle = g; circ(c, 0, -0.4, 0.8); c.fill();
  }
  // волосы сзади
  c.save(); c.translate(0, -0.5); c.rotate(A.headTilt); c.translate(0, 0.5);
  hairBack(c, C.hairStyle, hair, hairD, t, A);
  c.restore();
  // хвост / ноги
  if (A.legT < 1) { c.globalAlpha = 1 - A.legT * 0.95; drawTail(c, t, A); c.globalAlpha = 1; }
  if (A.legT > 0) { c.globalAlpha = A.legT; drawLegs(c, t, A, skin, skinSh); c.globalAlpha = 1; }
  // торс
  c.fillStyle = skin;
  c.beginPath(); c.moveTo(-0.035, -0.5); c.quadraticCurveTo(-0.05, -0.455, -0.125, -0.44);
  c.quadraticCurveTo(-0.118, -0.36, -0.1, -0.3); c.quadraticCurveTo(-0.068, -0.13, -0.078, -0.02);
  const tb = lerp(0.1, 0.14, A.legT); // низ торса прячется под оборку, иначе кожа видна поверх хвоста
  c.quadraticCurveTo(-0.112, 0.06, -0.104, tb); c.lineTo(0.104, tb);
  c.quadraticCurveTo(0.112, 0.06, 0.078, -0.02); c.quadraticCurveTo(0.068, -0.13, 0.1, -0.3);
  c.quadraticCurveTo(0.118, -0.36, 0.125, -0.44); c.quadraticCurveTo(0.05, -0.455, 0.035, -0.5); c.closePath(); c.fill();
  c.strokeStyle = skinSh; c.lineWidth = 0.006; c.beginPath(); c.arc(0, -0.06, 0.006, 0, Math.PI * 2); c.stroke();
  // пояс-оборка на стыке
  c.fillStyle = A.legT > 0.5 ? '#6a5cff' : '#58d6cf';
  for (let i = -3; i <= 3; i++) { ell(c, i * 0.03, 0.09 + Math.abs(i) * 0.004, 0.022, 0.03); c.fill(); }
  // топ-ракушки
  c.strokeStyle = '#9c7fd6'; c.lineWidth = 0.008; c.beginPath(); c.moveTo(-0.1, -0.36); c.lineTo(0.1, -0.36); c.moveTo(-0.05, -0.37); c.lineTo(-0.03, -0.49); c.moveTo(0.05, -0.37); c.lineTo(0.03, -0.49); c.stroke();
  for (const s of [-1, 1]) {
    c.fillStyle = '#c9a8ff'; c.beginPath(); c.moveTo(s * 0.05, -0.305);
    c.arc(s * 0.05, -0.33, 0.052, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(110,70,170,.45)'; c.lineWidth = 0.006;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(s * 0.05, -0.305); c.lineTo(s * 0.05 + i * 0.018, -0.372); c.stroke(); }
  }
  // кулон
  if (C.pendant) {
    c.strokeStyle = '#e2cf93'; c.lineWidth = 0.005; c.beginPath(); c.moveTo(-0.035, -0.495); c.quadraticCurveTo(0, -0.42, 0.035, -0.495); c.stroke();
    charm(c, C.pendant.type, 0, -0.44, 0.017);
  }
  // руки
  drawArm(c, -1, A.handL, skin, skinSh, A);
  drawArm(c, 1, A.handR, skin, skinSh, A);
  // голова
  c.save(); c.translate(0, -0.5); c.rotate(A.headTilt); c.translate(0, 0.5);
  c.fillStyle = skinSh; c.fillRect(-0.03, -0.54, 0.06, 0.06);
  for (const s of [-1, 1]) {
    c.fillStyle = 'rgba(159,232,255,.9)'; c.beginPath(); c.moveTo(s * 0.09, -0.665);
    c.lineTo(s * (0.17 + Math.sin(t * 3) * 0.01), -0.71); c.lineTo(s * 0.155, -0.64); c.lineTo(s * 0.165, -0.6); c.lineTo(s * 0.09, -0.6); c.closePath(); c.fill();
  }
  c.fillStyle = skin; ell(c, 0, -0.62, 0.1, 0.108); c.fill();
  if (C.earrings) {
    for (const s of [-1, 1]) {
      const sw = Math.sin(t * 2 + s) * 0.006;
      c.strokeStyle = '#e2cf93'; c.lineWidth = 0.004; c.beginPath(); c.moveTo(s * 0.098, -0.59); c.lineTo(s * 0.1 + sw, -0.565); c.stroke();
      c.fillStyle = C.earrings.color; circ(c, s * 0.1 + sw, -0.556, 0.011); c.fill();
    }
  }
  drawFace(c, A, t);
  hairFront(c, C.hairStyle, hair, hairD, t);
  if (C.bow) bowShape(c, 0.075, -0.712, 0.045, C.bow.color);
  c.restore();
  // карточки-хотелки
  if (A.cards) {
    const n = A.cards.length;
    A.cards.forEach((kd, i) => {
      const x0 = n === 1 ? 0 : (i ? 0.085 : -0.085);
      c.save(); c.translate(x0, -0.3); c.rotate((i - (n - 1) / 2) * 0.12 + Math.sin(t * 2 + i) * 0.03);
      c.fillStyle = '#fffaf2'; rrect(c, -0.075, -0.095, 0.15, 0.19, 0.012); c.fill();
      c.strokeStyle = '#d8c6ad'; c.lineWidth = 0.006; c.stroke();
      drawIcon(c, kd, 0, -0.005, 0.12);
      c.restore();
    });
  }
  // эхолокация
  for (const e of MA.echoes) {
    const r = 0.14 + e.age * 0.8;
    c.strokeStyle = e.rage ? 'rgba(255,60,60,' + (1 - e.age) + ')' : 'rgba(150,255,245,' + (0.8 - e.age * 0.8) + ')';
    c.lineWidth = 0.012;
    for (const s of [-1, 1]) { c.beginPath(); c.arc(0, -0.62, r, s > 0 ? -0.6 : Math.PI - 0.6, s > 0 ? 0.6 : Math.PI + 0.6); c.stroke(); }
  }
  for (const h of MA.hearts) { c.globalAlpha = 1 - h.age; c.fillStyle = '#ff5c8a'; heart(c, h.x, -0.75 - h.age * 0.35, 0.03); c.fill(); }
  c.globalAlpha = 1;
  for (const d of MA.tears) { c.fillStyle = 'rgba(140,210,255,.9)'; ell(c, d.x, -0.6 + d.age * 0.25, 0.008, 0.013); c.fill(); }
  c.restore();
}

function drawTail(c, t, A) {
  const N = 16, len = 0.98, pts = [];
  let x = 0, y = 0.07, ang = Math.PI / 2;
  const side = 1;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    pts.push({ x, y, u });
    const wave = Math.sin(t * A.swimSpd - u * 4.2) * 0.09 * A.swim * u;
    ang = Math.PI / 2 + wave * 3 + A.curl * side * Math.pow(u, 1.6) * 2.6;
    x += Math.cos(ang) * len / N; y += Math.sin(ang) * len / N;
  }
  const Lp = [], Rp = [];
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)];
    let dx = b.x - a.x, dy = b.y - a.y; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const u = i / N, w = (u < 0.18 ? 0.098 + u * 0.08 : 0.112 * Math.pow(1 - u, 0.75)) + 0.018;
    Lp.push({ x: pts[i].x - dy * w, y: pts[i].y + dx * w }); Rp.push({ x: pts[i].x + dy * w, y: pts[i].y - dx * w });
  }
  const g = c.createLinearGradient(0, 0, 0, 1.0); g.addColorStop(0, '#46d8cc'); g.addColorStop(0.6, '#4f8cff'); g.addColorStop(1, '#8a5cff');
  c.fillStyle = g; c.beginPath(); Lp.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y));
  for (let i = N; i >= 0; i--) c.lineTo(Rp[i].x, Rp[i].y); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 0.006;
  for (let i = 2; i < N - 1; i++) {
    const p = pts[i];
    for (const o of [-0.04, 0, 0.04]) { if (Math.abs(o) > 0.1 * (1 - i / N) + 0.01) continue; c.beginPath(); c.arc(p.x + o, p.y, 0.022, 0.2, Math.PI - 0.2); c.stroke(); }
  }
  const e = pts[N], p0 = pts[N - 2];
  const dx = e.x - p0.x, dy = e.y - p0.y, da = Math.atan2(dy, dx);
  const fl = Math.sin(t * A.swimSpd * 1.3) * 0.15;
  c.fillStyle = 'rgba(160,235,255,.85)';
  for (const s of [-1, 1]) {
    const a2 = da + s * (0.75 + fl * s);
    c.beginPath(); c.moveTo(e.x, e.y);
    c.quadraticCurveTo(e.x + Math.cos(a2 - s * 0.5) * 0.2, e.y + Math.sin(a2 - s * 0.5) * 0.2, e.x + Math.cos(a2) * 0.26, e.y + Math.sin(a2) * 0.26);
    c.quadraticCurveTo(e.x + Math.cos(da) * 0.1, e.y + Math.sin(da) * 0.1, e.x, e.y); c.fill();
  }
  c.fillStyle = 'rgba(180,240,255,.55)';
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 0.08, 0.2); c.quadraticCurveTo(s * 0.2, 0.26 + Math.sin(t * 3) * 0.02, s * 0.14, 0.36); c.lineTo(s * 0.09, 0.3); c.fill(); }
}
function drawLegs(c, t, A, skin, skinSh) {
  c.lineCap = 'round';
  for (const s of [-1, 1]) {
    const sw = Math.sin(t * 1.5 + s) * 0.03;
    c.strokeStyle = skin; c.lineWidth = 0.085; c.beginPath(); c.moveTo(s * 0.055, 0.1); c.lineTo(s * 0.07 + sw, 0.52); c.stroke();
    c.lineWidth = 0.062; c.beginPath(); c.moveTo(s * 0.07 + sw, 0.52); c.lineTo(s * 0.06 + sw * 2, 0.92); c.stroke();
    c.fillStyle = skinSh; ell(c, s * 0.07 + sw * 2, 0.945, 0.045, 0.022); c.fill();
  }
  c.fillStyle = '#6a5cff';
  c.beginPath(); c.moveTo(-0.115, 0.08); c.lineTo(0.115, 0.08); c.lineTo(0.14, 0.24); c.quadraticCurveTo(0, 0.28, -0.14, 0.24); c.closePath(); c.fill();
}
function drawArm(c, side, hand, skin, skinSh, A) {
  const sx = side * 0.12, sy = -0.43;
  const j = ik(sx, sy, hand.x, hand.y, 0.17, 0.16, -side);
  c.lineCap = 'round'; c.strokeStyle = skin;
  c.lineWidth = 0.044; c.beginPath(); c.moveTo(sx, sy); c.lineTo(j.ex, j.ey); c.stroke();
  c.lineWidth = 0.037; c.beginPath(); c.moveTo(j.ex, j.ey); c.lineTo(j.hx, j.hy); c.stroke();
  const big = A.handBig === 'both' || (A.handBig === 'R' && side > 0);
  c.fillStyle = skin; circ(c, j.hx, j.hy, big ? 0.04 : 0.027); c.fill();
  if (big) { c.strokeStyle = skinSh; c.lineWidth = 0.006; for (let i = -1; i <= 2; i++) { c.beginPath(); c.moveTo(j.hx + i * 0.016, j.hy - 0.02); c.lineTo(j.hx + i * 0.02, j.hy - 0.055); c.stroke(); } }
  if (G.cust.bracelets) {
    const bx = lerp(j.ex, j.hx, 0.82), by = lerp(j.ey, j.hy, 0.82);
    c.strokeStyle = G.cust.bracelets.color; c.lineWidth = 0.012; ell(c, bx, by, 0.024, 0.013, Math.atan2(j.hy - j.ey, j.hx - j.ex) + Math.PI / 2); c.stroke();
  }
}
function drawFace(c, A, t) {
  const f = A.face, rage = A.rage;
  const gx = clamp(MA.gazeX, -1, 1) * 0.008, gy = clamp(MA.gazeY, -1, 1) * 0.008 + A.gazeDown * 0.012;
  if (A.blush > 0) { c.fillStyle = 'rgba(255,120,150,' + (0.45 * A.blush) + ')'; ell(c, -0.066, -0.582, 0.022, 0.012); c.fill(); ell(c, 0.066, -0.582, 0.022, 0.012); c.fill(); }
  const closed = f === 'laugh' || f === 'love';
  for (const s of [-1, 1]) {
    const ex = s * 0.043, ey = -0.614;
    if (closed) {
      c.strokeStyle = '#3a2440'; c.lineWidth = 0.009; c.beginPath(); c.arc(ex, ey + 0.012, 0.024, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); continue;
    }
    if (f === 'gross') {
      c.strokeStyle = '#3a2440'; c.lineWidth = 0.009; c.beginPath(); c.moveTo(ex - s * 0.022, ey - 0.018); c.lineTo(ex + s * 0.018, ey); c.lineTo(ex - s * 0.022, ey + 0.018); c.stroke(); continue;
    }
    c.save(); ell(c, ex, ey, 0.031, 0.036); c.clip();
    c.fillStyle = '#fff'; c.fillRect(ex - 0.04, ey - 0.04, 0.08, 0.08);
    const ir = c.createRadialGradient(ex + gx, ey + gy - 0.008, 0.004, ex + gx, ey + gy, 0.026);
    ir.addColorStop(0, rage ? '#ff9a9a' : '#9ff4ff'); ir.addColorStop(1, rage ? '#c4001a' : '#2a9fc0');
    c.fillStyle = ir; circ(c, ex + gx, ey + gy, 0.025); c.fill();
    c.fillStyle = '#10202a';
    if (rage) { ell(c, ex + gx, ey + gy, 0.004, 0.02); c.fill(); } else { circ(c, ex + gx, ey + gy, 0.011); c.fill(); }
    c.fillStyle = '#fff'; circ(c, ex + gx - 0.009, ey + gy - 0.011, 0.007); c.fill(); circ(c, ex + gx + 0.008, ey + gy + 0.008, 0.0035); c.fill();
    if (A.lid > 0) { c.fillStyle = mixCol('#ffd9cc', '#d9d4d6', A.pale); c.fillRect(ex - 0.04, ey - 0.04, 0.08, 0.072 * A.lid); }
    c.restore();
    c.strokeStyle = '#2d1a33'; c.lineWidth = 0.007;
    const ly = ey - 0.036 + 0.072 * A.lid * 0.95;
    c.beginPath(); c.moveTo(ex - 0.032, ly + 0.006); c.quadraticCurveTo(ex, ly - 0.006, ex + 0.032, ly + 0.006); c.lineTo(ex + s * 0.042, ly - 0.004); c.stroke();
  }
  // брови
  c.strokeStyle = shade(G.cust.hairColor, 0.6); c.lineWidth = 0.007;
  const bIn = rage ? 0.012 : (f === 'sad' || f === 'cry') ? -0.012 : f === 'flat' ? 0.002 : -0.003;
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 0.018, -0.662 + bIn); c.lineTo(s * 0.065, -0.668 - bIn * 0.6); c.stroke(); }
  // рот
  const my = -0.557;
  c.lineCap = 'round';
  if (f === 'smile' || f === 'love') { c.strokeStyle = '#b44a5e'; c.lineWidth = 0.007; c.beginPath(); c.arc(0, my - 0.012, 0.018, 0.35, Math.PI - 0.35); c.stroke(); }
  else if (f === 'bigsmile' || f === 'laugh') {
    c.fillStyle = '#7a2036'; c.beginPath(); c.moveTo(-0.024, my - 0.006); c.quadraticCurveTo(0, my + 0.035, 0.024, my - 0.006); c.closePath(); c.fill();
    c.fillStyle = '#ff8fa3'; ell(c, 0, my + 0.009, 0.01, 0.006); c.fill();
  } else if (f === 'flat') { c.strokeStyle = '#b44a5e'; c.lineWidth = 0.006; c.beginPath(); c.moveTo(-0.012, my); c.lineTo(0.014, my - 0.002); c.stroke(); }
  else if (f === 'sad') { c.strokeStyle = '#b44a5e'; c.lineWidth = 0.007; c.beginPath(); c.arc(0, my + 0.018, 0.016, Math.PI + 0.5, -0.5); c.stroke(); }
  else if (f === 'cry') {
    c.strokeStyle = '#b44a5e'; c.lineWidth = 0.007; c.beginPath(); c.moveTo(-0.02, my + 0.004);
    for (let i = 1; i <= 4; i++) c.lineTo(-0.02 + i * 0.01, my + (i % 2 ? -0.004 : 0.004)); c.stroke();
    c.fillStyle = 'rgba(140,210,255,.8)'; c.fillRect(-0.05, -0.6, 0.008, 0.05 + Math.sin(t * 5) * 0.01); c.fillRect(0.042, -0.6, 0.008, 0.05 + Math.cos(t * 5) * 0.01);
  } else if (f === 'o') { c.fillStyle = '#7a2036'; ell(c, 0, my, 0.009, 0.012); c.fill(); }
  else if (f === 'munch') {
    c.fillStyle = mixCol('#ffd9cc', '#ffc4b8', 0.5); ell(c, -0.055, -0.57, 0.03, 0.025); c.fill(); ell(c, 0.055, -0.57, 0.03, 0.025); c.fill();
    c.strokeStyle = '#b44a5e'; c.lineWidth = 0.006; c.beginPath(); c.moveTo(-0.015, my); c.quadraticCurveTo(-0.007, my + 0.008, 0, my); c.quadraticCurveTo(0.007, my + 0.008, 0.015, my); c.stroke();
  } else if (f === 'chomp' || f === 'rage') {
    const oh = f === 'chomp' ? 0.034 : 0.022;
    c.fillStyle = '#3a0b18'; ell(c, 0, my + 0.006, 0.03, oh); c.fill();
    c.fillStyle = '#fff';
    for (let i = -3; i <= 3; i++) {
      c.beginPath(); c.moveTo(i * 0.008 - 0.004, my + 0.006 - oh * 0.8); c.lineTo(i * 0.008 + 0.004, my + 0.006 - oh * 0.8); c.lineTo(i * 0.008, my + 0.006 - oh * 0.8 + 0.011); c.fill();
      c.beginPath(); c.moveTo(i * 0.008 - 0.004, my + 0.006 + oh * 0.8); c.lineTo(i * 0.008 + 0.004, my + 0.006 + oh * 0.8); c.lineTo(i * 0.008, my + 0.006 + oh * 0.8 - 0.01); c.fill();
    }
  } else if (f === 'gross') {
    c.strokeStyle = '#b44a5e'; c.lineWidth = 0.006; c.beginPath(); c.moveTo(-0.018, my); c.lineTo(0.018, my); c.stroke();
    c.fillStyle = '#ff7f96'; ell(c, 0.004, my + 0.012, 0.009, 0.013); c.fill();
  }
}
function hairBack(c, style, col, colD, t, A) {
  const s1 = Math.sin(t * 1.4) * 0.03, s2 = Math.sin(t * 1.1 + 1) * 0.045;
  c.fillStyle = col;
  if (style === 'long') {
    c.beginPath(); c.moveTo(-0.1, -0.7);
    c.bezierCurveTo(-0.2, -0.6, -0.2 + s1, -0.4, -0.25 + s2, -0.1);
    c.quadraticCurveTo(-0.17 + s2, -0.15, -0.12 + s2, -0.08);
    c.quadraticCurveTo(-0.06 + s1, -0.17, 0 + s1, -0.1);
    c.quadraticCurveTo(0.06 + s1, -0.17, 0.12 + s2, -0.08);
    c.quadraticCurveTo(0.17 + s2, -0.15, 0.25 + s2, -0.1);
    c.bezierCurveTo(0.2 + s1, -0.4, 0.2, -0.6, 0.1, -0.7);
    c.quadraticCurveTo(0, -0.79, -0.1, -0.7); c.fill();
    c.strokeStyle = colD; c.lineWidth = 0.008;
    for (const o of [-0.12, -0.05, 0.05, 0.12]) { c.beginPath(); c.moveTo(o * 0.6, -0.66); c.quadraticCurveTo(o * 1.4 + s1, -0.4, o * 1.6 + s2, -0.16); c.stroke(); }
  } else if (style === 'bob') {
    c.beginPath(); c.moveTo(-0.11, -0.7);
    c.bezierCurveTo(-0.17, -0.64, -0.17 + s1 * 0.5, -0.54, -0.14 + s1 * 0.5, -0.5);
    c.quadraticCurveTo(0, -0.47, 0.14 + s1 * 0.5, -0.5);
    c.bezierCurveTo(0.17 + s1 * 0.5, -0.54, 0.17, -0.64, 0.11, -0.7);
    c.quadraticCurveTo(0, -0.8, -0.11, -0.7); c.fill();
  } else if (style === 'twin') {
    c.beginPath(); c.arc(0, -0.63, 0.118, Math.PI, 0); c.fill();
    for (const s of [-1, 1]) {
      const sw = s > 0 ? s2 : s1;
      c.beginPath(); c.moveTo(s * 0.1, -0.71);
      c.bezierCurveTo(s * 0.26, -0.68 + sw, s * 0.25 + sw, -0.45, s * 0.2 + sw, -0.18);
      c.bezierCurveTo(s * 0.17 + sw, -0.35, s * 0.14, -0.5, s * 0.1, -0.6); c.closePath(); c.fill();
      c.fillStyle = '#ff6fa8'; circ(c, s * 0.115, -0.69, 0.016); c.fill(); c.fillStyle = col;
    }
  } else if (style === 'bun') {
    c.beginPath(); c.arc(0, -0.63, 0.116, Math.PI, 0); c.fill();
    circ(c, 0, -0.775, 0.065); c.fill();
    c.strokeStyle = colD; c.lineWidth = 0.008; c.beginPath(); c.arc(0, -0.775, 0.04, 0.5, 4); c.stroke();
    c.strokeStyle = col; c.lineWidth = 0.012; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 0.1, -0.64); c.quadraticCurveTo(s * 0.13 + s1, -0.55, s * 0.11 + s2 * 0.4, -0.5); c.stroke(); }
  }
}
function hairFront(c, style, col, colD, t) {
  c.fillStyle = col;
  c.beginPath(); c.moveTo(-0.108, -0.6);
  c.bezierCurveTo(-0.13, -0.7, -0.08, -0.752, 0, -0.748);
  c.bezierCurveTo(0.08, -0.752, 0.13, -0.7, 0.108, -0.6);
  c.quadraticCurveTo(0.094, -0.665, 0.072, -0.662);
  c.quadraticCurveTo(0.05, -0.692, 0.024, -0.668);
  c.quadraticCurveTo(0, -0.7, -0.026, -0.668);
  c.quadraticCurveTo(-0.05, -0.692, -0.072, -0.662);
  c.quadraticCurveTo(-0.094, -0.665, -0.108, -0.6); c.fill();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.006; c.beginPath(); c.arc(-0.02, -0.7, 0.05, -2.6, -1.8); c.stroke();
  if (style === 'long' || style === 'twin') {
    c.strokeStyle = col; c.lineWidth = 0.014;
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 0.1, -0.66); c.quadraticCurveTo(s * 0.118, -0.58, s * 0.108 + Math.sin(t * 2 + s) * 0.006, -0.5); c.stroke(); }
  }
}

// ============================ КОЛБА ============================
function drawTank(c) {
  const T = TANK, dx = CAM.x - T.x, dz = CAM.z - T.z, D = Math.hypot(dx, dz);
  const th = Math.atan2(dz, dx);
  const al = Math.acos(clamp(T.r / D, -1, 1));
  const arc = (r, h, A0, A1, n = 28) => {
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = A0 + (A1 - A0) * i / n; const p = proj(T.x + Math.cos(a) * r, h, T.z + Math.sin(a) * r); if (p) pts.push(p); }
    return pts;
  };
  const path = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath(); };
  const cp = proj(T.x, T.base, T.z); const kc = cp ? cp.k : FOCAL / Math.max(0.5, D);
  // пьедестал
  const pr = T.r + 0.14, alp = Math.acos(clamp(pr / D, -1, 1));
  const disc = arc(pr, T.base, 0, Math.PI * 2, 40);
  const pedT = arc(pr, T.base, th - alp, th + alp), pedB = arc(pr, 0, th + alp, th - alp);
  if (pedT.length > 2 && pedB.length > 2) {
    c.fillStyle = '#3d4b52'; path(pedT.concat(pedB)); c.fill();
    c.strokeStyle = '#ffcc33'; c.lineWidth = Math.max(1, 0.05 * kc); c.beginPath(); pedB.forEach((p, i) => i ? c.lineTo(p.x, p.y - 0.12 * p.k) : c.moveTo(p.x, p.y - 0.12 * p.k)); c.stroke();
  }
  if (disc.length > 40) { c.fillStyle = '#56666e'; path(disc); c.fill(); }
  // стекло + вода
  const gTop = arc(T.r, T.top, th - al, th + al), gBot = arc(T.r, T.base, th + al, th - al);
  const sil = gTop.concat(gBot);
  let merRect = null;
  if (sil.length > 3) {
    let minY = 1e9, maxY = -1e9; for (const p of sil) { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    const M = G.mer;
    const wg = c.createLinearGradient(0, minY, 0, maxY);
    const dark = M.rage ? 0.55 : 1;
    wg.addColorStop(0, `rgba(${90 * dark | 0},${200 * dark | 0},${230 * dark | 0},.82)`); wg.addColorStop(1, `rgba(${20 * dark | 0},${70 * dark | 0},${120 * dark | 0},.9)`);
    c.save(); path(sil); c.clip();
    c.fillStyle = wg; c.fillRect(0, minY - 10, W, maxY - minY + 20);
    // лучи
    c.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 4; i++) { const p = proj(T.x + Math.cos(th + (i - 1.5) * 0.4) * T.r * 0.5, T.top, T.z + Math.sin(th + (i - 1.5) * 0.4) * T.r * 0.5); if (!p) continue; const w = (0.2 + 0.1 * Math.sin(G.t + i)) * p.k; c.beginPath(); c.moveTo(p.x - w, minY); c.lineTo(p.x + w, minY); c.lineTo(p.x + w * 2.5 + Math.sin(G.t * 0.5 + i) * 30, maxY); c.lineTo(p.x - w * 0.5, maxY); c.fill(); }
    const rx = -CAM.s, rz = CAM.c, fx = CAM.c, fz = CAM.s;
    // пузыри
    for (const b of MA.bubbles) { const p = proj(T.x + Math.cos(b.a) * b.r, b.h, T.z + Math.sin(b.a) * b.r); if (!p) continue; c.strokeStyle = 'rgba(220,250,255,.6)'; c.lineWidth = 1; circ(c, p.x, p.y, b.s * p.k); c.stroke(); }
    // еда в колбе
    for (const f of MA.food) {
      const p = proj(T.x + rx * f.lat - fx * 0.3, f.h, T.z + rz * f.lat - fz * 0.3); if (!p) continue;
      drawThing(c, f.e, p.x, p.y, p.k, { kick: true, noIcons: true });
    }
    // русалка
    const A = merPose(); MA.lastPose = A.pose;
    const L = merHeight(), unit = L / 1.87;
    const headOff = 0.74 * unit, tailOff = (1.15 - A.curl * 0.45) * unit;
    const lo = T.base + tailOff + 0.05, hi = T.top - 0.1 - headOff;
    const wy = lo > hi ? hi : clamp(2.3 + MA.v, lo, hi);
    const wx = T.x + rx * MA.u * T.r * 0.55 - fx * MA.fwd, wz = T.z + rz * MA.u * T.r * 0.55 - fz * MA.fwd;
    const mp = proj(wx, wy, wz);
    if (mp) {
      MA.headX = mp.x; MA.headY = mp.y - 0.62 * unit * mp.k;
      drawMermaid(c, mp.x, mp.y, mp.k, A);
      merRect = { x: mp.x - 0.3 * unit * mp.k, y: mp.y - headOff * mp.k, w: 0.6 * unit * mp.k, h: (headOff + tailOff * 0.8) * mp.k, d: mp.d };
    }
    // поверхность воды
    const surf = arc(T.r, T.top - 0.22 + Math.sin(G.t * 2) * 0.02, 0, Math.PI * 2, 36);
    if (surf.length > 30) { c.fillStyle = 'rgba(200,250,255,.10)'; path(surf); c.fill(); c.strokeStyle = 'rgba(220,255,255,.45)'; c.lineWidth = 1.5; c.stroke(); }
    if (M.rage) { c.fillStyle = 'rgba(255,0,20,' + (0.08 + 0.08 * Math.sin(G.t * 10)) + ')'; c.fillRect(0, minY, W, maxY - minY); }
    c.restore();
    // блики на стекле
    for (const [o, w, a] of [[-0.55, 0.1, 0.22], [-0.4, 0.035, 0.3], [0.62, 0.05, 0.12]]) {
      const ang = th + o * al;
      const p1 = proj(T.x + Math.cos(ang) * T.r, T.top - 0.1, T.z + Math.sin(ang) * T.r), p2 = proj(T.x + Math.cos(ang) * T.r, T.base + 0.1, T.z + Math.sin(ang) * T.r);
      if (p1 && p2) { c.strokeStyle = 'rgba(255,255,255,' + a + ')'; c.lineWidth = w * p1.k; c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke(); }
    }
    // трещины
    c.lineCap = 'round';
    for (const cr of M.cracks) {
      let da = Math.atan2(Math.sin(cr.a - th), Math.cos(cr.a - th)); if (Math.abs(da) > al * 0.95) continue;
      const p = proj(T.x + Math.cos(cr.a) * T.r, cr.h, T.z + Math.sin(cr.a) * T.r); if (!p) continue;
      const sq = Math.cos(da);
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = Math.max(1, 0.012 * p.k);
      for (let j = 0; j < 7; j++) {
        let x = p.x, y = p.y, a = srand(cr.seed + j) * Math.PI * 2;
        c.beginPath(); c.moveTo(x, y);
        for (let s = 0; s < 4; s++) { const l = cr.size * (0.2 + srand(cr.seed * 3 + j * 7 + s) * 0.3) * p.k; a += (srand(cr.seed + j * 13 + s) - 0.5) * 0.9; x += Math.cos(a) * l * sq; y += Math.sin(a) * l; c.lineTo(x, y); }
        c.stroke();
      }
      c.fillStyle = 'rgba(255,255,255,.5)'; circ(c, p.x, p.y, 0.03 * p.k); c.fill();
    }
    // наклейки на стекле
    for (const s of G.stickers) {
      if (s.surf !== 'glass') continue;
      const da = Math.atan2(Math.sin(s.a - th), Math.cos(s.a - th)); if (Math.abs(da) > al * 0.95) continue;
      const p = proj(T.x + Math.cos(s.a) * (T.r + 0.01), s.h, T.z + Math.sin(s.a) * (T.r + 0.01)); if (!p) continue;
      c.save(); c.translate(p.x, p.y); c.scale(Math.cos(da), 1); drawSticker(c, s, 0.2 * p.k); c.restore();
    }
  }
  // крышка и трубы
  const lidT = arc(T.r + 0.08, T.top + 0.3, th - al, th + al), lidB = arc(T.r + 0.08, T.top, th + al, th - al);
  if (lidT.length > 2 && lidB.length > 2) { c.fillStyle = '#56666e'; path(lidT.concat(lidB)); c.fill(); c.strokeStyle = '#7d8f97'; c.lineWidth = 2; c.stroke(); }
  const rimT = arc(T.r + 0.05, T.base + 0.12, th - al, th + al), rimB = arc(T.r + 0.05, T.base, th + al, th - al);
  if (rimT.length > 2 && rimB.length > 2) { c.fillStyle = '#56666e'; path(rimT.concat(rimB)); c.fill(); }
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + 0.4, x = T.x + Math.cos(a) * 0.8, z = T.z + Math.sin(a) * 0.8;
    const p1 = proj(x, T.top + 0.3, z), p2 = proj(x, CEIL, z);
    if (p1 && p2) { c.strokeStyle = '#4a585f'; c.lineWidth = 0.22 * p1.k; c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke(); }
  }
  G._tank = { sil, glassDist: D - T.r, merRect, inSil: sil.length > 3 && pointInPoly(W / 2, H / 2, sil) };
}
function segDist(px, py, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1;
  const t = clamp(((px - a.x) * vx + (py - a.y) * vy) / l2, 0, 1);
  return Math.hypot(px - a.x - vx * t, py - a.y - vy * t);
}
function pointInPoly(x, y, pts) {
  let ins = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) ins = !ins;
  }
  return ins;
}
function drawSticker(c, s, size) {
  c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.2)'; c.lineWidth = 1;
  if (s.kind === 'heart') { heart(c, 0, 0, size * 0.62); c.fill(); c.fillStyle = s.col; heart(c, 0, 0, size * 0.5); c.fill(); }
  else if (s.kind === 'flower') { flowerShape(c, 0, 0, size * 0.45, '#fff'); flowerShape(c, 0, 0, size * 0.36, s.col); }
  else if (s.kind === 'fish') { c.fillStyle = s.col; ell(c, 0, 0, size * 0.5, size * 0.3); c.fill(); c.beginPath(); c.moveTo(-size * 0.4, 0); c.lineTo(-size * 0.7, -size * 0.25); c.lineTo(-size * 0.7, size * 0.25); c.fill(); c.fillStyle = '#fff'; circ(c, size * 0.2, -size * 0.05, size * 0.09); c.fill(); }
  else { star(c, 0, 0, size * 0.62); c.fill(); c.fillStyle = s.col; star(c, 0, 0, size * 0.5); c.fill(); }
}
