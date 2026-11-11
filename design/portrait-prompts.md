# 立ち絵 発注プロンプト集

画像生成AI向け。**「共通スタイル」＋「キャラ別」＋「表情」を1つにつなげて**貼り付けて使う。
プロンプト本文は英語（画像AIは英語のほうが安定するため）。

## 仕様

| 項目 | 指定 |
|---|---|
| 構図 | バストアップ（胸から上）、体はやや斜め、顔は正面寄り、視線はこちら |
| 縦横比 | 3:4（縦長）。1024×1365px 以上 |
| 背景 | 単色（白かグレー）。生成後に背景を透過して PNG にする |
| 枚数 | 1キャラにつき表情5種（normal / smile / angry / sad / blush） |
| ファイル名 | `assets/portraits/<ID>_<表情>.png`（例: `assets/portraits/eris_smile.png`） |

画像がそろったらこの名前でリポジトリに置く。ゲームへの組み込みはこちらで行う（それまでは仮のドット絵を表示）。

## 絵柄を揃えるコツ

1. 最初に **エリスの normal** を納得いくまで作る。
2. その1枚を「スタイル参照（style reference / 画像参照）」に指定して残り全員を作る。
3. 表情差分は、そのキャラの normal を「キャラ参照」にして表情の一文だけ差し替える。
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
| blush | `Embarrassed expression, light blush on the cheeks, eyes glancing slightly away.` |

## キャラ別

『無職転生』の原作キャラ。外見は言葉で指定してあるが、似せたい場合は各プロンプトの先頭に
`<キャラ名> from Mushoku Tensei,` を足すか、公式絵を「キャラ参照」に指定すると近づく。全員成人として描く。

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

### sylphiette — シルフィエット（治癒術師）
```
An 18-year-old slender woman with short white hair, slightly pointed ears, soft red-brown eyes, shy gentle smile. Wearing a white and pale green mage's tunic with a short cloak, a small pendant, a pair of dark sunglasses pushed up on her head. Holding a short wand.
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
A 20-year-old cat beastwoman with tanned skin, medium-length sandy brown hair, cat ears on top of her head, golden slit-pupil eyes, mischievous fanged grin. Wearing a short sporty sleeveless top with a light leather harness, a red scarf, fingerless gloves, one fist raised playfully.
```

## 追加で発注すると良いもの（任意）

| 素材 | プロンプトの要点 |
|---|---|
| タイトル画面 | `Wide fantasy key visual, a vast empty green grassland under a wide sky at dawn with the faint ruins of a city wall in the distance and a small refugee camp with tents, banner-like composition, empty space in the center for a title logo, anime background painting style, no characters, no text.` （16:9） |
| 会話背景（6種ほど） | 難民キャンプ・草原・森・城塞跡・迷宮・野営の夜。`Anime background painting, no characters, no text, 16:9` を付ける |
| イベント絵（Sランク告白） | 各ペアが決まってから個別に用意する |
