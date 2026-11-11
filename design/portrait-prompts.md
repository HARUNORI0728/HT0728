# 立ち絵 発注プロンプト集

画像生成AI向け。**「共通スタイル」＋「キャラ別」＋「表情」を1つにつなげて**貼り付けて使う。
プロンプト本文は英語（画像AIは英語のほうが安定するため）。

## 仕様

| 項目 | 指定 |
|---|---|
| 構図 | バストアップ（胸から上）、体はやや斜め、顔は正面寄り、視線はこちら |
| 縦横比 | 3:4（縦長）。1024×1365px 以上 |
| 背景 | 単色（白かグレー）。生成後に背景を透過して PNG にする |
| 枚数 | 1キャラにつき表情4種（normal / smile / angry / sad）。アリエルだけ「デレ顔」を足した5種（＋ dere） |
| ファイル名 | `assets/portraits/<ID>_<表情>.png`（例: `assets/portraits/eris_smile.png`。アリエルのデレ顔は `assets/portraits/ariel_dere.png`） |

画像がそろったらこの名前でリポジトリに置く。ゲームへの組み込みはこちらで行う（それまでは仮のドット絵を表示）。

## 絵柄を揃えるコツ

1. 最初に **エリスの normal** を納得いくまで作る。
2. その1枚を「スタイル参照（style reference / 画像参照）」に指定して残り全員を作る。
3. 表情差分は、そのキャラの normal を「キャラ参照」にして表情の一文だけ差し替える。アリエルの dere も同じ手順で作る。
4. seed を固定できるツールなら、キャラごとに同じ seed を使う。

共通スタイルには作品名や絵師名を入れていない（弾かれやすく絵柄が安定しないため、画風は言葉で指定している）。

## 共通スタイル（全員の先頭に付ける）

```
Character portrait for a Japanese tactical fantasy RPG, bust-up shot from the chest up, body turned slightly three-quarter, face toward the viewer, looking at the viewer. Clean anime illustration with crisp dark lineart, cel shading with soft gradient highlights, slightly muted medieval-fantasy color palette, detailed expressive eyes, elegant ornate costume design with metal trim. Soft light from the upper left. Plain flat light-gray background, no scenery, no text, no frame. Single character, centered, head fully inside the frame with a little space above the hair.
```

## ネガティブプロンプト（対応しているツールのみ）

```
text, watermark, signature, logo, frame, border, background scenery, multiple characters, full body, cropped head, extra fingers, deformed hands, 3d render, photorealistic, chibi, blurry, low quality
```

## 表情（末尾に1つ付ける）

| 表情 | 追加する一文 |
|---|---|
| normal | `Calm neutral expression, mouth closed.` |
| smile | `Warm gentle smile, eyes slightly narrowed.` |
| angry | `Angry determined expression, brows lowered, mouth slightly open as if shouting.` |
| sad | `Sad downcast expression, eyes lowered, brows raised in the middle.` |
| dere（アリエル専用） | `Tsundere expression, embarrassed and trying not to show it, light blush on the cheeks, lips pressed in a slight pout, eyes glancing away from the viewer, arms or hand held defensively near the chest.` |

## キャラ別

『無職転生』の原作キャラ。外見は言葉で指定してあるが、似せたい場合は各プロンプトの先頭に
`<キャラ名> from Mushoku Tensei,` を足すか、公式絵を「キャラ参照」に指定すると近づく。結婚候補と告白場面に出るキャラは必ず成人として描く。

### rudeus — ルーデウス（主人公・魔術師）
```
An 18-year-old young man with short light-brown hair, green eyes, a small mole under his left eye, gentle face with a slightly wry polite smile. Wearing a dark gray hooded mage robe with a high collar over a simple shirt, traveling style. Holding a large wooden staff topped with a big blue-green magic crystal beside his shoulder.
```

### eris — エリス（剣士）
```
A 20-year-old swordswoman with long vivid crimson-red hair tied in a high ponytail with long side locks, fierce red eyes, proud confident expression with a fearless grin. Athletic build. Wearing a black sleeveless battle top with a light leather chest guard, red and white trim, fingerless gloves. The hilt of a sword visible over her shoulder.
```

### ruijerd — ルイジェルド（スペルドの戦士）
```
A tall stoic warrior man who looks about 30, pale skin, a shaved bald head, a red jewel embedded in the center of his forehead, a long scar across his face, sharp calm eyes, stern expression. Muscular. Wearing a simple sleeveless tribal tunic and a white headband-like cloth, a worn travel cloak. Holding a white three-pronged spear upright beside him.
```
（補足：スペルド族本来の髪はエメラルドグリーン。髪ありで描く場合は `long emerald-green hair tied back` に差し替える）

