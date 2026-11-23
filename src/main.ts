// Screen, input and turn flow. Rules live in logic.ts.
import { CAST, CHAPTERS, CHARS, CLASSES, RANKS, RANK_PTS, STAT_KEYS, STAT_NAMES, SCHOOLS, SKILLS, SUPPORTS, SUPPORT_BONUS, WEAPONS, WTYPE_NAMES, chapterDef, hasChapter, type EnemyDef, type Line, type Stats, type SupportPair } from './data';
import {
  DIFFICULTY_NAMES, levelName, POTION_HEAL, addExp, alive, bondStatus, canEscape, canSeize, dangerTiles, linkPartner, objectives, dist, expGain, fight, forecast, gainBonds, goalText, heal, healAmount, healExp, healTargets,
  initBonds, inRange, key, loseCond, makeEnemy, makeUnit, maxRank, newChapter, nextNeed, outcome, pairKey, planEnemy, promote, promoOptions, rankName, rankUp, readyPairs,
  WEAPON_SLOTS, benchExp, chapterPicks, rosterOf, sCount, sLimit, sortiePlan, spawnReinforcements, staves, stopTiles, terrainAt, threatTiles, tierOf, turnsLeft, unitAt, upgradeState, usable, weaponLabel,
  bossId, dueTalks, fightTalks, onMap, talkKey, clearSlow, expBoost, familiarHeal, hasSkill, healingWind, skillsOf, shownVisits, visitFlag, visitsFor,
  CANDIDATES, advanceStage, answerConfession, applyAiSwitch, applyTerrainChanges, ensureMarried, isConfession, markedTiles, marriedTo, seizeFlag, stageBgm, stageOf,
  LINK_NAME, type Bonds, type Difficulty, type SortiePlan, type State, type Unit,
} from './logic';
import { confessionScene, endingSequence, placeholderTalk, sceneById, supportScene, wifeLines, wifeTalksAvailable, type EndingCtx } from './story';
import { adjacentBark, dailyLines, dailyTalksAvailable, dateTalksAvailable, fallBark, wedChapters, wedKey } from './story';
import { DAILY_TALKS, DATE_TALKS, WIFE_TALKS, type DailyTalk, type DateTalk, type WifeTalk } from './script/scenes';
import { renderTentCare, validTent, type TentUse } from './ui/tent-ui';
import { artLog, cueBgm, play, setOnBg, setOnCg } from './ui/dialogue';
import { BGM_FILES } from './audio-manifest';
import { JINGLES, SONG_NAMES } from './audio/songs';
import { invBlock, renderShop } from './ui/shop-ui';
import { GIFT_PER_CAMP, ITEMS, chapterReward, shopName, takeLoot } from './shop';
import { hideTutorial, mountHelp, openHelp, startTutorial, tutorialDone, tutorialStep } from './ui/help';
import { BG_ART, EVENT_ART } from './art-manifest';
import { RES, T } from './render/common';
import { FLOAT_LIFE, captureDying, drawCursor, drawDying, drawEdgeMarks, drawFloat, drawTile, drawVignette, type Dying, type Float } from './render/fx';
import { drawTerrain } from './render/terrain';
import { drawVisit, drawVisitBadge } from './render/visits';
import { drawIcon, drawUnit } from './render/units';
import { SCENES, SCENE_ORDER, type SceneId } from './script/scenes';
import { faceHtml, idForName, idForUnit, loadMapArt, loadUnitArt, mapArtUrl, portraitUrl, preloadPortrait, spriteUrl } from './render/art';
import { BLOCKING, changedTiles, drawGrid, drawGuideMarks, paintedLayer } from './render/mapart';
import { audio } from './audio/engine';
import { chooseMapTrack, engagedBoss, openingTrack, restoresMapTrack } from './audio/map-track';
import { mountAudioUi } from './audio/ui';
import { mountMobileMap, type MapViewport } from './ui/mobile-map';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const cv = $<HTMLCanvasElement>('cv'), ctx = cv.getContext('2d')!;
const fast = () => !!(window as any).__fast;
// 演出の速さ：ふつう／はやい（HUD の切り替え、端末に保存）。敵軍フェイズは長押しか「早送り」でさらに速く（rush）。
// __fast（自動テスト）は待ち時間なし。
const SPEED_KEY = 'fittoa-speed';
let speedFast = false;
try { speedFast = localStorage.getItem(SPEED_KEY) === 'fast'; } catch { /* storage unavailable */ }
let rush = false, rushHeld = false;
/** 動きの待ち時間の倍率（移動・打ち合い・カットイン・カメラ）。 */
const pace = () => (fast() ? 0 : rush || rushHeld ? 0.12 : speedFast ? 0.4 : 1);
/** 読む文字のある帯（レベルアップ・増援など）は縮めすぎない。 */
const readPace = () => (fast() ? 0 : rush || rushHeld ? 0.3 : speedFast ? 0.6 : 1);
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms * pace()));

let S: State;
/** The terrain, drawn once per chapter at the final resolution (RES backing pixels per map pixel). Null while drawing. */
let terrain: HTMLCanvasElement | null = null;
/** Whether `terrain` comes from a painted map (assets/maps/chNN) rather than the code-drawn one. */
let paintedMap = false;
/**
 * The tile grid over the map (button 格子 in the HUD). Remembered separately for painted maps (default on, to spot
 * where the picture and the rules' tiles disagree) and code-drawn maps (default off).
 */
const GRID_KEY = 'fittoa-grid';
const gridPref: { painted: boolean; auto: boolean } = { painted: true, auto: false };
try { const j = localStorage.getItem(GRID_KEY); if (j) { const d = JSON.parse(j); if (typeof d.painted === 'boolean') gridPref.painted = d.painted; if (typeof d.auto === 'boolean') gridPref.auto = d.auto; } } catch { /* storage unavailable */ }
const gridOn = () => gridPref[paintedMap ? 'painted' : 'auto'];
/** An empty tile the player tapped to read its terrain (outlined until the next action). */
let probe: { x: number; y: number } | null = null;
type Mode = 'idle' | 'move' | 'menu' | 'target' | 'heal' | 'busy';
let mode: Mode = 'busy';
let sel: Unit | null = null, picked: Unit | null = null, inspect: Unit | null = null;
let stops = new Set<string>(), threat = new Set<string>();
/** 危険範囲（全敵の次ターンの攻撃範囲）の表示。見る人ごとに覚えておく。盤面が変わったときだけ計算し直す。 */
const DANGER_KEY = 'fittoa-danger';
let dangerOn = false;
try { dangerOn = localStorage.getItem(DANGER_KEY) === '1'; } catch { /* storage unavailable */ }
let dangerSig = '', dangerSet = new Set<string>();
function dangerNow(): Set<string> {
  const sig = S.turn + S.phase + S.map.join('') + S.units.map(u => `${u.uid}:${u.x},${u.y},${u.hp},${u.ai ?? ''}`).join('|');
  if (sig !== dangerSig) { dangerSig = sig; dangerSet = dangerTiles(S); }
  return dangerSet;
}
function toggleDanger() {
  dangerOn = !dangerOn;
  try { localStorage.setItem(DANGER_KEY, dangerOn ? '1' : '0'); } catch { /* lasts for this visit */ }
  audio.sfx('cursor');
  idle();
}
let origin = { x: 0, y: 0 }, targets: Unit[] = [], curW = '';
const offs = new Map<number, { dx: number; dy: number }>();
const shownHp = new Map<number, number>();
/** Units that retreated during the combat being shown: still drawn until its animation ends. */
const leaving = new Set<number>();
const floats: Float[] = [];
/** Figures leaving the map after a defeat (uid → captured picture and timing), drawn until their time is up. */
const dying = new Map<number, Dying>();
/** A short screen shake (critical hits) and a white flash over the map (a boss's defeat). Real-time ms. */
let shakeFx = { t0: 0, dur: 0, amp: 0 }, flashFx = { t0: 0, dur: 0, a: 0 };

// ---------- camera ----------
// The default canvas shows 12×8 tiles; larger maps scroll. `cam` is the top-left of the view in map pixels.
// Figures stand taller than a tile, so the view may scroll above row 0 to keep the top row's heads on screen.
const cam = { x: 0, y: 0 };
/** The view in map pixels (12×8 tiles). The canvas backing store is RES times larger so sprites stay sharp. */
const DEFAULT_VW = 12 * T, DEFAULT_VH = 8 * T;
const LANDSCAPE_MIN_COLS = 7.5, LANDSCAPE_MIN_ROWS = 5.5;
const TOP_PAD = Math.round(T * 0.45);
let VW = DEFAULT_VW, VH = DEFAULT_VH;
let cameraTopPad = TOP_PAD;
cv.width = VW * RES; cv.height = VH * RES;

function fitMapViewport(viewport: MapViewport | null) {
  const aspect = viewport ? viewport.width / viewport.height : DEFAULT_VW / DEFAULT_VH;
  // Portrait phones: fixed tile size from the width (about 54px, at least 7 columns); the height follows the stage,
  // so opening a bottom sheet only shortens the view instead of rescaling the tiles.
  const width = !viewport ? DEFAULT_VW : viewport.orientation === 'portrait'
    ? Math.round(Math.max(7, viewport.width / 54) * T)
    : Math.round(Math.max(LANDSCAPE_MIN_COLS, LANDSCAPE_MIN_ROWS * aspect) * T);
  const height = viewport ? Math.round(width / aspect) : DEFAULT_VH;
  // Keep the top row's tile centers reachable below the corner buttons at the upper pan limit.
  const topPad = viewport ? Math.max(TOP_PAD, Math.ceil(viewport.cornerBottom * height / viewport.height - T / 2)) : TOP_PAD;
  if (width === VW && height === VH && topPad === cameraTopPad) return;
  cameraTopPad = topPad;
  cam.x += (VW - width) / 2;
  cam.y += (VH - height) / 2;
  if (width !== VW || height !== VH) {
    drag = null;
    VW = width; VH = height;
    cv.width = VW * RES; cv.height = VH * RES;
  }
  if (S) {
    clampCam();
    // Keep the selected unit (and the forecast target) on screen when a sheet shrinks the view.
    const focus = mode === 'idle' || mode === 'busy' ? [] : [sel, picked].filter((u): u is Unit => !!u);
    if (viewport && focus.length && !focus.every(u => inView(u.x, u.y, 0))) {
      centerOn((Math.min(...focus.map(u => u.x)) + Math.max(...focus.map(u => u.x))) / 2, (Math.min(...focus.map(u => u.y)) + Math.max(...focus.map(u => u.y))) / 2);
    }
    cv.style.touchAction = scrolls() ? 'none' : 'manipulation';
  }
}
const cols = () => S.map[0].length, rows = () => S.map.length;
/** Camera limits in map pixels (a map smaller than the view is centred). */
function camBounds() {
  const maxX = cols() * T - VW, maxY = rows() * T - VH;
  // Center short maps when there is enough headroom above the first row.
  const minY = Math.min(-cameraTopPad, maxY / 2);
  return { minX: maxX < 0 ? maxX / 2 : 0, maxX: maxX < 0 ? maxX / 2 : maxX, minY, maxY: Math.max(minY, maxY) };
}
const scrolls = () => { if (!S) return false; const b = camBounds(); return b.maxX > b.minX || b.maxY > b.minY; };
function clampCam() {
  const b = camBounds();
  cam.x = Math.round(Math.max(b.minX, Math.min(b.maxX, cam.x)));
  cam.y = Math.round(Math.max(b.minY, Math.min(b.maxY, cam.y)));
}
/** Whether a tile is on screen, keeping one tile of margin except where the view already touches the map edge. */
function inView(x: number, y: number, margin = 1) {
  const b = camBounds();
  const l = cam.x / T, t = cam.y / T, r = (cam.x + VW) / T - 1, bt = (cam.y + VH) / T - 1;
  const ml = cam.x > b.minX ? margin : 0, mr = cam.x < b.maxX ? margin : 0, mt = cam.y > b.minY ? margin : 0, mb = cam.y < b.maxY ? margin : 0;
  return x >= Math.max(0, l) + ml - 1e-6 && x <= r - mr + 1e-6 && y >= Math.max(0, t) + mt - 1e-6 && y <= bt - mb + 1e-6;
}
/** Centers the view on a tile (clamped to the map). */
function centerOn(x: number, y: number) { cam.x = x * T + T / 2 - VW / 2; cam.y = y * T + T / 2 - VH / 2; clampCam(); }
/** Scrolls smoothly to the given camera position. */
async function panTo(x: number, y: number) {
  const sx = cam.x, sy = cam.y, steps = fast() ? 1 : 10;
  for (let i = 1; i <= steps; i++) { cam.x = sx + (x - sx) * i / steps; cam.y = sy + (y - sy) * i / steps; clampCam(); await sleep(16); }
}
/** Brings the given tiles into view (centered on their middle) when any of them is off screen. */
async function follow(pts: { x: number; y: number }[], margin = 1) {
  if (!scrolls() || pts.every(p => inView(p.x, p.y, margin))) return;
  const mx = (Math.min(...pts.map(p => p.x)) + Math.max(...pts.map(p => p.x))) / 2;
  const my = (Math.min(...pts.map(p => p.y)) + Math.max(...pts.map(p => p.y))) / 2;
  const from = { ...cam };
  centerOn(mx, my);
  const to = { ...cam };
  cam.x = from.x; cam.y = from.y;
  await panTo(to.x, to.y);
}
/** Test log: for each enemy action, whether the actor was on screen before and after the camera followed it. */
const followLog: { name: string; x: number; y: number; before: boolean; after: boolean; cam: { x: number; y: number } }[] = [];

// ---------- save ----------
/** Between chapters: the party, its bonds, the difficulty, and which chapter comes next. ended = the story was finished. */
interface Camp {
  next: number; cleared: number; roster: Unit[]; bonds: Bonds; difficulty: Difficulty; ended?: boolean;
  /** Connects a finale in progress with its clear record across separate storage writes. */
  endingId?: string;
  /** 所持金（銀）。章クリアごとに chapterReward が入る。 */
  gold: number;
  /** 直前の章で控えが得た経験値（部隊タブに表示）。 */
  bench?: { id: string; exp: number; fromLv: number; lv: number }[];
  /** パウロ（三流派の心得）が出撃準備で選んだ流派（SCHOOLS の id）。v6 の任意項目。無ければ CharDef.school。 */
  school?: string;
  /** むずかしい（敵の能力が上がる）。v6 の任意項目。無ければふつう。 */
  hard?: boolean;
  /** 倉庫（商人タブで預けた品・宝箱で誰も持てなかった品の id。数の上限なし）。v6 の任意項目。無ければ空。 */
  stash?: string[];
  /** 成績（クリア記録用）：クリアした章の合計ターン、倒れた仲間の延べ人数、何周目か（2以上のとき）。v6 の任意項目。 */
  turns?: number; falls?: number; round?: number;
  /** 天幕の食卓・贈り物・稽古をこの章間に使ったか（ui/tent-ui.ts）。v6 の任意項目。章をクリアすると新しい Camp になり空に戻る。 */
  tent?: TentUse;
}
/**
 * seen = conversations watched (for the camp's 記録): scene ids (序章・開幕・終幕・幕間) and support talks
 * (`sup:<pairKey>:<rank>`). Battle conversations that have played are State.flags `talk:<scene>`.
 */
interface SaveData { v: 6; battle: State | null; camp: Camp | null; seen: string[]; married: string[] }
// v6: added Camp.gold (silver) and Unit.items (bought potions); weapons are capped at 4 (older saves: gold 0,
// weapons as they were).
// v5: added `married` (candidates Rudeus married = their bond with him at S; kept for readability and repaired from on
// load), Camp.ended, Bond.deferred (a confession answered 「応えられない」), State.flags.stage (the current stage), and
// seen keys for confessions / wife talks / event pictures (`wife.NN`, `cg:<name>`).
// v4: added `seen`. v3: State gained difficulty / bench / flags, Camp gained difficulty, Unit gained out / guest / left.
const SAVE = 'fittoa-save-v6', SAVE_V5 = 'fittoa-save-v5', SAVE_V4 = 'fittoa-save-v4', SAVE_V3 = 'fittoa-save-v3', SAVE_V2 = 'fittoa-save-v2', SAVE_V1 = 'fittoa-save-v1';
let camp: Camp | null = null, inBattle = false, seen: string[] = [];
function save(): boolean {
  const bonds = camp?.bonds ?? (inBattle ? S?.bonds : undefined);
  const d: SaveData = { v: 6, battle: inBattle ? S : null, camp, seen, married: bonds ? marriedTo(bonds) : [] };
  try { localStorage.setItem(SAVE, JSON.stringify(d)); return true; } catch { return false; }
}
/**
 * Records a battle conversation in the stored save right away, without saving the rest of the state (a save in the
 * middle of an action would let the unit act again after reloading). Reloading never plays it twice.
 */
