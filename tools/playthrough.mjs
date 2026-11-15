// 通しの自動プレイ（npm run playthrough）
// 「はじめから」（カジュアル）で第1章から第10章まで、実際の成長と持ち越しのまま進める。
// ゲームの規則（src/logic.ts）を esbuild で読み込み、main.ts の進行（自軍→敵軍フェイズ、増援、AI切り替え、地形変化、
// 砦の回復、段の切り替え、章クリア→キャンプ→次の章、カジュアルの「章の最初から」）を同じ順でなぞる。会話と演出は飛ばす。
//
//   node tools/playthrough.mjs [--seeds 5] [--seed0 1] [--chapters 1-10] [--retries 4] [--out file.json]
//                              [--from N --camp camp.json]   // N章を保存した名簿から（調整中の章だけ測る）
//                              [--browser]                   // Playwright で本物の画面と持ち越しを照合する
//                              [--root DIR]                  // DIR/src のルールとデータで測る（調整前との比較用）
//                              [--trace 3,4]                 // その章の行動を1手ずつ表示
// 出力：表（標準出力）と JSON（--out。既定は OS の一時フォルダ ht0728-playthrough/）。名簿 *-camps.json は --camp に渡せる。
import { build } from 'esbuild';
import { writeFileSync, readFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const src = `
import { CAST, CHARS, CLASSES, TERRAIN, WEAPONS, chapterDef, hasChapter, moveCost } from './src/data';
import * as L from './src/logic';
export { CAST, CHARS, CLASSES, TERRAIN, WEAPONS, chapterDef, hasChapter, moveCost, L };
`;
// --root DIR：別の場所のソース（例：git archive で取り出した調整前の src）で測る。
const ROOT_I = process.argv.indexOf('--root'), ROOT = ROOT_I > 0 ? process.argv[ROOT_I + 1] : process.cwd();
const bundle = await build({ bundle: true, write: false, platform: 'node', format: 'esm', stdin: { contents: src, resolveDir: ROOT, loader: 'ts' }, logLevel: 'silent' });
const BUNDLE = join(tmpdir(), `ht0728-playthrough-${process.pid}.mjs`);
writeFileSync(BUNDLE, bundle.outputFiles[0].text);
const { CLASSES, WEAPONS, chapterDef, hasChapter, moveCost, L } = await import('file://' + BUNDLE);
unlinkSync(BUNDLE);

// ---------- options ----------
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const SEEDS = +opt('seeds', 5), SEED0 = +opt('seed0', 1), RETRIES = +opt('retries', 4), MAX_TURN = +opt('maxturn', 40);
const [C0, C1] = String(opt('chapters', '1-10')).split('-').map(Number);
const FROM = +opt('from', 0), CAMP_FILE = opt('camp', null);
const OUT = opt('out', join(tmpdir(), 'ht0728-playthrough', 'playthrough.json'));
const QUIET = !!opt('quiet', false);
const DIFF = opt('classic', false) ? 'classic' : 'casual';
const TRACE = opt('trace', false) ? String(opt('trace')).split(',').map(Number) : null;

// systems.md §6：章開始時の味方の平均Lv（1章は 1〜3 の中央）。
const EXPECTED_LV = [2, 3, 4, 6, 7, 9, 10, 12, 13, 15];
const OSHI = ['sylphiette', 'eris', 'ariel'];

const rngOf = seed => { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32); };
const clone = v => JSON.parse(JSON.stringify(v));
const K = (x, y) => x + ',' + y;
const P = k => { const [x, y] = k.split(',').map(Number); return { x, y }; };

// ---------- per-chapter play plans (人の普通の打ち方) ----------
// mode: assault（敵へ向かう）/ boss（ボスへ）/ seize / escape / hold（持ち場 anchor の半径 r に留まり、来た敵を叩く）
// plug: 敗北マス（敵が乗ると負け）を塞ぐ係を置く。
function planOf(s) {
  const ch = chapterDef(s.chapter), st = L.stageOf(s), w = L.stageWin(ch, st), lc = L.loseCond(ch, st);
  const guard = L.guardTiles(lc);
  const vip = new Set([...lc.units, ...s.units.filter(u => u.guest && u.team === 'blue').map(u => u.id)]);
  const p = { mode: 'assault', vip, plug: guard.length ? guard[0] : null, plugBy: lc.tileBy || null, anchor: null, r: 3 };
  if (w.type === 'boss') p.mode = 'boss';
  if (w.type === 'seize') { p.mode = 'seize'; p.goal = w.tiles; p.by = w.by || 'rudeus'; }
  if (w.type === 'escape') { p.mode = 'escape'; p.goal = w.tiles; }
  if (w.type === 'survive' || w.type === 'defend') {
    p.mode = 'hold';
    const lead = s.units.find(u => u.team === 'blue' && u.guest) || s.units.find(u => u.id === 'rudeus');
    p.anchor = guard.length ? guard[0] : [lead.x, lead.y];
    p.r = guard.length ? 3 : 3;
  }
  // 章ごとの補足（地図を見た人がふつうにやること）
  const n = s.chapter + 1;
  if (n === 2) { p.anchor = [5, 7]; p.r = 4; }               // 廃村の中で迎え撃つ
  if (n === 6) { p.r = 4; }                                  // 食糧庫のまわり
  if (n === 7) { p.plugFrom = 1; }                           // 船着き場を早めに塞ぐ
  if (n === 10 && st === 0) { p.anchor = [5, 12]; p.r = 3; } // 廃宿の砦と林で凌ぐ
  return p;
}

