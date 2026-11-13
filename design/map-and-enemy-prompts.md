# マップ用キャラ絵・敵キャラ絵 発注プロンプト集

画像生成AI向け。立ち絵（`design/portrait-prompts.md`）とは別に、**マップ上に置く全身の小さいキャラ絵**と、**敵キャラの絵**を発注するためのもの。
プロンプト本文は英語。原作キャラは「ネットで公式デザインを調べてから描く」指示を入れてある。

## 1. マップ用キャラ絵の仕様

| 項目 | 指定 |
|---|---|
| 絵柄 | 2.5頭身のデフォルメ（SD）。太めの輪郭線、はっきりした塗り。小さく表示しても誰か分かること |
| 向き | **体は斜め右向き（画面右下を向く）**。顔は少し右、こちらを見ない。全員同じ向きにそろえる |
| ポーズ | 武器を構えて立つ待機姿勢。1キャラ1枚 |
| 構図 | 全身。足は画像の下端中央、頭の上と左右に少し余白。武器も画像内に収める |
| 縦横比 | 1:1（正方形）。1024×1024px 以上 |
| 背景 | 単色（白かグレー）。**地面の影は描かない**（影と敵味方の色の輪はゲーム側で描く）。生成後に背景を透過して PNG にする |
| ファイル名 | `assets/units/<ID>.png`（例：`assets/units/eris.png`） |

- ゲーム内では 64〜96px ほどで表示する。細かい装飾より、髪型・髪色・服の色・武器のシルエットを優先する。
- 敵味方の区別は足元の輪の色（青・赤）で示すので、**色違いの絵は不要**。
- 左向きが必要な場面は、ゲーム側で左右反転して使う。

### 絵柄を揃えるコツ

1. 最初に **エリス** を納得いくまで作る。
2. その1枚を「スタイル参照」に指定して、残り全員を作る。
3. 頭身と輪郭の太さがずれたら、プロンプトではなく参照画像の強さを上げて直す。

### 共通スタイル（全員の先頭に付ける）

```
Full-body chibi game unit sprite for a tactical fantasy RPG map. Super-deformed 2.5-heads-tall proportions with a large head and small body. Bold clean dark outline, flat cel shading with one soft highlight, bright readable colors, simple shapes that stay clear at small size. The character stands in an idle battle stance with the body turned three-quarter toward the lower right, face turned slightly right, not looking at the viewer. Whole body visible, feet at the bottom center of the image, weapon fully inside the frame, small margin around the figure. Plain flat light-gray background, no ground, no cast shadow, no scenery, no text, no frame. Single character.
```

### ネガティブプロンプト（対応しているツールのみ）

```
text, watermark, signature, logo, frame, border, scenery, ground shadow, multiple characters, cropped body, cropped weapon, realistic proportions, tall proportions, facing the viewer, facing left, back view, 3d render, photorealistic, blurry, low quality
```

## 2. 原作キャラのマップ用絵（仲間17人＋オルステッド）

次のひな形の `<NAME>` と `<POSE>` を表の内容に差し替え、共通スタイルの後ろに付ける。

```
Before drawing, search the web for the official anime character design of <NAME> from "Mushoku Tensei: Jobless Reincarnation" and match the hair color, hairstyle, eye color, skin tone and signature outfit. Draw this character as the chibi unit sprite described above. <POSE>
```

| ID | `<NAME>` | `<POSE>` |
|---|---|---|
| rudeus | Rudeus Greyrat (young adult, around 18) | `Holding a large wooden staff with a blue-green crystal, free hand raised as if casting a spell.` |
| eris | Eris Boreas Greyrat (young adult) | `Gripping a sword with both hands in an aggressive forward stance, fierce grin.` |
| ruijerd | Ruijerd Superdia | `Holding a white three-pronged spear upright in one hand, calm and stern.` |
| ghislaine | Ghislaine Dedoldia | `One hand on the hilt of a large sword at her hip, ready to draw.` |
| paul | Paul Greyrat | `Holding one sword forward and a second shorter sword low in the other hand, relaxed confident stance.` |
| roxy | Roxy Migurdia | `Holding a tall staff with a blue crystal in both hands, large witch hat.` |
| elinalise | Elinalise Dragonroad | `Slim sword in one hand and a small round shield raised in the other.` |
| sylphiette | Sylphiette (white short hair, adult) | `Pointing a short wand forward, other hand held open with a small swirl of wind magic.` |
| luke | Luke Notos Greyrat | `Standing in knight armor with a lance held upright and a small shield.` |
| sara | Sara, the archer of the adventurer party Counter Arrow | `Drawing a bow with an arrow nocked, quiver on her back.` |
| zanoba | Zanoba Shirone | `Bare-handed, both fists raised in a clumsy but powerful stance, glasses.` |
| cliff | Cliff Grimor | `Holding an open holy book in one hand, other hand raised with a small glow of light.` |
| linia | Linia Dedoldia | `No weapon. Low fighting crouch with clawed hands raised, tail up, fanged grin.` |
| pursena | Pursena Adoldia | `No weapon. Low fighting crouch with clawed hands raised, fluffy tail, calm sleepy eyes.` |
| ariel | Ariel Anemoi Asura | `Holding a slender rapier pointed forward with one hand, royal dress, tiara, dignified posture.` |
| isolde | Isolte Cluel (Water God Style swordswoman) | `Sword held low in a calm defensive counter stance.` |
| perugius | Perugius Dola (Armored Dragon King) | `No weapon. Standing tall with one hand extended forward as if commanding, long royal robes.` |
| orsted | Orsted (Dragon God) | `No weapon. Standing still with arms at his sides, long white coat, intimidating glare.` |

