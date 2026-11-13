// BGM / jingle / sound-effect engine.
//
// - Each track name (design/asset-orders.md §1) plays from a delivered file when src/audio-manifest.ts lists one
//   (copied to play/assets/audio/bgm by tools/build-audio.mjs), otherwise — or when the file fails to load — from
//   the placeholder score in songs.ts, synthesized live.
// - Files play through HTMLAudioElement (works from file://, where fetch + decodeAudioData does not).
// - The synth is scheduled ahead (LOOKAHEAD seconds) from a timer, so timer jitter never moves a note.
// - Nothing sounds before the first tap / key (autoplay rules); the song asked for meanwhile starts then.
// - Hidden tab: everything pauses. window.__fast (automated tests): everything is silent, but the logical state
//   (`current`, `log`) still follows the game so tests can check which track would play.
import { BGM_FILES } from '../audio-manifest';
import { playSfx, type Sfx } from './sfx';
import { SONGS } from './songs';
import { compile, type Compiled } from './theory';
import { buildMix, playDrum, playNote, type Mix } from './voices';
import type { Drum, Inst } from './theory';

export interface AudioSettings { bgm: number; sfx: number; mute: boolean }
const KEY = 'fittoa-audio-v1';
export const DEFAULT_SETTINGS: AudioSettings = { bgm: 45, sfx: 55, mute: false };
const LOOKAHEAD = 0.3, TICK_MS = 40, XFADE = 1.4;
const fast = () => typeof window !== 'undefined' && !!(window as any).__fast;
/** Slider 0–100 → gain (perceptual curve). */
const curve = (v: number) => Math.pow(Math.max(0, Math.min(100, v)) / 100, 1.6) * 1.5;

/** Schedules one compiled song onto `dest`, live (tick) or all at once (offline rendering). */
export class SongPlayer {
  readonly out: GainNode;
  private buses: AudioNode[] = [];
  private idx = 0;
  private loopStart: number;
  private seed = 1;
  done = false;
  constructor(private mix: Mix, readonly song: Compiled, dest: AudioNode, start: number, fadeIn = 0) {
    const ac = mix.ac;
    this.loopStart = start;
    this.out = ac.createGain();
    const lvl = (song.def.gain ?? 1) * 0.9;
    if (fadeIn > 0) { this.out.gain.setValueAtTime(0, ac.currentTime); this.out.gain.linearRampToValueAtTime(lvl, start + fadeIn); }
    else this.out.gain.value = lvl;
    this.out.connect(dest);
    for (const tr of song.def.tracks) {
      const v = ac.createGain(); v.gain.value = tr.vol ?? 1;
      const p = ac.createStereoPanner(); p.pan.value = tr.pan ?? 0;
      const s = ac.createGain(); s.gain.value = tr.rev ?? 0.3;
      v.connect(p); p.connect(this.out); p.connect(s); s.connect(mix.reverb);
      this.buses.push(v); this.buses.push(p, s);
    }
  }
  private rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  /** End time of a non-looping song (its last note plus a tail). */
  get endTime() { return this.loopStart + this.song.units * this.song.unitSec + 1.2; }
  /** Schedules every note that starts before `horizon`. */
  tick(horizon: number) {
    const { events, units, unitSec } = this.song, ac = this.mix.ac;
    const loop = this.song.def.loop !== false;
    for (let guard = 0; guard < 4000 && !this.done; guard++) {
      if (this.idx >= events.length) {
        if (!loop) { this.done = true; break; }
        this.loopStart += units * unitSec; this.idx = 0;
        continue;
      }
      const e = events[this.idx], at = this.loopStart + e.t * unitSec;
      if (at > horizon) break;
      this.idx++;
      if (at < ac.currentTime - 0.03) continue; // fell behind (tab was throttled): skip rather than pile up
      const bus = this.buses[e.k * 3];
      const v = e.v * (0.93 + this.rnd() * 0.1);
      if (e.drum) playDrum(ac, bus, e.inst as Drum, at, e.d * unitSec, e.m, v);
      else playNote(ac, bus, e.inst as Inst, Math.max(at + (this.rnd() - 0.5) * 0.008, ac.currentTime), e.d * unitSec * 0.98, e.m, v, e.glide);
    }
  }
  /** Fades out from `at` over `fade` seconds and disconnects afterwards. */
  stop(fade: number) {
    const ac = this.mix.ac, g = this.out.gain, now = ac.currentTime;
    this.done = true;
    g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + Math.max(0.02, fade));
    setTimeout(() => { try { this.out.disconnect(); } catch { /* already gone */ } }, (fade + 3) * 1000);
  }
}

