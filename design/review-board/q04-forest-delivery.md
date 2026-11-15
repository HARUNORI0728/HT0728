# Q-04 森の会話背景（先行版）

内蔵の画像生成機能で作成。既存の `assets/backgrounds/grassland_day.png` の彩色と、手前を暗めにした構図を目視で参照した。

| 納品先 | PNG 実寸 | 目視確認 |
|---|---|---|
| `assets/backgrounds/forest.png` | 1672 × 941 | 高い木々、木漏れ日、苔の道。画面下約3分の1は暗く、模様を抑えた地面。人物・文字・枠なし。 |
| `assets/backgrounds/forest_residue.png` | 1672 × 941 | 白と紫の結晶、遠景の細い白い光柱、浮遊する光の粒。結晶は主に中景にあり、画面下約3分の1は暗い地面。人物・文字・枠なし。 |

両方ともほぼ16:9（厳密な16:9との差は高さ0.5px相当）。指定した最低解像度1920 × 1080は未達。通常の森を個別に4K指定で再生成しても1672 × 941だった。先行版には初回生成PNGをそのままコピーした。

## 生成プロンプト

### forest.png

```text
Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it. A deep temperate forest with tall trees, shafts of light through the canopy, a mossy path. Eye-level landscape with layered trunks in soft aerial perspective, natural olive greens and earthy bark, pale warm sunlight concentrated in the middle distance. The entire lower third is gently shaded with a broad unbroken mossy path and very sparse, soft ground cover. Hand-painted anime environment art with nuanced soft daylight. Full bleed, no UI, no logos, no watermark. Render the actual output canvas at exact 16:9 landscape, 2048 × 1152 pixels or larger.
```

### forest_residue.png

```text
Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it. A temperate forest clearing where the ground and tree roots are overgrown with jagged pale white and violet crystals that glow softly, a faint pillar of white light rising in the distance, motes of light drifting, beautiful but unsettling. Broad eye-level view into the clearing with layered tree silhouettes, restrained misty olive and purple palette. Place the crystals and light motes around the roots and along the side edges of the clearing in the middle distance. Use broad, muted, shaded ground across the entire lower third for dialogue UI readability. Hand-painted anime environment art with subdued light and deep woodland atmosphere. Full bleed, no UI, no logos, no watermark. Render the actual output canvas at exact 16:9 landscape, 2048 × 1152 pixels or larger.
```

### forest.png の再試行

```text
Preserve the attached forest artwork exactly including composition, colors, all subject placement, and dark simple lower third. Re-render at 3840 × 2160 pixel 4K native canvas resolution, exact 16:9 landscape. Output the same original image at larger resolution. No letterbox, no border, no characters or text.
```
