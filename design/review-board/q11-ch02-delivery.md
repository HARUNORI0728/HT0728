# Q-11 第2章 地図納品・一次確認

- 生成：built-in image_gen、1回。配置参照 `design/map-guides/ch02-guide.png`、画風参照 `art-samples/q12-ch01-style-D.png`。
- 原本：`assets/maps/ch02.png`（生成出力を無加工コピー）。1499×1049、20×14マスあたり約74.95×74.93px。目標約90px/マス（約1800×1260）に未達。縦横比は約1.429で20:14にほぼ一致。
- 一次目視：昼の光、短い影、川沿いの橋2本と明るい石の浅瀬、村の柵と開口、道、砦、南北の森林を確認。文字・人物・格子・額縁は見当たらない。画風はDに近い。
- 残件：ガイドとのマス単位の厳密照合と実ゲームでの通行判定・移動範囲の確認は未実施。特に橋(15,3)(16,7)、浅瀬(16,9)、門 北(9,4)・南(9,10)(11,10)・西(6,7)・東(13,7)、森境界を要確認。解像度不足の採否判断が必要。画像生成は厳密な地形配置を保証しない。

## 実際のプロンプト

```text
Use case: style-transfer. Asset: chapter 2 fantasy tactics battle map, 20×14 tiles, landscape aspect 10:7, approximately 1800×1260 pixels. Image 1 is the absolute composition and terrain layout guide; image 2 is style reference only. Redraw image 1 in image 2's detailed realistic hand-painted fantasy style. Preserve EXACT positions, widths, outlines and extents of every terrain feature in image 1, edge to edge: northern and southern forest patches with crisp boundaries, village palisade with its existing gaps and houses and ruins, horizontal road and west fort, eastern winding north-south river with both wooden bridges and southern ford, northeast fort, mountains, fields and hill. Do not invent, remove or relocate features. Keep road and bridges unobstructed. Bright early-summer daytime, about 10% brighter than image 2, short soft shadows, muted natural palette. Ford has bright visible stones and white ripples clearly distinct from deep water. Dense forest stays within its guide footprint; no trees on grass tiles. High near-top-down camera with slight tilt, matching guide. No characters, animals, lettering, symbols, grid lines, frame, legend, compass, sky, horizon, or watermark.
```

## 主担当確認
主要な橋2箇所・浅瀬・柵の開口を目視。約75px/マスのため正式納品扱いにせず art-samples/q11-ch02-D-draft.png へ移動。assets/mapsには登録していない。目標解像度と格子照合が残件。
