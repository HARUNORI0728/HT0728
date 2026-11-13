// Illustrated terrain, drawn once per chapter into an offscreen canvas from the tile map.
//
// Ground kinds (grass, forest floor, rocky skirts under mountains, camp dirt, fields, hills, paving, roads, water,
// cliffs) are drawn as smooth shapes: each kind becomes a blurred mask on a fine sample grid, and its iso-line
// (marching squares, then quadratic smoothing) is the outline. Upright things (trees, mountain massifs, houses,
// tents, ruins, walls, palisades, bushes, decorations) are then collected and drawn back to front.
// Mountains are drawn per connected range: tiles deep inside a range get tall snowy peaks, edge tiles get
// foothills and crags, and ridge peaks sit between neighbouring tiles so the range reads as one massif.
// Decorations have no game effect; they stay small and off the tile centre so units and range overlays read.
// Everything random is seeded from the map (and the tile), so the same map always gives the same picture.
import { OUT, T, canvas, hashStr, rng, type C2D } from './common';
import * as O from './terrain-objs';

type Test = (ch: string) => boolean;
const isWater: Test = ch => ch === 'W' || ch === 'B' || ch === 'P';
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
/**
 * Hill-shaded picture of a field (height = field value, light from the north-west), painted coarse and drawn
 * scaled up. Transparent below `th`. `bright` lifts the higher ground.
 */
function relief(f: Field, th: number, W: number, H: number, dark: number[], light: number[], bright: number, height: (x: number, y: number) => number, box: number[]) {
  const cell = 8 * (T / 96), lw = Math.ceil(W / cell), lh = Math.ceil(H / cell);
  const cv = canvas(lw, lh), g = cv.getContext('2d')!, img = g.createImageData(lw, lh), d = T * 0.08;
  const [bx0, by0, bx1, by1] = box.map(v => Math.round(v / cell));
  for (let j = Math.max(0, by0); j < Math.min(lh, by1); j++) for (let i = Math.max(0, bx0); i < Math.min(lw, bx1); i++) {
    const x = (i + 0.5) * cell, y = (j + 0.5) * cell, v = valueAtB(f, x, y);
    if (v < th - 0.05) continue;
    const gx = height(x + d, y) - height(x - d, y), gy = height(x, y + d) - height(x, y - d);
    const sh = Math.max(0, Math.min(1, 0.5 + (gx * 0.6 + gy * 0.8) * 5.5 + (height(x, y) - 0.5) * bright));
    const o = (j * lw + i) * 4, a = Math.max(0, Math.min(1, (v - th + 0.03) / 0.06));
    for (let k = 0; k < 3; k++) img.data[o + k] = dark[k] + (light[k] - dark[k]) * sh;
    img.data[o + 3] = a * 255;
  }
  g.putImageData(img, 0, 0);
  return cv;
}
/** Bilinear field sample at map pixel (x, y). */
function valueAtB(f: Field, x: number, y: number) {
  const fx = Math.max(0, Math.min(f.gw - 1.001, (x / T + f.pad) * f.N - 0.5)), fy = Math.max(0, Math.min(f.gh - 1.001, (y / T + f.pad) * f.N - 0.5));
  const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j, v = f.v, w = f.gw;
  return (v[j * w + i] * (1 - tx) + v[j * w + i + 1] * tx) * (1 - ty) + (v[(j + 1) * w + i] * (1 - tx) + v[(j + 1) * w + i + 1] * tx) * ty;
}
const valueAt = (f: Field, x: number, y: number) => {
  const i = Math.round((x / T + f.pad) * f.N - 0.5), j = Math.round((y / T + f.pad) * f.N - 0.5);
  return f.v[Math.max(0, Math.min(f.gh - 1, j)) * f.gw + Math.max(0, Math.min(f.gw - 1, i))];
};


// ---------- built objects ----------
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
    // a road also runs into a ford (浅瀬) so the crossing reads as one route
    let links = DIRS.filter(([dx, dy]) => (road(x + dx, y + dy) && !(ch === 'C' && map[y + dy][x + dx] === 'C')) || map[y + dy]?.[x + dx] === 'P');
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

/** A soft-edged stroke without shadowBlur (slow on big canvases): stacked strokes, wide and faint to narrow. */
function softStroke(c: C2D, p: Path2D, rgb: string, width: number, spread: number, alpha = 1) {
  const n = 4;
  for (let i = 0; i < n; i++) {
    c.strokeStyle = `rgba(${rgb},${(alpha / n) * (i + 1) * 0.6})`; c.lineWidth = width + spread * (1 - i / (n - 1)); c.stroke(p);
  }
  c.strokeStyle = `rgba(${rgb},${alpha})`; c.lineWidth = width; c.stroke(p);
}
/** Shift a path by (dx, dy). */
function moved(p: Path2D, dx: number, dy: number) {
  const q = new Path2D(); q.addPath(p, new DOMMatrix([1, 0, 0, 1, dx, dy])); return q;
}

