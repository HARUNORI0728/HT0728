# 背景素材・第1便（2026-11-14）

`asset-orders.md` の優先背景6枚を `assets/backgrounds/` に納品。
`title.png`, `grassland_day.png`, `camp_day.png`, `camp_night.png`,
`tent_inside.png`, `ruined_village.png`。

- 制作: built-in ImageGen。人物・文字なし、アニメ背景画。
- 納品: PNG、1920×1080。生成原寸1672×941から高品質バイキュービックで納品寸法へ拡大。
- 検品: 各画像を目視確認、PNG読み込みと寸法確認。
- 昼夜キャンプは同一構図。遠景の城は故郷喪失の設定に合わせて廃墟へ修正。
- ゲーム側への組み込みは発注書どおり別作業。
- 音楽は音楽生成サービス未接続のため未納品。残りの背景11枚とイベント絵8枚も未納品。

## 共通生成プロンプト

```text
Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it. Generate at 2048x1152 or higher, exact 16:9. Rich professional hand-painted anime environment with delicate naturalistic color and coherent perspective, no modern objects.
```

## title

```text
Key visual: a vast green grassland at dawn with the faint ruins of a city wall in the distance and a small refugee camp with tents and a single thin line of smoke, wide sky with soft clouds, empty space in the upper center for a title logo.
```

## grassland_day

```text
A vast empty green grassland under a wide sky where a town once stood, a few broken stone wall fragments half-buried in grass, distant snow-capped mountains.
```

## camp_day

```text
A refugee camp of patched canvas tents on a grassy plain, cooking fires, hanging laundry, wooden crates and barrels, a makeshift well, busy but poor, hopeful morning light. Signs of life but absolutely no people.
```

## camp_night

```text
The same refugee camp at night, warm lantern and campfire light among the tents, starry sky, quiet.
```

## tent_inside

```text
Interior of a large command tent, a rough wooden table with a map and wooden markers, a hanging lantern, bedrolls and weapon racks along the canvas walls. Map markings are purely abstract geographical shapes, no lettering.
```

## ruined_village

```text
An abandoned village with thatched-roof cottages in disrepair, a broken wooden palisade, overgrown paths, overcast sky.
```

## 修正・夜版の指示

camp_day: 遠景の健在な城・街・石橋を、草原と低い城壁跡に置換。テント、井戸、洗濯物、焚き火、道、光、構図を維持。

camp_night: 昼版を参照し、カメラ・テント・井戸・木箱・樹木・道・遠景を固定。時刻と光のみを星空、青い月光、暖色のランタンと焚き火に変更。

tent_inside: 入口の向こうの健在な城のみ草地と低い城壁跡に置換。室内の地図、机、ランタン、武器、布、光と構図は維持。
