// Pure game rules: movement, combat math, level-ups, enemy AI. No DOM access here.
import {
  CHAPTERS, CHARS, CLASSES, ENEMY_BASE, MAGIC, PROMOS, RANKS, RANK_PTS, STAT_KEYS, SUPPORTS, SUPPORT_BONUS, SUPPORT_CAP, SUPPORT_GAIN, SUPPORT_RANGE,
  S_LIMIT, S_LIMIT_DEFAULT, TERRAIN, TRIANGLE, WEAPONS, moveCost,
  type ArtId, type PromoReq, type Stats, type SupportBonus, type SupportPair, type SupportRank, type Team, type Weapon,
} from './data';

export interface Unit {
  uid: number; id: string; name: string; cls: string; team: Team;
  lv: number; exp: number; hp: number; st: Stats; gr?: Stats;
  wps: string[]; eq: number; x: number; y: number; done: boolean;
  /** charge: always advance. hold: move only to attack. guard: never leave its tile. */
  ai?: 'charge' | 'hold' | 'guard'; boss?: boolean; hair?: string; potions: number;
  /** Magic ranks / sword-school licences (future class-change conditions). */
  arts?: Partial<Record<ArtId, number>>;
}
/** Bond progress per pair (key = pairKey). rank: 0 = none, 1 = C … 4 = S. */
export interface Bond { pts: number; rank: number }
export type Bonds = Record<string, Bond>;
export interface State { chapter: number; turn: number; phase: Team; units: Unit[]; map: string[]; bonds: Bonds }

export const key = (x: number, y: number) => x + ',' + y;
export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const unitAt = (s: State, x: number, y: number) => s.units.find(u => u.hp > 0 && u.x === x && u.y === y);
export const alive = (s: State, team: Team) => s.units.filter(u => u.hp > 0 && u.team === team);
export const terrainAt = (s: State, x: number, y: number) => TERRAIN[s.map[y][x]];

export function newChapter(index: number, roster?: Unit[], bonds?: Bonds): State {
  const ch = CHAPTERS[index];
  let uid = 1;
  const units: Unit[] = ch.players.map(p => {
    const kept = roster?.find(r => r.id === p.id);
    const c = CHARS[p.id];
    const base: Unit = kept ?? { uid: 0, id: c.id, name: c.name, cls: c.cls, team: 'blue', lv: c.lv, exp: 0, hp: c.st.hp, st: { ...c.st }, gr: c.gr, wps: [...c.wps], eq: 0, x: 0, y: 0, done: false, hair: c.hair, potions: 3 };
    return { ...base, uid: uid++, x: p.x, y: p.y, hp: base.st.hp, done: false, potions: 3 };
  });
  for (const e of ch.enemies) {
    const b = ENEMY_BASE[e.cls], st = { ...b };
    for (const k of STAT_KEYS) st[k] += Math.floor((e.lv - 1) * (k === 'hp' ? 1.5 : k === 'lck' || k === 'res' ? 0.3 : 0.7));
    units.push({ uid: uid++, id: e.cls, name: e.boss ?? '野盗の' + CLASSES[e.cls].name, cls: e.cls, team: 'red', lv: e.lv, exp: 0, hp: st.hp, st, wps: [...e.wps], eq: 0, x: e.x, y: e.y, done: false, ai: e.ai, boss: !!e.boss, potions: 0 });
  }
  return { chapter: index, turn: 1, phase: 'blue', units, map: ch.map, bonds: initBonds(bonds) };
}

/** Dijkstra over the map. Returns reachable tiles (cost) and the predecessor of each. */
export function reachable(s: State, u: Unit, mov = CLASSES[u.cls].mov, ignoreUnits = false) {
  const cost = new Map<string, number>([[key(u.x, u.y), 0]]);
  const prev = new Map<string, string>();
  const open: [number, number, number][] = [[u.x, u.y, 0]];
  const mt = CLASSES[u.cls].mtype;
  while (open.length) {
    open.sort((a, b) => a[2] - b[2]);
    const [x, y, c] = open.shift()!;
    if (c > (cost.get(key(x, y)) ?? Infinity)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (ny < 0 || ny >= s.map.length || nx < 0 || nx >= s.map[0].length) continue;
      const other = unitAt(s, nx, ny);
      if (!ignoreUnits && other && other.team !== u.team) continue;
      const nc = c + moveCost(s.map[ny][nx], mt);
      if (nc > mov || nc >= (cost.get(key(nx, ny)) ?? Infinity)) continue;
      cost.set(key(nx, ny), nc); prev.set(key(nx, ny), key(x, y)); open.push([nx, ny, nc]);
    }
  }
  return { cost, prev };
}