// ---------- terrain layer ----------
export function drawTerrain(c: C2D, map: string[]) {
  const cols = map[0].length, rows = map.length, W = cols * T, H = rows * T;
  const seed = hashStr(map.join('/'));
  const R = rng(seed);
  const noise = makeNoise(R);
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < cols && y < rows ? map[y][x] : '');
  /** Same as `at`, but off-map positions repeat the nearest edge tile (ranges and rivers run off the map). */
  const atC = (x: number, y: number) => map[Math.max(0, Math.min(rows - 1, y))][Math.max(0, Math.min(cols - 1, x))];
  const tileR = (x: number, y: number, salt = '') => rng(hashStr(`${seed}:${salt}${x},${y}`));
  const area = (W * H) / (864 * 576);
  const k = T / 72, u = T / 96, blade = T / 72;
  const N4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const N8: [number, number][] = [...N4, [1, 1], [-1, 1], [1, -1], [-1, -1]];
  const near = (x: number, y: number, set: string, nb = N8) => nb.some(([dx, dy]) => set.includes(at(x + dx, y + dy)));
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round';

  // ---- grass: tonal variation from layered noise (painted small, scaled up smoothly), blades, flowers ----
  {
    const cell = 12 * u, lw = Math.ceil(W / cell) + 2, lh = Math.ceil(H / cell) + 2;
    const small = canvas(lw, lh), sg = small.getContext('2d')!, img = sg.createImageData(lw, lh);
    const stops: [number, [number, number, number]][] = [[-1, [70, 138, 66]], [-0.35, [92, 160, 80]], [0.1, [108, 178, 90]], [0.5, [132, 198, 104]], [1, [150, 196, 104]]];
    const ramp = (v: number) => {
      for (let i = 1; i < stops.length; i++) if (v <= stops[i][0]) {
        const [a, ca] = stops[i - 1], [b, cb] = stops[i], t = (v - a) / (b - a);
        return [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t];
      }
      return stops[stops.length - 1][1];
    };
    for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
      const tx = (i * cell) / T, ty = (j * cell) / T;
      let v = noise(tx * 0.55, ty * 0.55) * 0.65 + noise(tx * 1.6 + 11, ty * 1.6 + 7) * 0.35 + noise(tx * 4.1 + 3, ty * 4.1 + 19) * 0.18;
      v += (tx / cols - ty / rows) * 0.25; // a little lighter toward the top-right light
      const dry = Math.max(0, noise(tx * 0.8 + 31, ty * 0.8 + 41) - 0.35) * 1.6;
      const [r0, g0, b0] = ramp(Math.max(-1, Math.min(1, v)));
      const o = (j * lw + i) * 4;
      img.data[o] = r0 + (188 - r0) * dry * 0.45; img.data[o + 1] = g0 + (190 - g0) * dry * 0.3; img.data[o + 2] = b0 + (96 - b0) * dry * 0.45; img.data[o + 3] = 255;
    }
    sg.putImageData(img, 0, 0);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage(small, 0, 0, lw, lh, -cell / 2, -cell / 2, lw * cell, lh * cell);
  }
  // blades and flower dots: painted once on a 5×5-tile swatch and laid as a pattern (cheap on big maps;
  // the noise tones underneath and the decorations hide the repeat)
  {
    const PS = Math.round(T * 5), sw0 = canvas(PS, PS), pg = sw0.getContext('2d')!, PR = rng(seed ^ 0x9e37);
    pg.lineCap = 'round';
    const bl = [new Path2D(), new Path2D()];
    for (let i = 0; i < 1100 * 25 / 54; i++) {
      const x = PR() * PS, y = PR() * PS, l = (3 + PR() * 5) * blade, p = bl[PR() < 0.5 ? 0 : 1];
      for (const [ox, oy] of [[0, 0], [-PS, 0], [0, -PS], [-PS, -PS]]) if ((ox === 0 || x > PS - 12 * blade) && (oy === 0 || y > PS - 12 * blade)) {
        p.moveTo(x + ox, y + oy); p.quadraticCurveTo(x + ox + 2 * blade, y + oy - l * 0.6, x + ox + (PR() - 0.5) * 4 * blade, y + oy - l);
      }
    }
    pg.lineWidth = 1.4 * blade;
    pg.strokeStyle = 'rgba(170,230,130,.45)'; pg.stroke(bl[0]);
    pg.strokeStyle = 'rgba(45,110,55,.4)'; pg.stroke(bl[1]);
    c.save(); c.fillStyle = c.createPattern(sw0, 'repeat')!; c.fillRect(0, 0, W, H); c.restore();
    // flower meadows: clusters of tiny dots where a slow noise is high
    const fl = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < 260 * area; i++) {
      const x = R() * W, y = R() * H;
      if (noise(x / T * 0.7 + 50, y / T * 0.7 + 50) < 0.2) continue;
      fl[i % 4].moveTo(x + 1.7 * blade, y); fl[i % 4].arc(x, y, 1.7 * blade, 0, 7);
    }
    ['#fff6c8', '#ffd0e0', '#e6f0ff', '#ffe27a'].forEach((col, i) => { c.fillStyle = col; c.fill(fl[i]); });
  }

  // ---- soft ground patches: only the blurred shadow of the shape is drawn (shape sits off-canvas) ----
  // Painted at quarter size and scaled up: the blur is the same to the eye and far cheaper on big maps.
  const SQ = 4, sw = Math.ceil(W / SQ), sh = Math.ceil(H / SQ), softCv = canvas(sw, sh), sc = softCv.getContext('2d')!;
  // Several patches can be painted before one `flush` copies them onto the map.
  // `set` = the tile kinds the shape covers: only their bounding box (plus a margin) is copied back.
  let dirty: number[] | null = null;
  const soft = (p: Path2D, col: string, blur: number, set: string, flush = true) => {
    const b = boxOf(map, set);
    if (b) {
      const off = sw + sh + 4 * T;
      sc.save(); sc.translate(-off, 0); sc.scale(1 / SQ, 1 / SQ); sc.fillStyle = '#000'; sc.shadowColor = col; sc.shadowBlur = blur / SQ; sc.shadowOffsetX = off; sc.fill(p, 'evenodd'); sc.restore();
      dirty = dirty ? [Math.min(dirty[0], b[0]), Math.min(dirty[1], b[1]), Math.max(dirty[2], b[2]), Math.max(dirty[3], b[3])] : b;
    }
    if (flush && dirty) {
      const x0 = Math.max(0, Math.floor((dirty[0] - 1) * T / SQ)), y0 = Math.max(0, Math.floor((dirty[1] - 1) * T / SQ));
      const x1 = Math.min(sw, Math.ceil((dirty[2] + 2) * T / SQ)), y1 = Math.min(sh, Math.ceil((dirty[3] + 2) * T / SQ));
      if (x1 > x0 && y1 > y0) c.drawImage(softCv, x0, y0, x1 - x0, y1 - y0, x0 * SQ, y0 * SQ, (x1 - x0) * SQ, (y1 - y0) * SQ);
      sc.clearRect(0, 0, sw, sh); dirty = null;
    }
  };
  const shapeOf = (test: Test, sigma: number, th: number, amp = 0.08, N = 6) => {
    const f = buildField(map, test, N, sigma, { noise, amp });
    return { f, p: toPath(contours(f, th)) };
  };
  // dirt around the camp and the village, trampled ground
  const dirt = shapeOf(ch => ch === 'N' || ch === 'D' || ch === 'U', 0.45, 0.33, 0.12);
  soft(dirt.p, 'rgba(150,120,72,.55)', T * 0.5, 'NDU', false);
  const forest = shapeOf(ch => ch === 'F', 0.3, 0.42);
  soft(forest.p, 'rgba(28,86,44,.5)', T * 0.3, 'F', false);
  const bushes = shapeOf(ch => ch === 'Y', 0.3, 0.4);
  soft(bushes.p, 'rgba(40,100,50,.35)', T * 0.35, 'Y', false);
  const mtn = shapeOf(ch => ch === 'M' || ch === 'X', 0.34, 0.32);
  soft(mtn.p, 'rgba(126,112,84,.85)', T * 0.3, 'MX');
  c.save(); c.clip(mtn.p, 'evenodd');
  for (let i = 0; i < 420 * area; i++) {
    const x = R() * W, y = R() * H;
    if (valueAt(mtn.f, x, y) < 0.36) continue;
    c.fillStyle = R() < 0.5 ? 'rgba(90,75,60,.35)' : 'rgba(230,220,190,.3)'; c.beginPath(); c.ellipse(x, y, (1.5 + R() * 3) * blade, (1 + R() * 1.5) * blade, 0, 0, 7); c.fill();
  }
  c.restore();

  // ---- flat decorations on open grass (dirt spots, flower beds); upright ones are collected below ----
  const objs: { y: number; draw: () => void }[] = [];
  const put = (y: number, draw: () => void) => objs.push({ y, draw });
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (map[y][x] !== 'G') continue;
    const r = tileR(x, y, 'flat');
    if (r() < 0.07) {
      const px = (x + 0.2 + r() * 0.6) * T, py = (y + 0.2 + r() * 0.6) * T, rx = (0.12 + r() * 0.12) * T;
      const g = c.createRadialGradient(px, py, 0, px, py, rx);
      g.addColorStop(0, 'rgba(150,118,74,.55)'); g.addColorStop(0.7, 'rgba(150,118,74,.3)'); g.addColorStop(1, 'rgba(150,118,74,0)');
      c.fillStyle = g; c.beginPath(); c.ellipse(px, py, rx, rx * 0.6, 0, 0, 7); c.fill();
      for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(110,90,70,.5)'; c.beginPath(); c.arc(px + (r() - 0.5) * rx, py + (r() - 0.5) * rx * 0.5, 1.4 * u, 0, 7); c.fill(); }
    }
  }

  // ---- fields (畑): tilled rows, half overgrown ----
  const farm = shapeOf(ch => ch === 'A', 0.12, 0.5, 0.05, 8);
  if (hasAny(map, 'A')) {
    c.save();
    c.strokeStyle = 'rgba(60,95,45,.45)'; c.lineWidth = T * 0.12; c.stroke(farm.p);
    c.fillStyle = '#8f6a40'; c.fill(farm.p, 'evenodd');
    c.clip(farm.p, 'evenodd');
    const comp = components(map, 'A');
    for (const cp of comp) {
      const r = tileR(cp.minX, cp.minY, 'farm'), horiz = r() < 0.5;
      const x0 = cp.minX * T - T, x1 = (cp.maxX + 2) * T, y0 = cp.minY * T - T, y1 = (cp.maxY + 2) * T;
      const sp = T / 6.5;
      for (let v = horiz ? y0 : x0; v < (horiz ? y1 : x1); v += sp) {
        const line = (o: number, col: string, w: number) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); if (horiz) { c.moveTo(x0, v + o); c.lineTo(x1, v + o); } else { c.moveTo(v + o, y0); c.lineTo(v + o, y1); } c.stroke(); };
        line(0, 'rgba(70,46,24,.55)', T * 0.035);
        line(sp * 0.45, 'rgba(196,158,104,.45)', T * 0.03);
        // crops / weeds along the ridge
        for (let s = (horiz ? x0 : y0); s < (horiz ? x1 : y1); s += T * 0.09) {
          const q = r();
          if (q < 0.5) continue;
          const px = horiz ? s + r() * 4 : v + sp * 0.45, py = horiz ? v + sp * 0.45 : s + r() * 4;
          const tx = Math.floor(px / T), ty = Math.floor(py / T);
          if (at(tx, ty) !== 'A') continue;
          const wild = noise(px / T * 1.3 + 9, py / T * 1.3 + 9) > 0;
          c.strokeStyle = wild ? (q < 0.8 ? '#5f9a44' : '#86bf5a') : (q < 0.8 ? '#c9b064' : '#e0cd84'); c.lineWidth = 1.5 * u;
          c.beginPath(); c.moveTo(px - 2 * u, py); c.lineTo(px - 3 * u, py - 5 * u); c.moveTo(px, py); c.lineTo(px, py - 7 * u); c.moveTo(px + 2 * u, py); c.lineTo(px + 3.5 * u, py - 5 * u); c.stroke();
        }
      }
    }
    c.restore();
    c.strokeStyle = '#6e5232'; c.lineWidth = 2.2 * u; c.stroke(farm.p);
  }

  // ---- hills (丘): raised lighter ground with terraced contours and slope hachures ----
  if (hasAny(map, 'H')) {
    const hf = buildField(map, ch => ch === 'H', 6, 0.3, { noise, amp: 0.07 });
    const hp = toPath(contours(hf, 0.4));
    soft(moved(hp, T * 0.05, T * 0.1), 'rgba(30,60,30,.5)', T * 0.16, 'H');
    // height: a dome per hill tile (summed, softly capped) with a little noise, so each hill rounds up
    const hills: [number, number][] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (map[y][x] === 'H') hills.push([(x + 0.5 + noise(x * 3.1, y * 3.1) * 0.15) * T, (y + 0.45 + noise(x * 2.3 + 5, y * 2.3) * 0.12) * T]);
    const s2 = 2 * (T * 0.5) ** 2;
    const height = (px: number, py: number) => {
      let h = 0;
      for (const [hx, hy] of hills) { const dx = px - hx, dy = py - hy; if (Math.abs(dx) < T * 1.6 && Math.abs(dy) < T * 1.6) h += Math.exp(-(dx * dx + dy * dy) / s2); }
      return 1 - Math.exp(-1.6 * h) + noise(px / T * 2, py / T * 2) * 0.04;
    };
    const hx = hills.map(h => h[0]), hy = hills.map(h => h[1]);
    const box = [Math.min(...hx) - T * 1.2, Math.min(...hy) - T * 1.2, Math.max(...hx) + T * 1.2, Math.max(...hy) + T * 1.2];
    const rc = relief(hf, 0.4, W, H, [60, 110, 52], [206, 240, 160], 0.3, height, box), rk = rc.width / W;
    const bx = Math.max(0, Math.floor(box[0] * rk)), by = Math.max(0, Math.floor(box[1] * rk)), bw = Math.min(rc.width, Math.ceil(box[2] * rk)) - bx, bh = Math.min(rc.height, Math.ceil(box[3] * rk)) - by;
    if (bw > 0 && bh > 0) c.drawImage(rc, bx, by, bw, bh, bx / rk, by / rk, bw / rk, bh / rk);
    c.save(); c.clip(hp, 'evenodd');
    for (const th of [0.62, 0.8]) { c.strokeStyle = 'rgba(70,120,55,.3)'; c.lineWidth = 1.5 * u; c.stroke(toPath(contours(hf, th))); }
    // hachures: short strokes down the slope; dark on the south-east, light on the north-west
    const gr = (x: number, y: number) => [valueAt(hf, x + 4, y) - valueAt(hf, x - 4, y), valueAt(hf, x, y + 4) - valueAt(hf, x, y - 4)];
    for (let i = 0; i < 26 * hills.length; i++) {
      const x = box[0] + R() * (box[2] - box[0]), y = box[1] + R() * (box[3] - box[1]), v = valueAt(hf, x, y);
      if (v < 0.4 || v > 0.62) continue;
      const [gx, gy] = gr(x, y), m = Math.hypot(gx, gy);
      if (m < 1e-3) continue;
      const nx = -gx / m, ny = -gy / m, sun = nx * 0.55 + ny * 0.83;
      if (Math.abs(sun) < 0.25) continue;
      c.strokeStyle = sun > 0 ? 'rgba(40,85,40,.45)' : 'rgba(230,255,200,.45)'; c.lineWidth = 1.5 * u;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + nx * 7 * u, y + ny * 7 * u); c.stroke();
    }
    c.restore();
    c.strokeStyle = 'rgba(48,92,42,.7)'; c.lineWidth = 2.2 * u; c.stroke(hp);
  }

  // ---- ruins ground (廃墟): broken paving with grass in the cracks ----
  if (hasAny(map, 'U')) {
    const up = shapeOf(ch => ch === 'U', 0.3, 0.4, 0.22, 6).p;
    soft(up, 'rgba(140,128,104,.55)', T * 0.2, 'U');
    c.save(); c.clip(up, 'evenodd');
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!'UZ'.includes(map[y][x]) && !near(x, y, 'U', N4)) continue;
      const r = tileR(x, y, 'pave');
      for (let j = -0.1; j < 1.1; j += 0.2) for (let i = -0.1 + (Math.round(j * 5) % 2) * 0.12; i < 1.1; i += 0.24) {
        const px = (x + i) * T, py = (y + j) * T;
        if (r() < 0.35 || noise(px / T * 2.2 + 70, py / T * 2.2) < -0.25) continue;
        const w = T * (0.17 + r() * 0.05), h = T * (0.13 + r() * 0.04), a = (r() - 0.5) * 0.3;
        c.save(); c.translate(px, py); c.rotate(a);
        c.fillStyle = ['#cfc6b2', '#bdb39e', '#d8d0bd'][Math.floor(r() * 3)]; c.strokeStyle = 'rgba(70,60,50,.6)'; c.lineWidth = 1.3 * u;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(w, r() * 2 * u); c.lineTo(w - r() * 3 * u, h); c.lineTo(r() * 2 * u, h - r() * 2 * u); c.closePath(); c.fill(); c.stroke();
        c.restore();
      }
    }
    c.restore();
  }

  // ---- road: a band through connected road tiles, with wheel ruts, pebbles and grassy edges ----
  const roadP = roadPath(map, noise);
  c.strokeStyle = 'rgba(60,90,40,.3)'; c.lineWidth = T * 0.8; c.stroke(roadP);
  c.strokeStyle = '#8f7a50'; c.lineWidth = T * 0.7; c.stroke(roadP);
  c.strokeStyle = '#d4b985'; c.lineWidth = T * 0.62; c.stroke(roadP);
  softStroke(c, roadP, '227,204,154', T * 0.42, T * 0.12);
  // ruts: a darker band with the middle painted back
  c.save(); c.setLineDash([T * 0.9, T * 0.18, T * 0.5, T * 0.12]);
  c.strokeStyle = 'rgba(150,118,72,.6)'; c.lineWidth = T * 0.4; c.stroke(roadP);
  c.restore();
  c.strokeStyle = '#dcc493'; c.lineWidth = T * 0.33; c.stroke(roadP);
  softStroke(c, roadP, '230,210,164', T * 0.14, T * 0.08);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!isRoad(map[y][x]) || map[y][x] === 'B') continue;
    const r = tileR(x, y, 'road');
    for (let i = 0; i < 7; i++) {
      const px = (x + 0.5 + (r() - 0.5) * 1.0) * T, py = (y + 0.5 + (r() - 0.5) * 1.0) * T;
      c.lineWidth = T * 0.6;
      if (!c.isPointInStroke(roadP, px, py)) continue;
      c.lineWidth = T * 0.5;
      const edge = !c.isPointInStroke(roadP, px, py);
      if (edge && r() < 0.6) { O.tuft(c, px, py + 3 * u, 0.6 * u, r, '#4f8f3e', '#8fcc6a'); continue; }
      c.fillStyle = r() < 0.5 ? 'rgba(140,110,70,.4)' : 'rgba(255,245,210,.5)';
      c.beginPath(); c.ellipse(px, py, (1.5 + r() * 2.2) * blade, (1 + r()) * blade, 0, 0, 7); c.fill();
    }
  }

  // ---- water: grassy bank, sand, deep edge, bright centre, flow lines; shallows (浅瀬) are lighter with pebbles ----
  const waterF = buildField(map, isWater, 6, 0.22, { noise, amp: 0.07, floor: 0.35 });
  const waterP = toPath(contours(waterF, 0.32));
  c.strokeStyle = 'rgba(40,80,40,.45)'; c.lineWidth = T * 0.36; c.stroke(waterP);
  c.strokeStyle = '#4f8f52'; c.lineWidth = T * 0.28; c.stroke(waterP);
  c.strokeStyle = '#c9b98a'; c.lineWidth = T * 0.19; c.stroke(waterP);
  c.save(); c.setLineDash([2 * blade, 7 * blade]); c.strokeStyle = 'rgba(120,100,60,.5)'; c.lineWidth = T * 0.15; c.stroke(waterP); c.restore();
  c.fillStyle = '#5aaaea'; c.fill(waterP, 'evenodd');
  c.save(); c.clip(waterP, 'evenodd');
  // depth: darker toward the middle of wide water
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (map[y][x] !== 'W') continue;
    const deep = N4.filter(([dx, dy]) => isWater(atC(x + dx, y + dy))).length;
    if (deep >= 3) { const g = c.createRadialGradient((x + 0.5) * T, (y + 0.5) * T, 0, (x + 0.5) * T, (y + 0.5) * T, T * 0.8); g.addColorStop(0, 'rgba(30,90,170,.28)'); g.addColorStop(1, 'rgba(30,90,170,0)'); c.fillStyle = g; c.fillRect((x - 0.3) * T, (y - 0.3) * T, T * 1.6, T * 1.6); }
  }
  softStroke(c, waterP, '63,147,220', T * 0.7, T * 0.3);
  softStroke(c, waterP, '47,120,200', T * 0.22, T * 0.08);
  // shallows
  if (hasAny(map, 'P')) {
    // a light band across the river from bank to bank (we are inside the water clip), fading along the flow
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (map[y][x] !== 'P') continue;
      const r = tileR(x, y, 'ford');
      const vert = isWater(atC(x, y - 1)) || isWater(atC(x, y + 1)); // river runs north–south: cross west–east
      const g = vert ? c.createLinearGradient(0, y * T, 0, (y + 1) * T) : c.createLinearGradient(x * T, 0, (x + 1) * T, 0);
      g.addColorStop(0, 'rgba(160,225,238,0)'); g.addColorStop(0.25, 'rgba(160,225,238,.92)'); g.addColorStop(0.75, 'rgba(160,225,238,.92)'); g.addColorStop(1, 'rgba(160,225,238,0)');
      c.fillStyle = g;
      if (vert) c.fillRect((x - 0.5) * T, y * T, T * 2, T); else c.fillRect(x * T, (y - 0.5) * T, T, T * 2);
      const along = (a: number, b: number): [number, number] => vert ? [(x - 0.3 + a * 1.6) * T, (y + 0.2 + b * 0.6) * T] : [(x + 0.2 + b * 0.6) * T, (y - 0.3 + a * 1.6) * T];
      for (let i = 0; i < 22; i++) {
        const [px, py] = along(r(), r()), rr = (2.5 + r() * 4) * u;
        c.fillStyle = ['#c9b58e', '#a8977a', '#d8cba8'][i % 3]; c.strokeStyle = 'rgba(60,70,80,.45)'; c.lineWidth = 1 * u;
        c.beginPath(); c.ellipse(px, py, rr, rr * 0.7, r(), 0, 7); c.fill(); c.stroke();
      }
      // stepping stones from bank to bank
      for (let i = 0; i < 5; i++) {
        const [px, py] = along(0.1 + i * 0.2 + (r() - 0.5) * 0.05, 0.5 + (r() - 0.5) * 0.4);
        O.rock(c, px, py + 4 * u, 1.05 * u, r, 8);
      }
    }
  }
  // flow lines follow the river's direction
  c.lineCap = 'round';
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const ch = map[y][x];
    if (ch !== 'W' && ch !== 'P') continue;
    const r = tileR(x, y, 'flow');
    const horiz = isWater(atC(x - 1, y)) || isWater(atC(x + 1, y)) ? !(isWater(atC(x, y - 1)) && isWater(atC(x, y + 1))) : false;
    c.strokeStyle = ch === 'P' ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.55)'; c.lineWidth = 2 * blade;
    for (let i = 0; i < 3; i++) {
      const px = (x + 0.15 + r() * 0.6) * T, py = (y + 0.15 + r() * 0.7) * T, l = (8 + r() * 16) * blade;
      c.beginPath();
      if (horiz) { c.moveTo(px, py); c.quadraticCurveTo(px + l / 2, py - 3 * blade, px + l, py); }
      else { c.moveTo(px, py); c.quadraticCurveTo(px + 3 * blade, py + l / 2, px, py + l); }
      c.stroke();
    }
    if (ch === 'W' && r() < 0.5) {
      c.strokeStyle = 'rgba(200,235,255,.35)'; c.lineWidth = 5 * blade;
      const px = (x + 0.3 + r() * 0.4) * T, py = (y + 0.3 + r() * 0.4) * T;
      c.beginPath(); if (horiz) { c.moveTo(px - 10 * blade, py); c.lineTo(px + 10 * blade, py); } else { c.moveTo(px, py - 10 * blade); c.lineTo(px, py + 10 * blade); } c.stroke();
    }
  }
  // foam along the banks
  c.save(); c.setLineDash([3 * blade, 9 * blade]); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2 * blade; c.stroke(waterP); c.restore();
  c.restore();

  // bridges
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (map[y][x] !== 'B') continue;
    const land = (ch: string) => ch !== '' && !isWater(ch);
    const h = land(at(x - 1, y)) || land(at(x + 1, y)) || at(x - 1, y) === 'B' || at(x + 1, y) === 'B';
    const v = land(at(x, y - 1)) || land(at(x, y + 1));
    bridge(c, x * T, y * T, h || !v);
  }

  // ---- cliffs (崖): a raised rocky plateau; the sheer face shows on its south side ----
  if (hasAny(map, 'X')) {
    const xp = shapeOf(ch => ch === 'X', 0.2, 0.45, 0.16, 8).p, fh = T * 0.36;
    soft(moved(xp, T * 0.08, T * 0.06), 'rgba(20,20,10,.5)', T * 0.12, 'X');
    const fg = c.createLinearGradient(0, 0, 0, H); fg.addColorStop(0, '#8b7c6c'); fg.addColorStop(1, '#6a5c52');
    c.fillStyle = fg; c.fill(xp, 'evenodd');
    c.save(); c.clip(xp, 'evenodd');
    // face striations and ledges
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (map[y][x] !== 'X') continue;
      const r = tileR(x, y, 'cliff');
      for (let i = 0; i < 9; i++) {
        const px = (x + r()) * T, py = (y + 0.55 + r() * 0.45) * T;
        c.strokeStyle = r() < 0.5 ? 'rgba(45,35,35,.5)' : 'rgba(220,205,180,.35)'; c.lineWidth = 1.6 * u;
        c.beginPath(); c.moveTo(px, py - T * 0.1); c.lineTo(px + (r() - 0.5) * 4 * u, py + T * 0.14); c.stroke();
      }
    }
    const topP = moved(xp, 0, -fh);
    const tg = c.createLinearGradient(0, 0, W * 0.4, H); tg.addColorStop(0, '#b4b880'); tg.addColorStop(1, '#949a68');
    c.fillStyle = tg; c.fill(topP, 'evenodd');
    c.save(); c.clip(topP, 'evenodd');
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (map[y][x] !== 'X') continue;
      const r = tileR(x, y, 'ctop');
      for (let i = 0; i < 6; i++) { c.fillStyle = r() < 0.5 ? 'rgba(90,120,60,.5)' : 'rgba(120,105,85,.45)'; c.beginPath(); c.ellipse((x + r()) * T, (y + r() * 0.7) * T, (3 + r() * 7) * u, (2 + r() * 3) * u, 0, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(70,60,50,.5)'; c.lineWidth = 1.4 * u;
      const sx = (x + 0.2 + r() * 0.5) * T, sy = (y + 0.15 + r() * 0.3) * T;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + 8 * u, sy + 5 * u); c.lineTo(sx + 6 * u, sy + 12 * u); c.stroke();
    }
    c.restore();
    c.strokeStyle = OUT; c.lineWidth = 2.6 * u; c.stroke(topP);
    c.restore();
    c.strokeStyle = OUT; c.lineWidth = 2.6 * u; c.stroke(xp);
  }

  // ---- upright objects ----
  // mountains: peaks per connected range
  buildPeaks(map, seed).forEach(p => put(p.y, () => O.peak(c, p, rng(p.seed))));
  const TREE_SPOTS = [[0.22, 0.52, 0.8], [0.72, 0.48, 0.85], [0.47, 0.8, 1], [0.84, 0.88, 0.76], [0.14, 0.92, 0.72]];
  /** Neighbours of the same structure; on the map border a straight run continues off the map. */
  const links = (x: number, y: number, set: string) => {
    const has = (dx: number, dy: number) => set.includes(at(x + dx, y + dy));
    const off = (dx: number, dy: number) => at(x + dx, y + dy) === '' && has(-dx, -dy);
    return { n: has(0, -1) || off(0, -1), s: has(0, 1) || off(0, 1), e: has(1, 0) || off(1, 0), w: has(-1, 0) || off(-1, 0) };
  };
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const ch = map[y][x], r = tileR(x, y, 'obj');
    if (ch === 'F') {
      for (const [a, b, s] of TREE_SPOTS) {
        const tx = (x + a + (r() - 0.5) * 0.1) * T, ty = (y + b + (r() - 0.5) * 0.06) * T, sc = s * k * (0.92 + r() * 0.16), q = r();
        put(ty, q < 0.2 ? () => O.pine(c, tx, ty, sc) : () => O.tree(c, tx, ty, sc, rng(hashStr(`${x},${y},${a}`))));
      }
    } else if (ch === 'C') {
      const fx = (x + 0.5) * T, fy = (y + 0.46) * T;
      put((y + 0.995) * T, () => fort(c, fx, fy, k * 1.12)); // in front of neighbouring peaks
    } else if (ch === 'D') {
      const hx = (x + 0.5 + (r() - 0.5) * 0.06) * T, hy = (y + 0.84) * T, ruined = r() < 0.6;
      put(hy, () => O.house(c, hx, hy, u * 1.12, rng(hashStr(`h${x},${y}`)), ruined));
    } else if (ch === 'N') {
      const tx = (x + 0.42 + (r() - 0.5) * 0.1) * T, ty = (y + 0.78) * T;
      put(ty, () => O.tent(c, tx, ty, u * 1.05, rng(hashStr(`t${x},${y}`))));
    } else if (ch === 'U') {
      const breach = at(x - 1, y) === 'Z' || at(x + 1, y) === 'Z' || at(x, y - 1) === 'Z' || at(x, y + 1) === 'Z';
      const rx = (x + 0.5 + (r() - 0.5) * 0.1) * T, ry = (y + 0.78) * T, v = breach ? 3 : Math.floor(r() * 3);
      put(ry, () => O.ruin(c, rx, ry, u * 1.1, rng(hashStr(`u${x},${y}`)), v));
    } else if (ch === 'Z') {
      const L = links(x, y, 'Z');
      put((y + 0.92) * T, () => O.wallTile(c, x, y, L, rng(hashStr(`z${x},${y}`))));
    } else if (ch === 'L') {
      const L = links(x, y, 'L');
      put((y + 0.62) * T, () => O.fenceTile(c, x, y, L, rng(hashStr(`l${x},${y}`))));
    } else if (ch === 'Y') {
      const spots = [[0.25, 0.42], [0.72, 0.38], [0.5, 0.7], [0.2, 0.9], [0.8, 0.88]];
      for (const [a, b] of spots) {
        if (r() < 0.15) continue;
        const sx = (x + a + (r() - 0.5) * 0.12) * T, sy = (y + b + (r() - 0.5) * 0.06) * T, sc = u * (1.05 + r() * 0.35), berry = r() < 0.3;
        put(sy, () => O.shrub(c, sx, sy, sc, rng(hashStr(`y${x},${y},${a}`)), { berry }));
      }
      for (let i = 0; i < 3; i++) { const sx = (x + 0.1 + r() * 0.8) * T, sy = (y + 0.2 + r() * 0.75) * T; put(sy, () => O.tuft(c, sx, sy, u * 1.1, rng(hashStr(`yt${x},${y},${i}`)), '#2f6f34', '#6fb85a')); }
    } else if (ch === 'M') {
      // boulders on the skirt of edge tiles
      if (N4.some(([dx, dy]) => { const n = at(x + dx, y + dy); return n !== '' && n !== 'M'; }) && r() < 0.6) {
        const rx = (x + 0.15 + r() * 0.7) * T, ry = (y + 0.96) * T, s = u * (0.9 + r() * 0.5);
        put(ry, () => O.rock(c, rx, ry, s, rng(hashStr(`mr${x},${y}`)), -10));
      }
    } else if (ch === 'H') {
      if (r() < 0.35) { const rx = (x + 0.2 + r() * 0.6) * T, ry = (y + 0.25 + r() * 0.2) * T; put(ry, () => O.rock(c, rx, ry, u * 0.7, rng(hashStr(`hr${x},${y}`)))); }
      if (r() < 0.5) { const tx = (x + 0.15 + r() * 0.7) * T, ty = (y + 0.85) * T; put(ty, () => O.tuft(c, tx, ty, u, rng(hashStr(`ht${x},${y}`)))); }
    } else if (ch === 'A') {
      if (r() < 0.12) { const sx = (x + 0.8) * T, sy = (y + 0.3) * T; put(sy, () => O.scarecrow(c, sx, sy, u * 1.1)); }
    } else if (ch === 'G') {
      decorate(x, y);
    }
  }
  /** Decorations for one grass tile: blend into neighbouring terrain, then a little generic clutter. Off-centre, small. */
  function decorate(x: number, y: number) {
    const r = tileR(x, y, 'deco');
    const corner = (): [number, number] => {
      const q = Math.floor(r() * 4);
      return [(x + (q % 2 ? 0.78 : 0.2) + (r() - 0.5) * 0.12) * T, (y + (q < 2 ? 0.3 : 0.88) + (r() - 0.5) * 0.08) * T];
    };
    // along the sides shared with other terrain
    for (const [dx, dy] of N4) {
      const n = at(x + dx, y + dy);
      if (!n) continue;
      const along = () => 0.2 + r() * 0.6;
      const edgePt = (inset: number): [number, number] => dx ? [(x + (dx > 0 ? 1 - inset : inset)) * T, (y + along()) * T] : [(x + along()) * T, (y + (dy > 0 ? 1 - inset : inset)) * T];
      if (n === 'F') {
        const m = 1 + Math.floor(r() * 2);
        for (let i = 0; i < m; i++) { const [px, py] = edgePt(0.1 + r() * 0.06), s = u * (0.55 + r() * 0.3), d = r() < 0.25; put(py, () => O.shrub(c, px, py, s, rng(hashStr(`fe${x},${y},${dx},${dy},${i}`)), { dry: d })); }
        if (r() < 0.25) { const [px, py] = edgePt(0.22), s = u * 0.8; put(py, () => O.stump(c, px, py, s)); }
      } else if (n === 'W' && r() < 0.75) {
        const m = 1 + Math.floor(r() * 2);
        for (let i = 0; i < m; i++) { const [px, py] = edgePt(0.16 + r() * 0.06), s = u * (0.85 + r() * 0.3); put(py, () => O.reeds(c, px, py, s, rng(hashStr(`rd${x},${y},${dx},${dy},${i}`)))); }
      } else if ((n === 'M' || n === 'X') && r() < 0.55) {
        const [px, py] = edgePt(0.14), s = u * (0.7 + r() * 0.5); put(py, () => O.rock(c, px, py, s, rng(hashStr(`mrk${x},${y},${dx},${dy}`)), -6));
      } else if (n === 'Y' && r() < 0.5) {
        const [px, py] = edgePt(0.12), s = u * 0.9; put(py, () => O.tuft(c, px, py, s, rng(hashStr(`yt${x},${y},${dx},${dy}`)), '#2f6f34', '#6fb85a'));
      }
    }
    if (near(x, y, 'N')) {
      const q = r();
      const [px, py] = corner(), s = u * (0.9 + r() * 0.2);
      if (q < 0.18) put(py, () => O.crate(c, px, py, s));
      else if (q < 0.32) put(py, () => O.barrel(c, px, py, s));
      else if (q < 0.44) put(py, () => O.sacks(c, px, py, s));
      else if (q < 0.54) put(py, () => O.campfire(c, px, py, s * 1.1, true));
      return;
    }
    if (near(x, y, 'DUZL')) {
      const q = r();
      const [px, py] = corner();
      if (near(x, y, 'D') && q < 0.24) { const s = u * 1.1; put(py, q < 0.05 ? () => O.well(c, px, py, s) : () => O.haystack(c, px, py, s)); }
      else if (q < 0.4) { const s = u * (0.6 + r() * 0.4); put(py, () => O.rock(c, px, py, s, rng(hashStr(`rb${x},${y}`)), 12)); }
      else if (q < 0.47) { const f = r() < 0.5; put(py, () => O.cart(c, px, py, u * 0.9, true, f)); }
      else if (q < 0.55) { const s = u; put(py, () => O.crate(c, px, py, s)); }
      return;
    }
    const q = r();
    if (q < 0.5) { const n = 1 + Math.floor(r() * 2); for (let i = 0; i < n; i++) { const [px, py] = corner(), s = u * (0.8 + r() * 0.4); put(py, () => O.tuft(c, px, py, s, rng(hashStr(`gt${x},${y},${i}`)))); } }
    const q2 = r();
    const [px, py] = corner();
    if (q2 < 0.1) put(py, () => O.flowers(c, px, py, u, rng(hashStr(`fl${x},${y}`))));
    else if (q2 < 0.17) { const s = u * (0.6 + r() * 0.4); put(py, () => O.rock(c, px, py, s, rng(hashStr(`gr${x},${y}`)))); }
    else if (q2 < 0.2) put(py, () => O.stump(c, px, py, u * 0.8));
    else if (q2 < 0.225) { const f = r() < 0.5; put(py, () => O.log(c, px, py, u * 0.85, f)); }
    else if (q2 < 0.24) put(py, () => O.campfire(c, px, py, u * 0.9, false));
    else if (q2 < 0.25) { const f = r() < 0.5; put(py, () => O.cart(c, px, py, u * 0.85, false, f)); }
  }
  objs.sort((a, b) => a.y - b.y).forEach(o => o.draw());

  // gentle light from the top-left over everything
  const lg = c.createLinearGradient(0, 0, W, H);
  lg.addColorStop(0, 'rgba(255,250,220,.08)'); lg.addColorStop(1, 'rgba(20,20,60,.10)');
  c.fillStyle = lg; c.fillRect(0, 0, W, H);
  c.restore();
}

