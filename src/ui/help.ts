// 「あそびかた」（キャンプと戦闘画面の「？」から）と、第1章の最初だけ出る操作の説明（チュートリアル）。
// 数値は data.ts / logic.ts の規則から取る（書き写しの食い違いを防ぐ）。
import { RANK_PTS, SUPPORT_BONUS, SUPPORT_CAP, SUPPORT_GAIN, SUPPORT_RANGE, TERRAIN, TRIANGLE, WTYPE_NAMES, ZOC_COST, type WType } from '../data';
import { ITEM_SLOTS, LINK_MAX, LINK_RANK, POTION_HEAL, WEAPON_SLOTS } from '../logic';

const $ = (id: string) => document.getElementById(id)!;

/** 相性の輪（A→B は A が B に強い）を「剣 → 斧 → 槍 → 剣」の形に。 */
function ring(start: WType) {
  const out: string[] = [WTYPE_NAMES[start]];
  let t = TRIANGLE[start];
  while (t && t !== start && out.length < 6) { out.push(WTYPE_NAMES[t]); t = TRIANGLE[t]; }
  return out.concat(WTYPE_NAMES[start]).join(' → ');
}
const terr = (code: string) => (TERRAIN as Record<string, { name: string; def: number; avo: number; heal?: boolean; note?: string }>)[code];
function terrLine(code: string) {
  const t = terr(code);
  if (!t) return '';
  const fx = t.def || t.avo ? `守備+${t.def}・回避+${t.avo}` : '';
  return `<li><b>${t.name}</b>　${[fx, t.heal ? 'ターン開始時にHP回復' : '', t.note ?? ''].filter(Boolean).join('、')}</li>`;
}
const sb = (r: 'C' | 'B' | 'A' | 'S') => { const b = SUPPORT_BONUS[r]; return `${r}：命中+${b.hit} 回避+${b.avo} 必殺+${b.crit}${b.dmg ? ` 威力+${b.dmg}` : ''}`; };

