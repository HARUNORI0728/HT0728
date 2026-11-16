// Story assembly with no DOM: which support / confession / wife conversation to play, and the ending sequence
// (epilogue → 7 afterwords, married or companion version → closing) with the screenplay's 差し替え・差し込み applied.
import { CAST, type Line, type SupportPair, type SupportRank } from './data';
import { CANDIDATES, addBond, dist, findPair, marriedTo, onMap, pairKey, type Bonds, type State, type Unit } from './logic';
import { GIFT_BOND, MEAL_BOND } from './shop';
import { BATTLE_BARKS, CAMP_LINES, DAILY_TALKS, DATE_TALKS, GIFT_LIKES, SCENES, SUPPORT_SCENES, WIFE_TALKS, type DailyTalk, type DateTalk, type Scene, type SceneId, type WifeTalk } from './script/scenes';

const nameOf = (id: string) => CAST[id]?.name ?? id;
/** A scene by id when the screenplay has it (ids of the ending documents are not checked at compile time). */
export const sceneById = (id: string): Scene | undefined => (SCENES as Record<string, Scene>)[id];

// ---------- support conversations ----------

/**
 * The conversation for a pair's rank: the screenplay's (design/script-supports-*.md, either name order) when it has
 * one, else the lines written in data.ts, else null (the game then shows a short placeholder).
 */
export function supportScene(p: SupportPair, rank: SupportRank): Scene | null {
  const sc = SUPPORT_SCENES[`${pairKey(p.a, p.b)}:${rank}`];
  if (sc) return sc;
  const lines = p.talks[rank];
  return lines?.length ? { title: '', chapter: 0, cond: '', lines } : null;
}
/** Placeholder for a support conversation nobody has written yet. */
export const placeholderTalk = (p: SupportPair): Line[] => [{ who: '', text: `${nameOf(p.a)}と${nameOf(p.b)}は、しばらく語り合った。（この支援会話は制作中です）` }];
/** The confession scene for a candidate (ルーデウス×候補の S), or undefined. */
export const confessionScene = (id: string) => sceneById(`confess.${id}`);

// ---------- wife conversations (world.md §5.2) ----------

/** Wife conversations that can be watched now: both of a pair married, or (common scripts) enough wives and the right chapter. */
export function wifeTalksAvailable(married: string[], cleared: number): WifeTalk[] {
  return WIFE_TALKS.filter(w => (w.common ? married.length >= w.need : w.members.every(m => married.includes(m)))
    && (w.minCleared === undefined || cleared >= w.minCleared) && (w.maxCleared === undefined || cleared <= w.maxCleared));
}
/** A wife conversation's lines: in common scripts, lines of candidates who are not married are dropped. */
export function wifeLines(w: WifeTalk, married: string[]): Line[] {
  if (!w.common) return w.scene.lines;
  const unwed = new Set(CANDIDATES.filter(id => !married.includes(id)).map(nameOf));
  return w.scene.lines.filter(l => !unwed.has(l.who));
}

// ---------- ふたりの時間・戦闘中のひとこと (design/script-romance.md) ----------

/** The seen key that records when Rudeus answered a confession: `wed:<id>:<camp.cleared>`. */
export const wedKey = (id: string, cleared: number) => `wed:${id}:${cleared}`;
/** camp.cleared at the time each partner's confession was answered, read from the seen keys. */
export function wedChapters(seen: string[]): Record<string, number> {
  const at: Record<string, number> = {};
  for (const k of seen) { const m = k.match(/^wed:(\w+):(\d+)$/); if (m && at[m[1]] === undefined) at[m[1]] = Number(m[2]); }
  return at;
}
/**
 * ふたりの時間 that can be watched now: married partners only; afterWed chapters after the confession and from
 * minCleared on; each one after the partner's previous one was watched. After the ending (ended) all of them.
 */
