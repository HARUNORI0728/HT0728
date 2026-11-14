# 章データの書き方（src/chapters/）

1章＝1ファイル。`ch01.ts`〜`ch10.ts` があり、担当は自分の章のファイルだけを書けばよい（`index.ts` は触らなくてよい）。
型は `src/data.ts`（`Chapter` とその周り）。迷ったら `ch01.ts` `ch02.ts` と、仕組みの見本の `dev.ts`（テスト用の章）を見る。

```ts
import type { Chapter } from '../data';
export const ch03: Chapter = { title: '第3章　師との再会', map: [...], players: [...], enemies: [...], win: { type: 'boss' }, intro: 'ch3.intro', outro: 'ch3.outro' };
```

- `null` のままの章とそれより後ろの章は本編に出ない（章間の「次の章へ」が「第N章は制作中です」になる）。
- 書きかけを遊ぶ：ビルド（`npm run build`）して play/index.html を開き、コンソールで `window.__game.startChapter(3)`（全員そろった仮の名簿で始まる）。
  `window.__fast = true` で演出を飛ばせる。テスト用の章は `window.__game.devChapter(90)`（防衛→制圧）と `devChapter(91)`（耐久→離脱・最終章扱い）。
- 確認：`npm run check`（脚本の読み込み＋型）と `npm run build`。

## フィールド一覧（Chapter）

| フィールド | 意味 |
|---|---|
| `title` | 画面上部の章名（例 `'第3章　師との再会'`。全角空白で区切る） |
| `map` | 地形の文字列の配列。1文字＝1マス、上の行が北。全行同じ長さ。20×14〜24×16 が目安（画面は 12×8 マスでスクロール） |
| `players` | 必ず出撃する仲間 `{ id, x, y, guest? }`。名簿にいなければ CHARS から新規加入。`guest: true` は護衛対象（倒れると敗北・次章へ持ち越さない） |
| `slots` / `sortie` | 名簿から選ぶ残り枠の配置と、出撃の上限（players を含み guest は数えない）。候補が多いと出撃準備の画面が出る |
| `enemies` | 1段目の敵（下の EnemyDef） |
| `win` / `lose` | 1段目の勝利条件・敗北条件（下） |
| `reinforce` | 1段目の増援 `{ turn, units, from? }`（下） |
| `stages` | 2段目以降（M1。下） |
| `terrainChanges` | 地形の変化（M5。下） |
| `prologue` / `intro` / `outro` / `interlude` | 会話の場面ID（脚本 → src/script/scenes.ts。`ch3.intro` `ch3.outro` `ch3.interlude` の形） |
| `talks` | 戦闘中の会話（下） |
| `bgm` | 曲の上書き `{ blue?, red?, boss? }`。省略時：自軍＝map_dawn（1〜3章）/ map_resolve（4〜7章）/ map_final（8〜10章）、敵軍＝map_enemy、ボス交戦中＝boss |
| `ending` | `true` で最終章：終幕のあとエピローグ→後日談→スタッフ表示→タイトル（10章で付ける） |
| `visits` | 宝箱・村（M13）。**未実装**（型だけ。置いても何も起きない） |

## 地形の記号（data.ts `TERRAIN`）

| 記号 | 地形 | 効果 |
|---|---|---|
| G 平地 / R 道 / B 橋 | — | 移動1 |
| F 森 | 守備+1 回避+20 | 移動2（騎馬3） |
| M 山 | 守備+2 回避+30 | 歩兵のみ・移動4 |
| H 丘 | 守備+1 回避+10 | 移動2 |
| U 廃墟 | 守備+1 回避+15 | 移動2（騎馬3） |
| C 砦 | 守備+2 回避+20 | ターン開始時にHP回復 |
| D 家屋 | 守備+1 回避+20 | — |
| N 天幕 | 回避+10 | — |
| Y 茂み | 回避+10 | 騎馬は移動2 |
| A 畑 | 回避+5 | 騎馬・重装は移動2 |
| P 浅瀬 | — | 移動3（重装4） |
| W 川 / X 崖 / Z 城壁 / L 柵 / Q 岩壁 | — | 通行不可（飛行だけ通れる） |
| K 石床 | — | 平地と同じ（8章用。見た目は今は道で代用） |

