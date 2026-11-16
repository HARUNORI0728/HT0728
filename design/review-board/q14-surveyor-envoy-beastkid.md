# Q-14 検地官・傭兵の使者・獣族の子 normal 候補

内蔵 imagegen で各1回独立生成し無加工コピー。全点 1086×1448、32-bit ARGB、透明背景。検地官・獣族の子の四隅アルファは全て0。使者は右下252（外套が端に接する画素）、他の隅0。全年齢向け。人物・衣装を一次目視確認。

- `art-samples/q14-surveyor-normal.png`：眼鏡と白髪混じり、文官の服。
- `art-samples/q14-envoy-normal.png`：束ねた赤茶髪と髭、傭兵団の外套。
- `art-samples/q14-beastkid-normal.png`：獣耳と子どもらしい体格、健全な衣服。トトに顔と構図が似る点は採否確認を要する。

人物の役割は `design/script-ch6-8.md` の台詞に基づく。外見詳細は制作上の解釈。各回 `transparent_background: true`。

## 検地官（参照: `assets/portraits/luke_normal.png`）

```text
Use case: stylized-concept. Japanese tactical fantasy RPG dialogue portrait. Reference image is art style and framing only, not identity or clothing. Create a distinct royal land surveyor, a thoughtful middle-aged man who records a settlement as inhabited. Narrow face, neat salt-and-pepper hair, small round spectacles, clean shaven, attentive brown eyes, calm neutral expression with mouth closed. Modest formal olive-brown medieval civilian coat and cream high-collared shirt, subtle official clasp; no armor or weapon. One character, centered chest-to-waist-up, body slightly three-quarter, face toward viewer, full head inside frame, arms and clothing naturally crop at lower edge like reference. Match crisp dark anime lineart, soft cel shading and muted medieval-fantasy colors, soft upper-left light. Transparent background with genuine alpha; target 1086 × 1448 pixels. All ages, no text, scenery, watermark, frame, other people, photorealism or chibi.
```

## 傭兵の使者（参照: `assets/portraits/luke_normal.png`）

```text
Use case: stylized-concept. Japanese tactical fantasy RPG dialogue portrait. Reference image is art style and framing only, not identity or clothing. Create a distinct adult male mercenary envoy, an emissary of an armed company offering silver to make villagers leave. Dark auburn shoulder-length hair tied low, angular face, neatly trimmed dark beard, guarded confident neutral expression, mouth closed. Wears a practical charcoal and muted burgundy matching company cloak over simple worn leather armor, no ornate royal uniform, no spectacles. One character, centered chest-to-waist-up, body slightly three-quarter, face toward viewer, full head inside frame, arms and clothing naturally crop at lower edge like reference. Match crisp dark anime lineart, soft cel shading and muted medieval-fantasy colors, soft upper-left light. Transparent background with genuine alpha; target 1086 × 1448 pixels. All ages, no text, scenery, watermark, frame, other people, photorealism or chibi.
```

## 獣族の子（参照: `assets/portraits/toto_normal.png`, `assets/portraits/linia_normal.png`）

```text
Use case: stylized-concept. Japanese tactical fantasy RPG dialogue portrait. Reference images are for art style, child age and beastfolk ears only; create a distinct character, not a copy of either. A wholesome beastfolk child around ten years old, with small soft feline ears clearly on top of the head, short sandy-gold hair, round youthful face and amber eyes. A quiet, slightly wary but hopeful neutral expression, mouth closed. Fully clothed in a modest age-appropriate simple forest-villager tunic and small green neck scarf; no adult features or suggestive styling. One child, centered chest-to-waist-up, body slightly three-quarter, face toward viewer, entire hair and ears inside frame, clothing naturally cropped at lower edge. Match reference's crisp anime lineart, soft cel shading, expressive eyes, muted medieval-fantasy palette and upper-left light. Genuine transparent background; target 1086 × 1448 pixels. All ages. No text, scenery, watermark, frame, other characters, photorealism or chibi.
```

## 獣族の子 v2（画像参照なし、v1は `art-samples/q14-beastkid-normal-v1.png` に保存）

v1 がトトに似たため再生成。暗い肌・黒の巻き髪・垂れ耳・青灰の上衣で区別。1086×1448、32-bit ARGB、四隅アルファ0。全年齢向けの衣服と表情を目視確認。

```text
Use case: stylized-concept. Japanese tactical fantasy RPG dialogue portrait, polished clean anime illustration with crisp dark lineart, soft cel shading with subtle gradient highlights, detailed expressive eyes, muted medieval-fantasy palette, soft upper-left light. A wholesome beastfolk child around ten years old with dark warm brown skin, short curly black hair, floppy dog ears on top of the head, round cheeks and dark brown eyes. Slightly wary quiet neutral expression, mouth closed, head turned slightly to one side. Fully clothed in a modest, age-appropriate simple blue-gray forest-villager tunic. Childlike proportions, no adult or suggestive features. One child, centered chest-to-waist-up, head and ears fully inside frame, clothing naturally cropped at bottom. Genuine transparent background, target 1086 × 1448 pixels. All ages. No text, scenery, watermark, frame, other characters, photorealism or chibi.
```
