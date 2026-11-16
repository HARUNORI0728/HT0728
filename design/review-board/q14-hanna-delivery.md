# Q-14 ハンナ normal 納品候補

- 候補: `assets/portraits/hanna_normal.png`
- 内蔵 imagegen で生成した元画像をそのままコピー。加工・リサイズなし。
- 実寸: 1086 × 1448 px、32-bit ARGB PNG。四隅のアルファ値はいずれも 0（透明）。
- 一次検品: 40代の世話役、前掛け、腕まくり、閉じた口の落ち着いた表情、単人物、背景透過を確認。既存のエリスおよびロッタ通常立ち絵を画風参照。normal の候補であり、表情差分は未制作。

## 生成プロンプト全文

```text
Use case: stylized-concept. Asset type: Japanese tactical fantasy RPG dialogue character portrait. Reference images are style and composition references only, not the character to copy. Create Hanna, a hearty, capable and caring refugee camp cook and community matron in her 40s, with a sturdy rounded build and a mature, lived-in face; practical brown hair tied back. She wears a simple medieval working blouse with sleeves visibly rolled up and a plainly visible practical apron. Calm neutral expression, mouth closed, strong reassuring presence. Single character, centered, chest-to-waist-up portrait, body slightly three-quarter and face toward viewer, head fully inside frame with a little space above hair. Match the references' clean polished anime illustration, crisp dark lineart, cel shading with soft gradient highlights, detailed expressive eyes, muted medieval-fantasy palette and soft upper-left light. Transparent background with genuine alpha. Target 1086 × 1448 pixels, 3:4 portrait. No scenery, text, watermark, signature, frame, other characters, photorealism, or chibi.
```

参照画像: `assets/portraits/eris_normal.png`, `assets/portraits/lotta_normal.png`。生成時 `transparent_background: true`。
