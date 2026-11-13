// Map overlays in the sample's style: rounded translucent range tiles, a glowing cursor, damage numbers,
// vignette and edge arrows. Everything with gradients or glow is pre-rendered once and reused every frame.
import { OUT, T, canvas, type C2D } from './common';

export type TileKind = 'move' | 'attack' | 'target' | 'heal';
const K = T / 72, PAD = Math.ceil(T * 0.12);
const tiles = new Map<TileKind, HTMLCanvasElement>();
/** A tile highlight (canvas is T + 2·PAD square; draw it at tile − PAD). */
function tileImg(kind: TileKind) {
  let t = tiles.get(kind);
  if (t) return t;
  t = canvas(T + 2 * PAD, T + 2 * PAD);
  const c = t.getContext('2d')!, x = PAD + 3 * K, y = PAD + 3 * K, w = T - 6 * K, r = 10 * K;
  const P = {
    move: { fill: 'rgba(70,140,255,.32)', edge: 'rgba(185,220,255,.9)', glow: 'rgba(110,170,255,.9)' },
    attack: { fill: 'rgba(255,84,60,.22)', edge: 'rgba(255,170,150,.85)', glow: 'rgba(255,90,70,.7)' },
    target: { fill: 'rgba(255,70,55,.40)', edge: 'rgba(255,230,210,.95)', glow: 'rgba(255,80,60,1)' },
    heal: { fill: 'rgba(90,220,130,.36)', edge: 'rgba(200,255,215,.95)', glow: 'rgba(90,230,140,1)' },
  }[kind];
  // soft outer light
  c.save(); c.shadowColor = P.glow; c.shadowBlur = (kind === 'target' || kind === 'heal' ? 14 : 7) * K;
  c.strokeStyle = P.edge; c.lineWidth = (kind === 'move' ? 1.8 : 2) * K; c.beginPath(); c.roundRect(x, y, w, w, r); c.stroke(); c.restore();
  // body: brighter toward the top
  const g = c.createLinearGradient(0, y, 0, y + w); g.addColorStop(0, P.fill.replace(/[\d.]+\)$/, m => String(Math.min(1, parseFloat(m) * 1.35)) + ')')); g.addColorStop(1, P.fill);
  c.fillStyle = g; c.beginPath(); c.roundRect(x, y, w, w, r); c.fill();
  if (kind === 'attack' || kind === 'target') { // diagonal hatching: tells attack range apart from movement at a glance
    c.save(); c.beginPath(); c.roundRect(x, y, w, w, r); c.clip();
    c.strokeStyle = kind === 'attack' ? 'rgba(255,200,180,.32)' : 'rgba(255,230,220,.38)'; c.lineWidth = 3 * K;
    for (let d = -w; d < w * 2; d += 11 * K) { c.beginPath(); c.moveTo(x + d, y); c.lineTo(x + d - w, y + w); c.stroke(); }
    c.restore();
  }
  // inner highlight line
  c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 1.2 * K; c.beginPath(); c.roundRect(x + 3 * K, y + 3 * K, w - 6 * K, w - 6 * K, r * 0.7); c.stroke();
  c.strokeStyle = P.edge; c.lineWidth = 1.5 * K; c.beginPath(); c.roundRect(x, y, w, w, r); c.stroke();
  tiles.set(kind, t);
  return t;
}
export function drawTile(c: C2D, kind: TileKind, tx: number, ty: number, alpha = 1) {
  c.globalAlpha = alpha; c.drawImage(tileImg(kind), tx * T - PAD, ty * T - PAD); c.globalAlpha = 1;
}

let cursorImg: HTMLCanvasElement | null = null;
/** Glowing corner brackets around a tile; `t` (seconds) makes them breathe. */
export function drawCursor(c: C2D, tx: number, ty: number, t: number) {
  if (!cursorImg) {
    cursorImg = canvas(T + 2 * PAD, T + 2 * PAD);
    const g = cursorImg.getContext('2d')!, o = PAD, L = 20 * K;
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [lw, col, blur] of [[7 * K, 'rgba(60,40,0,.45)', 0], [4.2 * K, '#fff3b0', 12 * K]] as [number, string, number][]) {
      g.save(); g.strokeStyle = col; g.lineWidth = lw; g.shadowColor = '#ffe36a'; g.shadowBlur = blur;
      for (const [a, b, u, v] of [[2, 2, 1, 1], [T - 2, 2, -1, 1], [2, T - 2, 1, -1], [T - 2, T - 2, -1, -1]]) {
        g.beginPath(); g.moveTo(o + a + u * L, o + b); g.lineTo(o + a, o + b); g.lineTo(o + a, o + b + v * L); g.stroke();
      }
      g.restore();
    }
  }
  const s = 1 + Math.sin(t * 5) * 0.035, w = cursorImg.width * s, cx = tx * T + T / 2, cy = ty * T + T / 2;
  c.drawImage(cursorImg, cx - w / 2, cy - w / 2, w, w);
}

let vig: HTMLCanvasElement | null = null;
export function drawVignette(c: C2D, W: number, H: number) {
  if (!vig || vig.width !== W || vig.height !== H) {
    vig = canvas(W, H);
    const g = vig.getContext('2d')!, r = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(10,8,30,.36)');
    g.fillStyle = r; g.fillRect(0, 0, W, H);
  }
  c.drawImage(vig, 0, 0);
}

export interface Float { x: number; y: number; text: string; color: string; t: number }
export const FLOAT_LIFE = 40;
/** A damage / heal number rising from (x, y); t counts down from FLOAT_LIFE. */
export function drawFloat(c: C2D, f: Float) {
  const age = FLOAT_LIFE - f.t, rise = Math.min(age, 24) * 1.1 * K, pop = age < 5 ? 0.7 + age * 0.08 : 1;
  const big = /^\d+$|必殺/.test(f.text), size = (big ? 30 : 20) * K * pop;
  c.save();
  c.font = `700 ${size}px "Zen Kaku Gothic New", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`;
  c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.lineJoin = 'round';
  c.globalAlpha = f.t < 8 ? f.t / 8 : 1;
  const y = f.y - rise;
  c.lineWidth = 6 * K; c.strokeStyle = 'rgba(20,12,24,.9)'; c.strokeText(f.text, f.x, y);
  c.fillStyle = f.color; c.fillText(f.text, f.x, y);
  c.fillStyle = 'rgba(255,255,255,.35)'; c.save(); c.beginPath(); c.rect(f.x - 200, y - size, 400, size * 0.45); c.clip(); c.fillText(f.text, f.x, y); c.restore();
  c.restore();
}

/** Chevrons on the screen edges where the map continues. */
export function drawEdgeMarks(c: C2D, W: number, H: number, l: boolean, r: boolean, t: boolean, b: boolean) {
  c.save(); c.fillStyle = 'rgba(255,236,170,.92)'; c.strokeStyle = OUT; c.lineWidth = 2 * K; c.lineJoin = 'round';
  c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 6 * K;
  const a = 12 * K, m = 8 * K;
  const tri = (p: number[]) => { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.lineTo(p[4], p[5]); c.closePath(); c.fill(); c.stroke(); };
  if (l) tri([m, H / 2, m + a, H / 2 - a, m + a, H / 2 + a]);
  if (r) tri([W - m, H / 2, W - m - a, H / 2 - a, W - m - a, H / 2 + a]);
  if (t) tri([W / 2, m, W / 2 - a, m + a, W / 2 + a, m + a]);
  if (b) tri([W / 2, H - m, W / 2 - a, H - m - a, W / 2 + a, H - m - a]);
  c.restore();
}