const SECTIONS: { id: string; title: string; html: () => string }[] = [
  { id: 'basic', title: '基本操作', html: () => `<ul>
    <li>青いユニットをタップ → 光ったマスをタップで移動 → 出てきた行動（攻撃・杖・開ける・待機など）を選ぶ。動かずに行動するなら「<b>その場で行動</b>」。</li>
    <li><b>攻撃の近道</b>：ユニットを選んだまま、赤い範囲にいる敵をタップすると、攻撃できるマスへ自動で動いた状態の予測が出る（反撃を受けない・地形のよいマスを優先）。「<b>位置を変える</b>」か、薄く光る別のマスをタップで立ち位置を変えられる。杖は傷ついた味方をタップ。</li>
    <li><b>選択解除・もどる</b>：同じユニットをもう一度タップ、範囲の外の何もないマスをタップ、または「<b>選択解除</b>／<b>もどる</b>」ボタンで1段戻る。移動後の行動選びや予測の途中でも、地図の別の場所をタップすれば戻る（移動も取り消し）。PC では Esc キーか右クリックでも戻れる。攻撃などを実行した後は戻せない。</li>
    <li>敵をタップすると、その敵の移動・攻撃範囲が見られる。「<b>危険範囲</b>」で敵全員の届くマスを赤く重ねる。</li>
    <li>何もないマスをタップすると、その地形の効果が出る。大きな地図はドラッグで動かせる。</li>
    <li>全員が行動すると自動で敵軍フェイズへ。早めに終えるときは「<b>ターン終了</b>」。</li>
    <li>上の「<b>▶ ふつう／▶▶ はやい</b>」で演出の速さを切り替え。敵軍フェイズは<b>画面の長押し</b>か「早送り」で一気に進む。</li>
    <li>会話はタップで次へ、「スキップ」で飛ばせる。中断は自動で保存され、タイトルの「つづきから」で再開できる。</li>
  </ul>` },
  { id: 'tri', title: '武器の相性', html: () => `<ul>
    <li class="tri">${ring('sword')}</li>
    <li class="tri">魔術：${ring('anima')}</li>
    <li>矢印の先に<b>有利</b>：威力+1・命中+15。逆向きは威力-1・命中-15（相手が反撃に使う武器との相性）。弓・牙爪・杖は相性なし。</li>
    <li><b>特効</b>（武器の威力が2倍）：弓は飛行に、光の魔術は魔物に。ほかに特効を持つ武器もある。</li>
    <li>剣・槍・斧・弓は「力 − 守備」、魔術は「魔力 − 魔防」でダメージが決まる。</li>
    <li>速さが相手より<b>4以上</b>高いと2回攻撃（予測の「×2」）。</li>
    <li>予測は左が味方、右が敵。反撃できない相手は「反撃不可」と出る。</li>
  </ul>` },
  { id: 'terrain', title: '地形', html: () => `<ul>
    ${['F', 'M', 'C', 'H', 'D', 'U', 'Y', 'A', 'P'].map(terrLine).join('')}
    <li>川・崖・城壁などは通行不可（飛行ユニットだけ越えられる）。飛行ユニットは地形の守備・回避を受けない。</li>
    <li>守備・回避の効果は、守る側の立っているマスで決まる。マスをタップすると確かめられる。</li>
    <li>移動コストは<b>移動タイプ</b>（歩兵・重装・騎馬・獣・飛行）で変わる。重装と騎馬は森・丘・茂みが苦手、獣は森と茂みを苦にしない。「獣の脚」を持つ者は森が1。ユニットの情報に移動力とタイプが出る。</li>
    <li><b>支配域</b>：敵の隣のマスから先へ進むと、移動コスト+${ZOC_COST}（動き始めのマスは除く）。敵の脇をすり抜けにくい。敵も同じ。</li>
  </ul>` },
  { id: 'bond', title: '支援と絆', html: () => `<ul>
    <li>支援相手が<b>隣にいる状態で戦う</b>と、2人の絆が${SUPPORT_GAIN}たまる。たまると章のあとに支援会話が起き、ランクが上がる（C ${RANK_PTS.C}・B ${RANK_PTS.B}・A ${RANK_PTS.A}・S ${RANK_PTS.S}）。</li>
    <li>${SUPPORT_RANGE}マス以内の支援相手から戦闘の補正：${(['C', 'B', 'A', 'S'] as const).map(sb).join('／')}。合計の上限は命中+${SUPPORT_CAP.hit}・回避+${SUPPORT_CAP.avo}・必殺+${SUPPORT_CAP.crit}・威力+${SUPPORT_CAP.dmg}。</li>
    <li><b>連携攻撃</b>：こちらから仕掛けたとき、隣に支援${['C', 'B', 'A', 'S'][LINK_RANK - 1]}以上の相手がいて武器が届くと、確率（5＋その相手の技、最大${LINK_MAX}%）で1回追撃する。予測に「連携」と出る。</li>
    <li>Sは結婚。ルーデウスのほかは1人だけ。進み具合はユニットの情報欄やキャンプの「支援」タブで見られる。</li>
  </ul>` },
  { id: 'skill', title: 'スキル', html: () => `<ul>
    <li>ユニットごとに戦闘中に効くスキルを最大3つ持つ。ユニットをタップすると名前と説明が出る。</li>
    <li>条件つきのスキルは、効くときだけ戦闘予測の下に表示される（青＝味方、赤＝敵）。</li>
    <li>盾受けのように確率で出るものは、出たときに名前が浮かぶ。クラスチェンジで増えるスキルもある。</li>
  </ul>` },
  { id: 'promo', title: 'クラスチェンジ', html: () => `<ul>
    <li>キャンプの「部隊」タブで、条件（多くはLv10）を満たした仲間を上級職にできる。</li>
    <li>Lvは1に戻るが、能力が上がり、新しい武器種やスキルを得ることがある。新しい武器種の武器を1つもらえることも。</li>
    <li>上級職は使える武器が増え、移動力が変わる職もある。選ぶ前に説明を見比べよう。</li>
  </ul>` },
  { id: 'chest', title: '宝箱と商人', html: () => `<ul>
    <li>宝箱・檻・村などのマスに立つと、行動に「<b>開ける</b>」「<b>訪問</b>」が出る（足もとに金色の印）。</li>
    <li>中身は開けた本人に、持てなければ持てる仲間に渡す。誰も持てない品は<b>倉庫</b>へ送られる。銀は章クリア時に所持金へ。</li>
    <li>キャンプの「商人」で買う・<b>売る</b>（店の値段の半額）・倉庫に<b>預ける／引き出す</b>ができる。</li>
    <li>持てるのは武器枠${WEAPON_SLOTS}（武器・魔術・杖）・道具枠${ITEM_SLOTS}。傷薬はHP+${POTION_HEAL}、出撃のたびに3個配られる。</li>
  </ul>` },
  { id: 'mode', title: '難易度とモード', html: () => `<ul>
    <li><b>カジュアル</b>：倒れた仲間は撤退し、次の章で復帰する。敗北したら直前の自軍フェイズからやり直せる。</li>
    <li><b>クラシック</b>：倒れた仲間は戦線離脱し、以後は出撃できない。敗北すると章の最初から。</li>
    <li><b>撤退</b>：第2章からは、自軍フェイズの待機中に「撤退する」（敗北画面では「キャンプに戻る」）で、出撃前のキャンプへ戻れる。その戦闘で得た経験値・銀・宝箱・倒れた仲間（クラシックの離脱も）は取り消し、キャンプでの買い物などはそのまま。</li>
    <li><b>敵の強さ</b>：ふつう／むずかしい（敵の能力が上がる。数と配置は同じ）。はじめから始めるときに選ぶ。</li>
    <li>副目標を達成すると、章クリア時に銀がもらえる。</li>
  </ul>` },
];

