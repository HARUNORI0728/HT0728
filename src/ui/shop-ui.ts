// キャンプ画面の「商人」タブと、部隊タブの持ち物（並べ替え）。ルールは shop.ts。
import { CLASSES, WEAPONS, WTYPE_NAMES } from '../data';
import { ITEM_SLOTS, WEAPON_SLOTS, itemCount, usable, weaponLabel, type Unit } from '../logic';
import { ITEMS, SHOP_KIND_NAMES, buy, canHold, equipFirst, nextRestock, shopName, shopStock, type ShopItem, type ShopKind } from '../shop';

/** main.ts から渡すもの：キャンプの中身と、保存・メッセージ・再描画。 */
export interface ShopCtx {
  camp: { gold: number; cleared: number; roster: Unit[] };
  body: HTMLElement;
  save: () => void;
  msg: (t: string) => void;
  /** 所持金の表示などキャンプ全体を描き直す（商人タブの一覧に戻る）。 */
  refresh: () => void;
  face: (u: Unit, cls: string) => string;
}

const esc = (t: string) => t.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
function el(tag: string, cls: string, html = '') { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; }
function btn(label: string, fn: () => void, cls = '', disabled = false) {
  const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.disabled = disabled; b.onclick = fn; return b;
}
const rng = (r: [number, number]) => (r[0] === r[1] ? `${r[0]}` : `${r[0]}〜${r[1]}`);
/** 武器・杖の性能の一行。 */
export function weaponStats(id: string) {
  const w = WEAPONS[id];
  if (!w) return ITEMS[id]?.desc ?? '';
  return w.type === 'staff' ? `回復${w.heal} 射程${rng(w.rng)}` : `威力${w.mt} 命中${w.hit} 必殺${w.crit} 射程${rng(w.rng)}`;
}
const typeName = (it: ShopItem) => (it.kind === 'item' ? '道具' : WTYPE_NAMES[WEAPONS[it.id].type]);

/** 商人タブ：品ぞろえの一覧。品を選ぶと、持たせる仲間を選ぶ画面へ。 */
export function renderShop(c: ShopCtx) {
  const { camp, body } = c, stock = shopStock(camp.cleared), next = nextRestock(camp.cleared);
  body.appendChild(el('p', 'hint', `商人の荷車。買った品は、その武器種を使える仲間に持たせる（武器枠${WEAPON_SLOTS}・道具枠${ITEM_SLOTS}）。売ることはできない。${next ? `第${next}章のあとに品が増える。` : ''}`));
  for (const kind of Object.keys(SHOP_KIND_NAMES) as ShopKind[]) {
    const list = stock.filter(i => i.kind === kind);
    if (!list.length) continue;
    c.body.appendChild(el('h3', 'prepHead', SHOP_KIND_NAMES[kind]));
    for (const it of list) {
      const b = el('button', 'pick shopItem', `<span class="pname"><b>${esc(shopName(it.id))}</b><span>${typeName(it)}</span></span><small>${weaponStats(it.id)}</small><em>${it.price}銀</em>`) as HTMLButtonElement;
      b.disabled = camp.gold < it.price; b.dataset.id = it.id;
      b.onclick = () => renderBuy(c, it);
      body.appendChild(b);
    }
  }
}

