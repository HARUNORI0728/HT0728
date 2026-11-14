// Expand the game's existing score into full-length, reproducible arrangements.
// Usage: node tools/export-bgm-scores.mjs <output-directory>
import { stripTypeScriptTypes } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const out = resolve(process.argv[2] ?? '../music-runtime/scores');
mkdirSync(out, { recursive: true });
for (const part of ['songs','theory']) {
  writeFileSync(join(out, part+'.mjs'), stripTypeScriptTypes(readFileSync(`src/audio/${part}.ts`,'utf8')));
}
const { SONGS } = await import(pathToFileURL(join(out, 'songs.mjs')));
const { compile } = await import(pathToFileURL(join(out, 'theory.mjs')));
// Sections are [source start bar, source end bar, expression]. Cadences are kept intact.
const forms = {
  title: [120, [[0,26,.83],[2,18,.90],[10,26,1]]],
  camp: [120, [[0,16,.92],[16,32,1],[0,16,.88]]],
  map_dawn: [150, [[0,24,.90],[0,24,.96],[0,24,1]]],
  map_enemy: [90, [[0,16,.88],[0,16,1],[8,16,.94]]],
  boss: [120, [[0,24,.93],[0,24,1],[0,24,.97]]],
  crisis: [120, [[0,16,.82],[0,16,.9],[0,16,.98],[0,16,1],[8,16,.92]]],
  sad: [120, [[0,16,.84],[0,16,.96]]],
  daily: [90, [[0,16,.94],[0,16,1],[8,16,.90]]],
  victory: [8, [[0,3,1]]],
  defeat: [8, [[0,3,.86]]],
};
for (const [name, [duration, sections]] of Object.entries(forms)) {
  const def = SONGS[name], score = compile(def), loop = def.loop !== false;
  const bars = sections.reduce((n, s) => n + s[1] - s[0], 0);
  const musicDuration = loop ? duration : name === 'victory' ? 6 : 6.4;
  const unitSec = musicDuration / (bars * def.bar);
  const tracks = def.tracks;
  const octaveShift = new Map();
  for (let k=0; k<tracks.length; k++) {
    const tr=tracks[k];
    if ('notes' in tr && ['flute','recorder','clarinet','oboe','strings','brass','horn'].includes(tr.inst)) {
      const high=Math.max(...score.events.filter(e=>e.k===k).map(e=>e.m));
      const top=tr.inst==='horn' ? 76 : 84;
      octaveShift.set(k,Math.max(0,Math.ceil((high-top)/12))*12);
    }
  }
  const events = [];
  let cursor = 0;
  for (const [from, to, energy] of sections) {
    if (from < 0 || to > score.bars || from >= to) throw Error(`Invalid section in ${name}`);
    const start = from * def.bar, end = to * def.bar;
    for (const e of score.events) {
      // Rearticulate sustained notes crossing an arrangement splice, instead of losing them.
      const t = Math.max(e.t, start), stop = Math.min(e.t + e.d, end);
      if (stop <= t) continue;
      const tr = tracks[e.k];
      // Transpose entire melody tracks, preserving every interval and phrase contour.
      const m=e.m-(octaveShift.get(e.k) ?? 0);
      const gate = ['stacc','pizz'].includes(e.inst) ? .70 : e.inst === 'guitar' ? .86 : .93;
      events.push({ ...e, m, t: (cursor + t - start) * unitSec,
        d: Math.max(.035, (stop - t) * unitSec * gate), v: e.v * energy });
    }
    cursor += end - start;
  }
  events.sort((a,b) => a.t-b.t);
  const data = { name, duration, loop, bars, bpm: 60 / unitSec / def.grid, sections, tracks, events,
    source: 'src/audio/songs.ts', soundfont: 'GeneralUser GS 2.0.3', sampleRate: 44100 };
  writeFileSync(join(out, name + '.json'), JSON.stringify(data));
  console.log(`${name}: ${bars} bars, ${data.bpm.toFixed(2)} BPM, ${duration}s, ${events.length} notes`);
}
