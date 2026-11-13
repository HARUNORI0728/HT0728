// Instruments for the placeholder music and the sound effects (Web Audio only, no samples).
// Every voice starts and ends at zero gain (rounded attacks, no clicks); layered oscillators, gentle filters and a
// shared reverb keep them soft rather than chip-tune bright.
import { freqOf, type Drum, type Inst } from './theory';

/** Per-context shared resources: noise, harmonic tables, reverb. */
interface Res { noise: AudioBuffer; waves: Record<string, PeriodicWave> }
const RES = new WeakMap<BaseAudioContext, Res>();
function res(ac: BaseAudioContext): Res {
  let r = RES.get(ac);
  if (r) return r;
  const len = ac.sampleRate * 2, noise = ac.createBuffer(1, len, ac.sampleRate), d = noise.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
  const wave = (amps: number[]) => {
    const re = new Float32Array(amps.length + 1), im = new Float32Array(amps.length + 1);
    amps.forEach((a, i) => { im[i + 1] = a; });
    return ac.createPeriodicWave(re, im);
  };
  r = {
    noise,
    waves: {
      piano: wave([1, 0.55, 0.22, 0.14, 0.07, 0.04, 0.02]),
      harp: wave([1, 0.42, 0.16, 0.08, 0.03]),
      guitar: wave([1, 0.68, 0.38, 0.22, 0.14, 0.08, 0.05, 0.03]),
      pizz: wave([1, 0.5, 0.33, 0.25, 0.2, 0.16, 0.12]),
      bass: wave([1, 0.45, 0.16, 0.06]),
      organ: wave([1, 0.75, 0.45, 0.32, 0, 0.2, 0, 0.14]),
      reed: wave([1, 0.1, 0.55, 0.08, 0.35, 0.05, 0.2, 0.03, 0.12]),
    },
  };
  RES.set(ac, r);
  return r;
}

/** Algorithmic reverb impulse: stereo decaying noise, slightly darker in the tail. */
export function makeReverb(ac: BaseAudioContext, seconds = 2.6, decay = 0.62): ConvolverNode {
  const rate = ac.sampleRate, len = Math.floor(rate * seconds), buf = ac.createBuffer(2, len, rate);
  let s = 987654321;
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    const pre = Math.floor(rate * 0.018);
    for (let i = 0; i < len; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      const n = (s / 4294967296) * 2 - 1, tt = i / rate;
      const k = Math.min(0.85, 0.25 + tt * 0.5); // the tail loses its highs
      lp = lp * k + n * (1 - k);
      d[i] = i < pre ? 0 : lp * Math.exp(-tt / decay) * (1 + 0.6 * k);
    }
  }
  const c = ac.createConvolver();
  c.normalize = true;
  c.buffer = buf;
  return c;
}

/** Master chain: music / sfx / jingle buses and the reverb into a compressor and a limiter. */
export interface Mix {
  ac: BaseAudioContext; out: GainNode; music: GainNode; duck: GainNode; jingle: GainNode; sfx: GainNode; reverb: GainNode;
}
export function buildMix(ac: BaseAudioContext): Mix {
  const out = ac.createGain(); out.gain.value = 0.9;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.012; comp.release.value = 0.3;
  const lim = ac.createDynamicsCompressor();
  lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
  const pre = ac.createGain(); pre.gain.value = 0.62;
  pre.connect(comp); comp.connect(lim); lim.connect(out); out.connect(ac.destination);
  const music = ac.createGain(), duck = ac.createGain(), jingle = ac.createGain(), sfx = ac.createGain();
  music.connect(duck); duck.connect(pre); jingle.connect(pre); sfx.connect(pre);
  const reverb = ac.createGain(); reverb.gain.value = 1;
  const conv = makeReverb(ac);
  const rvOut = ac.createGain(); rvOut.gain.value = 0.55;
  reverb.connect(conv); conv.connect(rvOut); rvOut.connect(pre);
  return { ac, out, music, duck, jingle, sfx, reverb };
}

