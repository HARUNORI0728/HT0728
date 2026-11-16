# Q-11 第9章 D 地図候補・一次確認

- `art-samples/q11-ch09-D.png`。内蔵 imagegen で1回生成し、出力を無加工コピー。
- 入力画像は `design/map-guides/ch09-guide.png` のみ。`ch09-grid.png` と `src/chapters/ch09.ts` は配置確認のため閲覧。
- 実寸 1536 × 1024、ちょうど 64 × 64 px/マス。最低基準を満たす。
- 一次目視: 薄雪、廃墟と東西城壁、中央の閉門、左右の破れ目・通用路、北の館砦と二つの見張り砦、南の陣地・天幕を確認。宝箱風の小物は見当たらない。中央の門は3マス範囲内に見える。
- 残件: 全地形境界の厳密なマス単位照合、実ゲームでの通行判定および城門3マスの道タイル上書き後の継ぎ目は未確認。

## 生成プロンプト全文

```text
Use case: style-transfer. Redraw the supplied guide as a detailed, realistic hand-painted fantasy tactical battle map, exactly 24 columns by 16 rows, full 3:2 canvas, minimum 1536×1024 pixels. The supplied guide is the sole authoritative terrain layout. Preserve all terrain feature positions, widths, boundaries, roads, wall gaps and open ground edge to edge without cropping, shifting or adding features. High near-top-down view with slight tilt. Beginning of winter, cold overcast grey daylight, restrained muted colors, thin snow on ground, ruined city of Roa with broken houses and rubble north of the wall, fields and army camp south of it. Render the east-west stone wall at row 7. Its central three tiles (11,7), (12,7), (13,7) must be a visibly CLOSED gate, plain and compact without ornament or projections beyond those three cells; its middle is 52.08% across and 46.875% down. These tiles later change to road, so keep surroundings simple. Keep wall breaches at (3,7) and (20,7), road postern openings at (7,7) and (16,7), all in exact locations of the guide. Preserve the north manor fortress (12,0), two watch forts (10,1) and (14,1), southern camp fort (12,13), tents and all fields, paths and ruined buildings in their exact guide locations. Avoid extra treasure chests, boxes and crates. No characters, animals, text, symbols, grid lines, border, compass, sky, horizon or watermark. Keep terrain boundaries readable and lighting even for game pieces.
```

主担当の目視照合：中央閉門、城壁の脇道2本と破れ目2箇所、北3砦と南砦を格子下絵に対応させて確認。閉門の木扉は中央1〜2マス分に見えるが、他の開門対象は連続した城壁で覆われている。後半に3マスが道に変わった際の継ぎ目は未確認。
