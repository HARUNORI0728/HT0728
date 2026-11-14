// Placeholder score for every track in design/asset-orders.md §1 (used until the real recordings are delivered).
// Notation: see theory.ts. Units: grid 2 = eighth notes, grid 4 = sixteenths; 6/8-like feels use 3/4 here.
//
// Main motif (the hopeful "homecoming" theme, scale degrees 5-1-2 | 3-2-1 | 6-1-4 | 3-2): stated first in `title`,
// then fragile on piano in `resolve`, as a march in `map_final`, in the minor and then breaking through to the
// major in `final_boss`, and fully at rest in `ending`.
import type { SongDef } from './theory';

const bars = (...b: string[]) => b.join(' | ');
const hold = (bar: number) => ['R', ...Array(bar - 1).fill('-')].join(' ');

// ---------- the main motif ----------
/** 3/4, eighths. Over D | Bm | G | D/A A | D | F#m | G Em | Asus4 A. */
const MOTIF_34 = bars('A4:2 D5:2 E5:2', 'F#5:3 E5:1 D5:2', 'B4:2 D5:2 G5:2', 'F#5:3 E5:3', 'A4:2 D5:2 E5:2', 'F#5:3 G5:1 A5:2', 'B5:3 A5:1 G5:1 E5:1', 'D5:3 C#5:3');
const MOTIF_34_CH = 'D | Bm | G | D/A A | D | F#m | G Em | Asus4 A';
/** 3/4 answer: G | A | F#m | Bm | Em | A7 | D/F# G | A. */
const ANSWER_34 = bars('D5:2 G5:2 F#5:1 E5:1', 'E5:4 C#5:2', 'C#5:2 F#5:2 E5:1 C#5:1', 'D5:6', 'B4:2 E5:2 G5:2', 'A5:2 G5:2 E5:2', 'F#5:3 G5:3', 'E5:6');
const ANSWER_34_CH = 'G | A | F#m | Bm | Em | A7 | D/F# G | A';
/** 4/4 sixteenth grid (march). Over Dadd9 | Bm | G | F#m A | Dadd9 | F#m | G Em | Asus4 A. */
const MOTIF_44 = bars('A4:4 D5:4 E5:8', 'F#5:6 E5:2 D5:8', 'B4:4 D5:4 G5:8', 'F#5:8 E5:8', 'A4:4 D5:4 E5:8', 'F#5:6 G5:2 A5:8', 'B5:6 A5:2 G5:4 E5:4', 'D5:8 C#5:8');
const MOTIF_44_CH = 'Dadd9 | Bm | G | F#m A | Dadd9 | F#m | G Em | Asus4 A';
const ANSWER_44 = bars('D5:4 G5:4 B5:8', 'C#6:6 B5:2 A5:8', 'A5:4 F#5:4 C#6:8', 'D6:8 B5:8', 'B5:4 G5:4 E5:4 G5:4', 'A5:6 G5:2 E5:8', 'F#5:8 G5:8', 'A5:8 E5:4 C#5:4');
const ANSWER_44_CH = 'G | A | F#m | Bm | Em | A7 | D/F# G | A';
/** 4/4 eighth grid (slow): the same shapes at half the note count. */
const MOTIF_44E = bars('A4:2 D5:2 E5:4', 'F#5:3 E5:1 D5:4', 'B4:2 D5:2 G5:4', 'F#5:4 E5:4', 'A4:2 D5:2 E5:4', 'F#5:3 G5:1 A5:4', 'B5:3 A5:1 G5:2 E5:2', 'D5:4 C#5:4');
const CLIMAX_44E = bars('D5:2 G5:2 B5:4', 'C#6:3 B5:1 A5:4', 'A5:2 F#5:2 C#6:4', 'D6:4 B5:4', 'B5:2 G5:2 E5:2 G5:2', 'A5:3 G5:1 E5:4', 'F#5:4 G5:4', 'E5:8');

