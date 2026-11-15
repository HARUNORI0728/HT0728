# Q-13 シルフィエット表情差分

2026-11-16 JST。assets/portraits/sylphiette_dere.png を納品。組み込みimagegenで既存normalを参照し、生成原本を無加工で保存した。

元画像・差分とも1086×1448、RGBA、アルファ範囲0〜255。寸法と透過の検査記録は q13-sylphiette-check.json。目視で衣装、杖、手のポーズ、イヤリング、構図を維持。伏し目、小さな笑顔、頬と長い耳先の赤みを確認。ピクセル単位で顔以外が一致するものではなく、髪の線に小変化あり。アルファの外接矩形は微小な外周画素にも反応するため原本と異なる。明暗背景での縁と表情切替の位置ずれはゲーム内で未確認。

台本・ゲーム用登録は変更していない。Claudeが告白・支援A以降へ適用。残りroxy/eris/sara/linia/pursenaの5人は未納。

## 完全プロンプト

Use case: precise-object-edit. Create a shy affectionate facial-expression variant of this existing visual-novel portrait. Preserve character identity, silver-white hair, long pointed ears, eye colors, earring, dark teal uniform, wand, hand pose, body pose, exact framing and silhouette. Change ONLY facial expression and blush: eyes gently lowered shyly, small closed-mouth happy smile, pink blushing cheeks and pink tips of both long ears. Wholesome nonsexual emotion. Identical clean anime illustration style and lighting. Keep exact original 1086x1448 pixel canvas if possible, 3:4 aspect, identical head position and scale. Genuine transparent background, preserve transparent margins, no backdrop, no text or symbols. Do not redesign clothes or hair, no extra accessories.
