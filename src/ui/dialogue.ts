// The conversation screen: portraits, line box, backgrounds, event pictures and the player's choice.
// Visual-novel layout: the line box at the bottom, up to two portraits standing behind it (left / right).
// The speaker is lit, the listener dimmed. Speakers without a portrait (一般兵, narration) show just a name.
import { CAST, CHARS, type Line } from '../data';
import { drawPortrait } from '../render/units';
import { bgUrl, eventUrl, fallbackGradient, idForName, portraitFailed, portraitUrl, preloadPortrait, preloadWide, type Face } from '../render/art';
import { audio } from '../audio/engine';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fast = () => !!(window as any).__fast;

/** A screenplay music cue: a track name, or 'none' for silence. */
export const cueBgm = (name: string | undefined) => { if (name) audio.bgm(name === 'none' ? null : name); };

type Side = 'left' | 'right';
interface Stand { id: string; face: Face; last: number }
const isFoe = (id: string) => !CHARS[id] && !CAST[id];
/** Unnamed enemy speakers (野盗, 私兵 …): name tag in the enemy colour. */
const FOE_NAME = /野盗|私兵|傭兵|兵士?$/;

export interface PlayOpts {
  /** The monologue look (序章): a dark screen, no portraits, every line centred. */
  mono?: boolean;
  /** Background to start with (assets/backgrounds/<名前>). 'none' or absent = over whatever is behind (the map). */
  bg?: string;
  /** The player's choice after the lines: branches[k] plays after options[k] is picked. */
  choice?: { options: string[]; branches: Line[][] };
}
/** Test log: every background and event picture shown (name, and whether the picture file exists). */
export const artLog: { kind: 'bg' | 'cg'; name: string; file: boolean }[] = [];
/** Called with each event picture shown (the game records it for the 記録). */
export let onCg: (name: string) => void = () => {};
export const setOnCg = (f: (name: string) => void) => { onCg = f; };

/** Shows a background (or none). A missing picture shows a gradient in its place. */
function setBg(name: string | undefined) {
  const d = $('dlg'), el = $('dlgBg'), img = el.querySelector('img')!;
  const on = !!name && name !== 'none';
  d.classList.toggle('hasbg', on);
  el.hidden = !on;
  if (!on) { img.removeAttribute('src'); return; }
  const url = bgUrl(name);
  artLog.push({ kind: 'bg', name: name!, file: !!url });
  el.style.background = fallbackGradient(name!);
  el.dataset.name = name!;
  img.hidden = !url;
  if (url && img.getAttribute('src') !== url) { img.src = url; img.onerror = () => { img.hidden = true; }; }
}
/** Shows an event picture (portraits hidden meanwhile), or hides it (null). */
function setCg(name: string | null) {
  const d = $('dlg'), el = $('dlgCg'), img = el.querySelector('img')!;
  const url = name ? eventUrl(name) : null;
  if (name) { artLog.push({ kind: 'cg', name, file: !!url }); onCg(name); }
  // A picture not delivered yet: the scene goes on as if there were none (portraits stay), rather than an empty frame.
  d.classList.toggle('hascg', !!url);
  el.hidden = !url;
  if (!name || !url) { img.removeAttribute('src'); return; }
  el.style.background = fallbackGradient(name);
  el.dataset.name = name;
  img.hidden = !url;
  if (url) { img.src = url; img.onerror = () => { img.hidden = true; }; }
}

/**
 * Plays a conversation. Resolves with the picked option's index when there is a choice, otherwise -1.
 * The skip button jumps to the choice (when there is one) or ends the conversation.
 */
