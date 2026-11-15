# Q-04 先行背景3点（2026-11-15）

内蔵画像生成で `assets/backgrounds/forest.png`、`forest_residue.png`、`buena_hill.png` を制作。森2点をSOL、丘と最終確認をCodexが担当。今回は元PNGと記録のみの先行納品で、ゲームの再ビルド・ブラウザー内表示検証は未実施。

3点とも1672×941、RGB PNG。人物・文字なし、下部を暗めで簡素にした構図を目視確認。丘は苗木・支柱・古い切り株・遠景の再建中の村を確認。森は明るい木漏れ日、残滓版は白紫の結晶と遠景の光柱を確認。森2点は同系統の構図だが樹木の位置が完全一致する差分ではない。

**仕様未達**：1920×1080以上、厳密な16:9の指定には届いていない。内蔵画像生成に解像度を明示して再試行しても1672×941だったため、引き伸ばさず初回の生成ファイルを保持した。Q-04は作業中のまま。高解像度版への差し替え、残りの背景、ゲームへの取り込み・台詞枠と立ち絵を重ねた確認が残る。生成物の寸法・ハッシュは `q04-background-qa.json`。

森のプロンプトは `q04-forest-delivery.md`。以下は丘の採用版の全プロンプト。参照画像は既存の `assets/backgrounds/grassland_day.png`（絵柄の参照）。

```text
Use case: illustration-story. Asset type: finished visual-novel conversation background, buena_hill.png. Create a landscape 1920x1080 pixel or 2048x1152 pixel image, exact 16:9. Input image is STYLE REFERENCE ONLY, not an edit target. Match its painterly but clean anime background, soft natural light and slightly muted colors. New scene: A gentle grassy hill above a quiet countryside at golden late afternoon, a single young sapling tied to a small wooden stake at the top of the hill where a great old tree once stood (a faint old stump beside it), wide sky, distant fields and the outline of a village being rebuilt. Keep the sapling visibly young and small, the old stump understated, no giant tree. No characters, no people, no text, no frame, no logos. Lower third simple softly shaded grass, a little darker, suitable for character portraits and dialogue box overlays. Peaceful, bittersweet hope after loss. Deliver one full-bleed finished background, not a collage or mockup.
```

解像度の再試行では同じ画像を2048×1152にするよう指定したが、結果は1672×941だったため採用しなかった。