// ---------- envelope helpers ----------
/** Attack to `peak`, optional decay toward `sus`, release from the end of the note. Returns the stop time. */
function adsr(g: AudioParam, t: number, dur: number, a: number, peak: number, d: number, sus: number, r: number): number {
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(peak, t + a);
  if (d > 0) g.setTargetAtTime(peak * sus, t + a, d);
  const end = t + Math.max(dur, a + 0.01);
  g.setTargetAtTime(0, end, r / 4);
  return end + r * 1.6;
}
/** Plucked / struck: attack then a natural exponential decay (ignores the note length beyond `maxLen`). */
function pluck(g: AudioParam, t: number, a: number, peak: number, tau: number, cut: number, r = 0.08): number {
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(peak, t + a);
  g.setTargetAtTime(0, t + a, tau);
  g.setTargetAtTime(0, t + cut, r / 3);
  return t + cut + r * 2;
}
const osc = (ac: BaseAudioContext, type: OscillatorType | PeriodicWave, f: number, detune = 0) => {
  const o = ac.createOscillator();
  if (type instanceof PeriodicWave) o.setPeriodicWave(type); else o.type = type as OscillatorType;
  o.frequency.value = f; o.detune.value = detune;
  return o;
};
const gain = (ac: BaseAudioContext, v = 0) => { const g = ac.createGain(); g.gain.value = v; return g; };
const filt = (ac: BaseAudioContext, type: BiquadFilterType, f: number, q = 0.7, gn = 0) => {
  const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.gain.value = gn; return b;
};
/** Delayed vibrato on the given oscillators. */
function vibrato(ac: BaseAudioContext, oscs: OscillatorNode[], t: number, stop: number, rate: number, depthCents: number, delay: number) {
  if (stop - t < delay + 0.15) return;
  const l = osc(ac, 'sine', rate), g = gain(ac);
  g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(depthCents, t + delay + 0.35);
  l.connect(g); for (const o of oscs) g.connect(o.detune);
  l.start(t); l.stop(stop);
}
function startStop(nodes: (OscillatorNode | AudioBufferSourceNode)[], t: number, stop: number) { for (const n of nodes) { n.start(t); n.stop(stop); } }
function noiseSrc(ac: BaseAudioContext, offset = Math.random()) {
  const s = ac.createBufferSource(); s.buffer = res(ac).noise; s.loop = true; s.loopStart = 0; s.loopEnd = s.buffer.duration;
  (s as any).__off = offset * 1.5;
  return s;
}
function startNoise(s: AudioBufferSourceNode, t: number, stop: number) { s.start(t, (s as any).__off ?? 0); s.stop(stop); }

/**
 * Plays one note. out = the track's bus. vel 0..1. glide = slide up into the note.
 * Levels are balanced so a melody at vel 1 peaks around 0.25 before the master chain.
 */
