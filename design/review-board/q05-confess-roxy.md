# Q-05 ロキシー告白 候補

`art-samples/q05-confess-roxy.png`。生成1回、実測1672×941 px、RGB PNG、約16:9。画像生成ツール使用。参照：`assets/portraits/roxy_normal.png`（人物と衣装。杖は描かない指定）。

一次目視：青い二つ編み、青い目、茶の大きな帽子と白茶の服。夜の中庭でランプに照らされ、帽子のつばを上げて頬を赤らめ笑う。手は帽子と胸に自然に置かれ、杖・武器・文字・会話枠なし。右端の後ろ姿には長く結んだ髪が生成され、ルーデウスの既存の短髪と一致しない点が要確認。ゲーム内の切り抜き・台詞窓は未確認。

## 生成プロンプト全文

```text
Create a 16:9 all-ages Japanese fantasy RPG confession event illustration. The supplied image is the character and costume reference for adult Roxy: petite adult woman, long blue hair in two braids, blue eyes, large brown pointed wide-brimmed witch hat with patterned band, white and brown mage outfit and short cape. Do not include the reference's staff. At night in the small courtyard of a refugee camp after lessons, a single warm lantern illuminates her face. She has just heard the man she loves return her confession; she shyly lifts the brim of her hat slightly with one hand, revealing a clearly happy, blushing smile. Her other hand rests naturally near her chest. Adult Rudeus may be shown from behind at the far edge, Roxy is the unmistakable focus. Medium shot, face and hands safely central, delicate natural anatomy, polished anime illustration and softly painted night setting. No staff, wand, weapons, text, dialogue box, UI or frame. Wholesome and tender.
```

`transparent_background=false`。

## 髪型修正（1回）

初稿を `art-samples/q05-confess-roxy-v1.png` に保存。右端の結び髪を `assets/portraits/rudeus_normal.png` を参照して短い茶髪へ修正し、候補を更新。目視では結び髪が消え、ロキシーの顔・手・照明・構図は維持。修正版も1672×941 RGB。ゲーム内表示は未確認。

```text
Edit image 1 only. Image 2 is the identity reference for Rudeus's short light brown hair, not the scene. In image 1 change only the hair of the man seen from behind at the far right: remove his long tied ponytail and hair tie, and give him short untied light-brown hair ending above the collar, matching image 2 as seen from behind. Preserve exactly Roxy's face, expression, hat, hair, hands, costume and pose, the lantern lighting, background, framing and every other detail. No staff or weapon, no text. Keep the same wide 16:9 composition.
```

`transparent_background=false`。
