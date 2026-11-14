// Story assembly with no DOM: which support / confession / wife conversation to play, and the ending sequence
// (epilogue → 7 afterwords, married or companion version → closing) with the screenplay's 差し替え・差し込み applied.
import { CAST, type Line, type SupportPair, type SupportRank } from './data';
import { CANDIDATES, pairKey, type Bonds } from './logic';
import { SCENES, SUPPORT_SCENES, WIFE_TALKS, type Scene, type SceneId, type WifeTalk } from './script/scenes';

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