// ---------- the simulator ----------
function Sim(rnd, log) {
  const isHealer = u => L.staves(u).length > 0;
  const fragile = (s, u, plan) => plan.vip.has(u.id) || u.guest;

  // Tiles an enemy could strike this coming enemy phase (by AI), with the tiles it would stand on.
  function enemyReach(s, f) {
    if (!L.usable(f).length) return null;
    let stops;
    if (f.ai === 'guard') stops = new Set([K(f.x, f.y)]);
    else if (f.ai === 'target' && f.goal) {
      const full = L.reachable(s, f, 99, true), st = L.stopTiles(s, f);
      let k = full.cost.has(K(...f.goal)) ? K(...f.goal) : null;
      while (k && !st.has(k)) k = full.prev.get(k);
      stops = new Set([k ?? K(f.x, f.y)]);
    } else stops = L.stopTiles(s, f);
    // aiFrom: an enemy that starts to move next enemy phase
    if (f.aiFrom && s.turn >= f.aiFrom.turn) { const g = { ...f, ai: f.aiFrom.ai, goal: f.aiFrom.goal ?? f.goal, aiFrom: undefined }; return enemyReach(s, g); }
    return { f, tiles: L.threatTiles(s, f, stops) };
  }
  // Strikes the coming enemy phase could land on u standing at (x, y): the 4 worst threats.
  function riskAt(s, u, x, y, reach, skip, depth = 3) {
    const me = { ...u, x, y };
    const hits = [];
    for (const r of reach) {
      if (!r || r.f === skip || r.f.hp <= 0 || !r.tiles.has(K(x, y))) continue;
      let best = null;
      for (const wid of L.usable(r.f)) {
        const fc = L.forecast(s, r.f, wid, me, { x: r.f.x, y: r.f.y });
        const e = fc.a.dmg * (fc.a.double ? 2 : 1) * fc.a.hit / 100 * (1 + fc.a.crit / 50);
        if (!best || e > best.e) best = { e, side: fc.a };
      }
      if (best) hits.push(best);
    }
    hits.sort((a, b) => b.e - a.e);
    const top = hits.slice(0, depth);
    const strikes = top.flatMap(h => Array(h.side.double ? 2 : 1).fill({ d: h.side.dmg, p: h.side.hit / 100, c: h.side.crit / 100 }));
    return { exp: top.reduce((a, h) => a + h.e, 0), strikes };
  }
  /** Probability that these strikes (each: damage d, hit p, crit c = triple) take at least `hp`. */
  function pDeath(strikes, hp) {
    hp = Math.ceil(hp);
    if (hp <= 0) return 1;
    let dist = new Float64Array(hp + 1); dist[0] = 1;
    for (const k of strikes) {
      if (k.p <= 0 || k.d <= 0) continue;
      const nd = new Float64Array(hp + 1);
      for (let x = 0; x <= hp; x++) {
        const w = dist[x]; if (!w) continue;
        if (x === hp) { nd[hp] += w; continue; }
        nd[x] += w * (1 - k.p);
        nd[Math.min(hp, x + k.d)] += w * k.p * (1 - k.c);
        nd[Math.min(hp, x + k.d * 3)] += w * k.p * k.c;
      }
      dist = nd;
    }
    return dist[hp];
  }
  // Terrain distance field (ignoring units) from goal tiles, for a move type.
  const fieldCache = new Map();
  function field(s, goals, mtype) {
    const id = s.map.join('') + '|' + mtype + '|' + goals.map(g => g.join(',')).join(';');
    if (fieldCache.has(id)) return fieldCache.get(id);
    const H = s.map.length, W = s.map[0].length, d = new Map(), open = [];
    for (const [x, y] of goals) { d.set(K(x, y), 0); open.push([x, y, 0]); }
    while (open.length) {
      open.sort((a, b) => a[2] - b[2]);
      const [x, y, c] = open.shift();
      if (c > d.get(K(x, y))) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const mc = moveCost(s.map[ny][nx], mtype); if (!isFinite(mc)) continue;
        const nc = c + mc;
        if (nc < (d.get(K(nx, ny)) ?? Infinity)) { d.set(K(nx, ny), nc); open.push([nx, ny, nc]); }
      }
    }
    if (fieldCache.size > 400) fieldCache.clear();
    fieldCache.set(id, d);
    return d;
  }

  function decide(s, u, plan, reach) {
    const foes = L.alive(s, 'red'), mt = CLASSES[u.cls].mtype, mov = CLASSES[u.cls].mov;
    const vip = fragile(s, u, plan), healer = isHealer(u);
    const hpr = u.hp / u.st.hp;
    const noMelee = L.usable(u).length > 0 && L.usable(u).every(w => WEAPONS[w].rng[0] > 1); // 弓：隣の敵に反撃できない
    const riskW = (vip ? 1.6 : healer || noMelee ? 1.1 : 0.55) * (1.6 - hpr);
    const deathPen = vip ? 600 : healer ? 70 : 50;
    const boss = foes.find(f => f.boss && !f.unkillable);
    const killable = foes.filter(f => !f.unkillable && L.usable(f).length + 1);
    // goal field
    let goalTiles = null, goalW = 0;
    const turnPush = Math.min(3, 0.6 + s.turn * 0.12) * (foes.length <= 4 ? 1.5 : 1);
    // 人のふつうの打ち方：まず目の前の敵を片づけ（経験値も稼ぐ）、数が減るか中盤を過ぎたら目標（ボス・制圧）へ。
    const late = s.turn >= 7 || foes.filter(f => !f.unkillable).length <= 5;
    if (plan.mode === 'seize') { goalTiles = plan.goal; goalW = u.id === plan.by ? (late ? 3 : 1.2) : 1.2; if (u.id !== plan.by) goalTiles = foes.length ? foes.map(f => [f.x, f.y]) : null; }
    else if (plan.mode === 'escape') { goalTiles = plan.goal; goalW = 3; }
    else if (plan.mode === 'hold') goalTiles = null;
    else if (plan.mode === 'boss' && boss && late) { goalTiles = [[boss.x, boss.y]]; goalW = 1.2 * turnPush; }
    else if (killable.length) { goalTiles = killable.map(f => [f.x, f.y]); goalW = 1.0 * turnPush; }
    if (vip && !(plan.mode === 'seize' && u.id === plan.by) && plan.mode !== 'escape') goalW *= 0.4; // 敗北条件のキャラは後ろから付いていく
    const fld = goalTiles ? field(s, goalTiles, mt) : null;
    const isPlug = plan.plug && plan.plugUnit === u.id && s.turn >= (plan.plugFrom ?? 1);
    const plugF = isPlug ? field(s, [plan.plug], mt) : null;
    const anchorF = plan.mode === 'hold' && plan.anchor ? field(s, [plan.anchor], mt) : null;
    const allies = L.alive(s, 'blue').filter(a => a !== u);
    // 育てたい仲間（平均より低いLv）に止めを譲る：人がふつうにやる「経験値の配分」
    const team = L.alive(s, 'blue').filter(a => !a.guest && a.gr);
    const avgLv = team.reduce((a, b) => a + L.effLv(b), 0) / Math.max(1, team.length);
    const feed = u.gr && !u.guest ? Math.max(0.4, Math.min(3, 1 + (avgLv - L.effLv(u)) / 4 + (OSHI.includes(u.id) ? 1.2 : 0))) : 0.4;
    const stops = L.stopTiles(s, u);
    let best = { score: -Infinity };
    let cur = null;
    const consider = (score, act) => { if (score > best.score) best = { score, x: cur.x, y: cur.y, ...act }; };
    for (const k of stops) {
      const p = P(k), t = L.terrainAt(s, p.x, p.y);
      cur = p;
      // guard tiles: only the plug may stand on it; seize tiles reserved for the seizer
      if (plan.mode === 'seize' && u.id !== plan.by && plan.goal.some(([gx, gy]) => gx === p.x && gy === p.y)) continue; // 制圧マスは空けておく
      let base = t.avo * 0.04 + t.def * 0.6 + (t.heal ? (1 - hpr) * 8 : 0);
      if (fld) { const d = fld.get(k) ?? 99; base -= goalW * d / mov * 3; }
      if (isPlug) { const d = plugF.get(k) ?? 99; base -= d * 4; if (d === 0) base += 30; }
      else if (anchorF) {
        const d = anchorF.get(k) ?? 99;
        base -= Math.max(0, d - plan.r) * 3;
        if (vip) base -= d * 0.5;
      }
      // VIP stays behind the others: penalty for being closer to foes than the nearest ally
      if (vip && foes.length && !(plan.mode === 'seize' && u.id === plan.by && s.turn > 2)) {
        const dn = Math.min(...foes.map(f => L.dist(p, f)));
        const an = allies.length ? Math.min(...allies.map(a => Math.min(...foes.map(f => L.dist(a, f))))) : 99;
        if (dn < an) base -= (an - dn) * (u.guest ? 2 : 0.7);
      }
      // cohesion: lone units get picked apart
      const near = allies.filter(a => L.dist(a, p) <= 3).length;
      base += Math.min(near, 3) * (noMelee || healer ? 1.5 : 0.6);
      const evalRisk = (skip, hpAfter) => {
        const r = riskAt(s, u, p.x, p.y, reach, skip, vip ? 5 : 3);
        return -riskW * r.exp - deathPen * pDeath(r.strikes, hpAfter);
      };
      const stay = evalRisk(null, u.hp);
      consider(base + stay, {});
      // escape / seize
      if (plan.mode === 'escape' && L.canEscape(s, { ...u, ...p })) consider(base + 500, { escape: true });
      if (plan.mode === 'seize' && u.id === plan.by && plan.goal.some(([gx, gy]) => gx === p.x && gy === p.y)) consider(base + 1000, { seize: true });
      // potion
      if (u.potions > 0 && u.hp <= u.st.hp - 8 && hpr < 0.55) {
        const h = Math.min(L.POTION_HEAL, u.st.hp - u.hp);
        consider(base + evalRisk(null, u.hp + h) + h * 1.2 + 4, { potion: true });
      }
      // heal
      for (const wid of L.staves(u)) for (const tg of L.healTargets(s, u, wid, p)) {
        const h = L.healAmount(u, wid, tg); if (h < 4) continue;
        const urgency = 1 - tg.hp / tg.st.hp, v = (plan.vip.has(tg.id) || tg.guest) ? 2.2 : 1.4;
        consider(base + stay + h * v * (0.6 + urgency * 2), { heal: tg, wid });
      }
      // attacks
      for (const f of foes) for (const wid of L.usable(u)) {
        if (!L.inRange(WEAPONS[wid], L.dist(p, f))) continue;
        const fc = L.forecast(s, u, wid, f, p);
        const dmg = fc.a.dmg * (fc.a.double ? 2 : 1);
        const killP = dmg >= f.hp && !f.unkillable ? fc.a.hit / 100 * (fc.a.double && fc.a.dmg < f.hp ? fc.a.hit / 100 : 1) : 0;
        const dealt = Math.min(f.hp, dmg) * fc.a.hit / 100;
        const back = fc.d ? fc.d.dmg * (fc.d.double ? 2 : 1) * fc.d.hit / 100 * (1 - killP * 0.7) : 0;
        const pCounter = fc.d ? pDeath(Array(fc.d.double ? 2 : 1).fill({ d: fc.d.dmg, p: fc.d.hit / 100, c: fc.d.crit / 100 }), u.hp) * (1 - killP) : 0;
        let v = dealt * (0.6 + 0.4 * feed) + killP * (10 + 10 * feed + (f.boss ? 25 : 0)) - back * (vip ? 1.5 : 0.7);
        v -= deathPen * pCounter;
        if (f.unkillable) v = dealt * 0.15 - back * 2 - deathPen * pCounter;
        if (f.boss && !f.unkillable && plan.mode === 'boss') v += 6;
        if (f.cls === 'crystal') v += 4;               // 結晶は増援の元
        if (healer && L.staves(u).length) v -= 3;       // 回復役は治すのが本業
        const after = Math.max(1, u.hp - back);
        consider(base + v + evalRisk(killP > 0.8 ? f : null, after), { target: f, wid, gain: v });
      }
    }
    return best;
  }

  // ---------- one chapter ----------
  function playChapter(index, roster, bonds, picks) {
    const s = L.newChapter(index, roster ? clone(roster) : undefined, bonds ? clone(bonds) : undefined, DIFF, picks);
    const ch = chapterDef(index);
    const seen = new Set(), fallen = [], events = [];
    let lossCause = null, dmgTaken = 0, enemyAttacks = 0, minHpRatio = 1;
    const per = {}; const pu = id => (per[id] ??= { kills: 0, fights: 0, dealt: 0 });
    const mark = evs => { for (const e of evs) { s.flags[L.talkKey(e.scene)] = true; seen.add(e.scene); } };
    const talk = test => mark(L.dueTalks(s, test));
    const stageTalk = () => talk(w => w.type === 'stageStart' && w.stage === L.stageOf(s));
    let plan = planOf(s);
    const pickPlug = () => {
      if (!plan.plug) return;
      const cands = L.alive(s, 'blue').filter(u => !plan.vip.has(u.id) && !isHealer(u));
      const score = u => u.st.hp + u.st.def * 2 + CLASSES[u.cls].mov * (s.chapter === 6 ? 4 : 0);
      cands.sort((a, b) => score(b) - score(a));
      plan.plugUnit = cands[0]?.id;
    };
    pickPlug();
    function combat(att, wid, def) {
      const skip = [];
      const ts = L.fightTalks(s, att, def, skip);
      for (const e of skip) s.flags[L.talkKey(e.scene)] = true;
      mark(ts);
      const before = new Map([[att, att.hp], [def, def.hp]]);
      const strikes = L.fight(s, att, wid, def, rnd);
      for (const u of [att, def]) if (u.team === 'blue') { const d = before.get(u) - Math.max(0, u.hp); dmgTaken += d; minHpRatio = Math.min(minHpRatio, Math.max(0, u.hp) / u.st.hp); }
      if (att.team === 'red') enemyAttacks++;
      for (const k of strikes) if (k.from.team === 'blue') { pu(k.from.id).dealt += k.dmg; if (k.to.hp <= 0 || k.to.retreated) pu(k.from.id).kills += 0; }
      { const me = att.team === 'blue' ? att : def, foe = me === att ? def : att; pu(me.id).fights++; if (foe.hp <= 0 || foe.retreated) pu(me.id).kills++; }
      const down = [att, def].filter(u => u.hp <= 0 || u.retreated).map(u => L.bossId(u)).filter(Boolean);
      if (down.length) talk(w => w.type === 'bossDefeat' && down.includes(w.boss));
      L.gainBonds(s, [att, def]);
      for (const u of [att, def]) if (u.team === 'blue' && u.hp <= 0) {
        const foe = u === att ? def : att;
        fallen.push({ id: u.id, turn: s.turn, phase: s.phase, by: foe.name, byLv: foe.lv, byBoss: !!foe.boss, lv: L.effLv(u) });
      }
      const me = att.team === 'blue' ? att : def, foe = me === att ? def : att;
      if (me.hp > 0 && me.gr) L.addExp(me, L.expGain(me, foe, strikes), rnd);
    }
    function lossReason() {
      const lc = L.loseCond(ch, L.stageOf(s));
      const vipDown = s.units.find(u => u.team === 'blue' && u.hp <= 0 && (lc.units.includes(u.id) || u.guest));
      if (vipDown) { const f = [...fallen].reverse().find(x => x.id === vipDown.id); return { kind: 'vip', unit: vipDown.id, by: f?.by, byLv: f?.byLv, turn: s.turn, phase: f?.phase }; }
      const gt = L.guardTiles(lc);
      const onTile = L.alive(s, 'red').find(u => gt.some(([x, y]) => u.x === x && u.y === y));
      if (onTile) return { kind: 'tile', by: onTile.name, turn: s.turn };
      if (!L.alive(s, 'blue').length) return { kind: 'wipe', turn: s.turn };
      return { kind: 'stuck', turn: s.turn };
    }
    function check() {
      let o = L.outcome(s);
      while (o === 'stage') {
        L.advanceStage(s);
        events.push({ stage: L.stageOf(s), turn: s.turn });
        stageTalk();
        plan = planOf(s); pickPlug();
        o = L.outcome(s);
      }
      if (o === 'lose') lossCause = lossReason();
      return o;
    }
    talk(w => w.type === 'turn' && w.turn === 1 && w.phase === 'blue');
    let result = null;
    while (!result && s.turn <= MAX_TURN) {
      // ---- player phase ----
      if (TRACE && TRACE.includes(s.chapter + 1)) console.error(` T${s.turn} red: ` + L.alive(s, 'red').map(e => `${e.name}(${e.x},${e.y})${e.hp}`).join(' '));
      for (const u of s.units) u.done = false;
      for (let guard = 0; guard < 40 && !result; guard++) {
        const todo = L.alive(s, 'blue').filter(u => !u.done);
        if (!todo.length) break;
        const reach = L.alive(s, 'red').map(f => enemyReach(s, f));
        // 敗北条件のキャラの安全は、味方の壁が動いたあとも成り立つかで見る（味方がいない盤面での敵の届く範囲）
        const open = { ...s, units: s.units.filter(v => v.team === 'red') };
        const reachOpen = L.alive(s, 'red').map(f => enemyReach(open, f));
        // healers last unless they can kill; the rest by how much their best action gains
        let pick = null;
        for (const u of todo) {
          const b = decide(s, u, plan, plan.vip.has(u.id) ? reachOpen : reach);
          const pri = (b.target ? 100 + (b.gain ?? 0) : 0) + (b.seize || b.escape ? 1000 : 0) + (isHealer(u) && !b.target ? -200 : 0) + (plan.vip.has(u.id) && !b.target ? -50 : 0);
          if (!pick || pri > pick.pri) pick = { u, b, pri };
        }
        const { u, b } = pick;
        if (TRACE && TRACE.includes(s.chapter + 1)) console.error(`  T${s.turn} ${u.id}(${u.hp}/${u.st.hp} Lv${L.effLv(u)}) (${u.x},${u.y})->(${b.x},${b.y}) ${b.target ? 'atk ' + b.target.name + '(' + b.target.hp + ')' : b.heal ? 'heal ' + b.heal.id : b.potion ? 'potion' : b.seize ? 'SEIZE' : b.escape ? 'ESCAPE' : 'wait'} ${b.score.toFixed(1)}`);
        u.x = b.x; u.y = b.y; u.done = true;
        if (b.seize && L.canSeize(s, u)) s.flags[L.seizeFlag(s)] = true;
        else if (b.escape && L.canEscape(s, u)) u.left = true;
        else if (b.target) combat(u, b.wid, b.target);
        else if (b.heal) { const h = L.heal(u, b.wid, b.heal); L.addExp(u, L.healExp(h), rnd); if (u.team === 'blue') talk(w => w.type === 'firstHeal' && w.unit === u.id); }
        else if (b.potion) { u.potions--; u.hp = Math.min(u.st.hp, u.hp + L.POTION_HEAL); }
        const o = check(); if (o === 'win' || o === 'lose') result = o;
      }
      if (result) break;
      // ---- enemy phase ----
      s.phase = 'red';
      for (const u of L.alive(s, 'red')) if (L.terrainAt(s, u.x, u.y).heal && u.hp < u.st.hp) u.hp += Math.min(u.st.hp - u.hp, Math.ceil(u.st.hp * 0.2));
      L.applyAiSwitch(s);
      const actors = L.alive(s, 'red');
      talk(w => w.type === 'turn' && w.turn === s.turn && w.phase === 'red');
      const waves = [];
      L.spawnReinforcements(s, waves);
      talk(w => w.type === 'reinforce' && (w.stage ?? 0) === L.stageOf(s) && [w.wave].flat().some(n => waves.includes(n)));
      for (const e of actors) {
        if (e.hp <= 0 || e.left) continue;
        const p = L.planEnemy(s, e);
        e.x = p.x; e.y = p.y;
        if (p.heal && p.wid) L.heal(e, p.wid, p.heal);
        else if (p.potion) { e.potions--; e.hp += Math.min(e.st.hp - e.hp, L.POTION_HEAL); }
        else if (p.target && p.wid) { combat(e, p.wid, p.target); const o = check(); if (o === 'win' || o === 'lose') { result = o; break; } }
      }
      if (result) break;
      s.phase = 'blue'; s.turn++;
      for (const u of s.units) u.done = false;
      { const o = check(); if (o === 'win' || o === 'lose') { result = o; break; } }
      L.applyTerrainChanges(s, 'turn');
      for (const u of L.alive(s, 'blue')) if (L.terrainAt(s, u.x, u.y).heal && u.hp < u.st.hp) u.hp += Math.min(u.st.hp - u.hp, Math.ceil(u.st.hp * 0.2));
      talk(w => w.type === 'turn' && w.turn === s.turn && w.phase === 'blue');
      const o = check(); if (o === 'win' || o === 'lose') result = o;
    }
    if (!result) { result = 'timeout'; lossCause = { kind: 'timeout', turn: s.turn }; }
    const blue = s.units.filter(u => u.team === 'blue');
    return {
      result, s, turns: Math.min(s.turn, MAX_TURN), fallen, lossCause, seen: [...seen], stages: events,
      dmgTaken, enemyAttacks, minHpRatio: +minHpRatio.toFixed(2), per,
      enemiesLeft: L.alive(s, 'red').filter(u => !u.unkillable).length,
      deployed: blue.map(u => ({ id: u.id, lv: L.effLv(u), cls: u.cls, guest: !!u.guest })),
    };
  }
  return { playChapter };
}

