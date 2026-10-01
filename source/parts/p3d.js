
// ============================ НАСТОЯЩЕЕ 3D: модели из Blender через Three.js ============================
// Каждый аппарат рендерится как 3D-модель с той же камерой, что и 2.5D-мир (тот же фокус и «сдвиг горизонта»),
// и вклеивается в кадр в своём порядке по глубине. Движущиеся части анимируются по состоянию игры.
const T3 = { ok: false, models: {}, inst: new Map(), box: null };
const MODEL_TYPES = { inc: 1, press: 1, term: 1, bin: 1, funnel: 1 };
function init3D() {
  if (typeof THREE === 'undefined' || !THREE.GLTFLoader || !window.MODELS) { console.warn('3D: Three.js или модели не загружены — используется 2D'); return; }
  try {
    const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1); r.setSize(W * RES, H * RES, false);
    r.outputEncoding = THREE.sRGBEncoding; r.setClearColor(0x000000, 0); r.autoClear = false;
    T3.r = r; T3.scene = new THREE.Scene();
    T3.cam = new THREE.PerspectiveCamera(60, W / H, 0.05, 80);
    T3.hemi = new THREE.HemisphereLight(0xe8f6ff, 0x26363b, 1.0); T3.scene.add(T3.hemi);
    T3.key = new THREE.DirectionalLight(0xffffff, 0.75); T3.scene.add(T3.key); T3.scene.add(T3.key.target);
    T3.ray = new THREE.Raycaster(); T3.center = new THREE.Vector2(0, 0);
    const loader = new THREE.GLTFLoader(); let left = Object.keys(window.MODELS).length;
    for (const [k, b64] of Object.entries(window.MODELS)) {
      const bin = atob(b64), buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      loader.parse(buf.buffer, '', g => { T3.models[k] = g.scene; if (--left === 0) { T3.ok = true; prewarm3D(); } }, err => console.warn('3D модель', k, err));
    }
  } catch (e) { console.warn('3D выключено:', e); T3.ok = false; }
}
// компилируем шейдеры заранее, чтобы не было фриза при первом появлении аппарата
function prewarm3D() {
  try {
    const tmp = Object.values(T3.models).map(m => { const c = m.clone(true); T3.scene.add(c); return c; });
    T3.cam.position.set(0, 1.6, 8); T3.cam.lookAt(0, 1, 0); T3.cam.updateMatrixWorld();
    T3.r.compile(T3.scene, T3.cam); T3.r.render(T3.scene, T3.cam);
    tmp.forEach(c => T3.scene.remove(c));
  } catch (e) { console.warn('prewarm', e); }
}
function clear3D() { if (!T3.scene) return; for (const o of T3.inst.values()) T3.scene.remove(o); T3.inst.clear(); }
function inst3D(e) {
  let w = T3.inst.get(e.id);
  if (w && w.userData.ent === e) return w;
  if (w) { T3.scene.remove(w); T3.inst.delete(e.id); }
  const src = T3.models[e.type]; if (!src) return null;
  const m = src.clone(true);
  m.traverse(n => { if (n.isMesh) n.material = n.material.clone(); });
  m.rotation.y = Math.PI / 2 - (e.face || 0);
  w = new THREE.Group(); w.add(m); w.position.set(e.x, 0, e.z); w.userData.ent = e;
  const P = {}, find = nm => { let r = null; m.traverse(n => { if (!r && n.name.replace(/\d+$/, '') === nm) r = n; }); return r; };
  for (const nm of ['gauge_marker', 'protect_line', 'button_cap', 'switch_lever', 'lamp', 'plate', 'rod', 'lever_arm', 'eggs', 'body', 'base']) { const o = find(nm); if (o) { P[nm] = o; o.userData.base = o.position.clone(); } }
  if (e.type === 'funnel') { const sg = find('sign'); if (sg) sg.visible = false; } // надпись теперь — билборд над воронкой
  if (P.eggs) P.eggList = P.eggs.children.filter(c => c.name.startsWith('egg')).map(c => ({ o: c, s: c.scale.x }));
  if (e.type === 'press') {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true, alphaTest: 0.05 }));
    sp.center.set(0.5, 0); sp.scale.set(1, 1, 1); sp.position.set(0, 0.36, 0); sp.visible = false;
    m.add(sp); P.slotSprite = sp; P.slotCv = cv; P.slotTex = tex;
  }
  if (e.type === 'funnel') {
    const dx = TANK.x - e.x, dz = TANK.z - e.z, dl = Math.hypot(dx, dz), len = Math.max(0.2, dl - TANK.r - 0.1);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, len, 16), new THREE.MeshStandardMaterial({ color: 0x5d6b72, metalness: 0.4, roughness: 0.45 }));
    pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / dl, 0, dz / dl));
    pipe.position.set(dx / dl * len / 2, 0.32, dz / dl * len / 2); w.add(pipe);
  }
  w.userData.parts = P;
  T3.scene.add(w);
  const b = new THREE.Box3().setFromObject(w).expandByScalar(0.12);
  e._corners = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) e._corners.push({ x, y, z });
  T3.inst.set(e.id, w);
  return w;
}
// 3D-надписи: текст не запечён в модели — он берётся из L10N и рисуется на плоскости поверх поверхности
const LABELS3D = {
  press: { k: 'label_press', pos: [0, 2.27, 0.357], w: 0.95, h: 0.2, col: '#eef6f7' },
  inc: { k: 'label_inc', pos: [0, 1.17, 0.402], w: 0.95, h: 0.13, col: '#2b3940' },
  term: { k: 'label_term', pos: [0, 1.12, 0.176], w: 0.62, h: 0.09, col: '#ffffff', stroke: '#063036', rx: -14 * Math.PI / 180 },
  bin: { k: 'label_bin', pos: [0, 0.58, 0.353], w: 0.74, h: 0.11, col: '#151515' },
  funnel: { k: 'label_funnel', pos: [0, 0.72, 0.222], w: 0.52, h: 0.2, col: '#ffd166' }
};
const LABEL_TEX = {};
function labelTex(key, col, aspect, stroke) {
  const id = key + '|' + LANG; if (LABEL_TEX[id]) return LABEL_TEX[id];
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = Math.max(16, Math.round(512 / aspect));
  const c = cv.getContext('2d'), text = tr(key); let fs = cv.height * 0.84;
  do { c.font = '800 ' + fs + 'px "Segoe UI", Arial, sans-serif'; fs -= 2; } while (c.measureText(text).width > cv.width * 0.94 && fs > 8);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (stroke) { c.lineJoin = 'round'; c.lineWidth = fs * 0.16; c.strokeStyle = stroke; c.strokeText(text, cv.width / 2, cv.height / 2 + 2); }
  c.fillStyle = col; c.fillText(text, cv.width / 2, cv.height / 2 + 2);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return (LABEL_TEX[id] = t);
}
function addLabel3D(m, type) {
  const L = LABELS3D[type]; if (!L) return;
  const mat = new THREE.MeshBasicMaterial({ map: labelTex(L.k, L.col, L.w / L.h, L.stroke), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(L.w, L.h), mat);
  mesh.position.set(L.pos[0], L.pos[1], L.pos[2]); if (L.rx) mesh.rotation.x = L.rx;
  mesh.name = 'label3d'; mesh.raycast = () => { }; m.add(mesh);
}
function setLamp(o, on, unlocked) {
  if (!o) return;
  const col = !unlocked ? 0x444444 : on ? 0x46ff7a : 0xff4a4a;
  o.material.color.setHex(col); o.material.emissive.setHex(unlocked ? col : 0x000000); o.material.emissiveIntensity = unlocked ? 1.2 : 0;
}
function flashCol(e) { const m = /(\d+),(\d+),(\d+)/.exec(e.flashCol || ''); return m ? new THREE.Color(m[1] / 255, m[2] / 255, m[3] / 255) : new THREE.Color(1, 0.2, 0.3); }
function update3D(e, w) {
  const P = w.userData.parts, u = mUp(e);
  if (e.type === 'inc') {
    if (P.gauge_marker) P.gauge_marker.position.y = P.gauge_marker.userData.base.y + 0.92 * e.prog;
    if (P.protect_line) P.protect_line.visible = !!u.protect;
    if (P.button_cap) { P.button_cap.position.z = P.button_cap.userData.base.z - (e.hold ? 0.035 : 0); P.button_cap.material.emissive.setHex(e.hold ? 0x661111 : 0x000000); }
    if (P.eggList) {
      const over = e.prog > 0.82;
      P.eggList.forEach((q, i) => {
        q.o.scale.setScalar(q.s * (0.45 + 0.75 * e.prog) * (1 + Math.sin(G.t * 3 + i) * 0.04));
        q.o.material.color.setHex(over ? 0x9b8f7a : 0xff9cc4);
      });
    }
    if (P.switch_lever) P.switch_lever.rotation.x = u.auto && e.auto ? -0.55 : 0.55;
    setLamp(P.lamp, e.auto, u.auto);
    if (P.body) { if (e.flash > 0) { P.body.material.emissive.copy(flashCol(e)); P.body.material.emissiveIntensity = e.flash * 0.6; } else P.body.material.emissiveIntensity = 0; }
  } else if (e.type === 'press') {
    const s = e.lever, bottom = 1.55 + (0.5 - 1.55) * s * s;
    if (P.plate) P.plate.position.y = bottom + 0.075;
    if (P.rod) P.rod.scale.y = Math.max(0.05, 2.06 - (bottom + 0.15));
    if (P.lever_arm) P.lever_arm.rotation.z = -(-1.05 + 2.0 * s);
    if (P.switch_lever) P.switch_lever.rotation.x = u.auto && e.auto ? -0.55 : 0.55;
    setLamp(P.lamp, e.auto, u.auto);
    if (P.base) { P.base.material.emissive.setHex(0xff2244); P.base.material.emissiveIntensity = e.flash > 0 ? e.flash * 0.7 : 0; }
    const r = e.slot ? byId(e.slot) : null;
    P.slotSprite.visible = !!r;
    P.fr = (P.fr || 0) + 1;
    if (r && (P.fr % 3 === 0 || P.lastSlot !== r.id)) {
      P.lastSlot = r.id;
      const sq = bottom < 0.98 ? clamp((bottom - 0.36) / 0.62, 0.12, 1) : 1, c2 = P.slotCv.getContext('2d');
      c2.setTransform(1, 0, 0, 1, 0, 0); c2.clearRect(0, 0, 256, 256);
      drawRyb(c2, 128, 254, 256, r, { squash: sq, kick: true, noIcons: true });
      P.slotTex.needsUpdate = true;
    }
  }
}
function sync3DCam(dimLights, rage) {
  if (!T3.ok) return;
  const c = T3.cam;
  c.fov = 2 * Math.atan((H / 2) / FOCAL) * 180 / Math.PI; c.aspect = W / H;
  c.position.set(CAM.x, CAM.eye, CAM.z); c.lookAt(CAM.x + CAM.c * CAM.pc, CAM.eye + CAM.ps, CAM.z + CAM.s * CAM.pc);
  c.updateProjectionMatrix(); c.updateMatrixWorld();
  T3.key.position.set(CAM.x - CAM.c * 1 + CAM.s * 2, CAM.eye + 3, CAM.z - CAM.s * 1 - CAM.c * 2);
  T3.key.target.position.set(CAM.x + CAM.c * 4, 0.8, CAM.z + CAM.s * 4); T3.key.target.updateMatrixWorld();
  T3.hemi.intensity = dimLights ? 0.35 : 1.0; T3.key.intensity = dimLights ? 0.2 : 0.75;
  T3.hemi.color.setHex(rage ? 0xff9a9a : 0xe8f6ff);
}
// Один WebGL-проход на кадр: все видимые аппараты рендерятся сразу, а в 2D-кадр
// каждый вклеивается своим прямоугольником в свою очередь по глубине (копия из GPU — одна на кадр).
function prep3D(items) {
  T3.frameOk = false;
  if (!T3.ok) return;
  for (const v of T3.inst.values()) v.visible = false;
  let any = false;
  for (const it of items) {
    const e = it.e; if (!e || !MODEL_TYPES[e.type]) continue;
    const w = inst3D(e); if (!w) continue;
    update3D(e, w); w.visible = true; any = true;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of e._corners) {
      const q = proj(p.x, p.y, p.z);
      if (!q) { x0 = 0; y0 = 0; x1 = W; y1 = H; break; }
      x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
    }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
    e._rect = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  if (!any) return;
  T3.r.setScissorTest(false); T3.r.setViewport(0, 0, W * RES, H * RES);
  T3.r.clear(); T3.r.render(T3.scene, T3.cam);
  T3.frameOk = true;
}
function draw3D(c, e) {
  if (!T3.frameOk || !MODEL_TYPES[e.type]) return false;
  const w = T3.inst.get(e.id); if (!w || !w.visible) return false;
  const r = e._rect; if (!r || r.w < 1 || r.h < 1) return true;
  const R = RES, sx = Math.floor(r.x * R), sy = Math.floor(r.y * R), sw = Math.min(W * R - sx, Math.ceil(r.w * R)), sh = Math.min(H * R - sy, Math.ceil(r.h * R));
  if (sw > 0 && sh > 0) c.drawImage(T3.r.domElement, sx, sy, sw, sh, sx / R, sy / R, sw / R, sh / R);
  return true;
}
// Летающая надпись-билборд над аппаратом: всегда смотрит на игрока, текст из L10N (под локализацию)
const LABEL_Y = { inc: 2.2, press: 2.72, term: 2.0, bin: 1.45, funnel: 1.85 };
const LABEL_KEY = { inc: 'label_inc', press: 'label_press', term: 'label_term', bin: 'label_bin', funnel: 'label_funnel' };
const LABEL_ACC = { inc: '#6ff0d9', press: '#ffcc33', term: '#6ff0d9', bin: '#ffcc33', funnel: '#ffd166' };
function label2D(c, e) {
  const d = hyp(e.x, e.z, CAM.x, CAM.z); if (d > 12) return;
  const p = proj(e.x, LABEL_Y[e.type] + Math.sin(G.t * 2 + e.id) * 0.03, e.z); if (!p) return;
  const text = tr(LABEL_KEY[e.type]) + (e.type === 'inc' || e.type === 'press' ? ' ' + e.n : '');
  const fs = Math.round(clamp(0.13 * p.k, 11, 30)), a = clamp((12 - d) / 3, 0, 1);
  c.globalAlpha = a; c.font = '800 ' + fs + 'px "Segoe UI",system-ui,sans-serif';
  const tw = c.measureText(text).width, pw = tw + fs * 1.1, ph = fs * 1.55;
  c.fillStyle = 'rgba(6,14,17,.75)'; rrect(c, p.x - pw / 2, p.y - ph / 2, pw, ph, ph / 2); c.fill();
  c.fillStyle = LABEL_ACC[e.type]; rrect(c, p.x - pw / 2 + ph * 0.3, p.y + ph / 2 - ph * 0.14, pw - ph * 0.6, ph * 0.08, ph * 0.04); c.fill();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, p.x, p.y - fs * 0.04);
  c.globalAlpha = 1;
}
// что под прицелом из 3D-аппаратов (луч из центра экрана)
function ray3D() {
  if (!T3.ok || !T3.inst.size) return null;
  const near = [];
  for (const v of T3.inst.values()) { const e = v.userData.ent; if (hyp(e.x, e.z, CAM.x, CAM.z) < REACH + 2.5) { v.visible = true; near.push(v); } }
  if (!near.length) return null;
  T3.ray.setFromCamera(T3.center, T3.cam);
  const hits = T3.ray.intersectObjects(near, true);
  for (const h of hits) {
    if (h.object.isSprite) continue;
    let n = h.object; while (n && !n.userData.ent) n = n.parent;
    if (n) return { e: n.userData.ent, d: h.distance, name: h.object.name.toLowerCase() };
  }
  return null;
}
function part3D(e, name) {
  if (name.includes('switch') || name.includes('lamp')) return 'switch';
  if (e.type === 'inc') return 'button';
  if (e.type === 'press') return (name.includes('slot') || name.includes('base') || name.includes('stain')) ? 'slot' : 'lever';
  return 'body';
}