export function dateTalksAvailable(married: string[], cleared: number, seen: string[], ended = false): DateTalk[] {
  const wedAt = wedChapters(seen);
  return DATE_TALKS.filter(d => married.includes(d.who) && (ended
    || (cleared >= (wedAt[d.who] ?? cleared) + d.afterWed && (d.minCleared === undefined || cleared >= d.minCleared)
      && (d.no === 1 || seen.includes(`date.${d.who}.${d.no - 1}`)))));
}
/** A battle line's speakers who are cast members must be on the map (the fallen partner herself always speaks). */
function barkLines(s: State, key: string, speaker: string): Line[] | null {
  const lines = BATTLE_BARKS[key];
  if (!lines) return null;
  return lines.filter(l => {
    const id = Object.keys(CAST).find(k => CAST[k].name === l.who);
    return !id || id === speaker || s.units.some(u => u.team === 'blue' && u.id === id && onMap(u));
  });
}
/**
 * 隣接：a fight by Rudeus or a partner he married while the two stand side by side (once per partner per chapter;
 * the flag `rom:adj:<id>` is set here). null when nothing plays.
 */
export function adjacentBark(s: State, att: Unit, def: Unit): Line[] | null {
  const wed = marriedTo(s.bonds), rud = s.units.find(u => u.team === 'blue' && u.id === 'rudeus' && onMap(u));
  if (!rud || !wed.length) return null;
  const near = (v: Unit) => v.team === 'blue' && wed.includes(v.id) && onMap(v) && dist(v, rud) === 1 && !s.flags[`rom:adj:${v.id}`];
  for (const u of [att, def]) {
    if (u.team !== 'blue' || !onMap(u)) continue;
    const partner = u.id === 'rudeus' ? s.units.find(near) : near(u) ? u : undefined;
    if (!partner) continue;
    s.flags[`rom:adj:${partner.id}`] = true;
    return barkLines(s, `${partner.id}:adj`, partner.id);
  }
  return null;
}
/** 撤退：a partner Rudeus married has fallen. */
export const fallBark = (s: State, u: Unit): Line[] | null => (marriedTo(s.bonds).includes(u.id) ? barkLines(s, `${u.id}:fall`, u.id) : null);

// ---------- 天幕：キャンプの日々・食卓・贈り物 (design/script-camp.md) ----------

type Member = { id: string; out?: boolean };
/**
 * キャンプの日々 that can be watched now: from minCleared on, with every speaking member in the roster and not fallen
 * (classic). skipAbsent scenes only need the chapter; the lines of absent members are dropped (dailyLines).
 */
export function dailyTalksAvailable(roster: Member[], cleared: number): DailyTalk[] {
  const here = new Set(roster.filter(u => !u.out).map(u => u.id));
  return DAILY_TALKS.filter(d => cleared >= d.minCleared && (d.skipAbsent || d.members.every(m => here.has(m))));
}
/** A camp talk's lines; for skipAbsent scenes, lines of members not in `present` are dropped (absent = all lines kept). */
export function dailyLines(d: DailyTalk, present?: string[]): Line[] {
  if (!d.skipAbsent || !present) return d.scene.lines;
  const gone = new Set(d.members.filter(m => !present.includes(m)).map(nameOf));
  return d.scene.lines.filter(l => !gone.has(l.who));
}
const pick = <T>(xs: T[], rnd: () => number): T | undefined => xs[Math.floor(rnd() * xs.length)];
/** Support pairs among the given ids (each pair once). */
const pairsAmong = (ids: string[]) => ids.flatMap((a, i) => ids.slice(i + 1).map(b => findPair(a, b)).filter((p): p is NonNullable<typeof p> => !!p));
/**
 * 食卓：Rudeus and `guests` eat together. Every support pair among them gains MEAL_BOND (up to the next rank's threshold).
 * Returns the lines (Hanna's opening, one line from each guest, Rudeus's closing) and the pairs that gained.
 */
