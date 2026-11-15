# 戦闘マップの描き直し 発注文（画像生成AI・画像から画像）

『フィットア奪還戦記』の戦闘マップは、いま章データのマス目（地形記号の並び）からプログラムで自動描画している。
この文書は、その自動描画の地図を**下絵**として画像生成AIに渡し、**配置を保ったまま手描き風に描き直してもらう**ための発注文。

ゲームは、絵の中の川や森の位置ではなく、マス目の地形記号でルール（移動・守備・回避）を判定する。
絵と判定の位置がずれると「森に見えるのに森の効果がない」ことが起きるので、**ずれを出さないこと**がいちばん大事。

---

## (a) 目的と手順

### 進め方

1. **まず第8章と第1章の2枚だけ試す。** 第8章（暗い洞窟の迷宮。下絵の見た目と描いてほしい見た目がいちばん違う）と、
   第1章（川・橋・浅瀬・城壁・天幕・畑・山と、地形の種類が多い）で、配置が保たれるか・画風が合うかを確かめる。
2. 2枚をゲームに入れて (e) の確認をし、問題がなければ残りの8章（2〜7・9・10章）を同じ設定で作る。
   画風が気に入らなければ、(c) の共通プロンプトを直してから2枚を作り直す。

### 1枚の作り方

1. 入力画像に `design/map-guides/chNN-guide.png` を使う（NN は 01〜10）。マス1つが 64px の自動描画の地図全体。
   ユニットや範囲表示は入っていない。
2. 画像から画像への変換（image-to-image / 参照画像つき生成）で、**下絵の配置を変えずに**描き直してもらう。
   - プロンプトは「(c) 共通の画風」＋「(d) その章のプロンプト」をつなげたもの。
   - 変化の強さ（denoising strength / 参照の強さ）は、配置が崩れない範囲で。目安は 0.45〜0.6。
     川や壁の位置が動くなら下げる。下絵のプログラムっぽさが残りすぎるなら少し上げる。
   - ControlNet などの「線画・輪郭・深度を保つ」機能が使えるなら、下絵をそのまま条件画像にすると配置が保たれやすい。
3. 出力は**下絵と同じ縦横比**（例：第1章は 16×11 マスなので 1024×704 の比。第8〜10章は 24×16 マスなので 3:2）。
   大きさはマス1つが **96px 以上**になるように。目安は下絵の2倍（マス1つ 128px）。
   例：第1章 2048×1408、第2〜5章 2560×1792、第6〜7章 2816×1920、第8〜10章 3072×2048。
   ツールの都合で比がずれた場合も、ゲームはマス目に合わせて伸縮して重ねるが、伸び縮みしたぶん絵が歪む。
4. できた絵を **`assets/maps/chNN.png`** に置く（PNG。例：`assets/maps/ch08.png`）。
5. `npm run build` を実行する。`tools/optimize_art.py` が `play/assets/maps/chNN.webp`（幅は最大 2400px、マス1つ 128px まで）に
   縮めて一覧 `src/art-manifest.ts` の `MAP_ART` に載せる。以後その章は、この絵が地図の背景になる。
   - 絵が無い章、読み込み中、読み込みに失敗したときは、今までどおり自動描画の地図を使う。
   - 絵を外すときは `assets/maps/chNN.png` を消して `npm run build`（書き出し済みの webp も一覧からも消える）。

### 章の途中で地形が変わるマス

次のマスは、章の途中で地形が変わる。**描く絵は章の開始時の姿**（下絵のとおり）でよい。変わったあとは、
ゲームがそのマスだけ自動描画のタイルで上書きする（その1〜3マスだけ画風が違って見えるのは仕様）。

