# Q-04 迷宮と敵の本陣（先行版）

内蔵の画像生成機能で作成。既存の `assets/backgrounds/camp_day.png` を目視し、遠近感と画面下部の明暗の参考にした。

| 納品先 | PNG 実寸 | 目視確認 |
|---|---|---|
| `assets/backgrounds/labyrinth.png` | 1672 × 941 | 暗い岩壁に紫の結晶脈が走り、左右の通路の上に光の粒が漂う。画面下部は暗い岩床。人物・文字・枠なし。 |
| `assets/backgrounds/noble_camp.png` | 1672 × 941 | 紺色と銀縁の天幕が整列し、旗、槍立て、火台が夕暮れの中に見える。画面下部は暗めの土と草地。人物・文字・枠なし。 |

両方ともほぼ16:9（厳密な比率との差は高さ0.5px相当）。最低解像度1920 × 1080は未達。先行版には生成時のPNGを無加工で使用した。

## 生成プロンプト

### labyrinth.png

```text
Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it. Inside a magical labyrinth cave with smooth dark stone walls, faint violet crystal veins glowing in the dark, drifting motes of light, eerie. Wide eye-level view from a chamber into two passages separated by a massive smooth rock pier. Layered dark slate and eggplant tones, diffuse violet glimmers along fractures and sparse drifting motes mostly above midline. Keep the near floor unobstructed, broad, shaded and low detail across the lower third. Soft hand-painted anime background treatment. Fully opaque PNG, full bleed exact 16:9 landscape, 2048 × 1152 pixels. No UI, marks, lettering, or watermark.
```

### noble_camp.png

```text
Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it. A military encampment of a noble's private army, orderly rows of navy-blue tents with silver trim, banners, weapon stands, torches at dusk. Eye-level wide view down an orderly central aisle in an open field, with matching dark navy canvas and narrow silver edging crisp enough to distinguish, simple navy banners with subtle silver geometric trim, and unoccupied racks holding upright spears. Small warm flames stand among the tents in the middle distance, under a cool, muted dusk sky. Leave the lower third as shaded unobstructed beaten earth and sparse low grass. Soft hand-painted anime environment art. Fully opaque PNG, full bleed exact 16:9 landscape, 2048 × 1152 pixels. No UI, lettering, or watermark.
```

追記：生成時は旧1920×1080基準で先行版と記録したが、BOARDのClaude 2026-11-15 08:55 UTCの幅1600以上・およそ16:9への変更を確認し、今回の1672×941原本は新基準に適合と扱う。
