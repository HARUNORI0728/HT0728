# Q-11 第3章 地図納品・一次確認

- 生成：built-in image_gen、1回。配置参照 `design/map-guides/ch03-guide.png`、画風参照 `art-samples/q12-ch01-style-D.png`。章データ `src/chapters/ch03.ts` を読み、20×14を確認。
- 原本：`assets/maps/ch03.png`（生成出力を無加工コピー）。1499×1049、約74.95×74.93px/マス。縦横比は20:14にほぼ一致。
- 一次目視：日中の光と短い影、中央の川、橋1本、明るい石の浅瀬2箇所、丘の廃墟、北東の窪地、北と南の森林、道、畑と小屋を確認。文字・人物・格子・額縁は見当たらない。
- 残件：ガイドとのマス単位の厳密照合と実ゲームでの通行判定・移動範囲の確認は未実施。川と橋・浅瀬、森境界、丘の壁の開口部、山と草地の境界を要確認。画像生成は厳密な地形配置を保証しない。

## 実際のプロンプト

```text
Use case: style-transfer. Asset: chapter 3 fantasy tactics battle map, 20 by 14 tiles, exact landscape 10:7 aspect ratio. Image 1 is the absolute composition and terrain layout guide; image 2 is style reference only. Redraw image 1 in image 2's detailed realistic hand-painted fantasy style. Preserve EXACT positions, widths, outlines and extents of every terrain feature in image 1, edge to edge: north-south stream in center with northern and southern shallow fords and one bridge at the west-east road, the road turning south and east around the hill, the low eastern hill with ruined stone walls and their western opening, the pale northeastern hollow enclosed by mountains and shrubs with scattered ruins, western field and hut, tents, northern and southern forest patches. Preserve boundaries between walkable grass and dense trees, water and land, cliffs and hills; no trees outside guide forest footprints. Do not add, remove or relocate terrain features. Keep road and bridge unobstructed. Bright early-summer late morning, about 10% brighter than image 2, short soft shadows, muted natural palette. Both fords have bright visible stones and white ripples clearly distinct from deep water. High near-top-down camera with slight tilt, matching guide. No characters, animals, lettering, symbols, grid lines, frame, legend, compass, sky, horizon, or watermark.
```

## 主担当の独立目視
原本とch03-grid.pngを比較。橋(8,7)、浅瀬(9,2)(9,11)、街道の南への屈曲、丘の廃墟とL字壁、天幕2点、北東の廃墟を確認。主要位置に大きな移動は見当たらない。森と茂みの接点は樹冠が続いて見えるため全マスの一致は未保証。実ゲームの地形名と移動範囲はClaude確認待ち。1499×1049、約74.95×74.93px/マスは最新受入れ条件に適合。