/** だれに持たせるか。武器種が合う仲間だけを並べる（枠がいっぱいなら入れ替え）。 */
function renderBuy(c: ShopCtx, it: ShopItem) {
  const { camp, body } = c;
  body.innerHTML = '';
  body.appendChild(el('div', 'card', `<div class="uhead"><b>${esc(shopName(it.id))}</b><span>${typeName(it)}　${it.price}銀（所持 ${camp.gold}銀）</span></div><p class="pdesc">${weaponStats(it.id)}</p>`));
  body.appendChild(el('h3', 'prepHead', 'だれに持たせる？'));
  const who = camp.roster.filter(u => { const h = canHold(u, it); return h.ok || h.full || h.why === '覚えている'; });
  if (!who.length) body.appendChild(el('p', 'hint', 'この品を使える仲間がいない。'));
  for (const u of who) {
    const h = canHold(u, it);
    const have = it.kind === 'item' ? `${ITEMS[it.id].name} ${itemCount(u, it.id)}個` : `${u.wps.length}/${WEAPON_SLOTS}：${u.wps.map(w => WEAPONS[w].name).join('・') || 'なし'}`;
    const tag = h.ok ? '持たせる' : h.full ? (it.kind === 'item' ? '枠なし' : '入れ替え') : h.why!;
    const b = el('button', 'pick' + (u.out ? ' out' : ''), `<span class="pname">${c.face(u, 'pick' + (u.out ? ' out' : ''))}<b>${esc(u.name)}</b><span>${CLASSES[u.cls].name}　Lv ${u.lv}</span></span><small>${esc(have)}</small><em>${tag}</em>`) as HTMLButtonElement;
    b.dataset.id = u.id;
    b.disabled = !(h.ok || h.full && it.kind !== 'item');
    b.onclick = () => (h.ok ? done(c, it, u) : renderReplace(c, it, u));
    body.appendChild(b);
  }
  body.appendChild(btn('もどる', c.refresh));
}

/** 武器枠がいっぱい：手放す武器を選ぶ。 */
function renderReplace(c: ShopCtx, it: ShopItem, u: Unit) {
  const body = c.body;
  body.innerHTML = '';
  body.appendChild(el('p', 'hint', `${esc(u.name)}の武器枠がいっぱい。${esc(shopName(it.id))}と入れ替える品を選んでください。手放した品はなくなる。`));
  u.wps.forEach((w, i) => {
    const b = el('button', 'pick', `<span class="pname"><b>${esc(WEAPONS[w].name)}</b><span>${WTYPE_NAMES[WEAPONS[w].type]}</span></span><small>${weaponStats(w)}</small><em>手放す</em>`) as HTMLButtonElement;
    b.onclick = () => done(c, it, u, i);
    body.appendChild(b);
  });
  body.appendChild(btn('もどる', () => renderBuy(c, it)));
}

function done(c: ShopCtx, it: ShopItem, u: Unit, replace?: number) {
  const lost = replace !== undefined ? WEAPONS[u.wps[replace]]?.name : null;
  const left = buy(c.camp.gold, u, it, replace);
  if (left === null) { c.msg('買えなかった。'); c.refresh(); return; }
  c.camp.gold = left;
  c.save();
  c.msg(`${shopName(it.id)}を買い、${u.name}に持たせた${lost ? `（${lost}を手放した）` : ''}。残り ${left}銀。`);
  c.refresh();
}

/** 部隊タブの持ち物：先頭が装備中。「先頭へ」で並べ替える。 */
export function invBlock(u: Unit, onChange: () => void): HTMLElement {
  const box = el('div', 'inv');
  const fang = usable(u).filter(w => WEAPONS[w].type === 'fang');
  for (const w of fang) box.appendChild(el('div', 'invRow', `<span class="invName">${esc(weaponLabel(u, w))}</span><small>武器枠を使わない</small>`));
  u.wps.forEach((w, i) => {
    const row = el('div', 'invRow', `<span class="invName">${i === 0 ? '<em class="eqTag">装備</em>' : ''}${esc(WEAPONS[w].name)}<small>（${WTYPE_NAMES[WEAPONS[w].type]}）</small></span><small>${weaponStats(w)}</small>`);
    if (i > 0) row.appendChild(btn('先頭へ', () => { equipFirst(u, i); onChange(); }, 'invBtn'));
    box.appendChild(row);
  });
  if (!fang.length) box.appendChild(el('div', 'invCap', `武器枠 ${u.wps.length}/${WEAPON_SLOTS}`));
  for (const it of u.items ?? []) box.appendChild(el('div', 'invRow', `<span class="invName">${esc(ITEMS[it.id]?.name ?? it.id)} ×${it.n}</span><small>${esc(ITEMS[it.id]?.desc ?? '')}</small>`));
  return box;
}