## 3. 一般の敵のマップ用絵（オリジナル）

共通スタイルの後ろにそのまま付ける。原作の調査は不要。服の主色は陣営ごとにそろえる（野盗＝くすんだ赤茶、私兵＝紺と銀、魔物＝暗い紫）。

| ファイル名 | 内容 | プロンプト |
|---|---|---|
| `enemy_bandit_soldier.png` | 野盗（槍） | `A scruffy bandit man with a dark red-brown ragged tunic, leather straps and a yellow headband, holding a crude spear with both hands, mean scowl.` |
| `enemy_bandit_fighter.png` | 野盗（斧） | `A burly bandit man with a dark red-brown sleeveless vest, fur collar and stubble, resting a heavy axe on his shoulder, mean grin.` |
| `enemy_bandit_archer.png` | 野盗（弓） | `A thin bandit with a dark red-brown hooded cloak covering half the face, aiming a short bow.` |
| `enemy_bandit_knight.png` | 野盗（重装） | `A large bandit in mismatched dented iron armor painted dark red-brown, holding a big shield and a short spear.` |
| `enemy_guard_soldier.png` | 私兵（槍） | `A disciplined private soldier in a navy blue surcoat over chain mail with silver trim and an open-faced steel helmet, holding a long spear upright.` |
| `enemy_guard_sword.png` | 私兵（剣） | `A private swordsman in a navy blue coat with silver trim and a light steel breastplate, holding a longsword in a guard stance.` |
| `enemy_guard_archer.png` | 私兵（弓） | `A private archer in a navy blue hooded tunic with silver trim, drawing a longbow.` |
| `enemy_guard_cavalier.png` | 私兵（騎馬） | `A private cavalry soldier in navy blue and silver armor riding a brown horse, holding a lance. The horse faces the lower right and is fully inside the frame.` |
| `enemy_guard_mage.png` | 私兵（魔術師） | `A hired mage in a navy blue robe with a silver-trimmed hood, holding a short staff with a red crystal.` |
| `enemy_guard_healer.png` | 私兵（治癒術師） | `A hired healer in a navy blue and white robe with a silver pendant, holding a slender staff with a pale green orb.` |
| `enemy_mercenary.png` | 傭兵（剣） | `A rough mercenary in a worn dark gray leather coat with a red scarf and one steel pauldron, holding a broad sword over one shoulder.` |
| `enemy_monster_wolf.png` | 魔物（狼型） | `A four-legged wolf-like monster with dark purple fur, glowing yellow eyes, spiky mane and bared fangs, in a low prowling stance. Not a humanoid.` |
| `enemy_monster_golem.png` | 魔物（岩の人形） | `A squat rock golem made of cracked dark purple stone with a glowing violet core in its chest, heavy fists.` |

## 4. 名前のある敵・ゲスト

名前のあるキャラは、**会話用の立ち絵**と**マップ用の絵**の両方を作る。

- 立ち絵：`design/portrait-prompts.md` の共通スタイルを先頭に付ける。表情は normal と angry の2種。ファイル名は `assets/portraits/<ID>_<表情>.png`。
- マップ用：この文書の共通スタイルを先頭に付ける。ファイル名は `assets/units/<ID>.png`。

### 4.1 原作キャラ（ネットで公式デザインを調べて描く）

北帝オーベール、剣神ガル・ファリオン、ダリウスの3人は敵役として採用決定。

