# 実装TODO（2026-11-17 更新）

2026-11-11 時点の旧版（A〜E の作業表と実装メモ）は、ほぼ完了したため整理した。詳しい経緯は `design/review-board/BOARD.md`、仕様と実装状況は `design/systems.md`、バランスは `design/balance-report.md`。
各項目の末尾は根拠になるファイル。

## ① 完了したもの

### 章・物語
- 序章を含む全10章が遊べる（`src/chapters/ch01.ts`〜`ch10.ts`）。9章は防衛→制圧、10章はオルステッド戦の耐久→使徒戦の2段（`ch09.ts`、`ch10.ts`、`tools/test-final-chapters.mjs`）。
- 3・4・5・7章は前半・後半の2段構成に延長済み（`design/balance-report.md` §8）。
- 後日談と結末の分岐（結婚版／仲間版）、全員集合のエピローグ（`design/script-endings.md`、`src/main.ts` `playEnding`）。
- 本編台本の全章分（`design/script-ch1-2.md`〜`script-ch9-10.md`）。2巡目の点検の指摘は反映済み（`design/review-board/scenario-audit-2026-11-16.md`）。

### 仲間・成長・戦闘
- 仲間16人、新職・上級職、支援43組（`src/data.ts` `CAST` `CLASSES` `PROMOS` `SUPPORTS`）。
- スキル（素質・流派・固有17人・職業）と上級職スキル21種（`design/systems.md` §4）。
- 武器・牙爪・杖と回復、敵AI（回復役、ボスの傷薬、`ai: 'target'`）（`src/logic.ts`）。
- 店・倉庫・売却、宝箱と訪問マス（`src/shop.ts`、`src/ui/shop-ui.ts`、`src/render/visits.ts`）。
- 難易度（カジュアル／クラシック）と、「ふつう／むずかしい」の2軸（`design/balance-report.md` §7、`src/main.ts`）。
- 勝敗条件（制圧・離脱・防衛・耐久・増援・段の切り替え）、章の副目標（`Chapter.bonus`）（`design/systems.md` §7）。
- 危険範囲の表示、連携攻撃（支援A以上・追撃）、移動タイプ×地形と支配域（`src/logic.ts` `dangerTiles` `stopTiles`、`design/systems.md` §4）。
- 控えの経験値、出撃準備の画面、パウロの流派選択（`src/logic.ts` `benchExp` `sortiePlan`、`src/main.ts`）。
- 通しの自動プレイと、全章のバランス調整（`tools/playthrough.mjs`、`design/balance-report.md`）。

### 拠点・恋愛
- 天幕（キャンプの日々23本、食卓・贈り物・稽古）（`src/ui/tent-ui.ts`、`design/script-camp.md`）。
- 告白と結婚の選択、ふたりの時間7人×3本、嫁同士の会話20本（`src/story.ts`、`design/script-romance.md`）。
- 支援会話43組・告白7枠の本文は、ゲームに全部入っている（`design/review-board/asset-audit-2026-11-16.md`）。

### 操作・画面
- カメラのスクロール、スマホの横向き画面、敵タップで自動移動して攻撃、速度設定（`src/main.ts`）。
- チュートリアル、あそびかた（ヘルプ）、演出（ボスの名乗りなど）（`src/ui/help.ts`、`src/main.ts`）。
- 第2章以降の戦闘から出撃前のキャンプに戻る撤退機能（`src/main.ts`、BOARD 2026-11-16 16:20 UTC）。
- スマホ横向きでマップを全面表示。左右上部から情報・操作を開ける（`src/ui/mobile-map.ts`、e918cb9）。
- クリア記録と引き継ぎ、鑑賞（曲・場面）（`src/main.ts`、保存キー `fittoa-save-v6`）。

### 素材
- 会話の背景21点（タイトル含む）がそろっている（`src/art-manifest.ts`、`assets/backgrounds/`）。
- Dの画風の地図は全10章を体験版へ反映（`src/art-manifest.ts` `MAP_ART`、`assets/maps/`）。
- 仲間の立ち絵と表情、結婚候補7人とヒロインのデレ顔（`assets/portraits/`、`design/review-board/codex-queue.md` Q-13）。
- BGM切替3件（二重起動・第6章の交戦復元・決着後のマップ曲復帰）を修正済み。曲選択・勝敗音の静的テストは通過（b3b0a53、`tools/test-map-music.mjs`、`tools/test-audio-transition.mjs`）。
- 音楽24曲（`assets/audio/bgm/`、`tools/build-audio.mjs`。Q-03）。
- 敵のマップ用絵（Q-02）。
- 脇役立ち絵21枚（Q-14）は採用・配布済み。難民男女は使用台詞待ち（4097aff）。

## ② 未着手・途中のもの

### こちらで進められるもの
- 遠隔治癒の「章ごと3回」と結界の杖（`src/data.ts` 杖の定義のコメント、`design/systems.md` §1）。
- ペルギウスの召喚術の「章ごと8回」の回数制（`src/data.ts`）。
- 魔術の基礎・鍵開けの効果（今は表示のみ。教本・鍵のかかった宝箱が必要）（`design/systems.md` §4）。
- アリエルの上級職（`PROMOS` に princess が無い）（`design/balance-report.md` §5）。
- 武器の持ち替え・配置の入れ替え（出撃準備）は最小版のまま（`src/main.ts` 出撃準備、`design/systems.md` §8）。
- 鑑賞の曲名は仮。「転移事件」を「遠い日の雨」に直す提案あり（低優先）（`src/main.ts` `TRACK_NAMES`、BOARD 2026-11-16 Codex の回答）。

### 絵・音の組み込みと残件
- 一枚絵19点は体験版に反映済み（9d5e165）。台本と配布ファイルは19/19点を照合。Chromeの3サイズで19点の最初の台詞と画像を表示確認済み。解放条件や長い台詞を含む通し確認は残件。茶会は「嫁同士・15」に挿入。
- 音楽の入れ替え・追加の予定は今のところ無い。

### ユーザーの判断待ち
- 訓練要素を入れるか（`design/hearing-notes.md`「実装担当への申し送り（まとめ・2026-11-16）」）。
- 嫁同士の会話の量（今は20本）。
- サラ×ルーク、クリフ×エリナリーゼの組の扱い（`src/data.ts` `SUPPORTS` のコメント）。
- アリエルのイベント絵を増やすか。
- 次の打合せで聞くこと：上記の未決項目（`design/hearing-notes.md` 末尾）。

## ③ 確認できていないこと
- 音楽24曲を実際に聴いての最終確認（`design/hearing-notes.md`）。
- 実機・スマホでの通し（横向き画面、タッチ操作、敵タップの自動移動）。
- 連携攻撃の実戦での演出、クラスチェンジ画面の「新スキル」表示、2〜6・9章の宝箱を画面で開けること（BOARD 2026-11-16 03:30 UTC）。
- 第8章の地図の崩落後の見え方、第6章の7ターン目の柵の変化の継ぎ目（BOARD 2026-11-16）。
- 人が遊んでのバランス（自動プレイは通っている）。特に第1・3〜7章の手触り（`design/balance-report.md` §5）。
- 台本の全分岐の逐語通読と、原作の一次資料との照合（獣族の習俗・口調など）（`design/review-board/scenario-audit-2026-11-16.md`）。
- 絵の組み込み後の表示（デレ顔の透過縁、リニアの耳先のトリミング、一枚絵の持ち越し範囲）（`src/ui/dialogue.ts`、Q-13 の残件）。