function persistFlag(k: string) {
  try {
    const j = localStorage.getItem(SAVE); if (!j) return;
    const d = JSON.parse(j);
    if (d?.battle && d.battle.chapter === S.chapter) { d.battle.flags = { ...(d.battle.flags ?? {}), [k]: true }; localStorage.setItem(SAVE, JSON.stringify(d)); }
  } catch { /* storage unavailable */ }
}
const markSeen = (k: string) => { if (!seen.includes(k)) seen.push(k); };
const supKey = (a: string, b: string, rank: string) => `sup:${pairKey(a, b)}:${rank}`;
/** For saves older than v4: what the player must have watched to get this far. */
function seenFrom(battle: State | null, cp: Camp | null): string[] {
  const out: string[] = ['prologue'];
  const done = cp ? cp.cleared : battle ? battle.chapter : 0;
  CHAPTERS.forEach((ch, i) => {
    if (i < done) out.push(ch.intro, ch.outro, ...(ch.interlude ? [ch.interlude] : []));
    else if (battle && i === battle.chapter) out.push(ch.intro);
  });
  const bonds = cp?.bonds ?? battle?.bonds;
  if (bonds) for (const p of SUPPORTS) for (let r = 0; r < (bonds[pairKey(p.a, p.b)]?.rank ?? 0); r++) out.push(supKey(p.a, p.b, RANKS[r]));
  return out;
}
const validUnit = (u: any): u is Unit => !!u && typeof u.id === 'string' && !!CLASSES[u.cls] && !!u.st && Array.isArray(u.wps) && u.wps.every((w: string) => !!WEAPONS[w]);
const validDiff = (d: unknown): Difficulty => (d === 'classic' ? 'classic' : 'casual');
const validStash = (id: unknown): id is string => typeof id === 'string' && (!!WEAPONS[id] || !!ITEMS[id]);
/** 章の途中で倉庫へ送った品（State.flags の `stash:<id>` = 個数。章クリアで Camp.stash へ移す）。 */
const STASH_FLAG = 'stash:';
const battleStash = (st: State) => Object.entries(st.flags).flatMap(([k, v]) => (k.startsWith(STASH_FLAG) && validStash(k.slice(STASH_FLAG.length)) ? Array(Math.max(0, Number(v) || 0)).fill(k.slice(STASH_FLAG.length)) as string[] : []));
/** Accepts v4, and v3/v2/v1 shapes (missing fields are filled in). Anything malformed is dropped rather than thrown. */
function normalize(d: any): SaveData | null {
  const b = d?.battle;
  const battle = b && Array.isArray(b.units) && Array.isArray(b.map) && hasChapter(b.chapter) && b.units.every(validUnit) ? upgradeState(b as State) : null;
  const c = d?.camp;
  let cp: Camp | null = null;
  if (c && Array.isArray(c.roster) && typeof c.next === 'number' && typeof c.cleared === 'number' && c.cleared >= 1) {
    cp = { next: c.next, cleared: c.cleared, roster: c.roster.filter(validUnit), bonds: initBonds(c.bonds), difficulty: validDiff(c.difficulty), gold: Number.isFinite(c.gold) && c.gold > 0 ? Math.floor(c.gold) : 0, ...(c.ended === true ? { ended: true } : {}), ...(SCHOOLS.includes(c.school) ? { school: c.school } : {}), ...(c.hard === true ? { hard: true } : {}), ...(Array.isArray(c.bench) ? { bench: c.bench.filter((g: any) => g && typeof g.id === 'string' && typeof g.exp === 'number') } : {}), ...(Array.isArray(c.stash) ? { stash: c.stash.filter(validStash) } : {}), ...runStats(c), ...(validTent(c.tent) ? { tent: validTent(c.tent) } : {}) };
    if (typeof c.endingId === 'string' && c.endingId) cp.endingId = c.endingId;
    if (!battle && chapterDef(cp.cleared - 1)?.ending && (cp.endingId || cp.ended)) {
      const clear = loadClear();
      const endingId = cp.endingId;
      if (endingId && clear?.runs.some(run => run.endingId === endingId)) cp.ended = true;
      // Older versions saved ended before playback. Without a history, the missing clear is unambiguous.
      else if (cp.ended && !clear) { delete cp.ended; cp.endingId ??= newEndingId(); }
    }
  }
  const married = Array.isArray(d?.married) ? d.married.filter((k: unknown) => typeof k === 'string' && CANDIDATES.includes(k as string)) : [];
  if (cp) ensureMarried(cp.bonds, married);
  if (battle) ensureMarried(battle.bonds, married);
  if (battle && cp && !b.difficulty) battle.difficulty = cp.difficulty;
  if (battle && cp?.hard && b.hard === undefined) battle.hard = true;
  const sn = Array.isArray(d?.seen) ? d.seen.filter((k: unknown) => typeof k === 'string') : seenFrom(battle, cp);
  return battle || cp ? { v: 6, battle, camp: cp, seen: sn, married: marriedTo(cp?.bonds ?? battle!.bonds) } : null;
}
function load(): SaveData | null {
  // Newest first; a corrupt or unreadable entry falls through to the next older one.
  for (const k of [SAVE, SAVE_V5, SAVE_V4, SAVE_V3, SAVE_V2, SAVE_V1]) {
    try {
      const j = localStorage.getItem(k);
      if (!j) continue;
      const d = normalize(k === SAVE_V1 ? { battle: JSON.parse(j), camp: null } : JSON.parse(j)); // v1 held only a mid-chapter State
      if (d) return d;
    } catch { /* corrupt or unavailable */ }
  }
  return null;
}

// ---------- クリア記録・引き継ぎ（別のキー） ----------
/** One finished story: who Rudeus married, the settings, and a few totals. */
interface ClearRun { date: string; married: string[]; difficulty: Difficulty; hard: boolean; turns: number; falls: number; round: number; endingId?: string; endingBranches?: EndingBranches }
interface EndingBranches { sPairs: string[]; out: string[] }
// These are the S supports read by the epilogue and afterword patches in story.ts.
const ENDING_S_PAIRS = [pairKey('cliff', 'elinalise'), pairKey('luke', 'sara')];
/** runs = every clear (newest last, at most 20); seen = everything watched in any run (鑑賞); gold / stash = the last run's, for 引き継ぎ. */
interface ClearData { v: 1; runs: ClearRun[]; seen: string[]; gold: number; stash: string[] }
const CLEAR_KEY = 'fittoa-clear';
const newEndingId = () => crypto.getRandomValues(new Uint32Array(4)).join('-');
const fin = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
/** Camp.turns / falls / round from a stored camp (v6 optional items; missing in older saves). */
const runStats = (c: any) => ({ ...(fin(c?.turns) ? { turns: fin(c.turns) } : {}), ...(fin(c?.falls) ? { falls: fin(c.falls) } : {}), ...(fin(c?.round) > 1 ? { round: fin(c.round) } : {}) });
function readEndingBranches(value: unknown): { endingBranches?: EndingBranches } {
  if (!value || typeof value !== 'object') return {};
  const sPairs = 'sPairs' in value && Array.isArray(value.sPairs) ? value.sPairs : null;
  const out = 'out' in value && Array.isArray(value.out) ? value.out : null;
  if (!sPairs && !out) return {};
  return { endingBranches: { sPairs: ENDING_S_PAIRS.filter(k => sPairs?.includes(k)), out: CANDIDATES.filter(id => out?.includes(id)) } };
}
function loadClear(): ClearData | null {
  try {
    const d = JSON.parse(localStorage.getItem(CLEAR_KEY) ?? 'null');
    if (!d || !Array.isArray(d.runs) || !d.runs.length) return null;
    const runs: ClearRun[] = d.runs.filter((r: any) => r && typeof r.date === 'string').map((r: any) => ({
      date: r.date, married: Array.isArray(r.married) ? r.married.filter((k: unknown) => typeof k === 'string' && CANDIDATES.includes(k as string)) : [],
      difficulty: validDiff(r.difficulty), hard: r.hard === true, turns: fin(r.turns), falls: fin(r.falls), round: Math.max(1, fin(r.round)),
      ...(typeof r.endingId === 'string' && r.endingId ? { endingId: r.endingId } : {}),
      ...readEndingBranches(r.endingBranches),
    }));
    if (!runs.length) return null;
    return { v: 1, runs, seen: Array.isArray(d.seen) ? d.seen.filter((k: unknown) => typeof k === 'string') : [], gold: fin(d.gold), stash: Array.isArray(d.stash) ? d.stash.filter(validStash) : [] };
  } catch { return null; }
}
/** Right after the ending first plays: adds this run to the clear record. */
function recordClear(c: Camp, endingId: string, ctx: EndingCtx): boolean {
  const prev = loadClear();
  if (prev?.runs.some(run => run.endingId === endingId)) return true;
  const endingBranches = { sPairs: ENDING_S_PAIRS.filter(k => (ctx.bonds[k]?.rank ?? 0) >= 4), out: CANDIDATES.filter(id => ctx.out.includes(id)) };
  const run: ClearRun = { date: new Date().toISOString().slice(0, 10), married: ctx.married, difficulty: c.difficulty, hard: !!c.hard, turns: c.turns ?? 0, falls: c.falls ?? 0, round: c.round ?? 1, endingId, endingBranches };
  const d: ClearData = { v: 1, runs: [...(prev?.runs ?? []), run].slice(-20), seen: [...new Set([...(prev?.seen ?? []), ...seen])], gold: c.gold, stash: [...(c.stash ?? [])] };
  try { localStorage.setItem(CLEAR_KEY, JSON.stringify(d)); return true; } catch { return false; }
}
/** 引き継ぎ: State.flags `carry:gold` (silver), `carry:round` (this run's number), `carry:item:<id>` (count); moved into the camp after chapter 1. */
const CARRY = 'carry:';
function applyCarry(st: State, cd: ClearData) {
  st.flags[`${CARRY}gold`] = Math.floor(cd.gold / 2);
  st.flags[`${CARRY}round`] = (cd.runs[cd.runs.length - 1]?.round ?? 1) + 1;
  for (const id of cd.stash) st.flags[`${CARRY}item:${id}`] = (Number(st.flags[`${CARRY}item:${id}`]) || 0) + 1;
  return st;
}
const carriedStash = (st: State) => Object.entries(st.flags).flatMap(([k, v]) => (k.startsWith(`${CARRY}item:`) && validStash(k.slice(CARRY.length + 5)) ? Array(Math.max(0, Number(v) || 0)).fill(k.slice(CARRY.length + 5)) as string[] : []));
/** Title: whether 「はじめから」 carries over (shown only after a clear). */
let pickCarry = true;
function setCarry(on: boolean, cd: ClearData) {
  pickCarry = on;
  for (const b of document.querySelectorAll<HTMLButtonElement>('#carryPick button')) b.setAttribute('aria-pressed', String((b.dataset.carry === '1') === on));
  $('carryNote').textContent = on ? `所持金の半分（${Math.floor(cd.gold / 2)}銀）と倉庫の品（${cd.stash.length}個）を、第1章のクリア後に受け取る。見た会話は記録に残る。レベルと支援ランクは引き継がない。` : '何も引き継がずに始める（クリア記録と鑑賞は残る）。';
}
/** Keeps the carry-over flags when chapter 1 is restarted. */
const keepCarry = (from: State | undefined, st: State) => { if (from) for (const [k, v] of Object.entries(from.flags)) if (k.startsWith(CARRY)) st.flags[k] = v; return st; };