export const SONGS: Record<string, SongDef> = {
  // タイトル：D major 3/4. Harp opens like dawn; flute states the theme; strings swell into a full statement.
  title: {
    bpm: 84, grid: 2, bar: 6, gain: 1.0,
    chords: ['D | G/D', MOTIF_34_CH, ANSWER_34_CH, MOTIF_34_CH].join(' | '),
    tracks: [
      { inst: 'harp', low: 50, arp: '0 1 2 3 2 1', vol: 0.8, pan: -0.25, rev: 0.45 },
      { inst: 'harp', low: 62, arp: '. . 0 . 1 .', bars: [[18, 26]], vol: 0.45, pan: 0.3, rev: 0.5 },
      { inst: 'pad', low: 55, pad: true, bars: [[2, 18]], vol: 0.7, rev: 0.5 },
      { inst: 'pad', low: 52, pad: true, bars: [[18, 26]], vol: 1.0, rev: 0.5 },
      { inst: 'flute', notes: MOTIF_34, at: 2, vol: 1, pan: 0.1, rev: 0.4 },
      { inst: 'flute', notes: ANSWER_34, at: 10, vol: 0.95, pan: 0.1, rev: 0.4 },
      { inst: 'flute', notes: MOTIF_34, at: 18, vol: 0.8, pan: 0.15, rev: 0.4 },
      { inst: 'strings', notes: MOTIF_34, at: 18, oct: -1, vol: 1.1, pan: -0.1, rev: 0.45 },
      { inst: 'cello', low: 38, bass: 'R - - - - -', bars: [[10, 18]], vol: 0.8, rev: 0.3 },
      { inst: 'cello', low: 38, bass: 'R - - 5 - -', bars: [[18, 26]], vol: 0.9, rev: 0.3 },
      { drums: { timp: 'x.....' }, bars: [[18, 26]], vol: 0.55, rev: 0.4 },
      { drums: { cym: 'x-----' }, bars: [[17, 18]], vol: 0.8, rev: 0.5 },
    ],
  },

  // 序章：A minor, sparse piano with a faint string pad and rain; ends on Cadd9 (unresolved but hopeful).
  prologue: {
    bpm: 66, grid: 2, bar: 8, gain: 1.15,
    chords: 'Am | Fmaj7 | C | G | Am | Fmaj7 | Dm7 | Esus4 E | F | G | Em7 | Am | Dm7 | G | Fmaj7 G | Cadd9',
    tracks: [
      { inst: 'piano', notes: bars('E5:3 D5:1 C5:4', 'A4:2 C5:2 E5:4', 'G5:3 F5:1 E5:4', 'D5:6 .:2', 'E5:3 D5:1 C5:2 E5:2', 'A5:4 G5:2 F5:2', 'F5:3 E5:1 D5:2 C5:2', 'A4:4 G#4:4',
        'C5:3 A4:1 F5:4', 'D5:3 B4:1 G5:4', 'E5:3 D5:1 B4:4', 'C5:2 B4:2 A4:4', 'A4:2 D5:2 F5:4', 'B4:2 D5:2 G5:3 F5:1', 'E5:4 D5:4', 'C5:2 D5:2 E5:4'), vol: 0.9, pan: 0.1, rev: 0.55 },
      { inst: 'piano', low: 45, arp: '0 . 2 . 3 . . .', vol: 0.55, pan: -0.15, rev: 0.55 },
      { inst: 'piano', low: 33, bass: 'R - - - - - - -', vol: 0.4, rev: 0.5 },
      { inst: 'pad', low: 52, pad: true, bars: [[4, 16]], vol: 0.55, rev: 0.6 },
      { inst: 'rain', low: 60, bass: hold(8), vol: 1, rev: 0.2 },
    ],
  },

  // キャンプ：G major walking tempo; guitar strums, pizzicato bass, recorder then clarinet, shaker and woodblock.
  camp: (() => {
    const ch = 'G | C | G | D | G | C | Am D | G | C | G | Em | D | C | G | Am7 | D7';
    const mel = bars('D5:2 B4:1 C5:1 D5:2 G5:2', 'E5:3 D5:1 C5:2 E5:2', 'D5:2 B4:2 G4:2 B4:2', 'A4:4 F#4:2 A4:2', 'D5:2 B4:1 C5:1 D5:2 G5:2', 'E5:2 G5:2 E5:2 C5:2', 'C5:2 E5:2 D5:2 C5:1 A4:1', 'G4:6 .:2',
      'E5:3 F5:1 G5:2 E5:2', 'D5:3 E5:1 D5:2 B4:2', 'B4:2 E5:2 G5:2 E5:2', 'F#5:4 E5:2 D5:2', 'E5:2 C5:2 E5:2 G5:2', 'D5:3 B4:1 G4:2 B4:2', 'C5:2 E5:2 A4:2 C5:2', 'D5:4 C5:2 A4:2');
    return {
      bpm: 96, grid: 2, bar: 8, gain: 1.0, swing: 0.12,
      chords: `${ch} | ${ch}`,
      tracks: [
        { inst: 'guitar', low: 52, stab: 'x . x x . x x .', strum: 0.05, vol: 0.55, pan: -0.3, rev: 0.3 },
        { inst: 'pizz', low: 40, bass: 'R . 5 . R . 5 .', vol: 0.9, rev: 0.2 },
        { inst: 'recorder', notes: mel, vol: 0.9, pan: 0.2, rev: 0.35 },
        { inst: 'clarinet', notes: mel, at: 16, vol: 0.85, pan: 0.2, rev: 0.35 },
        { inst: 'glock', notes: mel, at: 16, oct: 1, vol: 0.25, pan: -0.2, rev: 0.4, },
        { inst: 'pad', low: 55, pad: true, bars: [[16, 32]], vol: 0.45, rev: 0.4 },
        { drums: { shaker: '..x...x.', tick: 'x...x...' }, vol: 0.7, rev: 0.15 },
      ],
    };
  })(),

  // 自軍（1〜3章）：C major 120. Marching snare and staccato strings under a flute+oboe melody.
  map_dawn: (() => {
    const A = bars('G4:2 C5:2 E5:4 G5:4 E5:2 C5:2', 'D5:6 B4:2 G4:4 B4:4', 'C5:4 E5:4 A5:6 G5:2', 'F5:4 E5:2 D5:2 C5:8', 'G4:2 C5:2 E5:4 G5:4 C6:4', 'A5:4 F5:4 G5:4 D5:4', 'E5:4 C5:4 A4:4 C5:4', 'B4:4 D5:4 G5:8');
    const B = bars('A5:6 G5:2 F5:4 C5:4', 'B4:4 D5:4 G5:6 F5:2', 'E5:6 D5:2 B4:4 G4:4', 'A4:4 C5:4 E5:8', 'F5:4 A5:4 C6:6 B5:2', 'B5:4 G5:4 D5:4 B4:4', 'C5:4 D5:4 F5:4 A5:4', 'G5:8 F5:4 D5:4');
    const chA = 'C | G/B | Am | F | C | F G | Am | G', chB = 'F | G | Em | Am | F | G | Dm7 | Gsus4 G';
    return {
      bpm: 120, grid: 4, bar: 16, gain: 0.95,
      chords: [chA, chB, chA].join(' | '),
      tracks: [
        { inst: 'flute', notes: [A, B].join(' | '), vol: 0.9, pan: 0.15, rev: 0.3 },
        { inst: 'oboe', notes: [A, B].join(' | '), vol: 0.55, pan: -0.1, rev: 0.3 },
        { inst: 'strings', notes: A, at: 16, oct: -1, vol: 1.1, pan: -0.15, rev: 0.35 },
        { inst: 'flute', notes: A, at: 16, vol: 0.85, pan: 0.15, rev: 0.3 },
        { inst: 'stacc', low: 55, arp: '0 . 2 . 1 . 2 . 0 . 2 . 1 . 2 .', vol: 0.8, pan: -0.25, rev: 0.25 },
        { inst: 'stacc', low: 67, arp: '. . 0 . . . 1 . . . 0 . . . 2 .', bars: [[8, 24]], vol: 0.5, pan: 0.3, rev: 0.25 },
        { inst: 'bass', low: 36, bass: 'R . . . R . 5 . R . . . 5 . . .', vol: 0.85, rev: 0.1 },
        { inst: 'horn', low: 55, pad: true, bars: [[8, 24]], vol: 0.5, rev: 0.4 },
        { drums: { snare: 'X..xx.x.X..xx.xx', kick: 'x.......x.......' }, vol: 0.6, rev: 0.2 },
        { drums: { timp: 'x.......x.......' }, bars: [[8, 24]], vol: 0.6, rev: 0.3 },
        { drums: { cym: 'x---------------' }, bars: [[7, 8], [15, 16]], vol: 0.7, rev: 0.4 },
      ],
    };
  })(),

  // 自軍（4〜7章）：F major 126, heavier. Strings melody, timpani and low brass, brass takes over the reprise.
  map_resolve: (() => {
    const A = bars('C5:6 F5:2 A5:8', 'G5:6 E5:2 C5:8', 'D5:4 F5:4 A5:6 G5:2', 'F5:12 .:4', 'D5:4 G5:4 Bb5:6 A5:2', 'G5:6 E5:2 C5:8', 'A5:4 F5:4 D5:4 F5:4', 'E5:4 G5:4 C6:8');
    const B = bars('A5:6 G5:2 F5:4 D5:4', 'F5:6 D5:2 Bb4:8', 'C5:4 F5:4 A5:4 C6:4', 'Bb5:6 A5:2 G5:8', 'G5:6 A5:2 Bb5:4 D6:4', 'D6:6 C6:2 Bb5:8', 'F5:4 D5:4 E5:4 G5:4', 'E5:8 G5:4 Bb5:4');
    const chA = 'F | C/E | Dm | Bb | Gm | C | F/A Bb | C', chB = 'Dm | Bb | F | C7 | Gm | Bb | Bb C | C7';
    return {
      bpm: 126, grid: 4, bar: 16, gain: 0.95,
      chords: [chA, chB, chA].join(' | '),
      tracks: [
        { inst: 'strings', notes: [A, B, A].join(' | '), vol: 1.15, pan: 0.05, rev: 0.35 },
        { inst: 'brass', notes: A, at: 16, oct: -1, vol: 0.8, pan: -0.15, rev: 0.35 },
        { inst: 'stacc', low: 53, arp: '0 2 1 2 0 2 1 2 0 2 1 2 0 2 1 2', vol: 0.65, pan: -0.25, rev: 0.25 },
        { inst: 'bass', low: 33, bass: 'R . . R . . R . R . . R . . 5 .', vol: 0.85, rev: 0.1 },
        { inst: 'horn', low: 48, stab: 'x-------........', vol: 0.55, pan: 0.2, rev: 0.35 },
        { inst: 'pad', low: 55, pad: true, bars: [[8, 24]], vol: 0.5, rev: 0.4 },
        { drums: { timp: 'X.......x...x...', snare: '....x.......x..g' }, vol: 0.6, rev: 0.25 },
        { drums: { cym: 'x---------------' }, bars: [[15, 16]], vol: 0.7, rev: 0.4 },
      ],
    };
  })(),

  // 自軍（8〜10章）：the main motif as a grand march, D major 132.
  map_final: {
    bpm: 132, grid: 4, bar: 16, gain: 0.92,
    chords: [MOTIF_44_CH, ANSWER_44_CH, MOTIF_44_CH].join(' | '),
    tracks: [
      { inst: 'brass', notes: [MOTIF_44, ANSWER_44, MOTIF_44].join(' | '), vol: 0.85, pan: -0.1, rev: 0.35 },
      { inst: 'strings', notes: [MOTIF_44, ANSWER_44].join(' | '), vol: 1.0, pan: 0.15, rev: 0.35 },
      { inst: 'strings', notes: MOTIF_44, at: 16, oct: 1, vol: 0.7, pan: 0.2, rev: 0.4 },
      { inst: 'flute', notes: ANSWER_44, at: 8, vol: 0.5, pan: 0.3, rev: 0.35 },
      { inst: 'stacc', low: 50, arp: '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1', vol: 0.6, pan: -0.3, rev: 0.2 },
      { inst: 'bass', low: 38, bass: 'R . R . R . R . R . R . 5 . 5 .', vol: 0.8, rev: 0.1 },
      { inst: 'horn', low: 50, pad: true, vol: 0.45, rev: 0.4 },
      { drums: { snare: 'X..x..x.X..x.xxx', kick: 'x.......x.......' }, vol: 0.6, rev: 0.2 },
      { drums: { timp: 'x...x...x...x...' }, bars: [[8, 24]], vol: 0.55, rev: 0.3 },
      { drums: { cym: 'x---------------' }, bars: [[7, 8], [15, 16], [23, 24]], vol: 0.7, rev: 0.4 },
    ],
  },

  // 敵軍：D minor 110. Low string ostinato, muted brass stabs, a ticking clock, a horn line.
  map_enemy: {
    bpm: 110, grid: 4, bar: 16, gain: 1.05,
    chords: 'Dm | Dm | Bb | A | Dm | Dm | Gm | A | Bb | C | Dm | A | Gm | Dm/F | Bb | A',
    tracks: [
      { inst: 'horn', notes: bars('D4:6 E4:2 F4:8', 'A4:6 G4:2 F4:4 D4:4', 'D4:8 F4:8', 'E4:12 .:4', 'D4:6 E4:2 F4:8', 'A4:6 Bb4:2 A4:8', 'G4:6 A4:2 Bb4:8', 'C#5:12 .:4',
        'D5:6 C5:2 Bb4:8', 'C5:6 Bb4:2 G4:8', 'A4:6 F4:2 D4:8', 'E4:4 C#4:4 E4:4 A4:4', 'Bb4:6 A4:2 G4:8', 'F4:6 E4:2 D4:8', 'F4:8 D4:8', 'E4:8 C#4:4 E4:4'), vol: 1.0, pan: 0.1, rev: 0.35 },
      { inst: 'stacc', low: 38, bass: 'R . R 5 R . R 3 R . R 5 R . 8 5', vol: 1.1, pan: -0.2, rev: 0.2 },
      { inst: 'bass', low: 26, bass: hold(16), vol: 0.55, rev: 0.1 },
      { inst: 'brass', low: 50, stab: '......X.......x.', bars: [[4, 16]], vol: 0.5, pan: 0.3, rev: 0.3 },
      { inst: 'pad', low: 50, pad: true, bars: [[8, 16]], vol: 0.45, rev: 0.4 },
      { drums: { tick: 'x.x.x.x.x.x.x.x.', timp: 'x.......x.....x.' }, vol: 0.6, rev: 0.25 },
    ],
  },

  // ボス：E minor 150. Driving string riff, drums, brass melody; a heroic counter-melody in the middle.
  boss: (() => {
    const A = bars('E5:4 .:2 E5:2 G5:4 B5:4', 'B5:2 G5:2 F#5:4 E5:4 B4:4', 'C5:4 .:2 C5:2 E5:4 G5:4', 'F#5:6 E5:2 D5:8', 'E5:4 .:2 E5:2 G5:4 B5:4', 'B5:6 A5:2 G5:4 E5:4', 'A5:4 C6:4 E6:4 C6:4', 'D#6:8 B5:4 F#5:4');
    const B = bars('E5:4 G5:4 C6:8', 'D6:6 C6:2 A5:8', 'B5:4 D6:4 G6:8', 'G6:6 F#6:2 E6:8', 'E6:4 D6:4 C6:4 G5:4', 'A5:4 F#5:4 D6:8', 'E6:8 F#6:4 E6:4', 'D#6:8 F#5:4 B5:4');
    const chA = 'Em | Em | C | D | Em | Em | Am | B7', chB = 'C | D | G | Em | C | D | Bsus4 | B';
    return {
      bpm: 150, grid: 4, bar: 16, gain: 0.9,
      chords: [chA, chB, chA].join(' | '),
      tracks: [
        { inst: 'brass', notes: A, vol: 0.9, pan: -0.1, rev: 0.3 },
        { inst: 'strings', notes: A, oct: -1, vol: 0.8, pan: 0.15, rev: 0.3 },
        { inst: 'strings', notes: B, at: 8, oct: -1, vol: 1.1, pan: 0.1, rev: 0.35 },
        { inst: 'horn', notes: B, at: 8, oct: -2, vol: 0.7, pan: -0.2, rev: 0.35 },
        { inst: 'brass', notes: A, at: 16, vol: 0.9, pan: -0.1, rev: 0.3 },
        { inst: 'strings', notes: A, at: 16, vol: 0.7, pan: 0.15, rev: 0.3 },
        { inst: 'stacc', low: 52, bass: 'R R 8 R R R 8 R 5 R 8 R R 5 8 5', vol: 0.9, pan: -0.3, rev: 0.2 },
        { inst: 'bass', low: 28, bass: 'R . R . R . R . R . R . R . R .', vol: 0.8, rev: 0.05 },
        { inst: 'brass', low: 52, stab: 'X.....x.........', bars: [[0, 8], [16, 24]], vol: 0.45, pan: 0.3, rev: 0.3 },
        { drums: { kick: 'X.....x.X.....x.', snare: '....X.......X..x', hat: '..x...x...x...x.' }, vol: 0.62, rev: 0.15 },
        { drums: { timp: 'x...x...x...x...' }, bars: [[0, 8], [16, 24]], vol: 0.5, rev: 0.25 },
        { drums: { cym: 'x---------------' }, bars: [[7, 8], [15, 16]], vol: 0.8, rev: 0.4 },
      ],
    };
  })(),

  // 耐久・防衛：G minor 138. Urgent string figure, heartbeat drum, a flute glimmer of hope in the second half.
  crisis: (() => {
    const mel = bars('D5:16', 'G5:8 Bb5:4 D6:4', 'G5:12 Bb5:4', 'Eb5:16', 'C5:8 Eb5:4 G5:4', 'G5:8 Eb5:4 C5:4', 'F#5:16', 'A5:8 F#5:4 D5:4',
      'D6:12 C6:2 Bb5:2', 'A5:12 C6:4', 'G5:8 Bb5:4 Eb6:4', 'D6:8 F5:8', 'Eb6:8 C6:4 G5:4', 'Bb5:8 G5:8', 'A5:8 F#5:8', 'C6:8 A5:4 F#5:4');
    return {
      bpm: 138, grid: 4, bar: 16, gain: 0.98,
      chords: 'Gm | Gm | Eb | Eb | Cm | Cm | D | D | Gm | F | Eb | Bb | Cm | Eb | D | D7',
      tracks: [
        { inst: 'strings', notes: mel, oct: -1, vol: 1.15, pan: 0.05, rev: 0.35 },
        { inst: 'flute', notes: bars('D6:12 C6:2 Bb5:2', 'A5:12 C6:4', 'G5:8 Bb5:4 Eb6:4', 'D6:8 F5:8', 'Eb6:8 C6:4 G5:4', 'Bb5:8 G5:8', 'A5:8 F#5:8', 'C6:8 A5:4 F#5:4'), at: 8, oct: -1, vol: 0.8, pan: 0.25, rev: 0.4 },
        { inst: 'stacc', low: 55, arp: '0 1 2 1 0 1 2 1 0 1 2 1 0 1 2 1', vol: 0.85, pan: -0.25, rev: 0.2 },
        { inst: 'bass', low: 31, bass: 'R . . . R . . . R . . . R . R .', vol: 0.8, rev: 0.1 },
        { inst: 'pad', low: 50, pad: true, bars: [[8, 16]], vol: 0.45, rev: 0.4 },
        { drums: { heart: 'x..x............', snare: 'g.g.g.g.g.g.g.g.' }, vol: 0.6, rev: 0.15 },
        { drums: { timp: 'x.......x...x.x.' }, bars: [[8, 16]], vol: 0.5, rev: 0.3 },
        { drums: { cym: 'x---------------' }, bars: [[7, 8], [15, 16]], vol: 0.7, rev: 0.4 },
      ],
    };
  })(),

  // 明るい会話：F major 110, light swing. Pizzicato, clarinet, glockenspiel.
  daily: {
    bpm: 110, grid: 2, bar: 8, gain: 1.05, swing: 0.16,
    chords: 'F | Dm | Gm7 | C7 | F | Dm | Bb C7 | F | Bb | C | Am | Dm | Gm7 | C7 | F D7 | Gm7 C7',
    tracks: [
      { inst: 'clarinet', notes: bars('C5:1 .:1 A4:1 C5:1 F5:2 A4:2', 'D5:1 .:1 F5:1 D5:1 A4:4', 'Bb4:1 .:1 D5:1 F5:1 G5:2 F5:2', 'E5:2 D5:1 E5:1 G5:2 .:2', 'C5:1 .:1 A4:1 C5:1 F5:2 A5:2', 'A5:1 F5:1 E5:1 F5:1 D5:4', 'D5:2 F5:2 E5:2 G5:2', 'F5:2 C5:1 A4:1 F4:2 .:2',
        'F5:3 D5:1 Bb4:2 D5:2', 'E5:3 C5:1 G4:2 C5:2', 'A4:1 C5:1 E5:1 A5:1 G5:2 E5:2', 'F5:2 D5:2 A4:4', 'Bb4:2 D5:2 F5:2 D5:2', 'E5:2 G5:2 Bb5:2 G5:2', 'A5:2 F5:2 F#5:2 D5:2', 'G5:2 D5:2 E5:2 C5:2'), vol: 0.95, pan: 0.15, rev: 0.3 },
      { inst: 'glock', notes: bars('F5:3 D5:1 Bb4:2 D5:2', 'E5:3 C5:1 G4:2 C5:2', 'A4:1 C5:1 E5:1 A5:1 G5:2 E5:2', 'F5:2 D5:2 A4:4', 'Bb4:2 D5:2 F5:2 D5:2', 'E5:2 G5:2 Bb5:2 G5:2', 'A5:2 F5:2 F#5:2 D5:2', 'G5:2 D5:2 E5:2 C5:2'), at: 8, oct: 1, vol: 0.4, pan: -0.25, rev: 0.4 },
      { inst: 'pizz', low: 53, arp: '0 . 2 . 1 . 2 .', vol: 0.8, pan: -0.2, rev: 0.25 },
      { inst: 'pizz', low: 41, bass: 'R . . . 5 . . .', vol: 1.0, rev: 0.15 },
      { drums: { shaker: '..x...x.', tick: 'x.......' }, vol: 0.6, rev: 0.15 },
    ],
  },

  // コメディ：C major oom-pah. Tuba, xylophone, sliding clarinet, stops for the punchlines.
  comedy: {
    bpm: 116, grid: 2, bar: 8, gain: 1.0,
    chords: 'C | G7 | C | G7 | F | C | D7 G7 | C | F | C | G7 | C | F | Fm | C G7 | C',
    tracks: [
      { inst: 'xylo', notes: bars('E5:1 G5:1 E5:1 C5:1 .:4', 'D5:1 F5:1 D5:1 B4:1 .:4', 'E5:1 F5:1 G5:1 A5:1 G5:1 E5:1 C5:2', 'B4:2 .:1 B4:1 G4:2 .:2', 'A4:1 C5:1 F5:1 A5:1 .:2 G5:1 F5:1', 'E5:2 C5:2 G4:2 .:2', 'F#5:1 A5:1 F#5:1 D5:1 F5:1 D5:1 B4:1 G4:1', 'C5:2 .:2 C4:1 .:3'), vol: 0.9, pan: 0.2, rev: 0.25 },
      { inst: 'clarinet', notes: bars('A4:2 ~C5:1 F5:1 .:4', 'G5:2 E5:1 C5:1 .:4', 'F5:1 E5:1 D5:1 B4:1 G4:2 ~F5:2', 'E5:4 .:4', 'A5:1 G5:1 F5:1 C5:1 A4:2 .:2', 'Ab4:2 C5:2 ~F5:2 .:2', 'E5:2 C5:2 D5:1 F5:1 B4:2', 'C5:2 .:2 G4:1 .:1 C4:1 .:1'), at: 8, vol: 0.9, pan: 0.15, rev: 0.25 },
      { inst: 'tuba', low: 36, bass: 'R . 5 . R . 5 .', skip: [7, 15], vol: 0.9, rev: 0.1 },
      { inst: 'pizz', low: 55, stab: '. x . x . x . x', skip: [7, 15], vol: 0.6, pan: -0.25, rev: 0.2 },
      { drums: { tick: 'x...x...' }, skip: [7, 15], vol: 0.6, rev: 0.15 },
      { drums: { tamb: '.....x..' }, bars: [[7, 8], [15, 16]], vol: 0.8, rev: 0.2 },
    ],
  },

  // 悲しい場面：D minor 60. Solo cello over slow piano chords; a single D major chord near the end.
  sad: {
    bpm: 60, grid: 2, bar: 8, gain: 1.15,
    chords: 'Dm | Bb | Gm | A | Dm | F | Gm | A | Bb | F/A | Gm | Dm/F | Em7b5 | A | D | A',
    tracks: [
      { inst: 'cello', notes: bars('A3:4 D4:4', 'F4:6 D4:2', 'D4:3 C4:1 Bb3:4', 'C#4:6 E4:2', 'F4:4 E4:2 D4:2', 'A4:6 G4:2', 'G4:3 F4:1 D4:4', 'E4:8',
        'D4:4 F4:4', 'C5:6 A4:2', 'Bb4:3 A4:1 G4:4', 'A4:4 F4:4', 'G4:4 E4:2 Bb3:2', 'C#4:6 E4:2', 'F#4:8', 'E4:4 C#4:2 A3:2'), vol: 1.0, pan: 0.05, rev: 0.45 },
      { inst: 'piano', low: 50, stab: 'x . . . x . . .', strum: 0.06, vol: 0.55, pan: -0.15, rev: 0.5 },
      { inst: 'piano', low: 36, bass: 'R - - - - - - -', vol: 0.45, rev: 0.45 },
      { inst: 'pad', low: 55, pad: true, bars: [[8, 16]], vol: 0.45, rev: 0.55 },
    ],
  },

  // 決意：the motif, fragile on piano, then strings join and climb to a climax, settling back for the loop.
  resolve: {
    bpm: 76, grid: 2, bar: 8, gain: 1.0,
    chords: [MOTIF_44_CH, MOTIF_44_CH, 'G | A | F#m | Bm | Em | A7 | D/F# G | Asus4 A'].join(' | '),
    tracks: [
      { inst: 'piano', notes: [MOTIF_44E, MOTIF_44E].join(' | '), vol: 0.9, pan: 0.1, rev: 0.5 },
      { inst: 'piano', low: 50, arp: '0 . 2 . 3 . . .', bars: [[0, 8], [23, 24]], vol: 0.5, pan: -0.15, rev: 0.5 },
      { inst: 'piano', low: 50, arp: '0 2 3 2 0 2 3 2', bars: [[8, 23]], vol: 0.45, pan: -0.15, rev: 0.5 },
      { inst: 'pad', low: 54, pad: true, bars: [[8, 23]], vol: 0.7, rev: 0.5 },
      { inst: 'cello', low: 38, bass: 'R - - - 5 - - -', bars: [[8, 23]], vol: 0.8, rev: 0.35 },
      { inst: 'strings', notes: CLIMAX_44E, at: 16, vol: 1.15, pan: 0.05, rev: 0.45 },
      { inst: 'horn', notes: CLIMAX_44E, at: 16, oct: -1, vol: 0.55, pan: -0.2, rev: 0.4 },
      { drums: { timp: 'x.......' }, bars: [[16, 23]], vol: 0.45, rev: 0.4 },
      { drums: { cym: 'x-------' }, bars: [[15, 16]], vol: 0.8, rev: 0.5 },
    ],
  },

  // 謎：E minor, slow. Sparse celesta, low strings, an E pedal under Fmaj7 for the unease, reversed shimmers.
  mystery: {
    bpm: 60, grid: 2, bar: 8, gain: 1.15,
    chords: 'Em | Fmaj7/E | Em | Fmaj7/E | Amadd9 | Cmaj7 | Bsus4 | B | Cmaj7 | Bm | Am | Fmaj7/E | Em | Fmaj7/E | Bsus4 | B7',
    tracks: [
      { inst: 'celesta', notes: bars('B5:4 .:2 E6:2', 'C6:4 .:2 A5:2', 'G5:6 .:2', 'F5:2 E5:2 .:4', 'C6:2 B5:2 E6:4', 'G5:4 .:2 B5:2', 'E6:4 F#5:4', 'D#6:6 .:2',
        'E6:4 .:2 B5:2', 'D6:4 .:2 F#5:2', 'A5:4 C6:4', 'A5:4 .:2 F5:2', 'G5:4 .:4', 'C6:2 .:2 A5:2 .:2', 'F#5:4 E5:4', 'D#5:2 .:2 A5:4'), vol: 0.9, pan: 0.2, rev: 0.65 },
      { inst: 'pad', low: 45, pad: true, vol: 0.9, rev: 0.5 },
      { inst: 'cello', low: 28, bass: 'R - - - - - - -', vol: 0.5, rev: 0.4 },
      { inst: 'swell', low: 76, pad: true, bars: [[1, 2], [3, 4], [9, 10], [13, 14]], vol: 0.9, pan: -0.2, rev: 0.7 },
      { drums: { timp: 'x.......' }, bars: [[6, 7], [14, 15]], vol: 0.35, rev: 0.5 },
    ],
  },

  // 恋愛：A major 3/4 72. Piano states it, solo violin answers over harp.
  romance: (() => {
    const mel = bars('C#5:4 E5:2', 'B4:4 G#4:2', 'A4:2 C#5:2 F#5:2', 'E5:4 G#4:2', 'F#5:3 E5:1 D5:2', 'C#5:3 B4:1 A4:2', 'B4:2 D5:2 A5:2', 'G#5:4 E5:2');
    const mel2 = bars('E5:4 A5:2', 'G#5:3 F#5:1 E5:2', 'C#6:4 A5:2', 'A5:3 F#5:1 D5:2', 'D5:2 F#5:2 A5:2', 'G#5:4 B5:2', 'A5:3 F5:3', 'B4:3 G#4:3');
    return {
      bpm: 72, grid: 2, bar: 6, gain: 1.05,
      chords: 'A | E/G# | F#m | C#m/E | D | A/C# | Bm7 | E | A | E/G# | F#m | D | Bm7 | E | D Dm | Esus4 E',
      tracks: [
        { inst: 'piano', notes: mel, vol: 0.85, pan: 0.05, rev: 0.5 },
        { inst: 'violin', notes: mel2, at: 8, vol: 0.95, pan: 0.15, rev: 0.5 },
        { inst: 'piano', low: 45, arp: '0 2 3 2 3 2', vol: 0.45, pan: -0.15, rev: 0.5 },
        { inst: 'harp', low: 57, arp: '0 1 2 3 2 1', bars: [[8, 16]], vol: 0.45, pan: -0.3, rev: 0.55 },
        { inst: 'pad', low: 54, pad: true, bars: [[8, 16]], vol: 0.5, rev: 0.55 },
      ],
    };
  })(),

  // 家族・絆：C major 84. Guitar and oboe with soft strings.
  family: {
    bpm: 84, grid: 2, bar: 8, gain: 1.05,
    chords: 'C | Em/B | Am | G | F | C/E | Dm7 | G | F | G | Em7 | Am | Dm7 | G7 | Dm7 Fm | Gsus4 G',
    tracks: [
      { inst: 'oboe', notes: bars('E5:3 D5:1 C5:2 G4:2', 'B4:3 C5:1 B4:2 G4:2', 'A4:2 C5:2 E5:4', 'D5:4 B4:4', 'A4:3 C5:1 F5:4', 'E5:3 D5:1 C5:4', 'D5:2 F5:2 A5:2 C5:2', 'B4:6 .:2',
        'C5:3 A4:1 F5:2 A5:2', 'G5:3 F5:1 D5:4', 'E5:3 D5:1 B4:4', 'C5:2 E5:2 A5:4', 'A5:3 G5:1 F5:4', 'F5:2 D5:2 B4:4', 'D5:4 C5:4', 'C5:4 B4:4'), vol: 0.95, pan: 0.15, rev: 0.4 },
      { inst: 'guitar', low: 48, arp: '0 2 1 2 3 2 1 2', vol: 0.75, pan: -0.25, rev: 0.35 },
      { inst: 'bass', low: 36, bass: 'R - - - 5 - - -', vol: 0.6, rev: 0.2 },
      { inst: 'pad', low: 55, pad: true, bars: [[4, 16]], vol: 0.55, rev: 0.5 },
    ],
  },

  // オルステッド：C minor, very slow. Low brass, a sub drone, heavy drum, cold high harmonics.
  orsted: {
    bpm: 50, grid: 2, bar: 8, gain: 1.1,
    chords: 'Cm | Db/C | Cm | Ab | Fm | Db | Cm | G',
    tracks: [
      { inst: 'horn', notes: bars('G3:6 Ab3:2', 'Ab3:8', 'G3:4 Eb3:4', 'C4:8', 'Ab3:6 G3:2', 'F3:8', 'Eb3:4 D3:2 C3:2', 'B2:8'), vol: 1.1, pan: 0, rev: 0.45 },
      { inst: 'brass', low: 43, pad: true, vol: 0.6, rev: 0.45 },
      { inst: 'sub', low: 36, bass: 'R - - - - - - -', vol: 0.8, rev: 0.1 },
      { inst: 'harmonic', low: 79, pad: true, vol: 0.8, pan: 0.25, rev: 0.7 },
      { drums: { taiko: 'X.....x.' }, vol: 0.7, rev: 0.4 },
    ],
  },

  // 最終ボス：D minor 145 — organ and brass riff, the motif in the minor in the strings, then breaking into D major.
  final_boss: (() => {
    const A = bars('D5:4 .:2 D5:2 F5:4 A5:4', 'A5:6 G5:2 F5:4 D5:4', 'D5:4 .:2 D5:2 F5:4 Bb5:4', 'A5:6 G5:2 E5:4 C#5:4', 'D5:4 .:2 D5:2 F5:4 A5:4', 'D6:6 C6:2 A5:4 F5:4', 'G5:4 Bb5:4 D6:4 Bb5:4', 'C#6:8 A5:8');
    const B = bars('A4:4 D5:4 F5:8', 'F5:6 E5:2 D5:8', 'Bb4:4 D5:4 G5:8', 'E5:12 C#5:4', 'A4:4 D5:4 F5:8', 'F5:6 G5:2 A5:8', 'Bb5:6 A5:2 F5:4 D5:4', 'E5:8 C#5:8');
    return {
      bpm: 145, grid: 4, bar: 16, gain: 0.9,
      chords: ['Dm | Dm | Bb | A | Dm | Dm | Gm | A', 'Dm | Bb | Gm | A | Dm | F | Gm Bb | A', MOTIF_44_CH].join(' | '),
      tracks: [
        { inst: 'organ', notes: A, vol: 1.0, pan: -0.1, rev: 0.45 },
        { inst: 'brass', notes: A, oct: -1, vol: 0.7, pan: 0.15, rev: 0.35 },
        { inst: 'organ', low: 50, pad: true, bars: [[8, 16]], vol: 0.7, rev: 0.45 },
        { inst: 'strings', notes: B, at: 8, vol: 1.15, pan: 0.1, rev: 0.4 },
        { inst: 'brass', notes: MOTIF_44, at: 16, vol: 0.85, pan: -0.1, rev: 0.35 },
        { inst: 'strings', notes: MOTIF_44, at: 16, oct: 1, vol: 0.7, pan: 0.2, rev: 0.4 },
        { inst: 'stacc', low: 50, bass: 'R R 8 R R R 8 R 5 R 8 R R 5 8 5', vol: 0.85, pan: -0.3, rev: 0.2 },
        { inst: 'bass', low: 26, bass: 'R . R . R . R . R . R . R . R .', vol: 0.8, rev: 0.05 },
        { inst: 'horn', low: 50, pad: true, bars: [[16, 24]], vol: 0.5, rev: 0.4 },
        { drums: { kick: 'X.....x.X.....x.', snare: '....X.......X.xx' }, vol: 0.6, rev: 0.15 },
        { drums: { timp: 'X...x...X...x...' }, bars: [[0, 8], [16, 24]], vol: 0.55, rev: 0.3 },
        { drums: { cym: 'x---------------' }, bars: [[7, 8], [15, 16], [23, 24]], vol: 0.8, rev: 0.4 },
      ],
    };
  })(),

  // エンディング：the motif at rest. D major 3/4 72, piano, flute, warm strings.
  ending: (() => {
    const B = bars('B4:2 D5:2 G5:2', 'A5:4 F#5:2', 'G5:2 E5:2 D5:2', 'C#5:4 E5:2', 'D5:2 F#5:2 B5:2', 'A5:4 F#5:2', 'G5:3 E5:3', 'F#5:6');
    return {
      bpm: 72, grid: 2, bar: 6, gain: 1.05,
      chords: ['D | G/D', MOTIF_34_CH, 'G | D/F# | Em7 | A | Bm | F#m | G A | D', MOTIF_34_CH].join(' | '),
      tracks: [
        { inst: 'piano', low: 50, arp: '0 1 2 3 2 1', vol: 0.55, pan: -0.2, rev: 0.5 },
        { inst: 'piano', notes: MOTIF_34, at: 2, vol: 0.85, pan: 0.1, rev: 0.5 },
        { inst: 'flute', notes: B, at: 10, vol: 0.9, pan: 0.15, rev: 0.45 },
        { inst: 'flute', notes: MOTIF_34, at: 18, vol: 0.75, pan: 0.15, rev: 0.45 },
        { inst: 'strings', notes: MOTIF_34, at: 18, oct: -1, vol: 1.05, pan: -0.1, rev: 0.5 },
        { inst: 'pad', low: 54, pad: true, bars: [[10, 26]], vol: 0.65, rev: 0.55 },
        { inst: 'cello', low: 38, bass: 'R - - - - -', bars: [[10, 26]], vol: 0.7, rev: 0.4 },
        { inst: 'harp', low: 62, arp: '. . 0 . 1 .', bars: [[18, 26]], vol: 0.4, pan: 0.3, rev: 0.55 },
      ],
    };
  })(),

  // ---------- jingles (no loop) ----------
  victory: {
    bpm: 120, grid: 4, bar: 16, gain: 1.0, loop: false,
    chords: 'D | G A | D',
    tracks: [
      { inst: 'brass', notes: bars('A4:2 A4:2 D5:2 F#5:2 A5:6 F#5:2', 'G5:4 B5:4 A5:4 C#6:4', 'D6:16'), vol: 1.0, rev: 0.4 },
      { inst: 'strings', notes: bars('F#4:2 F#4:2 A4:2 D5:2 F#5:6 D5:2', 'D5:4 G5:4 E5:4 A5:4', 'F#5:16'), vol: 1.0, pan: 0.2, rev: 0.4 },
      { inst: 'horn', low: 50, pad: true, vol: 0.6, rev: 0.4 },
      { inst: 'bass', low: 38, bass: 'R . . . . . . . R . . . . . . .', bars: [[0, 2]], vol: 0.8 },
      { inst: 'bass', low: 38, bass: hold(16), bars: [[2, 3]], vol: 0.8 },
      { drums: { timp: 'x.......x...x...' }, bars: [[0, 2]], vol: 0.6, rev: 0.3 },
      { drums: { timp: 'xxxxxxxxX.......', cym: '........x-------' }, bars: [[2, 3]], vol: 0.55, rev: 0.4 },
    ],
  },
  defeat: {
    bpm: 90, grid: 2, bar: 8, gain: 1.1, loop: false,
    chords: 'Dm | Gm/Bb A | Dm',
    tracks: [
      { inst: 'horn', notes: bars('A4:4 G4:2 F4:2', 'D4:4 C#4:4', 'D4:8'), vol: 1.0, rev: 0.5 },
      { inst: 'cello', low: 38, pad: true, vol: 0.9, rev: 0.5 },
      { inst: 'pad', low: 50, pad: true, vol: 0.6, rev: 0.5 },
    ],
  },
  levelup: {
    bpm: 150, grid: 4, bar: 16, gain: 1.0, loop: false,
    chords: 'C',
    tracks: [
      { inst: 'harp', notes: 'C5:1 E5:1 G5:1 C6:1 E6:1 G6:1 C7:10', vol: 0.9, rev: 0.5 },
      { inst: 'glock', notes: '.:4 G5:2 C6:2 E6:8', vol: 0.8, pan: 0.2, rev: 0.5 },
      { inst: 'brass', notes: 'E4:6 G4:2 C5:8', vol: 0.8, pan: -0.15, rev: 0.4 },
    ],
  },
  classchange: {
    bpm: 100, grid: 4, bar: 16, gain: 1.0, loop: false,
    chords: 'C | C',
    tracks: [
      { inst: 'harp', notes: bars('C4:1 D4:1 E4:1 F4:1 G4:1 A4:1 B4:1 C5:1 D5:1 E5:1 F5:1 G5:1 A5:1 B5:1 C6:1 D6:1', 'E6:16'), vol: 0.85, rev: 0.55 },
      { inst: 'brass', notes: bars('.:16', 'C5:16'), vol: 0.9, rev: 0.45 },
      { inst: 'strings', notes: bars('.:16', 'G5:16'), vol: 1.0, pan: 0.2, rev: 0.45 },
      { inst: 'horn', low: 48, pad: true, bars: [[1, 2]], vol: 0.7, rev: 0.45 },
      { inst: 'bass', low: 36, bass: hold(16), bars: [[1, 2]], vol: 0.8 },
      { drums: { cym: 'x---------------' }, bars: [[0, 1]], vol: 0.8, rev: 0.5 },
      { drums: { timp: 'X...............' }, bars: [[1, 2]], vol: 0.8, rev: 0.4 },
    ],
  },
  support: {
    bpm: 90, grid: 2, bar: 6, gain: 1.0, loop: false,
    chords: 'C | F C',
    tracks: [
      { inst: 'celesta', notes: bars('E5:1 G5:1 C6:2 B5:1 G5:1', 'A5:2 F5:1 .:1 E5:2'), vol: 1.0, rev: 0.55 },
      { inst: 'harp', low: 48, arp: '0 1 2 3 4 5', vol: 0.6, pan: -0.2, rev: 0.55 },
    ],
  },
};

/** Every track the game can ask for (the order sheet's file names). */
export const SONG_NAMES = Object.keys(SONGS);
export const JINGLES = ['victory', 'defeat', 'levelup', 'classchange', 'support'];
