// Screen, input and turn flow. Rules live in logic.ts.
import { CHAPTERS, CHARS, CLASSES, STAT_KEYS, STAT_NAMES, WEAPONS, WTYPE_NAMES, type Line } from './data';
import { addExp, alive, dist, expGain, fight, forecast, inRange, key, newChapter, outcome, planEnemy, stopTiles, terrainAt, threatTiles, unitAt, type State, type Unit } from './logic';
import { drawSprite, drawTerrain } from './sprites';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const T = 48, SC = 3;
const cv = $<HTMLCanvasElement>('cv'), ctx = cv.getContext('2d')!;
const fast = () => !!(window as any).__fast;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, fast() ? 0 : ms));

let S: State;
let terrain: HTMLCanvasElement;
type Mode = 'idle' | 'move' | 'menu' | 'target' | 'busy';
let mode: Mode = 'busy';
let sel: Unit | null = null, picked: Unit | null = null, inspect: Unit | null = null;
let stops = new Set<string>(), threat = new Set<string>();
let origin = { x: 0, y: 0 }, targets: Unit[] = [], curW = '';
const offs = new Map<number, { dx: number; dy: number }>();
const shownHp = new Map<number, number>();
const floats: { x: number; y: number; text: string; color: string; t: number }[] = [];

// ---------- save ----------
const SAVE = 'fittoa-save-v1';
function save() { try { localStorage.setItem(SAVE, JSON.stringify(S)); } catch { /* storage unavailable */ } }
function load(): State | null { try { const j = localStorage.getItem(SAVE); return j ? JSON.parse(j) : null; } catch { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE); } catch { /* ignore */ } }

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
    for (const u of S.units) {
      const hp = shownHp.get(u.uid) ?? u.hp;
      if (hp <= 0) continue;
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
  $('goal').textContent = ch.goal;
}
function unitHtml(u: Unit) {
  const st = STAT_KEYS.filter(k => k !== 'hp').map(k => `<div><span>${STAT_NAMES[k]}</span>${u.st[k]}</div>`).join('');
  const wps = u.wps.map(w => `${WEAPONS[w].name}（${WTYPE_NAMES[WEAPONS[w].type]}）`).join('　');
  const t = terrainAt(S, u.x, u.y);
  return `<div class="uhead"><b class="${u.team}">${u.name}</b><span>${CLASSES[u.cls].name}　Lv ${u.lv}${u.gr ? `　EXP ${u.exp}` : ''}</span></div>
    <div class="hp">HP ${u.hp} / ${u.st.hp}<div class="bar"><i style="width:${100 * u.hp / u.st.hp}%;background:${u.team === 'blue' ? '#5aa7ff' : '#ff6f61'}"></i></div></div>
    <div class="stats">${st}</div><div class="wps">${wps}　／　${t.name}（守備+${t.def} 回避+${t.avo}）</div>`;
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
  for (const wid of u.wps) {
    const ts = alive(S, 'red').filter(t => inRange(WEAPONS[wid], dist(u, t)));
    if (ts.length) items.push([`攻撃：${WEAPONS[wid].name}`, () => chooseTarget(wid, ts), 'primary']);
  }
  if (u.potions > 0 && u.hp < u.st.hp) items.push([`傷薬（残り${u.potions}）`, () => { u.potions--; u.hp = Math.min(u.st.hp, u.hp + 10); float(u, '+10', '#8fe0a0'); finish(u); }]);
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
    ${row('武器', f.a.w.name, f.d ? f.d.w.name : '反撃不可')}</div>`);
  menu([['戦う', async () => { mode = 'busy'; await battle(u, curW, t); finish(u); }, 'primary'], ['もどる', openMenu]]);
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
    if (u && u.team === 'red') { const wid = sel!.wps.find(w => inRange(WEAPONS[w], dist(sel!, u))); if (wid) { chooseTarget(wid, alive(S, 'red').filter(t => inRange(WEAPONS[wid], dist(sel!, t)))); pickTarget(u); } }
  } else if (mode === 'target') {
    if (u && targets.includes(u)) pickTarget(u); else openMenu();
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
    clearSave(); showTitle('第1章クリア！　第2章は制作中です。');
  } else {
    await banner('敗北……', 1500);
    showTitle('仲間が倒れてしまった。もう一度挑戦しよう。');
  }
  return true;
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
  for (const e of alive(S, 'red')) {
    if (e.hp <= 0) continue;
    const p = planEnemy(S, e);
    await tween(e, p.x, p.y);
    if (p.target && p.wid) { await battle(e, p.wid, p.target); if (await checkEnd()) return; }
    await sleep(140);
  }
  S.phase = 'blue'; S.turn++;
  for (const u of S.units) u.done = false;
  fortHeal('blue'); save(); hud();
  await banner('自軍フェイズ');
  idle();
}

// ---------- boot ----------
function showTitle(msg = '') {
  $('titleMsg').textContent = msg;
  $('btnLoad').hidden = !load();
  $('title').hidden = false;
}
async function start(state: State, intro: boolean) {
  S = state; mode = 'busy'; inspect = sel = picked = null;
  terrain = document.createElement('canvas'); terrain.width = cv.width; terrain.height = cv.height;
  drawTerrain(terrain.getContext('2d')!, S.map, SC);
  $('title').hidden = true; hud(); info(''); menu([]);
  if (intro) await play(CHAPTERS[S.chapter].intro);
  save();
  await banner(S.phase === 'blue' ? '自軍フェイズ' : '敵軍フェイズ');
  idle();
}
$('btnNew').onclick = () => start(newChapter(0), true);
$('btnLoad').onclick = () => { const s = load(); if (s) { s.phase = 'blue'; start(s, false); } };
showTitle();
requestAnimationFrame(render);
(window as any).__game = { get state() { return S; }, get mode() { return mode; }, get stops() { return [...stops]; } };
