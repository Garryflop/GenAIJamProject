
// ============================ ВОРОНКА «КОРМ» ============================
function drawFunnel(c, x, y, k, m) {
  // труба от воронки к пьедесталу колбы (мировые координаты)
  const dx = TANK.x - m.x, dz = TANK.z - m.z, dl = Math.hypot(dx, dz) || 1;
  const ex = TANK.x - dx / dl * (TANK.r + 0.1), ez = TANK.z - dz / dl * (TANK.r + 0.1);
  const a = proj(m.x, 0.32, m.z), b = proj(ex, 0.32, ez);
  if (a && b && !T3.ok) {
    const kk = (a.k + b.k) / 2; c.lineCap = 'round';
    c.strokeStyle = '#4c5a61'; c.lineWidth = Math.max(3, 0.2 * kk); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    c.strokeStyle = '#7d8f97'; c.lineWidth = Math.max(1, 0.05 * kk); c.beginPath(); c.moveTo(a.x, a.y - 0.05 * a.k); c.lineTo(b.x, b.y - 0.05 * b.k); c.stroke();
  }
  const held = heldFood();
  if (held) {
    const pulse = 0.5 + 0.5 * Math.sin(G.t * 6);
    const g = c.createRadialGradient(x, y - 1.2 * k, 0.1 * k, x, y - 1.2 * k, 1.1 * k); g.addColorStop(0, 'rgba(255,210,80,' + (0.3 + 0.25 * pulse) + ')'); g.addColorStop(1, 'rgba(255,210,80,0)');
    c.fillStyle = g; circ(c, x, y - 1.2 * k, 1.1 * k); c.fill();
  }
  if (!draw3D(c, m)) drawFunnelProc(c, x, y, k);
  if (held) {
    const by = y - (1.78 + 0.07 * Math.sin(G.t * 5)) * k, s = Math.max(8, 0.14 * k);
    c.fillStyle = '#ffd166'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x - s, by - s); c.lineTo(x + s, by - s); c.lineTo(x, by + s * 0.4); c.closePath(); c.fill(); c.stroke();
  }
}
function drawFunnelProc(c, x, y, k) {
  const d = FOCAL / k, fl = clamp((CAM.eye - 1.45) / Math.max(0.5, d), -0.45, 0.45);
  c.save(); c.translate(x, y); c.scale(k, k);
  c.fillStyle = '#3b4449'; c.fillRect(-0.06, -0.95, 0.12, 0.95);
  const g2 = c.createLinearGradient(-0.46, 0, 0.46, 0); g2.addColorStop(0, '#c98f00'); g2.addColorStop(0.45, '#ffd84d'); g2.addColorStop(1, '#b87f00');
  c.fillStyle = g2; c.beginPath(); c.moveTo(-0.47, -1.45); c.lineTo(0.47, -1.45); c.lineTo(0.09, -0.95); c.lineTo(-0.09, -0.95); c.closePath(); c.fill();
  if (fl > 0) { c.fillStyle = '#2a1d05'; ell(c, 0, -1.45, 0.47, 0.47 * fl); c.fill(); }
  c.fillStyle = '#12232a'; rrect(c, -0.3, -0.84, 0.6, 0.28, 0.05); c.fill();
  c.restore();
  txt(c, 'КОРМ', x, y - 0.7 * k, Math.max(8, 0.15 * k), '#ffd166');
}
