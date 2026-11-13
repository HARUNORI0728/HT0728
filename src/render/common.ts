// Shared drawing constants and small helpers for the illustrated renderer.

/** Internal pixels per map tile. The canvas shows 15×10 tiles (1440×960), sharp on high-DPI phones. */
export const T = 96;
/** Ink colour for outlines (the sample's warm near-black). */
export const OUT = '#2a1d26';

export type C2D = CanvasRenderingContext2D;

/** Small fast seeded PRNG (mulberry32). Same seed → same picture every time. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function hex(h: string): [number, number, number] {
  if (!h) return [128, 128, 128];
  if (h.startsWith('rgb')) { const m = h.match(/\d+/g)!.map(Number); return [m[0], m[1], m[2]]; }
  let s = h.slice(1);
  if (s.length === 3) s = [...s].map(ch => ch + ch).join('');
  const n = parseInt(s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Lighten (d > 0) or darken (d < 0) a colour by d on each channel. */
export function shade(h: string, d: number) {
  const [r, g, b] = hex(h), f = (v: number) => Math.max(0, Math.min(255, Math.round(v + d)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
/** Mixes two colours (t = 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number) {
  const A = hex(a), B = hex(b), f = (i: number) => Math.round(A[i] + (B[i] - A[i]) * t);
  return `rgb(${f(0)},${f(1)},${f(2)})`;
}
export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
  return c;
}
