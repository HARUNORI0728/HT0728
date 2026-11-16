# Q-11 第10章 D 地図候補・一次確認

- `art-samples/q11-ch10-D.png`。内蔵 imagegen で1回生成し、出力を無加工コピー。
- 入力画像は `design/map-guides/ch10-guide.png` のみ。`ch10-grid.png` と `src/chapters/ch10.ts` は配置確認のため閲覧。
- 実寸 1536 × 1024、64 × 64 px/マス。最低基準を満たす。
- 一次目視: 冬の霜と淡い朝の光、南西から北東への道と南への分岐、宿と小砦、北東の村跡・丘を確認。頂上の城の代用絵は開いた草地に変更されたが、周囲に下絵由来の立石が残る。宝箱風の小物は見当たらない。
- 残件: 地形境界の厳密なマス単位照合と、実ゲームでの移動判定・ランドマーク表示との重なりは未確認。立石が頂上の表現として適切か要確認。

## 生成プロンプト全文

```text
Use case: style-transfer. Redraw the supplied guide as a detailed realistic hand-painted fantasy tactical battle map, exactly 24 columns by 16 rows, full 3:2 canvas, minimum 1536×1024 pixels. The supplied guide is the sole authoritative terrain layout. Preserve all terrain positions, widths, boundaries, roads, forests, hills, buildings and ruins edge to edge without cropping, shifting or adding features. High near-top-down view with slight tilt. Winter dawn, frost with first pale pink light, soft dawn haze, restrained natural color and even readable lighting, hopeful and solemn mood. Preserve the old winding road from the southwest edge through the ruined roadside inn and small fort to the northeast hill, with the southward branch. Coordinates are zero-based: inn at (7,7), small fort at (8,7), southwest fort at (1,13); retain the village ruins and buildings in the northeast around (18–21,4–6). The hill summit at (16,2), centered 68.75% across and 15.625% down, should be a small open grassy summit: replace the guide's castle placeholder there with open frosty grass, not a building, and preserve its surrounding hill tiers and access road. Keep road junctions and forest, hillside and any wall or fence boundaries faithfully aligned with the guide; do not invent fences or walls. Avoid extra treasure chests, crates and boxes. No characters, animals, text, symbols, grid lines, border, compass, sky, horizon or watermark.
```

主担当目視：道の曲がりと分岐、廃宿(7,7)と小砦(8,7)、南西砦、北東の丘入口と村跡を下絵に対応させて確認。丘(16,2)の砦マスは開けた草地として表現。地形名との対応、頂上周辺の立石と後半の楔が紛らわしくないかはゲーム内で要確認。
