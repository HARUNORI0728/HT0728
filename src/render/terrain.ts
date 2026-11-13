// Illustrated terrain, drawn once per chapter into an offscreen canvas from the tile map.
//
// Rivers, roads, forest floors and rocky ground are drawn as smooth shapes: each terrain kind becomes a
// blurred mask on a fine sample grid, and its iso-line (marching squares, then quadratic smoothing) is the
// outline. Water uses a low threshold so every river tile is fully covered (convex corners included), while
// roads use a high one so they read as a narrower winding band. Trees, peaks and forts are then placed per
// tile, so each forest tile has trees and each mountain tile has a peak.
import { OUT, T, hashStr, rng, type C2D } from './common';

type Test = (ch: string) => boolean;
const isWater: Test = ch => ch === 'W' || ch === 'B';
const isRoad: Test = ch => ch === 'R' || ch === 'B' || ch === 'C';

/** Smooth 2D value noise in [-1, 1]. */
function makeNoise(R: () => number, n = 64) {
  const g = Float32Array.from({ length: n * n }, () => R() * 2 - 1);
  const at = (i: number, j: number) => g[(((j % n) + n) % n) * n + (((i % n) + n) % n)];
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
    const a = at(xi, yi) * (1 - sx) + at(xi + 1, yi) * sx, b = at(xi, yi + 1) * (1 - sx) + at(xi + 1, yi + 1) * sx;
    return a * (1 - sy) + b * sy;
  };
}

interface Field { gw: number; gh: number; v: Float32Array; N: number; pad: number }
/**
 * Blurred mask of the tiles passing `test`, sampled N times per tile with one tile of padding around the map
 * (edge tiles are repeated so rivers and roads run off the map). The outermost ring is zero so contours close.
 * `floor` forces samples inside matching tiles up to at least that value (guarantees coverage).
 */
function buildField(map: string[], test: Test, N: number, sigma: number, opt: { noise?: (x: number, y: number) => number; amp?: number; freq?: number; floor?: number } = {}): Field {
  const cols = map[0].length, rows = map.length, pad = 1;
  const gw = (cols + 2 * pad) * N, gh = (rows + 2 * pad) * N;
  const m = new Float32Array(gw * gh), inside = new Uint8Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = (i + 0.5) / N - pad, y = (j + 0.5) / N - pad;
    const cx = Math.floor(x), cy = Math.floor(y);
    const ok = test(map[Math.max(0, Math.min(rows - 1, cy))][Math.max(0, Math.min(cols - 1, cx))]);
    m[j * gw + i] = ok ? 1 : 0;
    if (ok && cx >= 0 && cy >= 0 && cx < cols && cy < rows) inside[j * gw + i] = 1;
  }
  // separable gaussian blur
  const r = Math.max(1, Math.ceil(sigma * N * 3)), k: number[] = [];
  let ks = 0;
  for (let d = -r; d <= r; d++) { const w = Math.exp(-(d * d) / (2 * (sigma * N) ** 2)); k.push(w); ks += w; }
  for (let d = 0; d < k.length; d++) k[d] /= ks;
  const tmp = new Float32Array(gw * gh), v = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let s = 0;
    for (let d = -r; d <= r; d++) { const ii = Math.max(0, Math.min(gw - 1, i + d)); s += m[j * gw + ii] * k[d + r]; }
    tmp[j * gw + i] = s;
  }
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    let s = 0;
    for (let d = -r; d <= r; d++) { const jj = Math.max(0, Math.min(gh - 1, j + d)); s += tmp[jj * gw + i] * k[d + r]; }
    v[j * gw + i] = s;
  }
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const id = j * gw + i;
    if (opt.noise) v[id] += (opt.amp ?? 0.06) * opt.noise(((i + 0.5) / N) * (opt.freq ?? 0.8), ((j + 0.5) / N) * (opt.freq ?? 0.8));
    if (opt.floor !== undefined && inside[id]) v[id] = Math.max(v[id], opt.floor);
    if (i === 0 || j === 0 || i === gw - 1 || j === gh - 1) v[id] = 0;
  }
  return { gw, gh, v, N, pad };
}

