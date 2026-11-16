# Codex 向けの作業キュー（返事を待たずに進めてよいもの）

2026-11-14 / Claude。ユーザーから「Codex 側も能動的に動けるような指示があるとよい」と要望がありました。

**進め方**：下の表を上から見て、「空き」のものを選び、BOARD.md に「Q-xx 着手」と1行書いてから始めてください。**Claude の返事や合意を待つ必要はありません。** 終わったら BOARD.md に、コミット、確認結果、残件を書いてください。表の「状態」も書き換えてください（表は両者が更新してよい）。1時間ごとの確認のたびに、手が空いていれば次の「空き」に進んでください。

判断に迷う点（物語の意図、台詞の文面、選曲）だけ、掲示板で Claude に聞いてください。それ以外は Codex の判断で決めて、決めた内容を報告してもらえれば十分です。

## いま Claude が持っている作業（触らない）

| 作業 | ファイル | 状態 |
|---|---|---|
| 第3・4章 | `src/chapters/ch03.ts`、`ch04.ts` | 完成（バランスの直しは Q-06 の提案を受けて Claude が行う） |
| 第7・8章 | `src/chapters/ch07.ts`、`ch08.ts` | 完成（同上） |
| 台本の文面と選曲 | `design/script-*.md` | 随時 |

## キュー

| ID | 作業 | 触るファイル | 完了の目安 | 状態 |
|---|---|---|---|---|
| Q-01 | **第9・10章の章データ**。2段構成（9章：防衛→制圧、10章：オルステッド戦の耐久→使徒戦）、ペルギウス加入、オルステッドのゲスト参戦、`ending: true`。仕様は handoff-to-codex.md。見本は `ch05.ts`・`ch06.ts`・`dev.ts` | `src/chapters/ch09.ts`、`ch10.ts` | 自動プレイで通しクリア、会話が全部発生、地図画像を保存 | 完了（Codex）。地図の見た目の直しを依頼中 |
| Q-02 | **3章以降の敵のマップ用絵**：鳥、残滓の影、残滓の結晶、私兵の重騎士、残光の大熊、森の主、頭目バラク。プロンプトは `design/plot.md §6.1〜6.2`、絵柄の仕様は `design/map-and-enemy-prompts.md §1`（既存の `assets/units/*.png` と絵柄をそろえる） | `assets/units/` | 7点を納品。ファイル名は plot.md の指定どおり | 完了（Codex） |
| Q-03 | **残りのBGM**：優先順に prologue、comedy、map_resolve、romance、orsted、final_boss、ending、map_final、ジングルの levelup・classchange・support。仕様は `design/asset-orders.md §1` | `assets/audio/bgm/` | 数値検品つきで納品 | 完了（Codex） |
| Q-04 | **会話の背景**：優先順に forest、forest_residue、buena_hill、riverside、ruined_city、battlefield_dusk、labyrinth、noble_camp、sky_fortress、white_void、rebuilt_village、home_inside、camp_sunset、camp_dawn、boreas_memorial（9章幕間・一覧漏れ補完）。仕様は `design/asset-orders.md §2` と `design/plot.md §6.4` | `assets/backgrounds/` | 納品 | 完了（全15点納品・ゲーム用登録・静的検品済み。朝版の台本指定と全場面表示確認は残件） |
| Q-05 | **一枚絵**：優先順に ev_sylphie_reveal（4章）、ev_eris_memorial（9章）、告白7枚、ev_orsted_farewell、ev_epilogue_all、嫁同士1枚。仕様は `design/plot.md §6.3` と `design/portrait-prompts.md` | `assets/events/` | 納品 | 空き |
| Q-06 | **完成済みの章の通しプレイとバランスの記録**：序章〜2章、5・6章を通常の成長で進め、章ごとの勝率・ターン数・倒れやすい仲間・レベルの伸びを記録する。数値を直す提案は掲示板に書く（章のファイルを直す場合は、その章の担当が空いているか確認） | 記録は `design/review-board/` に新規ファイル | 記録と提案 | Claude が着手 |
| Q-07 | **ボス曲の鳴らし方の見直し**（合意済みの別件）：倒さなくてよいボスの章で鳴り続けないよう、ボスが絡む戦闘の間だけボス曲にする、または敵軍フェイズでは map_enemy に戻す | `src/audio/engine.ts`、`src/main.ts` の曲の切替 | 自動テストつきで実装 | 完了（敵軍フェイズは敵軍曲優先。自動検証・build・型検査済み、実聴取未実施） |
| Q-08 | **宝箱と村の訪問**（plot.md §5 の M13）と、迷宮の石床・岩壁の専用の見た目（M9）。完成したら7・8章への反映方法を掲示板に書く | `src/logic.ts`、`src/main.ts`、`src/render/terrain*.ts` | テスト用の章で動作確認 | 完了（Claude） |
| Q-09 | **台本の2巡目の確認**：3〜10章と支援会話について、原作設定との食い違い、章をまたぐ伏線の回収漏れ、呼び方や一人称のぶれを確認し、指摘を掲示板に書く（文面の修正は Claude） | なし（指摘のみ） | 指摘の一覧 | 空き |
| Q-10 | **スキル、店と所持品**（systems.md §2〜4）。無くても最後まで遊べる追加要素。着手前に、どこまで作るかを掲示板に書く | `src/logic.ts`、`src/main.ts`、`src/data.ts` | — | 完了（Claude） |
| Q-11 | **描いた地図**。下絵 `design/map-guides/chNN-guide.png` を入力に、配置を変えずに描き直す。発注文は `design/map-paint-prompts.md`。まず第8章と第1章の2枚を試作し、ユーザーの確認後に残り8章 | `assets/maps/` | grid 画像と見比べてずれが無いこと | **D の画風で量産**（2→3→4→5→6→8→7→9→10。1章は完了）。直しは BOARD 21:10 |
| Q-12 | **地図の画風の候補出し（最優先）**。第1章の地図を画風違いで3〜4種類。詳細は BOARD 2026-11-15 15:10 UTC。採否は Claude が決める | `art-samples/q12-ch01-style-*.png` | 格子を重ねて境目が読めること | 完了。**D（写実寄り）を採用**（BOARD 2026-11-15 21:10 UTC） |
| Q-13 | **ヒロイン6人のデレ顔の立ち絵**（sylphiette / roxy / eris / sara / linia / pursena の `_dere`）。詳細は BOARD 15:10 | `assets/portraits/` | 衣装・画風・寸法を保ち、感情に合う自然なポーズへ変更（ユーザー指示） | 完了（6/6素材納品・寸法透過目視済み。全場面表示と透過縁は残件） |
| Q-14 | **脇役の立ち絵**（hanna、toto、belt、adventurer、bandit、soldier、surveyor、envoy、beastkid、refugee_m、refugee_f）。詳細は BOARD 15:10 | `assets/portraits/` | 仲間の立ち絵と画風が同じ | 空き |

## 決まり（再掲）

- 章のファイルは1章1担当。`src/data.ts` への追記は行単位にとどめ、編集の直前に最新を取り込む。
- コードを触った側がビルドして、生成物（`src/script/scenes.ts`、マニフェスト、`play/`）も一緒にコミットしてよい。取り込みで生成物が衝突したら、どちらかを採ってビルドし直す。
- 素材だけを追加する場合は `assets/` の元ファイルだけコミットすればよい。Claude 側でビルドして体験版に入れる。
