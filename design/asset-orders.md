# 外部AIへの発注書（音楽・背景・イベント絵）

他の生成AIに作ってもらう素材の一覧。**この文書をそのまま渡せば作業できる**ように書いてある。
キャラの立ち絵は `design/portrait-prompts.md`、マップ用キャラ絵と敵は `design/map-and-enemy-prompts.md` を参照（どちらも発注済み・大半が納品済み）。

- 作品：『フィットア奪還戦記』。中世ファンタジーのターン制タクティクスRPG（個人で遊ぶ用・非公開）。
- 雰囲気：故郷を失った人々が草原の難民キャンプから再建していく物語。シリアスとコメディの両方がある。
- 納品先：下の表のファイル名で、リポジトリの指定フォルダに置く。ゲームへの組み込みはこちらで行う。

---

## 1. 音楽（BGM）

### 共通の指定

| 項目 | 指定 |
|---|---|
| 形式 | MP3（192kbps 以上）または OGG。ステレオ |
| 歌 | **歌・声・コーラスの歌詞なし（インストゥルメンタル）** |
| 長さ | 表のとおり。BGM は 1分30秒〜2分30秒 |
| ループ | 曲の最後が最初に自然につながること（フェードアウトで終わらせない。最後の小節は最初の小節へ戻れる形で止める） |
| 音量 | 曲どうしで聞こえる大きさをそろえる。会話の邪魔にならないよう、メロディは中音域中心 |
| 置き場所 | `assets/audio/bgm/<ファイル名>.mp3` |

### 全曲共通の前置き（各プロンプトの先頭に付ける）

```
Instrumental only, no vocals, no lyrics. Soundtrack for a medieval-fantasy tactical RPG. Acoustic orchestral instruments with a small ensemble feel (strings, woodwinds, harp, piano, light percussion), warm and melodic, memorable main motif, clean mix. Seamless loop: the ending must flow naturally back into the beginning, no fade-out.
```

### 曲リスト