### ghislaine — ギレーヌ（剣王）
```
A tall muscular beastwoman swordmaster in her thirties with dark brown skin, shoulder-length gray-silver hair, feline animal ears on top of her head, a black eyepatch over her right eye, one sharp golden eye, calm blunt expression. Wearing a minimal dark leather chest wrap and shoulder strap, a fur-trimmed half cloak. A large sword hilt visible behind her back.
```

### paul — パウロ（傭兵）
```
A handsome rugged man around 40 with short tousled brown hair, light stubble, tired but warm brown eyes, a roguish half smile. Wearing a worn leather cuirass over a white open-collar shirt, a brown travel cloak. Two sword hilts visible, one over the shoulder and one at the hip.
```

### roxy — ロキシー（水王級魔術師）
```
A petite adult woman mage with a youthful face, long water-blue hair in two long braids, sleepy calm blue eyes, composed expression. Wearing a large brown wide-brimmed pointed witch hat, a white and brown mage robe with a short cape. Holding a tall wooden staff with a blue crystal.
```

### elinalise — エリナリーゼ（盾剣士）
```
An elegant adult elf woman with long pointed ears, voluminous blonde hair in large drill curls, emerald eyes, confident flirtatious smile. Wearing refined light plate armor with a deep green and white dress underneath, ornate gold trim. A slim sword at her side and the edge of a small round shield visible.
```

### sylphiette — シルフィエット（万能型の魔術師）
```
An 18-year-old slender woman with short white hair, slightly pointed ears, soft red-brown eyes, composed and dignified bearing with a faint confident smile. Wearing a white and pale green mage's tunic with a short cloak, a small pendant, a pair of dark sunglasses pushed up on her head. Holding a short wand ready in one hand, held upright in a poised stance.
```

### luke — ルーク（騎士）
```
A handsome 21-year-old noble knight with neat medium-length brown hair, sharp confident eyes, charming smirk. Wearing polished silver plate armor with blue cloth and gold trim, a royal guard's blue cape with a crest clasp. A lance resting on his shoulder.
```

### sara — サラ（弓兵）
```
A 19-year-old adventurer archer with short blonde hair, sharp blue eyes, guarded slightly sulky expression. Wearing a light green hunter's tunic with a brown leather chest guard and arm bracer, a short hooded cape. The top of a bow and a quiver of arrows visible behind her back.
```

### zanoba — ザノバ（神子）
```
A tall lanky prince in his late twenties with a long narrow face, light brown hair combed back, small round glasses, an eccentric enthusiastic grin. Wearing an ornate but slightly rumpled royal coat in dark red and gold with a white cravat. Cradling a small hand-carved figurine carefully in one hand.
```

### cliff — クリフ（神撃術師）
```
A short 20-year-old young priest with dark brown hair, a black eyepatch over one eye, proud serious expression, chin slightly raised. Wearing white and gold Millis church vestments with a high collar and a holy emblem on the chest. Holding a closed holy book.
```

### linia — リニア（盗賊）
```
A 20-year-old cat beastwoman with tanned skin, medium-length sandy brown hair, cat ears on top of her head, golden slit-pupil eyes, mischievous fanged grin. Wearing a short sporty sleeveless top with a light leather harness, a red scarf, fingerless gloves. Unarmed, no weapons: one clawed hand raised in a playful fighting pose with sharp claws clearly visible, grin showing prominent fangs.
```
（獣族は牙と爪で戦う設定のため武器は持たせない）

### ariel — アリエル（アスラ王国の王女）
```
An adult princess in her early twenties with long wavy golden-blonde hair, a regal dignified bearing, composed and slightly haughty expression. Wearing an elegant royal gown with a fitted bodice and fine gold embroidery, a small jeweled accessory in her hair.
```
（要確認：瞳の色、ドレスの色と細部、髪飾りの有無。上は原作の確実な部分である金髪の王女像のみ断定している）
※ 表情は normal / smile / angry / sad に加えて `dere` を作る。

### pursena — プルセナ（犬系の獣族。リニアの相棒）
```
An adult dog beastwoman adventurer with floppy dog ears on top of her head, a fluffy dog tail visible behind her, lively energetic expression with a toothy grin showing fangs. Athletic build. Unarmed, no weapons: one clawed hand raised in a fighting stance with sharp claws clearly visible. Wearing light, easy-to-move adventurer clothing.
```
（要確認：髪色・髪型、瞳の色、肌の色、耳の形（垂れ耳か立ち耳か）、服装の色と細部）