| ID | 名前 | 登場 | 調べる名前 |
|---|---|---|---|
| auber | 北帝オーベール | 4章・6章 | Auber Corbett, the North Emperor known as the "Peacock Sword" |
| gall | 剣神ガル・ファリオン | 9章 | Gall Falion, the Sword God |
| darius | ダリウス上級大臣 | 9章 | Darius Silva Ganius, Senior Minister of the Asura Kingdom |
| orsted | オルステッド | 9章・10章 | 立ち絵は納品済み。マップ用だけ §2 の表で発注する |

立ち絵（共通スタイル＋下の文＋表情）：

```
Before drawing, search the web for the official anime character design of <NAME> from "Mushoku Tensei: Jobless Reincarnation" and match the hair color, hairstyle, eye color, skin tone and signature outfit. Draw this character as an adult antagonist with a threatening presence.
```

マップ用（共通スタイル＋§2 のひな形）のポーズ：

| ID | `<POSE>` |
|---|---|
| auber | `Flamboyant colorful outfit, holding a sword in an unorthodox tricky stance with the free hand hidden behind his back.` |
| gall | `Holding a single sword loosely at his side, relaxed but overwhelming, arrogant smirk.` |
| darius | `No weapon. A fat richly dressed nobleman clutching a jeweled cane, sneering.` |

### 4.2 オリジナルキャラ

| ID | 名前 | 登場 | 役割 |
|---|---|---|---|
| gaz | 野盗頭ガズ | 1章ボス | 重装の野盗の頭 |
| dolgan | 傭兵隊長ドルガン | 2章ボス | 貴族に雇われた傭兵隊長 |
| lotta | ロッタ | 2章の護衛対象 | 捜索団の治療師（味方） |
| mercboss | 貴族派の傭兵団長（名前未定） | 6章ボス | 防衛戦の攻め手 |
| apostle | 使徒 | 10章の最終ボス | 貴族を唆していた黒幕 |
| labyrinth | 迷宮の主 | 8章ボス | 転移の残滓が生んだ魔物 |

外見の記述（立ち絵・マップ用のどちらにも、共通スタイルの後ろに付ける）：

**gaz — 野盗頭ガズ**
```
A huge bandit chief around 40 with a shaved head, a thick black beard, a broken nose and a scar across one eye, greedy grin. Wearing dented dark iron plate armor stolen from soldiers, painted with a dark red-brown stripe, a fur mantle over the shoulders.
```
マップ用の追加：`Holding a large tower shield and a throwing spear.`

**dolgan — 傭兵隊長ドルガン**
```
A lean veteran mercenary captain around 45 with slicked-back gray hair, a neatly trimmed goatee, cold narrow eyes and a professional, bored expression. Wearing a dark gray long leather coat with a red scarf, a steel breastplate and one large steel pauldron bearing a noble's crest.
```
マップ用の追加：`Holding a broad steel sword pointed at the ground, other hand on his hip.`

**lotta — ロッタ（味方）**
```
A kind tired-looking woman healer around 30 with chestnut hair in a loose bun, warm brown eyes and a gentle worried smile. Wearing a plain cream-colored healer's apron dress with rolled-up sleeves, a green shawl and a satchel of bandages.
```
マップ用の追加：`Holding a simple wooden healing staff with a small green stone.`

**mercboss — 貴族派の傭兵団長**
```
A broad-shouldered mercenary commander woman around 35 with short black hair, a tanned face, a confident predatory smile and an old burn scar on her neck. Wearing heavy blackened steel armor with navy blue and silver trim and a torn navy cape.
```
マップ用の追加：`Holding a long halberd planted on the ground.`

**apostle — 使徒**
```
A slender androgynous adult figure of unclear age with long ash-white hair, pale skin and an unsettling gentle smile that does not reach the hollow pale-gold eyes. Wearing layered white and faded-gold pilgrim robes with a deep hood pushed back, frayed at the hems, and a thin cracked halo-like ornament behind the head.
```
マップ用の追加：`No weapon. Floating slightly with arms spread and palms up, robes drifting.`
（補足：本作オリジナルの人物。原作のキャラクターには似せない）

**labyrinth — 迷宮の主**（立ち絵は不要。マップ用のみ）
```
A large crystalline spider-like monster with a dark purple stone body, six sharp legs and a glowing violet crystal core in its back, many small glowing eyes. Not a humanoid.
```

## 5. 発注する順番の目安

1. エリスのマップ用絵（絵柄の基準を決める）
2. 第1〜2章に出る分：ルーデウス、ルイジェルド、ギレーヌ、パウロ、ロッタ、野盗4種、私兵（槍・剣・弓・騎馬）、傭兵、ガズ、ドルガン
3. 残りの仲間と、3章以降の敵

画像がそろったら `assets/units/` と `assets/portraits/` に置く。ゲームへの組み込みはこちらで行う。
