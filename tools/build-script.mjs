// Converts the screenplay (design/script-*.md) into game data (src/script/scenes.ts).
// Run by build.mjs and `npm run check` before compiling, so editing the screenplay updates the game.
//
// Screenplay format (see the 書式 section of each file):
//   ## 序章「…」 / ## 第N章「…」        → a part (the next `##` that is not a chapter or 序章 ends its scenes)
//   ### <label>　条件：<condition>       → one scene. Story labels (inside a part): 序章, N章・開幕, N章・終幕, N章・幕間「…」,
//                                           N章・戦闘中①… Labels read anywhere (script-endings.md / script-supports-*.md):
//                                           告白・<名前>, 後日談・<名前>（結婚｜仲間）, エピローグ・前半, エピローグ・締め,
//                                           差し替え・…, 差し込み・…, 支援・<名前>×<名前>・<C|B|A|S>,
//                                           嫁同士・<2桁>　<組>「<題>」（条件：の書き方は src/endings.ts の WIFE_TALKS の説明）.
//   話者｜表情｜本文                      → one line. 表情 = normal/smile/angry/sad/dere, or - (no portrait: art: false).
//                                           （地の文） = narration (who: '').
//   BGM：<曲名>                           → music. Right under the heading: the scene's track (scene.bgm).
//                                           Between lines: change the track at that point (a cue line { bgm }).
//                                           曲名 = a file name from design/asset-orders.md §1, なし (silence) or
//                                           そのまま (keep what is playing). No BGM line = keep what is playing.
//   背景：<名前>                          → background (assets/backgrounds/<名前>.png). Before the first line: the scene's
//                                           (scene.bg); between lines: a cue { bg }. なし = no background (over the map).
//   一枚絵：<名前>                        → event picture (assets/events/<名前>.png) from here until the next 背景 or the end.
//   選択：A｜B                            → the player's choice (告白). `#### ▼A` / `#### ▼B` below it start each branch.
// The text is copied exactly as written (only the line break is dropped).
// The support documents (script-supports-*.md) may be unfinished: a broken scene there is skipped with a warning
// instead of failing the build. Missing files are simply not read.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

const SRC_DIR = 'design', OUT = 'src/script/scenes.ts';
const FACES = new Set(['normal', 'smile', 'angry', 'sad', 'dere']);
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
const KIND = { 開幕: 'intro', 終幕: 'outro', 幕間: 'interlude', 戦闘中: 'battle' };
// Track names (design/asset-orders.md §1; jingles are played by the game, not by the screenplay).
const BGM = new Set(['title', 'prologue', 'camp', 'map_dawn', 'map_resolve', 'map_final', 'map_enemy', 'boss', 'crisis', 'daily', 'comedy', 'sad',
  'resolve', 'mystery', 'romance', 'family', 'orsted', 'final_boss', 'ending']);
const BGM_WORD = { なし: 'none', そのまま: 'keep' };
const RANK = new Set(['C', 'B', 'A', 'S']);

