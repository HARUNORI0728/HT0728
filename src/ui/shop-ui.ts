// キャンプ画面の「商人」タブと、部隊タブの持ち物（並べ替え）。ルールは shop.ts。
import { CLASSES, WEAPONS, WTYPE_NAMES } from '../data';
import { ITEM_SLOTS, WEAPON_SLOTS, itemCount, usable, weaponLabel, type Unit } from '../logic';
import { ITEMS, SHOP_KIND_NAMES, buy, canHold, canRelease, canWithdraw, equipFirst, nextRestock, releaseItem, releaseWeapon, sellPrice, shopName, shopStock, withdraw, type ShopItem, type ShopKind } from '../shop';

/** main.ts から渡すもの：キャンプの中身と、保存・メッセージ・再描画。 */
export interface ShopCtx {
  /** stash = 倉庫（品の id の並び。Camp の任意項目、無ければ空）。 */
  camp: { gold: number; cleared: number; roster: Unit[]; stash?: string[] };
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

type ShopMode = 'buy' | 'sell' | 'stash';
let shopMode: ShopMode = 'buy';
/** 商人タブ：上に「買う／売る・預ける／倉庫」の切り替え。 */
export function renderShop(c: ShopCtx) {
  const stash = c.camp.stash ?? [];
  const modes = el('div', 'shopModes');
  for (const [m, label] of [['buy', '買う'], ['sell', '売る・預ける'], ['stash', `倉庫（${stash.length}）`]] as [ShopMode, string][]) {
    const b = btn(label, () => { shopMode = m; c.msg(''); c.refresh(); });
    b.dataset.mode = m; b.setAttribute('aria-pressed', String(shopMode === m));
    modes.appendChild(b);
  }
  c.body.appendChild(modes);
  if (shopMode === 'sell') renderSell(c); else if (shopMode === 'stash') renderStash(c); else renderStock(c);
}
/** 買う：品ぞろえの一覧。品を選ぶと、持たせる仲間を選ぶ画面へ。 */
function renderStock(c: ShopCtx) {
  const { camp, body } = c, stock = shopStock(camp.cleared), next = nextRestock(camp.cleared);
  body.appendChild(el('p', 'hint', `商人の荷車。買った品は、その武器種を使える仲間に持たせる（武器枠${WEAPON_SLOTS}・道具枠${ITEM_SLOTS}）。いらない品は「売る・預ける」で店の値段の半額で売れる。${next ? `第${next}章のあとに品が増える。` : ''}`));
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
  body.appendChild(el('p', 'hint', `${esc(u.name)}の武器枠がいっぱい。${esc(shopName(it.id))}と入れ替える品を選んでください。外した品は倉庫に入る。`));
  u.wps.forEach((w, i) => {
    const b = el('button', 'pick', `<span class="pname"><b>${esc(WEAPONS[w].name)}</b><span>${WTYPE_NAMES[WEAPONS[w].type]}</span></span><small>${weaponStats(w)}</small><em>手放す</em>`) as HTMLButtonElement;
    b.onclick = () => done(c, it, u, i);
    body.appendChild(b);
  });
  body.appendChild(btn('もどる', () => renderBuy(c, it)));
}

function done(c: ShopCtx, it: ShopItem, u: Unit, replace?: number) {
  const lostId = replace !== undefined ? u.wps[replace] : null, lost = lostId ? WEAPONS[lostId]?.name : null;
  const left = buy(c.camp.gold, u, it, replace);
  if (left === null) { c.msg('買えなかった。'); c.refresh(); return; }
  c.camp.gold = left;
  if (lostId) (c.camp.stash ??= []).push(lostId);
  c.save();
  c.msg(`${shopName(it.id)}を買い、${u.name}に持たせた${lost ? `（${lost}は倉庫へ）` : ''}。残り ${left}銀。`);
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

// ---------- 売る・預ける・倉庫 ----------
/** ボタンに data-act / data-id を付けて返す（自動テストが押せるように）。 */
function actBtn(label: string, act: string, id: string, fn: () => void, disabled = false) {
  const b = btn(label, fn, 'invBtn', disabled); b.dataset.act = act; b.dataset.id = id; return b;
}
/** 売る・預ける：仲間ごとの持ち物。売値は店の値段の半額。最後の1つの武器は外せない。 */
function renderSell(c: ShopCtx) {
  const { camp, body } = c;
  body.appendChild(el('p', 'hint', '持ち物を売る（店の値段の半額）か、倉庫に預ける。預けた品は「倉庫」からいつでも引き出せる。最後の1つの武器は外せない。専用の品は売れない。'));
  const done = (t: string) => { c.save(); c.msg(t); c.refresh(); };
  for (const u of camp.roster) {
    const card = el('div', 'card' + (u.out ? ' out' : ''), `<div class="uhead">${c.face(u, 'pick' + (u.out ? ' out' : ''))}<b class="blue">${esc(u.name)}</b><span>${CLASSES[u.cls].name}　Lv ${u.lv}</span></div>`);
    u.wps.forEach((w, i) => {
      const price = sellPrice(w), ok = canRelease(u, i), name = WEAPONS[w].name;
      const row = el('div', 'sellRow', `<span class="invName">${i === 0 ? '<em class="eqTag">装備</em>' : ''}${esc(name)}<small>（${WTYPE_NAMES[WEAPONS[w].type]}）</small></span>`);
      row.append(
        actBtn(price === null ? '売れない' : `売る ${price}銀`, 'sell', w, () => { if (!releaseWeapon(u, i)) return; camp.gold += price!; done(`${u.name}の${name}を${price}銀で売った。所持金 ${camp.gold}銀。`); }, !ok || price === null),
        actBtn('預ける', 'deposit', w, () => { if (!releaseWeapon(u, i)) return; (camp.stash ??= []).push(w); done(`${u.name}の${name}を倉庫に預けた。`); }, !ok),
      );
      card.appendChild(row);
    });
    for (const it of u.items ?? []) {
      if (it.n <= 0) continue;
      const price = sellPrice(it.id), name = ITEMS[it.id]?.name ?? it.id, id = it.id;
      const row = el('div', 'sellRow', `<span class="invName">${esc(name)} ×${it.n}<small>（道具）</small></span>`);
      row.append(
        actBtn(price === null ? '売れない' : `1つ売る ${price}銀`, 'sell', id, () => { if (!releaseItem(u, id)) return; camp.gold += price!; done(`${u.name}の${name}を1つ${price}銀で売った。所持金 ${camp.gold}銀。`); }, price === null),
        actBtn('1つ預ける', 'deposit', id, () => { if (!releaseItem(u, id)) return; (camp.stash ??= []).push(id); done(`${u.name}の${name}を1つ倉庫に預けた。`); }),
      );
      card.appendChild(row);
    }
    if (!u.wps.length && !(u.items ?? []).some(i => i.n > 0)) card.appendChild(el('p', 'hint', '持ち物なし'));
    body.appendChild(card);
  }
}
/** 倉庫：預けた品と、宝箱で誰も持てなかった品。引き出す（仲間を選ぶ）か売る。同じ品は1行にまとめる。 */
function renderStash(c: ShopCtx) {
  const { camp, body } = c, stash = camp.stash ?? [];
  body.appendChild(el('p', 'hint', '倉庫の品（数の上限なし）。引き出すと、使える仲間に持たせられる。宝箱で誰も持てなかった品もここに入る。'));
  if (!stash.length) { body.appendChild(el('p', 'hint', '倉庫は空っぽ。')); return; }
  for (const id of [...new Set(stash)]) {
    const n = stash.filter(s => s === id).length, price = sellPrice(id), w = WEAPONS[id];
    const row = el('div', 'sellRow', `<span class="invName">${esc(shopName(id))}${n > 1 ? ` ×${n}` : ''}<small>（${w ? WTYPE_NAMES[w.type] : '道具'}）${esc(weaponStats(id))}</small></span>`);
    row.append(
      actBtn('引き出す', 'withdraw', id, () => renderWithdraw(c, id)),
      actBtn(price === null ? '売れない' : `売る ${price}銀`, 'sell', id, () => {
        const i = stash.indexOf(id); if (i < 0) return;
        stash.splice(i, 1); camp.gold += price!; c.save(); c.msg(`${shopName(id)}を${price}銀で売った。所持金 ${camp.gold}銀。`); c.refresh();
      }, price === null),
    );
    body.appendChild(row);
  }
}
/** 倉庫の品をだれに持たせるか（武器種が合い、枠に空きのある仲間）。 */
function renderWithdraw(c: ShopCtx, id: string) {
  const { camp, body } = c, stash = camp.stash ?? [];
  body.innerHTML = '';
  body.appendChild(el('div', 'card', `<div class="uhead"><b>${esc(shopName(id))}</b><span>倉庫から引き出す</span></div><p class="pdesc">${esc(weaponStats(id))}</p>`));
  body.appendChild(el('h3', 'prepHead', 'だれに持たせる？'));
  const who = camp.roster.filter(u => { const h = canWithdraw(u, id); return h.ok || h.full; });
  if (!who.length) body.appendChild(el('p', 'hint', 'この品を使える仲間がいない。'));
  for (const u of who) {
    const h = canWithdraw(u, id);
    const have = ITEMS[id] ? `${ITEMS[id].name} ${itemCount(u, id)}個` : `${u.wps.length}/${WEAPON_SLOTS}：${u.wps.map(w => WEAPONS[w].name).join('・') || 'なし'}`;
    const b = el('button', 'pick' + (u.out ? ' out' : ''), `<span class="pname">${c.face(u, 'pick' + (u.out ? ' out' : ''))}<b>${esc(u.name)}</b><span>${CLASSES[u.cls].name}　Lv ${u.lv}</span></span><small>${esc(have)}</small><em>${h.ok ? '持たせる' : esc(h.why ?? '')}</em>`) as HTMLButtonElement;
    b.dataset.id = u.id; b.disabled = !h.ok;
    b.onclick = () => {
      const i = stash.indexOf(id);
      if (i < 0 || !withdraw(stash, i, u)) { c.msg('持たせられなかった。'); c.refresh(); return; }
      c.save(); c.msg(`${shopName(id)}を${u.name}に持たせた。`); c.refresh();
    };
    body.appendChild(b);
  }
  body.appendChild(btn('もどる', c.refresh));
}