// ---------- camp between chapters ----------
function sortiePicks(index, roster) {
  const plan = L.sortiePlan(index, roster);
  if (!plan.choose) return undefined;
  const ready = plan.pool.filter(u => !u.out);
  const fixedHeal = plan.fixed.some(f => !f.guest && L.staves(f.unit).length);
  // 推しは必ず、回復役を1人、あとは強い順。加入したばかりの仲間は2章ほど試しに使う。
  const fresh = u => (u.joined ?? 0) >= index - 1 ? 4 : 0;
  const score = u => L.effLv(u) + (OSHI.includes(u.id) ? 30 : 0) + (!fixedHeal && L.staves(u).length ? 20 : 0) + fresh(u);
  return [...ready].sort((a, b) => score(b) - score(a)).slice(0, plan.free).map(u => u.id);
}
function campStep(roster, bonds, cleared) {
  // supports (talks skipped) and confessions (応える)
  const ids = new Set(roster.map(u => u.id));
  const done = new Set();
  for (;;) {
    const p = L.readyPairs(bonds, cleared).find(q => !done.has(L.pairKey(q.a, q.b)) && ids.has(q.a) && ids.has(q.b));
    if (!p) break;
    done.add(L.pairKey(p.a, p.b));
    const next = ['C', 'B', 'A', 'S'][bonds[L.pairKey(p.a, p.b)].rank];
    if (next === 'S' && L.isConfession(p)) L.answerConfession(bonds, p, true, cleared); else L.rankUp(bonds, p);
  }
  // class change as soon as possible (first option)
  const promoted = [];
  for (const u of roster) {
    const o = L.promoOptions(u).find(x => x.ok);
    if (o) { L.promote(u, o.to); promoted.push(u.id + '→' + o.to); }
  }
  return promoted;
}

