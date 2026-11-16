# Q-11 第7章 D 地図候補・一次確認

- `art-samples/q11-ch07-D.png`。内蔵 imagegen で1回生成、出力を無加工コピー。
- 入力画像は `design/map-guides/ch07-guide.png` のみ。`ch07-grid.png` と `src/chapters/ch07.ts` は配置確認用に閲覧。
- 実寸 1518 × 1036、約 69 × 69.07 px/マス。64 px/マス以上。
- 一次目視: 秋の湿地・森林・柵の野営地、東の川と浅瀬、南西の池、東の小池を迂回する道、桟橋を確認。西門 (7,7)、北門 (11,4)、南側開口 (9,10)、桟橋 (18–19,11) は概ね下絵に対応。訪問用の3建物 (9,5)、(13,5)、(9,9) は描かれ、余分な宝箱・木箱・檻は見当たらない。
- 留保: 地形境界・全座標の厳密なマス単位照合、ゲーム画面での表示と通行判定は未実施。描画の自然な揺らぎや霧・森林の張り出しが判定と一致するか確認が必要。

## 生成プロンプト全文

```text
Use case: style-transfer. Redraw the supplied guide as a detailed hand-painted fantasy tactical battle map, 22 columns by 15 rows, full canvas 22:15 landscape, minimum 1408 by 960 pixels. The supplied image is the sole authoritative terrain layout: preserve exact positions, sizes, boundaries, openings and pathways edge to edge without cropping, shifting or adding terrain. High near-top-down view with slight tilt. Early autumn grey misty morning in a forest wetland, subdued natural greens and brown earth, reed marshes and shallow water, delicate painterly textures, restrained even lighting; detailed realistic hand-painted fantasy game map style. The central poachers' camp has its existing wooden palisade, tents, three modest buildings and inner boss enclosure. Keep western road opening at (7,7), northern gate opening at (11,4), southern fence opening at (9,10), and all existing clear passages; preserve eastern edge river, marsh shallows, southwest pond, eastern road curling around the small pool, and wooden pier centered on (18,11) and (19,11). Coordinates zero-based. Keep the three small buildings centered at (9,5), (13,5), and (9,9): 43.18%,61.36%,43.18% across and 36.67%,36.67%,63.33% down respectively; do not decorate them with markers. Keep all forest and palisade boundaries and water crossings faithfully aligned with the guide. No extra treasure chests, crates or cages, no people, animals, text, symbols, grid lines, border, compass, sky, horizon or watermark.
```

主担当は格子と原本の見比べで西門(7,7)、北門(11,4)、南口(9,10)、訪問3軒と東端桟橋を確認。北門の開口が1マスより広く見えるため、隣の柵セルの見え方と東の浅瀬・桟橋の移動を実画面で確認する。assets/maps/ch07.pngへ無加工で納品。
