// Score notation for the placeholder songs (songs.ts) and its compiler into timed note events.
//
// A song is written on a grid of "units" (grid = units per beat, bar = units per bar):
//   chords:  bars separated by `|`, one or more chord symbols per bar (they split the bar evenly).
//            Symbols: C, Cm, C7, Cm7, Cmaj7, Csus4, Csus2, Cdim, Caug, Cadd9, Cmadd9, Cm7b5, C6, Cm6, C9, Cmaj9,
//            C7sus4, with an optional slash bass (C/E).
//   notes:   (melody tracks) tokens separated by spaces, `|` between bars (each bar must add up to `bar` units).
//            C5 / F#4 / Bb3 = a note (C4 = middle C), `.` = rest, `-` = hold the previous note one more unit.
//            `:n` after a token = n units (C5:3, .:2, -:2). `~` before a note = slide into it (comic clarinet).
//   arp:     (pattern tracks) one token per unit, repeated over the bar: digits index the chord tones counted up
//            from the root nearest above `low` (0 = root/bass, 1 = next chord tone …), `.` rest, `-` hold.
//   bass:    R / 3 / 5 / 7 / 8 (octave) / 9 = chord degrees from the root nearest above `low`, +N = N semitones
//            above the root, `.` rest, `-` hold.
//   stab:    x / X (accent) = the whole chord (close voicing near `low`), `.` rest, `-` hold.
//   pad:     the chord held for as long as it lasts, voice-led (each chord moves as little as possible).
//   drums:   per drum a string of one char per unit: X accent, x normal, g ghost, `.` rest, `-` hold.

export type Inst =
  | 'flute' | 'recorder' | 'oboe' | 'clarinet' | 'violin' | 'strings' | 'cello' | 'pad' | 'harp' | 'piano' | 'guitar'
  | 'pizz' | 'stacc' | 'glock' | 'celesta' | 'xylo' | 'brass' | 'horn' | 'tuba' | 'bass' | 'sub' | 'organ'
  | 'harmonic' | 'swell' | 'rain';
export type Drum = 'kick' | 'snare' | 'timp' | 'hat' | 'tick' | 'shaker' | 'taiko' | 'tamb' | 'cym' | 'heart';

interface TrackCommon {
  /** Bar ranges [from, to) the track plays in (pattern and drum tracks). Default: every bar. */
  bars?: [number, number][];
  /** Bars to leave out (e.g. the punchline bars of the comedy theme). */
  skip?: number[];
  vol?: number; pan?: number; rev?: number;
}
export interface MelodyTrack extends TrackCommon { inst: Inst; notes: string; at?: number; oct?: number }
export interface PatternTrack extends TrackCommon { inst: Inst; low: number; arp?: string; bass?: string; stab?: string; pad?: true; strum?: number }
export interface DrumTrack extends TrackCommon { drums: Partial<Record<Drum, string>> }
export type Track = MelodyTrack | PatternTrack | DrumTrack;

export interface SongDef {
  /** Beats per minute; a beat is `grid` units. */
  bpm: number; grid: number; bar: number;
  chords: string;
  tracks: Track[];
  /** Overall level trim (set from measured loudness so songs sit at the same volume). */
  gain?: number;
  /** Jingles do not loop. */
  loop?: boolean;
  /** Delay of every second unit, as a fraction of a unit (a light swing). */
  swing?: number;
}

/** One sounding note. t / d in units from the start of the song; m = MIDI note (or drum). */
export interface NoteEvent { t: number; d: number; m: number; v: number; k: number; inst: Inst | Drum; drum: boolean; glide?: boolean }
export interface Compiled { events: NoteEvent[]; units: number; unitSec: number; bars: number; def: SongDef }

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const acc = (s: string | undefined) => (s === '#' ? 1 : s === 'b' ? -1 : 0);

/** MIDI number of a note name (C4 = 60). */
export function noteNum(s: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
  if (!m) throw new Error(`音名を読めません: ${s}`);
  return (Number(m[3]) + 1) * 12 + PC[m[1]] + acc(m[2]);
}
export const freqOf = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