/** Closed iso-lines of the field at `th`, in map pixels. */
function contours(f: Field, th: number): [number, number][][] {
  const { gw, gh, v, N, pad } = f;
  const adj = new Map<number, number[]>(), pos = new Map<number, [number, number]>();
  const px = (x: number) => ((x + 0.5) / N - pad) * T;
  const hE = (i: number, j: number) => {
    const id = (j * gw + i) * 2;
    if (!pos.has(id)) { const a = v[j * gw + i], b = v[j * gw + i + 1]; pos.set(id, [px(i + (th - a) / (b - a)), px(j)]); }
    return id;
  };
  const vE = (i: number, j: number) => {
    const id = (j * gw + i) * 2 + 1;
    if (!pos.has(id)) { const a = v[j * gw + i], b = v[(j + 1) * gw + i]; pos.set(id, [px(i), px(j + (th - a) / (b - a))]); }
    return id;
  };
  const link = (a: number, b: number) => { (adj.get(a) ?? adj.set(a, []).get(a)!).push(b); (adj.get(b) ?? adj.set(b, []).get(b)!).push(a); };
  for (let j = 0; j < gh - 1; j++) for (let i = 0; i < gw - 1; i++) {
    const tl = v[j * gw + i] > th, tr = v[j * gw + i + 1] > th, br = v[(j + 1) * gw + i + 1] > th, bl = v[(j + 1) * gw + i] > th;
    const c = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
    if (c === 0 || c === 15) continue;
    const top = () => hE(i, j), bot = () => hE(i, j + 1), left = () => vE(i, j), right = () => vE(i + 1, j);
    const mid = (v[j * gw + i] + v[j * gw + i + 1] + v[(j + 1) * gw + i + 1] + v[(j + 1) * gw + i]) / 4 > th;
    switch (c) {
      case 1: case 14: link(left(), bot()); break;
      case 2: case 13: link(bot(), right()); break;
      case 3: case 12: link(left(), right()); break;
      case 4: case 11: link(top(), right()); break;
      case 6: case 9: link(top(), bot()); break;
      case 7: case 8: link(left(), top()); break;
      case 5: if (mid) { link(left(), top()); link(bot(), right()); } else { link(top(), right()); link(left(), bot()); } break;
      case 10: if (mid) { link(top(), right()); link(left(), bot()); } else { link(left(), top()); link(bot(), right()); } break;
    }
  }
  const seen = new Set<number>(), loops: [number, number][][] = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop: [number, number][] = [];
    let prev = -1, cur = start;
    while (!seen.has(cur)) {
      seen.add(cur); loop.push(pos.get(cur)!);
      const nb = adj.get(cur)!;
      const next = nb[0] !== prev ? nb[0] : nb[1];
      if (next === undefined) break;
      prev = cur; cur = next;
    }
    if (loop.length > 2) loops.push(loop);
  }
  return loops;
}
/** Smooth closed path through the loops' midpoints. */
function toPath(loops: [number, number][][]) {
  const p = new Path2D();
  for (const l of loops) {
    const n = l.length, m = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = m(l[n - 1], l[0]);
    p.moveTo(s[0], s[1]);
    for (let k = 0; k < n; k++) { const q = m(l[k], l[(k + 1) % n]); p.quadraticCurveTo(l[k][0], l[k][1], q[0], q[1]); }
    p.closePath();
  }
  return p;
}
const valueAt = (f: Field, x: number, y: number) => {
  const i = Math.round((x / T + f.pad) * f.N - 0.5), j = Math.round((y / T + f.pad) * f.N - 0.5);
  return f.v[Math.max(0, Math.min(f.gh - 1, j)) * f.gw + Math.max(0, Math.min(f.gw - 1, i))];
};

