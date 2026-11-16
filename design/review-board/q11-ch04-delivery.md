# Q-11 第4章 地図納品・一次確認

- 生成：built-in image_gen、1回。配置参照 `design/map-guides/ch04-guide.png`、画風参照 `art-samples/q12-ch01-style-D.png`。`src/chapters/ch04.ts` を読み20×14を確認。
- 原本：`assets/maps/ch04.png`（生成出力を無加工コピー）。1499×1049、約74.95×74.93px/マス。縦横比は20:14にほぼ一致。
- 一次目視：日中の光と短い影、東西の街道、北の関所と道、町の家や廃墟、南の畑、東の礼拝堂と壁の開口を確認。文字・人物・格子・額縁は見当たらない。
- 残件：ガイドとのマス単位の厳密照合と実ゲームの通行判定・移動範囲は未実施。特に砦(10,1)、南門(10,3)、西の崩れた壁(8,3)、礼拝堂西口(14,10)・東口(18,10)、祭壇(16,9)への南側からの接近、森林・山・壁の境界を要確認。画像生成は地形配置の厳密な一致を保証しない。

## 実際のプロンプト

```text
Use case: style-transfer. Asset: chapter 4 fantasy tactics battle map, 20 by 14 tiles, landscape 10:7 aspect ratio. Image 1 is the absolute terrain layout guide; image 2 is style reference only. Redraw image 1 in image 2's detailed realistic hand-painted fantasy style. Preserve EXACT positions, widths, outlines, gaps and extents of every terrain feature in image 1, edge to edge: straight east-west highway across the center, north-south road to the north-central mountain pass fort, its stone walls and openings, ruined post-town houses, fences and ruins, the eastern ruined chapel's rectangular stone walls, openings and interior house, northeast hills and trees, southern divided fields, mountains and forest. Preserve all wall openings and boundaries between walkable grass and dense trees or impassable walls and cliffs. Do not add, remove or relocate terrain features. Keep roads unobstructed. Bright early-summer midday with short soft shadows and muted natural palette, a little brighter than image 2. High near-top-down camera with slight tilt matching guide. No characters, animals, lettering, symbols, grid lines, frame, legend, compass, sky, horizon, or watermark.
```

## 主担当確認
原本と下絵・章データを目視比較。砦(10,1)付近の南門、西の廃墟開口、礼拝堂の両側開口と祭壇南側の空間を確認。砦・北へ伸びる道はセル内でやや左寄りに見えるためゲーム内で地形名と制圧マスを優先照合。全マス一致と実ゲーム通行は未検証。
