# Q-11 第8章 D 試作

- 配置参照: `design/map-guides/ch08-guide.png` のみ。`ch08-grid.png`、章データ、独立確認文書を読取・照合。画風は文章指定。
- 生成方式: built-in image_gen、1回。`art-samples/q11-ch08-D.png` は生成原本の無加工コピー。
- 実測: 1536 × 1024 px、24×16 マス換算で 64 × 64 px/マス、RGB。
- 一次目視: 北の3マス幅の出口と大広間への接続、西の橋と両浅瀬、中央湖、東の小池と曲がる通路を確認。暗い岩壁と比較的明るい石床、紫の結晶、低い岩棚が見える。文字・格子・人物なし。
- 残件: 地形境界の全マス照合とゲーム内の移動範囲・崩落後の接続は未確認。東通路の狭い屈曲部と中央湖周辺では岩棚・崖・岩壁の見分けを格子で確認する必要がある。生成で木箱や坑道の小道具が追加されており、移動可能箇所の見た目に影響しないかも要確認。採否は主担当に委ねる。

## 生成プロンプト全文

```text
Use case: stylized-concept. Asset: top-down fantasy tactics map, 24 columns by 16 rows. Repaint the supplied image as a registered texture repaint, preserving the full canvas and the exact positions, shapes, boundaries and dimensions of every floor, rock wall, lake, cliff, bridge and passage. Do not crop, add margins, reframe, shift, compress or change aspect ratio. At 1536 x 1024 pixels, preserve these anchors: north exit is the full three-cell opening x=704–896 at the top, with central stone path and grass on both sides, connecting to the northern hall; west ford center (96,352), bridge center (160,352), second ford center (224,672), west passage x=64–256; central lake occupies the same outline and central rock surrounds it; eastern pool center (1312,384); eastern shortcut must remain a continuous narrow floor passage through centers (992,800), (992,736), (1056,736), (1056,672), (1056,608), while neighboring wall cells remain solid. The north connection passes through centers (1184,288), (1184,224), (1120,224). Southern starting chamber stays at x=640–896, y=768–960. Preserve all other layout features exactly as supplied; do not add or remove terrain or make new crossings. Repaint as a detailed hand-painted underground old-mine labyrinth: dark cool grey stone walls, clearly lighter worn stone walkable floors, dark water, modest purple crystal accents, restrained even light. Differentiate impassable wall from walkable rocky shelf. Direct overhead with slight tilt; no characters, animals, text, symbols, grid, frame, legend or UI. Target 1536 x 1024 pixels.
```

## 主担当の採用判断
下絵格子と原本を目視比較。北出口3セル、橋中心(160,352)、浅瀬(96,352)/(224,672)、東の細道の屈曲を確認し、D版を納品候補としてassets/maps/ch08.pngへ無加工配置。旧Aはart-samples/q11-ch08-prototype.pngに保持。岩棚と岩壁の全境界、木箱の通行印象、4/7/10ターン目の崩落表示は実ゲーム未検証。画像の静的確認であり、実プレイ済みとは扱わない。