// ---------- objects ----------
function tree(c: C2D, x: number, y: number, s: number, R: () => number) {
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
function pine(c: C2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(10,40,20,.32)'; c.beginPath(); c.ellipse(4, 3, 18, 7, 0, 0, 7); c.fill();
  c.fillStyle = '#6b4426'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.roundRect(-3.5, -12, 7, 15, 2); c.fill(); c.stroke();
  for (const [w, top, bot] of [[20, -34, -8], [16, -48, -24], [11, -60, -38]]) {
    const g = c.createLinearGradient(-w, 0, w, 0); g.addColorStop(0, '#5fb35e'); g.addColorStop(0.5, '#2f7d3f'); g.addColorStop(1, '#1d5531');
    c.fillStyle = g; c.beginPath(); c.moveTo(0, top); c.lineTo(w, bot); c.quadraticCurveTo(0, bot + 5, -w, bot); c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}
function mountain(c: C2D, x: number, y: number, s: number, R: () => number, snow: boolean) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const j = () => (R() - 0.5) * 8;
  const L: [number, number] = [-46, 0], P1: [number, number] = [-10 + j(), -58 + j()], N: [number, number] = [1 + j() * 0.5, -48 + j() * 0.5], P2: [number, number] = [12 + j(), -68 + j()], Rr: [number, number] = [48, 0];
  c.fillStyle = 'rgba(30,25,20,.3)'; c.beginPath(); c.ellipse(2, 2, 50, 11, 0, 0, 7); c.fill();
  const g = c.createLinearGradient(-44, 0, 44, 0); g.addColorStop(0, '#c2ad93'); g.addColorStop(0.5, '#937f6a'); g.addColorStop(1, '#5e5148');
  c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 2.5; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(...L); c.lineTo(...P1); c.lineTo(...N); c.lineTo(...P2); c.lineTo(...Rr); c.closePath(); c.fill();
  // shadowed right face
  c.fillStyle = 'rgba(40,30,30,.28)'; c.beginPath(); c.moveTo(...P2); c.lineTo(...Rr); c.lineTo(P2[0] - 6, 0); c.closePath(); c.fill();
  // rock strata
  c.strokeStyle = 'rgba(60,45,40,.45)'; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(P1[0] - 6, P1[1] + 26); c.lineTo(P1[0] + 4, P1[1] + 34); c.moveTo(P2[0] + 6, P2[1] + 30); c.lineTo(P2[0] + 16, P2[1] + 44); c.moveTo(-24, -12); c.lineTo(-14, -8); c.stroke();
  c.strokeStyle = OUT; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(...L); c.lineTo(...P1); c.lineTo(...N); c.lineTo(...P2); c.lineTo(...Rr); c.closePath(); c.stroke();
  if (snow) {
    const lerp = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const a = lerp(P1, L, 0.28), b = lerp(P2, Rr, 0.33);
    c.fillStyle = '#f6f8ff'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(...a); c.lineTo(...P1); c.lineTo(...N); c.lineTo(...P2); c.lineTo(...b);
    c.lineTo(b[0] - 9, b[1] - 3); c.lineTo(P2[0] - 4, b[1] + 6); c.lineTo(N[0] - 2, N[1] + 10); c.lineTo(P1[0] + 2, a[1] + 4); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(150,170,210,.45)'; c.beginPath(); c.moveTo(...P2); c.lineTo(...b); c.lineTo(b[0] - 9, b[1] - 3); c.closePath(); c.fill();
  }
  c.restore();
}
function rock(c: C2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(2, 2, 10, 3.5, 0, 0, 7); c.fill();
  const g = c.createLinearGradient(-8, -8, 8, 4); g.addColorStop(0, '#c9bba6'); g.addColorStop(1, '#7d6e60');
  c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 1.6;
  c.beginPath(); c.moveTo(-9, 1); c.lineTo(-6, -7); c.lineTo(1, -10); c.lineTo(8, -5); c.lineTo(9, 1); c.closePath(); c.fill(); c.stroke();
  c.restore();
}
function fort(c: C2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = 'round';
  c.fillStyle = '#8f7a50'; c.beginPath(); c.ellipse(0, 26, 46, 15, 0, 0, 7); c.fill(); c.fillStyle = '#dcc690'; c.beginPath(); c.ellipse(0, 26, 43, 12.5, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(2, 27, 40, 9, 0, 0, 7); c.fill();
  const g = c.createLinearGradient(-30, 0, 30, 0); g.addColorStop(0, '#ece8f4'); g.addColorStop(1, '#9d96b0');
  c.strokeStyle = OUT; c.lineWidth = 2.5; c.fillStyle = g;
  // side towers
  for (const tx of [-36, 22]) { c.beginPath(); c.rect(tx, -18, 14, 44); c.fill(); c.stroke(); c.beginPath(); c.rect(tx - 2, -24, 18, 8); c.fill(); c.stroke(); }
  c.beginPath(); c.rect(-24, -12, 48, 38); c.fill(); c.stroke();
  for (const tx of [-24, -6, 12]) { c.beginPath(); c.rect(tx, -22, 12, 11); c.fill(); c.stroke(); }
  // stone joints
  c.strokeStyle = 'rgba(80,70,100,.35)'; c.lineWidth = 1.2;
  for (const yy of [0, 12]) { c.beginPath(); c.moveTo(-23, yy); c.lineTo(23, yy); c.stroke(); }
  // windows and gate
  c.fillStyle = '#3a2c40'; for (const tx of [-31, 27]) { c.beginPath(); c.roundRect(tx, -8, 4, 8, 2); c.fill(); }
  c.fillStyle = '#3a2412'; c.strokeStyle = OUT; c.lineWidth = 2.5;
  c.beginPath(); c.moveTo(-9, 26); c.lineTo(-9, 8); c.arc(0, 8, 9, Math.PI, 0); c.lineTo(9, 26); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(232,197,106,.6)'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 26); c.stroke();
  // flag
  c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -22); c.lineTo(0, -50); c.stroke();
  c.fillStyle = '#d2483e'; c.lineWidth = 2; c.beginPath(); c.moveTo(1, -50); c.quadraticCurveTo(14, -55, 26, -46); c.quadraticCurveTo(14, -40, 1, -38); c.closePath(); c.fill(); c.stroke();
  c.restore();
}
/** A bridge across one tile. `horiz` = the bridge runs left–right. */
function bridge(c: C2D, x: number, y: number, horiz: boolean) {
  c.save(); c.translate(x + T / 2, y + T / 2);
  if (!horiz) c.rotate(Math.PI / 2);
  const k = T / 72, L = T * 0.66, Wd = T * 0.4;
  c.fillStyle = 'rgba(10,30,60,.32)'; c.fillRect(-L + 4 * k, -Wd + 6 * k, 2 * L, 2 * Wd + 4 * k);
  const g = c.createLinearGradient(0, -Wd, 0, Wd); g.addColorStop(0, '#c48b55'); g.addColorStop(0.5, '#b07a48'); g.addColorStop(1, '#8a5a30');
  c.fillStyle = g; c.strokeStyle = OUT; c.lineWidth = 2.5 * k;
  c.beginPath(); c.roundRect(-L, -Wd, 2 * L, 2 * Wd, 4 * k); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(60,35,15,.55)'; c.lineWidth = 1.5 * k;
  for (let i = -L + 11 * k; i < L; i += 11 * k) { c.beginPath(); c.moveTo(i, -Wd); c.lineTo(i, Wd); c.stroke(); }
  c.fillStyle = 'rgba(255,230,190,.25)'; c.fillRect(-L, -Wd + 3 * k, 2 * L, 3 * k);
  for (const sy of [-Wd, Wd]) {
    c.fillStyle = '#6b4426'; c.strokeStyle = OUT; c.lineWidth = 2 * k;
    c.beginPath(); c.roundRect(-L - 3 * k, sy - 4.5 * k, 2 * L + 6 * k, 9 * k, 3 * k); c.fill(); c.stroke();
    for (const px of [-L, 0, L]) { c.fillStyle = '#5a3820'; c.beginPath(); c.roundRect(px - 4 * k, sy - 6 * k, 8 * k, 12 * k, 2 * k); c.fill(); c.stroke(); }
  }
  c.restore();
}

/**
 * Centre line of the road network. Each road tile contributes pieces from its centre to the middle of each
 * edge it shares with another road tile; a tile with exactly two perpendicular links gets one quarter curve
 * instead, so turns are round. Pieces meet at edge midpoints with matching direction, so the band is smooth.
 * Border tiles that end there are extended off the map. Forts only link to roads, they don't extend them.
 */
function roadPath(map: string[], noise: (x: number, y: number) => number) {
  const cols = map[0].length, rows = map.length, p = new Path2D();
  const road = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows && isRoad(map[y][x]);
  const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!road(x, y)) continue;
    const ch = map[y][x];
    let links = DIRS.filter(([dx, dy]) => road(x + dx, y + dy) && !(ch === 'C' && map[y + dy][x + dx] === 'C'));
    const off = ([dx, dy]: [number, number]) => x + dx < 0 || y + dy < 0 || x + dx >= cols || y + dy >= rows;
    if (ch !== 'C' && links.length <= 1) { // a road ending on the border runs on off the map
      const out = DIRS.filter(off), straight = out.find(([dx, dy]) => links.length === 1 && dx === -links[0][0] && dy === -links[0][1]);
      const ext = straight ?? out[0];
      if (ext) links = [...links, ext];
    }
    const cx = (x + 0.5) * T, cy = (y + 0.5) * T;
    const mid = (d: [number, number]) => { const f = off(d) ? 1 : 0.5; return [cx + d[0] * T * f, cy + d[1] * T * f]; };
    if (links.length === 2 && links[0][0] !== -links[1][0] && links[0][1] !== -links[1][1]) {
      const a = mid(links[0]), b = mid(links[1]);
      const j = noise(x * 1.7, y * 1.7) * T * 0.06;
      p.moveTo(a[0], a[1]); p.quadraticCurveTo(cx + j, cy - j, b[0], b[1]);
    } else if (links.length === 0) {
      p.moveTo(cx - 0.01, cy); p.lineTo(cx + 0.01, cy);
    } else for (const l of links) { const m = mid(l); p.moveTo(cx, cy); p.lineTo(m[0], m[1]); }
  }
  return p;
}