// ---------- rendering ----------
function render(now = performance.now()) {
  if (S && !terrain) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#14121c'; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (S && terrain) {
    const W = VW, H = VH, sec = now / 1000;
    const sk = now - shakeFx.t0 < shakeFx.dur ? shakeFx.amp * (1 - (now - shakeFx.t0) / shakeFx.dur) : 0;
    ctx.setTransform(RES, 0, 0, RES, sk ? Math.round(Math.sin(now / 17) * sk * RES) : 0, sk ? Math.round(Math.cos(now / 23) * sk * RES * 0.6) : 0);
    ctx.fillStyle = '#14121c'; ctx.fillRect(0, 0, W, H);
    // the terrain was drawn once at chapter start (RES pixels per map pixel, as the canvas): copy just the visible
    // part 1:1, plus the strip above the map
    const sx = Math.max(0, cam.x), sy = Math.max(0, cam.y), tw = terrain.width / RES, th = terrain.height / RES;
    const sw = Math.min(W - (sx - cam.x), tw - sx), sh = Math.min(H - (sy - cam.y), th - sy);
    if (sw > 0 && sh > 0) ctx.drawImage(terrain, sx * RES, sy * RES, sw * RES, sh * RES, sx - cam.x, sy - cam.y, sw, sh);
    if (cam.y < 0 && topPad) ctx.drawImage(topPad, cam.x * RES, 0, W * RES, topPad.height, 0, -cam.y - TOP_PAD, W, TOP_PAD);
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    if (gridOn()) drawGrid(ctx, Math.max(0, Math.floor(cam.x / T)), Math.max(0, Math.floor(cam.y / T)), Math.min(cols(), Math.ceil((cam.x + W) / T)) - 1, Math.min(rows(), Math.ceil((cam.y + H) / T)) - 1);
    const tile = (k: string, kind: Parameters<typeof drawTile>[1], a = 1) => { const [x, y] = k.split(',').map(Number); drawTile(ctx, kind, x, y, a); };
    if (dangerOn && inBattle && S.phase === 'blue') for (const k of dangerNow()) tile(k, 'attack', 0.6);
    if (mode === 'move' || (mode === 'idle' && inspect)) {
      for (const k of threat) if (!stops.has(k)) tile(k, 'attack');
      for (const k of stops) tile(k, 'move');
    }
    const pulse = 0.78 + 0.22 * Math.sin(sec * 5);
    if (inBattle) { // 目標マス（制圧・離脱）と防衛マス：いつも見えるように、ゆっくり明滅させる
      const mk = markedTiles(S), slow = 0.62 + 0.3 * Math.sin(sec * 2.4);
      for (const [x, y] of mk.goal) drawTile(ctx, 'goal', x, y, slow);
      for (const [x, y] of mk.guard) drawTile(ctx, 'guard', x, y, slow);
      for (const { tile: [x, y], label } of chapterDef(S.chapter).landmarks ?? []) {
        ctx.save();
        ctx.translate((x + 0.5) * T, (y + 0.5) * T);
        ctx.strokeStyle = '#35592a'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(0, 14); ctx.lineTo(0, -12); ctx.stroke();
        ctx.fillStyle = '#79b451';
        ctx.beginPath(); ctx.ellipse(-9, -10, 12, 6, 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(8, -17, 12, 6, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#173025'; ctx.fillRect(-29, 17, 58, 22);
        ctx.fillStyle = '#fff5d4'; ctx.textAlign = 'center'; ctx.font = '16px sans-serif'; ctx.fillText(label, 0, 34);
        ctx.restore();
      }
      for (const { v, open } of shownVisits(S)) drawVisit(ctx, v.kind, v.x, v.y, open, sec); // 宝箱・檻（M13）
    }
    if (auto && (mode === 'target' || mode === 'heal')) for (const c of auto.cands) if (c !== auto.cands[auto.idx]) tile(key(c.x, c.y), 'move', 0.5);
    if (mode === 'target') for (const t of targets) tile(key(t.x, t.y), 'target', t === picked ? 1 : pulse);
    if (mode === 'heal') for (const t of targets) tile(key(t.x, t.y), 'heal', t === picked ? 1 : pulse);
    // units, back to front
    const shown = S.units.filter(u => (shownHp.get(u.uid) ?? u.hp) > 0 && (!u.left || leaving.has(u.uid)))
      .map(u => { const o = offs.get(u.uid); return { u, px: u.x * T + (o?.dx ?? 0), py: u.y * T + (o?.dy ?? 0) }; })
      .sort((a, b) => a.py - b.py);
    for (const { u, px, py } of shown) drawUnit(ctx, u, px, py, u.done && S.phase === 'blue', (shownHp.get(u.uid) ?? u.hp) / u.st.hp);
    for (const [uid, d] of dying) {
      const u = S.units.find(v => v.uid === uid), p = (now - d.t0) / d.dur;
      if (!u || p >= 1) { dying.delete(uid); continue; }
      if (p >= 0) drawDying(ctx, d, u.x * T, u.y * T, p);
    }
    // 未開封の宝箱・檻にユニットが立っていると絵が隠れるので、足もとに小さな印を重ねる
    for (const { v, open } of shownVisits(S)) if (!open && unitAt(S, v.x, v.y)) drawVisitBadge(ctx, v.kind, v.x, v.y, sec);
    const cur = picked ?? sel ?? inspect;
    if (cur && cur.hp > 0) drawCursor(ctx, cur.x, cur.y, sec);
    else if (probe && mode === 'idle') drawCursor(ctx, probe.x, probe.y, sec);
    for (let i = floats.length - 1; i >= 0; i--) {
      drawFloat(ctx, floats[i]);
      if (--floats[i].t <= 0) floats.splice(i, 1);
    }
    ctx.restore();
    drawVignette(ctx, W, H);
    if (now - flashFx.t0 < flashFx.dur) { ctx.fillStyle = `rgba(255, 255, 255, ${flashFx.a * (1 - (now - flashFx.t0) / flashFx.dur)})`; ctx.fillRect(0, 0, W, H); }
    if (scrolls()) edgeMarks();
  }
  requestAnimationFrame(render);
}
/** Small arrows on the screen edges where the map continues. */
function edgeMarks() {
  const b = camBounds();
  drawEdgeMarks(ctx, VW, VH, cam.x > b.minX, cam.x < b.maxX, cam.y > Math.min(0, b.maxY), cam.y < b.maxY);
}
/**
 * The strip above row 0 (where the top row's heads stand): the first rows of the terrain mirrored and fading
 * into the night, so the map seems to go on rather than end at a hard edge.
 */
let topPad: HTMLCanvasElement | null = null;
function makeTopPad(terrain: HTMLCanvasElement) {
  const h = Math.round(TOP_PAD * RES), c = document.createElement('canvas'); c.width = terrain.width; c.height = h;
  const g = c.getContext('2d')!;
  g.save(); g.translate(0, h); g.scale(1, -1); g.drawImage(terrain, 0, 0, terrain.width, h, 0, 0, terrain.width, h); g.restore();
  const fade = g.createLinearGradient(0, 0, 0, h); fade.addColorStop(0, 'rgba(20,18,28,1)'); fade.addColorStop(0.35, 'rgba(20,18,28,.7)'); fade.addColorStop(1, 'rgba(20,18,28,.12)');
  g.fillStyle = fade; g.fillRect(0, 0, c.width, h);
  return c;
}
function float(u: Unit, text: string, color: string) { floats.push({ x: u.x * T + T / 2, y: u.y * T + T * 0.12, text, color, t: FLOAT_LIFE }); }
async function tween(u: Unit, x: number, y: number) {
  const o = { dx: (u.x - x) * T, dy: (u.y - y) * T };
  u.x = x; u.y = y;
  if (!o.dx && !o.dy) return;
  offs.set(u.uid, o);
  const sx = o.dx, sy = o.dy;
  for (let i = 1; i <= 8; i++) { o.dx = sx * (1 - i / 8); o.dy = sy * (1 - i / 8); await sleep(18); }
  offs.delete(u.uid);
}
async function banner(text: string, ms = 900, cls = '') { const b = $('banner'); b.textContent = text; b.className = cls; b.hidden = false; await new Promise<void>(r => setTimeout(r, ms * readPace())); b.hidden = true; b.className = ''; }

// ---------- 見せ場（ボスの名乗り・章タイトル・勝敗・クラスチェンジ・結婚・支援ランク上昇） ----------
type ShowKind = 'boss' | 'chapter' | 'win' | 'lose' | 'cc' | 'wed' | 'sup';
interface ShowOpts { kind: ShowKind; main: string; sub?: string; note?: string; pics?: (string | null)[] }
/** Opens the full-screen moment (portraits, rings, a titled band). Returns a function that fades it out. */
function openShow(o: ShowOpts): () => Promise<void> {
  const el = $('show'), pics = el.querySelector<HTMLElement>('.shPics')!;
  el.className = o.kind;
  el.querySelector('.shSub')!.textContent = o.sub ?? '';
  el.querySelector('.shMain')!.textContent = o.main;
  el.querySelector('.shNote')!.textContent = o.note ?? '';
  const urls = (o.pics ?? []).filter((u): u is string => !!u);
  pics.innerHTML = '';
  for (const u of urls) { const img = document.createElement('img'); img.alt = ''; img.src = u; img.className = urls.length === 1 ? 'solo' : ''; img.onerror = () => img.remove(); pics.appendChild(img); }
  el.hidden = false; void el.offsetWidth; el.classList.add('go');
  const k = readPace();
  if (k > 0 && k < 1) for (const a of el.getAnimations({ subtree: true })) a.playbackRate = 1 / k;
  return async () => {
    el.classList.add('out');
    await new Promise<void>(r => setTimeout(r, fast() ? 0 : 220));
    el.hidden = true; el.className = '';
  };
}
/** Shows a moment for `ms` (× readPace: shorter with はやい / fast-forward, none with __fast). Tap, Enter or Space ends it early. */
async function showcase(o: ShowOpts, ms: number) {
  if (fast()) return;
  const close = openShow(o), skip = new AbortController();
  const advance = (e: Event) => {
    if (e instanceof KeyboardEvent && (e.repeat || !['Enter', ' '].includes(e.key))) return;
    e.preventDefault(); e.stopImmediatePropagation(); skip.abort();
  };
  window.addEventListener('pointerdown', advance, true); window.addEventListener('keydown', advance, true);
  try {
    await new Promise<void>(r => { const t = setTimeout(r, ms * readPace()); skip.signal.addEventListener('abort', () => { clearTimeout(t); r(); }); });
  } finally {
    window.removeEventListener('pointerdown', advance, true); window.removeEventListener('keydown', advance, true);
    await close();
  }
}
/** A portrait url for a cast member (or a boss), or null when there is none. */
const picOf = (id: string | null, face: Parameters<typeof portraitUrl>[1] = 'normal') => portraitUrl(id, face) ?? portraitUrl(id);

/** Outcome music finishes before dialogue; tapping or pressing Enter/Space fades it out. */
async function outcomeBanner(win: boolean) {
  const b = $('banner'), skip = new AbortController();
  const advance = (e: Event) => {
    if (e instanceof KeyboardEvent && (e.repeat || !['Enter', ' '].includes(e.key))) return;
    e.preventDefault(); e.stopImmediatePropagation(); skip.abort();
  };
  const close = fast() ? null : openShow({ kind: win ? 'win' : 'lose', main: win ? '勝利' : '敗北', sub: chapterDef(S.chapter).title.replace(/\s+/g, '　') });
  if (fast()) { b.textContent = (win ? '勝利！' : '敗北……') + '　タップで次へ'; b.hidden = false; }
  window.addEventListener('pointerdown', advance, true);
  window.addEventListener('keydown', advance, true);
  try {
    audio.jingle(win ? 'victory' : 'defeat', { stop: true });
    await audio.waitForJingle(skip.signal, win ? 1300 : 1500);
    if (!win) await sleep(500);
  } finally {
    window.removeEventListener('pointerdown', advance, true);
    window.removeEventListener('keydown', advance, true);
    b.hidden = true;
    if (close) await close();
  }
}

// ---------- panel ----------
function hud() {
  const ch = chapterDef(S.chapter);
  $('chTitle').textContent = ch.title;
  $('turn').innerHTML = `ターン ${S.turn}　<b class="${S.phase}">${S.phase === 'blue' ? '自軍フェイズ' : '敵軍フェイズ'}</b>`;
  const left = turnsLeft(S);
  $('goal').textContent = goalText(ch, stageOf(S)) + (left !== null ? `　（残り ${left} ターン）` : '');
  const objs = objectives(S), bg = $('bonusGoal');
  bg.hidden = !objs.length;
  bg.innerHTML = objs.length ? `<b>副目標</b>　` + objs.map(o => `<span class="${o.failed ? 'ng' : o.ok && o.o.type !== 'turns' && o.o.type !== 'noLoss' ? 'ok' : ''}">${o.ok && !o.failed && (o.o.type === 'visits' || o.o.type === 'boss') ? '✓' : '・'}${o.text}${o.o.gold ? `（${o.o.gold}銀）` : ''}</span>`).join('　') : '';
}
/** Weapons as shown in panels: fang units get their built-in attack, staves are listed with the rest. */
function wpsText(u: Unit, withType = true) {
  const ids = [...usable(u).filter(w => WEAPONS[w].type === 'fang'), ...u.wps];
  return ids.map(w => WEAPONS[w].type === 'fang' ? weaponLabel(u, w) : withType ? `${WEAPONS[w].name}（${WTYPE_NAMES[WEAPONS[w].type]}）` : WEAPONS[w].name).join(withType ? '　' : '・') || 'なし';
}
function unitHtml(u: Unit) {
  const st = STAT_KEYS.filter(k => k !== 'hp').map(k => `<div><span>${STAT_NAMES[k]}</span>${u.st[k]}</div>`).join('');
  const wps = wpsText(u);
  const t = terrainAt(S, u.x, u.y);
  const face = faceHtml(u, 'big');
  return `<div class="ucard${face ? '' : ' noface'}">${face}<div class="ubody"><div class="uhead"><b class="${u.team}">${u.name}</b><span>${CLASSES[u.cls].name}　Lv ${u.lv}${u.gr ? `　EXP ${u.exp}` : ''}</span></div>
    <div class="hp">HP ${u.hp} / ${u.st.hp}<div class="bar"><i style="width:${100 * u.hp / u.st.hp}%;background:${u.team === 'blue' ? '#5aa7ff' : '#ff6f61'}"></i></div></div></div></div>
    <div class="stats">${st}</div><div class="wps">${wps}　／　${t.name}（守備+${t.def} 回避+${t.avo}）　／　移動 ${Math.max(1, CLASSES[u.cls].mov - (u.slow ?? 0))}（${MTYPE_NAMES[CLASSES[u.cls].mtype]}）</div>${skillLine(u)}${u.team === 'blue' ? bondLine(u) : ''}`;
}
/** スキル名と説明（systems.md §4。戦闘中に有効な最大3つ）。 */
function skillLine(u: Unit) {
  const ks = skillsOf(u);
  return ks.length ? `<div class="skills">${ks.map(k => `<div class="skill"><b>${SKILLS[k].name}</b><span>${SKILLS[k].desc}</span></div>`).join('')}</div>` : '';
}
/** One-line summary of a unit's supports with allies on this map. */
function bondLine(u: Unit) {
  const items = alive(S, 'blue').filter(o => o !== u).flatMap(o => {
    const p = SUPPORTS.find(q => pairKey(q.a, q.b) === pairKey(u.id, o.id));
    if (!p) return [];
    const b = S.bonds[pairKey(p.a, p.b)], need = nextNeed(p, b), st = bondStatus(S.bonds, p);
    const prog = st === 'ready' ? '<em>会話待ち</em>' : st === 'sBlocked' ? 'S枠なし' : need === null ? '最大' : `${b.pts}/${need}`;
    return [`${o.name} <b>${rankName(b.rank)}</b> ${prog}`];
  });
  return items.length ? `<div class="bondl"><span>支援</span>${items.join('　')}</div>` : '';
}
function info(html: string) { $('info').innerHTML = html; }
function menu(items: [string, () => void, string?][]) {
  const m = $('menu'); m.innerHTML = '';
  for (const [label, fn, cls] of items) {
    const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls;
    b.onclick = () => {
      if (mode === 'busy') return;
      fn();
      if ((mode as string) === 'busy') mobileMap.close();
    };
    m.appendChild(b);
  }
  mobileMap.updateMenu(mode === 'menu' ? 'commands' : (mode === 'target' || mode === 'heal') && picked ? 'forecast' : mode === 'move' && sel ? 'select' : 'map');
}

// ---------- music ----------
// Which track plays where (design/asset-orders.md §1). Delivered files replace the placeholder synth by themselves.
/** Engaged bosses retain their theme in allied phases until defeated or gone. */
const engaged = new Set<number>();
/** Whether this boss's first-clash conversation has played (also after reloading mid-chapter). */
const bossTalkPlayed = (u: Unit) => (chapterDef(S.chapter).talks ?? []).some(e => e.when.type === 'bossFight' && e.when.boss === bossId(u) && S.flags[talkKey(e.scene)]);
const bossEngaged = () => engagedBoss(S.units, S.flags, engaged, u => bossTalkPlayed(u as Unit));
/** A conversation's opening music: the scene's own cue if it has one, otherwise the fallback (never both). */
const sceneMusic = (cue: string | undefined, fallback: string) => audio.bgm(openingTrack(cue, fallback));
/**
 * The map's track: enemy phases always use their own theme; allied phases use an engaged boss's theme, otherwise the
 * chapter's own (Chapter.bgm) or the default by chapter — map_dawn 1–3, map_resolve 4–7, map_final 8–10 — and
 * map_enemy in the enemy phase.
 */
function mapTrack(): string {
  const bgm = stageBgm(chapterDef(S.chapter), stageOf(S)) ?? {}, n = S.chapter + 1;
  return chooseMapTrack(n, S.phase, bossEngaged(), bgm);
}
const mapMusic = () => { if (inBattle && S) audio.bgm(mapTrack()); };
/** Old companions whose talks are about shared history rather than romance or banter. */
const FAMILY_PAIRS = new Set([pairKey('rudeus', 'ruijerd'), pairKey('eris', 'ruijerd'), pairKey('rudeus', 'ghislaine')]);
/** Support talks: romance for pairs who can reach S, family for old bonds (tags such as 師弟・親子・元仲間), daily otherwise. */
const supportTrack = (p: SupportPair) => (p.max === 'S' ? 'romance' : (p.tag && p.tag !== 'IF') || FAMILY_PAIRS.has(pairKey(p.a, p.b)) ? 'family' : 'daily');

// ---------- dialogue (src/ui/dialogue.ts) ----------
/** Test log: every conversation played, in order (scene id, or `sup:…` for support talks). */
const playedLog: string[] = [];
/** Lines of a scene, dropping those of cast members who are not on the map (fallen, benched) during a battle. */
function sceneLines(id: SceneId, inBattleTalk: boolean): Line[] {
  const lines = SCENES[id].lines;
  if (!inBattleTalk || !S) return lines;
  return lines.filter(l => {
    const cid = idForName(l.who);
    if (!cid || !CAST[cid]) return true; // narration, extras, enemies, guests such as Orsted (who may be an enemy)
    return S.units.some(u => u.team === 'blue' && u.id === cid && onMap(u));
  });
}
/** Plays a screenplay scene. Story scenes (序章・開幕・終幕・幕間) go into `seen` for the camp's 記録. */
async function playScene(id: SceneId, battleTalk = false): Promise<number> {
  playedLog.push(id);
  if (!battleTalk) markSeen(id);
  const sc = SCENES[id], lines = sceneLines(id, battleTalk);
  if (!lines.some(l => l.text) && !sc.choice) return -1;
  cueBgm(sc.bgm);
  return play(lines, { mono: id === 'prologue', bg: sc.bg, choice: sc.choice });
}
/** Plays this chapter's due battle conversations (each once; recorded in the save straight away). */
async function runTalks(evs: ReturnType<typeof dueTalks>) {
  let played = false;
  for (const ev of evs) {
    if (S.flags[talkKey(ev.scene)]) continue;
    S.flags[talkKey(ev.scene)] = true;
    persistFlag(talkKey(ev.scene));
    await playScene(ev.scene, true);
    played = true;
  }
  if (played && restoresMapTrack(outcome(S))) mapMusic(); // a battle talk's own track lasts only as long as the talk (a decided battle goes on to its jingle)
}
const turnTalks = () => runTalks(dueTalks(S, w => w.type === 'turn' && w.turn === S.turn && w.phase === S.phase));

// ---------- player flow ----------
function idle() {
  mode = 'idle'; sel = picked = null; targets = []; probe = null; auto = null;
  if (!inspect) { stops = new Set(); threat = new Set(); }
  hud();
  info(inspect ? unitHtml(inspect) : `<p class="hint">青いユニットをタップして移動先を選ぼう（もう一度タップで解除）。届く敵をタップすると、自動で近づいて攻撃の予測が出る。敵だけをタップすると移動・攻撃範囲が見られる。「危険範囲」で敵全員の届くマスを赤く重ねられる。${scrolls() ? '地図はドラッグで動かせる。' : ''}</p>`);
  const left = alive(S, 'blue').filter(u => !u.done);
  menu([[dangerOn ? '危険範囲：表示中' : '危険範囲を表示', toggleDanger, dangerOn ? 'toggle on' : 'toggle'], ...(left.length ? [[`次のユニット（残り${left.length}）`, nextUnit] as [string, () => void]] : []), ['ターン終了', askEndTurn], ...(retreatCamp() ? [['撤退する', askRetreat, 'retreat'] as [string, () => void, string]] : [])]);
}
/** 未行動の自軍ユニットを順に選ぶ（地図もそこへ動く）。 */
let nextIdx = -1;
function nextUnit() {
  const left = alive(S, 'blue').filter(u => !u.done);
  if (!left.length) return;
  nextIdx = (nextIdx + 1) % left.length;
  selectUnit(left[nextIdx]);
}
/** 確認の問い（ターン終了・撤退）：説明を操作欄の先頭にも出し、横向きスマホでも操作欄を開いたままにする。 */
function confirmNote(text: string) {
  const p = document.createElement('p'); p.className = 'menu-note'; p.textContent = text;
  $('menu').prepend(p);
  mobileMap.updateMenu('commands');
}
/** 「ターン終了」：まだ動いていない仲間がいれば確かめる。 */
function askEndTurn() {
  const left = alive(S, 'blue').filter(u => !u.done);
  if (!left.length) { endTurn(); return; }
  info(`<p>まだ行動していない仲間が<b class="gold">${left.length}人</b>いる（${left.map(u => esc(u.name)).join('、')}）。ターンを終了する？</p>`);
  menu([['ターンを終了する', endTurn, 'primary'], ['もどる', idle]]);
  confirmNote(`まだ行動していない仲間が${left.length}人いる。ターンを終了する？`);
}
/**
 * 撤退で戻る章間：この章へ出撃したときのキャンプ（戦闘中は書き換えないので、そのまま出撃前の状態）。
 * 第1章（その前に章間がない）では null で、撤退のボタンは出さない。
 */
const retreatCamp = () => (camp && S && camp.next === S.chapter ? camp : null);
function askRetreat() {
  info('<p>この章の戦闘を中断して、キャンプに戻ります。戦闘の内容は取り消されます。よろしいですか？</p>');
  menu([['撤退する', retreat, 'primary'], ['もどる', idle, 'back']]);
  confirmNote('戦闘を中断してキャンプに戻る。戦闘の内容は取り消される。');
}
/**
 * 撤退（自軍フェイズの待機中・敗北画面）：戦闘を破棄して出撃前のキャンプへ。経験値・銀・宝箱・倒れた仲間・支援値は
 * 戦闘の State にだけあるので、捨てれば戦闘前に戻る。キャンプで済ませた買い物・天幕・既読はキャンプ側に残る。
 * 中断データはキャンプのセーブに置き換わる。合計ターン・倒れた仲間の数は勝利時にだけ足すので、この戦闘の分は数えない。
 */
function retreat() {
  if (!retreatCamp()) return;
  stopRush(); hideTutorial();
  sel = picked = inspect = null; stops = new Set(); threat = new Set(); menu([]);
  inBattle = false; engaged.clear(); save();
  showCamp('撤退した。態勢を整えて、もう一度挑もう。');
}
function selectUnit(u: Unit) {
  audio.sfx('select');
  sel = u; inspect = picked = null; origin = { x: u.x, y: u.y };
  void follow([u], 0);
  stops = stopTiles(S, u); threat = threatTiles(S, u, stops); mode = 'move'; auto = null;
  info(`<p class="hint selHint">光ったマスで移動。赤い範囲の敵をタップすると自動で近づいて攻撃の予測。同じユニットか範囲の外をタップで解除。</p>${unitHtml(u)}`);
  menu([['選択解除', idle, 'back'], ['その場で行動', () => { u.mv = 0; openMenu(); }]]);
}
/**
 * 1段戻る（「もどる／選択解除」ボタン、地図の別の場所のタップ、Esc、右クリック）。
 * 移動先を選ぶ段階 → 選択解除／行動メニュー → 移動の取り消し／攻撃・杖の相手選びと予測 → 行動メニュー（自動移動からなら移動前へ）。
 */
function goBack(): boolean {
  if (!S || !inBattle) return false;
  if (mode === 'move') { idle(); return true; }
  if (mode === 'menu') { undoMove(); return true; }
  if (mode === 'target' || mode === 'heal') { if (auto) undoMove(); else openMenu(); return true; }
  if (mode === 'idle' && (inspect || probe)) { inspect = null; idle(); return true; }
  return false;
}
/** 移動を取り消して、移動先を選ぶ段階に戻る。 */
function undoMove() { const u = sel!; auto = null; u.x = origin.x; u.y = origin.y; u.mv = 0; selectUnit(u); }

// ---- 敵（杖なら傷ついた味方）をタップ → 届くマスへ自動で移動した状態の予測 ----
interface AutoCand { x: number; y: number; wid: string }
/** 自動移動の候補（よい順）と、いま立っている候補。kind: 'atk' = 攻撃、'heal' = 杖。 */
let auto: { kind: 'atk' | 'heal'; t: Unit; cands: AutoCand[]; idx: number } | null = null;
/**
 * 選択中のユニット（移動前のマスにいる）が t を攻撃（回復）できるマスを、よい順に並べる：
 * 攻撃は反撃を受けない → 地形の守備・回避がよい → 移動が短い。マスごとの武器は反撃を受けない → 期待ダメージが大きいもの。
 */
function autoCands(u: Unit, t: Unit, kind: 'atk' | 'heal'): AutoCand[] {
  const scored: { c: AutoCand; sc: number }[] = [];
  for (const k of stops) {
    const [x, y] = k.split(',').map(Number), at = { x, y }, tr = terrainAt(S, x, y);
    const near = 100 - dist(origin, at), land = Math.min(99, tr.def * 3 + tr.avo / 5);
    if (kind === 'atk') {
      let best: { wid: string; v: number } | null = null;
      for (const wid of usable(u)) {
        if (!inRange(WEAPONS[wid], dist(at, t))) continue;
        const f = forecast(S, u, wid, t, at), v = (f.d ? 0 : 1e4) + f.a.dmg * (f.a.double ? 2 : 1) * f.a.hit / 100;
        if (!best || v > best.v) best = { wid, v };
      }
      if (best) scored.push({ c: { x, y, wid: best.wid }, sc: (best.v >= 1e4 ? 1e6 : 0) + land * 1e3 + near });
    } else {
      const sid = staves(u).find(w => healTargets(S, u, w, at).includes(t));
      if (sid) scored.push({ c: { x, y, wid: sid }, sc: land * 1e3 + near });
    }
  }
  return scored.sort((a, b) => b.sc - a.sc).map(s => s.c);
}
function autoStart(t: Unit, kind: 'atk' | 'heal', cands: AutoCand[]) {
  auto = { kind, t, cands, idx: 0 };
  return autoPlace(0);
}
/** 候補 i のマスへ移動して予測を出す（まだ確定しない）。 */
async function autoPlace(i: number) {
  const a = auto!, u = sel!, c = a.cands[i];
  a.idx = i; mode = 'busy';
  if (c.x !== u.x || c.y !== u.y) audio.sfx('move');
  await tween(u, c.x, c.y);
  u.mv = dist(origin, c); curW = c.wid; targets = [a.t]; picked = null;
  if (a.kind === 'atk') { mode = 'target'; pickTarget(a.t); } else { mode = 'heal'; pickHeal(a.t); }
}
/** 予測の下に足すボタン：自動移動なら「位置を変える」。 */
function autoItems(): [string, () => void, string?][] {
  const a = auto;
  return a && a.cands.length > 1 ? [[`位置を変える ${a.idx + 1}/${a.cands.length}`, () => void autoPlace((a.idx + 1) % a.cands.length)]] : [];
}
function openMenu() {
  const u = sel!; mode = 'menu'; picked = null; targets = []; auto = null;
  const items: [string, () => void, string?][] = [];
  for (const wid of usable(u)) {
    const ts = alive(S, 'red').filter(t => inRange(WEAPONS[wid], dist(u, t)));
    if (ts.length) items.push([`攻撃：${WEAPONS[wid].name}`, () => chooseTarget(wid, ts), 'primary']);
  }
  for (const sid of staves(u)) {
    const ts = healTargets(S, u, sid);
    if (ts.length) items.push([`杖：${WEAPONS[sid].name}`, () => chooseHeal(sid, ts), 'primary']);
  }
  if (canSeize(S, u)) items.push(['制圧', () => { S.flags[seizeFlag(S)] = true; audio.sfx('decide'); finish(u); }, 'primary']);
  if (canEscape(S, u)) items.push(['離脱', () => { u.left = true; float(u, '離脱', '#e8c56a'); finish(u); }, 'primary']);
  const vs = visitsFor(S, u);
  for (const v of vs) items.push([(v.kind === 'chest' ? '開ける' : '訪問') + (vs.length > 1 ? `（${v.x},${v.y}）` : ''), () => void doVisit(u, v), 'primary']);
  if (u.potions > 0 && u.hp < u.st.hp) items.push([`傷薬（残り${u.potions}）`, () => { u.potions--; u.hp = Math.min(u.st.hp, u.hp + POTION_HEAL); float(u, `+${POTION_HEAL}`, '#8fe0a0'); audio.sfx('heal'); finish(u); }]);
  items.push(['待機', () => finish(u)]);
  items.push(['もどる', undoMove, 'back']);
  info(unitHtml(u)); menu(items);
}
/** 宝箱を開ける・訪問する（M13）：会話（あれば）→中身を受け取る→行動終了。銀は flags.loot にためて章クリア時に所持金へ。 */
async function doVisit(u: Unit, v: NonNullable<ReturnType<typeof chapterDef>['visits']>[number]) {
  mode = 'busy'; menu([]); hud();
  S.flags[visitFlag(v)] = true;
  audio.sfx('decide');
  if (v.talk) { await playScene(v.talk, true); mapMusic(); }
  const others = [...S.units.filter(o => o.team === 'blue' && !o.guest && onMap(o)), ...S.bench.filter(o => !o.out && !o.guest)];
  const got = takeLoot(u, v.item, v.gold, others, true);
  if (got.silver) S.flags.loot = (Number(S.flags.loot) || 0) + got.silver;
  if (got.item && got.stashed) S.flags[STASH_FLAG + got.item] = (Number(S.flags[STASH_FLAG + got.item]) || 0) + 1; // 章クリアで倉庫へ
  const parts: string[] = [];
  if (got.item) parts.push(got.to ? `${shopName(got.item)}（${got.to.name}へ）` : got.stashed ? `${shopName(got.item)}（持てる者がいないので倉庫へ）` : `${shopName(got.item)}は持てる者がいないので銀に換えた`);
  if (got.silver) parts.push(`${got.silver}銀`);
  float(u, got.item && (got.to || got.stashed) ? shopName(got.item) : got.silver ? `+${got.silver}銀` : v.kind === 'chest' ? '開けた' : '訪問', '#e8c56a');
  info(`<p>${esc(parts.join('、') || '何もなかった')}を手に入れた。</p>`);
  await banner(got.item && (got.to || got.stashed) ? `${shopName(got.item)}を手に入れた${got.stashed ? '（倉庫へ）' : ''}` : got.silver ? `${got.silver}銀を手に入れた` : '空っぽだった', 1100);
  finish(u);
}
function chooseTarget(wid: string, ts: Unit[]) {
  mode = 'target'; curW = wid; targets = ts; picked = null;
  info('<p class="hint">攻撃する相手をタップ。</p>'); menu([['もどる', openMenu, 'back']]);
  if (ts.length === 1) pickTarget(ts[0]);
}
function pickTarget(t: Unit) {
  audio.sfx('cursor');
  const u = sel!, f = forecast(S, u, curW, t);
  picked = t;
  const row = (k: string, a: string, d: string) => `<div class="n blue">${a}</div><div class="k">${k}</div><div class="n red">${d}</div>`;
  const who = `<div class="n blue fcwho">${faceHtml(u, 'fcface', 'angry')}<span>${u.name}</span></div><div class="k vs">VS</div><div class="n red fcwho">${faceHtml(t, 'fcface')}<span>${t.name}</span></div>`;
  info(`<div class="fc">${who}${row('HP', `${u.hp}`, `${t.hp}`)}
    ${row('威力', f.a.dmg + (f.a.double ? ' ×2' : ''), f.d ? f.d.dmg + (f.d.double ? ' ×2' : '') : '—')}
    ${row('命中', f.a.hit + '%', f.d ? f.d.hit + '%' : '—')}${row('必殺', f.a.crit + '%', f.d ? f.d.crit + '%' : '—')}
    ${f.d?.block || f.a.block ? row('', f.d?.block ? `${SKILLS.shieldBlock.name} ${f.d.block}%` : '', f.a.block ? `${SKILLS.shieldBlock.name} ${f.a.block}%` : '') : ''}
    ${row('武器', weaponLabel(u, curW), f.d ? (f.d.w.type === 'fang' ? weaponLabel(t, 'fang') : f.d.w.name) : '反撃不可')}</div>${supRow(f.a.sup)}${linkRow(u, t)}${skillRow(f.a.skills, f.d?.skills ?? [])}`);
  const ws = usable(u).filter(w => inRange(WEAPONS[w], dist(u, t)));
  const swap: [string, () => void][] = ws.length > 1 ? [[`武器→${weaponLabel(u, ws[(ws.indexOf(curW) + 1) % ws.length]).replace(/（固有）威力\d+$/, '')}`, () => { curW = ws[(ws.indexOf(curW) + 1) % ws.length]; pickTarget(t); }]] : [];
  menu([['戦う', async () => { mode = 'busy'; auto = null; await battle(u, curW, t); finish(u); }, 'primary'], ...autoItems(), ...swap, ['もどる', goBack, 'back']]);
}
function chooseHeal(sid: string, ts: Unit[]) {
  mode = 'heal'; curW = sid; targets = ts; picked = null;
  info('<p class="hint">回復する味方をタップ。</p>'); menu([['もどる', openMenu, 'back']]);
  if (ts.length === 1) pickHeal(ts[0]);
}
function pickHeal(t: Unit) {
  audio.sfx('cursor');
  const u = sel!, amt = healAmount(u, curW, t);
  picked = t;
  info(`<div class="fc"><div class="n blue fcwho">${faceHtml(u, 'fcface')}<span>${u.name}</span></div><div class="k">杖</div><div class="n blue fcwho">${faceHtml(t, 'fcface')}<span>${t.name}</span></div>
    <div class="n">${WEAPONS[curW].name}</div><div class="k">回復</div><div class="n heal">+${amt}</div>
    <div class="n"></div><div class="k">HP</div><div class="n">${t.hp} → ${t.hp + amt} / ${t.st.hp}</div></div>
    <p class="fcsup heal">経験値 +${healExp(amt)}</p>`);
  menu([['回復する', async () => { mode = 'busy'; auto = null; await doHeal(u, curW, t); finish(u); }, 'primary'], ...autoItems(), ['もどる', goBack, 'back']]);
}
async function doHeal(u: Unit, sid: string, t: Unit) {
  const h = heal(u, sid, t), wind = healingWind(S, u, t);
  float(t, `+${h}`, '#8fe0a0'); audio.sfx('heal');
  if (wind.length) { skillPop(u, SKILLS.healingWind.name); for (const w of wind) float(w.unit, `+${w.hp}`, '#8fe0a0'); }
  await sleep(450);
  if (u.team === 'blue') await runTalks(dueTalks(S, w => w.type === 'firstHeal' && w.unit === u.id));
  if (u.team === 'blue' && u.gr) {
    const gains = addExp(u, expBoost(S, u, healExp(h)));
    if (gains) audio.jingle('levelup');
    if (gains) await banner(`${u.name} レベルアップ！ Lv ${u.lv}　` + (gainText(gains) || '成長なし'), 1700);
  }
}
/** 予測欄の補足：この戦闘で効いている条件付きスキル。 */
function skillRow(a: string[], d: string[]) {
  return a.length || d.length ? `<p class="fcsup">スキル：${[...a.map(n => `<span class="blue">${n}</span>`), ...d.map(n => `<span class="red">${n}</span>`)].join('、')}</p>` : '';
}
function linkRow(u: Unit, t: Unit) {
  const l = linkPartner(S, u, t);
  return l ? `<p class="fcsup">連携：${l.u.name}が${l.rate}%で追撃（威力${l.side.dmg} 命中${l.side.hit}%）</p>` : '';
}
function supRow(sup: { hit: number; avo: number; crit: number; dmg: number; from: { name: string; rank: string }[] }) {
  if (!sup.from.length) return '';
  const fx = [sup.hit && `命中+${sup.hit}`, sup.avo && `回避+${sup.avo}`, sup.crit && `必殺+${sup.crit}`, sup.dmg && `威力+${sup.dmg}`].filter(Boolean).join(' ');
  return `<p class="fcsup">絆：${sup.from.map(f => `${f.name}（${f.rank}）`).join('、')}　${fx}</p>`;
}
async function finish(u: Unit) {
  mode = 'busy'; u.done = true; sel = picked = inspect = null; targets = []; auto = null;
  if (await checkEnd()) return;
  if (alive(S, 'blue').every(b => b.done)) { mode = 'idle'; endTurn(); } else idle();
}

// Drag to scroll (maps larger than the screen only). A press that moves less than DRAG_PX stays a tap.
// On scrolling maps a tap is taken from pointerup (the browser's own click after it is ignored), because
// browsers may drop the synthesized click once a touch gesture has scrolled. Maps that fit keep using click.
const DRAG_PX = 10;
let drag: { id: number; sx: number; sy: number; cx: number; cy: number; moved: boolean } | null = null;
let skipClickUntil = 0;
cv.addEventListener('pointerdown', e => {
  if (!S || !scrolls() || (e.pointerType === 'mouse' && e.button !== 0)) return;
  drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: cam.x, cy: cam.y, moved: false };
});
cv.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
  if (!drag.moved) {
    if (Math.hypot(dx, dy) < DRAG_PX) return;
    drag.moved = true;
    try { cv.setPointerCapture(e.pointerId); } catch { /* pointer already gone */ }
  }
  const k = VW / cv.getBoundingClientRect().width;
  cam.x = drag.cx - dx * k; cam.y = drag.cy - dy * k; clampCam();
});
cv.addEventListener('pointerup', e => {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag;
  drag = null;
  skipClickUntil = performance.now() + 500; // the click that follows this pointerup (if any) is not a second tap
  if (!d.moved) void tapAt(e.clientX, e.clientY);
});
cv.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.id) drag = null; });
// PC：右クリックと Esc で1段戻る（ヘルプ・音の設定・会話などが開いているときは、それらが先）
cv.addEventListener('contextmenu', e => { e.preventDefault(); if (mode !== 'busy' && goBack()) audio.sfx('cancel'); });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || mode === 'busy' || ['help', 'snd', 'dlg', 'title', 'camp', 'show'].some(id => !$(id).hidden)) return;
  if (mobileMap.close() || goBack()) { e.preventDefault(); audio.sfx('cancel'); }
}, true);
cv.addEventListener('click', e => {
  if (performance.now() < skipClickUntil) { skipClickUntil = 0; return; }
  void tapAt(e.clientX, e.clientY);
});