export function shareMeal(bonds: Bonds, guests: string[], rnd = Math.random): { lines: Line[]; gained: { a: string; b: string; added: number }[] } {
  const one = (k: string) => { const l = pick(CAMP_LINES[k] ?? [], rnd); return l ? [l] : []; };
  const lines = [...one('meal:ハンナ'), ...guests.flatMap(id => one(`meal:${id}`)), ...one('meal:rudeus')];
  const gained = pairsAmong(['rudeus', ...guests]).map(p => ({ a: p.a, b: p.b, added: addBond(bonds, p, MEAL_BOND) })).filter(g => g.added > 0);
  return { lines, gained };
}
/** The support pair a gift to `id` deepens: Rudeus × id, or (no such pair) id's pair with the fewest points among `present`. */
export function giftPair(bonds: Bonds, id: string, present: string[]) {
  const own = findPair('rudeus', id);
  if (own) return own;
  return present.filter(o => o !== id).map(o => findPair(id, o)).filter((p): p is NonNullable<typeof p> => !!p)
    .sort((x, y) => (bonds[pairKey(x.a, x.b)]?.pts ?? 0) - (bonds[pairKey(y.a, y.b)]?.pts ?? 0))[0];
}
/** 贈り物：gives `gift` (its name) to `id`. Liked gifts add GIFT_BOND.like, others .plain. Returns the reaction and the gain. */
export function giveGift(bonds: Bonds, id: string, gift: string, present: string[]): { lines: Line[]; like: boolean; pair?: { a: string; b: string }; added: number } {
  const like = GIFT_LIKES[id] === gift;
  const lines = (CAMP_LINES[`gift:${id}:${like ? 'like' : 'plain'}`] ?? [{ who: nameOf(id), text: `${gift}、ありがとう。` }]).map(l => ({ ...l, text: l.text.replace(/\{品\}/g, gift) }));
  const p = giftPair(bonds, id, present);
  const added = p ? addBond(bonds, p, like ? GIFT_BOND.like : GIFT_BOND.plain) : 0;
  return { lines, like, pair: p ? { a: p.a, b: p.b } : undefined, added };
}
/** The gift `id` likes (its name), if any. */
export const likedGift = (id: string): string | undefined => GIFT_LIKES[id];

// ---------- the ending (plot.md §3, script-endings.md) ----------

export interface EndingCtx {
  /** Candidates Rudeus married. */
  married: string[];
  bonds: Bonds;
  /** Candidates who fell on classic (療養中). */
  out: string[];
}
export interface EndingPart { id: string; title: string; bg?: string; bgm?: string; lines: Line[] }
const sRank = (c: EndingCtx, a: string, b: string) => (c.bonds[pairKey(a, b)]?.rank ?? 0) >= 4;
const both = (a: string, b: string) => (c: EndingCtx) => c.married.includes(a) && c.married.includes(b);
/** Rudeus married only this candidate (design/script-romance.md の差し込み・ただひとり). */
const only = (a: string) => (c: EndingCtx) => c.married.length === 1 && c.married[0] === a;
type Op = { replace: [number, number] } | { replaceMatch: RegExp } | 'beforeLast' | 'afterFirst' | 'first';
/**
 * The screenplay's fragments (### 差し替え・… / ### 差し込み・…) and where they go. Text-line positions count only lines
 * with text (cues do not count). Fragments that target the same scene are applied in this order.
 */
