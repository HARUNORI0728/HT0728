// Upright terrain objects for the illustrated map: trees, mountain peaks, buildings, tents, ruins, walls,
// palisades, bushes and the small decorations scattered on open ground. Every function draws at (x, y) =
// the object's foot, in map pixels; `k` is the scale (1 = designed for a 96px tile).
import { OUT, T, mix, shade, type C2D } from './common';

type Pt = [number, number];
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

export function shadowBlob(c: C2D, x: number, y: number, rx: number, ry: number, a = 0.28) {
  c.fillStyle = `rgba(25,35,20,${a})`; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, 7); c.fill();
}

// ---------- vegetation ----------
export function tree(c: C2D, x: number, y: number, s: number, R: () => number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(10,40,20,.32)'; c.beginPath(); c.ellipse(5, 3, 22, 8, 0, 0, 7); c.fill();
  c.fillStyle = '#6b4426'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.roundRect(-4, -14, 8, 17, 2); c.fill(); c.stroke();
  const hue = R();
  const pal = hue < 0.33 ? ['#2f7a3c', '#2a6e38', '#3c9148', '#7fd070'] : hue < 0.66 ? ['#357f3a', '#2c7036', '#47984a', '#8ed874'] : ['#2b7341', '#26683b', '#3a8a4c', '#78c878'];
  for (const [dx, dy, r, col] of [[0, -28, 22, pal[0]], [-12, -22, 15, pal[1]], [12, -22, 15, pal[1]], [0, -38, 15, pal[2]]] as [number, number, number, string][]) {
    const g = c.createRadialGradient(dx - r * 0.35, dy - r * 0.4, 1, dx, dy, r);
    g.addColorStop(0, pal[3]); g.addColorStop(0.45, col); g.addColorStop(1, '#1c5230');
    c.fillStyle = g; c.beginPath(); c.arc(dx, dy, r, 0, 7); c.fill(); c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.ellipse(-6, -44, 6, 3.5, -0.5, 0, 7); c.fill();
  c.restore();
}
export function pine(c: C2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(10,40,20,.32)'; c.beginPath(); c.ellipse(4, 3, 18, 7, 0, 0, 7); c.fill();
  c.fillStyle = '#6b4426'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.roundRect(-3.5, -12, 7, 15, 2); c.fill(); c.stroke();
  for (const [w, top, bot] of [[20, -34, -8], [16, -48, -24], [11, -60, -38]]) {
    const g = c.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, '#5fb35e'); g.addColorStop(0.5, '#2f7d3f'); g.addColorStop(1, '#1d5531');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, top); c.lineTo(w, bot); c.quadraticCurveTo(0, bot + 5, -w, bot); c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}
/** A low round shrub (茂み and forest undergrowth). `berry` adds red berries, `dry` makes it olive. */
export function shrub(c: C2D, x: number, y: number, s: number, R: () => number, opt: { berry?: boolean; dry?: boolean; line?: boolean } = {}) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(15,45,20,.3)'; c.beginPath(); c.ellipse(3, 1, 17, 5.5, 0, 0, 7); c.fill();
  const base = opt.dry ? ['#7d9a45', '#a9c063', '#55702e'] : ['#3f8f45', '#7cc866', '#245f30'];
  const blobs: [number, number, number][] = [[-8, -7, 9], [8, -7, 9], [0, -12, 11]];
  if (R() < 0.5) blobs.push([-2 + R() * 4, -5, 8]);
  c.strokeStyle = OUT; c.lineWidth = opt.line === false ? 0 : 1.8;
  for (const [dx, dy, r] of blobs) {
    const g = c.createRadialGradient(dx - r * 0.4, dy - r * 0.5, 1, dx, dy, r);
    g.addColorStop(0, base[1]); g.addColorStop(0.55, base[0]); g.addColorStop(1, base[2]);
    c.fillStyle = g; c.beginPath(); c.arc(dx, dy, r, 0, 7); c.fill(); if (opt.line !== false) c.stroke();
  }
  // leaf ticks
  c.strokeStyle = 'rgba(200,255,170,.35)'; c.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) { const a = R() * 6.28, r = 3 + R() * 6; c.beginPath(); c.arc(Math.cos(a) * r, -9 + Math.sin(a) * r * 0.6, 2.4, 3.6, 5.6); c.stroke(); }
  if (opt.berry) {
    for (let i = 0; i < 5; i++) { c.fillStyle = i % 2 ? '#e0484a' : '#f2f0f8'; c.beginPath(); c.arc(-10 + R() * 20, -14 + R() * 10, 1.7, 0, 7); c.fill(); }
  }
  c.restore();
}
/** A clump of tall grass blades. */
export function tuft(c: C2D, x: number, y: number, s: number, R: () => number, col = '#3f8a3e', hi = '#9ad67a') {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineCap = 'round';
  const n = 5 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const bx = (i - n / 2) * 2.2 + (R() - 0.5) * 1.5, h = 7 + R() * 7, lean = (bx * 0.5 + (R() - 0.5) * 4);
    c.strokeStyle = i % 2 ? col : hi; c.lineWidth = 1.7;
    c.beginPath(); c.moveTo(bx, 0); c.quadraticCurveTo(bx + lean * 0.3, -h * 0.6, bx + lean, -h); c.stroke();
  }
  c.restore();
}
export function reeds(c: C2D, x: number, y: number, s: number, R: () => number) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const bx = (i - 3) * 2.6 + (R() - 0.5) * 2, h = 12 + R() * 9, lean = (R() - 0.5) * 6;
    c.strokeStyle = i % 2 ? '#4f7f3a' : '#7da64e'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(bx, 0); c.quadraticCurveTo(bx, -h * 0.6, bx + lean, -h); c.stroke();
    if (i % 2 === 0) { c.fillStyle = '#7a4e2c'; c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.ellipse(bx + lean * 0.85, -h + 2, 1.8, 4, lean * 0.04, 0, 7); c.fill(); c.stroke(); }
  }
  c.restore();
}
export function flowers(c: C2D, x: number, y: number, s: number, R: () => number) {
  const cols = [['#fff6c8', '#f4c542'], ['#ffd0e0', '#e5708f'], ['#e6f0ff', '#7da0e0'], ['#fff', '#f2d64b']][Math.floor(R() * 4)];
  c.save(); c.translate(x, y); c.scale(s, s);
  for (let i = 0; i < 6; i++) {
    const px = (R() - 0.5) * 22, py = (R() - 0.5) * 12;
    c.strokeStyle = '#3f8a3e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(px, py + 4); c.lineTo(px, py); c.stroke();
    c.fillStyle = cols[0]; for (let p = 0; p < 5; p++) { const a = p * 1.256; c.beginPath(); c.arc(px + Math.cos(a) * 1.9, py + Math.sin(a) * 1.9, 1.5, 0, 7); c.fill(); }
    c.fillStyle = cols[1]; c.beginPath(); c.arc(px, py, 1.1, 0, 7); c.fill();
  }
  c.restore();
}