// ---------- terrain layer ----------
export function drawTerrain(c: C2D, map: string[]) {
  const cols = map[0].length, rows = map.length, W = cols * T, H = rows * T;
  const R = rng(hashStr(map.join('/')));
  const noise = makeNoise(R);
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < cols && y < rows ? map[y][x] : '');
  const area = (W * H) / (864 * 576);
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';

  // grass: gradient, soft blotches, blades, flowers
  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#7cc46a'); g.addColorStop(0.5, '#67b05a'); g.addColorStop(1, '#579c50');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 80 * area; i++) {
    const x = R() * W, y = R() * H, r = (0.45 + R() * 0.9) * T;
    const rg = c.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, R() < 0.5 ? 'rgba(150,215,120,.22)' : 'rgba(40,110,60,.17)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg; c.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  const blade = T / 72;
  for (let i = 0; i < 1100 * area; i++) {
    const x = R() * W, y = R() * H, l = (3 + R() * 5) * blade;
    c.strokeStyle = R() < 0.5 ? 'rgba(170,230,130,.5)' : 'rgba(45,120,60,.45)'; c.lineWidth = 1.4 * blade;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 2 * blade, y - l * 0.6, x + (R() - 0.5) * 4 * blade, y - l); c.stroke();
  }
  for (let i = 0; i < 46 * area; i++) {
    const x = R() * W, y = R() * H;
    c.fillStyle = ['#fff6c8', '#ffd0e0', '#e6f0ff'][i % 3]; c.beginPath(); c.arc(x, y, 1.8 * blade, 0, 7); c.fill();
  }

  // forest floor and rocky ground under mountains (soft dark patches that group the clusters)
  // Only the blurred shadow of the shape is drawn (the shape itself sits off-canvas), so the edges are soft.
  const soft = (p: Path2D, col: string, blur: number) => {
    const off = W + H + 4 * T;
    c.save(); c.translate(-off, 0); c.fillStyle = '#000'; c.shadowColor = col; c.shadowBlur = blur; c.shadowOffsetX = off; c.fill(p, 'evenodd'); c.restore();
  };
  const forestP = toPath(contours(buildField(map, ch => ch === 'F', 6, 0.3, { noise, amp: 0.08 }), 0.42));
  soft(forestP, 'rgba(28,86,44,.5)', T * 0.3);
  const mtnF = buildField(map, ch => ch === 'M', 6, 0.3, { noise, amp: 0.08 });
  const mtnP = toPath(contours(mtnF, 0.4));
  soft(mtnP, 'rgba(112,112,72,.55)', T * 0.3);
  c.save(); c.clip(mtnP, 'evenodd');
  for (let i = 0; i < 260 * area; i++) {
    const x = R() * W, y = R() * H;
    if (valueAt(mtnF, x, y) < 0.4) continue;
    c.fillStyle = R() < 0.5 ? 'rgba(90,75,60,.35)' : 'rgba(230,220,190,.3)'; c.beginPath(); c.ellipse(x, y, (1.5 + R() * 2.5) * blade, (1 + R()) * blade, 0, 0, 7); c.fill();
  }
  c.restore();

  // road: a smooth band through the centres of connected road tiles (bends become quarter curves)
  const roadP = roadPath(map, noise);
  c.strokeStyle = 'rgba(60,90,40,.3)'; c.lineWidth = T * 0.8; c.stroke(roadP);
  c.strokeStyle = '#8f7a50'; c.lineWidth = T * 0.7; c.stroke(roadP);
  c.strokeStyle = '#d9c08c'; c.lineWidth = T * 0.62; c.stroke(roadP);
  c.save(); c.strokeStyle = '#e6d2a2'; c.shadowColor = '#e6d2a2'; c.shadowBlur = T * 0.08; c.lineWidth = T * 0.44; c.stroke(roadP); c.restore();
  c.lineWidth = T * 0.6;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!isRoad(map[y][x])) continue;
    for (let i = 0; i < 16; i++) {
      const px = (x + 0.5 + (R() - 0.5) * 0.9) * T, py = (y + 0.5 + (R() - 0.5) * 0.9) * T;
      if (!c.isPointInStroke(roadP, px, py)) continue;
      c.fillStyle = R() < 0.5 ? 'rgba(140,110,70,.38)' : 'rgba(255,245,210,.45)';
      c.beginPath(); c.ellipse(px, py, (1.5 + R() * 2) * blade, (1 + R()) * blade, 0, 0, 7); c.fill();
    }
  }

  // water: grassy bank, sand, deep edge, bright centre, ripples
  const waterF = buildField(map, isWater, 6, 0.22, { noise, amp: 0.05, floor: 0.35 });
  const waterP = toPath(contours(waterF, 0.32));
  c.strokeStyle = 'rgba(40,80,40,.45)'; c.lineWidth = T * 0.36; c.stroke(waterP);
  c.strokeStyle = '#4f8f52'; c.lineWidth = T * 0.28; c.stroke(waterP);
  c.strokeStyle = '#c9b98a'; c.lineWidth = T * 0.19; c.stroke(waterP);
  c.save(); c.setLineDash([2 * blade, 7 * blade]); c.strokeStyle = 'rgba(120,100,60,.5)'; c.lineWidth = T * 0.15; c.stroke(waterP); c.restore();
  c.fillStyle = '#62b2ee'; c.fill(waterP, 'evenodd');
  c.save(); c.clip(waterP, 'evenodd');
  c.save(); c.strokeStyle = '#3f93dc'; c.shadowColor = '#3f93dc'; c.shadowBlur = T * 0.14; c.lineWidth = T * 0.8; c.stroke(waterP); c.restore();
  c.save(); c.strokeStyle = '#2f78c8'; c.shadowColor = '#2f78c8'; c.shadowBlur = T * 0.05; c.lineWidth = T * 0.24; c.stroke(waterP); c.restore();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2 * blade;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (map[y][x] !== 'W') continue;
    for (let i = 0; i < 2; i++) {
      const px = (x + 0.15 + R() * 0.55) * T, py = (y + 0.2 + R() * 0.6) * T, l = (8 + R() * 14) * blade;
      c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + l / 2, py - 3 * blade, px + l, py); c.stroke();
    }
    if (R() < 0.35) { const px = (x + 0.3 + R() * 0.4) * T, py = (y + 0.3 + R() * 0.4) * T; c.beginPath(); c.moveTo(px, py); c.quadraticCurveTo(px + 5 * blade, py - 2 * blade, px + 10 * blade, py); c.moveTo(px + 3 * blade, py + 4 * blade); c.quadraticCurveTo(px + 8 * blade, py + 2 * blade, px + 13 * blade, py + 4 * blade); c.stroke(); }
  }
  c.restore();

  // bridges
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (map[y][x] !== 'B') continue;
    const land = (ch: string) => ch !== '' && !isWater(ch);
    const h = land(at(x - 1, y)) || land(at(x + 1, y)) || at(x - 1, y) === 'B' || at(x + 1, y) === 'B';
    const v = land(at(x, y - 1)) || land(at(x, y + 1));
    bridge(c, x * T, y * T, h || !v);
  }

  // upright objects, back to front
  const objs: { y: number; draw: () => void }[] = [];
  const k = T / 72;
  const TREE_SPOTS = [[0.22, 0.52, 0.8], [0.72, 0.48, 0.85], [0.47, 0.8, 1], [0.84, 0.88, 0.76], [0.14, 0.92, 0.72]];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const ch = map[y][x];
    if (ch === 'F') {
      for (const [a, b, s] of TREE_SPOTS) {
        const tx = (x + a + (R() - 0.5) * 0.1) * T, ty = (y + b + (R() - 0.5) * 0.06) * T, sc = s * k * (0.92 + R() * 0.16), r = R();
        objs.push({ y: ty, draw: r < 0.2 ? () => pine(c, tx, ty, sc) : () => tree(c, tx, ty, sc, rng(hashStr(`${x},${y},${a}`))) });
      }
    } else if (ch === 'M') {
      const sc = k * (0.86 + R() * 0.14), mx = (x + 0.5 + (R() - 0.5) * 0.1) * T, my = (y + 0.9) * T, snow = R() < 0.7, sub = rng(hashStr(`m${x},${y}`));
      objs.push({ y: my, draw: () => mountain(c, mx, my, sc, sub, snow) });
      if (R() < 0.45) {
        const rx = (x + 0.15 + R() * 0.7) * T, ry = (y + 0.94) * T;
        objs.push({ y: ry, draw: () => rock(c, rx, ry, k * 0.9) });
      }
    } else if (ch === 'C') {
      const fx = (x + 0.5) * T, fy = (y + 0.52) * T;
      objs.push({ y: fy + 26 * k, draw: () => fort(c, fx, fy, k * 0.9) });
    } else if (ch === 'G' && R() < 0.06) {
      const rx = (x + 0.2 + R() * 0.6) * T, ry = (y + 0.3 + R() * 0.6) * T;
      objs.push({ y: ry, draw: () => rock(c, rx, ry, k * 0.6) });
    }
  }
  objs.sort((a, b) => a.y - b.y).forEach(o => o.draw());

  // gentle light from the top-left over everything
  const lg = c.createLinearGradient(0, 0, W, H);
  lg.addColorStop(0, 'rgba(255,250,220,.08)'); lg.addColorStop(1, 'rgba(20,20,60,.10)');
  c.fillStyle = lg; c.fillRect(0, 0, W, H);
  c.restore();
}