/** Tiles the unit may end its move on (reachable and not occupied by someone else). */
export function stopTiles(s: State, u: Unit) {
  const out = new Set<string>();
  for (const k of reachable(s, u).cost.keys()) {
    const [x, y] = k.split(',').map(Number);
    const o = unitAt(s, x, y);
    if (!o || o === u) out.add(k);
  }
  return out;
}

export const inRange = (w: Weapon, d: number) => d >= w.rng[0] && d <= w.rng[1];
/** Weapons the unit's class allows it to wield. */
export const usable = (u: Unit) => u.wps.filter(w => CLASSES[u.cls].wtypes.includes(WEAPONS[w].type));

/** Every tile the unit could attack this turn from any stop tile (for range display). */
export function threatTiles(s: State, u: Unit, stops = stopTiles(s, u)) {
  const out = new Set<string>();
  const wps = usable(u);
  if (!wps.length) return out;
  const max = Math.max(...wps.map(w => WEAPONS[w].rng[1]));
  for (const k of stops) {
    const [x, y] = k.split(',').map(Number);
    for (let dy = -max; dy <= max; dy++) for (let dx = -max; dx <= max; dx++) {
      const d = Math.abs(dx) + Math.abs(dy), tx = x + dx, ty = y + dy;
      if (ty < 0 || ty >= s.map.length || tx < 0 || tx >= s.map[0].length) continue;
      if (wps.some(w => inRange(WEAPONS[w], d))) out.add(key(tx, ty));
    }
  }
  return out;
}

export interface Side { dmg: number; hit: number; crit: number; double: boolean; w: Weapon; sup: SupportInfo }
export interface Forecast { a: Side; d: Side | null }

function side(s: State, att: Unit, w: Weapon, def: Unit, dw: Weapon | null): Side {
  const tri = dw ? (TRIANGLE[w.type] === dw.type ? 1 : TRIANGLE[dw.type] === w.type ? -1 : 0) : 0;
  const magic = MAGIC.includes(w.type), t = terrainAt(s, def.x, def.y);
  const flying = CLASSES[def.cls].mtype === 'fly';
  const sa = supportBonus(s, att), sd = supportBonus(s, def);
  const dmg = Math.max(0, (magic ? att.st.mag : att.st.str) + w.mt + tri + sa.dmg - (magic ? def.st.res : def.st.def) - (flying ? 0 : t.def));
  const hit = Math.round(w.hit + att.st.skl * 2 + att.st.lck / 2 + tri * 15 + sa.hit - (def.st.spd * 2 + def.st.lck + (flying ? 0 : t.avo) + sd.avo));
  const crit = Math.round(w.crit + att.st.skl / 2 + (CLASSES[att.cls].crit ?? 0) + sa.crit - def.st.lck);
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  return { dmg, hit: clamp(hit), crit: clamp(crit), double: att.st.spd - def.st.spd >= 4, w, sup: sa };
}

/** The weapon the defender counters with: equipped if it reaches, else the first that does. */
export function counterWeapon(def: Unit, d: number): Weapon | null {
  const own = usable(def), order = [def.wps[def.eq], ...own].filter(w => w && own.includes(w));
  for (const id of order) if (id && inRange(WEAPONS[id], d)) return WEAPONS[id];
  return null;
}

export function forecast(s: State, att: Unit, wid: string, def: Unit, from = { x: att.x, y: att.y }): Forecast {
  const w = WEAPONS[wid], dw = counterWeapon(def, dist(from, def));
  // Evaluate terrain at the tile the attacker will stand on.
  const moved = { ...att, x: from.x, y: from.y };
  return { a: side(s, moved, w, def, dw), d: dw ? side(s, def, dw, moved, w) : null };
}