let cur = 'basic';
function show(id: string) {
  cur = id;
  const sec = SECTIONS.find(s => s.id === id) ?? SECTIONS[0];
  for (const b of $('helpNav').querySelectorAll<HTMLButtonElement>('button')) b.setAttribute('aria-pressed', String(b.dataset.sec === sec.id));
  $('helpBody').innerHTML = `<h3>${sec.title}</h3>${sec.html()}`;
}
/** 「あそびかた」を開く（`id` の項目から）。 */
export function openHelp(id = cur) {
  const nav = $('helpNav');
  if (!nav.children.length) {
    for (const s of SECTIONS) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = s.title; b.dataset.sec = s.id;
      b.onclick = () => { show(s.id); $('help').scrollTop = 0; };
      nav.appendChild(b);
    }
    $('helpClose').onclick = closeHelp;
    $('help').addEventListener('click', e => { if (e.target === $('help')) closeHelp(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('help').hidden) closeHelp(); });
  }
  show(id);
  $('help').hidden = false; $('help').scrollTop = 0;
  ($('helpClose') as HTMLButtonElement).focus();
}
export function closeHelp() { $('help').hidden = true; }
export function mountHelp() {
  for (const b of document.querySelectorAll<HTMLButtonElement>('.helpBtn')) b.onclick = () => openHelp();
}

// ---------- tutorial ----------
const TUT_KEY = 'fittoa-tutorial';
/** 第1章の最初の操作説明（各1〜2文）。low = 帯を地図の下側に出す（上にある物を隠さない）。 */
const STEPS: { text: string; low?: boolean }[] = [
  { text: '<b>ユニットを選ぶ</b>　青いユニットをタップすると、動けるマスが青く光る。赤いマスは攻撃が届く範囲。' },
  { text: '<b>移動と解除</b>　光ったマスをタップして移動。同じユニットか範囲の外をタップすると選択解除。行動を選ぶ前なら地図の別の場所をタップ（または「もどる」）で元の位置に戻せる。' },
  { text: '<b>攻撃と戦闘予測</b>　選んだまま赤い範囲の敵をタップすると、自動で近づいて予測が出る（移動してから「攻撃」を選んでもよい）。左が味方・右が敵で、威力・命中・必殺（×2は2回攻撃）を見て「戦う」。', low: true },
  { text: '<b>危険範囲</b>　「危険範囲を表示」で敵全員の攻撃が届くマスが赤く重なる。敵を1体タップすれば、その敵の範囲だけ見られる。', low: true },
  { text: '<b>ターン終了</b>　全員が動くと自動で敵軍フェイズへ。早めに終えるなら「ターン終了」。敵軍フェイズは画面の長押しで早送りできる。', low: true },
  { text: '<b>目標と副目標</b>　勝利条件は画面のいちばん下、その下が副目標（達成で銀がもらえる）。右上の「？」でいつでもあそびかたを見られる。', low: true },
];
let step = -1;
export const tutorialDone = () => { try { return localStorage.getItem(TUT_KEY) === '1'; } catch { return false; } };
function endTutorial() {
  step = -1; $('tut').hidden = true;
  try { localStorage.setItem(TUT_KEY, '1'); } catch { /* shown again next time */ }
}
function showStep() {
  const s = STEPS[step];
  $('tutText').innerHTML = s.text;
  $('tut').classList.toggle('low', !!s.low);
  $('tutNext').textContent = step === STEPS.length - 1 ? 'はじめる' : '次へ';
  let n = $('tut').querySelector('.tutStep');
  if (!n) { n = document.createElement('span'); n.className = 'tutStep'; $('tut').querySelector('.tutBtns')!.prepend(n); }
  n.textContent = `${step + 1} / ${STEPS.length}`;
  $('tut').hidden = false;
}
/** 説明を最初から出す（地図はそのまま操作できる）。 */
export function startTutorial() {
  step = 0; showStep();
  $('tutNext').onclick = e => { e.stopPropagation(); if (++step >= STEPS.length) endTutorial(); else showStep(); };
  $('tutSkip').onclick = e => { e.stopPropagation(); endTutorial(); };
}
/** 戦闘画面を離れるとき：途中なら隠すだけ（記録はしない）。 */
export function hideTutorial() { if (step >= 0) { step = -1; $('tut').hidden = true; } }
export const tutorialStep = () => step;
