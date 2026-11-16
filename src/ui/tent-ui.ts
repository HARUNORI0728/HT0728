// キャンプ画面の「天幕」タブの「食卓・贈り物・稽古」の節。台詞は design/script-camp.md、数値は shop.ts、絆の計算は story.ts。
import { CAST, STAT_KEYS, STAT_NAMES, type Line, type Stats } from '../data';
import { addExp, type Bonds, type Unit } from '../logic';
import { GIFTS, GIFT_BOND, GIFT_PER_CAMP, MEAL_BOND, MEAL_GUESTS, TRAIN_COST, TRAIN_EXP } from '../shop';
import { giveGift, likedGift, shareMeal } from '../story';

/** 章間ごとの天幕の使用（Camp.tent。v6 の任意項目。章をクリアすると新しい Camp になるので空に戻る）。 */
export interface TentUse {
  /** 食卓を囲んだ。 */
  meal?: boolean;
  /** 贈り物を渡した相手の id（1人1回、GIFT_PER_CAMP 人まで）。 */
  gifts?: string[];
  /** 稽古をつけた相手の id。 */
  trained?: string;
}
/** 保存データの tent を読み直す（形の合わないものは捨てる）。 */
export function validTent(t: any): TentUse | undefined {
  if (!t || typeof t !== 'object') return undefined;
  const out: TentUse = {};
  if (t.meal === true) out.meal = true;
  if (Array.isArray(t.gifts)) out.gifts = t.gifts.filter((k: unknown) => typeof k === 'string' && CAST[k as string]).slice(0, GIFT_PER_CAMP);
  if (typeof t.trained === 'string' && CAST[t.trained]) out.trained = t.trained;
  return Object.keys(out).length ? out : undefined;
}

/** main.ts から渡すもの。 */
export interface TentCtx {
  camp: { gold: number; roster: Unit[]; bonds: Bonds; bench?: { id: string }[]; tent?: TentUse };
  body: HTMLElement;
  save: () => void;
  msg: (t: string) => void;
  refresh: () => void;
  face: (u: Unit, cls: string) => string;
  /** 台詞を再生する（BGM・スクロール位置の後始末は main.ts 側）。 */
  talk: (lines: Line[], bg: string, bgm: string) => Promise<void>;
  /** 好物を知った印（記録に残す）と、知っているか。 */
  learn: (id: string) => void;
  knows: (id: string) => boolean;
}

const esc = (t: string) => t.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
function el(tag: string, cls: string, html = '') { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; }
function btn(label: string, fn: () => void, cls = '', disabled = false) {
  const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.disabled = disabled; b.onclick = fn; return b;
}
const nameOf = (id: string) => CAST[id]?.name ?? id;
const gainText = (g: Partial<Stats>) => STAT_KEYS.filter(k => g[k]).map(k => `${STAT_NAMES[k]}+${g[k]}`).join(' ');

// 選びかけの状態（描き直しても残す。キャンプを出ると意味がなくなるだけ）。
let guests: string[] = [];
let giftSel: string | null = null;

/** 仲間を選ぶボタン（顔・名前・右の札）。 */
function pickBtn(c: TentCtx, u: Unit, tag: string, on: boolean, fn: () => void, disabled = false, sub = '') {
  const b = el('button', 'pick tentPick', `<span class="pname">${c.face(u, 'pick')}<b>${esc(u.name)}</b></span>${sub ? `<small>${esc(sub)}</small>` : ''}<em>${esc(tag)}</em>`) as HTMLButtonElement;
  b.setAttribute('aria-pressed', String(on)); b.disabled = disabled; b.dataset.id = u.id; b.onclick = fn;
  return b;
}