function hasAny(map: string[], ch: string) { return map.some(r => r.includes(ch)); }
/** Tile bounding box [x0, y0, x1, y1] (inclusive, in tiles) of the kinds in `set`, or null. */
function boxOf(map: string[], set: string): number[] | null {
  let b: number[] | null = null;
  for (let y = 0; y < map.length; y++) for (let x = 0; x < map[0].length; x++) if (set.includes(map[y][x])) b = b ? [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)] : [x, y, x, y];
  return b;
}
interface Comp { tiles: [number, number][]; minX: number; maxX: number; minY: number; maxY: number }
/** 4-connected groups of tiles in `set`. */
function components(map: string[], set: string): Comp[] {
  const cols = map[0].length, rows = map.length, seen = new Uint8Array(cols * rows), out: Comp[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (seen[y * cols + x] || !set.includes(map[y][x])) continue;
    const cp: Comp = { tiles: [], minX: x, maxX: x, minY: y, maxY: y }, st: [number, number][] = [[x, y]];
    seen[y * cols + x] = 1;
    while (st.length) {
      const [a, b] = st.pop()!;
      cp.tiles.push([a, b]); cp.minX = Math.min(cp.minX, a); cp.maxX = Math.max(cp.maxX, a); cp.minY = Math.min(cp.minY, b); cp.maxY = Math.max(cp.maxY, b);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = a + dx, ny = b + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[ny * cols + nx] || !set.includes(map[ny][nx])) continue;
        seen[ny * cols + nx] = 1; st.push([nx, ny]);
      }
    }
    out.push(cp);
  }
  return out;
}
/**
 * Peaks for every mountain range. A tile's peak grows with how much mountain surrounds it (off-map counts as
 * mountain when the edge tile is one, so ranges run off the map): tiles inside a range get tall snowy peaks,
 * edge tiles lower peaks plus foothill crags, ridge and back peaks join neighbours into one massif, and a lone
 * tile becomes a rocky crag.
 */