// ---------- campaign ----------
function campaign(seed, startIndex = C0 - 1, startCamp = null) {
  const rnd = rngOf(seed * 7919 + 13);
  const sim = Sim(rnd);
  let roster = startCamp?.roster ?? null, bonds = startCamp?.bonds ?? null;
  const chapters = [], camps = [];
  for (let i = startIndex; i <= C1 - 1 && hasChapter(i); i++) {
    const picks = roster ? sortiePicks(i, roster) : undefined;
    const tries = [];
    let r;
    for (let t = 0; t <= RETRIES; t++) {
      r = sim.playChapter(i, roster, bonds, picks);
      tries.push({ result: r.result, turns: r.turns, cause: r.lossCause, fallen: r.fallen.map(f => `${f.id}(T${f.turn} ${f.by} Lv${f.byLv})`) });
      if (r.result === 'win') break;
    }
    const lvs = r.deployed.filter(d => !d.guest).map(d => d.lv);
    const avg = lvs.reduce((a, b) => a + b, 0) / lvs.length;
    const entry = {
      chapter: i + 1, result: r.result, retries: tries.length - 1, turns: r.turns,
      avgLvStart: null, avgLvEnd: +avg.toFixed(1), expectedLv: EXPECTED_LV[i],
      deployed: r.deployed.map(d => `${d.id}${d.guest ? '*' : ''}:${d.lv}`),
      fallen: r.fallen.map(f => ({ id: f.id, turn: f.turn, by: f.by, byLv: f.byLv })),
      lossCauses: tries.filter(t => t.result !== 'win').map(t => t.cause),
      tries, per: r.per, dmgTaken: r.dmgTaken, enemyAttacks: r.enemyAttacks, minHpRatio: r.minHpRatio, seen: r.seen, stages: r.stages,
    };
    // level at chapter start (from the roster that went in)
    const startPlan = roster ? r.deployed.map(d => roster.find(u => u.id === d.id)).filter(Boolean) : null;
    if (startPlan) entry.avgLvStart = +(startPlan.filter(u => !r.deployed.find(d => d.id === u.id)?.guest).reduce((a, u) => a + L.effLv(u), 0) / startPlan.length).toFixed(1);
    else entry.avgLvStart = +(L.newChapter(i).units.filter(u => u.team === 'blue').reduce((a, u, _, arr) => a + L.effLv(u) / arr.length, 0)).toFixed(1);
    entry.levels = Object.fromEntries((roster ?? L.newChapter(i).units.filter(u => u.team === 'blue')).map(u => [u.id, L.effLv(u)]));
    chapters.push(entry);
    if (!QUIET) console.error(`seed ${seed} ch${i + 1}: ${r.result} T${r.turns} retries ${tries.length - 1} Lv ${entry.avgLvStart}→${entry.avgLvEnd} fallen ${entry.fallen.map(f => f.id).join(',')}${entry.lossCauses.length ? ' causes ' + JSON.stringify(entry.lossCauses) : ''}`);
    if (r.result !== 'win') {
      // stuck: keep measuring later chapters with the roster that went in (marked)
      entry.stuck = true;
      bonds = bonds ?? r.s.bonds;
      if (!roster) roster = L.rosterOf(r.s);
      else { // newcomers of this chapter still join
        for (const u of L.rosterOf(r.s)) if (!roster.some(v => v.id === u.id)) roster.push(u);
      }
    } else { roster = L.rosterOf(r.s); bonds = r.s.bonds; if (L.benchExp) entry.bench = L.benchExp(r.s, roster, rnd).map(g => `${g.id}+${g.exp}:${g.fromLv}→${g.lv}`); }
    for (const u of roster) u.joined ??= i;
    entry.promoted = campStep(roster, bonds, i + 1);
    camps.push({ next: i + 1, roster: clone(roster), bonds: clone(bonds) });
  }
  return { seed, chapters, camps };
}