// ---------- rocks & wood ----------
export function rock(c: C2D, x: number, y: number, s: number, R?: () => number, tone = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(2, 2, 10, 3.5, 0, 0, 7); c.fill();
  const j = () => (R ? (R() - 0.5) * 3 : 0);
  const g = c.createLinearGradient(-8, -8, 8, 4); g.addColorStop(0, shade('#c9bba6', tone)); g.addColorStop(1, shade('#7d6e60', tone));
  c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(-9 + j(), 1); c.lineTo(-6 + j(), -7 + j()); c.lineTo(1 + j(), -10 + j()); c.lineTo(8 + j(), -5 + j()); c.lineTo(9 + j(), 1); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-5, -6); c.lineTo(0, -8.5); c.stroke();
  c.restore();
}
export function stump(c: C2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(2, 1, 11, 4, 0, 0, 7); c.fill();
  c.fillStyle = '#6b4426'; c.strokeStyle = OUT; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(-8, 0); c.lineTo(-7, -8); c.lineTo(7, -8); c.lineTo(8, 0); c.quadraticCurveTo(0, 3, -8, 0); c.fill(); c.stroke();
  c.fillStyle = '#d9b27a'; c.beginPath(); c.ellipse(0, -8, 7, 3, 0, 0, 7); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(120,80,40,.7)'; c.lineWidth = 1; c.beginPath(); c.ellipse(0, -8, 3.5, 1.4, 0, 0, 7); c.stroke();
  c.restore();
}
export function log(c: C2D, x: number, y: number, s: number, flip: boolean) {
  c.save(); c.translate(x, y); c.scale(flip ? -s : s, s); c.rotate(-0.12);
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(1, 2, 20, 4, 0, 0, 7); c.fill();
  c.fillStyle = '#7a4e2c'; c.strokeStyle = OUT; c.lineWidth = 1.6;
  c.beginPath(); c.roundRect(-18, -8, 34, 9, 4); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(40,25,10,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-12, -5); c.lineTo(6, -5); c.moveTo(-8, -2); c.lineTo(10, -2); c.stroke();
  c.fillStyle = '#d9b27a'; c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath(); c.ellipse(16, -3.5, 2.8, 4.6, 0, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#3f8f45'; c.beginPath(); c.arc(-6, -8, 2.4, 0, 7); c.arc(-2, -8.5, 2, 0, 7); c.fill();
  c.restore();
}
export function crate(c: C2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(2, 1, 11, 3.5, 0, 0, 7); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 1.6;
  c.fillStyle = '#c49158'; c.beginPath(); c.rect(-8, -13, 16, 13); c.fill(); c.stroke();
  c.fillStyle = '#dcae72'; c.beginPath(); c.moveTo(-8, -13); c.lineTo(-4, -17); c.lineTo(12, -17); c.lineTo(8, -13); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#9a6a3a'; c.beginPath(); c.moveTo(8, -13); c.lineTo(12, -17); c.lineTo(12, -4); c.lineTo(8, 0); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(70,40,15,.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-8, -13); c.lineTo(8, 0); c.moveTo(8, -13); c.lineTo(-8, 0); c.stroke();
  c.restore();
}
export function barrel(c: C2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(2, 1, 9, 3, 0, 0, 7); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 1.6;
  const g = c.createLinearGradient(-7, 0, 7, 0); g.addColorStop(0, '#d39a5c'); g.addColorStop(1, '#7d4f2a');
  c.fillStyle = g; c.beginPath(); c.moveTo(-6, 0); c.quadraticCurveTo(-8.5, -8, -6, -16); c.lineTo(6, -16); c.quadraticCurveTo(8.5, -8, 6, 0); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = '#4a4048'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-7.4, -4); c.lineTo(7.4, -4); c.moveTo(-7.4, -12); c.lineTo(7.4, -12); c.stroke();
  c.fillStyle = '#b07a48'; c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath(); c.ellipse(0, -16, 6, 2.2, 0, 0, 7); c.fill(); c.stroke();
  c.restore();
}
export function sacks(c: C2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(2, 1, 13, 3.5, 0, 0, 7); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 1.5;
  for (const [dx, dy, col] of [[-5, 0, '#d8c49a'], [5, 0, '#cbb488'], [0, -6, '#e4d2aa']] as [number, number, string][]) {
    c.fillStyle = col; c.beginPath(); c.ellipse(dx, dy - 4, 6, 5, 0, 0, 7); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(dx - 1.5, dy - 9); c.lineTo(dx + 1.5, dy - 9.5); c.stroke();
  }
  c.restore();
}
export function campfire(c: C2D, x: number, y: number, s: number, lit: boolean) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(60,45,35,.45)'; c.beginPath(); c.ellipse(0, -2, 12, 5, 0, 0, 7); c.fill();
  for (let i = 0; i < 7; i++) { const a = i * 0.9; rockMini(c, Math.cos(a) * 11, -2 + Math.sin(a) * 4.6); }
  c.strokeStyle = OUT; c.lineWidth = 1.3;
  c.fillStyle = '#5a3820'; c.beginPath(); c.save(); c.translate(0, -3); c.rotate(0.5); c.roundRect(-8, -1.6, 16, 3.2, 1.5); c.fill(); c.stroke(); c.restore();
  c.beginPath(); c.save(); c.translate(0, -3); c.rotate(-0.5); c.roundRect(-8, -1.6, 16, 3.2, 1.5); c.fill(); c.stroke(); c.restore();
  if (lit) {
    c.fillStyle = '#f39a2b'; c.beginPath(); c.moveTo(-5, -3); c.quadraticCurveTo(-5, -12, 0, -17); c.quadraticCurveTo(5, -12, 5, -3); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#ffe07a'; c.beginPath(); c.moveTo(-2.5, -3); c.quadraticCurveTo(-2.5, -9, 0, -11); c.quadraticCurveTo(2.5, -9, 2.5, -3); c.closePath(); c.fill();
  } else {
    c.fillStyle = 'rgba(40,35,35,.6)'; c.beginPath(); c.ellipse(0, -3, 5, 2, 0, 0, 7); c.fill();
  }
  c.restore();
}
function rockMini(c: C2D, x: number, y: number) {
  c.fillStyle = '#9a8f84'; c.strokeStyle = OUT; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y, 2.6, 2, 0, 0, 7); c.fill(); c.stroke();
}
export function cart(c: C2D, x: number, y: number, s: number, broken: boolean, flip: boolean) {
  c.save(); c.translate(x, y); c.scale(flip ? -s : s, s);
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(2, 1, 22, 5, 0, 0, 7); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 1.6;
  if (broken) c.rotate(0.12);
  // shafts
  c.strokeStyle = '#6b4426'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(10, -7); c.lineTo(28, broken ? 0 : -4); c.moveTo(10, -11); c.lineTo(28, broken ? -2 : -8); c.stroke();
  c.strokeStyle = OUT; c.lineWidth = 1.6;
  c.fillStyle = '#a8743f'; c.beginPath(); c.rect(-16, -18, 28, 9); c.fill(); c.stroke();
  c.fillStyle = '#c48b55'; c.beginPath(); c.moveTo(-16, -18); c.lineTo(-12, -22); c.lineTo(16, -22); c.lineTo(12, -18); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(60,35,15,.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-9, -18); c.lineTo(-9, -9); c.moveTo(-2, -18); c.lineTo(-2, -9); c.moveTo(5, -18); c.lineTo(5, -9); c.stroke();
  // load
  if (!broken) { c.fillStyle = '#d8c49a'; c.strokeStyle = OUT; c.lineWidth = 1.4; c.beginPath(); c.ellipse(-6, -23, 6, 4, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(3, -23, 5, 3.6, 0, 0, 7); c.fill(); c.stroke(); }
  // wheel
  c.strokeStyle = OUT; c.lineWidth = 1.6; c.fillStyle = '#7a4e2c';
  c.beginPath(); c.arc(-4, -6, 6.5, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#c49158'; c.beginPath(); c.arc(-4, -6, 2, 0, 7); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-10, -6); c.lineTo(2, -6); c.moveTo(-4, -12); c.lineTo(-4, 0); c.stroke();
  if (broken) { c.fillStyle = '#7a4e2c'; c.beginPath(); c.ellipse(12, 0, 7, 2.6, 0.2, 0, 7); c.fill(); c.stroke(); }
  c.restore();
}
export function scarecrow(c: C2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(2, 1, 8, 2.5, 0, 0, 7); c.fill();
  c.strokeStyle = OUT; c.lineWidth = 1.5; c.fillStyle = '#6b4426';
  c.beginPath(); c.rect(-1.5, -30, 3, 30); c.fill(); c.stroke();
  c.beginPath(); c.rect(-12, -24, 24, 3); c.fill(); c.stroke();
  c.fillStyle = '#9a5a4a'; c.beginPath(); c.moveTo(-8, -24); c.lineTo(8, -24); c.lineTo(6, -12); c.lineTo(-6, -12); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#e8d29a'; c.beginPath(); c.arc(0, -29, 4.5, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#8a6a3a'; c.beginPath(); c.ellipse(0, -32, 8, 2, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.ellipse(0, -34, 4, 3, 0, Math.PI, 0); c.fill(); c.stroke();
  c.restore();
}

// ---------- mountains ----------
/** twin = a second, lower summit to the east joined by a saddle (broad massif peaks). */
export interface Peak { x: number; y: number; w: number; h: number; snow: boolean; tone: number; far: number; crag?: boolean; twin?: boolean; seed: number }
/** A ridge polyline from a to b, bulging outward with jagged shoulders. */
function ridge(a: Pt, b: Pt, n: number, bulge: number, R: () => number): Pt[] {
  const pts: Pt[] = [a];
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  for (let i = 1; i < n; i++) {
    const t = i / n + (R() - 0.5) * 0.08, p = lerp(a, b, t);
    const off = (Math.sin(t * Math.PI) * bulge + (R() - 0.5) * bulge * 0.9);
    pts.push([p[0] + nx * off, p[1] + ny * off]);
  }
  pts.push(b);
  return pts;
}
/** Point on a polyline where y crosses `yy` (searching from the first point). */
function crossY(pl: Pt[], yy: number): { i: number; p: Pt } | null {
  for (let i = 0; i < pl.length - 1; i++) {
    const a = pl[i], b = pl[i + 1];
    if ((a[1] - yy) * (b[1] - yy) <= 0 && a[1] !== b[1]) return { i, p: lerp(a, b, (yy - a[1]) / (b[1] - a[1])) };
  }
  return null;
}
/**
 * One mountain peak: a lit west face and a shadowed east face split by a zigzag ridge, gullies, strata,
 * a snow cap with a ragged lower edge, and dark ground at the foot. `far` (0..1) tints distant peaks bluish.
 */
export function peak(c: C2D, p: Peak, R: () => number) {
  const { x, y, w, h } = p;
  const S: Pt = [x + (R() - 0.5) * w * 0.3, y - h];
  const L: Pt = [x - w, y], Rr: Pt = [x + w, y];
  const crag = !!p.crag;
  if (p.twin) S[0] = x - w * (0.2 + R() * 0.12);
  const left = ridge(L, S, 5, -w * (crag ? 0.1 : 0.26), R);    // bulges up-left (rounded shoulders)
  let right = ridge(S, Rr, 5, -w * (crag ? 0.08 : 0.2), R);
  if (p.twin) {
    const S2: Pt = [x + w * (0.25 + R() * 0.12), y - h * (0.72 + R() * 0.12)], sad: Pt = [(S[0] + S2[0]) / 2 + (R() - 0.5) * w * 0.08, y - h * (0.58 + R() * 0.06)];
    right = [S, lerp(S, sad, 0.5).map((v, i) => v + (i ? -h * 0.03 : 0)) as Pt, sad, lerp(sad, S2, 0.55).map((v, i) => v + (i ? -h * 0.04 : 0)) as Pt, ...ridge(S2, Rr, 3, -w * 0.1, R)];
  }
  // the dividing ridge from the summit down to the foot, a little right of centre
  const foot: Pt = [x + w * (0.18 + R() * 0.16), y];
  const mid: Pt[] = [S];
  for (let i = 1; i < 4; i++) { const t = i / 4; const q = lerp(S, foot, t); mid.push([q[0] + (i % 2 ? -1 : 1) * w * 0.06, q[1]]); }
  mid.push(foot);
  const outline = [...left, ...right.slice(1)];

  const tint = (col: string) => mix(shade(col, p.tone), '#aab4c8', p.far * 0.28);
  // body (lit face)
  const lg = c.createLinearGradient(x - w, y - h, x + w * 0.2, y);
  lg.addColorStop(0, tint(crag ? '#cfc6b8' : '#d6c2a2')); lg.addColorStop(0.6, tint(crag ? '#a89f94' : '#ad967a')); lg.addColorStop(1, tint(crag ? '#867d74' : '#8a7562'));
  c.beginPath(); c.moveTo(...outline[0]); for (const q of outline) c.lineTo(...q); c.closePath();
  c.fillStyle = lg; c.fill();
  // shadow face
  const sg = c.createLinearGradient(x, y - h, x + w, y);
  sg.addColorStop(0, tint(crag ? '#7a7270' : '#7d6a5e')); sg.addColorStop(1, tint(crag ? '#5a5458' : '#594a46'));
  c.beginPath(); c.moveTo(...S); for (const q of right) c.lineTo(...q); for (let i = mid.length - 1; i >= 0; i--) c.lineTo(...mid[i]); c.closePath();
  c.fillStyle = sg; c.fill();
  // clip to the silhouette for texture
  c.save();
  c.beginPath(); c.moveTo(...outline[0]); for (const q of outline) c.lineTo(...q); c.closePath(); c.clip();
  // gullies on the lit face: dark creases running down from the ridge
  c.lineCap = 'round';
  for (let i = 0; i < (crag ? 5 : 4); i++) {
    const t = 0.25 + R() * 0.6, st = lerp(left[0], left[left.length - 1], 1 - t * 0.85), q = crossY(left, st[1]);
    const sx = (q ? q.p[0] : st[0]) + w * (0.12 + R() * 0.15), sy = st[1] + h * 0.04;
    const ex = sx + w * (0.05 + R() * 0.15), ey = Math.min(y, sy + h * (0.25 + R() * 0.25));
    c.strokeStyle = tint('#6e5c50') + ''; c.globalAlpha = 0.55; c.lineWidth = Math.max(1.2, w * 0.03);
    c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(sx - w * 0.04, (sy + ey) / 2, ex, ey); c.stroke();
    c.strokeStyle = 'rgba(255,245,225,.6)'; c.globalAlpha = 0.6; c.lineWidth = Math.max(1, w * 0.02);
    c.beginPath(); c.moveTo(sx - w * 0.03, sy + h * 0.02); c.quadraticCurveTo(sx - w * 0.07, (sy + ey) / 2, ex - w * 0.04, ey); c.stroke();
    c.globalAlpha = 1;
  }
  // gullies on the shadow face
  for (let i = 0; i < 3; i++) {
    const q = right[1 + Math.floor(R() * (right.length - 2))];
    c.strokeStyle = 'rgba(40,30,35,.4)'; c.lineWidth = Math.max(1.2, w * 0.03);
    c.beginPath(); c.moveTo(q[0], q[1]); c.quadraticCurveTo(q[0] - w * 0.12, q[1] + h * 0.15, q[0] - w * 0.08 - R() * w * 0.1, Math.min(y, q[1] + h * (0.3 + R() * 0.2))); c.stroke();
  }
  // strata ticks
  c.strokeStyle = 'rgba(70,55,45,.35)'; c.lineWidth = Math.max(1, w * 0.022);
  for (let i = 0; i < 4; i++) { const sx = x - w * 0.7 + R() * w * 1.4, sy = y - h * (0.1 + R() * 0.4); c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + w * 0.16, sy + h * 0.03); c.stroke(); }
  // snow cap
  if (p.snow) {
    const sl = y - h * (0.62 + R() * 0.08);
    const a = crossY(left, sl), b = crossY(right, sl);
    if (a && b) {
      const cap: Pt[] = [a.p, ...left.slice(a.i + 1), ...right.slice(1, b.i + 1), b.p];
      const n = 6, rag: Pt[] = [];
      for (let i = 1; i < n; i++) { const q = lerp(b.p, a.p, i / n); rag.push([q[0], q[1] + (i % 2 ? h * 0.1 : -h * 0.02) + (R() - 0.5) * h * 0.04]); }
      c.beginPath(); c.moveTo(...cap[0]); for (const q of cap) c.lineTo(...q); for (const q of rag) c.lineTo(...q); c.closePath();
      c.fillStyle = '#f5f8ff'; c.fill();
      c.save(); c.clip();
      c.beginPath(); c.moveTo(...S); for (const q of right) c.lineTo(...q); for (let i = mid.length - 1; i >= 0; i--) c.lineTo(...mid[i]); c.closePath();
      c.fillStyle = 'rgba(140,160,205,.55)'; c.fill();
      c.restore();
      c.beginPath(); for (let i = 0; i < rag.length; i++) (i ? c.lineTo(...rag[i]) : c.moveTo(...rag[i]));
      c.strokeStyle = 'rgba(120,130,160,.5)'; c.lineWidth = Math.max(1, w * 0.02); c.stroke();
    }
  }
  // ridge line highlight / crease
  c.beginPath(); c.moveTo(...mid[0]); for (const q of mid) c.lineTo(...q);
  c.strokeStyle = 'rgba(50,38,40,.45)'; c.lineWidth = Math.max(1.2, w * 0.028); c.stroke();
  // grassy lower slopes on the nearer, lower peaks (sense of altitude: green below, bare rock, then snow)
  if (p.far < 0.5 && !crag) {
    const gg = c.createLinearGradient(0, y - h * 0.45, 0, y);
    gg.addColorStop(0, 'rgba(110,150,70,0)'); gg.addColorStop(0.5, 'rgba(110,150,70,.28)'); gg.addColorStop(1, 'rgba(90,130,60,.5)');
    c.fillStyle = gg; c.fillRect(x - w, y - h * 0.45, 2 * w, h * 0.45);
  }
  // dark foot (ambient occlusion)
  const ao = c.createLinearGradient(0, y - h * 0.35, 0, y);
  ao.addColorStop(0, 'rgba(50,45,30,0)'); ao.addColorStop(1, 'rgba(50,45,30,.38)');
  c.fillStyle = ao; c.fillRect(x - w, y - h * 0.35, 2 * w, h * 0.35);
  c.restore();
  // outline (both ridges, not the base)
  c.beginPath(); c.moveTo(...outline[0]); for (const q of outline) c.lineTo(...q);
  c.strokeStyle = OUT; c.lineWidth = Math.max(1.8, w * 0.045); c.lineJoin = 'round'; c.stroke();
}

// ---------- buildings ----------
/** A small timber-framed cottage. `ruin` knocks a hole in the roof and blackens the walls a little. */
export function house(c: C2D, x: number, y: number, k: number, R: () => number, ruin: boolean) {
  c.save(); c.translate(x, y); c.scale(k, k); c.lineJoin = 'round';
  const w = 30 + R() * 6, wh = 26, rh = 30 + R() * 4, ov = 6;
  const roofCol = ['#b5523e', '#9c6a44', '#c79a52', '#7f5a4a'][Math.floor(R() * 4)];
  shadowBlob(c, 6, 1, w + 10, 9, 0.3);
  // wall
  const wg = c.createLinearGradient(-w, 0, w, 0); wg.addColorStop(0, '#efe4c8'); wg.addColorStop(1, '#cbbd9b');
  c.fillStyle = wg; c.strokeStyle = OUT; c.lineWidth = 2.4;
  c.beginPath(); c.rect(-w, -wh, 2 * w, wh); c.fill(); c.stroke();
  // timber frame
  c.strokeStyle = '#6b4426'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-w, -wh / 2); c.lineTo(w, -wh / 2); c.moveTo(-w * 0.45, -wh); c.lineTo(-w * 0.45, 0); c.moveTo(w * 0.45, -wh); c.lineTo(w * 0.45, 0); c.stroke();
  c.lineWidth = 2; c.beginPath(); c.moveTo(-w, -wh); c.lineTo(-w * 0.45, -wh / 2); c.moveTo(w, -wh); c.lineTo(w * 0.45, -wh / 2); c.stroke();
  // door and window
  c.fillStyle = '#5a3820'; c.strokeStyle = OUT; c.lineWidth = 2;
  c.beginPath(); c.moveTo(-6, 0); c.lineTo(-6, -15); c.quadraticCurveTo(0, -20, 6, -15); c.lineTo(6, 0); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = ruin ? '#2a2228' : '#ffe9a8';
  c.beginPath(); c.rect(w * 0.55, -wh + 6, 9, 8); c.fill(); c.stroke();
  c.beginPath(); c.rect(-w * 0.55 - 9, -wh + 6, 9, 8); c.fill(); c.stroke();
  if (ruin) { c.fillStyle = 'rgba(40,30,30,.25)'; c.beginPath(); c.ellipse(w * 0.6, -wh + 4, 10, 7, 0, 0, 7); c.fill(); }
  // roof
  const top = -wh - rh;
  const rg = c.createLinearGradient(0, top, 0, -wh); rg.addColorStop(0, shade(roofCol, 28)); rg.addColorStop(1, shade(roofCol, -18));
  c.fillStyle = rg; c.strokeStyle = OUT; c.lineWidth = 2.4;
  c.beginPath(); c.moveTo(-w - ov, -wh + 2); c.lineTo(-w + 8, top); c.lineTo(w - 8, top); c.lineTo(w + ov, -wh + 2); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(50,25,20,.35)'; c.lineWidth = 1.4;
  for (let i = 1; i < 4; i++) { const yy = top + (rh * i) / 4, sx = -w + 8 - (14 + ov) * (i / 4); c.beginPath(); c.moveTo(sx, yy); c.lineTo(-sx, yy); c.stroke(); }
  c.strokeStyle = 'rgba(255,240,210,.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-w + 9, top + 2.5); c.lineTo(w - 9, top + 2.5); c.stroke();
  if (ruin) {
    // hole with rafters
    const hx = (R() - 0.5) * w * 0.6, hy = top + rh * 0.45;
    c.fillStyle = '#2b2026'; c.strokeStyle = OUT; c.lineWidth = 1.8;
    c.beginPath(); c.moveTo(hx - 10, hy - 6); c.lineTo(hx - 2, hy - 9); c.lineTo(hx + 9, hy - 5); c.lineTo(hx + 11, hy + 4); c.lineTo(hx + 1, hy + 8); c.lineTo(hx - 9, hy + 5); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#7a4e2c'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(hx - 8, hy - 8); c.lineTo(hx + 6, hy + 8); c.moveTo(hx + 2, hy - 10); c.lineTo(hx + 10, hy + 2); c.stroke();
  } else {
    c.fillStyle = '#8c7f78'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.rect(w * 0.35, top - 8, 7, 12); c.fill(); c.stroke();
  }
  c.restore();
}
/** A refugee tent: canvas ridge tent seen from the front-left, with guy ropes. */
export function tent(c: C2D, x: number, y: number, k: number, R: () => number) {
  c.save(); c.translate(x, y); c.scale(k, k); c.lineJoin = 'round';
  const cols = [['#ece2c8', '#c9b996'], ['#e2d4b0', '#bba77e'], ['#d9c9a6', '#b09a72'], ['#e8dcc4', '#c7a37a']][Math.floor(R() * 4)];
  const big = R() < 0.3, w = big ? 28 : 23, h = big ? 34 : 31, d = big ? 24 : 18; // half width of front, height, depth offset to the back-right
  shadowBlob(c, 10, 2, 36, 9, 0.3);
  // guy ropes and pegs
  c.strokeStyle = 'rgba(70,50,30,.7)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(0, -h); c.lineTo(-w - 12, 2); c.moveTo(d, -h - 8); c.lineTo(w + d + 12, -4); c.stroke();
  // side roof (receding)
  c.fillStyle = cols[1]; c.strokeStyle = OUT; c.lineWidth = 2.2;
  c.beginPath(); c.moveTo(0, -h); c.lineTo(d, -h - 8); c.lineTo(w + d, -8); c.lineTo(w, 0); c.closePath(); c.fill(); c.stroke();
  // front triangle
  const fg = c.createLinearGradient(-w, 0, w, 0); fg.addColorStop(0, shade(cols[0], 10)); fg.addColorStop(1, shade(cols[0], -14));
  c.fillStyle = fg; c.beginPath(); c.moveTo(-w, 0); c.lineTo(0, -h); c.lineTo(w, 0); c.closePath(); c.fill(); c.stroke();
  // opening
  c.fillStyle = '#3a2c2a'; c.beginPath(); c.moveTo(-8, 0); c.lineTo(0, -18); c.lineTo(8, 0); c.closePath(); c.fill();
  c.fillStyle = shade(cols[0], -6); c.beginPath(); c.moveTo(0, -18); c.lineTo(-8, 0); c.lineTo(-11, 0); c.closePath(); c.fill(); c.stroke();
  // patch, seams, pole tip
  if (R() < 0.6) { c.fillStyle = ['#b9744a', '#7a8fb0', '#9aa65a'][Math.floor(R() * 3)]; c.beginPath(); c.rect(w + d - 16, -12, 7, 6); c.fill(); c.lineWidth = 1.2; c.stroke(); }
  c.strokeStyle = 'rgba(90,70,40,.35)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(d * 0.5, -h - 4); c.lineTo(w + d * 0.5, -4); c.stroke();
  c.strokeStyle = OUT; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, -h); c.lineTo(0, -h - 6); c.stroke();
  if (R() < 0.4) { c.fillStyle = '#c94a3e'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -h - 6); c.lineTo(9, -h - 3); c.lineTo(0, -h - 1); c.closePath(); c.fill(); c.stroke(); }
  c.restore();
}
/** Ruined masonry for one tile: a broken wall stub and fallen blocks (variant 0..2). */
export function ruin(c: C2D, x: number, y: number, k: number, R: () => number, variant: number) {
  c.save(); c.translate(x, y); c.scale(k, k); c.lineJoin = 'round';
  shadowBlob(c, 4, 1, 30, 7, 0.25);
  const stone = (sx: number, sy: number, w: number, h: number, ang = 0) => {
    c.save(); c.translate(sx, sy); c.rotate(ang);
    const g = c.createLinearGradient(0, -h, 0, 0); g.addColorStop(0, '#d8d0c0'); g.addColorStop(1, '#9a9184');
    c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 1.8; c.beginPath(); c.roundRect(-w / 2, -h, w, h, 2); c.fill(); c.stroke();
    c.restore();
  };
  if (variant === 0) {
    // wall stub with a jagged top
    const g = c.createLinearGradient(0, -30, 0, 0); g.addColorStop(0, '#d6cdbc'); g.addColorStop(1, '#958b7e');
    c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(-24, 0); c.lineTo(-24, -26); c.lineTo(-16, -30); c.lineTo(-10, -22); c.lineTo(-4, -27); c.lineTo(2, -16); c.lineTo(8, -18); c.lineTo(12, -8); c.lineTo(12, 0); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(80,70,60,.45)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(-24, -9); c.lineTo(12, -9); c.moveTo(-24, -18); c.lineTo(4, -18); c.moveTo(-14, 0); c.lineTo(-14, -9); c.moveTo(-2, 0); c.lineTo(-2, -9); c.moveTo(-8, -9); c.lineTo(-8, -18); c.stroke();
    c.fillStyle = '#5f8f45'; c.beginPath(); c.ellipse(-18, -26, 5, 2.5, 0, 0, 7); c.fill();
    stone(18, 2, 10, 7, 0.2); stone(24, -2, 7, 5, -0.3);
  } else if (variant === 1) {
    // broken column and drum
    const g = c.createLinearGradient(-6, 0, 6, 0); g.addColorStop(0, '#e2dace'); g.addColorStop(1, '#9e9588');
    c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-14, 0); c.lineTo(-14, -26); c.lineTo(-9, -30); c.lineTo(-5, -25); c.lineTo(-2, -29); c.lineTo(-2, 0); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(80,70,60,.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-10, -2); c.lineTo(-10, -24); c.moveTo(-6, -2); c.lineTo(-6, -24); c.stroke();
    c.fillStyle = '#c9c0b0'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.roundRect(-20, -3, 24, 4, 1); c.fill(); c.stroke();
    c.save(); c.translate(12, -1); c.fillStyle = g; c.beginPath(); c.ellipse(0, -5, 9, 6, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#d8d0c2'; c.beginPath(); c.ellipse(-6, -5, 3, 6, 0, 0, 7); c.fill(); c.stroke(); c.restore();
  } else if (variant === 3) {
    // a breach in the city wall: low broken stubs on both sides and a heap of fallen blocks between
    c.translate(0, -6);
    const g = c.createLinearGradient(0, -22, 0, 0); g.addColorStop(0, '#d2c9b8'); g.addColorStop(1, '#928878');
    c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(-44, 6); c.lineTo(-44, -20); c.lineTo(-38, -24); c.lineTo(-33, -14); c.lineTo(-27, -10); c.lineTo(-24, 6); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(44, 6); c.lineTo(44, -20); c.lineTo(37, -16); c.lineTo(31, -20); c.lineTo(26, -8); c.lineTo(24, 6); c.closePath(); c.fill(); c.stroke();
    for (const [sx, sy, w, h, a] of [[-16, 8, 12, 8, 0.2], [-4, 10, 14, 9, -0.1], [9, 8, 12, 8, 0.3], [-10, 2, 10, 7, -0.4], [4, 1, 11, 7, 0.15], [-2, -5, 9, 6, 0.5], [18, 12, 8, 6, -0.3], [-22, 13, 8, 5, 0.1]] as number[][]) stone(sx, sy, w, h, a);
  } else {
    // collapsed corner: an L of low wall and rubble
    const g = c.createLinearGradient(0, -18, 0, 0); g.addColorStop(0, '#d2c9b8'); g.addColorStop(1, '#928878');
    c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(-22, 0); c.lineTo(-22, -20); c.lineTo(-16, -16); c.lineTo(-8, -18); c.lineTo(-4, -10); c.lineTo(4, -12); c.lineTo(6, 0); c.closePath(); c.fill(); c.stroke();
    stone(12, 1, 9, 7, 0.15); stone(20, -1, 8, 6, -0.4); stone(15, -6, 7, 5, 0.5); stone(-12, 6, 8, 5, -0.1);
  }
  c.restore();
}

