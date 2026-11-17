# Q-05 エリス納刀 一次候補

- `art-samples/q05-ev_eris_sheathe.png`。内蔵 imagegen で1回生成し無加工コピー。1672×941、24-bit RGB、約16:9。
- 参照: `assets/portraits/eris_normal.png`, `assets/portraits/darius_normal.png`。場面は `design/script-ch9-10.md` 第9章終幕、発注は `design/portrait-prompts.md`。
- 一次目視: 赤いポニーテールと既存衣装、松明の広間、画面端の縄で縛られたダリウスを確認。流血や負傷なし。右手は剣の柄、左手は鞘を持ち、刃と鞘口は概ね同一直線で納刀動作と読める。
- 重大な留保: 指示に反して画像下部に空の装飾付き会話枠が描き込まれた。ゲーム側の会話欄と重複するため採用前に対処が必要。ゲーム内表示は未確認。

## 生成プロンプト全文

```text
Use case: illustration-story. A wholesome 16:9 Japanese tactical fantasy RPG event CG at night inside a noble mansion's torchlit hall. Image 1 is Eris's character and clothing reference: adult swordswoman with long crimson hair tied in a high ponytail, red eyes, same black coat with pale fur collar and white fitted top. Image 2 is Darius's identity reference: bald older heavyset noble in dark purple and red ornate clothes. Eris is the central subject, standing with restrained sorrow and resolve, looking downward as she slowly returns her sword to its scabbard. Depict the physical action coherently: her right hand grips the sword hilt; the blade tip enters the open mouth of the scabbard held steady in her left hand at her hip, blade and scabbard aligned as one straight continuous axis. Clearly visible hands, hilt, blade and scabbard mouth above the lower quarter reserved for dialogue. At the edge of frame Darius kneels bound with rope, unharmed, not threatened by the blade. Somber, dignified restraint; warm torchlight and cool shadows. Clean polished anime lineart, cel shading and soft gradient highlights. All ages, no injury, blood, gore, text, watermark or frame.
```

## 会話枠除去の再生成（v2）

初稿を `art-samples/q05-ev_eris_sheathe-v1.png` に退避。元の2立ち絵を参照し1回再生成、候補へ無加工コピー。1672×941、24-bit RGB。一次目視では会話枠・文字なし、右手は柄、左手は鞘、刃と鞘口は概ね一線でつながる。拘束されたダリウスと流血なしも確認。実ゲーム表示・会話欄の重なりは未確認。

```text
Use case: illustration-story. A wholesome cinematic 16:9 anime illustration at night inside a noble mansion's torchlit hall. Image 1 is Eris's character and clothing reference: adult swordswoman with long crimson hair tied in a high ponytail, red eyes, same black coat with pale fur collar and white fitted top. Image 2 is Darius's identity reference: bald older heavyset noble in dark purple and red ornate clothes. Eris is the central subject, standing with restrained sorrow and resolve, looking downward as she slowly returns her sword to its scabbard. Her right hand grips the sword hilt; the blade tip enters the open mouth of the scabbard held steady in her left hand at her hip, blade and scabbard aligned as one straight continuous axis. Clearly visible hands, hilt, blade and scabbard mouth near the center. At the edge Darius kneels bound with rope, unharmed, not threatened by the blade. Somber, dignified restraint; warm torchlight and cool shadows. Clean polished anime lineart, cel shading and soft gradient highlights. Edge-to-edge artwork, absolutely no text boxes, dialogue frames, borders, game UI, transparent overlays, text, logos or watermark. All ages, no injury, blood or gore.
```