export interface Strike { from: Unit; to: Unit; dmg: number; hit: boolean; crit: boolean }

/** Resolves a full round of combat and applies HP changes. */
export function fight(s: State, att: Unit, wid: string, def: Unit, rnd = Math.random): Strike[] {
  att.eq = att.wps.indexOf(wid);
  const f = forecast(s, att, wid, def), out: Strike[] = [];
  const strike = (from: Unit, to: Unit, sd: Side) => {
    if (from.hp <= 0 || to.hp <= 0) return;
    const hit = rnd() * 100 < sd.hit, crit = hit && rnd() * 100 < sd.crit;
    const dmg = hit ? Math.min(to.hp, sd.dmg * (crit ? 3 : 1)) : 0;
    to.hp -= dmg; out.push({ from, to, dmg, hit, crit });
  };
  strike(att, def, f.a);
  if (f.d) strike(def, att, f.d);
  if (f.a.double) strike(att, def, f.a);
  if (f.d?.double) strike(def, att, f.d);
  return out;
}

/** Experience a player unit earns from a round against `foe`. */
export function expGain(u: Unit, foe: Unit, strikes: Strike[]): number {
  const diff = effLv(foe) - effLv(u);
  if (foe.hp <= 0 && strikes.some(k => k.from === u && k.hit)) return Math.max(15, Math.min(100, 40 + diff * 5 + (foe.boss ? 30 : 0)));
  if (strikes.some(k => k.from === u && k.dmg > 0)) return Math.max(5, Math.min(30, 12 + diff * 2));
  return 1;
}

/** Adds exp; on level-up rolls each stat against its growth rate and returns the gains. */
export function addExp(u: Unit, amount: number, rnd = Math.random): Partial<Stats> | null {
  if (!u.gr || u.lv >= 20) return null;
  u.exp += amount;
  if (u.exp < 100) return null;
  u.exp -= 100; u.lv++;
  const gains: Partial<Stats> = {};
  for (const k of STAT_KEYS) if (rnd() * 100 < u.gr[k]) { u.st[k]++; gains[k] = 1; }
  if (gains.hp) u.hp++;
  return gains;
}

export interface Plan { x: number; y: number; target?: Unit; wid?: string }

/** Decides what an enemy does: best attack it can reach, otherwise advance (unless guarding). */
export function planEnemy(s: State, u: Unit): Plan {
  const stops = u.ai === 'guard' ? new Set([key(u.x, u.y)]) : stopTiles(s, u);
  const foes = alive(s, u.team === 'red' ? 'blue' : 'red');
  let best: Plan | null = null, bestScore = -Infinity;
  for (const k of stops) {
    const [x, y] = k.split(',').map(Number);
    for (const t of foes) for (const wid of usable(u)) {
      if (!inRange(WEAPONS[wid], dist({ x, y }, t))) continue;
      const f = forecast(s, u, wid, t, { x, y });
      const out = Math.min(t.hp, f.a.dmg * (f.a.double ? 2 : 1)) * f.a.hit / 100;
      const back = f.d ? f.d.dmg * (f.d.double ? 2 : 1) * f.d.hit / 100 : 0;
      const kill = f.a.dmg * (f.a.double ? 2 : 1) >= t.hp ? 40 * f.a.hit / 100 : 0;
      const score = out + kill - back * 0.4 + terrainAt(s, x, y).avo / 20;
      if (score > bestScore) { bestScore = score; best = { x, y, target: t, wid }; }
    }
  }
  if (best) return best;
  if (u.ai !== 'charge' || !foes.length) return { x: u.x, y: u.y };
  // Advance: walk the shortest path toward the nearest foe as far as this turn allows.
  const full = reachable(s, u, 99, true);
  const near = foes.map(t => ({ t, c: full.cost.get(key(t.x, t.y)) ?? Infinity })).sort((a, b) => a.c - b.c)[0];
  if (near.c === Infinity) return { x: u.x, y: u.y };
  let k: string | undefined = key(near.t.x, near.t.y);
  while (k && !stops.has(k)) k = full.prev.get(k);
  const [x, y] = (k ?? key(u.x, u.y)).split(',').map(Number);
  return { x, y };
}

