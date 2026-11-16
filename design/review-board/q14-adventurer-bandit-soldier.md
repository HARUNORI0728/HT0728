# Q-14 冒険者・野盗・私兵 normal 候補

内蔵 imagegen で独立生成し無加工コピー。全点 1086×1448、32-bit ARGB、透明背景。冒険者と私兵の四隅アルファはすべて0。野盗は右下隅11、他の隅0（服が画面端に接する半透明画素）。全年齢向け。衣装と顔を目視確認。

- `art-samples/q14-adventurer-normal.png`：黒短髪、髭・傷なし、青緑の旅装。v1 はパウロと似るため保留し `art-samples/q14-adventurer-normal-v1.png` に保存。
- `art-samples/q14-bandit-normal.png`：黒髪と髭、赤茶の傷んだ衣装。
- `art-samples/q14-soldier-normal.png`：短い金髪、紺制服と銀の縁取り。

`design/script-ch3-5.md`、`script-ch1-2.md`、`script-ch9-10.md` の台詞と BOARD の私兵の服装指定を参照。外見詳細は制作上の解釈。画風参照は以下の通り。各回 `transparent_background: true`。

## 冒険者 v1（保留、参照: paul_normal, luke_normal）

```text
Use case: stylized-concept. Japanese tactical fantasy RPG dialogue portrait. Supplied images are style and framing references only, not identities. Create one generic male adventurer, an adult companion of a woodland archer: short tousled dark blond hair, alert kind brown eyes, practical blue-green travel scarf, weathered tan leather vest over a simple cream shirt, modest travel gear, an approachable seasoned expression. Calm neutral expression, mouth closed. Distinct from both reference characters. Centered chest-to-waist-up, body slightly three-quarter, face toward viewer, head entirely within frame, arms and clothing crop naturally at lower canvas edge like references. Match crisp dark anime lineart, soft cel shading and muted medieval-fantasy palette, light from upper left. Genuine transparent background; target 1086 × 1448 pixels. All ages; no text, scenery, watermark, frame, additional characters, photorealism or chibi.
```

## 冒険者 v2（参照: luke_normal）

```text
Use case: stylized-concept. Japanese tactical fantasy RPG dialogue portrait. Supplied image is art style and framing reference only, not identity or costume. Create a distinct generic male adventurer in his late twenties, companion of a woodland archer: short straight dark hair, round friendly face, clean-shaven, no facial scars, brown eyes. Practical blue-green travel scarf, weathered tan leather vest over a simple cream shirt and modest travel gear. Calm neutral expression, mouth closed. Centered chest-to-waist-up, body slightly three-quarter, face toward viewer, head entirely within frame, arms and clothing crop naturally at lower canvas edge like reference. Match crisp dark anime lineart, soft cel shading and muted medieval-fantasy palette, light from upper left. Genuine transparent background; target 1086 × 1448 pixels. All ages; no beard, stubble, facial scars, text, scenery, watermark, frame, additional characters, photorealism or chibi.
```

## 野盗（参照: paul_normal, luke_normal）

```text
Use case: stylized-concept. Japanese tactical fantasy RPG dialogue portrait. Supplied images are style and framing references only, not identities. Create one generic adult male bandit: stocky, rough and wary, a broad weathered face, crooked nose, black unkempt short hair and uneven dark beard, muted reddish-brown worn hood pushed back, patched rough leather jerkin over a dark plain shirt. No uniform, no blue-green scarf. Calm guarded neutral expression, mouth closed. Distinct from the reference characters. Centered chest-to-waist-up, body slightly three-quarter, face toward viewer, head entirely within frame, arms and clothing crop naturally at lower canvas edge like references. Match crisp dark anime lineart, soft cel shading and muted medieval-fantasy palette, light from upper left. Genuine transparent background; target 1086 × 1448 pixels. All ages; no gore, text, scenery, watermark, frame, additional characters, photorealism or chibi.
```

## 私兵（参照: luke_normal）

```text
Use case: stylized-concept. Japanese tactical fantasy RPG dialogue portrait. Supplied image is style and framing reference only, not identity or costume. Create a generic adult male private soldier: close-cropped sandy blond hair, clean-shaven square face, stern but calm expression with mouth closed. He wears a clearly NAVY BLUE medieval military uniform jacket with conspicuous SILVER piping along collar, front and shoulders, simple silver buttons and modest protective gear. Distinct from the reference character, not white or red clothing. Centered chest-to-waist-up, body slightly three-quarter, face toward viewer, head entirely within frame, arms and clothing crop naturally at lower canvas edge like reference. Match crisp dark anime lineart, soft cel shading and muted medieval-fantasy palette, light from upper left. Genuine transparent background; target 1086 × 1448 pixels. All ages; no text, scenery, watermark, frame, additional characters, photorealism or chibi.
```