| 章 | マス (x, y) | 開始時 → 変化後 |
| --- | --- | --- |
| 第6章 | (13, 11) (13, 12) | 柵 → 廃墟（7ターン目に柵が壊される） |
| 第8章 | `src/chapters/ch08.ts` の `terrainChanges`（下から順に 13〜15行目→10〜12行目→7〜9行目の帯） | 通れるマス → 岩壁（4・7・10ターン目に崩落が南から迫る。上書きされる範囲が広い） |
| 第9章 | (11, 7) (12, 7) (13, 7) | 城壁（閉じた城門） → 道（後半に城門が開く） |

上書きのつなぎ目を目立たせないため、これらのマスとその周りは、絵の中でもあまり凝った描き込みをしないほうがよい。

---

## (b) 守ること（全章共通）

発注のたびに、プロンプトとは別にこの条件を伝える（日本語で伝えられるツールならそのまま、英語のみなら下の英文を添える）。

1. **川・道・森・山・建物・壁・柵・橋の位置と大きさを下絵から動かさない。** 曲がり角の位置、幅、端の位置もそのまま。
   特に、**通れない地形（川・崖・城壁・柵・岩壁）と通れる地形の境目**を動かさない。ここがずれると、
   「渡れそうに見える川が渡れない」「道に見える場所が壁」になる。
2. **地形の種類を増やしたり減らしたりしない。** 下絵に無い川・池・木立・建物・岩を足さない。下絵の森や家を消さない。
   飾り（草の色むら、小石、花）は、地形の種類が変わって見えない程度ならよい。
3. **視点は下絵と同じ**：真上から少しだけ斜めに見下ろした見え方。建物や木は少し立体的でよいが、
   高い物の影や上端が隣のマスに大きくはみ出さないこと（とくに上の行のマスに）。
4. **キャラクター・人物・動物・文字・記号・枠・凡例・方位記号を描かない。** ユニットはゲームが上に重ねる。
5. **マス目の線を描かない。** 格子はゲームが必要なときに重ねる。
6. **明るさと彩度は控えめに**：上に乗るキャラクターの絵（輪郭の濃いアニメ調）が見やすいように、背景は少し落ち着いた色に。
   強い光の筋、白飛び、真っ黒なつぶれは避ける。
7. 地図の端で絵を終わらせない（画面の端まで地面が続いている絵。外周に額縁や暗い縁取りを付けない）。

英文（ネガティブプロンプト、または条件として添える）:

```
Keep the exact layout of the input image: every river, road, forest, mountain, building, wall, fence and bridge stays
in the same place with the same size and outline. Do not add or remove any terrain feature. Same camera: top-down with
a slight tilt. No characters, no people, no animals, no text, no letters, no symbols, no grid lines, no frame, no border,
no legend, no compass. Muted, even lighting so that characters placed on top stay readable.
```

ネガティブプロンプト（対応しているツールのみ）:

```
characters, people, figures, animals, text, letters, numbers, watermark, signature, grid, grid lines, tiles, frame,
border, vignette, legend, compass rose, UI, isometric, perspective view, horizon, sky, photo, 3d render, harsh shadows,
oversaturated, neon
```

---

## (c) 全章共通の画風（英語プロンプトの先頭に付ける）

```
A hand-painted fantasy tactics battle map, seen from directly above with a slight tilt, redrawn from the input image
with the same layout. Storybook illustration style: soft painterly brushwork, gentle gradients, restrained thin
outlines in warm dark brown (not black), subtle texture on grass, stone and water. Cohesive palette shared by the
whole series: muted sage and olive greens, warm ochre roads, slate blue water, grey-brown stone, small touches of
dusty red on roofs. Calm, even, slightly desaturated lighting with soft shadows falling to the lower left. Readable
terrain shapes, no tiny clutter. Fills the whole canvas edge to edge.
```

画風を揃えるコツ：最初に良かった1枚（第1章の想定）を、2枚目以降の「スタイル参照画像」としても渡せるツールなら渡す。
seed を固定できるツールなら、全章で同じ seed を使う。

---

## (d) 章ごとのプロンプト（共通の画風のあとにつなげる）