### isolde — イゾルテ（水神流の女性剣士）
```
An adult swordswoman in a calm, disciplined stance with a focused composed expression. Wearing practical swordsman's clothing suited to fluid, precise movement. A sword at her side, one hand resting on its hilt.
```
（要確認：髪色・髪型、瞳の色、年齢の見た目、服装、剣の種類。外見の原作設定は確信が持てないため上は構えと役割のみ。打合せメモでも原作設定は要確認）

### perugius — ペルギウス（甲龍王。空中城塞の主）
```
A tall, imposing adult man with silver hair and golden eyes, a regal, severe and dignified expression, the bearing of an ancient dragon king. Wearing ornate white royal robes with a long mantle and elaborate gold trim.
```
（要確認：髪型、装飾や紋様の細部、持ち物（武器・杖の有無））

### orsted — オルステッド（敵として登場。龍神）
```
A tall imposing adult man with silver-white hair, sharp golden eyes with small pupils, a naturally frightening glare and a cold stern expression, an overwhelming menacing presence. Wearing a long white coat with a high collar over dark clothes.
```
（要確認：コートの細部と装飾、兜を被った姿にするか素顔にするか。敵として登場するため、表情は angry を強めにしてよい）

## 追加で発注すると良いもの（任意）

| 素材 | プロンプトの要点 |
|---|---|
| タイトル画面 | `Wide fantasy key visual, a vast empty green grassland under a wide sky at dawn with the faint ruins of a city wall in the distance and a small refugee camp with tents, banner-like composition, empty space in the center for a title logo, anime background painting style, no characters, no text.` （16:9） |
| 会話背景（6種ほど） | 難民キャンプ・草原・森・城塞跡・迷宮・野営の夜。`Anime background painting, no characters, no text, 16:9` を付ける |
| イベント絵（結婚候補7人の告白） | 下の「イベント絵」の節を参照 |
| イベント絵（嫁同士が拠点で集まる場面・余力枠） | 下の「イベント絵」の節を参照 |

## イベント絵（告白場面）

結婚候補7人の告白場面を各1枚、16:9。支援ランクSの人から、章ごとの告白イベントで選ぶ想定。
場面は本作用の書き下ろしで、原作の特定の場面は再現しない。全年齢向け（抱擁や手を取る程度まで）。
各プロンプトの先頭に、そのキャラの「キャラ別」の外見文を付ける（共通スタイルは立ち絵用なので、イベント絵では背景と構図の指定に置き換える）。
ルーデウスは後ろ姿か画面端に置き、相手を主役にする。

イベント絵の共通スタイル（先頭に付ける）:
```
Wide cinematic anime illustration for a Japanese tactical fantasy RPG event scene, 16:9, clean crisp lineart, cel shading with soft gradient lighting, slightly muted medieval-fantasy palette, wholesome and tender mood, no text, no frame.
```

| ID | プロンプト（キャラ別の外見文の後ろに続ける） |
|---|---|
| sylphiette | `Late afternoon golden light on a quiet grassy hill above the refugee camp, medium shot, she faces a young man seen from behind at the edge of the frame and holds her wand against her chest, looking up at him with a gentle, slightly teary smile.` |
| roxy | `Night in a small lantern-lit courtyard of the camp, medium shot, she stands under a warm lamp holding her staff with both hands, looking at the viewer with a soft blush and a rare, shy smile.` |
| eris | `Sunrise on an open training ground, wide shot with long shadows, she plants her sword tip in the ground and holds her hand out toward the viewer, grinning boldly with a slight blush.` |
| sara | `Early evening beside a stream in a forest clearing, medium shot, she sits on a rock with her bow resting beside her, looking away with a sulky blush that is breaking into a small honest smile.` |
| linia | `Evening on the rooftop of a camp tent, wide shot with the sunset glow, she sits with her legs swinging and her red scarf fluttering, reaching a clawed hand out to the viewer with a playful but sincere smile.` |
| pursena | `Midday in a flower field at the edge of the camp, medium shot, she walks toward the viewer with her ears perked and tail wagging, hands clasped behind her back, with a bright, slightly nervous smile.` |
| ariel | `Dusk in a small stone garden of the camp with soft lantern light, medium shot, she turns her face away with a deep blush and a pout, yet reaches out and takes the viewer's hand, flustered but honest (dere expression).` |

### 余力枠：嫁同士が拠点で集まる場面
| 素材 | プロンプトの要点 |
|---|---|
| 嫁同士の集合 | `Cozy gathering in the refugee camp common tent in the evening, wide shot, several women (use up to three of the heroines' appearance prompts) sitting around a table sharing tea and sweets, laughing and chatting, warm lantern light, comedic and friendly atmosphere.` （16:9） |