/** The party carried into the next chapter: player units healed and ready. */
export function rosterOf(s: State): Unit[] {
  return s.units.filter(u => u.team === 'blue').map(u => ({ ...JSON.parse(JSON.stringify(u)) as Unit, hp: u.st.hp, done: false }));
}

export function outcome(s: State): 'win' | 'lose' | null {
  if (s.units.some(u => u.hp <= 0 && (u.id === 'rudeus' || u.id === 'eris'))) return 'lose';
  if (!alive(s, 'red').length) return 'win';
  return null;
}


// ---------- supports ----------

export const pairKey = (a: string, b: string) => (a < b ? a + '+' + b : b + '+' + a);
export const findPair = (a: string, b: string) => SUPPORTS.find(p => pairKey(p.a, p.b) === pairKey(a, b));
export const rankName = (r: number) => (r > 0 ? RANKS[r - 1] : '—');
export const maxRank = (p: SupportPair) => RANKS.indexOf(p.max) + 1;

/** Fills in every defined pair (with its starting points) so saves always hold the full table. */
export function initBonds(src?: Bonds): Bonds {
  const out: Bonds = {};
  for (const p of SUPPORTS) {
    const k = pairKey(p.a, p.b), b = src?.[k];
    out[k] = b ? { pts: b.pts, rank: b.rank } : { pts: p.start ?? 0, rank: 0 };
  }
  return out;
}
const bondOf = (bonds: Bonds, p: SupportPair): Bond => bonds[pairKey(p.a, p.b)] ?? { pts: p.start ?? 0, rank: 0 };

export const sLimit = (id: string) => S_LIMIT[id] ?? S_LIMIT_DEFAULT;
export function sCount(bonds: Bonds, id: string) {
  return SUPPORTS.filter(p => (p.a === id || p.b === id) && bondOf(bonds, p).rank >= 4).length;
}
/** Both partners still have room for another S (romance) partner. */
export const sAllowed = (bonds: Bonds, p: SupportPair) => sCount(bonds, p.a) < sLimit(p.a) && sCount(bonds, p.b) < sLimit(p.b);

/** Points needed for the next rank this pair can reach, or null when it is maxed out. */
export function nextNeed(p: SupportPair, b: Bond): number | null {
  return b.rank >= maxRank(p) ? null : RANK_PTS[RANKS[b.rank]];
}
export type BondStatus = 'growing' | 'ready' | 'sBlocked' | 'max';
export function bondStatus(bonds: Bonds, p: SupportPair): BondStatus {
  const b = bondOf(bonds, p), need = nextNeed(p, b);
  if (need === null) return 'max';
  if (b.pts < need) return 'growing';
  if (b.rank === 3 && !sAllowed(bonds, p)) return 'sBlocked';
  return 'ready';
}
/** Pairs whose next support conversation can play now, in data order. */
export const readyPairs = (bonds: Bonds) => SUPPORTS.filter(p => bondStatus(bonds, p) === 'ready');

/** Confirms the next rank (call after its conversation). Returns the new rank letter. */
export function rankUp(bonds: Bonds, p: SupportPair): SupportRank | null {
  if (bondStatus(bonds, p) !== 'ready') return null;
  const k = pairKey(p.a, p.b), b = bonds[k] = { ...bondOf(bonds, p) };
  b.rank++;
  return RANKS[b.rank - 1];
}

/** Adds points to a pair, stopping at the threshold of the next reachable rank. Returns points actually added. */
export function addBond(bonds: Bonds, p: SupportPair, amount: number): number {
  const k = pairKey(p.a, p.b), b = bonds[k] = { ...bondOf(bonds, p) };
  const need = nextNeed(p, b);
  if (need === null) return 0;
  const before = b.pts;
  b.pts = Math.min(need, b.pts + amount);
  return b.pts - before;
}

export interface SupportInfo extends SupportBonus { from: { id: string; name: string; rank: SupportRank }[] }