// ---------- walls & palisades (drawn per tile, joined to linked neighbours) ----------
export interface Links { n: boolean; s: boolean; e: boolean; w: boolean }
/**
 * One tile of the old stone city wall (impassable). The wall runs along the tile's links: a light top face
 * with merlons and a darker front face with courses of stone. Unlinked ends are broken off.
 */
export function wallTile(c: C2D, x: number, y: number, L: Links, R: () => number) {
  const tw = T * 0.34, fh = T * 0.38, cx = (x + 0.5) * T, cy = (y + 0.34) * T;
  const x0 = x * T, x1 = (x + 1) * T, y0 = y * T, y1 = (y + 1) * T;
  // horizontal extent and vertical extent of the top face
  const hl = L.w ? x0 : cx - tw / 2, hr = L.e ? x1 : cx + tw / 2;
  const vt = L.n ? y0 : cy - tw / 2, vb = L.s ? y1 : cy + tw / 2;
  const top = new Path2D();
  top.rect(hl, cy - tw / 2, hr - hl, tw);
  top.rect(cx - tw / 2, vt, tw, vb - vt);
  c.save(); c.lineJoin = 'round';
  // shadow on the ground
  c.fillStyle = 'rgba(25,30,20,.28)';
  c.fillRect(hl + T * 0.04, cy + tw / 2 + fh - T * 0.02, hr - hl, T * 0.08);
  // front faces: under the horizontal run (except where the wall continues south)
  const front = (a: number, b: number) => {
    if (b <= a) return;
    const g = c.createLinearGradient(0, cy + tw / 2, 0, cy + tw / 2 + fh);
    g.addColorStop(0, '#a89c88'); g.addColorStop(1, '#7a6f62');
    c.fillStyle = g; c.fillRect(a, cy + tw / 2, b - a, fh);
    c.strokeStyle = 'rgba(60,50,45,.5)'; c.lineWidth = 1.3;
    for (let r = 1; r < 3; r++) { const yy = cy + tw / 2 + (fh * r) / 3; c.beginPath(); c.moveTo(a, yy); c.lineTo(b, yy); c.stroke(); }
    for (let r = 0; r < 3; r++) for (let xx = a + ((r % 2) * T) / 10 + T / 20; xx < b; xx += T / 5) {
      const yy = cy + tw / 2 + (fh * r) / 3; c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy + fh / 3); c.stroke();
    }
    c.strokeStyle = OUT; c.lineWidth = 2.2; c.beginPath(); c.moveTo(a, cy + tw / 2 + fh); c.lineTo(b, cy + tw / 2 + fh); c.stroke();
  };
  if (L.s) { front(hl, cx - tw / 2); front(cx + tw / 2, hr); } else front(hl, hr);
  if (!L.s) { // front face of the column's bottom end
    c.strokeStyle = OUT; c.lineWidth = 2.2;
    for (const ex of [hl, hr]) if ((ex === hl && !L.w) || (ex === hr && !L.e)) { c.beginPath(); c.moveTo(ex, cy + tw / 2); c.lineTo(ex, cy + tw / 2 + fh); c.stroke(); }
  }
  // top face
  const tg = c.createLinearGradient(0, cy - tw / 2, 0, cy + tw / 2); tg.addColorStop(0, '#ddd5c4'); tg.addColorStop(1, '#c2b8a4');
  c.fillStyle = tg; c.fill(top, 'nonzero');
  c.save(); c.clip(top);
  c.strokeStyle = 'rgba(90,80,70,.35)'; c.lineWidth = 1.2;
  for (let xx = hl + T / 8; xx < hr; xx += T / 4) { c.beginPath(); c.moveTo(xx, cy - tw / 2); c.lineTo(xx, cy + tw / 2); c.stroke(); }
  for (let yy = vt + T / 8; yy < vb; yy += T / 4) { c.beginPath(); c.moveTo(cx - tw / 2, yy); c.lineTo(cx + tw / 2, yy); c.stroke(); }
  // moss
  for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(90,140,60,.45)'; c.beginPath(); c.ellipse(hl + R() * (hr - hl), cy + (R() - 0.5) * tw, 4 + R() * 6, 2 + R() * 2, 0, 0, 7); c.fill(); }
  c.restore();
  // merlons along the outer (south) edge of the horizontal run
  c.fillStyle = '#e6dfd0'; c.strokeStyle = OUT; c.lineWidth = 1.6;
  for (let xx = hl + T * 0.05; xx + T * 0.1 <= hr; xx += T * 0.2) {
    if (L.s && xx > cx - tw / 2 - T * 0.1 && xx < cx + tw / 2) continue;
    if (R() < 0.18) continue; // some merlons have fallen
    c.beginPath(); c.rect(xx, cy + tw / 2 - T * 0.09, T * 0.1, T * 0.09); c.fill(); c.stroke();
  }
  c.strokeStyle = OUT; c.lineWidth = 2.4; c.stroke(top);
  // broken ends: jagged rubble where the wall stops
  const brk = (px: number, py: number) => {
    for (let i = 0; i < 4; i++) rock(c, px + (R() - 0.5) * T * 0.3, py + (R() - 0.2) * T * 0.2, T / 96 * (0.6 + R() * 0.5), R, 10);
  };
  if (!L.e && !L.w && !L.n && !L.s) brk(cx + T * 0.25, cy + tw / 2 + fh);
  else {
    if (!L.e && (L.w)) brk(cx + tw / 2 + T * 0.12, cy + tw / 2 + fh * 0.9);
    if (!L.w && (L.e)) brk(cx - tw / 2 - T * 0.12, cy + tw / 2 + fh * 0.9);
  }
  c.restore();
}
/** One tile of a wooden palisade (impassable): sharpened stakes along the tile's links. */
export function fenceTile(c: C2D, x: number, y: number, L: Links, R: () => number) {
  const cx = (x + 0.5) * T, cy = (y + 0.62) * T, x0 = x * T, x1 = (x + 1) * T, y0 = y * T, y1 = (y + 1) * T;
  const posts: Pt[] = [];
  const step = T * 0.125;
  const solo = !L.e && !L.w && !L.n && !L.s;
  const hl = L.w || solo ? x0 + step * 0.5 : cx, hr = L.e || solo ? x1 - step * 0.3 : cx;
  for (let px = hl; px <= hr + 0.1; px += step) posts.push([px, cy]);
  // vertical runs: stakes staggered left/right so the run reads as a thick palisade, not a single pole line
  if (L.n) for (let py = cy - step * 0.8, i = 0; py > y0; py -= step * 0.8, i++) posts.push([cx + (i % 2 ? -1 : 1) * T * 0.06, py]);
  if (L.s) for (let py = cy + step * 0.8, i = 0; py < y1; py += step * 0.8, i++) posts.push([cx + (i % 2 ? 1 : -1) * T * 0.06, py]);
  if (!posts.some(p => p[0] === cx && p[1] === cy)) posts.push([cx, cy]);
  c.save(); c.lineJoin = 'round';
  // trampled strip and shadow
  c.fillStyle = 'rgba(95,70,45,.45)';
  if (hr > hl) { c.beginPath(); c.ellipse((hl + hr) / 2, cy + 2, (hr - hl) / 2 + T * 0.08, T * 0.09, 0, 0, 7); c.fill(); }
  if (L.n || L.s) { const a = L.n ? y0 : cy, b = L.s ? y1 : cy; c.beginPath(); c.roundRect(cx - T * 0.14, a, T * 0.28, b - a + T * 0.04, T * 0.1); c.fill(); }
  // rails behind the stakes
  c.strokeStyle = '#4a2e18'; c.lineWidth = T * 0.05;
  if (hr > hl) { for (const h of [0.14, 0.26]) { c.beginPath(); c.moveTo(hl, cy - T * h); c.lineTo(hr, cy - T * h); c.stroke(); } }
  posts.sort((a, b) => a[1] - b[1]);
  for (const [px, py] of posts) {
    const h = T * (0.42 + R() * 0.08), w = T * 0.1;
    c.fillStyle = 'rgba(25,30,20,.3)'; c.beginPath(); c.ellipse(px + 3, py + 1, w, w * 0.35, 0, 0, 7); c.fill();
    const g = c.createLinearGradient(px - w / 2, 0, px + w / 2, 0); g.addColorStop(0, '#b07a48'); g.addColorStop(1, '#6b4426');
    c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 2.2;
    c.beginPath(); c.moveTo(px - w / 2, py); c.lineTo(px - w / 2, py - h + w * 0.6); c.lineTo(px, py - h - w * 0.4); c.lineTo(px + w / 2, py - h + w * 0.6); c.lineTo(px + w / 2, py); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(40,25,10,.4)'; c.lineWidth = 1; c.beginPath(); c.moveTo(px, py - 3); c.lineTo(px, py - h * 0.6); c.stroke();
  }
  // front rope / lashing
  if (hr > hl) { c.strokeStyle = 'rgba(220,200,150,.8)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(hl, cy - T * 0.2); c.lineTo(hr, cy - T * 0.2); c.stroke(); }
  c.restore();
}

export function well(c: C2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round';
  shadowBlob(c, 3, 1, 15, 4.5, 0.28);
  c.strokeStyle = OUT; c.lineWidth = 1.7;
  const g = c.createLinearGradient(-12, 0, 12, 0); g.addColorStop(0, '#d6cdbc'); g.addColorStop(1, '#8f8678');
  c.fillStyle = g; c.beginPath(); c.moveTo(-12, -9); c.lineTo(-12, 0); c.quadraticCurveTo(0, 5, 12, 0); c.lineTo(12, -9); c.fill(); c.stroke();
  c.fillStyle = '#2c3a4a'; c.beginPath(); c.ellipse(0, -9, 12, 4.5, 0, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#5a9ad0'; c.beginPath(); c.ellipse(0, -8.5, 8, 2.6, 0, 0, 7); c.fill();
  c.strokeStyle = '#6b4426'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-10, -9); c.lineTo(-10, -28); c.moveTo(10, -9); c.lineTo(10, -28); c.stroke();
  c.fillStyle = '#9c6a44'; c.strokeStyle = OUT; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-15, -26); c.lineTo(0, -34); c.lineTo(15, -26); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(220,200,150,.9)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -27); c.lineTo(0, -14); c.stroke();
  c.restore();
}
export function haystack(c: C2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  shadowBlob(c, 3, 1, 14, 4, 0.28);
  const g = c.createLinearGradient(-12, -20, 12, 0); g.addColorStop(0, '#f0d58a'); g.addColorStop(1, '#b8913f');
  c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 1.7;
  c.beginPath(); c.moveTo(-13, 0); c.quadraticCurveTo(-14, -18, 0, -22); c.quadraticCurveTo(14, -18, 13, 0); c.quadraticCurveTo(0, 3, -13, 0); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(130,95,35,.6)'; c.lineWidth = 1;
  for (let i = -8; i <= 8; i += 4) { c.beginPath(); c.moveTo(i, -2); c.quadraticCurveTo(i * 0.7, -10, i * 0.4, -18); c.stroke(); }
  c.restore();
}