/** A delivered recording, played by an <audio> element with a JS-driven fade. */
class FilePlayer {
  readonly el: HTMLAudioElement;
  fade = 0; target = 1; rate = 1; dead = false; ended = false;
  constructor(url: string, loop: boolean, private onFail: () => void, fadeIn: number) {
    this.el = new Audio();
    this.el.preload = 'auto'; this.el.loop = loop; this.el.src = url;
    this.el.addEventListener('error', () => { if (!this.dead) onFail(); });
    this.el.addEventListener('ended', () => { this.ended = true; });
    this.rate = fadeIn > 0 ? 1 / fadeIn : 1000;
  }
  play() {
    const p = this.el.play();
    if (p) p.catch((e: DOMException) => { if (!this.dead && e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') this.onFail(); });
  }
  stop(fade: number) { this.target = 0; this.rate = 1 / Math.max(0.02, fade); }
  /** Advances the fade; returns false once silent and released. */
  step(dt: number, level: number): boolean {
    if (this.dead) return false;
    this.fade += Math.sign(this.target - this.fade) * Math.min(Math.abs(this.target - this.fade), this.rate * dt);
    this.el.volume = Math.max(0, Math.min(1, level * this.fade));
    if (this.target === 0 && this.fade <= 0) { this.kill(); return false; }
    return true;
  }
  kill() { this.dead = true; try { this.el.pause(); this.el.removeAttribute('src'); this.el.load(); } catch { /* ignore */ } }
}

type Live = { name: string; synth?: SongPlayer; file?: FilePlayer };

export class Engine {
  settings: AudioSettings = { ...DEFAULT_SETTINGS };
  /** The track the game wants now (null = silence), whether or not it is audible yet. */
  current: string | null = null;
  /** Every change of `current` and every jingle, in order (for tests). */
  readonly log: { kind: 'bgm' | 'jingle'; name: string | null; t: number }[] = [];
  private stack: (string | null)[] = [];
  private ac: AudioContext | null = null;
  private mix: Mix | null = null;
  private live: Live | null = null;
  private fading: Live[] = [];
  private jing: (Live & { end: number }) | null = null;
  private failed = new Set<string>();
  private duck = 1;
  private lastSfx = new Map<Sfx, number>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTick = 0;
  private hidden = false;

  constructor() {
    try { const j = localStorage.getItem(KEY); if (j) { const d = JSON.parse(j); this.settings = { bgm: num(d.bgm, DEFAULT_SETTINGS.bgm), sfx: num(d.sfx, DEFAULT_SETTINGS.sfx), mute: !!d.mute }; } } catch { /* storage unavailable */ }
  }

  // ---------- setup ----------
  /** Hooks the first user gesture (autoplay rules) and tab visibility. Call once at boot. */
  attach() {
    const go = () => this.unlock();
    for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, go, { capture: true, passive: true });
    document.addEventListener('visibilitychange', () => { this.hidden = document.hidden; this.onVisibility(); });
  }
  get ready() { return !!this.ac && !fast() && !this.hidden; }
  /** Creates / resumes the audio context inside a user gesture and starts what should be playing. */
  unlock() {
    if (fast()) return;
    if (!this.ac) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      try { this.ac = new AC({ latencyHint: 'interactive' }); } catch { return; }
      this.mix = buildMix(this.ac);
      this.applySettings();
      this.timer = setInterval(() => this.tick(), TICK_MS);
      this.ac.resume().catch(() => { /* retried on the next gesture */ });
      this.restart(0.8);
      return;
    }
    if (this.ac.state === 'suspended' && !this.hidden) this.ac.resume().then(() => { if (!this.live && this.current) this.restart(0.8); }).catch(() => { /* ignore */ });
    if (this.live?.file && this.live.file.el.paused && !this.hidden) this.live.file.play();
  }
  private onVisibility() {
    if (!this.ac) return;
    const all = [this.live, ...this.fading, this.jing].filter(Boolean) as Live[];
    if (this.hidden) { this.ac.suspend().catch(() => { /* ignore */ }); for (const l of all) l.file?.el.pause(); }
    else if (!fast()) {
      this.ac.resume().catch(() => { /* ignore */ });
      for (const l of all) if (l.file && !l.file.dead && !l.file.ended) l.file.play();
      if (!this.live && this.current) this.restart(0.8); // the track changed while the tab was hidden
    }
  }

  // ---------- settings ----------
  set(s: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...s };
    try { localStorage.setItem(KEY, JSON.stringify(this.settings)); } catch { /* storage unavailable: settings last for this visit */ }
    this.applySettings();
  }
  private get musicLevel() { return this.settings.mute ? 0 : curve(this.settings.bgm); }
  private get sfxLevel() { return this.settings.mute ? 0 : curve(this.settings.sfx); }
  private applySettings() {
    if (!this.mix || !this.ac) return;
    const now = this.ac.currentTime;
    this.mix.music.gain.setTargetAtTime(this.musicLevel, now, 0.05);
    this.mix.jingle.gain.setTargetAtTime(this.musicLevel, now, 0.05);
    this.mix.sfx.gain.setTargetAtTime(this.sfxLevel, now, 0.03);
  }

