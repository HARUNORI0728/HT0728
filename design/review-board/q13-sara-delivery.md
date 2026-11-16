# Q-13 サラ照れ顔 納品記録

- 参照: `assets/portraits/sara_normal.png`
- 納品: `assets/portraits/sara_dere.png`（組み込み画像生成の出力原本を無加工でコピー）
- 寸法: 1086 × 1448 px（参照と一致）
- 透過: 32-bit ARGB、左上ピクセルのアルファ値 0 を確認。
- 一次目視: 視線を逸らし、頬を赤らめ、片手の指を頬に添えた照れ隠しの姿勢。口元は閉じてぶっきらぼうな印象。短い金髪、衣装、弓と矢筒、画風を維持。背景は透過表示。
- 生成方式: 組み込み image_gen、参照画像を使用。

## プロンプト

Use case: illustration-story. Asset type: game dialogue character portrait. Edit the reference into a bashful expression and pose variant of the exact same character. She averts her gaze, blushes, and scratches her cheek with one raised hand, with a blunt, slightly pursed mouth as she tries to hide her embarrassment. Change the arm and posture naturally, not just the face. Preserve her identity, short blonde hair, blue eyes, earring, fur-trimmed cloak, leather archer outfit, bow and quiver, color palette, polished anime style, bust framing and visual scale. Keep the same 1086 x 1448 canvas dimensions and genuinely transparent background. No text, no additional characters, no sexual content.

## 武器なし版への更新

- 旧版を `art-samples/q13-sara-armed-v1.png` に保存し、`assets/portraits/sara_dere.png` を生成原本で更新。
- 1086 × 1448 px、32-bit ARGB、左上アルファ値 0。一次目視で弓・弦・矢筒・矢の除去、照れ顔と頬に添えた手、衣装および透過背景を確認。
- 生成方式: 組み込み image_gen、旧版を参照。

プロンプト: Use case: precise-object-edit. Asset type: game dialogue character portrait. Remove the bow, bowstring, quiver, and all arrows behind the character completely, leaving no weapon or weapon fragments. Restore the cloak and transparent background naturally where they were obscured. Keep the same character, face, averted gaze, blush, pursed mouth, cheek-touching hand and pose, clothing, colors, anime style, framing, and 1086 x 1448 canvas. Genuine transparent background. No new objects or text.