/** 食卓・贈り物・稽古の節の中身。 */
export function renderTentCare(c: TentCtx) {
  const { camp, body } = c, tent = camp.tent ?? {};
  const here = camp.roster.filter(u => !u.out && u.id !== 'rudeus');
  const present = camp.roster.filter(u => !u.out).map(u => u.id);
  guests = guests.filter(id => here.some(u => u.id === id));

  // ---- 食卓 ----
  body.appendChild(el('h3', 'prepHead', '食卓'));
  if (tent.meal) body.appendChild(el('p', 'hint', 'この章間の食卓は、もう囲んだ。次の章をクリアしたら、また誰かを誘おう。'));
  else if (!here.length) body.appendChild(el('p', 'hint', '一緒に食卓を囲める仲間がいない。'));
  else {
    body.appendChild(el('p', 'hint', `章間に一度、ルーデウスと一緒に食卓を囲む仲間を${MEAL_GUESTS}人まで誘える。同じ鍋を囲んだ者どうし（ルーデウスを含む）の支援の組は、絆 +${MEAL_BOND}。`));
    const grid = el('div', 'tentPicks');
    for (const u of here) {
      const on = guests.includes(u.id);
      grid.appendChild(pickBtn(c, u, on ? '誘う' : '選ぶ', on, () => {
        guests = on ? guests.filter(g => g !== u.id) : [...guests, u.id].slice(-MEAL_GUESTS);
        c.refresh();
      }));
    }
    body.appendChild(grid);
    body.appendChild(btn(guests.length ? `${guests.map(nameOf).join('と')}を誘って食卓を囲む` : '仲間を選んでください', async () => {
      const who = [...guests];
      const r = shareMeal(camp.bonds, who);
      camp.tent = { ...tent, meal: true }; guests = [];
      c.save();
      await c.talk(r.lines, 'camp_night', 'daily');
      c.msg(r.gained.length ? `食卓を囲んだ。絆が深まった：${r.gained.map(g => `${nameOf(g.a)}×${nameOf(g.b)} +${g.added}`).join('、')}` : '食卓を囲んだ。にぎやかな夜だった。（支援の組がないか、絆がいっぱいで、絆は増えなかった）');
      c.refresh();
    }, 'primary tentGo', !guests.length));
  }

  // ---- 贈り物 ----
  const given = tent.gifts ?? [];
  body.appendChild(el('h3', 'prepHead', `贈り物　<small>${given.length} / ${GIFT_PER_CAMP}</small>`));
  if (given.length >= GIFT_PER_CAMP) body.appendChild(el('p', 'hint', `この章間の贈り物は、もう${GIFT_PER_CAMP}回渡した。`));
  else if (!here.length) body.appendChild(el('p', 'hint', '贈り物を渡せる仲間がいない。'));
  else {
    body.appendChild(el('p', 'hint', `商人の荷車の小物を買って、その場で仲間に渡す（章間に${GIFT_PER_CAMP}人まで、1人1回）。ルーデウスとの絆 +${GIFT_BOND.plain}、好きな品なら +${GIFT_BOND.like}（ルーデウスと支援のない仲間は、その仲間の別の組が深まる）。`));
    const row = el('div', 'row giftRow');
    for (const g of GIFTS) {
      const b = btn(`${g.name}　${g.price}銀`, () => { giftSel = giftSel === g.name ? null : g.name; c.refresh(); }, '', camp.gold < g.price);
      b.setAttribute('aria-pressed', String(giftSel === g.name)); b.dataset.gift = g.id;
      row.appendChild(b);
    }
    body.appendChild(row);
    const gift = GIFTS.find(g => g.name === giftSel && camp.gold >= g.price);
    if (!gift) body.appendChild(el('p', 'hint', '品を選ぶと、渡す相手を選べる。'));
    else {
      const grid = el('div', 'tentPicks');
      for (const u of here) {
        const done = given.includes(u.id), like = c.knows(u.id) ? likedGift(u.id) : undefined;
        grid.appendChild(pickBtn(c, u, done ? '渡した' : '渡す', false, async () => {
          camp.gold -= gift.price;
          const r = giveGift(camp.bonds, u.id, gift.name, present);
          camp.tent = { ...(camp.tent ?? {}), gifts: [...given, u.id] };
          if (r.like) c.learn(u.id);
          giftSel = null;
          c.save();
          await c.talk(r.lines, 'camp_day', 'daily');
          c.msg(`${u.name}に${gift.name}を渡した（-${gift.price}銀）。${r.like ? '好きな品だった！　' : ''}${r.pair && r.added ? `${nameOf(r.pair.a)}×${nameOf(r.pair.b)} の絆 +${r.added}` : '（絆はいっぱいで増えなかった）'}`);
          c.refresh();
        }, done, like ? `好物：${like}` : ''));
      }
      body.appendChild(grid);
    }
  }

  // ---- 稽古 ----
  body.appendChild(el('h3', 'prepHead', '稽古'));
  const benched = new Set((camp.bench ?? []).map(b => b.id));
  const pupils = here.filter(u => benched.has(u.id) && u.gr && u.lv < 20);
  const trainee = tent.trained ? camp.roster.find(u => u.id === tent.trained) : undefined;
  if (trainee) body.appendChild(el('p', 'hint', `この章間は、${esc(trainee.name)}に稽古をつけた。`));
  else if (!pupils.length) body.appendChild(el('p', 'hint', '前の章で控えだった仲間に、銀を払って稽古をつけられる（いまは対象がいない）。'));
  else {
    body.appendChild(el('p', 'hint', `前の章で控えだった仲間1人に、章間に一度だけ稽古をつけられる（${TRAIN_COST}銀・経験値 +${TRAIN_EXP}）。`));
    const grid = el('div', 'tentPicks');
    for (const u of pupils) grid.appendChild(pickBtn(c, u, `${TRAIN_COST}銀`, false, () => {
      if (camp.gold < TRAIN_COST) return;
      camp.gold -= TRAIN_COST;
      const fromLv = u.lv, ups: Partial<Stats>[] = [];
      let left = TRAIN_EXP;
      while (left > 0 && u.lv < 20) { const step = Math.min(left, 100 - u.exp); left -= step; const g = addExp(u, step); if (g) ups.push(g); }
      camp.tent = { ...(camp.tent ?? {}), trained: u.id };
      c.save();
      c.msg(`${u.name}に稽古をつけた（-${TRAIN_COST}銀）。経験値 +${TRAIN_EXP}${u.lv > fromLv ? `　Lv ${fromLv} → ${u.lv}（${ups.map(gainText).filter(Boolean).join('／') || '能力の伸びなし'}）` : ''}`);
      c.refresh();
    }, camp.gold < TRAIN_COST, `Lv ${u.lv}　EXP ${u.exp}`));
    body.appendChild(grid);
  }
}