/** Combat bonus from supported allies within SUPPORT_RANGE of `u` (u's x/y may be a planned tile). */
export function supportBonus(s: State, u: Unit): SupportInfo {
  const out: SupportInfo = { hit: 0, avo: 0, crit: 0, dmg: 0, from: [] };
  if (u.team !== 'blue' || !s.bonds) return out;
  for (const o of s.units) {
    if (o.uid === u.uid || o.team !== u.team || o.hp <= 0 || dist(o, u) > SUPPORT_RANGE) continue;
    const p = findPair(u.id, o.id);
    if (!p) continue;
    const r = bondOf(s.bonds, p).rank;
    if (!r) continue;
    const rk = RANKS[r - 1], b = SUPPORT_BONUS[rk];
    out.hit += b.hit; out.avo += b.avo; out.crit += b.crit; out.dmg += b.dmg;
    out.from.push({ id: o.id, name: o.name, rank: rk });
  }
  out.hit = Math.min(out.hit, SUPPORT_CAP.hit); out.avo = Math.min(out.avo, SUPPORT_CAP.avo);
  out.crit = Math.min(out.crit, SUPPORT_CAP.crit); out.dmg = Math.min(out.dmg, SUPPORT_CAP.dmg);
  return out;
}

export interface BondGain { unit: Unit; partner: Unit; pair: SupportPair; added: number; ready: boolean }

/** After a combat: each surviving blue fighter earns points with every adjacent surviving partner. */
export function gainBonds(s: State, fighters: Unit[]): BondGain[] {
  const out: BondGain[] = [];
  const seen = new Set<string>();
  for (const u of fighters) {
    if (u.team !== 'blue' || u.hp <= 0) continue;
    for (const o of alive(s, 'blue')) {
      if (o === u || dist(o, u) !== 1) continue;
      const p = findPair(u.id, o.id);
      if (!p || seen.has(pairKey(p.a, p.b))) continue;
      seen.add(pairKey(p.a, p.b));
      const added = addBond(s.bonds, p, SUPPORT_GAIN);
      if (added > 0) out.push({ unit: u, partner: o, pair: p, added, ready: bondStatus(s.bonds, p) === 'ready' });
    }
  }
  return out;
}

// ---------- class change ----------

export const tierOf = (cls: string) => CLASSES[cls].tier ?? 1;
/** Level used for experience maths: promoted units count as +10. */
export const effLv = (u: Unit) => u.lv + (tierOf(u.cls) === 2 ? 10 : 0);

export function reqMet(u: Unit, r: PromoReq): boolean {
  if (r.kind === 'lv') return u.lv >= r.min;
  return (u.arts?.[r.art] ?? 0) >= r.min;
}
export interface PromoOption { to: string; ok: boolean; unmet: PromoReq[] }
/** Promotion choices for a unit (empty when its class has none or it is already promoted). */
export function promoOptions(u: Unit): PromoOption[] {
  if (tierOf(u.cls) !== 1) return [];
  return (PROMOS[u.cls] ?? []).map(p => {
    const unmet = p.req.filter(r => !reqMet(u, r));
    return { to: p.to, ok: !unmet.length, unmet };
  });
}
export const canPromote = (u: Unit) => promoOptions(u).some(o => o.ok);

export interface PromoResult { gains: Partial<Stats>; gift: string | null; oldLv: number }
/** Applies a class change: new class, Lv 1 / EXP 0, stat bonus, and a starter weapon for a new weapon type. */
export function promote(u: Unit, to: string): PromoResult | null {
  const opt = promoOptions(u).find(o => o.to === to);
  if (!opt?.ok) return null;
  const c = CLASSES[to], gains = { ...(c.bonus ?? {}) }, oldLv = u.lv;
  for (const k of STAT_KEYS) u.st[k] += gains[k] ?? 0;
  u.hp = Math.min(u.st.hp, u.hp + (gains.hp ?? 0));
  u.cls = to; u.lv = 1; u.exp = 0;
  let gift: string | null = null;
  if (c.gift && !u.wps.some(w => WEAPONS[w].type === WEAPONS[c.gift!].type)) { u.wps.push(c.gift); gift = c.gift; }
  if (!usable(u).includes(u.wps[u.eq])) u.eq = Math.max(0, u.wps.findIndex(w => usable(u).includes(w)));
  return { gains, gift, oldLv };
}
