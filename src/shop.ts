// お金と商人（systems.md §3）・所持品の並べ替え（§2）。買う・売る（半額）・倉庫（預ける／引き出す。数の上限なし）。使用回数は無し。DOM は使わない。
import { CLASSES, WEAPONS, type WType } from './data';
import { ITEM_SLOTS, ITEM_STACK, WEAPON_SLOTS, itemCount, setItemCount, type Unit } from './logic';

/** 章クリア報酬：300 + 章番号 × 100（1章 400 … 10章 1300）。`n` は章番号（1〜）。 */
export const chapterReward = (n: number) => 300 + n * 100;

export type ShopKind = 'weapon' | 'book' | 'staff' | 'item';
export const SHOP_KIND_NAMES: Record<ShopKind, string> = { weapon: '武器', book: '魔術の教本', staff: '杖', item: '道具' };
/** id = WEAPONS のキー（道具は 'potion'）。from = この数の章をクリアした後から並ぶ。 */
export interface ShopItem { id: string; kind: ShopKind; price: number; from: number }
/** 道具の名前と説明（いまは傷薬だけ）。 */
export const ITEMS: Record<string, { name: string; desc: string }> = {
  potion: { name: '傷薬', desc: 'HP+10。出撃のたびに配られる3個に上乗せされ、使った分だけ減る' },
};

/**
 * 品ぞろえ（systems.md §3 の表に合わせる）。1章後：鉄・初級の教本・初級治癒の杖・傷薬／3章後：細身の剣・手斧・光の初級教本／
 * 4章後：鋼・中級の教本・中級治癒の杖／6章後：遠隔治癒の杖／8章後：業物・上級の教本。
 * 価格は「買えるが全員分は買えない」程度（報酬の合計 8,500 銀に対し、鋼1本 180〜200・業物1本 800〜900）。
 */
export const SHOP: ShopItem[] = [
  { id: 'potion', kind: 'item', price: 30, from: 1 },
  { id: 'ironSword', kind: 'weapon', price: 50, from: 1 },
  { id: 'ironLance', kind: 'weapon', price: 55, from: 1 },
  { id: 'ironAxe', kind: 'weapon', price: 60, from: 1 },
  { id: 'ironBow', kind: 'weapon', price: 60, from: 1 },
  { id: 'javelin', kind: 'weapon', price: 80, from: 1 },
  { id: 'waterBall', kind: 'book', price: 60, from: 1 },
  { id: 'wind', kind: 'book', price: 60, from: 1 },
  { id: 'fire', kind: 'book', price: 90, from: 1 },
  { id: 'healStaff', kind: 'staff', price: 100, from: 1 },
  { id: 'rapier', kind: 'weapon', price: 90, from: 3 },
  { id: 'handAxe', kind: 'weapon', price: 90, from: 3 },
  { id: 'lightning', kind: 'book', price: 100, from: 3 },
  { id: 'steelSword', kind: 'weapon', price: 180, from: 4 },
  { id: 'steelLance', kind: 'weapon', price: 190, from: 4 },
  { id: 'steelAxe', kind: 'weapon', price: 200, from: 4 },
  { id: 'steelBow', kind: 'weapon', price: 200, from: 4 },
  { id: 'iceBlade', kind: 'book', price: 300, from: 4 },
  { id: 'holyLight', kind: 'book', price: 300, from: 4 },
  { id: 'midHealStaff', kind: 'staff', price: 300, from: 4 },
  { id: 'farHealStaff', kind: 'staff', price: 600, from: 6 },
  { id: 'keenSword', kind: 'weapon', price: 800, from: 8 },
  { id: 'keenLance', kind: 'weapon', price: 850, from: 8 },
  { id: 'keenAxe', kind: 'weapon', price: 900, from: 8 },
  { id: 'keenBow', kind: 'weapon', price: 900, from: 8 },
  { id: 'blaze', kind: 'book', price: 800, from: 8 },
  { id: 'radiance', kind: 'book', price: 800, from: 8 },
];
/** `cleared` 章クリア後の品ぞろえ。 */
export const shopStock = (cleared: number) => SHOP.filter(i => i.from <= cleared);
/** 次に品が増える時期（なければ null）。 */
export const nextRestock = (cleared: number) => SHOP.map(i => i.from).filter(f => f > cleared).sort((a, b) => a - b)[0] ?? null;
export const shopName = (id: string) => ITEMS[id]?.name ?? WEAPONS[id]?.name ?? id;

/** 持たせられるか。ok=false のとき why に理由。full = 枠がいっぱい（入れ替えなら持てる）。 */
export interface HoldCheck { ok: boolean; full: boolean; why?: string }
export function canHold(u: Unit, it: ShopItem): HoldCheck {
  if (it.kind === 'item') {
    const have = itemCount(u, it.id), slots = (u.items ?? []).filter(i => i.id !== it.id).length + Math.ceil(have / ITEM_STACK);
    const room = have % ITEM_STACK !== 0 || slots < ITEM_SLOTS;
    return room ? { ok: true, full: false } : { ok: false, full: true, why: '道具枠がいっぱい' };
  }
  const t = WEAPONS[it.id].type as WType;
  if (!CLASSES[u.cls].wtypes.includes(t)) return { ok: false, full: false, why: '使えない武器種' };
  if (it.kind === 'book' && u.wps.includes(it.id)) return { ok: false, full: false, why: '覚えている' };
  if (u.wps.length >= WEAPON_SLOTS) return { ok: false, full: true, why: '武器枠がいっぱい' };
  return { ok: true, full: false };
}
/**
 * 買って `u` に持たせる。武器枠がいっぱいなら `replace`（手放す武器の位置）と入れ替える。手放した品の行き先（倉庫など）は呼び出し側で。
 * 成功すると残りの所持金を返す。買えないときは null（所持金は変わらない）。
 */
