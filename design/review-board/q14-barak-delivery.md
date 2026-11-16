# Q-14 バラク 立ち絵候補

- `art-samples/q14-barak-normal.png`：1086×1448、32-bit RGBA、四隅 alpha 0。
- `art-samples/q14-barak-angry.png`：1086×1448、32-bit RGBA、四隅 alpha は左上0・右上0・左下249・右下0。左下は毛皮が画端に接する。両画像とも生成後の寸法調整なし。
- 画像生成ツールを使用。通常は `assets/units/barak.png` を人物参照、`assets/portraits/dolgan_normal.png` を画風・構図参照。怒りは生成した通常候補を人物参照とした。
- 一次目視：地図絵の暗褐色の結んだ髪、継ぎ当ての赤い鉢巻、頬傷、髭、金耳飾り、赤い襟巻、毛皮と革の服を反映。怒りは叫ぶ表情と向きに変化。背景・文字・武器・他人物なし。頭は収まる。ゲーム実画面は未確認。

## プロンプト全文

### normal
```text
Create Barak's normal dialogue portrait for a Japanese tactical fantasy RPG. Image 1 is the character identity reference (map sprite): translate the same man into a mature non-chibi chest-up portrait, preserving his unruly dark brown tied-back hair, patched dark red headband, narrow eyes, cheek scar, rough short dark beard and gold hoop earring, red neck scarf, worn dark brown leather clothing and ragged tan fur mantle. He is a calculating, rough poacher leader with a guarded, faintly sly neutral expression. Image 2 is style and framing reference only: match the polished anime linework, detailed cel shading, muted fantasy colors, scale and centered chest-up composition. One adult man, all ages, no weapon, no text or frame, head fully visible. Genuine transparent background with alpha. Intended size 1086 × 1448 pixels.
```

### angry
```text
Create the angry dialogue portrait variation of this exact adult man, Barak, from the supplied normal portrait. Preserve his identity and the same patched dark red headband, tied-back unruly dark brown hair, narrow eyes, cheek scar, rough beard, gold hoop earring, red scarf, brown leather clothing and ragged fur mantle, and match the polished anime RPG portrait style. Show him angrily shouting an urgent order to flee, brows drawn down and mouth open, with a naturally changed head angle and alert posture. Keep the same chest-up scale and recognizable facial features and costume. Single person, all ages, no weapon, no text, no scenery or frame. Genuine transparent background with alpha. Intended size 1086 × 1448 pixels.
```

各回 `transparent_background=true`。
