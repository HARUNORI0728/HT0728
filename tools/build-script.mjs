// Converts the screenplay (design/script-*.md) into game data (src/script/scenes.ts).
// Run by build.mjs and `npm run check` before compiling, so editing the screenplay updates the game.
//
// Screenplay format (see the 書式 section of the file):
//   ## 序章「…」 / ## 第N章「…」        → a part (the next `##` that is not a chapter or 序章 ends the scenes)
//   ### <label>　条件：<condition>       → one scene. Labels: 序章, N章・開幕, N章・終幕, N章・幕間「…」, N章・戦闘中①…
//   話者｜表情｜本文                      → one line. 表情 = normal/smile/angry/sad, or - (no portrait: art: false).
//                                           （地の文） = narration (who: '').
//   BGM：<曲名>                           → music. Right under the heading: the scene's track (scene.bgm).
//                                           Between lines: change the track at that point (a cue line { bgm }).
//                                           曲名 = a file name from design/asset-orders.md §1, なし (silence) or
//                                           そのまま (keep what is playing). No BGM line = keep what is playing.
// The text is copied exactly as written (only the line break is dropped).
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const SRC_DIR = 'design', OUT = 'src/script/scenes.ts';
const FACES = new Set(['normal', 'smile', 'angry', 'sad', 'dere']);
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const KIND = { 開幕: 'intro', 終幕: 'outro', 幕間: 'interlude', 戦闘中: 'battle' };
// Track names (design/asset-orders.md §1; jingles are played by the game, not by the screenplay).
const BGM = new Set(['title', 'prologue', 'camp', 'map_dawn', 'map_resolve', 'map_final', 'map_enemy', 'boss', 'crisis', 'daily', 'comedy', 'sad',
  'resolve', 'mystery', 'romance', 'family', 'orsted', 'final_boss', 'ending']);
const BGM_WORD = { なし: 'none', そのまま: 'keep' };