export function buy(gold: number, u: Unit, it: ShopItem, replace?: number): number | null {
  if (gold < it.price) return null;
  const c = canHold(u, it);
  if (it.kind === 'item') {
    if (!c.ok) return null;
    setItemCount(u, it.id, itemCount(u, it.id) + 1);
    return gold - it.price;
  }
  if (!c.ok && !(c.full && replace !== undefined && replace >= 0 && replace < u.wps.length)) return null;
  if (c.ok) u.wps.push(it.id);
  else { u.wps[replace!] = it.id; }
  return gold - it.price;
}
/** 持ち物の `i` 番目を先頭（装備中）へ動かす。 */
export function equipFirst(u: Unit, i: number) {
  if (i <= 0 || i >= u.wps.length) return;
  const [w] = u.wps.splice(i, 1);
  u.wps.unshift(w);
  u.eq = 0;
}

/** 宝箱・訪問（M13）で品を受け取った結果。to = 持たせた仲間（null なら倉庫へ、または銀に換えた）。silver = 増えた銀（中身の銀＋換金）。 */
export interface Loot { item: string | null; to: Unit | null; silver: number; stashed?: boolean }
/**
 * 宝箱・訪問の中身を受け取る（所持金は戻り値の silver を呼び出し側が足す）。
 * 品は開けた本人 `u` に持たせ、持てなければ（枠がいっぱい・使えない武器種・覚えている教本）`others` の順に持てる仲間へ。
 * 誰も持てなければ `toStash` のとき倉庫へ（stashed。呼び出し側が倉庫に入れる）、そうでなければ店の値段の銀に換える。
 */
export function takeLoot(u: Unit, item: string | undefined, gold: number | undefined, others: Unit[] = [], toStash = false): Loot {
  const out: Loot = { item: item ?? null, to: null, silver: Math.max(0, gold ?? 0) };
  if (!item) return out;
  const it = SHOP.find(i => i.id === item);
  if (!it) return out;
  const to = [u, ...others.filter(o => o !== u)].find(o => canHold(o, it).ok);
  if (to) {
    buy(it.price, to, it); out.to = to;
    if (it.id === 'potion') to.potions++; // 盤面ではすぐ使える（章の終わりに残りの数へそろえ直される）
  } else if (toStash) out.stashed = true;
  else out.silver += it.price;
  return out;
}

// ---------- 売却と倉庫 ----------
/** 売値：店の値段の半額（切り捨て）。店に並ばない品（専用の武器など）は売れない（null）。 */
export function sellPrice(id: string): number | null {
  const it = SHOP.find(i => i.id === id);
  return it ? Math.floor(it.price / 2) : null;
}
export const shopItem = (id: string) => SHOP.find(i => i.id === id) ?? null;
/** 持ち物から外せるか（最後の1つの武器は外さない：盤面で何もできなくなるのを防ぐ）。 */
export function canRelease(u: Unit, i: number): boolean { return i >= 0 && i < u.wps.length && u.wps.length > 1; }
/** `u` の武器枠 `i` 番目を外して、その id を返す（装備中の位置を合わせる）。 */
export function releaseWeapon(u: Unit, i: number): string | null {
  if (!canRelease(u, i)) return null;
  const [w] = u.wps.splice(i, 1);
  if (u.eq === i || u.eq >= u.wps.length) u.eq = 0; else if (u.eq > i) u.eq--;
  return w;
}
/** 道具を1つ外す（傷薬など）。外せたら true。 */
export function releaseItem(u: Unit, id: string): boolean {
  const n = itemCount(u, id);
  if (n <= 0) return false;
  setItemCount(u, id, n - 1);
  return true;
}
/** 倉庫の品を `u` に持たせられるか（持てない理由つき）。 */
export function canWithdraw(u: Unit, id: string): HoldCheck {
  const it = shopItem(id);
  if (it) return canHold(u, it);
  const w = WEAPONS[id];
  if (!w) return { ok: false, full: false, why: '不明な品' };
  if (!CLASSES[u.cls].wtypes.includes(w.type as WType)) return { ok: false, full: false, why: '使えない武器種' };
  if (u.wps.length >= WEAPON_SLOTS) return { ok: false, full: true, why: '武器枠がいっぱい' };
  return { ok: true, full: false };
}
/** 倉庫の `stash[i]` を `u` に持たせる（持てなければ false で何も変えない）。 */
export function withdraw(stash: string[], i: number, u: Unit): boolean {
  const id = stash[i];
  if (!id || !canWithdraw(u, id).ok) return false;
  if (ITEMS[id]) setItemCount(u, id, itemCount(u, id) + 1); else u.wps.push(id);
  stash.splice(i, 1);
  return true;
}
