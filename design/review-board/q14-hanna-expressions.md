# Q-14 ハンナ表情差分候補

採用済み `assets/portraits/hanna_normal.png` のみを各回の参照画像に指定し、内蔵 imagegen で独立生成。各画像は生成元をそのままコピーし、加工・リサイズなし。全3点とも実寸 1086 × 1448、32-bit ARGB PNG、四隅のアルファ値 0。生成時 `transparent_background: true`。

- `art-samples/q14-hanna-smile.png`：温かな笑顔と誘う手。手・衣装・人物像を目視確認。
- `art-samples/q14-hanna-angry.png`：毅然とした怒り。衣装・構図を目視確認。
- `art-samples/q14-hanna-sad.png`：伏せた視線と悲しい表情。衣装・構図を目視確認。

## smile プロンプト全文

```text
Create a smile expression variant of the supplied Hanna character portrait for a Japanese fantasy RPG. The supplied image is the sole identity, costume, art style, and framing reference. Preserve the same mature woman in her 40s, facial features, brown eyes, brown tied-back hair and striped ribbon, burgundy embroidered garment, cream rolled-sleeve blouse, apron with straps, buckles and waist bow, proportions, lighting, and polished anime rendering. Change her expression to a warm, natural welcoming smile, eyes gently softened, as she invites someone to share a meal; a natural inviting hand gesture if visible. No props. Keep the same centered chest-to-waist-up portrait composition and head scale. One character; transparent background with genuine alpha; target 1086 × 1448 pixels. No text, scenery, frame, or additional people.
```

## angry プロンプト全文

```text
Create an angry expression variant of the supplied Hanna character portrait for a Japanese fantasy RPG. The supplied image is the sole identity, costume, art style, and framing reference. Preserve the same mature woman in her 40s, facial features, brown eyes, brown tied-back hair and striped ribbon, burgundy embroidered garment, cream rolled-sleeve blouse, apron with straps, buckles and waist bow, proportions, lighting, and polished anime rendering. Change her expression to firm protective anger, determined lowered brows, mouth slightly open as if warning someone away from children; courageous and grounded, not villainous. No props or other people. Keep the same centered chest-to-waist-up portrait composition and head scale. One character; transparent background with genuine alpha; target 1086 × 1448 pixels. No text, scenery, or frame.
```

## sad プロンプト全文

```text
Create a sad expression variant of the supplied Hanna character portrait for a Japanese fantasy RPG. The supplied image is the sole identity, costume, art style, and framing reference. Preserve the same mature woman in her 40s, facial features, brown eyes, brown tied-back hair and striped ribbon, burgundy embroidered garment, cream rolled-sleeve blouse, apron with straps, buckles and waist bow, proportions, lighting, and polished anime rendering. Change her expression to quiet sadness, gaze lowered, brows gently raised in the middle, shoulders slightly lowered naturally. No props or other people. Keep the same centered chest-to-waist-up portrait composition and head scale. One character; transparent background with genuine alpha; target 1086 × 1448 pixels. No text, scenery, or frame.
```

納品先：`assets/portraits/hanna_smile.png`, `assets/portraits/hanna_angry.png`, `assets/portraits/hanna_sad.png`。主担当が外見と表情を目視確認。