export function play(lines: Line[], opts: PlayOpts = {}): Promise<number> {
  return new Promise(done => {
    const d = $('dlg'), face = $<HTMLCanvasElement>('dlgFace'), box = $('dlgBox'), name = $('dlgName'), text = $('dlgText'), pick = $('dlgChoice');
    const slot = (s: Side) => d.querySelector<HTMLElement>(`.dlgSlot.${s}`)!;
    const stands: Record<Side, Stand | null> = { left: null, right: null };
    const mono = !!opts.mono;
    let seq = [...lines], chosen = -1;
    d.classList.toggle('mono', mono);
    const all = [...lines, ...(opts.choice?.branches.flat() ?? [])];
    if (!mono) for (const l of all) preloadPortrait(idForName(l.who), l.face ?? 'normal');
    for (const l of all) { if (l.bg) preloadWide(bgUrl(l.bg)); if (l.cg) preloadWide(eventUrl(l.cg)); }
    for (const s of ['left', 'right'] as Side[]) { const e = slot(s); e.className = `dlgSlot ${s} empty`; e.querySelector('img')!.removeAttribute('src'); }
    setBg(mono ? undefined : opts.bg); setCg(null);
    pick.hidden = true; pick.innerHTML = '';
    let i = 0;
    const put = (s: Side, st: Stand) => {
      const e = slot(s), img = e.querySelector('img')!, url = portraitUrl(st.id, st.face)!;
      const entering = stands[s]?.id !== st.id;
      stands[s] = st;
      if (img.getAttribute('src') !== url) img.src = url;
      img.onerror = () => { e.classList.add('empty'); };
      if (entering) { e.classList.add('empty'); void e.offsetWidth; } // restart the slide-in
      e.classList.remove('empty');
    };
    const end = () => {
      d.hidden = true; d.onclick = null; $('dlgSkip').onclick = null; d.classList.remove('mono');
      setBg(undefined); setCg(null); pick.hidden = true; d.classList.remove('choosing');
      done(chosen);
    };
    /** Applies a cue line (music / background / event picture). */
    const cue = (l: Line) => {
      if (l.bgm) cueBgm(l.bgm);
      if (l.bg !== undefined) { setBg(l.bg); setCg(null); }
      if (l.cg) setCg(l.cg);
    };
    const askChoice = () => {
      const c = opts.choice!;
      d.onclick = null;
      pick.innerHTML = '';
      c.options.forEach((label, k) => {
        const b = document.createElement('button'); b.textContent = label; b.className = k === 0 ? 'primary' : '';
        b.onclick = e => {
          e.stopPropagation();
          chosen = k; pick.hidden = true; d.classList.remove('choosing'); seq = seq.concat(c.branches[k]);
          d.onclick = () => { audio.sfx('talk'); show(); };
          show();
        };
        pick.appendChild(b);
      });
      pick.hidden = false; d.classList.add('choosing');
      (pick.querySelector('button') as HTMLButtonElement | null)?.focus({ preventScroll: true });
    };
    const show = () => {
      while (i < seq.length && !seq[i].text) cue(seq[i++]); // cues between lines
      if (i >= seq.length) {
        if (opts.choice && chosen < 0) { askChoice(); return; }
        end(); return;
      }
      const n = i, l = seq[i++], id = mono ? null : idForName(l.who);
      const f: Face = l.face && !portraitFailed(id, l.face) ? l.face : 'normal'; // a missing expression falls back to normal
      let side: Side | null = null;
      if (id && l.art !== false && portraitUrl(id, f) && !portraitFailed(id, f)) { // face "-" in the screenplay: never a portrait
        side = l.pos ?? (stands.left?.id === id ? 'left' : stands.right?.id === id ? 'right' : null);
        if (!side) {
          const pref: Side = isFoe(id) ? 'right' : 'left', other: Side = pref === 'left' ? 'right' : 'left';
          side = !stands[pref] ? pref : !stands[other] ? other : (stands.left!.last <= stands.right!.last ? 'left' : 'right');
        }
        const away: Side = side === 'left' ? 'right' : 'left';
        if (stands[away]?.id === id) { stands[away] = null; slot(away).classList.add('empty'); } // moved sides
        put(side, { id, face: f, last: n });
      }
      for (const s of ['left', 'right'] as Side[]) slot(s).classList.toggle('on', s === side);
      const thought = !!l.who && /^（[\s\S]*）$/.test(l.text);
      box.classList.toggle('narr', !l.who);
      box.classList.toggle('thought', thought);
      box.classList.toggle('foe', (!!id && isFoe(id) && id !== 'lotta') || (!id && FOE_NAME.test(l.who)));
      box.classList.toggle('npc', !!l.who && !id && !FOE_NAME.test(l.who) && !Object.values(CHARS).some(v => v.name === l.who));
      box.dataset.side = side ?? '';
      name.hidden = !l.who || mono; name.textContent = l.who;
      // No portrait drawn (none delivered, or it failed): the old vector face inside the box, for the cast.
      const c = !side && !mono && l.art !== false && !d.classList.contains('hascg') ? Object.values(CHARS).find(v => v.name === l.who) : undefined;
      face.hidden = !c;
      if (c) drawPortrait(face, { ...c, team: 'blue' });
      text.textContent = l.text;
      if (mono) { text.classList.remove('fadein'); void text.offsetWidth; text.classList.add('fadein'); }
      if (fast()) show();
    };
    // Skipping still applies the last music cue and background, so the scene ends where it would have ended;
    // a choice is never skipped.
    $('dlgSkip').onclick = e => {
      e.stopPropagation();
      if (!pick.hidden) return;
      const rest = seq.slice(i);
      cueBgm(rest.filter(l => l.bgm).pop()?.bgm);
      const lastBg = rest.filter(l => l.bg !== undefined).pop();
      if (lastBg) { setBg(lastBg.bg); setCg(null); }
      i = seq.length; show();
    };
    d.hidden = false; d.onclick = () => { audio.sfx('talk'); show(); }; show();
  });
}
