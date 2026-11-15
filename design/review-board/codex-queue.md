# Codex 向けの作業キュー（返事を待たずに進めてよいもの）

2026-11-14 / Claude。ユーザーから「Codex 側も能動的に動けるような指示があるとよい」と要望がありました。

**進め方**：下の表を上から見て、「空き」のものを選び、BOARD.md に「Q-xx 着手」と1行書いてから始めてください。**Claude の返事や合意を待つ必要はありません。** 終わったら BOARD.md に、コミット、確認結果、残件を書いてください。表の「状態」も書き換えてください（表は両者が更新してよい）。1時間ごとの確認のたびに、手が空いていれば次の「空き」に進んでください。

判断に迷う点（物語の意図、台詞の文面、選曲）だけ、掲示板で Claude に聞いてください。それ以外は Codex の判断で決めて、決めた内容を報告してもらえれば十分です。

## いま Claude が持っている作業（触らない）

| 作業 | ファイル | 状態 |
|---|---|---|
| 第3・4章の仕上げ | `src/chapters/ch03.ts`、`ch04.ts` | 作業中（上限が解除されたため再開） |
| 第7・8章の章データ | `src/chapters/ch07.ts`、`ch08.ts` | 作業中（同上） |
| 台本の文面と選曲 | `design/script-*.md` | 随時 |

## キュー

| ID | 作業 | 触るファイル | 完了の目安 | 状態 |
|---|---|---|---|---|
| Q-01 | **第9・10章の章データ**。2段構成（9章：防衛→制圧、10章：オルステッド戦の耐久→使徒戦）、ペルギウス加入、オルステッドのゲスト参戦、`ending: true`。仕様は handoff-to-codex.md。見本は `ch05.ts`・`ch06.ts`・`dev.ts` | `src/chapters/ch09.ts`、`ch10.ts` | 自動プレイで通しクリア、会話が全部発生、地図画像を保存 | 完了（実装・自動検証済み、通常速度の通しプレイは残件） |
| Q-02 | **3章以降の敵のマップ用絵**：鳥、残滓の影、残滓の結晶、私兵の重騎士、残光の大熊、森の主、頭目バラク。プロンプトは `design/plot.md §6.1〜6.2`、絵柄の仕様は `design/map-and-enemy-prompts.md §1`（既存の `assets/units/*.png` と絵柄をそろえる） | `assets/units/` | 7点を納品。ファイル名は plot.md の指定どおり | 完了（7点・透過/縮小確認・ゲーム取り込み済み） |
| Q-03 | **残りのBGM**：優先順に prologue、comedy、map_resolve、romance、orsted、final_boss、ending、map_final、ジングルの levelup・classchange・support。仕様は `design/asset-orders.md §1` | `assets/audio/bgm/` | 数値検品つきで納品 | 完了（素材納品・数値検品済み、実聴取は残件） |
| Q-04 | **会話の背景**：優先順に forest、forest_residue、buena_hill、riverside、ruined_city、battlefield_dusk、labyrinth、noble_camp、sky_fortress、white_void、rebuilt_village、home_inside、camp_sunset、camp_dawn。仕様は `design/asset-orders.md §2` と `design/plot.md §6.4` | `assets/backgrounds/` | 納品 | 空き |
| Q-05 | **一枚絵**：優先順に ev_sylphie_reveal（4章）、ev_eris_memorial（9章）、告白7枚、ev_orsted_farewell、ev_epilogue_all、嫁同士1枚。仕様は `design/plot.md §6.3` と `design/portrait-prompts.md` | `assets/events/` | 納品 | 空き |
| Q-06 | **完成済みの章の通しプレイとバランスの記録**：序章〜2章、5・6章を通常の成長で進め、章ごとの勝率・ターン数・倒れやすい仲間・レベルの伸びを記録する。数値を直す提案は掲示板に書く（章のファイルを直す場合は、その章の担当が空いているか確認） | 記録は `design/review-board/` に新規ファイル | 記録と提案 | 空き |
| Q-07 | **ボス曲の鳴らし方の見直し**（合意済みの別件）：倒さなくてよいボスの章で鳴り続けないよう、ボスが絡む戦闘の間だけボス曲にする、または敵軍フェイズでは map_enemy に戻す | `src/audio/engine.ts`、`src/main.ts` の曲の切替 | 自動テストつきで実装 | 空き |
| Q-08 | **宝箱と村の訪問**（plot.md §5 の M13）と、迷宮の石床・岩壁の専用の見た目（M9）。完成したら7・8章への反映方法を掲示板に書く | `src/logic.ts`、`src/main.ts`、`src/render/terrain*.ts` | テスト用の章で動作確認 | 空き |
| Q-09 | **台本の2巡目の確認**：3〜10章と支援会話について、原作設定との食い違い、章をまたぐ伏線の回収漏れ、呼び方や一人称のぶれを確認し、指摘を掲示板に書く（文面の修正は Claude） | なし（指摘のみ） | 指摘の一覧 | 空き |
| Q-10 | **スキル、店と所持品**（systems.md §2〜4）。無くても最後まで遊べる追加要素。着手前に、どこまで作るかを掲示板に書く | `src/logic.ts`、`src/main.ts`、`src/data.ts` | — | 空き・優先度低 |

## 決まり（再掲）

- 章のファイルは1章1担当。`src/data.ts` への追記は行単位にとどめ、編集の直前に最新を取り込む。
- コードを触った側がビルドして、生成物（`src/script/scenes.ts`、マニフェスト、`play/`）も一緒にコミットしてよい。取り込みで生成物が衝突したら、どちらかを採ってビルドし直す。
- 素材だけを追加する場合は `assets/` の元ファイルだけコミットすればよい。Claude 側でビルドして体験版に入れる。
