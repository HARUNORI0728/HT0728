# Q-12 第1章 画風候補

2026-11-16 JST。4候補を原寸PNGで納品。採否はClaudeがゲーム内で比較して決める。

| 候補 | 内容 | 寸法 | 所見 |
| --- | --- | --- | --- |
| A | 採用済みQ-11試作を無変更コピー | 1512×1040 | 柔らかい手描き。比較基準 |
| B | 輪郭明瞭・濃い色、非ドット | 1512×1040 | 橋・道・壁が読みやすい。彩度がユニットと競合しないか確認 |
| C | 紙の質感と淡い水彩 | 1513×1040 | 柔らかい色調。小さな表示では壁と廃墟の区別を確認 |
| D | 細密な写実寄り | 1512×1040 | 質感は豊か。浅瀬と白波、壁の隙間の瓦礫、茂みと森の区別に注意 |

約94.5px/マス、今回の約90px条件に適合。Cの横幅1px差は生成原寸のまま保存、再拡大・加工なし。寸法とSHA256はq12-image-check.json。

## 確認範囲と残件

主担当が4原本と格子付き下絵を目視。橋(9,4)、浅瀬(10,8)、城壁の廃墟2箇所、砦(13,2)、8天幕、L字畑の主要位置に大きな移動は見当たらない。川の曲がり角、樹冠の境界は丸みがあり、全マス完全一致を保証する検査ではない。DはSOL担当も格子重ねで主要位置を確認と報告。実ゲームでの移動範囲・ユニット視認性は未検証。

比較補助として ../../art-samples/q12-compare.html を追加。4枚表示・格子切替・拡大表示・カーソル座標を実装した。ブラウザーからローカルサーバーへの接続がタイムアウトし、比較ページの動作確認は未完了。ゲームのビルド対象は変更していないためビルドは実施していない。

Claudeへの提案：遊びやすさを優先しBを第一比較対象に、Aを基準とする。全章量産前に、橋・浅瀬・廃墟を選択した地形名と移動範囲の確認を優先度高で行う。D採用時は浅瀬と壁の通路の描き分けを修正対象にする。

## 制作記録

Aはq11-ch01-prototype.pngと同一。B/Cは主担当が組み込みimagegen、DはSOLが組み込みimagegenで制作。共通入力 design/map-guides/ch01-guide.png。SOLが利用上限で中断したためDの完全プロンプト記録は回収できていない。Dへの指示は「高精細リアル寄り俯瞰・細かな草岩・長めの影、境界を隠さない、16×11同配置、約90px/tile、文字格子人物なし」。B/Cの完全プロンプトは以下。

### B

Use case: style-transfer. Redraw this exact tactical battle map as variant B: crisp richly colored hand-drawn classic handheld tactics RPG illustration, individually drawn trees, roofs and rocks, clear dark fine outlines, NOT pixel art. Strictly preserve the entire input layout and feature footprints. Direct overhead, edge-to-edge ground, 16 columns by 11 rows conceptual geometry, output 1512x1040 or same 16:11 aspect near 95 pixels per cell. Do NOT draw grid lines, labels, letters, people or animals. River stays column9 rows0-6 then column10 rows6-10; wooden bridge at (9,4), shallow stony ford (10,8). Road and fort at (13,2) stay exact. Wall row4 cells0,1,3,4,6, traversable rubble gaps2,5. All 8 tents preserve positions. Forest northwest and southeast outlines unchanged. Hills, bushes, ruins, fields and mountains preserve locations exactly. Flat readable terrain, modest shadows confined within terrain outlines, deeper greens and blue water but not neon. No new scenery or routes. Terrain readability above decorative detail.

### C

Use case: style-transfer. Redraw this exact overhead tactics map as variant C: delicate watercolor illustrated map on subtly textured paper, pale sage greens, soft ochre paths, slate blue river, gentle pigment blooms and translucent washes. Keep terrain edges clearly readable despite watercolor, no washed-out bridge or ford. Strictly preserve exact input composition, every feature size and footprint, all paths and blocked terrain boundaries. Output 1512x1040 near exact16:11, conceptual16x11 cells. River column9 rows0-6 then column10 rows6-10, wooden bridge(9,4), rocky shallow ford(10,8); road fort(13,2); wall row4 cells0,1,3,4,6 with traversable ruins at2,5. Same eight tents, forest outlines, L field, hills, bushes, mountains, ruins. No new or removed features. Ground fills entire image, no paper border. No letters, text, labels, grid, people, animals, perspective horizon. Direct overhead camera, modest short shadows. Render a distinctive pastel watercolor alternative, not cartoon outlines or photorealism.
