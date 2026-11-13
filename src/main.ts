// Screen, input and turn flow. Rules live in logic.ts.
import { CAST, CHAPTERS, CHARS, CLASSES, RANKS, RANK_PTS, STAT_KEYS, STAT_NAMES, SUPPORTS, SUPPORT_BONUS, WEAPONS, WTYPE_NAMES, type EnemyDef, type Line, type Stats, type SupportPair } from './data';
import {
  DIFFICULTY_NAMES, POTION_HEAL, addExp, alive, bondStatus, canEscape, canSeize, dist, expGain, fight, forecast, gainBonds, goalText, heal, healAmount, healExp, healTargets,
  initBonds, inRange, key, loseCond, makeEnemy, makeUnit, maxRank, newChapter, nextNeed, outcome, pairKey, planEnemy, promote, promoOptions, rankName, rankUp, readyPairs,
  rosterOf, sCount, sLimit, sortiePlan, spawnReinforcements, staves, stopTiles, terrainAt, threatTiles, tierOf, turnsLeft, unitAt, upgradeState, usable, weaponLabel,
  type Bonds, type Difficulty, type SortiePlan, type State, type Unit,
} from './logic';
import { RES, T } from './render/common';
import { FLOAT_LIFE, drawCursor, drawEdgeMarks, drawFloat, drawTile, drawVignette, type Float } from './render/fx';
import { drawTerrain } from './render/terrain';
import { drawIcon, drawPortrait, drawUnit } from './render/units';
import { faceHtml, idForName, idForUnit, loadUnitArt, portraitFailed, portraitUrl, preloadPortrait, spriteUrl, type Face } from './render/art';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const cv = $<HTMLCanvasElement>('cv'), ctx = cv.getContext('2d')!;
const fast = () => !!(window as any).__fast;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, fast() ? 0 : ms));

let S: State;
let terrain: HTMLCanvasElement;
type Mode = 'idle' | 'move' | 'menu' | 'target' | 'heal' | 'busy';
let mode: Mode = 'busy';
let sel: Unit | null = null, picked: Unit | null = null, inspect: Unit | null = null;
let stops = new Set<string>(), threat = new Set<string>();
let origin = { x: 0, y: 0 }, targets: Unit[] = [], curW = '';
const offs = new Map<number, { dx: number; dy: number }>();
const shownHp = new Map<number, number>();
const floats: Float[] = [];

