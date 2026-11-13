// Sound effects, all synthesized. Short, soft-edged and kept out of the harsh 2–5 kHz range where possible.
import { playDrum, playNote } from './voices';

export type Sfx =
  | 'cursor' | 'select' | 'decide' | 'cancel' | 'button' | 'move' | 'hit' | 'crit' | 'miss' | 'kill' | 'heal'
  | 'phaseBlue' | 'phaseRed' | 'talk';
export const SFX_NAMES: Sfx[] = ['cursor', 'select', 'decide', 'cancel', 'button', 'move', 'hit', 'crit', 'miss', 'kill', 'heal', 'phaseBlue', 'phaseRed', 'talk'];

const g = (ac: BaseAudioContext, v = 0) => { const n = ac.createGain(); n.gain.value = v; return n; };
/** A sine/triangle blip with a smooth envelope. */
function blip(ac: BaseAudioContext, out: AudioNode, t: number, f: number, len: number, peak: number, type: OscillatorType = 'sine', f2?: number) {
  const o = ac.createOscillator(), e = g(ac);
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + len);
  o.connect(e); e.connect(out);
  e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(peak, t + 0.006); e.gain.setTargetAtTime(0, t + 0.01, len / 3);
  o.start(t); o.stop(t + len * 2 + 0.05);
}
/** Filtered noise burst (whooshes, impacts). */
function noise(ac: BaseAudioContext, out: AudioNode, t: number, len: number, peak: number, type: BiquadFilterType, f0: number, f1: number, q = 1) {
  const n = ac.createBufferSource(), b = ac.createBiquadFilter(), e = g(ac);
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * (len + 0.1)), ac.sampleRate), d = buf.getChannelData(0);
  let s = 22222;
  for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
  n.buffer = buf; b.type = type; b.Q.value = q;
  b.frequency.setValueAtTime(f0, t); b.frequency.exponentialRampToValueAtTime(f1, t + len);
  n.connect(b); b.connect(e); e.connect(out);
  e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(peak, t + Math.min(0.02, len / 4)); e.gain.setTargetAtTime(0, t + len * 0.4, len / 4);
  n.start(t); n.stop(t + len + 0.1);
}

/** Plays a sound effect at time t on `out` (the sfx bus); `rev` = reverb send. */
export function playSfx(ac: BaseAudioContext, out: AudioNode, rev: AudioNode, name: Sfx, t: number) {
  const wet = g(ac, 0.25); wet.connect(rev);
  const bus = g(ac, 1); bus.connect(out); bus.connect(wet);
  switch (name) {
    case 'cursor': blip(ac, bus, t, 1046, 0.05, 0.07); break;
    case 'talk': blip(ac, bus, t, 880, 0.035, 0.035, 'triangle'); break;
    case 'button': blip(ac, bus, t, 784, 0.05, 0.07, 'triangle'); break;
    case 'select': blip(ac, bus, t, 784, 0.06, 0.08, 'triangle'); blip(ac, bus, t + 0.05, 1175, 0.08, 0.08, 'triangle'); break;
    case 'decide':
      blip(ac, bus, t, 659, 0.08, 0.08, 'triangle'); blip(ac, bus, t, 988, 0.1, 0.05, 'sine');
      blip(ac, bus, t + 0.06, 1319, 0.14, 0.06, 'sine'); break;
    case 'cancel': blip(ac, bus, t, 660, 0.09, 0.07, 'triangle', 440); break;
    case 'move':
      noise(ac, bus, t, 0.06, 0.12, 'bandpass', 600, 380, 1.5); noise(ac, bus, t + 0.09, 0.06, 0.09, 'bandpass', 520, 330, 1.5); break;
    case 'hit':
      playDrum(ac, bus, 'kick', t, 0.1, 0, 0.7);
      noise(ac, bus, t, 0.12, 0.3, 'lowpass', 2600, 500, 0.8);
      blip(ac, bus, t, 180, 0.08, 0.15, 'triangle', 90); break;
    case 'crit':
      noise(ac, bus, t, 0.14, 0.16, 'bandpass', 900, 3500, 1.2); // swing
      playDrum(ac, bus, 'kick', t + 0.08, 0.1, 0, 1);
      noise(ac, bus, t + 0.08, 0.18, 0.38, 'lowpass', 3200, 400, 0.8);
      blip(ac, bus, t + 0.08, 220, 0.12, 0.2, 'triangle', 80);
      playNote(ac, bus, 'glock', t + 0.09, 0.3, 84, 0.7); playNote(ac, bus, 'glock', t + 0.09, 0.3, 91, 0.5); break;
    case 'miss': noise(ac, bus, t, 0.2, 0.12, 'bandpass', 500, 2400, 1.6); break;
    case 'kill':
      playDrum(ac, bus, 'kick', t, 0.1, 0, 0.8);
      noise(ac, bus, t, 0.5, 0.22, 'lowpass', 1800, 120, 0.9);
      blip(ac, bus, t, 330, 0.4, 0.12, 'triangle', 70); break;
    case 'heal':
      [72, 76, 79, 84, 88].forEach((m, i) => playNote(ac, bus, 'celesta', t + i * 0.055, 0.3, m, 0.75)); break;
    case 'phaseBlue':
      playNote(ac, bus, 'horn', t, 0.18, 62, 0.8); playNote(ac, bus, 'horn', t + 0.16, 0.42, 67, 0.9);
      playNote(ac, bus, 'horn', t + 0.16, 0.42, 71, 0.6); playDrum(ac, bus, 'timp', t + 0.16, 0.3, 43, 0.6); break;
    case 'phaseRed':
      playNote(ac, bus, 'horn', t, 0.18, 57, 0.8); playNote(ac, bus, 'horn', t + 0.16, 0.42, 53, 0.9);
      playNote(ac, bus, 'horn', t + 0.16, 0.42, 56, 0.6); playDrum(ac, bus, 'timp', t + 0.16, 0.3, 41, 0.7); break;
  }
}