地形記号の対応（下絵の見た目 → 描いてほしいもの）は全章共通：平地＝草地、道＝土の道、橋＝木の橋、森＝広葉樹と針葉樹の林、
山＝岩山（雪をかぶった峰）、川＝流れる川、浅瀬＝石の見える浅い流れ、丘＝なだらかな高まり、崖＝切り立った岩、
畑＝耕した畑、家屋＝木と石の民家、天幕＝布のテント、茂み＝低い藪、廃墟＝崩れた石造りの跡、城壁＝石の城壁、柵＝木の柵、
砦＝小さな石の砦（旗）。

### 第1章「帰郷」（16×11）— 試作1枚目

```
Late spring, mid-morning, overcast soft light. The ruined borderland of Fittoa after a magical disaster: knee-high
wild grass where towns used to be. A clear river runs from north to south through the middle with one wooden bridge
on the road and one stony ford to the south. On the west, the broken line of the old Roa city wall and scattered
stone ruins; in the south-west, a small refugee camp of patched canvas tents and campfires. In the north-east a range
of grey snow-capped mountains with a small bandit fort flying a red flag. A ploughed but abandoned field in the
south-east. Melancholy but hopeful mood.
```

### 第2章「捜索団の灯」（20×14）

```
Early summer, late afternoon with long warm light. An abandoned village enclosed by a wooden palisade with four gates,
some houses roofless. Dense forest in the north and a lighter wood in the south. A river along the east edge crossed
by two wooden bridges and a ford. A small stone fort near the west gate and another on the north-east. Tense mood of
a village under siege.
```

### 第3章「師との再会」（20×14）

```
Early summer, bright late morning. Rolling grassland at the edge of a forest, with a pale strange hollow. An old road
enters from the west edge and crosses a small north-south stream on a bridge; the stream has shallow fords in the north
and south. East of the stream, a low hill topped by a crumbling stone watchtower ringed with broken walls. Patches of
woods in the north and south. Fresh but uneasy mood.
```

### 第4章「白い髪の護衛」（20×14）

```
Early summer, clear midday. A ruined post town along an old east-west highway: rows of houses and stone ruins, wooden
fences. In the north, a mountain pass checkpoint: a small stone fort enclosed by walls and cliffs. On the east side a
collapsed stone chapel surrounded by walls. North-east low hills and a grove; in the south, old fields divided by
fences. Dusty, sunlit mood.
```

### 第5章「弓の冒険者」（20×14）

```
High summer, dappled sunlight under a forest canopy. A wide forest with thickets, crossed west to east by a small
stream with fords and a bridge. An old trade path overgrown with grass runs from the south-west adventurers' camp of
tents toward the north-east. A rocky hill in the north-centre, a spring in the north-east, three small clearings in
the woods. Green, quiet, slightly eerie mood.
```

### 第6章「神子と天才」（22×15）

```
End of summer, early evening, warm golden light fading. A refugee camp in the south-centre: many tents and some wooden
houses, surrounded by a magical wooden palisade with gates to the north, west and east; small stone watch forts beside
the gates. Hills and woods to the north, a river with one bridge and a ford on the east, a road to the west. Fields
between the tents. Determined, home-defending mood.
```

### 第7章「獣の牙」（22×15）

```
Early autumn, grey misty morning. Wetlands and forests in the south-east of Fittoa: reed marshes made of shallow water
and thickets. A poachers' camp of tents enclosed by a wooden fence in the centre. A river runs along the east edge
with a small wooden pier. Forests to the north and south. Damp, muted colours, ominous mood.
```

### 第8章「残滓の迷宮」（24×16）— 試作2枚目

この章だけ、下絵の見た目と描いてほしいものが大きく違う（下絵は石床を土の道、岩壁を崖で代用している場合がある）。
**下絵の「通れる場所」と「壁」の形だけを使い、質感は洞窟に置き換える**こと。