V（村）と T（宝箱）は予約済みで使えない。飛行（`mtype: 'fly'`）は地形を無視して移動し、地形の守備・回避を受けない。

## 敵（EnemyDef）

```ts
{ cls: 'soldier', lv: 5, x: 10, y: 3, wps: ['ironLance'], ai: 'charge', prefix: '私兵の' }
```

- `cls`（職）と `wps`（武器ID、data.ts `WEAPONS`）。能力値は `ENEMY_BASE[cls]` ＋ Lv で決まる。名前は `prefix`（省略時「野盗の」）＋職名。
  - 人：soldier 槍兵 / fighter 戦士(斧) / archer 弓兵 / knight 重騎士 / myrmidon 剣士 / cavalier 槍騎士 / mercenary 傭兵 / healer 治癒術師(杖) / mage 魔術師 / horseKnight 騎士
  - 魔物（M4。光魔術・特効の対象）：wolf 狼（`wolfFang`）/ golem 岩人形（`golemFist`）/ bird 怪鳥・飛行（`birdTalon`）/ bear 大熊（`bearClaw`）/ shade 残滓の影（`shadeBolt`）/ crystal 残滓の結晶（移動0・武器なし `wps: []`）
  - 絵：私兵は `prefix: '私兵の'` で私兵の絵、魔物は `enemy_monster_<職>` の絵（無ければ仮の図形）
- `ai`：`charge` 常に前進 / `hold` 攻撃できるときだけ動く / `guard` その場から動かない / `target` `goal` のマスへ最短で向かう（M2。止まったマスから届く相手には攻撃する）
- `aiFrom: { turn, ai, goal? }`：`turn` ターン目の敵軍フェイズからAIを切り替える（7章のバラクの逃走、6章のヴェラの突撃など）
- `boss: '名前'`：ボス（名前から立ち絵・会話の条件の ID を引く。新しい名前は data.ts `SPEAKER_IDS` に足す）。`defeat: 'captured' | 'retreat'` は倒したときの表示
- `retreatAt: 0.5`：HPが半分以下になったら撤退（倒れずに盤面から消える。`bossDefeat` の会話が出る。勝利条件 boss では撃破と同じ扱い）
- `unkillable: true`：撃破不可（HPが1で止まる。全滅・ボス撃破・耐久の早期勝利の判定から外す）
- `tag: 'c1'`：印（増援の `from` で使う）／ `st: {...}`：能力値を固定（名前のある敵）

## 勝利条件・敗北条件

```ts
win: { type: 'rout' }                          // 全滅
win: { type: 'boss' }                          // boss の敵をすべて撃破（撤退を含む）
win: { type: 'seize', tiles: [[10, 0]] }       // ルーデウスが金の枠で「制圧」（by: 'eris' で別の仲間に）
win: { type: 'escape', tiles: [[11, 0], [12, 0]] } // 生存者全員（ゲストも）が金の枠から「離脱」
win: { type: 'defend', turns: 12 }             // 守り切る（lose.tile / tiles に敵が乗ると敗北）
win: { type: 'survive', turns: 6 }             // 耐える
// defend / survive は敵の全滅でも勝利。orBoss: true でボス撃破でも勝利（2章）
lose: { units: ['rudeus', 'ariel'], tile: [10, 7], tiles: [...], tileBy: 'barak' }
```

- 敗北：`units` の誰か（ルーデウスとゲストは常に含む）が倒れる、または敵が `tile` / `tiles`（赤の枠で表示）に乗る。`tileBy` を付けると、そのボスが乗ったときだけ（7章の船着き場）。
- 目標の文（画面下）は自動で作られる。

## 増援

```ts
reinforce: [{ turn: 3, units: [ ...EnemyDef ] }, { turn: 6, from: 'c1', units: [ ... ] }]
```