async function tapAt(clientX: number, clientY: number) {
  if (mode === 'busy' || !S) return;
  const r = cv.getBoundingClientRect();
  const tx = Math.floor(((clientX - r.left) / r.width * VW + cam.x) / T), ty = Math.floor(((clientY - r.top) / r.height * VH + cam.y) / T);
  if (tx < 0 || ty < 0 || ty >= S.map.length || tx >= S.map[0].length) return;
  const u = unitAt(S, tx, ty);
  if (mode === 'idle') {
    if (u && u.team === 'blue' && !u.done) return selectUnit(u);
    inspect = u ?? null;
    audio.sfx('cursor');
    if (u) { stops = u.ai === 'guard' ? new Set([key(u.x, u.y)]) : stopTiles(S, u); threat = threatTiles(S, u, stops); }
    idle();
    if (!u) {
      // the tapped tile stays outlined, so on a painted map it is clear which tile of the picture the rules read
      const t = terrainAt(S, tx, ty), block = BLOCKING.includes(S.map[ty][tx]);
      probe = { x: tx, y: ty };
      info(`<p class="hint">${t.name}　守備+${t.def}　回避+${t.avo}${t.heal ? '　ターン開始時にHP回復' : ''}${t.note ? '　' + t.note : ''}${block ? '（飛行ユニットのみ通れる）' : ''}</p>`);
    }
  } else if (mode === 'move') {
    const s = sel!;
    if (u === s) { audio.sfx('cancel'); return idle(); } // 同じユニットをもう一度タップ：選択解除
    if (u && u.team === 'red') { const cs = autoCands(s, u, 'atk'); if (cs.length) return autoStart(u, 'atk', cs); }
    if (u && u.team === 'blue') { const cs = autoCands(s, u, 'heal'); if (cs.length) return autoStart(u, 'heal', cs); }
    if (u) { idle(); return tapAt(clientX, clientY); } // 届かない敵・ほかの味方：選び直し／範囲を見る
    if (!stops.has(key(tx, ty))) { audio.sfx('cancel'); return idle(); } // 範囲の外の何もないマス：選択解除
    mode = 'busy'; if (tx !== s.x || ty !== s.y) audio.sfx('move'); s.mv = dist(origin, { x: tx, y: ty }); await tween(s, tx, ty); openMenu();
  } else if (mode === 'menu') {
    if (u && u.team === 'red') { const wid = usable(sel!).find(w => inRange(WEAPONS[w], dist(sel!, u))); if (wid) { chooseTarget(wid, alive(S, 'red').filter(t => inRange(WEAPONS[wid], dist(sel!, t)))); pickTarget(u); return; } }
    if (u && u.team === 'blue') { const sid = staves(sel!).find(w => healTargets(S, sel!, w).includes(u)); if (sid) { chooseHeal(sid, healTargets(S, sel!, sid)); pickHeal(u); return; } }
    audio.sfx('cancel'); undoMove(); // 地図の別の場所：移動を取り消す
  } else if (mode === 'target' || mode === 'heal') {
    if (u && targets.includes(u)) return mode === 'target' ? pickTarget(u) : pickHeal(u);
    if (!auto) { audio.sfx('cancel'); return openMenu(); }
    const ci = u ? -1 : auto.cands.findIndex(c => c.x === tx && c.y === ty);
    if (ci >= 0) return autoPlace(ci); // 別の候補マス：位置を変える
    const s = sel!;
    if (u && u !== s) { auto = null; s.x = origin.x; s.y = origin.y; s.mv = 0; mode = 'move'; return tapAt(clientX, clientY); } // 別の敵・味方：移動前から選び直す
    audio.sfx('cancel'); undoMove();
  }
}

// ---------- combat presentation ----------
/** Picture for a cut-in: the portrait (angry when striking), or the map sprite for generic enemies. */
function cutinArt(u: Unit, striking: boolean) {
  const url = portraitUrl(idForUnit(u), striking ? 'angry' : 'normal');
  return url ? { url, sprite: false } : { url: spriteUrl(u), sprite: true };
}
/**
 * A short cut-in over the map: the two fighters slide in from their own sides (allies left, enemies right),
 * the attacker lit. `crit` = a critical strike: only the striker, larger, with a flash. Skipped with __fast.
 */
async function cutin(att: Unit, def: Unit, crit = false) {
  if (fast() || rush || rushHeld) return;
  const el = $('cutin');
  const sides = { l: att.team === 'blue' ? att : def, r: att.team === 'blue' ? def : att };
  let any = false;
  for (const k of ['l', 'r'] as const) {
    const u = sides[k], box = el.querySelector<HTMLElement>(`.ci.${k}`)!, img = box.querySelector('img')!;
    const show = !crit || u === att, art = show ? cutinArt(u, u === att) : null;
    box.hidden = !art?.url;
    box.classList.toggle('att', u === att); box.classList.toggle('sprite', !!art?.sprite);
    if (art?.url) { img.src = art.url; img.onerror = () => { box.hidden = true; }; any = true; }
  }
  if (!any) return;
  el.classList.toggle('crit', crit); el.dataset.att = sides.l === att ? 'l' : 'r';
  el.classList.remove('go'); el.hidden = false; void el.offsetWidth; el.classList.add('go');
  const k = pace();
  if (k > 0 && k < 1) for (const a of el.getAnimations({ subtree: true })) a.playbackRate = 1 / k; // はやい：同じ動きを速回しで
  await sleep(crit ? 720 : 560);
  el.hidden = true; el.classList.remove('go');
}
/** Loads the portraits this chapter's fights and talks will use, so the first cut-in does not pop in late. */
function preloadChapterArt() {
  for (const u of S.units) { const id = idForUnit(u); if (id) { preloadPortrait(id); preloadPortrait(id, 'angry'); } }
}
/**
 * How a defeated figure leaves the map: a white blink and a fade; a boss gets a white flash over the map, a moment of
 * stillness, then crumbles. Shortened with はやい and the enemy-phase fast-forward (pace), none with __fast.
 */