const PATCHES: { frag: string; targets: string[]; op: Op; when: (c: EndingCtx) => boolean }[] = [
  { frag: '差し替え・サラ（仲間）', targets: ['after.sara.friend'], op: { replace: [4, 2] }, when: c => sRank(c, 'luke', 'sara') },
  { frag: '差し込み・シルフィエットとエリス', targets: ['after.sylphiette.wed'], op: 'beforeLast', when: both('sylphiette', 'eris') },
  { frag: '差し込み・シルフィエットとロキシー', targets: ['after.roxy.wed'], op: 'beforeLast', when: both('sylphiette', 'roxy') },
  { frag: '差し込み・シルフィエットとアリエル', targets: ['after.ariel.wed'], op: 'beforeLast', when: both('sylphiette', 'ariel') },
  { frag: '差し込み・エリスとロキシー', targets: ['after.eris.wed'], op: 'beforeLast', when: both('eris', 'roxy') },
  { frag: '差し込み・エリスとアリエル', targets: ['after.ariel.wed'], op: 'beforeLast', when: both('eris', 'ariel') },
  { frag: '差し込み・リニアとプルセナ（結婚）', targets: ['after.pursena.wed'], op: 'beforeLast', when: both('linia', 'pursena') },
  { frag: '差し込み・リニアとプルセナ（仲間）', targets: ['after.linia.friend', 'after.pursena.friend'], op: 'afterFirst', when: c => !c.married.includes('linia') && !c.married.includes('pursena') },
  { frag: '差し込み・ただひとり・シルフィエット', targets: ['after.sylphiette.wed'], op: 'afterFirst', when: only('sylphiette') },
  { frag: '差し込み・ただひとり・ロキシー', targets: ['after.roxy.wed'], op: 'afterFirst', when: only('roxy') },
  { frag: '差し込み・ただひとり・エリス', targets: ['after.eris.wed'], op: 'afterFirst', when: only('eris') },
  { frag: '差し込み・ただひとり・サラ', targets: ['after.sara.wed'], op: 'afterFirst', when: only('sara') },
  { frag: '差し込み・ただひとり・リニア', targets: ['after.linia.wed'], op: 'afterFirst', when: only('linia') },
  { frag: '差し込み・ただひとり・プルセナ', targets: ['after.pursena.wed'], op: 'afterFirst', when: only('pursena') },
  { frag: '差し込み・ただひとり・アリエル', targets: ['after.ariel.wed'], op: 'afterFirst', when: only('ariel') },
  { frag: '差し込み・三人の取り決め', targets: ['after.ariel.wed'], op: 'afterFirst', when: c => ['sylphiette', 'eris', 'ariel'].every(id => c.married.includes(id)) },
  { frag: '差し替え・エリナリーゼ', targets: ['epilogue.close'], op: { replaceMatch: /^エリナリーゼは/ }, when: c => sRank(c, 'cliff', 'elinalise') },
  { frag: '差し替え・ルーク', targets: ['epilogue.close'], op: { replaceMatch: /^ルークは/ }, when: c => sRank(c, 'luke', 'sara') },
];
/** Array index of the n-th line with text (or lines.length). */
const textAt = (lines: Line[], n: number) => { let k = -1; for (let i = 0; i < lines.length; i++) if (lines[i].text && ++k === n) return i; return lines.length; };
function applyOp(lines: Line[], frag: Line[], op: Op): Line[] {
  const out = [...lines], words = frag.filter(l => l.text);
  if (op === 'first') out.splice(textAt(out, 0), 0, ...words);
  else if (op === 'afterFirst') out.splice(textAt(out, 0) + 1, 0, ...words);
  else if (op === 'beforeLast') { let i = out.length - 1; while (i > 0 && !out[i].text) i--; out.splice(Math.max(0, i), 0, ...words); }
  else if ('replace' in op) out.splice(textAt(out, op.replace[0]), op.replace[1], ...words);
  else { const i = out.findIndex(l => l.text && op.replaceMatch.test(l.text)); if (i >= 0) out.splice(i, 1, ...words); }
  return out;
}
/** A scene's lines with every fragment whose condition holds applied (and 療養中 for fallen candidates). */
export function patchedLines(id: string, c: EndingCtx): Line[] {
  const sc = sceneById(id);
  if (!sc) return [];
  let lines = sc.lines;
  for (const p of PATCHES) {
    if (!p.targets.includes(id) || !p.when(c)) continue;
    const f = sceneById(`frag:${p.frag}`);
    if (f) lines = applyOp(lines, f.lines, p.op);
  }
  const m = id.match(/^after\.(\w+)\./);
  const rest = sceneById('frag:差し込み・療養中');
  if (m && c.out.includes(m[1]) && rest) lines = applyOp(lines, rest.lines.map(l => ({ ...l, text: l.text.replace(/\{名前\}/g, nameOf(m[1])) })), 'first');
  return lines;
}
/** The ending in play order (plot.md §3.1): epilogue (first half), the 7 afterwords, epilogue (closing). Missing scenes are skipped. */
/** 後日談の順（script-endings.md 注記5）。 */
export const AFTERWORD_ORDER = ['sylphiette', 'roxy', 'eris', 'sara', 'linia', 'pursena', 'ariel'];
export function endingSequence(c: EndingCtx): EndingPart[] {
  const order = [...AFTERWORD_ORDER.filter(id => CANDIDATES.includes(id)), ...CANDIDATES.filter(id => !AFTERWORD_ORDER.includes(id))];
  const ids = ['epilogue.open', ...order.map(id => `after.${id}.${c.married.includes(id) ? 'wed' : 'friend'}`), 'epilogue.close'];
  return ids.flatMap(id => {
    const sc = sceneById(id);
    return sc ? [{ id, title: sc.title, bg: sc.bg, bgm: sc.bgm, lines: patchedLines(id, c) }] : [];
  });
}
export type { SceneId };
