# Q-14 ロッタ 表情差分候補

唯一の画像参照：`assets/portraits/lotta_normal.png`。画像生成ツールで2表情を独立生成。出力は `art-samples/q14-lotta-smile.png` と `art-samples/q14-lotta-sad.png`。両方とも実測1086×1448、32-bit RGBA PNG、四隅 alpha 0。生成後の寸法調整なし。

目視では髪、リボン、緑の刺繍入りマント、白い服、医療鞄を保持し、笑顔は治療後の安堵、悲しみは増援への不安を表現。頭の欠け・文字・背景・武器・他人物なし。ゲーム実画面は未確認。

## プロンプト全文

### smile
```text
Create a smile expression variation for this exact fantasy RPG portrait of Lotta. The supplied portrait is the sole visual reference; preserve her identity, adult face, warm brown eyes, chestnut low bun with long curls and cream leaf-embroidered ribbon, olive embroidered cloak and gold clasp, cream dress, leather strap and medical satchel, and polished anime illustration style. She is a compassionate healer who has just safely treated the injured: show a reassuring, genuinely warm smile and a natural slightly turned head and relaxed posture. Keep the same chest-up portrait scale and coherent costume details. One person, wholesome all-ages, no weapon, no text, no scenery, no border. Genuine transparent background with alpha. Intended final canvas 1086 × 1448 pixels.
```

### sad
```text
Create a sad expression variation for this exact fantasy RPG portrait of Lotta. The supplied portrait is the sole visual reference; preserve her identity, adult face, warm brown eyes, chestnut low bun with long curls and cream leaf-embroidered ribbon, olive embroidered cloak and gold clasp, cream dress, leather strap and medical satchel, and polished anime illustration style. She is a compassionate healer worried by enemy reinforcements but still determined to protect the injured. Show a restrained, worried sad expression, brows lifted inward and gaze lowered slightly, with a natural subtly bowed head and tense posture. Keep the same chest-up portrait scale and coherent costume details. One person, wholesome all-ages, no weapon, no text, no scenery, no border. Genuine transparent background with alpha. Intended final canvas 1086 × 1448 pixels.
```

両回 `transparent_background=true`。
