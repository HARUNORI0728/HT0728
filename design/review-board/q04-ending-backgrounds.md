# Q-04 対峙と後日談の会話背景

内蔵の画像生成機能で作成。既存の `assets/backgrounds/tent_inside.png` と `assets/backgrounds/grassland_day.png` を目視し、彩色と前景の明暗の参考にした。

| 納品先 | PNG 実寸 | 目視確認 |
|---|---|---|
| `assets/backgrounds/white_void.png` | 1672 × 941 | 淡い地平線、横に流れる薄霧、上部に細い光の亀裂。下部は一段暗い灰白色。 |
| `assets/backgrounds/rebuilt_village.png` | 1672 × 941 | 午後の光を浴びた木造家屋、麦畑、小川沿いの水車小屋、柵のそばの木の玩具。下部は主に木陰の小道。 |
| `assets/backgrounds/home_inside.png` | 1672 × 941 | 木造の室内に暖炉、家族分の食器を並べた食卓、本棚と壁に立て掛けた杖。窓から夕日が差し、下部は陰になった板張りの床。 |

3点とも人物・文字・枠はなく、台詞枠の位置に当たる下部は情報量を抑えた構図。いずれもほぼ16:9（厳密な比率との差は高さ0.5px相当）。生成時の無加工PNGで、改定された幅1600px以上の条件を満たした。

## 生成プロンプト

### white_void.png

```text
Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it. An endless pale white void with a faint horizon line and thin drifting mist, unsettling emptiness, very subtle cracks of light in the sky. A barely perceptible horizon where ivory sky merges with pearly gray ground, wisps of mist drifting horizontally, delicate short hairline traces of white light high in the sky. Restrained luminous brushwork. Keep foreground empty in a soft pearl-gray tone, a little darker than the diffuse upper light. No recognizable landscape, props, runes, central portal or figures. Full bleed opaque 16:9 landscape PNG at 2048 × 1152 pixels.
```

### rebuilt_village.png

```text
Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it. A newly rebuilt farming village with fresh timber houses, golden wheat fields, a small mill by a stream, children's toys left by a fence, bright peaceful afternoon. Eye-level wide view from a grassy lane. Use warm new timber, neatly thatched roofs, a weathered wood waterwheel on the small mill beside the stream, and a simple wooden toy horse and small wooden wheel by a fence in midground. Golden wheat and soft greens, natural painterly anime texture. Retain a broad, gently shaded and lightly textured grassy path in the lower third. No signage, lettering, watermarks, or interface. Full bleed opaque 16:9 landscape PNG at 2048 × 1152 pixels.
```

### home_inside.png

```text
Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it. A cozy wooden house interior with a hearth, a dining table set for a family, shelves of books and a staff leaning in the corner, warm evening light through the window. Wide eye-level view of a modest medieval timber home. Set the table in the middle distance with simple ceramic plates and cups; put the book shelves and a plain wooden staff along the wall where they read as separate objects. Warm amber sidelight through a real window and quiet firelight from the hearth. Leave the foreground largely open, shaded, subtly textured wooden floorboards for dialogue. No lettering, watermarks, or interface. Full bleed opaque 16:9 landscape PNG at 2048 × 1152 pixels.
```
