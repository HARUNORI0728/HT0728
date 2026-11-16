# Q-14 難民男女 通常立ち絵候補

- `art-samples/q14-refugee_m-normal.png`、`art-samples/q14-refugee_f-normal.png` は各1086×1448 px、32-bit RGBA PNG。四隅 alpha 0。生成後の寸法調整なし。
- 一次目視：男性は赤褐色短髪、髭なし、青灰の繕い服、茶の肩掛け。生成結果に頬傷あり。白髪・髭・ベストのベルトと識別できる。女性は灰金のボブ、青緑の服、黄土の繕いショール。白いリボンや前掛けなしでハンナとロッタの髪型・服と識別できる。両者とも頭が収まり、背景・文字・武器・他人物なし。ゲーム実画面は未確認。
- 画像生成ツール使用。男性は `assets/portraits/belt_normal.png`、女性は `assets/portraits/hanna_normal.png` を画風・構図のみの参照として使用。登場人物の個別の外見は参照から変更。

## プロンプト全文

### refugee_m
```text
Create a new generic adult male refugee dialogue portrait for this Japanese medieval fantasy RPG. The supplied portrait is a style, framing and world reference only, NOT the character: depict a clearly different individual from the elderly gray-haired bearded man. A lean adult man in his thirties, short uneven dark auburn hair, clean-shaven, hazel eyes, weathered but kind face, calm neutral expression. He wears a simple faded slate-blue coarse linen tunic with modest mended seams and a plain brown shoulder wrap, no vest. His clothes are worn yet dignified. Chest-up, slightly three-quarter body, face toward viewer, head fully within the frame. Match the reference's polished anime linework and cel shading. One person, all ages, no weapons, text, scenery, frame or ribbon. Genuine transparent alpha background. Intended canvas 1086 × 1448 pixels.
```

### refugee_f
```text
Create a new generic adult female refugee dialogue portrait for this Japanese medieval fantasy RPG. The supplied portrait is a style, framing and world reference only, NOT the character: make her clearly distinct from the brown-haired bun, white ribbon, red jacket and apron of the reference. Depict an adult woman in her early thirties with a distinct oval face, dark ash-blond straight hair in a short chin-length bob, grey-green eyes and a calm, quietly resilient neutral expression. She wears a simple muted blue-green coarse linen dress with a modest mended shawl in warm ochre, without apron or ribbon. Worn but dignified. Chest-up, body slightly three-quarter, face toward viewer, head fully within frame. Match the reference's polished anime linework and cel shading. One person, all ages, no weapon, no text, scenery, frame, hair ribbon or bow. Genuine transparent alpha background. Intended canvas 1086 × 1448 pixels.
```

両回 `transparent_background=true`。