| ファイル名 | 使う場面 | 長さ | プロンプト（前置きの後ろに付ける） |
|---|---|---|---|
| `title` | タイトル画面 | 2:00 | `Main theme. A hopeful but bittersweet melody for solo flute and strings over gentle harp arpeggios, opening quietly like dawn over an empty grassland and swelling to a warm full-ensemble statement of the theme. Moderate tempo, 3/4 or 6/8.` |
| `prologue` | 序章（前世の独白） | 2:00 | `Lonely, introspective piano solo with a faint sustained string pad and distant rain-like texture. Slow, sparse, regretful, ending on an unresolved chord that turns slightly hopeful.` |
| `camp` | 難民キャンプ（章の合間） | 2:00 | `Cozy village-life theme. Acoustic guitar, pizzicato strings, recorder and light hand percussion. Relaxed walking tempo, homely and warm, a place people return to.` |
| `map_dawn` | 自軍フェイズ（1〜3章） | 2:30 | `Adventure field theme, determined and bright. Marching snare and staccato strings drive a brave woodwind melody; a sense of setting out. Medium-fast tempo around 120 BPM.` |
| `map_resolve` | 自軍フェイズ（4〜7章） | 2:30 | `Heroic strategy theme with more weight. Full strings carry a noble melody over steady timpani and low brass accents, confident and forward-moving. Around 126 BPM.` |
| `map_final` | 自軍フェイズ（8〜10章） | 2:30 | `Grand, resolute battle-march. A fuller orchestral restatement of a hopeful main motif with driving percussion, soaring strings and brass, the feeling of a final push after a long road. Around 132 BPM.` |
| `map_enemy` | 敵軍フェイズ | 1:30 | `Tense enemy-turn theme. Low strings ostinato, muted brass stabs and ticking percussion, minor key, threatening but not chaotic. Around 110 BPM.` |
| `boss` | ボスと戦うとき | 2:00 | `Fierce boss battle theme. Fast aggressive strings, pounding drums and bold brass in a minor key, with a short heroic counter-melody in the middle. Around 150 BPM.` |
| `crisis` | 耐久・防衛の章、追い詰められた場面 | 2:00 | `Desperate last-stand theme. Urgent repeating string figure, heartbeat-like low drum, rising tension with brief glimmers of hope in the woodwinds. Around 138 BPM.` |
| `daily` | 明るい会話 | 1:30 | `Light everyday conversation theme. Bouncy pizzicato strings, clarinet and glockenspiel, cheerful and slightly mischievous. Around 110 BPM.` |
| `comedy` | コメディ場面 | 1:30 | `Comical slapstick theme. Tuba or bassoon oom-pah bass, playful xylophone and sliding clarinet, clumsy and funny, short phrases with pauses for punchlines.` |
| `sad` | 悲しい場面、失ったものを語る場面 | 2:00 | `Quiet sorrowful theme. Solo cello melody over slow piano chords, restrained and dignified grief, a single warm major chord near the end.` |
| `resolve` | 決意の場面、踏みとどまる場面 | 2:00 | `Emotional turning-point theme. Starts with a fragile piano statement of the main motif, strings join and build steadily to a strong, uplifting climax, then settle so it can loop.` |
| `mystery` | 黒幕の気配、謎が深まる場面 | 1:30 | `Uneasy mystery theme. Sparse celesta notes, low sustained strings with slow dissonant swells, a faint reversed-sounding shimmer, something unseen watching. Slow.` |
| `romance` | 支援会話（恋愛）、告白 | 2:00 | `Tender romance theme. Gentle piano and solo violin duet with soft harp, intimate, shy and sincere, slowly blooming. Slow 3/4.` |
| `family` | 家族・仲間の絆の会話 | 2:00 | `Warm nostalgic theme. Acoustic guitar and solo oboe with soft strings, like remembering a childhood home, comforting.` |
| `orsted` | オルステッド登場・対峙 | 2:00 | `Overwhelming dread theme. Deep sustained low brass and sub-bass drone, slow heavy drum hits, cold high string harmonics, an ancient and lonely power. Very slow, minor.` |
| `final_boss` | 最終ボス（使徒） | 2:30 | `Final battle theme. Epic and tragic: pipe organ, full orchestra and driving percussion in a minor key, with a hopeful main motif fighting through in the strings and finally taking over. Around 145 BPM.` |
| `ending` | エンディング・後日談 | 2:30 | `Ending theme. The main motif returns fully resolved: warm strings, flute and piano, peaceful and grateful, like a rebuilt village at sunset. Slow to moderate.` |

### 短い曲（ジングル。ループしない）

共通の前置きの「Seamless loop…」の一文は外し、代わりに `Short jingle with a clear ending, does not loop.` を付ける。置き場所は `assets/audio/bgm/`。

| ファイル名 | 使う場面 | 長さ | プロンプト |
|---|---|---|---|
| `victory` | 章クリア | 0:08 | `Triumphant victory fanfare for brass and strings, bright major key, ends on a held chord.` |
| `defeat` | 敗北 | 0:08 | `Short mournful phrase for low strings and a single horn, descending, ends quietly.` |
| `levelup` | レベルアップ | 0:03 | `Very short sparkling ascending fanfare for harp, glockenspiel and trumpet.` |
| `classchange` | クラスチェンジ | 0:06 | `Majestic rising fanfare with shimmering harp glissando and a full orchestral hit.` |
| `support` | 支援ランクが上がったとき | 0:04 | `Short gentle chime phrase for celesta and harp, warm and happy.` |

効果音（決定音、攻撃、回復など）はゲーム側でプログラムから鳴らすので、発注は不要。

---

## 2. 背景（会話シーン用）

### 共通の指定

| 項目 | 指定 |
|---|---|
| 縦横比 | 16:9、1920×1080px 以上 |
| 内容 | **人物なし・文字なし**。手前に立ち絵と台詞枠が重なるので、画面の下3分の1は情報を少なく、少し暗めに |
| 絵柄 | 立ち絵と同じアニメ調の背景画 |
| 置き場所 | `assets/backgrounds/<ファイル名>.png` |

### 共通の前置き

```
Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it.
```

### 背景リスト