export function playNote(ac: BaseAudioContext, out: AudioNode, inst: Inst, t: number, dur: number, midi: number, vel: number, glide = false) {
  const f = freqOf(midi), w = res(ac).waves;
  const v = vel;
  switch (inst) {
    case 'flute': case 'recorder': {
      const rec = inst === 'recorder';
      const o1 = osc(ac, 'sine', f), o2 = osc(ac, 'triangle', f, 3), g = gain(ac), g2 = gain(ac, rec ? 0.55 : 0.28);
      const lp = filt(ac, 'lowpass', rec ? 3800 : 3000);
      o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(out);
      const stop = adsr(g.gain, t, dur, rec ? 0.025 : 0.055, 0.2 * v, 0.35, 0.82, 0.14);
      if (!rec || dur > 0.6) vibrato(ac, [o1, o2], t, stop, 5.1, rec ? 8 : 16, 0.22);
      startStop([o1, o2], t, stop);
      // breath at the start
      const n = noiseSrc(ac), nb = filt(ac, 'bandpass', Math.min(8000, f * 3), 1.2), ng = gain(ac);
      n.connect(nb); nb.connect(ng); ng.connect(out);
      ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.05 * v, t + 0.015); ng.gain.setTargetAtTime(0, t + 0.02, 0.05);
      startNoise(n, t, t + 0.3);
      return;
    }
    case 'oboe': case 'clarinet': {
      const ob = inst === 'oboe';
      const o1 = osc(ac, ob ? 'sawtooth' : w.reed, f), o2 = osc(ac, ob ? w.reed : 'triangle', f, 4);
      const g = gain(ac), lp = filt(ac, 'lowpass', ob ? 2600 : Math.min(2600, f * 5)), pk = filt(ac, 'peaking', ob ? 1250 : 900, 1.3, ob ? 5 : 2);
      const g2 = gain(ac, 0.5);
      o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(pk); pk.connect(out);
      if (glide) { o1.frequency.setValueAtTime(f * 0.84, t); o1.frequency.exponentialRampToValueAtTime(f, t + 0.14); o2.frequency.setValueAtTime(f * 0.84, t); o2.frequency.exponentialRampToValueAtTime(f, t + 0.14); }
      const stop = adsr(g.gain, t, dur, ob ? 0.045 : 0.035, (ob ? 0.085 : 0.12) * v, 0.3, 0.85, 0.12);
      vibrato(ac, [o1, o2], t, stop, 5.4, ob ? 12 : 6, 0.25);
      startStop([o1, o2], t, stop);
      return;
    }
    case 'violin': case 'strings': case 'cello': {
      const n = inst === 'strings' ? 3 : 2, det = inst === 'strings' ? 9 : 5;
      const g = gain(ac), lp = filt(ac, 'lowpass', inst === 'cello' ? 900 + f * 1.2 : inst === 'violin' ? 2200 + f : 1500 + f * 0.8, 0.6);
      const os: OscillatorNode[] = [];
      for (let i = 0; i < n; i++) { const o = osc(ac, 'sawtooth', f, (i - (n - 1) / 2) * det * 2 / Math.max(1, n - 1)); o.connect(g); os.push(o); }
      // a soft bowed swell: the filter opens a little after the attack
      lp.frequency.setValueAtTime(lp.frequency.value * 0.6, t); lp.frequency.linearRampToValueAtTime(lp.frequency.value, t + 0.18);
      g.connect(lp); lp.connect(out);
      const a = inst === 'strings' ? 0.12 : inst === 'cello' ? 0.09 : 0.07;
      const pk = (inst === 'strings' ? 0.055 : inst === 'cello' ? 0.1 : 0.075) * v;
      const stop = adsr(g.gain, t, dur, a, pk, 0.5, 0.9, inst === 'strings' ? 0.32 : 0.24);
      vibrato(ac, os, t, stop, inst === 'cello' ? 5.0 : 5.6, inst === 'strings' ? 7 : 14, 0.18);
      startStop(os, t, stop);
      return;
    }
    case 'pad': {
      const g = gain(ac), lp = filt(ac, 'lowpass', 700 + f * 0.6, 0.3);
      const os = [osc(ac, 'sawtooth', f, -11), osc(ac, 'sawtooth', f, 11), osc(ac, 'triangle', f * 0.5)];
      for (const o of os) o.connect(g);
      g.connect(lp); lp.connect(out);
      const stop = adsr(g.gain, t, dur, Math.min(0.6, dur * 0.4), 0.032 * v, 0, 1, 0.9);
      startStop(os, t, stop);
      return;
    }
    case 'harp': case 'guitar': case 'pizz': case 'piano': {
      const wave = w[inst];
      const o = osc(ac, wave, f, (Math.random() - 0.5) * 4), g = gain(ac);
      const bright = inst === 'piano' ? 2600 + 2400 * v : inst === 'harp' ? 3600 : inst === 'guitar' ? 3200 : 2000;
      const lp = filt(ac, 'lowpass', bright, 0.5);
      lp.frequency.setValueAtTime(bright, t);
      lp.frequency.setTargetAtTime(inst === 'pizz' ? 700 : Math.max(500, f * 2.2), t + 0.005, inst === 'piano' ? 0.5 : inst === 'pizz' ? 0.05 : 0.18);
      o.connect(lp); lp.connect(g); g.connect(out);
      let stop: number;
      if (inst === 'piano') {
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2 * v, t + 0.004);
        g.gain.setTargetAtTime(0.07 * v, t + 0.004, 0.35);
        g.gain.setTargetAtTime(0, t + Math.max(dur, 0.1), 0.12);
        stop = t + Math.max(dur, 0.1) + 0.7;
        // a little detuned second string for warmth
        const o2 = osc(ac, wave, f, 3.5), g2 = gain(ac, 0.35); o2.connect(g2); g2.connect(lp); startStop([o2], t, stop);
      } else if (inst === 'pizz') stop = pluck(g.gain, t, 0.004, 0.2 * v, 0.1, 0.5);
      else if (inst === 'guitar') stop = pluck(g.gain, t, 0.003, 0.15 * v, 0.42, Math.min(2.2, dur + 0.6));
      else stop = pluck(g.gain, t, 0.005, 0.17 * v, 0.55, 2.4);
      startStop([o], t, stop);
      return;
    }
    case 'stacc': {
      const g = gain(ac), lp = filt(ac, 'lowpass', 1600 + f, 0.6);
      const os = [osc(ac, 'sawtooth', f, -6), osc(ac, 'sawtooth', f, 6)];
      for (const o of os) o.connect(g);
      g.connect(lp); lp.connect(out);
      const stop = adsr(g.gain, t, Math.min(dur * 0.55, 0.13), 0.012, 0.06 * v, 0.06, 0.6, 0.07);
      startStop(os, t, stop);
      return;
    }
    case 'glock': case 'celesta': case 'xylo': {
      const parts = inst === 'glock' ? [[1, 1], [2.76, 0.28], [5.4, 0.08]] : inst === 'celesta' ? [[1, 1], [2, 0.22], [3, 0.06]] : [[1, 1], [3.9, 0.3], [9.2, 0.06]];
      const tau = inst === 'glock' ? 0.55 : inst === 'celesta' ? 0.7 : 0.12;
      const peak = (inst === 'glock' ? 0.09 : inst === 'celesta' ? 0.1 : 0.16) * v;
      let stop = t;
      for (const [k, a] of parts) {
        const o = osc(ac, 'sine', f * k), g = gain(ac);
        o.connect(g); g.connect(out);
        const s = pluck(g.gain, t, 0.002, peak * a, tau / Math.sqrt(k), Math.min(2.5, tau * 5));
        startStop([o], t, s); stop = Math.max(stop, s);
      }
      return;
    }
    case 'brass': case 'horn': case 'tuba': {
      const g = gain(ac), lp = filt(ac, 'lowpass', 400, 1.1);
      const os = [osc(ac, 'sawtooth', f, -7), osc(ac, 'sawtooth', f, 7)];
      for (const o of os) o.connect(g);
      g.connect(lp); lp.connect(out);
      const open = inst === 'brass' ? 900 + 1700 * v : inst === 'horn' ? 600 + 900 * v : 420 + 300 * v;
      const hold = inst === 'brass' ? 700 + f * 0.8 : inst === 'horn' ? 450 + f * 0.6 : 300 + f;
      lp.frequency.setValueAtTime(250, t); lp.frequency.linearRampToValueAtTime(open, t + 0.06); lp.frequency.setTargetAtTime(hold, t + 0.07, 0.2);
      const pk = (inst === 'brass' ? 0.085 : inst === 'horn' ? 0.1 : 0.2) * v;
      const stop = adsr(g.gain, t, inst === 'tuba' ? Math.min(dur, 0.3) : dur, inst === 'horn' ? 0.07 : 0.04, pk, 0.25, 0.8, 0.13);
      if (inst !== 'tuba') vibrato(ac, os, t, stop, 5, 6, 0.3);
      startStop(os, t, stop);
      return;
    }
    case 'bass': {
      const o = osc(ac, w.bass, f), g = gain(ac), lp = filt(ac, 'lowpass', 520, 0.6);
      o.connect(lp); lp.connect(g); g.connect(out);
      const stop = adsr(g.gain, t, dur, 0.012, 0.32 * v, 0.35, 0.65, 0.1);
      startStop([o], t, stop);
      return;
    }
    case 'sub': {
      const o = osc(ac, 'sine', f), o2 = osc(ac, 'triangle', f * 2, 5), g = gain(ac), g2 = gain(ac, 0.15);
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(out);
      const stop = adsr(g.gain, t, dur, 0.5, 0.3 * v, 0, 1, 1.0);
      startStop([o, o2], t, stop);
      return;
    }
    case 'organ': {
      const g = gain(ac), lp = filt(ac, 'lowpass', 3200, 0.5);
      const os = [osc(ac, w.organ, f), osc(ac, w.organ, f, 5)];
      for (const o of os) o.connect(g);
      g.connect(lp); lp.connect(out);
      const stop = adsr(g.gain, t, dur, 0.03, 0.05 * v, 0, 1, 0.18);
      startStop(os, t, stop);
      return;
    }
    case 'harmonic': {
      const o = osc(ac, 'sine', f), o2 = osc(ac, 'sine', f * 2, 3), g = gain(ac), g2 = gain(ac, 0.12);
      o.connect(g); o2.connect(g2); g2.connect(g); g.connect(out);
      const stop = adsr(g.gain, t, dur, Math.min(0.9, dur * 0.5), 0.03 * v, 0, 1, 1.2);
      vibrato(ac, [o, o2], t, stop, 4.5, 6, 0.4);
      startStop([o, o2], t, stop);
      return;
    }
    case 'swell': {
      // grows over the whole note then stops short: a reversed shimmer
      const o = osc(ac, 'triangle', f), o2 = osc(ac, 'sine', f * 2.005), g = gain(ac), hp = filt(ac, 'highpass', 500);
      o.connect(g); o2.connect(g); g.connect(hp); hp.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.0001, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.045 * v, t + dur);
      g.gain.setTargetAtTime(0, t + dur, 0.03);
      startStop([o, o2], t, t + dur + 0.2);
      return;
    }
    case 'rain': {
      const n = noiseSrc(ac), hp = filt(ac, 'highpass', 2200), lp = filt(ac, 'lowpass', 6500), g = gain(ac);
      n.connect(hp); hp.connect(lp); lp.connect(g); g.connect(out);
      const stop = adsr(g.gain, t, dur, 1.2, 0.035 * v, 0, 1, 1.4);
      startNoise(n, t, stop);
      return;
    }
  }
}