const QUAL: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], sus4: [0, 5, 7], sus2: [0, 2, 7],
  dim: [0, 3, 6], aug: [0, 4, 8], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], m7b5: [0, 3, 6, 10], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9],
  '9': [0, 4, 7, 10, 14], maj9: [0, 4, 7, 11, 14], '7sus4': [0, 5, 7, 10],
};
export interface Chord { name: string; root: number; iv: number[]; bass: number | null }
export function parseChord(s: string): Chord {
  const m = /^([A-G])(#|b)?([^/]*)(?:\/([A-G])(#|b)?)?$/.exec(s);
  if (!m || !(m[3] in QUAL)) throw new Error(`和音を読めません: ${s}`);
  const root = (PC[m[1]] + acc(m[2]) + 12) % 12;
  return { name: s, root, iv: QUAL[m[3]], bass: m[4] ? (PC[m[4]] + acc(m[5]) + 12) % 12 : null };
}
/** Pitch classes of a chord (for checking melodies against it). */
export const chordPcs = (c: Chord) => new Set([...c.iv.map(i => (c.root + i) % 12), ...(c.bass !== null ? [c.bass] : [])]);

/** Smallest note >= low with the given pitch class. */
const above = (pc: number, low: number) => low + ((pc - low) % 12 + 12) % 12;

/** Chord tones for arpeggios: root (or slash bass) nearest above `low`, then the chord tones upwards over 3 octaves. */
function arpTones(c: Chord, low: number): number[] {
  const r = above(c.root, low);
  const up: number[] = [];
  for (let o = 0; o < 4; o++) for (const i of c.iv) up.push(r + (i % 12) + 12 * o + (i >= 12 ? 12 : 0));
  const tones = [...new Set(up)].sort((a, b) => a - b);
  if (c.bass !== null && c.bass !== c.root) return [above(c.bass, low), ...tones.filter(t => t > above(c.bass!, low))];
  return tones;
}
/** Close voicing (3–4 notes, 9ths folded in) with its lowest note in [low, low+12), as near the previous voicing as possible. */
function voicing(c: Chord, low: number, prev: number[] | null): number[] {
  const pcs = [...new Set(c.iv.map(i => (c.root + i) % 12))].slice(0, 4);
  let best: number[] = [], score = Infinity;
  for (let inv = 0; inv < pcs.length; inv++) {
    const order = [...pcs.slice(inv), ...pcs.slice(0, inv)];
    const v: number[] = [];
    for (const pc of order) v.push(v.length ? above(pc, v[v.length - 1] + 1) : above(pc, low));
    const sc = prev ? v.reduce((s, n, i) => s + Math.abs(n - (prev[Math.min(i, prev.length - 1)])), 0) : Math.abs(v[0] - low - 4);
    if (sc < score) { score = sc; best = v; }
  }
  return best;
}

/** Splits `a:b` style tokens. */
function tok(t: string): { head: string; n: number } {
  const i = t.indexOf(':');
  return i < 0 ? { head: t, n: 1 } : { head: t.slice(0, i), n: Number(t.slice(i + 1)) };
}

/** Parses a melody into notes; throws when a bar does not add up. at = start bar. */
function melody(src: string, bar: number, at: number, oct: number): { t: number; d: number; m: number; glide: boolean }[] {
  const out: { t: number; d: number; m: number; glide: boolean }[] = [];
  const bars = src.split('|');
  let t = at * bar;
  bars.forEach((b, bi) => {
    let len = 0;
    for (const raw of b.trim().split(/\s+/).filter(Boolean)) {
      const { head, n } = tok(raw);
      if (!(n > 0)) throw new Error(`長さを読めません: ${raw}`);
      if (head === '.') { /* rest */ }
      else if (head === '-') { if (out.length) out[out.length - 1].d += n; }
      else {
        const glide = head.startsWith('~');
        out.push({ t: t + len, d: n, m: noteNum(glide ? head.slice(1) : head) + 12 * oct, glide });
      }
      len += n;
    }
    if (len !== bar) throw new Error(`小節${at + bi + 1}の長さが${len}（${bar}のはず）: ${b.trim()}`);
    t += len;
  });
  return out;
}

const inBars = (tr: TrackCommon, b: number) => (!tr.bars || tr.bars.some(([f, e]) => b >= f && b < e)) && !(tr.skip ?? []).includes(b);
/** Pattern string → per-unit tokens, repeated to fill a bar. */
function cells(p: string, bar: number): string[] {
  const c = p.includes(' ') ? p.trim().split(/\s+/) : [...p];
  if (bar % c.length) throw new Error(`パターンの長さ${c.length}が小節${bar}を割り切れません: ${p}`);
  return Array.from({ length: bar }, (_, i) => c[i % c.length]);
}
const isDrum = (t: Track): t is DrumTrack => 'drums' in t;
const isMel = (t: Track): t is MelodyTrack => 'notes' in t;

const cache = new WeakMap<SongDef, Compiled>();
/** Compiles a song into note events (cached). */
export function compile(def: SongDef): Compiled {
  const hit = cache.get(def);
  if (hit) return hit;
  const { bar, grid } = def;
  const chordBars = def.chords.split('|').map(b => b.trim().split(/\s+/).filter(Boolean).map(parseChord));
  const bars = chordBars.length, units = bars * bar;
  /** Chord sounding at unit u, with the unit where it ends. */
  const chordAt = (u: number) => {
    const b = Math.floor(u / bar), cs = chordBars[b], span = bar / cs.length, i = Math.floor((u - b * bar) / span);
    return { c: cs[i], end: b * bar + (i + 1) * span, start: b * bar + i * span };
  };
  const ev: NoteEvent[] = [];
  const accent = (u: number) => (u % bar === 0 ? 1 : u % grid === 0 ? 0.9 : 0.8);
  def.tracks.forEach((tr, k) => {
    if (isMel(tr)) {
      for (const n of melody(tr.notes, bar, tr.at ?? 0, tr.oct ?? 0)) ev.push({ t: n.t, d: n.d, m: n.m, v: accent(n.t), k, inst: tr.inst, drum: false, glide: n.glide });
      return;
    }
    if (isDrum(tr)) {
      for (let b = 0; b < bars; b++) {
        if (!inBars(tr, b)) continue;
        for (const [drum, pat] of Object.entries(tr.drums) as [Drum, string][]) {
          const cs = cells(pat, bar);
          cs.forEach((ch, i) => {
            if (!/[xXg]/.test(ch)) return;
            let d = 1; while (cs[i + d] === '-') d++;
            const u = b * bar + i;
            ev.push({ t: u, d, m: drum === 'timp' ? above(chordAt(u).c.root, 38) : 0, v: ch === 'X' ? 1 : ch === 'x' ? 0.78 : 0.45, k, inst: drum, drum: true });
          });
        }
      }
      return;
    }
    const p = tr;
    let prevV: number[] | null = null;
    for (let b = 0; b < bars; b++) {
      if (!inBars(p, b)) { prevV = null; continue; }
      if (p.pad) {
        for (const [ci, c] of chordBars[b].entries()) {
          const span = bar / chordBars[b].length, start = b * bar + ci * span;
          const v = voicing(c, p.low, prevV);
          // the same chord continuing from the previous bar: hold it instead of playing it again
          const held = prevV && v.join() === prevV.join() && ev.length && ev[ev.length - 1].k === k && ev[ev.length - 1].t + ev[ev.length - 1].d === start;
          if (held) { for (let j = ev.length - 1; j >= 0 && ev[j].k === k && ev[j].t + ev[j].d === start; j--) ev[j].d += span; }
          else for (const m of v) ev.push({ t: start, d: span, m, v: 0.85, k, inst: p.inst, drum: false });
          prevV = v;
        }
        continue;
      }
      const pat = p.arp ?? p.bass ?? p.stab!;
      const cs = cells(pat, bar);
      cs.forEach((ch, i) => {
        if (ch === '.' || ch === '-') return;
        const u = b * bar + i, { c, end } = chordAt(u);
        let d = 1; while (cs[i + d] === '-' && u + d < end) d++;
        const v = accent(u) * (ch === 'X' ? 1.1 : 1);
        if (p.stab) {
          voicing(c, p.low, null).forEach((m, j) => ev.push({ t: u + j * (p.strum ?? 0), d, m, v: v * 0.9, k, inst: p.inst, drum: false }));
          return;
        }
        let m: number;
        if (p.arp) {
          const tones = arpTones(c, p.low), n = Number(ch);
          if (!(n >= 0)) throw new Error(`アルペジオの記号を読めません: ${ch}`);
          m = tones[Math.min(n, tones.length - 1)];
        } else {
          const r = above(c.bass ?? c.root, p.low), rr = above(c.root, p.low);
          const deg = (i3: number) => rr + (c.iv.find(x => x % 12 === i3 || x === i3) ?? i3);
          if (ch === 'R') m = r;
          else if (ch === '3') m = rr + (c.iv[1] ?? 4);
          else if (ch === '5') m = rr + (c.iv[2] ?? 7);
          else if (ch === '7') m = rr + (c.iv[3] ?? 10);
          else if (ch === '8') m = rr + 12;
          else if (ch === '9') m = deg(2) + (deg(2) < rr + 12 ? 12 : 0);
          else if (/^\+\d+$/.test(ch)) m = rr + Number(ch.slice(1));
          else throw new Error(`ベースの記号を読めません: ${ch}`);
        }
        ev.push({ t: u, d, m, v, k, inst: p.inst, drum: false });
      });
    }
  });
  if (def.swing) for (const e of ev) if (Math.round(e.t) % 2 === 1 && Number.isInteger(e.t)) e.t += def.swing;
  ev.sort((a, b) => a.t - b.t);
  const out: Compiled = { events: ev, units, unitSec: 60 / def.bpm / grid, bars, def };
  cache.set(def, out);
  return out;
}

/** Chord active at a unit (for the consonance check in the tests). */
export function chordAtUnit(def: SongDef, u: number): Chord {
  const chordBars = def.chords.split('|').map(b => b.trim().split(/\s+/).filter(Boolean).map(parseChord));
  const b = Math.floor(u / def.bar) % chordBars.length, cs = chordBars[b], span = def.bar / cs.length;
  return cs[Math.min(cs.length - 1, Math.floor((u - b * def.bar) / span))];
}