| ファイル名 | 使う場面 | プロンプト |
|---|---|---|
| `grassland_day` | 草原になった故郷（昼） | `A vast empty green grassland under a wide sky where a town once stood, a few broken stone wall fragments half-buried in grass, distant snow-capped mountains.` |
| `camp_day` | 難民キャンプ（昼） | `A refugee camp of patched canvas tents on a grassy plain, cooking fires, hanging laundry, wooden crates and barrels, a makeshift well, busy but poor, hopeful morning light.` |
| `camp_night` | 難民キャンプ（夜） | `The same refugee camp at night, warm lantern and campfire light among the tents, starry sky, quiet.` |
| `camp_sunset` | 幕間・夕暮れの語らい | `A refugee camp at sunset seen from a small rise, long shadows, orange sky, smoke rising from supper fires.` |
| `tent_inside` | 作戦天幕の中 | `Interior of a large command tent, a rough wooden table with a map and wooden markers, a hanging lantern, bedrolls and weapon racks along the canvas walls.` |
| `ruined_village` | 廃村 | `An abandoned village with thatched-roof cottages in disrepair, a broken wooden palisade, overgrown paths, overcast sky.` |
| `forest` | 森 | `A deep temperate forest with tall trees, shafts of light through the canopy, a mossy path.` |
| `riverside` | 川辺 | `A calm riverside with reeds and a simple wooden bridge, grassland on both banks, afternoon light.` |
| `ruined_city` | ロアの城壁跡 | `The ruins of a large fortified city: long stretches of collapsed stone wall and a broken gate tower rising out of grassland, dramatic clouds.` |
| `labyrinth` | 迷宮 | `Inside a magical labyrinth cave with smooth dark stone walls, faint violet crystal veins glowing in the dark, drifting motes of light, eerie.` |
| `sky_fortress` | 空中城塞（ペルギウス） | `A grand hall of a floating sky fortress, white marble columns, tall arched windows showing clouds below, golden ornaments, solemn and bright.` |
| `noble_camp` | 敵の本陣 | `A military encampment of a noble's private army, orderly rows of navy-blue tents with silver trim, banners, weapon stands, torches at dusk.` |
| `battlefield_dusk` | 決戦のあと | `A quiet grassland battlefield at dusk after the fighting, broken spears and banners stuck in the ground, low red sun, wind in the grass.` |
| `white_void` | 使徒との対峙 | `An endless pale white void with a faint horizon line and thin drifting mist, unsettling emptiness, very subtle cracks of light in the sky.` |
| `rebuilt_village` | 後日談（再建した村） | `A newly rebuilt farming village with fresh timber houses, golden wheat fields, a small mill by a stream, children's toys left by a fence, bright peaceful afternoon.` |
| `home_inside` | 後日談（家の中） | `A cozy wooden house interior with a hearth, a dining table set for a family, shelves of books and a staff leaning in the corner, warm evening light through the window.` |
| `title` | タイトル画面 | `Key visual: a vast green grassland at dawn with the faint ruins of a city wall in the distance and a small refugee camp with tents and a single thin line of smoke, wide sky with soft clouds, empty space in the upper center for a title logo.` |

---

## 3. イベント絵

告白場面7枚と「嫁同士が拠点で集まる場面」1枚のプロンプトは、`design/portrait-prompts.md` の「イベント絵（告白場面）」の節にある。置き場所は `assets/events/<ファイル名>.png`（ファイル名は同節の指定どおり）。

第3章以降で必要になる追加の絵（新しい敵、章ごとの見せ場の一枚絵）は、各章の筋書きが固まり次第、この文書の末尾に追記する。

---

## 4. 納品のしかた

1. 上の表のファイル名どおりに保存する（拡張子は音楽が `.mp3` か `.ogg`、絵が `.png`）。
2. リポジトリの `assets/audio/bgm/`、`assets/backgrounds/`、`assets/events/` に置いてコミットする。
3. 全部そろっていなくてよい。届いた分から順にゲームへ組み込む。無い素材は、音楽ならプログラムで鳴らす仮の曲、背景なら単色の画面で代用する。
