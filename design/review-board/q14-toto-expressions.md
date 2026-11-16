# Q-14 トト 表情差分候補

`assets/portraits/toto_normal.png` を唯一の外見・画風参照に、画像生成ツールで各表情を独立生成。候補は `art-samples/q14-toto-smile.png`、`q14-toto-angry.png`、`q14-toto-sad.png`。いずれも1086×1448、32-bit RGBA PNG、四隅 alpha 0。髪・そばかす・スカーフ・繕い服と表情を目視確認。実画面確認は未実施。

smile は明るい笑顔、angry は眉を寄せ口を尖らせた悔しさ、sad は伏し目と落ちた肩。sad の生成原本は1055×1491のため、縦横比を維持して高さ1448・幅1025に縮小し、左右に透明余白を加えて指定寸法とした。smile と angry は生成時から指定寸法。

## プロンプト全文

### smile
```text
Create the smile expression variation of this exact Japanese fantasy RPG character portrait. The supplied image is the sole character, costume, style and composition reference. Preserve the same approximately 10-year-old boy, identical tousled chestnut hair and cowlick, brown eyes, freckles, red-brown scarf, patched beige lace-up tunic, proportions, camera framing, pose, lighting and polished anime rendering. Change his expression naturally to a bright happy childlike smile, as if looking up admiringly at a trusted protector. Keep one character, head fully inside frame, all ages. Genuine transparent background with alpha, no text, scenery or frame. Final portrait 1086 × 1448 pixels.
```

### angry
```text
Create the angry expression variation of this exact Japanese fantasy RPG character portrait. The supplied image is the sole character, costume, style and composition reference. Preserve the same approximately 10-year-old boy, identical tousled chestnut hair and cowlick, brown eyes, freckles, red-brown scarf, patched beige lace-up tunic, proportions, camera framing, pose, lighting and polished anime rendering. Change his expression naturally to childlike frustration: lowered brows and a small indignant pout, determined but not frightening. Keep one character, head fully inside frame, all ages. Genuine transparent background with alpha, no text, scenery or frame. Final portrait 1086 × 1448 pixels.
```

### sad
```text
Create the sad expression variation of this exact Japanese fantasy RPG character portrait. The supplied image is the sole character, costume, style and composition reference. Preserve the same approximately 10-year-old boy, identical tousled chestnut hair and cowlick, brown eyes, freckles, red-brown scarf, patched beige lace-up tunic, proportions, camera framing, lighting and polished anime rendering. Change his expression naturally to quiet sadness, eyes and head slightly lowered, inner brows raised and shoulders a little slumped; restrained, no exaggerated crying. Keep one character, head fully inside frame, all ages. Genuine transparent background with alpha, no text, scenery or frame. Final portrait 1086 × 1448 pixels.
```

各回 `transparent_background=true`。

納品先：`assets/portraits/toto_smile.png`, `assets/portraits/toto_angry.png`, `assets/portraits/toto_sad.png`。主担当が外見と表情を目視確認。
