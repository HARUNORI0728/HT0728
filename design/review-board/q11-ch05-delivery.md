# Q-11 第5章地図

- 配置参照: `design/map-guides/ch05-guide.png`、画風参照: `art-samples/q12-ch01-style-D.png`。章データ `src/chapters/ch05.ts` と発注文を確認。
- 生成方式: built-in image_gen、2画像参照。出力 `assets/maps/ch05.png` は生成原本の無加工コピー。
- 実測: 1499 × 1049 px、20×14 マス換算で約 74.95 × 74.93 px/マス、RGB。
- 一次目視: 北東の泉から西へ流れる川、中央の橋、西と東の石の浅瀬、南西から北へ曲がる道、北中央の岩山と丘、南西の2張の天幕を確認。文字・格子・人物なし。明るい昼の画風。
- 残件: 生成絵の川岸や森、丘・崖などは有機的な形に変化しており、元のマス境界と完全一致する保証はない。橋 (9,7)、浅瀬 (4,8)(15,6)、丘 (8,3)(9,3)(8,4)(9,4) の南口、天幕 (0,13)(3,13) を含め、ゲーム上で格子を重ねて通行判定との照合が必要。ビルド・ゲーム確認は未実施。

## 生成プロンプト全文

```text
Use case: stylized-concept. Asset: top-down fantasy tactics battle map for chapter 5, 20 columns by 14 rows. Image 1 is the exact terrain layout to repaint; Image 2 is the visual style reference only, not layout. Preserve image 1's terrain positions, outlines, widths, boundaries, turns, and relative sizes exactly, with no added or removed features. The east-west stream runs from the northeast spring to the west edge; preserve its shape, wooden bridge at the central road crossing, and both distinctly visible rocky shallow fords at west and east. Preserve the winding trade road from the southwest edge to the north edge, two southwest tents, the northern central rocky mountain and hill with cliffs, northeastern water and mountains, exact forest clusters, clearings, small hills and stone ruins. Every impassable water, cliff and mountain boundary must remain exactly where it is in image 1. Render as the richly detailed hand-painted fantasy strategy map in image 2, directly overhead with slight tilt, readable ground texture. High summer, bright even daylight, short soft shadows; clear blue shallow crossings. Fill the canvas edge to edge. No people, animals, characters, letters, numbers, symbols, grid, border, legend, compass, or UI. Preserve 10:7 aspect ratio, aim approximately 1500 x 1050 pixels or larger.
```

## 主担当確認
原本と下絵・章データを目視比較。橋(9,7)、浅瀬(4,8)(15,6)、中央北の丘の南側登り口、南西の2天幕を確認。主要通路に大きな配置変化は見当たらないが、川岸・樹冠・崖の細部と全マス一致は未保証。実ゲームの格子・地形名・移動範囲は未確認。