// ---------- camera ----------
// The canvas shows 12×8 tiles; larger maps scroll. `cam` is the top-left of the view in map pixels.
// Figures stand taller than a tile, so the view may scroll TOP_PAD above row 0 to keep the top row's heads on screen.
const cam = { x: 0, y: 0 };
/** The view in map pixels (12×8 tiles). The canvas backing store is RES times larger so sprites stay sharp. */
const VW = 12 * T, VH = 8 * T;
cv.width = VW * RES; cv.height = VH * RES;
const VIEW_W = VW / T, VIEW_H = VH / T;
const TOP_PAD = Math.round(T * 0.45);
const cols = () => S.map[0].length, rows = () => S.map.length;
/** Camera limits in map pixels (a map smaller than the view is centred). */
function camBounds() {
  const maxX = cols() * T - VW, maxY = rows() * T - VH;
  return { minX: maxX < 0 ? maxX / 2 : 0, maxX: maxX < 0 ? maxX / 2 : maxX, minY: maxY < -TOP_PAD ? maxY / 2 : -TOP_PAD, maxY: maxY < -TOP_PAD ? maxY / 2 : maxY };
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
/** Between chapters: the party, its bonds, the difficulty, and which chapter comes next. */
interface Camp { next: number; cleared: number; roster: Unit[]; bonds: Bonds; difficulty: Difficulty }
interface SaveData { v: 3; battle: State | null; camp: Camp | null }
// v3: State gained difficulty / bench / flags, Camp gained difficulty, Unit gained out / guest / left.
const SAVE = 'fittoa-save-v3', SAVE_V2 = 'fittoa-save-v2', SAVE_V1 = 'fittoa-save-v1';
let camp: Camp | null = null, inBattle = false;
function save() {
  const d: SaveData = { v: 3, battle: inBattle ? S : null, camp };
  try { localStorage.setItem(SAVE, JSON.stringify(d)); } catch { /* storage unavailable */ }
}
const validUnit = (u: any): u is Unit => !!u && typeof u.id === 'string' && !!CLASSES[u.cls] && !!u.st && Array.isArray(u.wps) && u.wps.every((w: string) => !!WEAPONS[w]);
const validDiff = (d: unknown): Difficulty => (d === 'classic' ? 'classic' : 'casual');
/** Accepts v3, and v2/v1 shapes (missing fields are filled in). Anything malformed is dropped rather than thrown. */
function normalize(d: any): SaveData | null {
  const b = d?.battle;
  const battle = b && Array.isArray(b.units) && Array.isArray(b.map) && CHAPTERS[b.chapter] && b.units.every(validUnit) ? upgradeState(b as State) : null;
  const c = d?.camp;
  let cp: Camp | null = null;
  if (c && Array.isArray(c.roster) && typeof c.next === 'number' && typeof c.cleared === 'number' && c.cleared >= 1) {
    cp = { next: c.next, cleared: c.cleared, roster: c.roster.filter(validUnit), bonds: initBonds(c.bonds), difficulty: validDiff(c.difficulty) };
  }
  if (battle && cp && !b.difficulty) battle.difficulty = cp.difficulty;
  return battle || cp ? { v: 3, battle, camp: cp } : null;
}
function load(): SaveData | null {
  // Newest first; a corrupt or unreadable entry falls through to the next older one.
  for (const k of [SAVE, SAVE_V2, SAVE_V1]) {
    try {
      const j = localStorage.getItem(k);
      if (!j) continue;
      const d = normalize(k === SAVE_V1 ? { battle: JSON.parse(j), camp: null } : JSON.parse(j)); // v1 held only a mid-chapter State
      if (d) return d;
    } catch { /* corrupt or unavailable */ }
  }
  return null;
}

// ---------- rendering ----------
function render(now = performance.now()) {
  if (S) {
    const W = VW, H = VH, sec = now / 1000;
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.fillStyle = '#14121c'; ctx.fillRect(0, 0, W, H);
    // the terrain was drawn once at chapter start; copy just the visible part (plus the strip above the map)
    const sx = Math.max(0, cam.x), sy = Math.max(0, cam.y);
    const sw = Math.min(W - (sx - cam.x), terrain.width - sx), sh = Math.min(H - (sy - cam.y), terrain.height - sy);
    if (sw > 0 && sh > 0) ctx.drawImage(terrain, sx, sy, sw, sh, sx - cam.x, sy - cam.y, sw, sh);
    if (cam.y < 0 && topPad) ctx.drawImage(topPad, cam.x, 0, W, topPad.height, 0, -cam.y - topPad.height, W, topPad.height);
    ctx.save(); ctx.translate(-cam.x, -cam.y);
    const tile = (k: string, kind: Parameters<typeof drawTile>[1], a = 1) => { const [x, y] = k.split(',').map(Number); drawTile(ctx, kind, x, y, a); };
    if (mode === 'move' || (mode === 'idle' && inspect)) {
      for (const k of threat) if (!stops.has(k)) tile(k, 'attack');
      for (const k of stops) tile(k, 'move');
    }
    const pulse = 0.78 + 0.22 * Math.sin(sec * 5);
    if (mode === 'target') for (const t of targets) tile(key(t.x, t.y), 'target', t === picked ? 1 : pulse);
    if (mode === 'heal') for (const t of targets) tile(key(t.x, t.y), 'heal', t === picked ? 1 : pulse);
    // units, back to front
    const shown = S.units.filter(u => (shownHp.get(u.uid) ?? u.hp) > 0 && !u.left)
      .map(u => { const o = offs.get(u.uid); return { u, px: u.x * T + (o?.dx ?? 0), py: u.y * T + (o?.dy ?? 0) }; })
      .sort((a, b) => a.py - b.py);
    for (const { u, px, py } of shown) drawUnit(ctx, u, px, py, u.done && S.phase === 'blue', (shownHp.get(u.uid) ?? u.hp) / u.st.hp);
    const cur = picked ?? sel ?? inspect;
    if (cur && cur.hp > 0) drawCursor(ctx, cur.x, cur.y, sec);
    for (let i = floats.length - 1; i >= 0; i--) {
      drawFloat(ctx, floats[i]);
      if (--floats[i].t <= 0) floats.splice(i, 1);
    }
    ctx.restore();
    drawVignette(ctx, W, H);
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
function makeTopPad() {
  const h = TOP_PAD, c = document.createElement('canvas'); c.width = terrain.width; c.height = h;
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
async function banner(text: string, ms = 900) { const b = $('banner'); b.textContent = text; b.hidden = false; await sleep(ms); b.hidden = true; }

// ---------- panel ----------
function hud() {
  const ch = CHAPTERS[S.chapter];
  $('chTitle').textContent = ch.title;
  $('turn').innerHTML = `ターン ${S.turn}　<b class="${S.phase}">${S.phase === 'blue' ? '自軍フェイズ' : '敵軍フェイズ'}</b>`;
  const left = turnsLeft(S);
  $('goal').textContent = goalText(ch) + (left !== null ? `　（残り ${left} ターン）` : '');
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
    <div class="stats">${st}</div><div class="wps">${wps}　／　${t.name}（守備+${t.def} 回避+${t.avo}）</div>${u.team === 'blue' ? bondLine(u) : ''}`;
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
    b.onclick = () => { if (mode !== 'busy') fn(); };
    m.appendChild(b);
  }
}

// ---------- dialogue ----------
// Visual-novel layout: the line box at the bottom, up to two portraits standing behind it (left / right).
// The speaker is lit, the listener dimmed. Speakers without a portrait (一般兵, narration) show just a name.
type Side = 'left' | 'right';
interface Stand { id: string; face: Face; last: number }
const isFoe = (id: string) => !CHARS[id] && !CAST[id];
function play(lines: Line[]): Promise<void> {
  return new Promise(done => {
    const d = $('dlg'), face = $<HTMLCanvasElement>('dlgFace'), box = $('dlgBox'), name = $('dlgName');
    const slot = (s: Side) => d.querySelector<HTMLElement>(`.dlgSlot.${s}`)!;
    const stands: Record<Side, Stand | null> = { left: null, right: null };
    for (const l of lines) preloadPortrait(idForName(l.who), l.face ?? 'normal');
    for (const s of ['left', 'right'] as Side[]) { const e = slot(s); e.className = `dlgSlot ${s} empty`; e.querySelector('img')!.removeAttribute('src'); }
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
    const show = () => {
      if (i >= lines.length) { d.hidden = true; d.onclick = null; done(); return; }
      const n = i, l = lines[i++], id = idForName(l.who);
      const f: Face = l.face && !portraitFailed(id, l.face) ? l.face : 'normal'; // a missing expression falls back to normal
      let side: Side | null = null;
      if (id && portraitUrl(id, f) && !portraitFailed(id, f)) {
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
      box.classList.toggle('narr', !l.who);
      box.classList.toggle('foe', !!id && isFoe(id) && id !== 'lotta');
      box.dataset.side = side ?? '';
      name.hidden = !l.who; name.textContent = l.who;
      // No portrait drawn (none delivered, or it failed): the old vector face inside the box, for the cast.
      const c = !side ? Object.values(CHARS).find(v => v.name === l.who) : undefined;
      face.hidden = !c;
      if (c) drawPortrait(face, { ...c, team: 'blue' });
      $('dlgText').textContent = l.text;
      if (fast()) show();
    };
    d.hidden = false; d.onclick = show; show();
  });
}

// ---------- player flow ----------
function idle() {
  mode = 'idle'; sel = picked = null; targets = [];
  if (!inspect) { stops = new Set(); threat = new Set(); }
  hud();
  info(inspect ? unitHtml(inspect) : `<p class="hint">青いユニットをタップして移動先を選ぼう。敵をタップすると移動・攻撃範囲が見られる。${scrolls() ? '地図はドラッグで動かせる。' : ''}</p>`);
  menu([['ターン終了', endTurn]]);
}
function selectUnit(u: Unit) {
  sel = u; inspect = picked = null; origin = { x: u.x, y: u.y };
  void follow([u], 0);
  stops = stopTiles(S, u); threat = threatTiles(S, u, stops); mode = 'move';
  info(unitHtml(u)); menu([['キャンセル', idle]]);
}
function openMenu() {
  const u = sel!; mode = 'menu'; picked = null; targets = [];
  const items: [string, () => void, string?][] = [];
  for (const wid of usable(u)) {
    const ts = alive(S, 'red').filter(t => inRange(WEAPONS[wid], dist(u, t)));
    if (ts.length) items.push([`攻撃：${WEAPONS[wid].name}`, () => chooseTarget(wid, ts), 'primary']);
  }
  for (const sid of staves(u)) {
    const ts = healTargets(S, u, sid);
    if (ts.length) items.push([`杖：${WEAPONS[sid].name}`, () => chooseHeal(sid, ts), 'primary']);
  }
  if (canSeize(S, u)) items.push(['制圧', () => { S.flags.seized = true; finish(u); }, 'primary']);
  if (canEscape(S, u)) items.push(['離脱', () => { u.left = true; finish(u); }]);
  if (u.potions > 0 && u.hp < u.st.hp) items.push([`傷薬（残り${u.potions}）`, () => { u.potions--; u.hp = Math.min(u.st.hp, u.hp + POTION_HEAL); float(u, `+${POTION_HEAL}`, '#8fe0a0'); finish(u); }]);
  items.push(['待機', () => finish(u)]);
  items.push(['もどる', () => { u.x = origin.x; u.y = origin.y; selectUnit(u); }]);
  info(unitHtml(u)); menu(items);
}
function chooseTarget(wid: string, ts: Unit[]) {
  mode = 'target'; curW = wid; targets = ts; picked = null;
  info('<p class="hint">攻撃する相手をタップ。</p>'); menu([['もどる', openMenu]]);
  if (ts.length === 1) pickTarget(ts[0]);
}
function pickTarget(t: Unit) {
  const u = sel!, f = forecast(S, u, curW, t);
  picked = t;
  const row = (k: string, a: string, d: string) => `<div class="n blue">${a}</div><div class="k">${k}</div><div class="n red">${d}</div>`;
  const who = `<div class="n blue fcwho">${faceHtml(u, 'fcface', 'angry')}<span>${u.name}</span></div><div class="k vs">VS</div><div class="n red fcwho">${faceHtml(t, 'fcface')}<span>${t.name}</span></div>`;
  info(`<div class="fc">${who}${row('HP', `${u.hp}`, `${t.hp}`)}
    ${row('威力', f.a.dmg + (f.a.double ? ' ×2' : ''), f.d ? f.d.dmg + (f.d.double ? ' ×2' : '') : '—')}
    ${row('命中', f.a.hit + '%', f.d ? f.d.hit + '%' : '—')}${row('必殺', f.a.crit + '%', f.d ? f.d.crit + '%' : '—')}
    ${row('武器', weaponLabel(u, curW), f.d ? (f.d.w.type === 'fang' ? weaponLabel(t, 'fang') : f.d.w.name) : '反撃不可')}</div>${supRow(f.a.sup.from)}`);
  menu([['戦う', async () => { mode = 'busy'; await battle(u, curW, t); finish(u); }, 'primary'], ['もどる', openMenu]]);
}
function chooseHeal(sid: string, ts: Unit[]) {
  mode = 'heal'; curW = sid; targets = ts; picked = null;
  info('<p class="hint">回復する味方をタップ。</p>'); menu([['もどる', openMenu]]);
  if (ts.length === 1) pickHeal(ts[0]);
}
function pickHeal(t: Unit) {
  const u = sel!, amt = healAmount(u, curW, t);
  picked = t;
  info(`<div class="fc"><div class="n blue fcwho">${faceHtml(u, 'fcface')}<span>${u.name}</span></div><div class="k">杖</div><div class="n blue fcwho">${faceHtml(t, 'fcface')}<span>${t.name}</span></div>
    <div class="n">${WEAPONS[curW].name}</div><div class="k">回復</div><div class="n heal">+${amt}</div>
    <div class="n"></div><div class="k">HP</div><div class="n">${t.hp} → ${t.hp + amt} / ${t.st.hp}</div></div>
    <p class="fcsup heal">経験値 +${healExp(amt)}</p>`);
  menu([['回復する', async () => { mode = 'busy'; await doHeal(u, curW, t); finish(u); }, 'primary'], ['もどる', openMenu]]);
}
async function doHeal(u: Unit, sid: string, t: Unit) {
  const h = heal(u, sid, t);
  float(t, `+${h}`, '#8fe0a0');
  await sleep(450);
  if (u.team === 'blue' && u.gr) {
    const gains = addExp(u, healExp(h));
    if (gains) await banner(`${u.name} レベルアップ！ Lv ${u.lv}　` + (gainText(gains) || '成長なし'), 1700);
  }
}
function supRow(from: { name: string; rank: string }[]) {
  return from.length ? `<p class="fcsup">支援：${from.map(f => `${f.name} ${f.rank}`).join('、')}</p>` : '';
}
async function finish(u: Unit) {
  mode = 'busy'; u.done = true; sel = picked = inspect = null; targets = [];
  if (await checkEnd()) return;
  if (alive(S, 'blue').every(b => b.done)) { mode = 'idle'; endTurn(); } else idle();
}

// Drag to scroll (maps larger than the screen only). A press that moves less than DRAG_PX stays a tap.
// On scrolling maps a tap is taken from pointerup (the browser's own click after it is ignored), because
// browsers may drop the synthesized click once a touch gesture has scrolled. 15×10 maps keep using click.
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
    if (u) { stops = u.ai === 'guard' ? new Set([key(u.x, u.y)]) : stopTiles(S, u); threat = threatTiles(S, u, stops); }
    idle();
    if (!u) { const t = terrainAt(S, tx, ty); info(`<p class="hint">${t.name}　守備+${t.def}　回避+${t.avo}${t.heal ? '　ターン開始時にHP回復' : ''}${t.note ? '　' + t.note : ''}</p>`); }
  } else if (mode === 'move') {
    if (!stops.has(key(tx, ty))) return idle();
    mode = 'busy'; await tween(sel!, tx, ty); openMenu();
  } else if (mode === 'menu') {
    if (u && u.team === 'red') { const wid = usable(sel!).find(w => inRange(WEAPONS[w], dist(sel!, u))); if (wid) { chooseTarget(wid, alive(S, 'red').filter(t => inRange(WEAPONS[wid], dist(sel!, t)))); pickTarget(u); } }
    if (u && u.team === 'blue') { const sid = staves(sel!).find(w => healTargets(S, sel!, w).includes(u)); if (sid) { chooseHeal(sid, healTargets(S, sel!, sid)); pickHeal(u); } }
  } else if (mode === 'target') {
    if (u && targets.includes(u)) pickTarget(u); else openMenu();
  } else if (mode === 'heal') {
    if (u && targets.includes(u)) pickHeal(u); else openMenu();
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
  if (fast()) return;
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
  await sleep(crit ? 720 : 560);
  el.hidden = true; el.classList.remove('go');
}
/** Loads the portraits this chapter's fights and talks will use, so the first cut-in does not pop in late. */
function preloadChapterArt() {
  for (const u of S.units) { const id = idForUnit(u); if (id) { preloadPortrait(id); preloadPortrait(id, 'angry'); } }
}
async function battle(att: Unit, wid: string, def: Unit) {
  shownHp.set(att.uid, att.hp); shownHp.set(def.uid, def.hp);
  const strikes = fight(S, att, wid, def);
  await cutin(att, def);
  for (const k of strikes) {
    if (k.crit && k.hit) await cutin(k.from, k.to, true);
    const dx = Math.sign(k.to.x - k.from.x) * T / 4, dy = Math.sign(k.to.y - k.from.y) * T / 4;
    offs.set(k.from.uid, { dx, dy }); await sleep(110); offs.delete(k.from.uid);
    float(k.to, k.hit ? (k.crit ? `必殺！${k.dmg}` : `${k.dmg}`) : 'ミス', k.hit ? (k.crit ? '#ffe36a' : '#ffffff') : '#a79fb8');
    shownHp.set(k.to.uid, (shownHp.get(k.to.uid) ?? 0) - k.dmg);
    await sleep(420);
  }
  shownHp.clear();
  for (const g of gainBonds(S, [att, def])) float(g.partner, g.ready ? '支援会話あり' : `絆+${g.added}`, '#ff8fa8');
  const fallen = [att, def].find(u => u.team === 'blue' && u.hp <= 0);
  if (fallen && !fallen.guest && !loseCond(CHAPTERS[S.chapter]).units.includes(fallen.id)) {
    await banner(S.difficulty === 'classic' ? `${fallen.name}は重傷を負い、戦線離脱した` : `${fallen.name}は重傷を負い、撤退した（次の章で復帰）`, 1500);
  }
  const me = att.team === 'blue' ? att : def, foe = me === att ? def : att;
  if (me.hp > 0 && me.gr) {
    const gains = addExp(me, expGain(me, foe, strikes));
    if (gains) await banner(`${me.name} レベルアップ！ Lv ${me.lv}　` + (Object.keys(gains).map(k => STAT_NAMES[k as keyof typeof STAT_NAMES] + '+1').join(' ') || '成長なし'), 1700);
  }
  await sleep(120);
}

async function checkEnd(): Promise<boolean> {
  const o = outcome(S);
  if (!o) return false;
  mode = 'busy'; hud();
  if (o === 'win') {
    await banner('勝利！', 1300);
    await play(CHAPTERS[S.chapter].outro);
    camp = { next: S.chapter + 1, cleared: S.chapter + 1, roster: rosterOf(S), bonds: S.bonds, difficulty: S.difficulty };
    inBattle = false; save();
    await supportTalks(camp);
    const lost = camp.roster.filter(u => u.out && !S.bench.some(b => b.id === u.id)).map(u => u.name);
    showCamp(CHAPTERS[camp.cleared - 1].title.replace(/\s+/g, '　') + '　クリア！' + (lost.length ? `　${lost.join('、')}は戦線離脱した。` : ''));
  } else {
    await banner('敗北……', 1500);
    showDefeat();
  }
  return true;
}
/** The state at the start of the current chapter (from the camp, or a new game for chapter 1). */
const chapterStart = () => newChapter(S.chapter, camp?.next === S.chapter ? camp.roster : undefined, camp?.next === S.chapter ? camp.bonds : undefined, S.difficulty);
function showDefeat() {
  const classic = S.difficulty === 'classic';
  if (classic) { const st = S; S = chapterStart(); save(); S = st; } // クラシック：中断データも章の最初に戻す
  showTitle(classic ? '仲間が倒れてしまった。章の最初からやり直そう。' : '仲間が倒れてしまった。どこからやり直す？', 'defeat');
  $('btnRetryPhase').hidden = classic;
}

// ---------- phases ----------
function fortHeal(team: 'blue' | 'red') {
  for (const u of alive(S, team)) if (terrainAt(S, u.x, u.y).heal && u.hp < u.st.hp) { const h = Math.min(u.st.hp - u.hp, Math.ceil(u.st.hp * 0.2)); u.hp += h; float(u, `+${h}`, '#8fe0a0'); }
}
async function endTurn() {
  if (mode === 'busy') return;
  mode = 'busy'; sel = picked = inspect = null; stops = new Set(); threat = new Set(); menu([]);
  const camBefore = { ...cam };
  S.phase = 'red'; hud(); info('<p class="hint">敵軍が行動中……</p>');
  await banner('敵軍フェイズ');
  fortHeal('red');
  const actors = alive(S, 'red'); // reinforcements appear now but do not act this phase
  const rf = spawnReinforcements(S);
  if (rf.length) { await follow(rf.slice(0, 1)); for (const u of rf) float(u, '増援', '#ff9a8f'); await banner('敵の増援が現れた！'); }
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
    await tween(e, p.x, p.y);
    if (p.heal && p.wid) await doHeal(e, p.wid, p.heal);
    else if (p.potion) { e.potions--; const h = Math.min(e.st.hp - e.hp, POTION_HEAL); e.hp += h; float(e, `+${h}`, '#8fe0a0'); await sleep(450); }
    else if (p.target && p.wid) { await battle(e, p.wid, p.target); if (await checkEnd()) return; }
    await sleep(140);
  }
  S.phase = 'blue'; S.turn++;
  for (const u of S.units) u.done = false;
  if (await checkEnd()) return; // survive / defend: the last enemy phase is over
  if (scrolls()) await panTo(camBefore.x, camBefore.y); // back to where the player was looking
  fortHeal('blue'); save(); hud();
  await banner('自軍フェイズ');
  idle();
}

// ---------- support conversations ----------
const castName = (id: string) => CAST[id]?.name ?? id;
/** Plays every support conversation that is ready (one rank per pair), confirming each rank. */
async function supportTalks(c: Camp) {
  const seen = new Set<string>();
  for (;;) {
    const p = readyPairs(c.bonds).find(q => !seen.has(pairKey(q.a, q.b)));
    if (!p) break;
    seen.add(pairKey(p.a, p.b));
    const next = RANKS[c.bonds[pairKey(p.a, p.b)].rank];
    await banner(`支援会話　${castName(p.a)} × ${castName(p.b)}　${next}`, 1100);
    const lines = p.talks[next];
    await play(lines?.length ? lines : [{ who: '', text: `${castName(p.a)}と${castName(p.b)}は、しばらく語り合った。（この支援会話は制作中です）` }]);
    const r = rankUp(c.bonds, p);
    save();
    if (r) await banner(`${castName(p.a)}と${castName(p.b)}の支援ランクが ${r} になった！`, 1300);
  }
}

// ---------- between chapters ----------
let campTab: 'units' | 'bonds' = 'units';
const esc = (t: string) => t.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
const MTYPE_NAMES = { foot: '歩兵', armor: '重装', horse: '騎馬', fly: '飛行' } as const;
const gainText = (g: Partial<Stats>) => STAT_KEYS.filter(k => g[k]).map(k => `${STAT_NAMES[k]}+${g[k]}`).join(' ');
function campMsg(t: string) { $('campMsg').textContent = t; }
function showCamp(msg = '') {
  if (!camp) return;
  mode = 'busy'; campTab = 'units';
  prep = null; $('campTabs').hidden = false; $('campBtns').hidden = false;
  $('campTitle').textContent = `章間　難民キャンプ（${DIFFICULTY_NAMES[camp.difficulty]}）`;
  campMsg(msg);
  const has = !!CHAPTERS[camp.next];
  const nb = $<HTMLButtonElement>('btnNext');
  nb.disabled = !has; nb.textContent = has ? '次の章へ' : `第${camp.next + 1}章は制作中です`;
  $('title').hidden = true; $('camp').hidden = false;
  renderCamp();
}
function renderCamp() {
  for (const b of document.querySelectorAll<HTMLButtonElement>('#campTabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === campTab));
  $('campBody').innerHTML = '';
  if (campTab === 'units') renderUnits(); else renderBonds();
}
function el(tag: string, cls: string, html = '') { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; }
function btn(label: string, fn: () => void, cls = '', disabled = false) {
  const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.disabled = disabled; b.onclick = fn; return b;
}
function unitCard(u: Unit) {
  const c = CLASSES[u.cls];
  const st = STAT_KEYS.map(k => `<div><span>${STAT_NAMES[k]}</span>${u.st[k]}</div>`).join('');
  const wps = wpsText(u, false);
  const card = el('div', 'card' + (u.out ? ' out' : ''), `<div class="uhead"><b class="blue">${esc(u.name)}</b><span>${c.name}${tierOf(u.cls) === 2 ? '（上級職）' : ''}　Lv ${u.lv}　EXP ${u.exp}　移動 ${c.mov}</span>${u.out ? '<em class="outTag">戦線離脱（療養中）・出撃不可</em>' : ''}</div>
    <div class="stats">${st}</div><div class="wps">武器：${wps}　／　使える武器種：${c.wtypes.map(t => WTYPE_NAMES[t]).join('・')}</div>`);
  const head = card.querySelector('.uhead')!, face = faceHtml(u, 'card' + (u.out ? ' out' : ''));
  if (face) head.insertAdjacentHTML('afterbegin', face);
  else { const icon = document.createElement('canvas'); icon.width = icon.height = 112; icon.className = 'uicon' + (u.out ? ' out' : ''); drawIcon(icon, u); head.prepend(icon); }
  return card;
}
function renderUnits() {
  const body = $('campBody');
  for (const u of camp!.roster) {
    const card = unitCard(u), opts = promoOptions(u);
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
      <p class="pdesc">${c.desc ?? ''}</p><p class="pgain">${gainText(c.bonus ?? {})}${c.crit ? `　必殺+${c.crit}` : ''}${newTypes.length ? `　新たに ${newTypes.map(t => WTYPE_NAMES[t]).join('・')} を使える` : ''}${c.gift && !u.wps.some(w => WEAPONS[w].type === WEAPONS[c.gift!].type) ? `（${WEAPONS[c.gift].name}を入手）` : ''}</p>`);
    card.appendChild(btn(o.ok ? `${c.name}にする` : '条件を満たしていない', () => confirmPromo(u, o.to), o.ok ? 'primary' : '', !o.ok));
    body.appendChild(card);
  }
  body.appendChild(btn('もどる', renderCamp));
}
function confirmPromo(u: Unit, to: string) {
  const body = $('campBody'); body.innerHTML = '';
  body.appendChild(el('div', 'card', `<p>${esc(u.name)}を<b class="gold">${CLASSES[to].name}</b>にクラスチェンジします。Lvは1に戻ります。よろしいですか？</p>`));
  const row = el('div', 'row');
  row.appendChild(btn('はい', () => {
    const r = promote(u, to);
    if (!r) return renderCamp();
    save();
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
  body.appendChild(el('p', 'hint', `ルーデウスの恋愛（S）：${sCount(c.bonds, 'rudeus')} / ${sLimit('rudeus')}人　ほかの仲間は1人まで。`));
  const pairs = SUPPORTS.filter(p => ids.has(p.a) && ids.has(p.b));
  if (!pairs.length) body.appendChild(el('p', 'hint', '支援できる組はまだいない。'));
  for (const p of pairs) body.appendChild(bondRow(p, c.bonds));
}
function bondRow(p: SupportPair, bonds: Bonds) {
  const bd = bonds[pairKey(p.a, p.b)], need = nextNeed(p, bd), st = bondStatus(bonds, p);
  const prev = bd.rank > 0 ? RANK_PTS[RANKS[bd.rank - 1]] : 0;
  const pct = need === null ? 100 : Math.max(0, Math.min(100, 100 * (bd.pts - prev) / Math.max(1, need - prev)));
  const out = camp?.roster.some(u => u.out && (u.id === p.a || u.id === p.b));
  const label = (st === 'ready' ? '会話待ち（章クリア後）' : st === 'sBlocked' ? 'S枠なし' : need === null ? '最大ランク' : `${bd.pts} / ${need}`) + (out && st !== 'ready' ? '　療養中（絆は増えない）' : '');
  const pf = (id: string) => faceHtml({ id, name: castName(id), cls: CAST[id]?.cls ?? '', team: 'blue' }, 'pair');
  return el('div', 'card bond', `<div class="bhead"><span class="bpair">${pf(p.a)}${pf(p.b)}</span><span class="bnames">${castName(p.a)} × ${castName(p.b)}${p.tag ? `<small>（${p.tag}）</small>` : ''}</span><b class="rank">${rankName(bd.rank)}</b></div>
    <div class="hp"><div class="bar"><i style="width:${pct}%;background:var(--rose)"></i></div><span>${label}</span></div>
    <div class="wps">上限 ${p.max}${p.max === 'S' ? '（恋愛）' : ''}　次：${bd.rank < maxRank(p) ? RANKS[bd.rank] : '—'}</div>`);
}

// ---------- sortie preparation ----------
/** The sortie screen's state: which chapter, its plan, and the ids picked for the free slots. */
let prep: { index: number; plan: SortiePlan; picks: string[] } | null = null;
/** 「次の章へ」: opens the sortie screen when there is a choice to make, otherwise starts right away. */
function goNext() {
  if (!camp || !CHAPTERS[camp.next]) return;
  const plan = sortiePlan(camp.next, camp.roster);
  if (!plan.choose) { start(newChapter(camp.next, camp.roster, camp.bonds, camp.difficulty), true); return; }
  prep = { index: camp.next, plan, picks: [...plan.picks] };
  campMsg('');
  renderPrep();
}
const shortStats = (u: Unit) => (['hp', 'str', 'mag', 'spd', 'def'] as const).map(k => `${STAT_NAMES[k]}${u.st[k]}`).join(' ');
function renderPrep() {
  const p = prep!, c = camp!, plan = p.plan;
  const fixedN = plan.fixed.filter(f => !f.guest).length, n = fixedN + p.picks.length;
  $('campTabs').hidden = true; $('campBtns').hidden = true;
  $('campTitle').textContent = `出撃準備　${CHAPTERS[p.index].title.replace(/\s+/g, '　')}`;
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
  const row = el('div', 'row');
  row.appendChild(btn(`この${n}人で出撃する`, () => { const picks = p.picks; prep = null; start(newChapter(p.index, c.roster, c.bonds, c.difficulty, picks), true); }, 'primary', !p.picks.length && plan.free > 0));
  row.appendChild(btn('章間にもどる', () => showCamp()));
  body.appendChild(row);
}

// ---------- boot ----------
/** Title screen. `panel` picks the button group: main (はじめから/つづきから), difficulty choice, or defeat. */
function showTitle(msg = '', panel: 'main' | 'diff' | 'defeat' = 'main') {
  $('titleMsg').textContent = msg;
  $('btnLoad').hidden = !load();
  $('titleMain').hidden = panel !== 'main'; $('diffPick').hidden = panel !== 'diff'; $('defeat').hidden = panel !== 'defeat';
  $('camp').hidden = true;
  $('title').hidden = false;
}
async function start(state: State, intro: boolean) {
  S = state; mode = 'busy'; inspect = sel = picked = null; inBattle = true;
  $('camp').hidden = true;
  terrain = document.createElement('canvas'); terrain.width = cols() * T; terrain.height = rows() * T;
  drawTerrain(terrain.getContext('2d')!, S.map);
  topPad = makeTopPad();
  // Scrolling maps take over touch drags on the canvas; 15×10 maps keep the page's normal touch behaviour.
  cv.style.touchAction = scrolls() ? 'none' : 'manipulation';
  drag = null; cam.x = 0; cam.y = -TOP_PAD;
  const lead = S.units.find(u => u.id === 'rudeus' && u.hp > 0) ?? alive(S, 'blue')[0];
  if (lead) centerOn(lead.x, lead.y); else clampCam();
  $('title').hidden = true; hud(); info(''); menu([]);
  preloadChapterArt();
  if (intro) await play(CHAPTERS[S.chapter].intro);
  save();
  await banner(S.phase === 'blue' ? '自軍フェイズ' : '敵軍フェイズ');
  idle();
}
$('btnNew').onclick = () => showTitle('難易度を選んでください。', 'diff');
for (const b of document.querySelectorAll<HTMLButtonElement>('#diffPick button[data-diff]')) {
  b.onclick = () => { camp = null; start(newChapter(0, undefined, undefined, b.dataset.diff as Difficulty), true); };
}
$('btnDiffBack').onclick = () => showTitle();
$('btnLoad').onclick = () => {
  const d = load();
  if (!d) return;
  camp = d.camp;
  if (d.battle) { d.battle.phase = 'blue'; start(d.battle, false); } else if (camp) { $('title').hidden = true; showCamp(); }
};
$('btnRetryPhase').onclick = () => { const d = load(); if (d?.battle) { camp = d.camp; d.battle.phase = 'blue'; start(d.battle, false); } };
$('btnRetryChapter').onclick = () => start(chapterStart(), false);
$('btnDefeatTitle').onclick = () => showTitle();
/** Next chapter: carries the roster (with classic losses), bonds and difficulty. */
$('btnNext').onclick = goNext;
$('btnToTitle').onclick = () => showTitle();
for (const b of document.querySelectorAll<HTMLButtonElement>('#campTabs button')) b.onclick = () => { campTab = b.dataset.tab as 'units' | 'bonds'; campMsg(''); renderCamp(); };
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
  spawnEnemy(e: EnemyDef) { if (!S) return null; const u = makeEnemy(e, Math.max(...S.units.map(v => v.uid)) + 1); S.units.push(u); return u; },
  /** Camera (map pixels of the view's top-left), the view size in tiles, and the enemy-follow log. */
  get cam() { return { ...cam, w: VIEW_W, h: VIEW_H, t: T }; }, followLog,
  /** Test helper: the pre-drawn terrain layer (to check that tiles read as their terrain). */
  get terrain() { return terrain; },
  /** Test helper: center the view on a tile right away if it is off screen. */
  reveal(x: number, y: number) { if (S && !inView(x, y, 0)) centerOn(x, y); return { ...cam }; },
  /** Test helper: add a cast member to the camp roster (to try the sortie screen). */
  addToRoster(id: string, out = false) { const u = makeUnit(id); if (!u || !camp) return null; if (out) u.out = true; camp.roster.push(u); return u; },
};
