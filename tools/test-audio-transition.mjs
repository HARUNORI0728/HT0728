// Deterministic engine regression checks; media time and timers are simulated, not an auditory review.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({ entryPoints: ['src/audio/engine.ts'], bundle: true, format: 'esm', write: false });
const { Engine } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const realTimer = globalThis.setTimeout, realPerformance = globalThis.performance, realWindow = globalThis.window;
let clock = 0, advance = () => {};
globalThis.window = { __fast: false };
globalThis.performance = { now: () => clock };
globalThis.setTimeout = (fn, ms) => { queueMicrotask(() => { clock += ms; advance(ms); fn(); }); return 0; };
function fixture({ duration = 8000, stalled = false, synth = false } = {}) {
  clock = 0; window.__fast = false;
  const engine = new Engine();
  engine.ac = { currentTime: 0, state: 'running' };
  engine.mix = { duck: { gain: { setTargetAtTime() {} } } };
  const recording = { el: { currentTime: 0, volume: 1 }, ended: false, killed: false,
    step() { return true; }, stop() {}, kill() { this.killed = true; } };
  const score = { tick() {}, stop() {}, dispose() { this.disposed = true; }, disposed: false };
  engine.jing = { name: 'victory', end: duration / 1000, ...(synth ? { synth: score } : { file: recording }) };
  advance = ms => {
    if (!engine.hidden && !stalled) {
      engine.ac.currentTime += ms / 1000;
      recording.el.currentTime += ms / 1000;
      recording.ended = clock >= duration;
    }
    if (!window.__fast) engine.tick();
  };
  return { engine, recording, score };
}
const signal = () => new AbortController().signal;
try {
  let f = fixture();
  await f.engine.waitForJingle(signal());
  assert(clock >= 8000 && clock < 8100); assert(f.recording.killed);
  f = fixture({ synth: true, duration: 7200 });
  await f.engine.waitForJingle(signal());
  assert(clock >= 7200); assert(f.score.disposed);
  f = fixture(); const skip = new AbortController(); skip.abort();
  await f.engine.waitForJingle(skip.signal);
  assert(clock >= 500 && clock < 550); assert(f.recording.killed);
  f = fixture(); f.engine.settings.mute = true;
  await f.engine.waitForJingle(signal());
  assert(clock >= 1300 && clock < 1400); assert(f.recording.killed);
  f = fixture(); f.engine.settings.bgm = 0;
  await f.engine.waitForJingle(signal(), 1500);
  assert(clock >= 1500 && clock < 1600); assert(f.recording.killed);
  f = fixture(); window.__fast = true;
  await f.engine.waitForJingle(signal()); assert.equal(clock, 0); assert(f.recording.killed);
  f = fixture({ stalled: true });
  await f.engine.waitForJingle(signal());
  assert(clock >= 2000 && clock < 2200); assert(f.recording.killed);
  f = fixture(); advance = () => { f.engine.hidden = true; };
  await f.engine.waitForJingle(skip.signal);
  assert(clock < 500); assert(f.recording.killed); assert.equal(f.engine.jing, null);
  f = fixture({ synth: true }); advance = () => { f.engine.hidden = true; };
  await f.engine.waitForJingle(skip.signal); assert(f.score.disposed);
  f = fixture(); f.engine.jing = null;
  await f.engine.waitForJingle(signal()); assert(clock >= 1300 && clock < 1400);
  console.log('PASS: 10 outcome-audio checks (file/synth completion, skip, mute, zero volume, fast, stalled, hidden during file/synth fade, unavailable audio)');
} finally {
  globalThis.setTimeout = realTimer; globalThis.performance = realPerformance; globalThis.window = realWindow;
}