function buildPeaks(map: string[], seed: number): O.Peak[] {
  const cols = map[0].length, rows = map.length, out: O.Peak[] = [];
  const isM = (x: number, y: number) => map[Math.max(0, Math.min(rows - 1, y))][Math.max(0, Math.min(cols - 1, x))] === 'M';
  const inM = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows && map[y][x] === 'M';
  for (const cp of components(map, 'M')) {
    const lone = cp.tiles.length === 1;
    const span = Math.max(1, cp.maxY - cp.minY);
    for (const [x, y] of cp.tiles) {
      const R = rng(hashStr(`${seed}:pk${x},${y}`));
      const far = (cp.maxY - y) / span;
      const tone = (R() - 0.5) * 14;
      if (lone) {
        out.push({ x: (x + 0.5) * T, y: (y + 0.92) * T, w: T * 0.52, h: T * 0.88, snow: false, tone, far: 0, crag: true, seed: R() * 1e9 });
        out.push({ x: (x + 0.18) * T, y: (y + 0.95) * T, w: T * 0.26, h: T * 0.4, snow: false, tone: tone - 6, far: 0, crag: true, seed: R() * 1e9 });
        out.push({ x: (x + 0.82) * T, y: (y + 0.97) * T, w: T * 0.22, h: T * 0.32, snow: false, tone: tone + 4, far: 0, crag: true, seed: R() * 1e9 });
        continue;
      }
      // mass: how much mountain surrounds this tile (5×5, inner ring weighted double) → peak size
      let mass = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (isM(x + dx, y + dy)) mass += Math.abs(dx) <= 1 && Math.abs(dy) <= 1 ? 2 : 1;
      const m = Math.max(0, Math.min(1, (mass - 6) / 28));
      const capTop = !inM(x, y - 1) && y > 0; // nothing mountainous above: keep the peak inside its tile
      let h = T * (0.72 + 1.05 * m) * (0.9 + R() * 0.25);
      if (capTop) h = Math.min(h, T * 1.0);
      const w = T * (0.64 + 0.55 * m) * (0.9 + R() * 0.2);
      const snow = h > T * 1.3 || (h > T * 1.05 && far > 0.4 && R() < 0.6);
      // back peak toward the north neighbour (bluer, behind)
      if (inM(x, y - 1) && R() < 0.55) {
        const bh = h * (0.8 + R() * 0.25);
        out.push({ x: (x + 0.5 + (R() - 0.5) * 0.6) * T, y: (y + 0.42) * T, w: w * 0.9, h: bh, snow: bh > T * 0.95, tone: tone + 8, far: Math.min(1, far + 0.35), seed: R() * 1e9 });
      }
      // ridge peak between this tile and its east neighbour (drawn behind both), so the crest line runs on
      if (inM(x + 1, y)) {
        let rh = h * (0.75 + R() * 0.2);
        if (capTop || !inM(x + 1, y - 1)) rh = Math.min(rh, T * 0.88);
        out.push({ x: (x + 1 + (R() - 0.5) * 0.2) * T, y: (y + 0.74) * T, w: w * 0.85, h: rh, snow: rh > T * 1.15, tone: tone + 5, far: Math.min(1, far + 0.2), seed: R() * 1e9 });
      }
      out.push({ x: (x + 0.5 + (R() - 0.5) * 0.2) * T, y: (y + 0.94) * T, w: w * (h > T * 1.2 ? 1.12 : 1), h, snow, tone, far, twin: m > 0.45 && R() < 0.45, seed: R() * 1e9 });
      // foothills and crags where the range meets open ground to the south, east or west
      const openS = !isM(x, y + 1), openE = !isM(x + 1, y), openW = !isM(x - 1, y);
      if (openS || openE || openW) {
        const n = R() < 0.35 ? 2 : 1;
        for (let i = 0; i < n; i++) {
          const fx = openE && !openW ? x + 0.55 + R() * 0.35 : openW && !openE ? x + 0.1 + R() * 0.35 : x + 0.12 + R() * 0.76;
          out.push({ x: fx * T, y: (y + (openS ? 1.0 : 0.97)) * T, w: T * (0.24 + R() * 0.12), h: T * (0.3 + R() * 0.16), snow: false, tone: tone - 4, far: 0, crag: R() < 0.6, seed: R() * 1e9 });
        }
      }
    }
  }
  return out;
}