```
Autumn, but deep underground: a dark cave labyrinth that grew inside an old mine. Walkable passages and halls are
worn flagstone and packed-stone floor; every impassable area is solid dark rock wall with rough edges, catching a little
light along its rims. Where the input shows roads or open ground, paint stone floor; where it shows cliffs or walls,
paint rock wall; keep their exact outlines. Green areas of the input become mossy floor; water stays as dark
underground pools; mountains become rock masses. Faint bluish crystal glow here and there, a few old mine timbers along
the walls. Low-key lighting, cool blue-grey palette with warm lantern spots, but the floor must stay clearly readable
from the walls. A three-tile exit in the north-centre with a hint of daylight.
```

注意：**石床（通れる）と岩壁（通れない）の境目がいちばんずれやすい。** 暗くしすぎて境目が見えなくなったら作り直す。

### 第9章「ロアの城壁」（24×16）

```
Beginning of winter, cold grey daylight, thin snow on the ground. The ruined city of Roa: a massive stone city wall
crosses the map from east to west, with a closed gate in the centre, a collapsed breach and a small postern on each
side. South of the wall, open fields and hills with an army camp of tents and a small fort. North of the wall, the
ruined city: broken houses, rubble and streets leading to a manor fortress at the north edge with two watch forts.
Grim, decisive mood.
```

城門（中央の3マス）は**閉じた姿**で描く（後半はゲームが道のタイルで上書きする）。

### 第10章「本気で生きる」（24×16）

```
Winter dawn, the first pale pink light on frost. An old road runs from the south-west toward the north-east, past a
ruined roadside inn with a small fort and groves of trees. In the north-east, the remains of Buena village and a
gentle hill rising in tiers; the top of the hill is a small open grassy summit. Soft dawn haze, hopeful and solemn mood.
```

---

## (e) 納品後の確認のしかた

1. 届いた絵と **`design/map-guides/chNN-grid.png`**（同じ大きさの下絵に、マス目の線・地形記号・地形名・
   通れないマスの赤い斜線を重ねたもの。上と左の端の数字はマスの列・行番号）を並べて、見比べる。
   画像編集ソフトで grid.png を半透明にして絵に重ねると分かりやすい（絵を下絵と同じ大きさに縮めてから重ねる）。
   - 赤い斜線のマス（川・崖・城壁・柵・岩壁）が、絵でも通れなく見えるか。
   - 斜線の無いマスが、絵で壁や水に見えていないか。
   - 森・山・丘・廃墟・家屋・砦など効果のある地形が、同じマスにあるか（はみ出しは隣のマスに半分以内）。
   - 道と橋が切れずにつながっているか。
2. `assets/maps/chNN.png` に置いて `npm run build` し、ゲームで確かめる（開発用：ブラウザのコンソールで
   `__game.startChapter(N)`）。
   - 描いた絵の章では、HUD の「格子」ボタンが最初からオン（マス目の線が薄く重なる）。線と絵の地形がそろっているか見る。
   - 空いているマスをタップすると、そのマスが枠で示され、下の欄に地形名・守備・回避と、通れない地形なら
     「通行不可（飛行ユニットのみ通れる）」が出る。絵と食い違うマス（例：草地に見えるのに「川」）がないか、
     怪しいところをいくつかタップして確かめる。
   - ユニットを選んで、移動範囲（青）が絵の川や壁を越えていないか見る。
3. ずれがあれば、ずれた場所を chNN-grid.png の番号（例：(9, 6) の川が左に半マスずれている）で伝えて作り直す。
   小さなずれなら、画像編集ソフトでその部分だけ直してもよい。

### 下絵を作り直すとき

マップ（`src/chapters/chNN.ts`）や自動描画（`src/render/terrain*.ts`）が変わったら、`npm run build` のあと
`npm run map-guides` で下絵と確認用の画像を書き出し直す（`npm run map-guides -- 8` のように章番号を付けるとその章だけ）。
**マップが変わった章の描いた絵は作り直しが必要**（古い絵のままだと、絵と判定がずれる）。