// Cast names → ids, read from src/data.ts (CAST) so the two never disagree.
const NAME_IDS = {};
{
  const data = readFileSync('src/data.ts', 'utf8');
  const cast = data.slice(data.indexOf('export const CAST'), data.indexOf('};', data.indexOf('export const CAST')));
  for (const m of cast.matchAll(/(\w+): \{ name: '([^']+)'/g)) NAME_IDS[m[2]] = m[1];
}
const pairKey = (a, b) => (a < b ? a + '+' + b : b + '+' + a);

const files = readdirSync(SRC_DIR).filter(f => /^script-.*\.md$/.test(f)).sort();
const scenes = [], supports = [], wives = [], errors = [], warnings = [];
for (const file of files) {
  const path = `${SRC_DIR}/${file}`;
  const lenient = /^script-supports-/.test(file);
  let part = null, scene = null, branch = -1;
  /** Records a problem: fails the build, or (support documents) drops the scene with a warning. */
  const fail = (at, msg) => {
    if (lenient) { warnings.push(`${at}: ${msg}（この場面は読み飛ばします）`); if (scene) scene.bad = true; }
    else errors.push(`${at}: ${msg}`);
  };
  const target = () => (branch >= 0 ? scene.choice.branches[branch] : scene.lines);
  readFileSync(path, 'utf8').split(/\r?\n/).forEach((raw, i) => {
    const at = `${path}:${i + 1}`;
    const h2 = raw.match(/^## (.+)$/);
    if (h2) {
      const t = h2[1].trim();
      part = /^(序章|第\d+章)/.test(t) ? { title: t, chapter: t.startsWith('序章') ? 0 : Number(t.match(/^第(\d+)章/)[1]) } : null;
      scene = null; branch = -1;
      return;
    }
    const h3 = raw.match(/^### (.+?)(?:[\s　]+条件[：:](.*))?$/);
    if (h3) {
      scene = null; branch = -1;
      const label = h3[1].trim(), cond = (h3[2] ?? '').trim();
      let id, title, chapter = part?.chapter ?? 11, kind = 'scene', extra = {};
      let m;
      if ((m = label.match(/^告白・(.+)$/)) && NAME_IDS[m[1]]) { id = `confess.${NAME_IDS[m[1]]}`; title = `告白　${m[1]}`; }
      else if ((m = label.match(/^後日談・(.+?)（(結婚|仲間)）$/)) && NAME_IDS[m[1]]) { id = `after.${NAME_IDS[m[1]]}.${m[2] === '結婚' ? 'wed' : 'friend'}`; title = `後日談　${m[1]}（${m[2]}）`; }
      else if (label === 'エピローグ・前半') { id = 'epilogue.open'; title = 'エピローグ（前半）'; }
      else if (label === 'エピローグ・締め') { id = 'epilogue.close'; title = 'エピローグ（締め）'; }
      else if (/^(差し替え|差し込み)・/.test(label)) { id = `frag:${label}`; title = label; }
      else if ((m = label.match(/^支援・(.+?)×(.+?)・([CBAS])$/))) {
        const a = NAME_IDS[m[1]], b = NAME_IDS[m[2]];
        if (!a || !b) { fail(at, `支援会話の名前を読めません: ${label}`); return; }
        kind = 'support'; id = `${pairKey(a, b)}:${m[3]}`; title = `${m[1]} × ${m[2]}　${m[3]}`;
        if (supports.some(s => s.id === id && !s.bad)) { fail(at, `支援会話 ${label} が二度出てきます`); return; }
      } else if ((m = label.match(/^嫁同士・(\d+)[\s　]+(.+?)「(.+)」$/))) {
        kind = 'wife';
        const pairM = m[2].match(/^(.+?)×(.+)$/);
        const members = pairM ? [NAME_IDS[pairM[1]], NAME_IDS[pairM[2]]] : [];
        if (pairM && members.some(x => !x)) { fail(at, `嫁同士の組の名前を読めません: ${m[2]}`); return; }
        const need = pairM ? 2 : /3人/.test(cond) ? 3 : 2;
        const minC = cond.match(/第(\d+)章のクリア後/), maxC = cond.match(/第(\d+)章の開始前/);
        id = `wife.${m[1].padStart(2, '0')}`; title = `${m[3]}`;
        extra = { no: Number(m[1]), group: m[2], members, need, common: !pairM, minCleared: minC ? Number(minC[1]) : undefined, maxCleared: maxC ? Number(maxC[1]) - 1 : undefined };
      } else if (part) {
        if (label === '序章') { id = 'prologue'; title = part.title; }
        else {
          const m2 = label.match(/^(\d+)章・(開幕|終幕|幕間|戦闘中)(.*)$/);
          if (!m2) { fail(at, `場面の見出しを読めません: ${label}`); return; }
          const rest = m2[3].trim();
          let suffix = '';
          if (m2[2] === '戦闘中') {
            const k = CIRCLED.indexOf(rest[0]);
            if (k < 0) { fail(at, `戦闘中の番号（①など）がありません: ${label}`); return; }
            suffix = String(k + 1);
          }
          id = `ch${m2[1]}.${KIND[m2[2]]}${suffix}`;
          title = `${part.title.replace(/「.*$/, '')}　${m2[2]}${rest}`;
        }
      } else {
        if (lenient) warnings.push(`${at}: 場面の見出しを読めません（読み飛ばします）: ${label}`);
        return;
      }
      if (kind === 'scene' && scenes.some(s => s.id === id)) fail(at, `場面 ${id} が二度出てきます`);
      scene = { id, title, label, cond, part: part?.title, chapter, lines: [], at, ...extra };
      (kind === 'support' ? supports : kind === 'wife' ? wives : scenes).push(scene);
      return;
    }
    const h4 = raw.match(/^#### (.+)$/);
    if (h4 && scene?.choice) {
      const opt = h4[1].trim().replace(/^▼/, '');
      const k = scene.choice.options.indexOf(opt);
      if (k < 0) { fail(at, `選択肢「${opt}」は 選択： の行にありません`); return; }
      branch = k;
      return;
    }
    if (/^#/.test(raw)) { scene = null; branch = -1; return; }
    if (!scene) return;
    const bgm = raw.match(/^BGM[：:][\s　]*(\S+)[\s　]*$/);
    if (bgm) {
      const name = BGM_WORD[bgm[1]] ?? bgm[1];
      if (name !== 'none' && name !== 'keep' && !BGM.has(name)) { fail(at, `曲名「${bgm[1]}」は曲リストにありません（${[...BGM].join(' / ')} / なし / そのまま）`); return; }
      if (!scene.lines.length && branch < 0 && scene.bgm === undefined) scene.bgm = name;
      else if (name !== 'keep') target().push({ who: '', text: '', bgm: name });
      return;
    }
    const bg = raw.match(/^背景[：:][\s　]*(\S+)[\s　]*$/);
    if (bg) {
      const name = bg[1] === 'なし' ? 'none' : bg[1];
      if (name !== 'none' && !/^[a-z0-9_]+$/.test(name)) { fail(at, `背景の名前「${bg[1]}」は英小文字・数字・_ で書いてください`); return; }
      if (!scene.lines.length && branch < 0 && scene.bg === undefined) scene.bg = name;
      else target().push({ who: '', text: '', bg: name });
      return;
    }
    const cg = raw.match(/^一枚絵[：:][\s　]*(\S+)[\s　]*$/);
    if (cg) {
      if (!/^[a-z0-9_]+$/.test(cg[1])) { fail(at, `一枚絵の名前「${cg[1]}」は英小文字・数字・_ で書いてください`); return; }
      target().push({ who: '', text: '', cg: cg[1] });
      return;
    }
    const ch = raw.match(/^選択[：:](.+)$/);
    if (ch) {
      const options = ch[1].split('｜').map(t => t.trim()).filter(Boolean);
      if (options.length < 2) { fail(at, '選択肢は「選択：A｜B」の形で2つ以上書いてください'); return; }
      scene.choice = { options, branches: options.map(() => []) };
      return;
    }
    if (!raw.includes('｜')) return;
    const a = raw.indexOf('｜'), b = raw.indexOf('｜', a + 1);
    if (b < 0) { fail(at, '「話者｜表情｜本文」の形になっていません'); return; }
    const who = raw.slice(0, a).trim(), face = raw.slice(a + 1, b).trim(), text = raw.slice(b + 1);
    if (!who) { fail(at, '話者がありません'); return; }
    if (face !== '-' && !FACES.has(face)) { fail(at, `表情「${face}」は使えません（normal/smile/angry/sad/dere/-）`); return; }
    if (!text.trim()) { fail(at, '本文がありません'); return; }
    const line = { who: who === '（地の文）' ? '' : who, text };
    if (face !== '-') line.face = face;
    else if (line.who) line.art = false; // 立ち絵を出さない
    target().push(line);
  });
}
const hasText = s => s.lines.some(l => l.text) || s.choice?.branches.some(b => b.some(l => l.text));
for (const s of scenes) if (!hasText(s)) errors.push(`${s.id}: 台詞がありません`);
for (const s of scenes) if (s.choice && s.choice.branches.some(b => !b.some(l => l.text))) errors.push(`${s.id}: 選択肢の続き（#### ▼…）が空です`);
for (const s of [...supports, ...wives]) if (!s.bad && !hasText(s)) { warnings.push(`${s.at}: 台詞がありません（この場面は読み飛ばします）`); s.bad = true; }
for (const s of scenes) if (s.bgm === undefined && !s.id.startsWith('frag:')) warnings.push(`${s.id}: BGM の指定がありません（直前の曲が続きます）`);
if (warnings.length) console.warn('build-script: ' + warnings.join('\n  '));
if (errors.length) { console.error('build-script: 脚本の読み込みに失敗しました\n' + errors.join('\n')); process.exit(1); }

const q = v => JSON.stringify(v);
const sceneBody = s => `{\n    title: ${q(s.title)}, chapter: ${s.chapter},\n    cond: ${q(s.cond)},${s.bgm && s.bgm !== 'keep' ? ` bgm: ${q(s.bgm)},` : ''}${s.bg ? ` bg: ${q(s.bg)},` : ''}\n    lines: [\n${s.lines.map(l => `      ${q(l)},`).join('\n')}\n    ],${s.choice ? `\n    choice: ${q(s.choice)},` : ''}\n  }`;
const okSupports = supports.filter(s => !s.bad), okWives = wives.filter(s => !s.bad).sort((a, b) => a.no - b.no);
const out = `// Generated by tools/build-script.mjs from ${files.map(f => `${SRC_DIR}/${f}`).join(', ')}. Do not edit by hand:
// change the screenplay and run \`npm run build\` (or \`npm run check\`).
import type { Line } from '../data';

/**
 * One scene of the screenplay. chapter 0 = 序章, 11 = 告白・後日談・エピローグ. cond = the screenplay's 条件 (for reference;
 * triggers live in the chapter data). bgm = the track the scene starts with ('none' = silence; absent = keep what is
 * playing). bg = the background it starts with ('none' or absent = over the map). Lines with no text are cues (bgm / bg / cg).
 * choice = the player's choice at the end of the lines (告白): branches[k] plays after options[k].
 */
export interface Scene { title: string; chapter: number; cond: string; bgm?: string; bg?: string; lines: Line[]; choice?: { options: string[]; branches: Line[][] } }
export type SceneId =
${scenes.map(s => `  | ${q(s.id)}`).join('\n')};
/** Scene ids in screenplay order. */
export const SCENE_ORDER: SceneId[] = [${scenes.map(s => q(s.id)).join(', ')}];
export const SCENES: Record<SceneId, Scene> = {
${scenes.map(s => `  ${q(s.id)}: ${sceneBody(s)},`).join('\n')}
};
/** Support conversations from design/script-supports-*.md, keyed \`<pairKey>:<rank>\` (pairKey = the two ids sorted, joined by +). */
export const SUPPORT_SCENES: Record<string, Scene> = {
${okSupports.map(s => `  ${q(s.id)}: ${sceneBody(s)},`).join('\n')}
};
/**
 * 嫁同士の会話（design/script-supports-wives.md）。members = その2人が結婚していると見られる（common = 共通台本で、
 * 結婚している相手が need 人以上のとき。結婚していない候補の行は飛ばす）。minCleared / maxCleared = 見られる章間の範囲（camp.cleared）。
 */
export interface WifeTalk { id: string; no: number; group: string; members: string[]; need: number; common: boolean; minCleared?: number; maxCleared?: number; scene: Scene }
export const WIFE_TALKS: WifeTalk[] = [
${okWives.map(s => `  { id: ${q(s.id)}, no: ${s.no}, group: ${q(s.group)}, members: ${q(s.members)}, need: ${s.need}, common: ${s.common},${s.minCleared !== undefined ? ` minCleared: ${s.minCleared},` : ''}${s.maxCleared !== undefined ? ` maxCleared: ${s.maxCleared},` : ''} scene: ${sceneBody(s)} },`).join('\n')}
];
`;
mkdirSync('src/script', { recursive: true });
let old = '';
try { old = readFileSync(OUT, 'utf8'); } catch { /* first run */ }
if (old !== out) writeFileSync(OUT, out);
const all = [...scenes, ...okSupports, ...okWives];
const allLines = s => [...s.lines, ...(s.choice?.branches.flat() ?? [])];
console.log(`build-script: ${scenes.length} scenes, ${okSupports.length} support talks, ${okWives.length} wife talks, ${all.reduce((n, s) => n + allLines(s).filter(l => l.text).length, 0)} lines, ${all.reduce((n, s) => n + (s.bg && s.bg !== 'none' ? 1 : 0) + allLines(s).filter(l => l.bg && l.bg !== 'none').length, 0)} backgrounds, ${all.reduce((n, s) => n + allLines(s).filter(l => l.cg).length, 0)} event pictures → ${OUT}${old === out ? ' (unchanged)' : ''}`);