  // ---------- BGM ----------
  /** Which source a track would play from. */
  source(name: string): 'file' | 'synth' | 'none' {
    if (fileUrl(name) && !this.failed.has(name)) return 'file';
    return SONGS[name] ? 'synth' : 'none';
  }
  /** Switches the BGM (cross-fade). null = silence. The same track keeps playing (no restart). */
  bgm(name: string | null, fade = XFADE) {
    if (name !== null && !SONGS[name] && !fileUrl(name)) return; // unknown name: keep what is playing
    if (name === this.current) return;
    this.current = name;
    this.log.push({ kind: 'bgm', name, t: Math.round(performance.now()) });
    this.restart(fade);
  }
  /** Plays a track for a while; pop() returns to the one before. */
  push(name: string | null) { this.stack.push(this.current); this.bgm(name); }
  pop() { if (this.stack.length) this.bgm(this.stack.pop()!); }
  private restart(fade: number) {
    if (this.live) { this.release(this.live, fade); this.live = null; }
    if (!this.ready || !this.current) return;
    this.live = this.start(this.current, false, fade);
  }
  private release(l: Live, fade: number) {
    l.synth?.stop(fade);
    if (l.file) { l.file.stop(fade); this.fading.push(l); }
  }
  /** Starts a track from its file, or the synth (also when the file fails). */
  private start(name: string, jingle: boolean, fade: number): Live {
    const url = this.failed.has(name) ? null : fileUrl(name);
    if (url) {
      const l: Live = { name };
      l.file = new FilePlayer(url, !jingle, () => this.fileFailed(name, l, jingle), fade);
      l.file.play();
      return l;
    }
    return { name, synth: this.synth(name, jingle, fade) };
  }
  private synth(name: string, jingle: boolean, fade: number): SongPlayer | undefined {
    const def = SONGS[name];
    if (!def || !this.mix || !this.ac) return undefined;
    const t = this.ac.currentTime + 0.06;
    const p = new SongPlayer(this.mix, compile(def), jingle ? this.mix.jingle : this.mix.music, t, jingle ? 0 : Math.min(fade, 1));
    p.tick(t + LOOKAHEAD);
    return p;
  }
  /** A delivered file could not be played: use the placeholder from now on. */
  private fileFailed(name: string, l: Live, jingle: boolean) {
    if (this.failed.has(name) && !l.file) return;
    this.failed.add(name);
    console.warn(`audio: ${name} のファイルを再生できないため、仮の曲で代用します`);
    l.file?.kill(); l.file = undefined;
    if (this.live === l && this.ready) l.synth = this.synth(name, false, 0.3);
    if (this.jing === l && this.ready) { l.synth = this.synth(name, true, 0); this.jing.end = l.synth ? l.synth.endTime : 0; }
  }