// ---------- browser cross-check ----------
async function browserCheck(camp) {
  const { chromium } = await import('playwright').catch(async () => ({ chromium: (await import('module')).createRequire(import.meta.url)('playwright').chromium }));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///home/user/HT0728/play/index.html');
  await page.evaluate(() => { window.__fast = true; localStorage.clear(); });
  await page.reload(); await page.evaluate(() => { window.__fast = true; });
  // はじめから → カジュアル
  await page.click('#btnNew');
  await page.click('#diffPick button[data-diff="casual"]');
  await page.waitForFunction(() => window.__game.screen === 'battle' && window.__game.state?.chapter === 0, null, { timeout: 30000 });
  const live = await page.evaluate(() => window.__game.state.units.map(u => [u.id, u.team, u.lv, u.x, u.y, u.st.hp].join(':')));
  const mine = L.newChapter(0).units.map(u => [u.id, u.team, u.lv, u.x, u.y, u.st.hp].join(':'));
  const ok1 = JSON.stringify(live) === JSON.stringify(mine);
  let ok2 = null;
  if (camp) {
    // 章間の名簿を本物の画面へ入れ、「次の章へ」で始まる章の出撃メンバーと能力値が同じか
    await page.evaluate(c => { window.__game.devCamp(c.next); Object.assign(window.__game.camp, { roster: c.roster, bonds: c.bonds, next: c.next, cleared: c.next }); }, camp);
    await page.click('#btnNext');
    await page.waitForTimeout(500);
    if (await page.evaluate(() => window.__game.screen) === 'camp') { // 出撃準備：既定のまま出撃
      const b = await page.$('#campBtns button.primary, button:has-text("出撃する")'); if (b) await b.click();
    }
    await page.waitForFunction(() => window.__game.screen === 'battle', null, { timeout: 30000 }).catch(() => {});
    const live2 = await page.evaluate(() => window.__game.state.units.filter(u => u.team === 'blue').map(u => [u.id, u.lv, u.cls, u.st.hp, u.st.str, u.st.mag].join(':')).sort());
    const mine2 = L.newChapter(camp.next, camp.roster, camp.bonds, 'casual').units.filter(u => u.team === 'blue').map(u => [u.id, u.lv, u.cls, u.st.hp, u.st.str, u.st.mag].join(':')).sort();
    ok2 = { same: JSON.stringify(live2) === JSON.stringify(mine2), live: live2, sim: mine2 };
  }
  await browser.close();
  return { newGameMatches: ok1, carryOver: ok2 };
}

