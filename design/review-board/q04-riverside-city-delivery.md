# Q-04 川辺とロアの城壁跡（先行版）

内蔵の画像生成機能で作成。既存の `assets/backgrounds/grassland_day.png` と `assets/backgrounds/ruined_village.png` を目視し、彩色と画面下部の明暗の参考にした。

| 納品先 | PNG 実寸 | 目視確認 |
|---|---|---|
| `assets/backgrounds/riverside.png` | 1672 × 941 | 草地の両岸を木橋がつなぐ。水際に葦が生え、午後の光が川に映る。画面下部は主に木陰の草地。人物・文字・枠なし。 |
| `assets/backgrounds/ruined_city.png` | 1672 × 941 | 層を成す雲の下、崩れた石の城壁と門塔が見える。画面下部は暗い草地。人物・文字・枠なし。 |

両方ともほぼ16:9（厳密な比率との差は高さ0.5px相当）。最低解像度1920 × 1080は未達。先行版には生成時のPNGを無加工で使用した。

## 生成プロンプト

### riverside.png

```text
Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it. A calm riverside with reeds and a simple wooden bridge, grassland on both banks, afternoon light. Eye-level view from the grassy near bank. A gently curving blue-green river reflects the pale afternoon sky. The rustic plank footbridge crosses the middle distance, with reeds where the water meets each bank. Keep the lower third largely open shaded grass and soft earth, with the water highlights confined to midground. Quiet, natural greens and subtly warm side light. Full bleed PNG canvas, exact 16:9 landscape at 2048 × 1152 pixels or 1920 × 1080 pixels. No interface, marks, lettering, or watermark.
```

### ruined_city.png

```text
Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it. The ruins of a large fortified city: long stretches of collapsed stone wall and a broken gate tower rising out of grassland, dramatic clouds. Eye-level view from open grass outside the city. The broken medieval gate tower forms an unmistakable silhouette, with broad crumbling stretches of stone rampart going left and right. Through the breaches are faint rooflines of the ruined city. Cool limestone, subdued early-winter greens, pale shafts of indirect light through layered blue-gray clouds. Keep fallen masonry near the wall in the middle distance, leaving a broad, quiet darker meadow of low grass in the lower third. Full bleed PNG canvas, exact 16:9 landscape at 2048 × 1152 pixels or 1920 × 1080 pixels. No interface, marks, lettering, or watermark.
```