const files = readdirSync(SRC_DIR).filter(f => /^script-.*\.md$/.test(f)).sort();
const scenes = [], errors = [], warnings = [];
for (const file of files) {
  const path = `${SRC_DIR}/${file}`;
  let part = null, scene = null;
  readFileSync(path, 'utf8').split(/\r?\n/).forEach((raw, i) => {
    const at = `${path}:${i + 1}`;
    const h2 = raw.match(/^## (.+)$/);
    if (h2) {
      const t = h2[1].trim();
      part = /^(序章|第\d+章)/.test(t) ? { title: t, chapter: t.startsWith('序章') ? 0 : Number(t.match(/^第(\d+)章/)[1]) } : null;
      scene = null;
      return;
    }
    if (!part) return;
    const h3 = raw.match(/^### (.+?)[\s　]+条件[：:](.*)$/);
    if (h3) {
      const label = h3[1].trim(), cond = h3[2].trim();
      let id, title;
      if (label === '序章') { id = 'prologue'; title = part.title; }
      else {
        const m = label.match(/^(\d+)章・(開幕|終幕|幕間|戦闘中)(.*)$/);
        if (!m) { errors.push(`${at}: 場面の見出しを読めません: ${label}`); scene = null; return; }
        const rest = m[3].trim();
        let suffix = '';
        if (m[2] === '戦闘中') {
          const k = CIRCLED.indexOf(rest[0]);
          if (k < 0) { errors.push(`${at}: 戦闘中の番号（①など）がありません: ${label}`); scene = null; return; }
          suffix = String(k + 1);
        }
        id = `ch${m[1]}.${KIND[m[2]]}${suffix}`;
        title = `${part.title.replace(/「.*$/, '')}　${m[2]}${rest}`;
      }
      if (scenes.some(s => s.id === id)) errors.push(`${at}: 場面 ${id} が二度出てきます`);
      scene = { id, title, label, cond, part: part.title, chapter: part.chapter, lines: [] };
      scenes.push(scene);
      return;
    }
    if (/^#/.test(raw)) { scene = null; return; }
    const bgm = scene && raw.match(/^BGM[：:][\s　]*(\S+)[\s　]*$/);
    if (bgm) {
      const name = BGM_WORD[bgm[1]] ?? bgm[1];
      if (name !== 'none' && name !== 'keep' && !BGM.has(name)) { errors.push(`${at}: 曲名「${bgm[1]}」は曲リストにありません（${[...BGM].join(' / ')} / なし / そのまま）`); return; }
      if (!scene.lines.length && scene.bgm === undefined) scene.bgm = name;
      else if (name !== 'keep') scene.lines.push({ who: '', text: '', bgm: name });
      return;
    }
    if (!scene || !raw.includes('｜')) return;
    const a = raw.indexOf('｜'), b = raw.indexOf('｜', a + 1);
    if (b < 0) { errors.push(`${at}: 「話者｜表情｜本文」の形になっていません`); return; }
    const who = raw.slice(0, a).trim(), face = raw.slice(a + 1, b).trim(), text = raw.slice(b + 1);
    if (!who) { errors.push(`${at}: 話者がありません`); return; }
    if (face !== '-' && !FACES.has(face)) { errors.push(`${at}: 表情「${face}」は使えません（normal/smile/angry/sad/dere/-）`); return; }
    if (!text.trim()) { errors.push(`${at}: 本文がありません`); return; }
    const line = { who: who === '（地の文）' ? '' : who, text };
    if (face !== '-') line.face = face;
    else if (line.who) line.art = false; // 立ち絵を出さない
    scene.lines.push(line);
  });
}
for (const s of scenes) if (!s.lines.some(l => l.text)) errors.push(`${s.id}: 台詞がありません`);
for (const s of scenes) if (s.bgm === undefined) warnings.push(`${s.id}: BGM の指定がありません（直前の曲が続きます）`);
if (warnings.length) console.warn('build-script: ' + warnings.join('\n  '));
if (errors.length) { console.error('build-script: 脚本の読み込みに失敗しました\n' + errors.join('\n')); process.exit(1); }

const q = v => JSON.stringify(v);
const body = scenes.map(s => `  ${q(s.id)}: {\n    title: ${q(s.title)}, chapter: ${s.chapter},\n    cond: ${q(s.cond)},${s.bgm && s.bgm !== 'keep' ? ` bgm: ${q(s.bgm)},` : ''}\n    lines: [\n${s.lines.map(l => `      ${q(l)},`).join('\n')}\n    ],\n  },`).join('\n');
const out = `// Generated by tools/build-script.mjs from ${files.map(f => `${SRC_DIR}/${f}`).join(', ')}. Do not edit by hand:
// change the screenplay and run \`npm run build\` (or \`npm run check\`).
import type { Line } from '../data';

/**
 * One scene of the screenplay. chapter 0 = 序章. cond = the screenplay's 条件 (for reference; triggers live in data.ts).
 * bgm = the track the scene starts with ('none' = silence; absent = keep what is playing). Lines with \`bgm\` and no
 * text are music cues in the middle of the scene.
 */
export interface Scene { title: string; chapter: number; cond: string; bgm?: string; lines: Line[] }
export type SceneId =
${scenes.map(s => `  | ${q(s.id)}`).join('\n')};
/** Scene ids in screenplay order. */
export const SCENE_ORDER: SceneId[] = [${scenes.map(s => q(s.id)).join(', ')}];
export const SCENES: Record<SceneId, Scene> = {
${body}
};
`;
mkdirSync('src/script', { recursive: true });
let old = '';
try { old = readFileSync(OUT, 'utf8'); } catch { /* first run */ }
if (old !== out) writeFileSync(OUT, out);
console.log(`build-script: ${scenes.length} scenes, ${scenes.reduce((n, s) => n + s.lines.filter(l => l.text).length, 0)} lines, ${scenes.reduce((n, s) => n + (s.bgm && s.bgm !== 'keep' ? 1 : 0) + s.lines.filter(l => l.bgm).length, 0)} BGM cues → ${OUT}${old === out ? ' (unchanged)' : ''}`);