/** A boss's first clash: the boss theme starts and its name (with portrait when there is one) is announced once per chapter. */
async function bossIntro(u: Unit) {
  S.flags[`intro:${u.uid}`] = true;
  engaged.add(u.uid); mapMusic();
  const id = idForUnit(u), cls = CLASSES[u.cls]?.name ?? '';
  await showcase({ kind: 'boss', sub: `${cls}　Lv ${u.lv}`, main: u.name, pics: [picOf(id, 'angry')] }, 1500);
}
async function defeatFx(u: Unit) {
  const k = pace();
  if (k <= 0) return;
  const boss = !!u.boss && u.team === 'red' && k >= 0.4, now = performance.now();
  const dur = (boss ? 1700 : 520) * k;
  dying.set(u.uid, captureDying(c => drawUnit(c, u, 0, 0), now, dur, boss));
  if (boss) flashFx = { t0: now, dur: 520, a: 0.9 };
  await sleep(boss ? 1900 : 560);
}
async function battle(att: Unit, wid: string, def: Unit) {
  // a member's first fight, then the first clash with a boss (a dedicated version for this member replaces the generic one)
  const skip: ReturnType<typeof dueTalks> = [];
  const evs = fightTalks(S, att, def, skip);
  for (const e of skip) { S.flags[talkKey(e.scene)] = true; persistFlag(talkKey(e.scene)); }
  for (const u of [att, def]) if (u.team === 'red' && u.boss && !S.flags[`intro:${u.uid}`]) await bossIntro(u);
  await runTalks(evs);
  for (const u of [att, def]) if (u.team === 'red' && u.boss) engaged.add(u.uid);
  mapMusic(); // engaged boss theme in allied phases; enemy phases keep their own theme
  shownHp.set(att.uid, att.hp); shownHp.set(def.uid, def.hp);
  const strikes = fight(S, att, wid, def);
  const retreated = [att, def].filter(u => u.retreated);
  for (const u of retreated) leaving.add(u.uid);
  await cutin(att, def);
  for (const k of strikes) {
    if (k.crit && k.hit) await cutin(k.from, k.to, true);
    const dx = Math.sign(k.to.x - k.from.x) * T / 4, dy = Math.sign(k.to.y - k.from.y) * T / 4;
    offs.set(k.from.uid, { dx, dy }); await sleep(110); offs.delete(k.from.uid);
    float(k.to, k.hit ? (k.crit ? `必殺！${k.dmg}` : `${k.dmg}`) : 'ミス', k.hit ? (k.crit ? '#ffe36a' : '#ffffff') : '#a79fb8');
    if (k.skill) skillBand(k.skill === SKILLS.shieldBlock.name ? k.to : k.from, k.skill);
    shownHp.set(k.to.uid, (shownHp.get(k.to.uid) ?? 0) - k.dmg);
    audio.sfx(k.hit ? (k.crit ? 'crit' : 'hit') : 'miss');
    if (k.hit && k.crit && pace() > 0) shakeFx = { t0: performance.now(), dur: 260 * pace(), amp: 3 };
    const killed = k.hit && (shownHp.get(k.to.uid) ?? 0) <= 0;
    if (killed) audio.sfx('kill');
    if (killed && !k.to.retreated && !(k.to.team === 'red' && k.to.defeat)) await defeatFx(k.to);
    else if (killed && k.to.boss && k.to.team === 'red' && pace() >= 0.4) { flashFx = { t0: performance.now(), dur: 520, a: 0.8 }; await sleep(900); } // 退く・捕まるボス：白い閃光と静止だけ
    else await sleep(420);
  }
  shownHp.clear();
  for (const u of [att, def]) if (u.team === 'red' && u.hp <= 0 && u.defeat) { float(u, u.defeat === 'captured' ? '捕縛' : '撤退', '#e8c56a'); await sleep(500); }
  for (const u of retreated) { float(u, '撤退', '#e8c56a'); await sleep(600); leaving.delete(u.uid); }
  const downBoss = [att, def].map(u => (u.hp <= 0 || retreated.includes(u) ? bossId(u) : null)).filter((id): id is string => !!id);
  if (downBoss.length) await runTalks(dueTalks(S, w => w.type === 'bossDefeat' && downBoss.includes(w.boss)));
  for (const g of gainBonds(S, [att, def])) float(g.partner, g.ready ? '支援会話あり' : `絆+${g.added}`, '#ff8fa8');
  const fallen = [att, def].find(u => u.team === 'blue' && u.hp <= 0);
  if (fallen && !fallen.guest && !loseCond(chapterDef(S.chapter)).units.includes(fallen.id)) {
    S.flags.falls = (Number(S.flags.falls) || 0) + 1; // クリア記録の「倒れた仲間」
    const words = fallBark(S, fallen); // 結ばれた相手が倒れたときのひとこと（design/script-romance.md）
    if (words?.length) await play(words);
    await banner(S.difficulty === 'classic' ? `${fallen.name}は重傷を負い、戦線離脱した` : `${fallen.name}は重傷を負い、撤退した（次の章で復帰）`, 1500);
  } else if (!fallen) { const words = adjacentBark(S, att, def); if (words?.length) await play(words); } // 隣で戦うひとこと
  const me = att.team === 'blue' ? att : def, foe = me === att ? def : att;
  if (me.hp > 0 && me.gr) {
    const gains = addExp(me, expBoost(S, me, expGain(me, foe, strikes)));
    if (gains) audio.jingle('levelup');
    if (gains) await banner(`${me.name} レベルアップ！ Lv ${me.lv}　` + (Object.keys(gains).map(k => STAT_NAMES[k as keyof typeof STAT_NAMES] + '+1').join(' ') || '成長なし'), 1700);
  }
  if (restoresMapTrack(outcome(S))) mapMusic(); // a boss that fell (or retreated) gives the map its own track back, unless that decided the battle
  await sleep(120);
}

async function checkEnd(): Promise<boolean> {
  const o = outcome(S);
  if (!o) return false;
  stopRush();
  mode = 'busy'; hud();
  if (o === 'stage') { await stageChange(); return outcome(S) ? checkEnd() : false; }
  if (o === 'win') {
    await outcomeBanner(true);
    const ch = chapterDef(S.chapter);
    // The camp is saved first (with the closing scenes marked seen), so closing the page mid-scene loses nothing:
    // they can be watched again from the camp's 記録.
    const objs = objectives(S), extra = objs.reduce((a, o) => a + (o.ok ? o.o.gold : 0), 0);
    if (objs.length) await banner('副目標\n' + objs.map(o => `${o.ok ? '◎' : '×'} ${o.text}${o.ok && o.o.gold ? `　+${o.o.gold}銀` : ''}`).join('\n'), 2600, 'small');
    const roster = rosterOf(S), benchUp = benchExp(S, roster), reward = chapterReward(S.chapter + 1) + (Number(S.flags.loot) || 0) + extra; // loot = 抜け目なし
    const stash = [...(camp?.stash ?? carriedStash(S)), ...battleStash(S)];
    const stats = { turns: (camp?.turns ?? 0) + S.turn, falls: (camp?.falls ?? 0) + (Number(S.flags.falls) || 0), ...((camp?.round ?? Number(S.flags[`${CARRY}round`])) > 1 ? { round: camp?.round ?? Number(S.flags[`${CARRY}round`]) } : {}) };
    camp = { next: S.chapter + 1, cleared: S.chapter + 1, roster, bonds: S.bonds, difficulty: S.difficulty, gold: (camp?.gold ?? (Number(S.flags[`${CARRY}gold`]) || 0)) + reward, ...stats, ...(camp?.school ? { school: camp.school } : {}), ...(stash.length ? { stash } : {}), ...(S.hard ? { hard: true } : {}), bench: benchUp.map(g => ({ id: g.id, exp: g.exp, fromLv: g.fromLv, lv: g.lv })), ...(camp?.ended ? { ended: true } : {}) };
    markSeen(ch.outro); if (ch.interlude) markSeen(ch.interlude);
    inBattle = false; save();
    await playScene(ch.outro);
    if (ch.interlude) await playScene(ch.interlude);
    await supportTalks(camp);
    if (ch.ending) { await playEnding(true); return true; }
    const lost = camp.roster.filter(u => u.out && !S.bench.some(b => b.id === u.id)).map(u => u.name);
    const benchMsg = camp.bench?.length ? `　控えの${camp.bench.length}人も経験値 +${camp.bench[0].exp}${camp.bench.some(g => g.lv > g.fromLv) ? `（${camp.bench.filter(g => g.lv > g.fromLv).map(g => `${castName(g.id)} Lv${g.lv}`).join('、')}）` : ''}。` : '';
    showCamp(chapterDef(camp.cleared - 1).title.replace(/\s+/g, '　') + `　クリア！　報酬 ${reward}銀${extra ? `（副目標 +${extra}銀）` : ''}。` + (lost.length ? `　${lost.join('、')}は戦線離脱した。` : '') + benchMsg);
  } else {
    await outcomeBanner(false);
    showDefeat();
  }
  return true;
}
/** The state at the start of the current chapter (from the camp, or a new game for chapter 1), with the same members picked on the sortie screen. */
const chapterStart = () => keepCarry(camp ? undefined : S, withSchool(newChapter(S.chapter, camp?.next === S.chapter ? camp.roster : undefined, camp?.next === S.chapter ? camp.bonds : undefined, S.difficulty, camp?.next === S.chapter ? chapterPicks(S) : undefined, !!S.hard)));
/** 三流派の心得：出撃準備で選んだ流派を、出撃するパウロに付ける。 */
function withSchool(st: State): State {
  if (camp?.school) for (const u of st.units) if (u.team === 'blue' && hasSkill(u, 'threeSchools')) u.school = camp.school;
  return st;
}
function showDefeat() {
  const classic = S.difficulty === 'classic';
  if (classic) { const st = S; S = chapterStart(); save(); S = st; } // クラシック：中断データも章の最初に戻す
  showTitle(classic ? '仲間が倒れてしまった。章の最初からやり直そう。' : '仲間が倒れてしまった。どこからやり直す？', 'defeat');
  $('btnRetryPhase').hidden = classic;
  $('btnDefeatCamp').hidden = !retreatCamp();
}

// ---------- stages (M1) ----------
/** Test log: stage changes (stage number and turn). */
const stageLog: { stage: number; turn: number }[] = [];
/** The current stage is won and another follows: enemies leave, allies and enemies join, terrain changes, the stage's talk. */
async function stageChange() {
  const r = advanceStage(S);
  if (!r) return;
  stageLog.push({ stage: r.stage, turn: S.turn });
  sel = picked = inspect = null; stops = new Set(); threat = new Set();
  hud();
  await banner('戦況が変わった！', 1100);
  if (r.terrain.length) { await paintTerrain(); await follow(r.terrain.map(([x, y]) => ({ x, y }))); await banner('地形が変わった！', 900); }
  for (const u of r.added) float(u, u.guest ? '参戦' : '加入', '#8fc1ff');
  for (const u of r.foes) float(u, '出現', '#ff9a8f');
  if (r.added.length) { await follow(r.added); await sleep(500); }
  const st = chapterDef(S.chapter).stages?.[r.stage - 1];
  if (st?.talk) await playScene(st.talk);
  await runTalks(dueTalks(S, w => w.type === 'stageStart' && w.stage === r.stage));
  mapMusic(); hud(); save();
}

// ---------- phases ----------
/** 敵軍フェイズの早送りを終える（フェイズの終わり・章の決着）。 */
function stopRush() { rush = false; rushHeld = false; clearTimeout(holdTimer); $('rushBtn').hidden = true; }
let holdTimer = 0;
const enemyTurn = () => inBattle && !!S && S.phase === 'red';
// 敵軍フェイズ：地図を長押ししているあいだは早送り。
$('stage').addEventListener('pointerdown', () => {
  if (!enemyTurn()) return;
  clearTimeout(holdTimer);
  holdTimer = window.setTimeout(() => { if (enemyTurn()) rushHeld = true; }, 280);
});
const release = () => { clearTimeout(holdTimer); rushHeld = false; };
for (const ev of ['pointerup', 'pointercancel'] as const) window.addEventListener(ev, release, true);
$('stage').addEventListener('pointerleave', release);
$('rushBtn').onclick = e => { e.stopPropagation(); if (enemyTurn()) { rush = true; $('rushBtn').hidden = true; } };
function fortHeal(team: 'blue' | 'red') {
  for (const u of alive(S, team)) if (terrainAt(S, u.x, u.y).heal && u.hp < u.st.hp) { const h = Math.min(u.st.hp - u.hp, Math.ceil(u.st.hp * 0.2)); u.hp += h; float(u, `+${h}`, '#8fe0a0'); }
  // 使い魔の加護（ペルギウス）：砦の回復のあとに。演出は名前を出さない（使い魔の設定は要確認）。
  for (const g of familiarHeal(S, team)) float(g.unit, `+${g.hp}`, '#8fe0a0');
}
/** A skill's name popped above the unit for a moment (proc skills such as 盾受け). */
/** A skill (or a link attack) going off in battle: a small band with the user's face, besides the word over the figure. */
let skillBandT = 0;
function skillBand(u: Unit, name: string) {
  skillPop(u, name);
  if (fast() || rush || rushHeld) return;
  const el = $('skillBand'), link = name === LINK_NAME;
  el.innerHTML = `${faceHtml(u, 'uicon')}<span><small>${esc(u.name)}</small>${esc(link ? `${name}攻撃` : name)}</span>`;
  el.className = link ? 'link' : ''; el.hidden = false; void el.offsetWidth; el.classList.add('go');
  const k = pace(); if (k > 0 && k < 1) for (const a of el.getAnimations()) a.playbackRate = 1 / k;
  clearTimeout(skillBandT); skillBandT = window.setTimeout(() => { el.hidden = true; }, 900 * pace());
}
function skillPop(u: Unit, name: string) { floats.push({ x: u.x * T + T / 2, y: u.y * T - T * 0.2, text: name, color: '#9fe8ff', t: FLOAT_LIFE }); }
async function endTurn() {
  if (mode === 'busy') return;
  mode = 'busy'; sel = picked = inspect = null; stops = new Set(); threat = new Set(); menu([]);
  const camBefore = { ...cam };
  S.phase = 'red'; hud(); info('<p class="hint">敵軍が行動中……（画面の長押しか「早送り」で一気に進む）</p>');
  $('rushBtn').hidden = false;
  mapMusic(); audio.sfx('phaseRed');
  await banner('敵軍フェイズ');
  fortHeal('red');
  applyAiSwitch(S); // aiFrom: e.g. a boss that starts to charge or flee from this turn's enemy phase
  const actors = alive(S, 'red'); // reinforcements appear now but do not act this phase
  await turnTalks();
  const waves: number[] = [];
  const rf = spawnReinforcements(S, waves);
  if (rf.length) {
    await follow(rf.slice(0, 1)); for (const u of rf) float(u, '増援', '#ff9a8f'); await banner('敵の増援が現れた！');
    await runTalks(dueTalks(S, w => w.type === 'reinforce' && (w.stage ?? 0) === stageOf(S) && [w.wave].flat().some(n => waves.includes(n))));
  }
  for (const e of actors) {
    if (e.hp <= 0) continue;
    const p = planEnemy(S, e);
    const acts = p.x !== e.x || p.y !== e.y || !!p.target || !!p.heal || !!p.potion;
    if (acts) {
      // Keep the actor (start and end) and its target on screen.
      const before = inView(e.x, e.y, 0);
      await follow([e, p, ...(p.target ? [p.target] : []), ...(p.heal ? [p.heal] : [])]);
      followLog.push({ name: e.name, x: p.x, y: p.y, before, after: inView(e.x, e.y, 0) && inView(p.x, p.y, 0), cam: { ...cam } });
    }
    if (p.x !== e.x || p.y !== e.y) audio.sfx('move');
    e.mv = dist(e, p); await tween(e, p.x, p.y);
    if (p.heal && p.wid) await doHeal(e, p.wid, p.heal);
    else if (p.potion) { e.potions--; const h = Math.min(e.st.hp - e.hp, POTION_HEAL); e.hp += h; float(e, `+${h}`, '#8fe0a0'); audio.sfx('heal'); await sleep(450); }
    else if (p.target && p.wid) { await battle(e, p.wid, p.target); if (await checkEnd()) return; }
    await sleep(140);
  }
  stopRush();
  S.phase = 'blue'; S.turn++;
  clearSlow(S); // 泥沼は敵軍フェイズのあいだだけ
  for (const u of S.units) u.done = false;
  if (await checkEnd()) return; // survive / defend: the last enemy phase is over (or the next stage begins)
  if (scrolls()) await panTo(camBefore.x, camBefore.y); // back to where the player was looking
  const changed = applyTerrainChanges(S, 'turn');
  if (changed.length) { await paintTerrain(); await follow(changed.map(([x, y]) => ({ x, y }))); await banner('地形が変わった！', 900); }
  fortHeal('blue'); save(); hud();
  mapMusic(); audio.sfx('phaseBlue');
  await banner('自軍フェイズ');
  await turnTalks();
  idle();
}

// ---------- support conversations ----------
const castName = (id: string) => CAST[id]?.name ?? id;
/** Plays every support conversation that is ready (one rank per pair), confirming each rank. */
async function supportTalks(c: Camp) {
  const done = new Set<string>();
  for (;;) {
    const ids = new Set(c.roster.map(u => u.id)); // only pairs who have both joined (start points alone can fill C)
    const p = readyPairs(c.bonds, c.cleared).find(q => !done.has(pairKey(q.a, q.b)) && ids.has(q.a) && ids.has(q.b));
    if (!p) break;
    done.add(pairKey(p.a, p.b));
    const next = RANKS[c.bonds[pairKey(p.a, p.b)].rank];
    if (next === 'S' && isConfession(p)) { await confession(c, p); continue; }
    await banner(`支援会話　${castName(p.a)} × ${castName(p.b)}　${next}`, 1100);
    markSeen(supKey(p.a, p.b, next)); playedLog.push(supKey(p.a, p.b, next));
    await playSupport(p, next);
    const r = rankUp(c.bonds, p);
    save();
    if (r) {
      audio.jingle('support');
      if (fast()) await banner(`${castName(p.a)}と${castName(p.b)}の支援ランクが ${r} になった！`, 1300);
      else await showcase({ kind: 'sup', sub: `支援ランクが ${r} になった`, main: `${castName(p.a)}と${castName(p.b)}`, pics: [picOf(p.a, 'smile'), picOf(p.b, 'smile')] }, 1700);
    }
  }
}
/** Plays a support conversation: the screenplay's when written (its own music and background), else data.ts, else a placeholder. */
async function playSupport(p: SupportPair, rank: string) {
  const sc = supportScene(p, rank as 'C');
  sceneMusic(sc?.bgm, supportTrack(p));
  await play(sc ? sc.lines : placeholderTalk(p), { bg: sc?.bg });
}
/**
 * 告白（world.md §5.1）：ルーデウス×候補の支援が S に届いた章のクリア後。「応える」→ S・結婚確定（最大3人）。
 * 「応えられない」→ A のまま、次の章のクリア後にもう一度。
 */