// ---------- main ----------
const runs = [];
const startCamps = CAMP_FILE ? JSON.parse(readFileSync(CAMP_FILE, 'utf8')) : null;
for (let k = 0; k < SEEDS; k++) {
  const seed = SEED0 + k;
  let camp = null;
  if (startCamps) { const list = Array.isArray(startCamps) ? startCamps : [startCamps]; camp = list[k % list.length]; }
  const start = FROM ? FROM - 1 : C0 - 1;
  runs.push(campaign(seed, start, camp));
}

// summary per chapter
const byCh = new Map();
for (const r of runs) for (const c of r.chapters) { if (!byCh.has(c.chapter)) byCh.set(c.chapter, []); byCh.get(c.chapter).push(c); }
const summary = [...byCh.entries()].sort((a, b) => a[0] - b[0]).map(([n, list]) => {
  const attempts = list.reduce((a, c) => a + c.tries.length, 0), wins = list.filter(c => c.result === 'win').length;
  const turns = list.filter(c => c.result === 'win').map(c => c.turns);
  const falls = {}; for (const c of list) for (const t of c.tries) for (const f of t.fallen) { const id = f.split('(')[0]; falls[id] = (falls[id] ?? 0) + 1; }
  const causes = {}; for (const c of list) for (const t of c.tries) if (t.cause) { const key = t.cause.kind + (t.cause.unit ? ':' + t.cause.unit : ''); causes[key] = (causes[key] ?? 0) + 1; }
  const avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : null;
  return {
    chapter: n, runs: list.length, cleared: wins, attempts, attemptWinRate: +(wins / attempts).toFixed(2),
    retriesAvg: avg(list.map(c => c.retries)), retriesMax: Math.max(...list.map(c => c.retries)),
    turnsAvg: avg(turns), turnsMin: turns.length ? Math.min(...turns) : null, turnsMax: turns.length ? Math.max(...turns) : null,
    lvStart: avg(list.map(c => c.avgLvStart)), expected: list[0].expectedLv, lvEnd: avg(list.map(c => c.avgLvEnd)),
    dmgTakenAvg: avg(list.map(c => c.dmgTaken)), enemyAttacksAvg: avg(list.map(c => c.enemyAttacks)), minHpAvg: avg(list.map(c => c.minHpRatio)),
    falls, causes,
  };
});
const report = { generated: new Date().toISOString(), difficulty: DIFF, seeds: runs.map(r => r.seed), retriesAllowed: RETRIES, maxTurn: MAX_TURN, summary, runs };
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 1) + '\n');
writeFileSync(OUT.replace(/\.json$/, '') + '-camps.json', JSON.stringify(runs.map(r => r.camps), null, 0) + '\n');

const pad = (v, n) => String(v ?? '-').padStart(n);
console.log('章 | 通過 | 勝率(試行) | 再挑戦 平均/最大 | ターン 平均(最小-最大) | 開始Lv/想定 | 終了Lv | 被ダメ | 敵攻撃 | 最低HP | 倒れた仲間 | 負け方');
for (const r of summary) console.log(`${pad(r.chapter, 2)} | ${r.cleared}/${r.runs} | ${pad(r.attemptWinRate, 4)} (${r.attempts}) | ${r.retriesAvg}/${r.retriesMax} | ${pad(r.turnsAvg, 4)} (${r.turnsMin}-${r.turnsMax}) | ${r.lvStart}/${r.expected} | ${r.lvEnd} | ${r.dmgTakenAvg} | ${r.enemyAttacksAvg} | ${r.minHpAvg} | ${Object.entries(r.falls).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + v).join(' ')} | ${Object.entries(r.causes).map(([k, v]) => k + '×' + v).join(' ')}`);
console.log('JSON:', OUT);

if (opt('browser', false)) {
  const camp = runs[0]?.camps?.[0] ?? null;
  const res = await browserCheck(camp);
  console.log('browser check:', JSON.stringify(res));
}
