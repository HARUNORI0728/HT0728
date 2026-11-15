# Q-11 第1章「帰郷」手描きマップ試作

`design/map-guides/ch01-guide.png` を参照画像として内蔵の画像生成機能で描き直し、`design/map-guides/ch01-grid.png` と並べて目視確認した。使用したツールでは参照強度と出力ピクセル数を引数で指定できないため、プロンプトで輪郭の固定と希望寸法を指定した。

- 試作は `art-samples/q11-ch01-prototype.png`。生成PNGを無加工で使用。
- 実寸は1512 × 1040。目標2048 × 1408に対し、1マスあたり幅94.5px、高さ約94.55px。最低96pxを下回る。16:11相当で、1512px幅における厳密な縦横比の高さとの差は0.5px。
- 目視比較は下絵と試作の同じ相対位置を確認した。ピクセル単位の重ね合わせとゲーム内での確認は未実施。

## 地形の確認

座標は左上を (0,0) とする。

| 対象 | 結果 |
|---|---|
| 川・橋・浅瀬 | 北のx9から流れ、木橋 (9,4) と南の浅瀬 (10,8) を確認。y6の屈曲からx10へ移って南端まで達する。対岸の土道は橋と浅瀬に接続。川岸はなめらかな曲線で、y0〜1の山裾がかかる箇所と (9,6)〜(10,7) の屈曲部は格子上での通行判定と要照合。 |
| 城壁・廃墟 | y4の城壁はx0–1、x3–4、x6に分かれている。間の (2,4) と (5,4) には低い瓦礫が描かれ、城壁と区別できる。瓦礫の外周は細部の描き直しで変わっており、通行できる隙間の見え方はゲーム上で要確認。 |
| 道・砦 | (7,4) から橋を経由し、北に曲がって (13,2) の赤旗の砦に接続。南側の道は (7,8) で東へ曲がり、浅瀬を渡るとx11から南端へ続く。 |
| 森・山・丘 | 北西と東の林、北東の雪山、(4,1)〜(5,2) と (11,5)〜(12,5) の丘を確認。個々の樹冠・雪峰は描き直しで変化しており、林縁の (2,0)・(13,6) と山裾の (10,2)・(15,3) 付近では草地との境目をゲーム上で要確認。 |
| 天幕・畑 | 南西の8張 (1,6)、(3,6)、(0,7)、(2,7)、(4,7)、(1,8)、(0,9)、(4,9) と南東のL字型の畑 (x12–14、y7–9) を確認。プロンプト中の「7張」は数え違いで、生成結果には下絵の8張が残っている。 |
| 絵柄・画面要素 | 落ち着いた手描き風の彩色。人物・動物・文字・枠・格子・方位記号は目視で確認されなかった。 |

試作は `art-samples/` に配置済み。最低解像度未達で、地形境界のゲーム内照合も残っている。

## 生成プロンプト

```text
A hand-painted fantasy tactics battle map, seen from directly above with a slight tilt, redrawn from the input image with the same layout. Storybook illustration style: soft painterly brushwork, gentle gradients, restrained thin outlines in warm dark brown (not black), subtle texture on grass, stone and water. Cohesive palette shared by the whole series: muted sage and olive greens, warm ochre roads, slate blue water, grey-brown stone, small touches of dusty red on roofs. Calm, even, slightly desaturated lighting with soft shadows falling to the lower left. Readable terrain shapes, no tiny clutter. Fills the whole canvas edge to edge.

Late spring, mid-morning, overcast soft light. The ruined borderland of Fittoa after a magical disaster: knee-high wild grass where towns used to be. A clear river runs from north to south through the middle with one wooden bridge on the road and one stony ford to the south. On the west, the broken line of the old Roa city wall and scattered stone ruins; in the south-west, a small refugee camp of patched canvas tents and campfires. In the north-east a range of grey snow-capped mountains with a small bandit fort flying a red flag. A ploughed but abandoned field in the south-east. Melancholy but hopeful mood.

Keep the exact layout of the input image: every river, road, forest, mountain, building, wall, fence and bridge stays in the same place with the same size and outline. Do not add or remove any terrain feature. Same camera: top-down with a slight tilt. No characters, no people, no animals, no text, no letters, no symbols, no grid lines, no frame, no border, no legend, no compass. Muted, even lighting so that characters placed on top stay readable.

Repaint the attached image as a precise registration overlay, altering brushwork, colors and materials only within each existing silhouette. Every edge stays at the same normalized canvas location; no zoom, margin, rotation, perspective shift, or crop. Treat the exact terrain outline of the input as immutable. The invisible grid is 16 columns by 11 rows, coordinates zero-indexed. River enters at x9, wooden bridge exactly (9,4), river jog is (9,6) to (10,6), stony ford exactly (10,8), and river exits at x10. Preserve the ochre road route and width, its corners at (7,4), (7,8), (11,8), and (13,4), and the north-east fort at (13,2). Preserve the isolated western wall segments along y4 and each gap between them, all seven individual tent locations, all forest and mountain edges, and the field's L-shaped outline at x12–14/y7–9. Every icon visibly depicts the same terrain inside the same map cell as the source. No horizon or sky. Full bleed PNG of exact 2048 × 1408 pixel canvas, 16:11 landscape, all edges aligned to the source.
```