async function confession(c: Camp, p: SupportPair) {
  const id = p.a === 'rudeus' ? p.b : p.a, sc = confessionScene(id);
  await banner(`告白　${castName(id)}`, 1100);
  playedLog.push(`confess.${id}`); markSeen(`confess.${id}`);
  sceneMusic(sc?.bgm, 'romance');
  const k = await play(sc?.lines ?? [{ who: '', text: `${castName(id)}から、想いを告げられた。（この告白の場面は制作中です）` }],
    { bg: sc?.bg, choice: sc?.choice ?? { options: ['応える', '応えられない'], branches: [[], []] } });
  const accept = k === 0;
  answerConfession(c.bonds, p, accept, c.cleared);
  if (accept) markSeen(wedKey(id, c.cleared)); // ふたりの時間の解放に使う
  save();
  if (accept) {
    audio.jingle('support');
    if (fast()) await banner(`${castName(id)}と結婚の約束を交わした！（${marriedTo(c.bonds).length} / ${sLimit('rudeus')}人）`, 1600);
    else await showcase({ kind: 'wed', sub: `告白成立　${marriedTo(c.bonds).length} / ${sLimit('rudeus')}人`, main: `${castName(id)}と結ばれた`, note: '結婚の約束を交わした', pics: [picOf('rudeus', 'smile'), picOf(id, 'dere')] }, 2400);
  }
  else await banner(`返事は保留した。次の章のあとで、もう一度向き合おう。`, 1400);
}

// ---------- the ending (plot.md §3) ----------
/** Test log: the ending's parts in the order they played. */
const endingLog: string[] = [];
/**
 * Epilogue → the 7 afterwords (married or companion version) → closing → staff roll → title.
 * first = right after clearing the last chapter (marks the story as finished); otherwise a replay from the 記録.
 */
async function playEnding(first: boolean, replayContext?: EndingCtx) {
  const ctx = replayContext ?? (camp && { married: marriedTo(camp.bonds), bonds: camp.bonds, out: camp.roster.filter(u => u.out && CANDIDATES.includes(u.id)).map(u => u.id) });
  if (!ctx) return;
  const completedCamp = first ? camp : null;
  const endingId = completedCamp && (completedCamp.endingId ??= newEndingId());
  if (completedCamp) save();
  for (const part of endingSequence(ctx)) {
    endingLog.push(part.id);
    if (part.id.startsWith('after.')) await banner(`後日談　${part.title.replace(/^後日談　/, '').replace(/（.*$/, '')}`, 900);
    cueBgm(part.bgm);
    await play(part.lines, { bg: part.bg });
    if (completedCamp) { markSeen(part.id); save(); }
  }
  await credits();
  if (completedCamp && endingId) {
    // Save the linking ID and viewed scenes before the clear record, then mark the camp finished.
    if (!save() || !recordClear(completedCamp, endingId, ctx)) {
      showTitle('クリア記録を保存できませんでした。');
      return;
    }
    completedCamp.ended = true;
    save();
    showTitle('クリアおめでとう！　「つづきから」で章間に戻り、記録から結末を見返せる。「はじめから」で引き継いで始められる。');
  }
}
/** Re-create the last clear's ending in the gallery; a completed camp retains its full state. */
function replayEnding(lastRun?: ClearRun) {
  if (camp?.ended) return playEnding(false);
  const branches = lastRun?.endingBranches;
  const bonds: Bonds = Object.fromEntries((branches?.sPairs ?? []).map(k => [k, { rank: 4, pts: 0 }]));
  return playEnding(false, { married: lastRun?.married ?? [], bonds, out: branches?.out ?? [] });
}
/** スタッフロール風の締め：名前が下から流れる。タップで飛ばせる。 */
function credits(): Promise<void> {
  return new Promise(done => {
    const el = $('credits'), roll = $('creditsRoll');
    const cast = Object.values(CAST).map(c => c.name);
    const sec = (h: string, items: string[]) => `<section><h3>${esc(h)}</h3>${items.map(t => `<p>${esc(t)}</p>`).join('')}</section>`;
    roll.innerHTML = `<h2>フィットア奪還戦記</h2>${sec('登場人物', cast)}${sec('そして', ['ロッタ', 'ハンナ', 'トト', 'ベルト', 'ナナホシ', 'オルステッド', 'ウォルド'])}
      ${sec('原作', ['『無職転生 〜異世界行ったら本気だす〜』（理不尽な孫の手）', 'この作品は個人で遊ぶための非公式ファンゲームです'])}${sec('', ['遊んでくれて、ありがとう'])}<p class="fin">― 終 ―</p>`;
    audio.bgm('ending');
    el.hidden = false; roll.classList.remove('go'); void roll.offsetWidth; roll.classList.add('go');
    let t = 0;
    const finish = () => { clearTimeout(t); el.hidden = true; el.onclick = null; roll.classList.remove('go'); done(); };
    el.onclick = finish;
    t = window.setTimeout(finish, fast() ? 0 : 26000);
  });
}