  // ---------- jingles ----------
  /** Plays a short non-looping piece over the ducked BGM. stop = end the BGM first (victory / defeat). */
  jingle(name: string, opts: { stop?: boolean } = {}) {
    this.log.push({ kind: 'jingle', name, t: Math.round(performance.now()) });
    if (opts.stop) this.bgm(null, 0.5);
    if (!this.ready || !this.mix || !this.ac) return;
    if (this.jing) this.release(this.jing, 0.15);
    const l = this.start(name, true, 0) as Live & { end: number };
    const def = SONGS[name];
    l.end = l.synth ? l.synth.endTime : this.ac.currentTime + (def ? compile(def).units * compile(def).unitSec + 1 : 6);
    this.jing = l;
    const now = this.ac.currentTime;
    this.mix.duck.gain.cancelScheduledValues(now);
    this.mix.duck.gain.setTargetAtTime(0.2, now, 0.05);
    this.duck = 0.2;
  }
  private unduck() {
    if (!this.mix || !this.ac) return;
    this.mix.duck.gain.setTargetAtTime(1, this.ac.currentTime, 0.35);
    this.duck = 1;
  }

  // ---------- sound effects ----------
  sfx(name: Sfx) {
    if (!this.ready || !this.mix || !this.ac || this.settings.mute) return;
    const now = this.ac.currentTime, last = this.lastSfx.get(name) ?? -1;
    if (now - last < 0.035) return; // the same sound twice in one frame
    this.lastSfx.set(name, now);
    playSfx(this.ac, this.mix.sfx, this.mix.reverb, name, now + 0.005);
  }

  // ---------- scheduler ----------
  private tick() {
    if (!this.ac || !this.mix) return;
    if (fast()) { this.silence(); return; }
    if (this.ac.state !== 'running') return;
    const now = this.ac.currentTime, horizon = now + LOOKAHEAD;
    const dt = this.lastTick ? Math.min(0.25, (performance.now() - this.lastTick) / 1000) : TICK_MS / 1000;
    this.lastTick = performance.now();
    this.live?.synth?.tick(horizon);
    const lvl = this.musicLevel;
    if (this.live?.file) this.live.file.step(dt, lvl * this.duck);
    this.fading = this.fading.filter(l => l.file?.step(dt, lvl * this.duck));
    if (this.jing) {
      this.jing.synth?.tick(horizon);
      this.jing.file?.step(dt, lvl);
      if ((this.jing.file && this.jing.file.ended) || (!this.jing.file && now > this.jing.end - 0.9)) {
        if (this.jing.file) this.jing.file.kill();
        this.jing = null; this.unduck();
      }
    }
  }
  /** Test mode: stop every sound at once. */
  private silence() {
    if (this.live) { this.release(this.live, 0.01); this.live = null; }
    for (const l of this.fading) l.file?.kill();
    this.fading = [];
    if (this.jing) { this.release(this.jing, 0.01); this.jing = null; }
    if (this.ac?.state === 'running') this.ac.suspend().catch(() => { /* ignore */ });
  }

  /** Test view: what is audible right now. */
  debug() {
    return {
      current: this.current, state: this.ac?.state ?? 'none',
      playing: this.live ? { name: this.live.name, kind: this.live.file ? 'file' : this.live.synth ? 'synth' : 'none', paused: this.live.file?.el.paused ?? null, time: this.live.file?.el.currentTime ?? null, src: this.live.file?.el.currentSrc ?? null } : null,
      jingle: this.jing?.name ?? null, failed: [...this.failed], files: Object.keys(BGM_FILES), settings: { ...this.settings },
    };
  }
}
const num = (v: unknown, d: number) => (typeof v === 'number' && v >= 0 && v <= 100 ? v : d);

/** The delivered file for a track that this browser can play (mp3 preferred), or null. */
function fileUrl(name: string): string | null {
  const list = BGM_FILES[name];
  if (!list?.length) return null;
  if (typeof Audio === 'undefined') return list[0];
  const probe = new Audio();
  const ok = list.find(u => probe.canPlayType(/\.ogg(\?|$)/.test(u) ? 'audio/ogg' : 'audio/mpeg') !== '');
  return ok ?? null;
}

export const audio = new Engine();