指定ターンの敵軍フェイズ開始時に出る（出たターンは動かない）。出現マスが埋まっていれば次のターンへ。
`from` を付けると、その `tag` の敵（結晶・楔）が盤面にいないときは出ない（M6）。結晶ごとに別の波にする。

## 2段構成（stages。M1）

```ts
win: { type: 'defend', turns: 6 }, lose: { units: ['rudeus', 'ariel'], tile: [12, 13] },
stages: [{
  win: { type: 'seize', tiles: [[12, 0]] }, lose: { units: ['rudeus', 'ariel'] },
  remove: ['orsted'],            // 下げる敵（ボスのID）。'all' で全員
  allies: [{ id: 'perugius', x: 12, y: 12 }, { id: 'orsted', x: 11, y: 8, guest: true }],
  enemies: [ ... ], reinforce: [{ turn: 9, ... }],   // ターンは通し番号
  talk: 'ch9.battle4',           // 切り替え直後の会話（talks の stageStart でもよい）
  bgm: { blue: 'map_final', boss: 'final_boss' },
}],
terrainChanges: [{ stage: 1, tiles: [[11, 7], [12, 7], [13, 7]], to: 'R' }], // 城門が開く
```

前の段の勝利条件を満たした時点で次の段へ（耐久・防衛は最後のターンの敵軍フェイズのあと、次の自軍フェイズの頭）。ターンは通しで数える。
`lose` と `bgm` は省略すると前の段を引き継ぐ。加わる味方は名簿の控えから（いなければ CHARS から新規）。ゲストは操作でき、倒れると敗北。

## 地形の変化（M5）

`terrainChanges: [{ turn: 7, tiles: [...], to: 'U' }]`（7ターン目の自軍フェイズ開始時）または `{ stage: 1, ... }`（段の切り替え時）。
ユニットが乗っているマスは空いたフェイズの頭に変わる（8章の崩落）。

## 戦闘中の会話（talks）

```ts
talks: [
  { scene: 'ch3.battle1', when: { type: 'turn', turn: 2, phase: 'blue' } },
  { scene: 'ch3.battle2', when: { type: 'firstFight', unit: 'roxy' } },
  { scene: 'ch3.battle3', when: { type: 'reinforce', wave: 0 } },          // wave: [0, 1] でどれか最初の
  { scene: 'ch3.battle4', when: { type: 'bossFight', boss: 'residue_bear' } },
  { scene: 'ch9.battle9', when: { type: 'bossFight', boss: 'gall', unit: 'eris' } }, // 専用版（汎用版より優先）
  { scene: 'ch3.battle6', when: { type: 'bossDefeat', boss: 'residue_bear' } },     // 撤退・捕縛でも
  { scene: 'ch2.battle4', when: { type: 'firstHeal', unit: 'lotta' } },
  { scene: 'ch9.battle4', when: { type: 'stageStart', stage: 1 } },
  { scene: 'ch3.battle7', when: { type: 'turn', turn: 4, phase: 'blue' }, needs: ['eris'] }, // エリスがいなければ場面ごと飛ばす
]
```

- どれも章ごとに一度だけ。盤面にいない仲間の台詞は行ごと飛ぶ。`needs`（仲間はキャラID、敵はボスのID）が欠けると場面ごと飛ぶ。
- 2段目の増援にひも付けるときは `{ type: 'reinforce', wave: 0, stage: 1 }`。
- 会話の背景・一枚絵・曲は脚本側（`背景：` `一枚絵：` `BGM：` の行）で決まる。`背景：なし` の場面は地図の上に重なる。

## 未実装（型だけ・または代用）

- 宝箱・村の訪問（M13）：`visits` は読まれない。7章の檻は家屋で、8章は宝箱なしで作る。
- 石床・岩壁（M9）：効果は入っているが、見た目は道・崖で代用。
- 魔物・結晶・影・鳥の専用のマップ絵は、届くまで仮の図形。
