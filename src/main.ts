// Screen, input and turn flow. Rules live in logic.ts.
import { CAST, CHAPTERS, CHARS, CLASSES, RANKS, RANK_PTS, STAT_KEYS, STAT_NAMES, SUPPORTS, SUPPORT_BONUS, WEAPONS, WTYPE_NAMES, type EnemyDef, type Line, type Stats, type SupportPair } from './data';
import {
  DIFFICULTY_NAMES, POTION_HEAL, addExp, alive, bondStatus, canEscape, canSeize, dist, expGain, fight, forecast, gainBonds, goalText, heal, healAmount, healExp, healTargets,
  initBonds, inRange, key, loseCond, makeEnemy, makeUnit, maxRank, newChapter, nextNeed, outcome, pairKey, planEnemy, promote, promoOptions, rankName, rankUp, readyPairs,
  rosterOf, sCount, sLimit, spawnReinforcements, staves, stopTiles, terrainAt, threatTiles, tierOf, turnsLeft, unitAt, upgradeState, usable, weaponLabel,
  type Bonds, type Difficulty, type State, type Unit,
} from './logic';
import { drawSprite, drawTerrain } from './sprites';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const T = 48, SC = 3;
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
const floats: { x: number; y: number; text: string; color: string; t: number }[] = [];

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
function render() {
  if (S) {
    ctx.drawImage(terrain, 0, 0);
    const fill = (k: string, col: string) => { const [x, y] = k.split(',').map(Number); ctx.fillStyle = col; ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2); };
    if (mode === 'move' || (mode === 'idle' && inspect)) {
      for (const k of threat) if (!stops.has(k)) fill(k, 'rgba(255,70,60,.34)');
      for (const k of stops) fill(k, 'rgba(70,130,255,.42)');
    }
    if (mode === 'target') for (const t of targets) fill(key(t.x, t.y), 'rgba(255,70,60,.55)');
    if (mode === 'heal') for (const t of targets) fill(key(t.x, t.y), 'rgba(90,220,130,.5)');
    for (const u of S.units) {
      const hp = shownHp.get(u.uid) ?? u.hp;
      if (hp <= 0 || u.left) continue;
      const o = offs.get(u.uid), px = u.x * T + (o?.dx ?? 0), py = u.y * T + (o?.dy ?? 0);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(px + 9, py + 41, 30, 5);
      drawSprite(ctx, CLASSES[u.cls].sprite, u.done && S.phase === 'blue' ? 'gray' : u.team, px, py - 4, SC, u.hair);
      if (u.boss) { ctx.fillStyle = '#e8c56a'; ctx.fillRect(px + 2, py + 2, 9, 3); for (const i of [0, 3, 6]) ctx.fillRect(px + 2 + i, py - 1, 3, 3); }
      ctx.fillStyle = '#17131f'; ctx.fillRect(px + 8, py + 43, 32, 4);
      ctx.fillStyle = u.team === 'blue' ? '#5aa7ff' : '#ff6f61'; ctx.fillRect(px + 9, py + 44, Math.round(30 * hp / u.st.hp), 2);
    }
    const cur = picked ?? sel ?? inspect;
    if (cur && cur.hp > 0) {
      ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 3;
      const cx = cur.x * T, cy = cur.y * T;
      for (const [a, b, u, v] of [[0, 0, 1, 1], [T, 0, -1, 1], [0, T, 1, -1], [T, T, -1, -1]]) { ctx.beginPath(); ctx.moveTo(cx + a + u * 14, cy + b); ctx.lineTo(cx + a, cy + b); ctx.lineTo(cx + a, cy + b + v * 14); ctx.stroke(); }
    }
    ctx.font = '20px DotGothic16, IPAGothic, monospace'; ctx.textAlign = 'center';
    for (let i = floats.length - 1; i >= 0; i--) {
      const f = floats[i];
      ctx.lineWidth = 4; ctx.strokeStyle = '#17131f'; ctx.strokeText(f.text, f.x, f.y - (40 - f.t) * 0.5);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y - (40 - f.t) * 0.5);
      if (--f.t <= 0) floats.splice(i, 1);
    }
  }
  requestAnimationFrame(render);
}
function float(u: Unit, text: string, color: string) { floats.push({ x: u.x * T + T / 2, y: u.y * T + 6, text, color, t: 40 }); }
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
  return `<div class="uhead"><b class="${u.team}">${u.name}</b><span>${CLASSES[u.cls].name}　Lv ${u.lv}${u.gr ? `　EXP ${u.exp}` : ''}</span></div>
    <div class="hp">HP ${u.hp} / ${u.st.hp}<div class="bar"><i style="width:${100 * u.hp / u.st.hp}%;background:${u.team === 'blue' ? '#5aa7ff' : '#ff6f61'}"></i></div></div>
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
function play(lines: Line[]): Promise<void> {
  return new Promise(done => {
    const d = $('dlg'), face = $<HTMLCanvasElement>('dlgFace'), fx = face.getContext('2d')!;
    let i = 0;
    const show = () => {
      if (i >= lines.length) { d.hidden = true; d.onclick = null; done(); return; }
      const l = lines[i++], c = Object.values(CHARS).find(v => v.name === l.who);
      $('dlgBox').classList.toggle('narr', !l.who);
      $('dlgName').hidden = !l.who; $('dlgName').textContent = l.who;
      face.hidden = !c; fx.clearRect(0, 0, 96, 96);
      if (c) drawSprite(fx, CLASSES[c.cls].sprite, 'blue', 0, 0, 6, c.hair);
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
  info(inspect ? unitHtml(inspect) : '<p class="hint">青いユニットをタップして移動先を選ぼう。敵をタップすると移動・攻撃範囲が見られる。</p>');
  menu([['ターン終了', endTurn]]);
}
function selectUnit(u: Unit) {
  sel = u; inspect = picked = null; origin = { x: u.x, y: u.y };
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
  info(`<div class="fc">${row('', u.name, t.name)}${row('HP', `${u.hp}`, `${t.hp}`)}
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
  info(`<div class="fc"><div class="n blue">${u.name}</div><div class="k">杖</div><div class="n blue">${t.name}</div>
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

cv.addEventListener('click', async e => {
  if (mode === 'busy' || !S) return;
  const r = cv.getBoundingClientRect();
  const tx = Math.floor((e.clientX - r.left) / r.width * (cv.width / T)), ty = Math.floor((e.clientY - r.top) / r.height * (cv.height / T));
  if (tx < 0 || ty < 0 || ty >= S.map.length || tx >= S.map[0].length) return;
  const u = unitAt(S, tx, ty);
  if (mode === 'idle') {
    if (u && u.team === 'blue' && !u.done) return selectUnit(u);
    inspect = u ?? null;
    if (u) { stops = u.ai === 'guard' ? new Set([key(u.x, u.y)]) : stopTiles(S, u); threat = threatTiles(S, u, stops); }
    idle();
    if (!u) { const t = terrainAt(S, tx, ty); info(`<p class="hint">${t.name}　守備+${t.def}　回避+${t.avo}${t.heal ? '　ターン開始時にHP回復' : ''}</p>`); }
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
});

// ---------- combat presentation ----------
async function battle(att: Unit, wid: string, def: Unit) {
  shownHp.set(att.uid, att.hp); shownHp.set(def.uid, def.hp);
  const strikes = fight(S, att, wid, def);
  for (const k of strikes) {
    const dx = Math.sign(k.to.x - k.from.x) * 12, dy = Math.sign(k.to.y - k.from.y) * 12;
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
  S.phase = 'red'; hud(); info('<p class="hint">敵軍が行動中……</p>');
  await banner('敵軍フェイズ');
  fortHeal('red');
  const actors = alive(S, 'red'); // reinforcements appear now but do not act this phase
  const rf = spawnReinforcements(S);
  if (rf.length) { for (const u of rf) float(u, '増援', '#ff9a8f'); await banner('敵の増援が現れた！'); }
  for (const e of actors) {
    if (e.hp <= 0) continue;
    const p = planEnemy(S, e);
    await tween(e, p.x, p.y);
    if (p.heal && p.wid) await doHeal(e, p.wid, p.heal);
    else if (p.potion) { e.potions--; const h = Math.min(e.st.hp - e.hp, POTION_HEAL); e.hp += h; float(e, `+${h}`, '#8fe0a0'); await sleep(450); }
    else if (p.target && p.wid) { await battle(e, p.wid, p.target); if (await checkEnd()) return; }
    await sleep(140);
  }
  S.phase = 'blue'; S.turn++;
  for (const u of S.units) u.done = false;
  if (await checkEnd()) return; // survive / defend: the last enemy phase is over
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
  return el('div', 'card' + (u.out ? ' out' : ''), `<div class="uhead"><b class="blue">${esc(u.name)}</b><span>${c.name}${tierOf(u.cls) === 2 ? '（上級職）' : ''}　Lv ${u.lv}　EXP ${u.exp}　移動 ${c.mov}</span>${u.out ? '<em class="outTag">戦線離脱（療養中）・出撃不可</em>' : ''}</div>
    <div class="stats">${st}</div><div class="wps">武器：${wps}　／　使える武器種：${c.wtypes.map(t => WTYPE_NAMES[t]).join('・')}</div>`);
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
  return el('div', 'card bond', `<div class="bhead"><span>${castName(p.a)} × ${castName(p.b)}${p.tag ? `<small>（${p.tag}）</small>` : ''}</span><b class="rank">${rankName(bd.rank)}</b></div>
    <div class="hp"><div class="bar"><i style="width:${pct}%;background:var(--rose)"></i></div><span>${label}</span></div>
    <div class="wps">上限 ${p.max}${p.max === 'S' ? '（恋愛）' : ''}　次：${bd.rank < maxRank(p) ? RANKS[bd.rank] : '—'}</div>`);
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
  terrain = document.createElement('canvas'); terrain.width = cv.width; terrain.height = cv.height;
  drawTerrain(terrain.getContext('2d')!, S.map, SC);
  $('title').hidden = true; hud(); info(''); menu([]);
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
$('btnNext').onclick = () => { if (camp && CHAPTERS[camp.next]) start(newChapter(camp.next, camp.roster, camp.bonds, camp.difficulty), true); };
$('btnToTitle').onclick = () => showTitle();
for (const b of document.querySelectorAll<HTMLButtonElement>('#campTabs button')) b.onclick = () => { campTab = b.dataset.tab as 'units' | 'bonds'; campMsg(''); renderCamp(); };
showTitle();
requestAnimationFrame(render);
(window as any).__game = {
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
};