/** Plays one drum hit. m = pitch for the timpani. */
export function playDrum(ac: BaseAudioContext, out: AudioNode, d: Drum, t: number, dur: number, midi: number, vel: number) {
  const v = vel;
  const noiseHit = (type: BiquadFilterType, f: number, q: number, peak: number, tau: number, len = tau * 6) => {
    const n = noiseSrc(ac), b = filt(ac, type, f, q), g = gain(ac);
    n.connect(b); b.connect(g); g.connect(out);
    pluck(g.gain, t, 0.002, peak, tau, len);
    startNoise(n, t, t + len + 0.2);
  };
  const tone = (type: OscillatorType, f0: number, f1: number, sweep: number, peak: number, tau: number) => {
    const o = osc(ac, type, f0), g = gain(ac);
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
    o.connect(g); g.connect(out);
    const s = pluck(g.gain, t, 0.003, peak, tau, tau * 6);
    startStop([o], t, s);
  };
  switch (d) {
    case 'kick': tone('sine', 95, 42, 0.14, 0.55 * v, 0.16); noiseHit('lowpass', 300, 0.7, 0.08 * v, 0.03); return;
    case 'heart': tone('sine', 70, 40, 0.12, 0.6 * v, 0.13); return;
    case 'snare': noiseHit('bandpass', 1900, 0.8, 0.2 * v, 0.06); tone('triangle', 200, 160, 0.04, 0.08 * v, 0.04); return;
    case 'timp': {
      const f = freqOf(midi);
      tone('sine', f * 1.03, f, 0.06, 0.42 * v, 0.5); tone('sine', f * 1.5, f * 1.49, 0.06, 0.08 * v, 0.25);
      noiseHit('lowpass', 500, 0.5, 0.08 * v, 0.03);
      return;
    }
    case 'hat': noiseHit('highpass', 7500, 0.6, 0.05 * v, 0.022); return;
    case 'tick': tone('sine', 1650, 1600, 0.01, 0.08 * v, 0.018); tone('sine', 2600, 2500, 0.01, 0.03 * v, 0.012); return;
    case 'shaker': {
      const n = noiseSrc(ac), b = filt(ac, 'bandpass', 5500, 1.4), g = gain(ac);
      n.connect(b); b.connect(g); g.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06 * v, t + 0.018); g.gain.setTargetAtTime(0, t + 0.02, 0.035);
      startNoise(n, t, t + 0.3);
      return;
    }
    case 'taiko': tone('sine', 78, 48, 0.2, 0.65 * v, 0.32); noiseHit('lowpass', 260, 0.7, 0.18 * v, 0.07); return;
    case 'tamb': noiseHit('highpass', 6500, 0.8, 0.06 * v, 0.05); noiseHit('bandpass', 9500, 3, 0.04 * v, 0.08); return;
    case 'cym': {
      // a soft suspended-cymbal swell over the held length
      const n = noiseSrc(ac), hp = filt(ac, 'highpass', 3500), g = gain(ac);
      n.connect(hp); hp.connect(g); g.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.0001, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.05 * v, t + Math.max(0.05, dur));
      g.gain.setTargetAtTime(0, t + dur, 0.35);
      startNoise(n, t, t + dur + 2);
      return;
    }
  }
}
