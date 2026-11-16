# Q-11 第6章 地図納品・一次確認

- 生成：built-in image_gen、1回。配置参照 `design/map-guides/ch06-guide.png`、画風参照 `art-samples/q12-ch01-style-D.png`。`src/chapters/ch06.ts` を読み22×15を確認。
- 原本：`assets/maps/ch06.png`（生成出力を無加工コピー）。1519×1036、約69.05×69.07px/マス。縦横比は22:15にほぼ一致。
- 一次目視：暖かく明るい光、キャンプの柵・門と砦、北の崩れた城壁、東の川、橋と石の浅瀬、天幕・家屋・畑を確認。東側の下部の柵は壊れていない。文字・人物・格子・額縁は見当たらない。
- 残件：マス単位の厳密照合と実ゲームでの通行判定・移動範囲、途中の地形変更との継ぎ目は未確認。特に開始時の柵(13,11)(13,12)、橋(16,5)、浅瀬(17,9)、食糧庫(9,12)、北門(8,6)、西東の道路開口と森林境界を確認する。画像生成は地形配置の厳密な一致を保証しない。

## 実際のプロンプト

```text
Use case: style-transfer. Asset: chapter 6 fantasy tactics battle map, 22 by 15 tiles, landscape aspect 22:15. Image 1 is the absolute terrain layout guide; image 2 is style reference only. Redraw image 1 in image 2's detailed realistic hand-painted fantasy style. Preserve EXACT positions, widths, outlines and gaps of all terrain features of image 1 edge to edge: central south refugee camp enclosed by wooden palisade, intact eastern fence including its two lower segments, north west and east gate road openings and adjacent stone forts; tents on west, houses and fields on east, central southern storehouse, ruined northern city wall with its existing breaks, all roads, eastern north-south river, its upper bridge and lower shallow ford, hills, fields, woods and mountains. Do not change the camp's fence or add gaps: it is the intact initial state. Keep road and gates unobstructed. Preserve exact boundaries between walkable grass and forest, fences, water, wall and mountains. Do not add, remove or relocate terrain features. Warm clear late-summer light, readable and not dark, short soft shadows, muted natural palette. Ford with bright visible stones and white ripples distinct from deep water. High near-top-down camera with slight tilt matching guide. No characters, animals, lettering, symbols, grid lines, frame, legend, compass, sky, horizon, or watermark.
```

## 配置修正の再生成

初回原本は `art-samples/q11-ch06-layout-v1.png` に無加工で保存。下絵を主参照、初回原本を画風参照に1回再生成し、`assets/maps/ch06.png` に無加工保存。1519×1036、約69px/マス。一次目視では食糧庫の建物中心は依然 y約820（目標約863）で上寄り、南柵もほぼ同じ位置であり、指定した配置修正は達成できていない。橋も左寄りの懸念が残る。マス照合・実ゲーム確認は未実施。採否は保留。

```text
Use case: style-transfer. Redraw image 1 as a fantasy tactics map, using image 2 for rendering style only; image 1 is the sole authoritative terrain layout. Exact 22 columns by 15 rows, 22:15 aspect ratio, no cropping. Match every feature's center, boundaries and proportions to image 1, especially lower camp; do not shift or compress the lower rows. Coordinates are zero-based: center the southern storehouse at (9,12), i.e. 43.18% across and 83.33% down the full canvas; put the horizontal southern palisade in row 13, centered 90% down; center the bridge at (16,5), 75% across and 36.67% down; center the rocky ford at (17,9), 79.55% across and 63.33% down. Keep the eastern palisade intact in (13,11) and (13,12). Keep north, west and east gate road openings clear. Retain the exact positions of all roads, tents, buildings, fields, river, forest, hill, mountains, stone walls and gaps shown in image 1. Bright readable warm late-summer daylight, short soft shadows. Render clear light stones and white ripples at ford. Top-down slight tilt. No characters, animals, text, symbols, grid lines, border, compass, sky, or watermark.
```

## 統合判断
修正版でも食糧庫の中心が約y820で、(9,12)の中心y約863に対して上寄り。南柵も上へずれ、主担当目視でも未達。2案ともart-samples/q11-ch06-layout-v1.png/v2.pngへ保管、assets/maps/ch06.pngは置かず不採用試作として保存。ゲームには既存の自動描画が残る。手動拡大・補正はしていない。次は下絵に対する参照の与え方を見直す。
