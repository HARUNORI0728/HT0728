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
| ファイル名 | `assets/portraits/<ID>_<表情>.png`（例: `assets/portraits/serena_smile.png`） |

画像がそろったらこの名前でリポジトリに置く。ゲームへの組み込みはこちらで行う（それまでは仮のドット絵を表示）。

## 絵柄を揃えるコツ

1. 最初に **セレナの normal** を納得いくまで作る。
2. その1枚を「スタイル参照（style reference / 画像参照）」に指定して残り全員を作る。
3. 表情差分は、そのキャラの normal を「キャラ参照」にして表情の一文だけ差し替える。
4. seed を固定できるツールなら、キャラごとに同じ seed を使う。

特定の作品名や絵師名はプロンプトに入れない（弾かれやすく、絵柄も安定しないため、画風は言葉で指定している）。

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

### ren — レン（主人公・魔法剣士）
```
A 17-year-old young man with short slightly messy black hair with one streak of deep blue at the fringe, dark navy-blue eyes, thoughtful intelligent look, slim build. Wearing a dark navy traveling coat with silver trim over a light leather chest guard, a short gray half-cape on the left shoulder, a small blue star-shaped crystal pendant at the collar. The hilt of a sword visible behind his right shoulder.
```

### serena — セレナ（王女・剣士）
```
A 17-year-old princess with long straight silver-white hair reaching past her shoulders, bangs parted in the middle, bright teal eyes, dignified and brave look. Wearing a thin gold circlet with a small teal gem on her forehead, white and ivory light plate armor with gold trim, rounded pauldrons, a deep teal cape, a teal gem brooch at the chest.
```

### kai — カイ（近衛騎士・槍騎士）
```
A 22-year-old knight with short spiky reddish-brown hair, sharp amber eyes, stern stoic face, strong jaw, broad shoulders. Wearing dark steel-gray plate armor with silver trim and large pauldrons, a dark crimson cape, a red gem at the chest plate. A thin old scar across his left eyebrow.
```

### mira — ミラ（魔道士）
```
A 17-year-old girl with shoulder-length wavy orange hair tied in two low twin tails, large bright green eyes, cheerful confident grin, a few freckles. Wearing a wide-brimmed purple pointed mage hat with a gold star charm, a purple short robe with gold trim over a white blouse, a red ribbon at the collar. Holding a wooden staff topped with a yellow crystal beside her shoulder.
```

### gald — ガルド（重騎士）
```
A 38-year-old veteran soldier with short black hair streaked with gray at the temples, a short trimmed beard, kind brown eyes with crow's feet, big sturdy build. Wearing very heavy thick steel plate armor in dull gray-blue with bronze rivets, a high gorget covering the neck, a worn brown cloak. A scar on his right cheek.
```

### fio — フィオ（長耳族・弓兵）
```
A young elf woman who looks about 19, long pointed ears, forest-green hair in a long side braid over one shoulder, golden-yellow eyes, wary but curious look, slender. Wearing a moss-green hooded hunter's tunic with leaf-shaped leather shoulder guards, a brown leather chest strap, a feather ornament in her hair. The top of a wooden bow and a quiver of arrows visible behind her back.
```

### lilia — リリア（僧侶）
```
An 18-year-old gentle nun with long soft wavy blonde hair, soft violet eyes, serene kind face. Wearing a white and pale-blue cleric's robe with gold embroidery, a white veil-like hood resting on the back of her head, a silver star-shaped holy pendant on her chest. Holding a slender healing staff with a blue orb.
```

### noel — ノエル（天馬騎士）
```
A 20-year-old mercenary woman with short light ice-blue bob hair, sharp gray-blue eyes, cool confident smirk. Wearing light silver breastplate armor over a white fur-collared winter riding jacket, navy-blue scarf, a single feather-shaped earring. A lance resting on her shoulder.
```

### jin — ジン（盗賊）
```
A 21-year-old rogue with shaggy dark purple hair under a dark red bandana, narrow sly violet eyes, playful lopsided grin. Wearing a black sleeveless leather vest over a dark gray high-collar shirt, a tattered olive-green scarf, a small silver hoop earring, a leather strap with throwing knives across the chest.
```

### rou — ロウ（獣人族・戦士）
```
A 24-year-old wolf beastman warrior with wild medium-length ash-gray hair, gray wolf ears on top of his head, bright orange eyes, wide fearless grin showing one fang, tanned skin, very muscular. Wearing a fur-trimmed brown leather harness over a bare chest and one shoulder, a single steel pauldron on the right shoulder, a bone-fang necklace, red tribal face paint stripes on his cheeks. The head of a large battle axe visible behind his shoulder.
```

### elsa — エルザ（魔族・闇魔道士）
```
A 26-year-old demon-kin woman with long straight pale lavender-white hair, two small curved black horns above her temples, crimson eyes with slit pupils, pale skin, cool sardonic half-lidded look. Wearing an elegant black and deep-purple high-collared sorceress robe with silver thorn-shaped trim, a dark red gem choker, long black gloves. A thin metal bracelet like a broken shackle on one wrist.
```

### van — ヴァン（傭兵）
```
A 29-year-old wandering swordsman with long dark green hair tied in a loose low ponytail, a black eyepatch over his left eye, one relaxed golden-brown eye, light stubble, easygoing unreadable smile. Wearing a worn dark olive long coat over a simple black leather cuirass, a faded torn military insignia on the shoulder, a beige neck wrap. The hilt of a curved sword at his side.
```

### teo — テオ（帝国皇子・光魔道士）
```
An 18-year-old prince with neat short golden-blond hair, clear sky-blue eyes, earnest noble and slightly troubled look, fair skin. Wearing a white and gold imperial high-collar uniform coat with red lining, gold shoulder cords, a small sun-shaped medal on the chest, a white short cape on one shoulder. Holding a closed white spellbook with a gold sun emblem against his chest.
```

## 追加で発注すると良いもの（任意）

| 素材 | プロンプトの要点 |
|---|---|
| タイトル画面 | `Wide fantasy key visual, a blue star shining over a small white castle on a hill at night, starry sky, banner-like composition, empty space in the center for a title logo, anime background painting style, no characters, no text.` （16:9） |
| 会話背景（6種ほど） | 村・城内・森・聖堂・雪原・野営の夜。`Anime background painting, no characters, no text, 16:9` を付ける |
| イベント絵（Sランク告白） | 各ペアが決まってから個別に用意する |