// ---------- between chapters ----------
type CampTab = 'units' | 'shop' | 'bonds' | 'tent' | 'log';
let campTab: CampTab = 'units';
const esc = (t: string) => t.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
const MTYPE_NAMES = { foot: '歩兵', armor: '重装', horse: '騎馬', beast: '獣', fly: '飛行' } as const;
const gainText = (g: Partial<Stats>) => STAT_KEYS.filter(k => g[k]).map(k => `${STAT_NAMES[k]}+${g[k]}`).join(' ');
function campMsg(t: string) { $('campMsg').textContent = t; }
const pendingFinale = () => !!camp && !camp.ended && !!chapterDef(camp.cleared - 1)?.ending;
function showCamp(msg = '') {
  if (!camp) return;
  hideTutorial();
  mode = 'busy'; campTab = 'units';
  prep = null; $('campTabs').hidden = false; $('campBtns').hidden = false;
  $('campTitle').innerHTML = `章間　難民キャンプ<small>（${DIFFICULTY_NAMES[camp.difficulty]}・${levelName(camp.hard)}）</small>`; // 狭い画面では括弧ごと次の行へ
  campMsg(msg);
  const has = hasChapter(camp.next);
  const nb = $<HTMLButtonElement>('btnNext');
  nb.disabled = !has && !pendingFinale(); nb.textContent = pendingFinale() ? '結末へ進む' : has ? '次の章へ' : camp.ended ? '物語は完結した' : `第${camp.next + 1}章は制作中です`;
  $('title').hidden = true; $('camp').hidden = false;
  audio.bgm('camp');
  renderCamp();
}
/** 結婚相手の一行（キャンプ画面の見出しの下）。 */
function renderWed() {
  const w = camp ? marriedTo(camp.bonds) : [];
  const e = $('campWed');
  e.hidden = !w.length;
  e.innerHTML = w.length ? `<span>結婚</span>${w.map(id => `${faceHtml({ id, name: castName(id), cls: CAST[id]?.cls ?? '', team: 'blue' }, 'pair')}<b>${esc(castName(id))}</b>`).join('')}` : '';
}
/** キャンプの日々・wife talks・ふたりの時間 watchable now and not yet watched (the 天幕 tab shows a mark). */
const unreadWife = () => (camp ? [...availableDailies(), ...wifeTalksAvailable(marriedTo(camp.bonds), camp.cleared), ...availableDates()].filter(w => !seen.includes(w.id)) : []);
/** キャンプの日々 watchable now (design/script-camp.md). */
const availableDailies = (): DailyTalk[] => (camp ? dailyTalksAvailable(camp.roster, camp.cleared) : []);
/** Plays a camp talk; present = the ids in the roster now (skipAbsent scenes drop the lines of absent members). */
async function playDaily(d: DailyTalk, present?: string[]) {
  sceneMusic(d.scene.bgm, 'daily');
  await play(dailyLines(d, present), { bg: d.scene.bg });
}
/** ふたりの時間 watchable now. A partner married before the confession date was recorded counts from this camp. */
function availableDates(): DateTalk[] {
  if (!camp) return [];
  const wed = marriedTo(camp.bonds), at = wedChapters(seen);
  for (const id of wed) if (at[id] === undefined) markSeen(wedKey(id, camp.cleared));
  return dateTalksAvailable(wed, camp.cleared, seen, !!camp.ended);
}
async function playDate(d: DateTalk) {
  sceneMusic(d.scene.bgm, 'romance');
  await play(d.scene.lines, { bg: d.scene.bg });
}
function renderCamp() {
  for (const b of document.querySelectorAll<HTMLButtonElement>('#campTabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === campTab));
  const tent = document.querySelector<HTMLButtonElement>('#campTabs button[data-tab="tent"]')!;
  tent.classList.toggle('unread', unreadWife().length > 0);
  renderWed();
  $('campGold').hidden = false;
  $('campGold').innerHTML = `所持金 <b>${camp!.gold}</b> 銀`;
  $('campBody').innerHTML = '';
  if (campTab === 'shop') renderShop({ camp: camp!, body: $('campBody'), save, msg: campMsg, refresh: renderCamp, face: (u, cls) => faceHtml(u, cls) });
  else if (campTab === 'units') renderUnits(); else if (campTab === 'bonds') renderBonds(); else if (campTab === 'tent') renderTent(); else renderLog();
}
function el(tag: string, cls: string, html = '') { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; }
function btn(label: string, fn: () => void, cls = '', disabled = false) {
  const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.disabled = disabled; b.onclick = fn; return b;
}
/** 控えで経験値を得た仲間の一行（直前の章の分）。 */
function benchNote(u: Unit) {
  const g = camp?.bench?.find(b => b.id === u.id);
  return g ? `<div class="benchUp">控えで経験値 +${g.exp}${g.lv > g.fromLv ? `　<b>Lv ${g.fromLv} → ${g.lv}</b>` : ''}</div>` : '';
}
function unitCard(u: Unit) {
  const c = CLASSES[u.cls];
  const st = STAT_KEYS.map(k => `<div><span>${STAT_NAMES[k]}</span>${u.st[k]}</div>`).join('');
  const card = el('div', 'card' + (u.out ? ' out' : ''), `<div class="uhead"><b class="blue">${esc(u.name)}</b><span>${c.name}${tierOf(u.cls) === 2 ? '（上級職）' : ''}　Lv ${u.lv}　EXP ${u.exp}　移動 ${c.mov}</span>${u.out ? '<em class="outTag">戦線離脱（療養中）・出撃不可</em>' : ''}</div>
    <div class="stats">${st}</div><div class="wps">使える武器種：${c.wtypes.map(t => WTYPE_NAMES[t]).join('・')}</div>${skillLine(u)}${benchNote(u)}`);
  const head = card.querySelector('.uhead')!, face = faceHtml(u, 'card' + (u.out ? ' out' : ''));
  if (face) head.insertAdjacentHTML('afterbegin', face);
  else { const icon = document.createElement('canvas'); icon.width = icon.height = 112; icon.className = 'uicon' + (u.out ? ' out' : ''); drawIcon(icon, u); head.prepend(icon); }
  return card;
}
function renderUnits() {
  const body = $('campBody');
  for (const u of camp!.roster) {
    const card = unitCard(u), opts = promoOptions(u);
    card.appendChild(invBlock(u, () => { save(); renderCamp(); }));
    if (opts.length) {
      const ok = opts.some(o => o.ok);
      card.appendChild(btn(ok ? 'クラスチェンジ' : 'クラスチェンジ（Lv10から）', () => renderPromo(u), ok ? 'primary' : '', !ok));
    }
    body.appendChild(card);
  }
}
function renderPromo(u: Unit) {
  const body = $('campBody'); body.innerHTML = '';
  body.appendChild(el('p', 'hint', `${esc(u.name)}（${CLASSES[u.cls].name} Lv ${u.lv}）の上級職を選んでください。クラスチェンジするとLvは1に戻り、能力が上がります。`));
  for (const o of promoOptions(u)) {
    const c = CLASSES[o.to];
    const newTypes = c.wtypes.filter(t => !CLASSES[u.cls].wtypes.includes(t));
    const card = el('div', 'card', `<div class="uhead"><b>${c.name}</b><span>移動 ${c.mov}（${MTYPE_NAMES[c.mtype]}）　武器種 ${c.wtypes.map(t => WTYPE_NAMES[t]).join('・')}</span></div>
      <p class="pdesc">${c.desc ?? ''}${(c.skills ?? []).filter(k => SKILLS[k] && !(CLASSES[u.cls].skills ?? []).includes(k)).map(k => `<br>新スキル「${SKILLS[k].name}」：${SKILLS[k].desc}`).join('')}</p><p class="pgain">${gainText(c.bonus ?? {})}${c.crit ? `　必殺+${c.crit}` : ''}${newTypes.length ? `　新たに ${newTypes.map(t => WTYPE_NAMES[t]).join('・')} を使える` : ''}${c.gift && !u.wps.some(w => WEAPONS[w].type === WEAPONS[c.gift!].type) ? (u.wps.length < WEAPON_SLOTS ? `（${WEAPONS[c.gift].name}を入手）` : `（武器枠がいっぱいのため${WEAPONS[c.gift].name}はもらえない）`) : ''}</p>`);
    card.appendChild(btn(o.ok ? `${c.name}にする` : '条件を満たしていない', () => confirmPromo(u, o.to), o.ok ? 'primary' : '', !o.ok));
    body.appendChild(card);
  }
  body.appendChild(btn('もどる', renderCamp));
}
function confirmPromo(u: Unit, to: string) {
  const body = $('campBody'); body.innerHTML = '';
  body.appendChild(el('div', 'card', `<p>${esc(u.name)}を<b class="gold">${CLASSES[to].name}</b>にクラスチェンジします。Lvは1に戻ります。よろしいですか？</p>`));
  const row = el('div', 'row');
  row.appendChild(btn('はい', async () => {
    const r = promote(u, to);
    if (!r) return renderCamp();
    save(); audio.jingle('classchange');
    await showcase({ kind: 'cc', sub: 'クラスチェンジ', main: `${u.name}は ${CLASSES[to].name} になった`, note: gainText(r.gains), pics: [picOf(idForUnit(u), 'smile')] }, 2200);
    campMsg(`${u.name}は${CLASSES[to].name}になった！　${gainText(r.gains)}${r.gift ? `　${WEAPONS[r.gift].name}を手に入れた` : ''}`);
    renderCamp();
  }, 'primary'));
  row.appendChild(btn('いいえ', () => renderPromo(u)));
  body.appendChild(row);
}
function renderBonds() {
  const body = $('campBody'), c = camp!, ids = new Set(c.roster.map(u => u.id));
  const b = SUPPORT_BONUS;
  body.appendChild(el('p', 'hint', `隣で一緒に戦うと絆が深まる。支援相手が2マス以内にいると、ランクに応じて命中・回避・必殺が上がる（C 命中/回避+${b.C.hit}　B +${b.B.hit}　A +${b.A.hit}　S +${b.S.hit}・ダメージ+${b.S.dmg}）。`));
  const wed = marriedTo(c.bonds);
  body.appendChild(el('p', 'hint', `ルーデウスの結婚：${wed.length} / ${sLimit('rudeus')}人${wed.length ? `（${wed.map(castName).join('、')}）` : ''}　支援がSに届くと章クリア後に告白が起きる。ほかの仲間の恋愛（S）は1人まで。`));
  const pairs = SUPPORTS.filter(p => ids.has(p.a) && ids.has(p.b));
  if (!pairs.length) body.appendChild(el('p', 'hint', '支援できる組はまだいない。'));
  for (const p of pairs) body.appendChild(bondRow(p, c.bonds));
}
function bondRow(p: SupportPair, bonds: Bonds) {
  const bd = bonds[pairKey(p.a, p.b)], need = nextNeed(p, bd), st = bondStatus(bonds, p, camp?.cleared);
  const wed = isConfession(p) && bd.rank >= 4;
  const prev = bd.rank > 0 ? RANK_PTS[RANKS[bd.rank - 1]] : 0;
  const pct = need === null ? 100 : Math.max(0, Math.min(100, 100 * (bd.pts - prev) / Math.max(1, need - prev)));
  const out = camp?.roster.some(u => u.out && (u.id === p.a || u.id === p.b));
  const label = (st === 'ready' ? (bd.rank === 3 && isConfession(p) ? '告白待ち（章クリア後）' : '会話待ち（章クリア後）') : st === 'deferred' ? '告白の返事を保留中（次の章のクリア後にもう一度）'
    : st === 'sBlocked' ? 'S枠なし' : wed ? '結婚' : need === null ? '最大ランク' : `${bd.pts} / ${need}`) + (out && st !== 'ready' ? '　療養中（絆は増えない）' : '');
  const pf = (id: string) => faceHtml({ id, name: castName(id), cls: CAST[id]?.cls ?? '', team: 'blue' }, 'pair');
  return el('div', 'card bond', `<div class="bhead"><span class="bpair">${pf(p.a)}${pf(p.b)}</span><span class="bnames">${castName(p.a)} × ${castName(p.b)}${p.tag ? `<small>（${p.tag}）</small>` : ''}</span><b class="rank">${rankName(bd.rank)}${wed ? '<small class="wedTag">結婚</small>' : ''}</b></div>
    <div class="hp"><div class="bar"><i style="width:${pct}%;background:var(--rose)"></i></div><span>${label}</span></div>
    <div class="wps">上限 ${p.max}${p.max === 'S' ? '（恋愛）' : ''}　次：${bd.rank < maxRank(p) ? RANKS[bd.rank] : '—'}</div>`);
}

/** 天幕の節の開閉（描き直しても保つ。初めは未読のある節と「キャンプの日々」を開く）。 */
const tentOpen: Record<string, boolean> = {};
/**
 * 天幕：キャンプの日々（design/script-camp.md）・ふたりの時間（script-romance.md）・嫁同士の会話（world.md §5.2）・
 * 食卓と贈り物（ui/tent-ui.ts）を節に分けて並べる。節の見出しに未読の数。
 */
function renderTent() {
  const body = $('campBody'), c = camp!, wed = marriedTo(c.bonds);
  const section = (key: string, title: string, unread: number, note = '') => {
    const d = document.createElement('details'); d.className = 'galSec tentSec'; d.dataset.sec = key;
    d.open = tentOpen[key] ?? (unread > 0 || key === 'daily');
    d.innerHTML = `<summary>${esc(title)}${unread ? `<b class="unreadN">未読 ${unread}</b>` : ''}<small>${esc(note)}</small></summary>`;
    d.addEventListener('toggle', () => { tentOpen[key] = d.open; });
    body.appendChild(d); return d;
  };
  const item = (unread: boolean, label: string, go: () => Promise<unknown>, id: string) =>
    btn(`${unread ? '● ' : ''}${label}`, () => replay(async () => { markSeen(id); playedLog.push(id); save(); await go(); }).then(renderCamp), 'logItem' + (unread ? ' unread' : ''));
  // キャンプの日々：章の進み具合と、そのときいる仲間で解放される掛け合い。
  const dailies = availableDailies(), present = c.roster.filter(u => !u.out).map(u => u.id);
  const s1 = section('daily', 'キャンプの日々', dailies.filter(d => !seen.includes(d.id)).length, `${dailies.length} / ${DAILY_TALKS.length}`), l1 = el('div', 'logList');
  l1.appendChild(el('p', 'hint', '天幕のまわりの、にぎやかな毎日。章が進み、仲間が増えると新しい話が見られる。'));
  for (const d of dailies) l1.appendChild(item(!seen.includes(d.id), `${d.no}「${d.scene.title}」　${d.members.filter(m => m !== 'rudeus' && present.includes(m)).slice(0, 4).map(castName).join('・')}${d.members.length > 5 ? 'ほか' : ''}`, () => playDaily(d, present), d.id));
  s1.appendChild(l1);
  // ふたりの時間：結ばれた相手との短い場面。章が進むと続きが解放される。
  const dates = availableDates();
  const s2 = section('date', 'ふたりの時間', dates.filter(d => !seen.includes(d.id)).length), l2 = el('div', 'logList');
  l2.appendChild(el('p', 'hint', wed.length ? `結ばれた相手と過ごす、章の合間のひととき。${wed.map(id => {
    const all = DATE_TALKS.filter(d => d.who === id), got = all.filter(d => seen.includes(d.id)).length;
    return `${castName(id)} ${got}/${all.length}`;
  }).join('　')}（続きは章が進むと見られる）` : '告白に応えた相手と、ここで二人の時間を過ごせる。'));
  for (const d of dates) l2.appendChild(item(!seen.includes(d.id), `${castName(d.who)}　${d.no}「${d.scene.title}」`, () => playDate(d), d.id));
  s2.appendChild(l2);
  // 嫁どうしの会話
  const list = wifeTalksAvailable(wed, c.cleared);
  const s3 = section('wife', '嫁どうしの会話', list.filter(w => !seen.includes(w.id)).length), l3 = el('div', 'logList');
  l3.appendChild(el('p', 'hint', wed.length >= 2 ? '天幕の奥から、にぎやかな声が聞こえる。結婚した相手どうしの会話を見られる。' : `結婚した相手が2人以上になると、ここで嫁どうしの会話を見られる（いまは${wed.length}人）。`));
  for (const w of list) l3.appendChild(item(!seen.includes(w.id), `${w.scene.title}　（${w.common ? wed.map(castName).join('・') : w.members.map(castName).join(' × ')}）`, async () => {
    sceneMusic(w.scene.bgm, 'daily');
    await play(wifeLines(w, wed), { bg: w.scene.bg });
  }, w.id));
  if (wed.length >= 2 && !list.length) l3.appendChild(el('p', 'hint', 'いまは見られる会話がない。'));
  s3.appendChild(l3);
  // 食卓・贈り物・稽古
  const t = c.tent ?? {}, left = (t.meal ? 0 : 1) + Math.max(0, GIFT_PER_CAMP - (t.gifts?.length ?? 0));
  const s4 = section('care', '食卓・贈り物', 0, left ? '' : 'この章間はおしまい'), l4 = el('div', 'logList tentCare');
  renderTentCare({
    camp: c, body: l4, save, msg: campMsg, refresh: renderCamp, face: (u, cls) => faceHtml(u, cls),
    talk: (lines, bg, bgm) => replay(async () => { audio.bgm(bgm); await play(lines, { bg }); }),
    learn: id => markSeen(`like:${id}`), knows: id => seen.includes(`like:${id}`),
  });
  s4.appendChild(l4);
}
/** 記録: every story scene and support talk watched so far, in story order; tap one to watch it again. */
function renderLog() {
  const body = $('campBody'), clear = loadClear(), all = !!clear;
  // 見たもの：この周回の seen と、クリア記録に残った過去の周回の分。クリア後はすべて解放。
  const known = new Set([...seen, ...(clear?.seen ?? [])]), has = (k: string) => all || known.has(k);
  body.appendChild(el('p', 'hint', all ? 'クリアしたので、すべての会話・背景・曲を見られる。' : 'これまでに見た会話・背景・曲を、もう一度見られる。まだ見ていないものは「？？？」。'));
  const lock = () => { const b = btn('？？？', () => {}, 'logItem locked'); b.disabled = true; return b; };
  const section = (title: string, n: number, total: number, open = false) => {
    const d = document.createElement('details'); d.className = 'galSec'; d.open = open;
    d.innerHTML = `<summary>${esc(title)}<small>${n} / ${total}</small></summary>`;
    body.appendChild(d); return d;
  };
  // 本編（後日談・エピローグは結婚の組み合わせで変わるので、まとめて「結末」から見る）
  const story = SCENE_ORDER.filter(id => !/\.battle\d+$/.test(id) && !/^(after\.|epilogue\.|frag:)/.test(id));
  const sec1 = section('本編の会話', story.filter(has).length, story.length, !galleryMode), list = el('div', 'logList');
  let part = -1;
  for (const id of story) {
    const sc = SCENES[id];
    if (sc.chapter !== part) { part = sc.chapter; list.appendChild(el('h3', 'prepHead', esc(sc.chapter === 0 ? '序章' : sc.chapter === 11 ? '告白' : CHAPTERS[sc.chapter - 1]?.title.replace(/\s+/g, '　') ?? `第${sc.chapter}章`))); }
    list.appendChild(has(id) ? btn(sc.title.replace(/^第\d+章　/, ''), () => replay(async () => { await playScene(id); }), 'logItem') : lock());
  }
  const lastRun = clear?.runs[clear.runs.length - 1], lastWed = lastRun?.married ?? [];
  if (camp?.ended || all) {
    list.appendChild(el('h3', 'prepHead', '結末'));
    list.appendChild(btn('エピローグと後日談、スタッフロール', () => replay(() => replayEnding(lastRun)), 'logItem'));
  }
  sec1.appendChild(list);
  // 支援会話（組ごと・ランクごと）
  const supKeys = SUPPORTS.flatMap(p => (['C', 'B', 'A', ...(p.max === 'S' ? ['S'] : [])] as string[]).map(r => ({ p, r, k: supKey(p.a, p.b, r) })));
  const sec2 = section('支援会話', supKeys.filter(s => has(s.k)).length, supKeys.length), l2 = el('div', 'logList');
  for (const { p, r, k } of supKeys) l2.appendChild(has(k) ? btn(`${castName(p.a)} × ${castName(p.b)}　${r}`, () => replay(() => playSupport(p, r)), 'logItem') : lock());
  sec2.appendChild(l2);
  // ふたりの時間・嫁どうしの会話
  const sec3 = section('ふたりの時間', DATE_TALKS.filter(d => has(d.id)).length, DATE_TALKS.length), l3 = el('div', 'logList');
  for (const d of DATE_TALKS) l3.appendChild(has(d.id) ? btn(`${castName(d.who)}　${d.no}「${d.scene.title}」`, () => replay(() => playDate(d)), 'logItem') : lock());
  sec3.appendChild(l3);
  const sec4 = section('嫁どうしの会話', WIFE_TALKS.filter(w => has(w.id)).length, WIFE_TALKS.length), l4 = el('div', 'logList');
  const wedNow = (w: WifeTalk) => [...new Set([...(camp ? marriedTo(camp.bonds) : lastWed), ...w.members])];
  for (const w of WIFE_TALKS) l4.appendChild(has(w.id) ? btn(w.scene.title, () => replay(async () => { sceneMusic(w.scene.bgm, 'daily'); await play(wifeLines(w, wedNow(w)), { bg: w.scene.bg }); }), 'logItem') : lock());
  sec4.appendChild(l4);
  // キャンプの日々（離脱した仲間の行は、いまの名簿で飛ばす）
  const secD = section('キャンプの日々', DAILY_TALKS.filter(d => has(d.id)).length, DAILY_TALKS.length), lD = el('div', 'logList');
  const presentNow = camp ? camp.roster.filter(u => !u.out).map(u => u.id) : undefined;
  for (const d of DAILY_TALKS) lD.appendChild(has(d.id) ? btn(`${d.no}「${d.scene.title}」`, () => replay(() => playDaily(d, presentNow)), 'logItem') : lock());
  secD.appendChild(lD);
  // 一枚絵と背景
  const pics = [...Object.keys(EVENT_ART).map(n => ({ k: `cg:${n}`, n, cg: true })), ...Object.keys(BG_ART).filter(n => n !== 'title').map(n => ({ k: `bg:${n}`, n, cg: false }))];
  const sec5 = section('一枚絵と背景', pics.filter(p => has(p.k)).length, pics.length), grid = el('div', 'bgGrid');
  for (const p of pics) {
    const url = p.cg ? EVENT_ART[p.n] : BG_ART[p.n], label = p.cg ? '一枚絵' : bgLabel(p.n);
    const b = document.createElement('button'); b.type = 'button';
    if (has(p.k)) {
      b.innerHTML = `<img loading="lazy" src="${esc(url)}" alt=""><small>${esc(label)}</small>`;
      b.onclick = () => replay(async () => { await play(p.cg ? [{ who: '', text: '', cg: p.n }, { who: '', text: '（思い出の一場面）' }] : [{ who: '', text: `（${label}）` }], p.cg ? {} : { bg: p.n }); });
    } else { b.innerHTML = '<span class="lockBox">？？？</span><small>　</small>'; b.disabled = true; }
    grid.appendChild(b);
  }
  sec5.appendChild(grid);
  // 曲（タップで流す）
  const tracks = [...new Set([...SONG_NAMES, ...Object.keys(BGM_FILES)])].filter(n => !JINGLES.includes(n));
  const sec6 = section('曲', tracks.filter(n => has(`bgm:${n}`)).length, tracks.length), l6 = el('div', 'logList');
  const back = galleryMode ? 'title' : 'camp';
  const mark = () => { for (const b of l6.querySelectorAll<HTMLButtonElement>('button[data-track]')) b.classList.toggle('playing', b.dataset.track === audio.current); };
  for (const n of tracks) {
    if (!has(`bgm:${n}`)) { l6.appendChild(lock()); continue; }
    const b = btn(`♪ ${TRACK_NAMES[n] ?? n}`, () => { audio.bgm(audio.current === n ? back : n); mark(); }, 'logItem');
    b.dataset.track = n; l6.appendChild(b);
  }
  l6.appendChild(btn('もとの曲にもどす', () => { audio.bgm(back); mark(); }));
  mark();
  sec6.appendChild(l6);
}
/** 曲名（鑑賞の「曲」）。 */
const TRACK_NAMES: Record<string, string> = {
  title: 'フィットアの空', prologue: '転移事件', map_dawn: '夜明けの進軍', map_resolve: '決意の行軍', map_final: '最後の戦場', map_enemy: '敵軍の影',
  boss: '強敵', final_boss: '使徒', orsted: '龍神', crisis: '迫る危機', camp: '難民キャンプ', daily: 'いつもの日々', comedy: 'にぎやかなひととき',
  sad: '喪失', resolve: '決意', mystery: '謎', family: '家族', romance: 'ふたりの時間', ending: '本気で生きる',
};
/** A background's name for 鑑賞: the title of the first scene that uses it. */
function bgLabel(name: string) {
  for (const id of SCENE_ORDER) {
    const sc = SCENES[id];
    if (sc?.bg === name) return (sc.chapter >= 1 && sc.chapter <= 10 && !/^第\d+章/.test(sc.title) ? `第${sc.chapter}章　` : '') + sc.title;
  }
  const t = [...DAILY_TALKS, ...DATE_TALKS, ...WIFE_TALKS].find(w => w.scene.bg === name);
  return t ? t.scene.title : name;
}
let galleryMode = false;
/** 鑑賞 from the title: the 記録 page on its own (no camp tabs), with a way back. */
function showGallery() {
  galleryMode = true; hideTutorial();
  $('title').hidden = true; $('camp').hidden = false;
  $('campTabs').hidden = true; $('campBtns').hidden = true; $('campGold').hidden = true; $('campWed').hidden = true;
  $('campTitle').textContent = '鑑賞'; campMsg('');
  const body = $('campBody'); body.innerHTML = '';
  body.appendChild(btn('タイトルへもどる', () => { galleryMode = false; $('campTabs').hidden = false; $('campBtns').hidden = false; showTitle(); }));
  renderLog();
  $('camp').scrollTop = 0;
}
let replaying = false;
async function replay(go: () => Promise<unknown>) {
  if (replaying) return;
  const screen = $('camp'), scroll = screen.scrollTop, wasInert = screen.inert;
  const focus = document.activeElement;
  replaying = true;
  screen.inert = true;
  try {
    await go();
  } finally {
    replaying = false;
    screen.inert = wasInert;
    screen.scrollTop = scroll;
    if (focus instanceof HTMLElement && screen.contains(focus)) focus.focus({ preventScroll: true });
    audio.bgm(galleryMode ? 'title' : 'camp');
  }
}

// ---------- sortie preparation ----------
/** The sortie screen's state: which chapter, its plan, and the ids picked for the free slots. */
let prep: { index: number; plan: SortiePlan; picks: string[] } | null = null;
/** 「次の章へ」: opens the sortie screen when there is a choice to make, otherwise starts right away. */
async function goNext() {
  if (camp && pendingFinale()) {
    $<HTMLButtonElement>('btnNext').disabled = true;
    $('camp').hidden = true;
    if (!camp.endingId) {
      const ch = chapterDef(camp.cleared - 1);
      await playScene(ch.outro);
      if (ch.interlude) await playScene(ch.interlude);
      await supportTalks(camp);
    }
    await playEnding(true);
    return;
  }
  if (!camp || !hasChapter(camp.next)) return;
  const plan = sortiePlan(camp.next, camp.roster);
  if (!plan.choose) { start(newChapter(camp.next, camp.roster, camp.bonds, camp.difficulty, undefined, !!camp.hard), true); return; }
  prep = { index: camp.next, plan, picks: [...plan.picks] };
  campMsg('');
  renderPrep();
}
/** 出撃するパウロ（三流派の心得を持つ者）。固定・選んだ仲間の中から。 */
function schoolUnit(plan: SortiePlan, picks: string[]): Unit | null {
  return [...plan.fixed.map(f => f.unit), ...plan.pool.filter(u => picks.includes(u.id))].find(u => hasSkill(u, 'threeSchools')) ?? null;
}
/** 三流派の心得：流派を1つ選ぶ欄（選んだものは Camp.school に残り、名簿のパウロにも付く）。 */
function schoolPicker(u: Unit) {
  const cur = camp!.school ?? u.school ?? CHARS[u.id]?.school ?? SCHOOLS[0];
  const box = el('div', 'schoolPick', `<h3 class="prepHead">${esc(u.name)}の流派（${SKILLS.threeSchools.name}）</h3>`);
  for (const k of SCHOOLS) {
    const b = document.createElement('button');
    b.className = 'pick school'; b.dataset.school = k; b.setAttribute('aria-pressed', String(k === cur));
    b.innerHTML = `<span class="pname"><b>${SKILLS[k].name}</b></span><small>${SKILLS[k].desc}</small><em>${k === cur ? '装備' : ''}</em>`;
    b.onclick = () => { camp!.school = k; for (const r of camp!.roster) if (hasSkill(r, 'threeSchools')) r.school = k; save(); renderPrep(); };
    box.appendChild(b);
  }
  return box;
}
const shortStats = (u: Unit) => (['hp', 'str', 'mag', 'spd', 'def'] as const).map(k => `${STAT_NAMES[k]}${u.st[k]}`).join(' ');
function renderPrep() {
  const p = prep!, c = camp!, plan = p.plan;
  const fixedN = plan.fixed.filter(f => !f.guest).length, n = fixedN + p.picks.length;
  $('campTabs').hidden = true; $('campBtns').hidden = true; $('campGold').hidden = true;
  $('campTitle').textContent = `出撃準備　${chapterDef(p.index).title.replace(/\s+/g, '　')}`;
  const body = $('campBody'); body.innerHTML = '';
  body.appendChild(el('p', 'hint', `出撃できるのは${plan.cap}人まで。必ず出撃する仲間は固定で、残り${plan.free}枠を名簿から選ぶ。`));
  body.appendChild(el('p', 'prepCount', `出撃 <b>${n}</b> / ${plan.cap}`));
  body.appendChild(el('h3', 'prepHead', '必ず出撃'));
  for (const f of plan.fixed) {
    const tag = f.guest ? 'ゲスト（護衛対象）' : f.recruit ? '新たに加入' : '固定';
    body.appendChild(el('div', 'pick fixed', `<span class="pname">${faceHtml(f.unit, 'pick')}<b>${esc(f.unit.name)}</b><span>${CLASSES[f.unit.cls].name}　Lv ${f.unit.lv}</span></span><small>${shortStats(f.unit)}</small><em>${tag}</em>`));
  }
  for (const u of plan.fixedOut) body.appendChild(el('div', 'pick fixed out', `<span class="pname"><b>${esc(u.name)}</b><span>${CLASSES[u.cls].name}　Lv ${u.lv}</span></span><small>戦線離脱（療養中）</small><em>出撃不可</em>`));
  body.appendChild(el('h3', 'prepHead', `出撃メンバーを選ぶ（残り${plan.free}枠）`));
  for (const u of plan.pool) {
    const on = p.picks.includes(u.id);
    const b = document.createElement('button');
    b.className = 'pick' + (u.out ? ' out' : '');
    b.setAttribute('aria-pressed', String(on)); b.disabled = !!u.out; b.dataset.id = u.id;
    b.innerHTML = `<span class="pname">${faceHtml(u, 'pick' + (u.out ? ' out' : ''))}<b>${esc(u.name)}</b><span>${CLASSES[u.cls].name}　Lv ${u.lv}</span></span><small>${u.out ? '戦線離脱（療養中）' : shortStats(u)}</small><em>${u.out ? '出撃不可' : on ? '出撃' : '待機'}</em>`;
    b.onclick = () => {
      if (on) p.picks = p.picks.filter(id => id !== u.id);
      else if (p.picks.length >= plan.free) { campMsg('出撃枠がいっぱいです。先にだれかを待機にしてください。'); return; }
      else p.picks = [...p.picks, u.id];
      campMsg('');
      renderPrep();
    };
    body.appendChild(b);
  }
  const su = schoolUnit(plan, p.picks);
  void su; // 三流派の心得は選択式をやめた（三つとも控えめに効く）
  const row = el('div', 'row prepBtns');
  row.appendChild(btn(`この${n}人で出撃する`, () => { const picks = p.picks; prep = null; start(newChapter(p.index, c.roster, c.bonds, c.difficulty, picks, !!c.hard), true); }, 'primary', !p.picks.length && plan.free > 0));
  row.appendChild(btn('章間にもどる', () => showCamp()));
  body.appendChild(row);
}

// ---------- boot ----------
/** Title screen. `panel` picks the button group: main (はじめから/つづきから), difficulty choice, or defeat. */
function showTitle(msg = '', panel: 'main' | 'diff' | 'defeat' = 'main') {
  hideTutorial();
  $('titleMsg').textContent = msg;
  const saved = load(), clear = loadClear();
  $('btnLoad').hidden = !saved;
  // クリア記録（最新の周回）と鑑賞
  const ci = $('clearInfo'), last = clear?.runs[clear.runs.length - 1];
  ci.hidden = !last || panel === 'defeat';
  if (last) ci.innerHTML = `<b>クリア記録</b>　${clear!.runs.length}回<br>${esc(last.married.length ? `${last.married.map(castName).join('・')}と結ばれた` : 'ひとりで歩んだ')}<br><span>${esc(`${DIFFICULTY_NAMES[last.difficulty]}・${levelName(last.hard)}　${last.turns}ターン　倒れた仲間 ${last.falls}${last.round > 1 ? `　${last.round}周目` : ''}`)}</span>`;
  $('btnGallery').hidden = !clear && !(saved?.seen.length);
  $('carryPick').hidden = $('carryNote').hidden = !clear;
  if (clear) setCarry(pickCarry, clear);
  $('titleMain').hidden = panel !== 'main'; $('diffPick').hidden = panel !== 'diff'; $('defeat').hidden = panel !== 'defeat';
  $('camp').hidden = true;
  $('title').hidden = false;
  audio.bgm(panel === 'defeat' ? 'sad' : 'title');
}
/** Test log: how long each chapter's terrain took to draw (ms). */
const terrainMs: number[] = [];
/**
 * The code-drawn terrain of `map` at `scale` backing pixels per map pixel (RES for the game, less for the guides).
 * 石床 (K) and 岩壁 (Q) are drawn as road and cliff until they get their own tiles (M9).
 */
function drawAutoTerrain(map: string[], scale = RES) {
  const tc = document.createElement('canvas'); tc.width = Math.round(map[0].length * T * scale); tc.height = Math.round(map.length * T * scale);
  const tg = tc.getContext('2d')!; tg.setTransform(scale, 0, 0, scale, 0, 0);
  drawTerrain(tg, map.map(r => r.replace(/K/g, 'R').replace(/Q/g, 'X')));
  return tc;
}
/** How long a painted map may take to load at chapter start before the drawn map is shown (it replaces it later). */
const MAP_ART_WAIT = 2500;
let paintSeq = 0;
function setTerrain(tc: HTMLCanvasElement, painted: boolean) {
  terrain = tc; paintedMap = painted;
  topPad = makeTopPad(tc);
  syncGridBtn();
}
/**
 * Paints the terrain at the canvas's final resolution (RES), so it is as crisp as the figures; at chapter start and
 * after a terrain change. That takes a moment on big maps: say so first, so the screen does not look frozen.
 * A chapter with a painted map (assets/maps/chNN, listed in MAP_ART) uses the picture, stretched over the whole map,
 * with the tiles changed since the chapter began (柵・崩落・城門) drawn by code on top. Until the picture has loaded
 * (or if it fails), the drawn map is used, and the picture takes its place when it arrives.
 */
async function paintTerrain() {
  const seq = ++paintSeq, url = mapArtUrl(S.chapter + 1);
  const b = $('banner'); b.textContent = '地図を描いています'; b.hidden = false;
  await new Promise<void>(r => requestAnimationFrame(() => setTimeout(r, 0)));
  const t0 = performance.now();
  const loading = url ? loadMapArt(url) : null;
  const img = loading ? await Promise.race([loading, new Promise<null>(r => setTimeout(() => r(null), MAP_ART_WAIT))]) : null;
  if (seq !== paintSeq) return; // a newer paint (another chapter, another change) took over
  const changed = changedTiles(chapterDef(S.chapter).map, S.map);
  const auto = img && !changed.length ? null : drawAutoTerrain(S.map);
  terrainMs.push(Math.round(performance.now() - t0));
  b.hidden = true;
  setTerrain(img ? paintedLayer(img, cols(), rows(), RES, auto, changed) : auto!, !!img);
  if (loading && !img) void loading.then(late => { if (late && seq === paintSeq && auto) setTerrain(paintedLayer(late, cols(), rows(), RES, auto, changed), true); });
}
/** Shows the 格子 button's state (pressed = grid shown). */
function syncGridBtn() {
  const g = $('gridBtn'); if (!g) return;
  g.setAttribute('aria-pressed', String(gridOn()));
  g.setAttribute('aria-label', gridOn() ? 'マス目の線を消す' : 'マス目の線を表示する');
}
async function start(state: State, intro: boolean) {
  S = withSchool(state); mode = 'busy'; inspect = sel = picked = null; inBattle = true; engaged.clear();
  $('camp').hidden = true; $('title').hidden = true;
  // The terrain is painted at the canvas's final resolution (RES), so it is as crisp as the figures. That takes
  // a moment on big maps: say so first, so the screen does not look frozen.
  terrain = null; topPad = null; hud(); menu([]);
  info('<p class="hint">地図を描いています……</p>');
  await paintTerrain();
  // Scrolling maps take over touch drags on the canvas; maps that fit keep the page's normal touch behaviour.
  cv.style.touchAction = scrolls() ? 'none' : 'manipulation';
  drag = null; cam.x = 0; cam.y = -cameraTopPad;
  const lead = S.units.find(u => u.id === 'rudeus' && u.hp > 0) ?? alive(S, 'blue')[0];
  if (lead) centerOn(lead.x, lead.y); else clampCam();
  $('title').hidden = true; hud(); info(''); menu([]);
  preloadChapterArt();
  if (intro) {
    const [no, ...rest] = chapterDef(S.chapter).title.split(/\s+/);
    await showcase(rest.length ? { kind: 'chapter', sub: no, main: rest.join('　') } : { kind: 'chapter', main: no }, 2000);
    await playScene(chapterDef(S.chapter).intro);
  }
  save();
  mapMusic(); audio.sfx(S.phase === 'blue' ? 'phaseBlue' : 'phaseRed');
  await banner(S.phase === 'blue' ? '自軍フェイズ' : '敵軍フェイズ');
  await turnTalks();
  idle();
  // 新しく始めた第1章の最初だけ、操作の説明（会話と自軍フェイズの帯が済んでから。一度見たら出さない）。
  if (intro && S.chapter === 0 && S.turn === 1 && !camp && !fast() && !tutorialDone()) startTutorial();
}
setOnCg(name => markSeen(`cg:${name}`));
setOnBg(name => { if (BG_ART[name]) markSeen(`bg:${name}`); }); // 鑑賞の背景（絵のあるものだけ）
audio.onPlay = name => { if (!JINGLES.includes(name)) markSeen(`bgm:${name}`); }; // 鑑賞の曲
// タイトル画面の背景（届いていなければ従来の夜空のグラデーション）。
if (BG_ART.title) $('title').style.backgroundImage = `linear-gradient(to bottom, rgba(10, 9, 16, .35), rgba(10, 9, 16, .55) 55%, rgba(10, 9, 16, .9)), url("${BG_ART.title}")`;
/** Development: a party of every cast member with stats (at their joining level), for test chapters and chapters written out of order. */
function devRoster(): Unit[] {
  return Object.keys(CAST).map(id => makeUnit(id)).filter((u): u is Unit => !!u);
}
/** Development: starts chapter `index` (a test chapter 90 / 91, or any written story slot) with the dev roster. */
function devStart(index: number, difficulty: Difficulty = 'casual', hard = !!camp?.hard) {
  if (!hasChapter(index)) return false;
  const roster = camp?.roster?.length ? camp.roster : devRoster();
  const bonds = initBonds(camp?.bonds);
  camp = { next: index, cleared: Math.max(1, index), roster, bonds, difficulty, gold: camp?.gold ?? 0, ...(camp?.ended ? { ended: true } : {}), ...(hard ? { hard: true } : {}) };
  void start(newChapter(index, roster, bonds, difficulty, undefined, hard), true);
  return true;
}
// Sound: starts on the first tap (autoplay rules); every button gives a short click.
audio.attach();
mountAudioUi();
mountHelp();
const mobileMap = mountMobileMap(fitMapViewport);
document.addEventListener('click', e => {
  const b = (e.target as HTMLElement | null)?.closest?.('button');
  if (!b || b.disabled || b.closest('#menu') && mode === 'busy') return;
  const t = b.textContent ?? '';
  audio.sfx(/もどる|キャンセル|選択解除|いいえ|閉じる|タイトルへ|章間にもどる/.test(t) ? 'cancel' : b.classList.contains('primary') || b.classList.contains('diff') ? 'decide' : 'button');
}, true);
$('btnNew').onclick = () => { setLevel(false); showTitle('難易度を選んでください。', 'diff'); };
/** 新規ゲームの敵の強さ（ふつう／むずかしい）。倒れた仲間の扱い（カジュアル／クラシック）のボタンで始まる。 */
let pickHard = false;
function setLevel(hard: boolean) {
  pickHard = hard;
  for (const b of document.querySelectorAll<HTMLButtonElement>('#levelPick button')) b.setAttribute('aria-pressed', String((b.dataset.level === 'hard') === hard));
  $('levelNote').textContent = hard ? '敵の能力が上がる（HP・攻撃・守備など。ボスは控えめ）。敵の数と配置は同じ。' : '標準の敵の強さ。';
}
for (const b of document.querySelectorAll<HTMLButtonElement>('#levelPick button')) b.onclick = () => setLevel(b.dataset.level === 'hard');
for (const b of document.querySelectorAll<HTMLButtonElement>('#diffPick button[data-diff]')) {
  b.onclick = async () => {
    // 引き継ぎ：見た会話は記録に残し、所持金の半分と倉庫の品は第1章のクリアで章間へ（レベル・支援ランクは引き継がない）
    const clear = pickCarry ? loadClear() : null;
    camp = null; seen = clear ? [...clear.seen] : [];
    $('title').hidden = true;
    const ch = chapterDef(0);
    if (ch.prologue) await playScene(ch.prologue); // 序章：戦闘のない会話パート
    const st = newChapter(0, undefined, undefined, b.dataset.diff as Difficulty, undefined, pickHard);
    start(clear ? applyCarry(st, clear) : st, true);
  };
}
$('btnDiffBack').onclick = () => showTitle();
for (const b of document.querySelectorAll<HTMLButtonElement>('#carryPick button')) b.onclick = () => { const cd = loadClear(); if (cd) setCarry(b.dataset.carry === '1', cd); };
$('btnGallery').onclick = () => showGallery();
$('btnLoad').onclick = () => {
  const d = load();
  if (!d) return;
  camp = d.camp; seen = d.seen; inBattle = !!d.battle;
  if (d.battle) { d.battle.phase = 'blue'; start(d.battle, false); } else if (camp) { $('title').hidden = true; showCamp(); }
};
$('btnRetryPhase').onclick = () => { const d = load(); if (d?.battle) { camp = d.camp; seen = d.seen; d.battle.phase = 'blue'; start(d.battle, false); } };
$('btnRetryChapter').onclick = () => start(chapterStart(), false);
$('btnDefeatTitle').onclick = () => showTitle();
$('btnDefeatCamp').onclick = () => retreat();
/** Next chapter: carries the roster (with classic losses), bonds and difficulty. */
$('btnNext').onclick = goNext;
$('btnToTitle').onclick = () => showTitle();
for (const b of document.querySelectorAll<HTMLButtonElement>('#campTabs button')) b.onclick = () => { campTab = b.dataset.tab as CampTab; campMsg(''); renderCamp(); };
$('gridBtn').onclick = () => {
  gridPref[paintedMap ? 'painted' : 'auto'] = !gridOn();
  try { localStorage.setItem(GRID_KEY, JSON.stringify(gridPref)); } catch { /* storage unavailable: lasts for this visit */ }
  syncGridBtn();
};
syncGridBtn();
/** 速度の切り替え（ふつう／はやい）。押すたびに入れ替わり、端末に保存する。 */
function syncSpeedBtn() {
  const b = $('speedBtn');
  b.textContent = speedFast ? '▶▶ はやい' : '▶ ふつう';
  b.setAttribute('aria-pressed', String(speedFast));
  b.setAttribute('aria-label', `演出の速さ：${speedFast ? 'はやい' : 'ふつう'}（押すと切り替え）`);
}
$('speedBtn').onclick = () => {
  speedFast = !speedFast;
  try { localStorage.setItem(SPEED_KEY, speedFast ? 'fast' : 'normal'); } catch { /* lasts for this visit */ }
  syncSpeedBtn();
};
syncSpeedBtn();
showTitle();
loadUnitArt();
requestAnimationFrame(render);
(window as any).__game = {
  /** Test helper: the face badge HTML used by the panels. */
  faceHtml,
  get state() { return S; }, get mode() { return mode; }, get stops() { return [...stops]; },
  get camp() { return camp; }, get screen() { return !$('camp').hidden ? 'camp' : !$('title').hidden ? 'title' : 'battle'; },
  /** Test helpers: put a cast member (blue) or a generic enemy (red) on the current map. */
  spawn(id: string, x: number, y: number) {
    const u = makeUnit(id); if (!u || !S) return null;
    u.uid = Math.max(...S.units.map(v => v.uid)) + 1; u.x = x; u.y = y; S.units.push(u); return u;
  },
  /** Test helper: what the enemy AI would do with this unit (used by automated play-throughs). */
  plan(u: Unit) { return planEnemy(S, u); },
  spawnEnemy(e: EnemyDef) { if (!S) return null; const u = makeEnemy(e, Math.max(...S.units.map(v => v.uid)) + 1, S.hard ? S.chapter : undefined); S.units.push(u); return u; },
  /** Camera (map pixels of the view's top-left), the view size in tiles, and the enemy-follow log. */
  get cam() { return { ...cam, w: VW / T, h: VH / T, t: T }; }, followLog,
  /** Test helper: the pre-drawn terrain layer (to check that tiles read as their terrain). */
  get terrain() { return terrain; },
  /** Test helpers: whether the current map is a painted one, and whether the grid is shown. */
  get paintedMap() { return paintedMap; }, get grid() { return gridOn(); },
  /**
   * Tool (npm run map-guides): chapter n's code-drawn map at its start, `px` pixels per tile, as a PNG data URL;
   * `marks` adds the grid, terrain letters and names, and hatching on impassable tiles (the check sheet).
   */
  mapGuide(n: number, px = 64, marks = false) {
    const map = chapterDef(n - 1).map, scale = px / T, c = drawAutoTerrain(map, scale);
    if (marks) { const g = c.getContext('2d')!; g.setTransform(scale, 0, 0, scale, 0, 0); drawGuideMarks(g, map); }
    return c.toDataURL('image/png');
  },
  /** Test helper: center the view on a tile right away if it is off screen. */
  reveal(x: number, y: number) { if (S && !inView(x, y, 0)) centerOn(x, y); return { ...cam }; },
  /** Test helper: add a cast member to the camp roster (to try the sortie screen). */
  /** Conversations played so far on this page (scene ids / sup:…), the watched list (記录), terrain draw times. */
  playedLog, get seen() { return [...seen]; }, terrainMs,
  /** Music: the track the game wants now, every change so far (and jingles), and what is actually sounding. */
  get bgm() { return audio.current; }, get bgmLog() { return audio.log; }, audioDebug: () => audio.debug(), audioSource: (n: string) => audio.source(n),
  /** Test helper: show a screenplay scene now (for screenshots). */
  playScene(id: SceneId, battleTalk = false) { return playScene(id, battleTalk); },
  /** Test helper: open the camp on a tab. */
  campTab(t: CampTab) { campTab = t; renderCamp(); },
  addToRoster(id: string, out = false) { const u = makeUnit(id); if (!u || !camp) return null; if (out) u.out = true; camp.roster.push(u); return u; },
  /** Development: start a test chapter (90 = 防衛→制圧, 91 = 耐久→離脱・最終章扱い) or a story chapter by number (1–10). */
  devChapter: (index: number) => devStart(index),
  startChapter: (n: number, hard?: boolean) => devStart(n - 1, 'casual', hard ?? !!camp?.hard),
  /** Development: open the camp with the dev roster (after a fresh page), optionally as if `cleared` chapters were done. */
  devCamp(cleared = 2, gold = 0) { camp = { next: cleared, cleared, roster: devRoster(), bonds: initBonds(), difficulty: 'casual', gold }; showCamp(); return camp; },
  /** Development: set a pair's bond (on the camp, and on the battle state when in a chapter). */
  setBond(a: string, b: string, pts: number, rank: number) {
    for (const bonds of [camp?.bonds, inBattle ? S?.bonds : undefined]) if (bonds) bonds[pairKey(a, b)] = { pts, rank };
  },
  /** Development: run the after-chapter supports / confessions now (camp must exist). */
  supportTalks: () => (camp ? supportTalks(camp) : Promise.resolve()),
  /** Development: play the ending (epilogue, afterwords, staff roll) with the camp's marriages. */
  playEnding: () => playEnding(false),
  /** Development: the ending's parts (ids and lines) for the camp's current marriages. */
  endingParts: () => (camp ? endingSequence({ married: marriedTo(camp.bonds), bonds: camp.bonds, out: camp.roster.filter(u => u.out && CANDIDATES.includes(u.id)).map(u => u.id) }) : []),
  /** Test helper: retreat to the camp the chapter was started from (false when there is none, e.g. chapter 1). */
  retreat: () => { if (!inBattle || !retreatCamp()) return false; retreat(); return true; },
  checkEnd: () => checkEnd(), endTurn: () => endTurn(), finish: (u: Unit) => finish(u), idle: () => idle(),
  /** Test helpers: a full-screen moment, and one battle between two units on the map (for screenshots of the effects). */
  showcase: (o: ShowOpts, ms = 1500) => showcase(o, ms), portrait: (id: string, face?: Parameters<typeof portraitUrl>[1]) => picOf(id, face), battle: (att: Unit, wid: string, def: Unit) => battle(att, wid, def), skillBand: (u: Unit, n: string) => skillBand(u, n),
  /** Logs: stages, ending parts, backgrounds / event pictures shown. */
  stageLog, endingLog, artLog,
  get married() { return camp ? marriedTo(camp.bonds) : []; },
  /** Development: what a support pair's next conversation is (scene title, or null for data.ts / placeholder). */
  supportScene: (a: string, b: string, rank: string) => { const p = SUPPORTS.find(q => pairKey(q.a, q.b) === pairKey(a, b)); return p ? supportScene(p, rank as 'C') : null; },
  sceneById,
  /** Test helpers: show the first-chapter tutorial now / its current step (-1 = hidden); open the help. */
  tutorial: () => startTutorial(), get tutorialStep() { return tutorialStep(); }, help: (id?: string) => openHelp(id),
};
