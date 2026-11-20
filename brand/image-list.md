# サイト用の画像リスト（画像生成AI向け）

HAL経営相談室のサイト（`index.html`）で使う画像の一覧です。できあがった画像は `images/` フォルダに、下の「ファイル名」で保存してください。差し替えはこちらで行います。

## 共通のルール（全画像）
- **雰囲気**：上品で落ち着いた、信頼感のある写真調。高級感はあるが、華美すぎない
- **色**：アイボリー（#f7f4ee）を基調に、紺（#141b2e）と金（#a8833a）を少量。やわらかい自然光、暖かみのある色温度
- **入れないもの**：文字、ロゴ、実在の企業名や商標、看板、実在の人物の顔、スマホやPCの画面の細かい表示（AIが崩れた文字を描きやすいため）
- **人物を入れる場合**：日本人のビジネスパーソン。表情は自然で、作り笑いにしない。顔が主役にならない構図（手元、後ろ姿、横顔、ぼかし）が無難
- **形式**：JPEG または WebP。長辺2,000px以上で書き出し（サイト側で縮小して使います）

## 必須（サイトに枠がある画像）

| # | 使う場所 | ファイル名 | 比率・サイズ | 内容 |
|---|---|---|---|---|
| 1 | メッセージ欄（「効率化は、ゴールではありません。」の右） | `message.jpg` | 縦長 4:5（例 1600×2000px） | 経営資源が未来へつながるイメージ |
| 2 | プロフィール | `portrait.jpg` | 縦長 4:5（例 1600×2000px） | **ご本人の実際の写真**（下の注意を参照） |

### 1. メッセージ欄の画像
**案A：現場の資料と光（おすすめ）**
> A refined still life on a warm ivory desk: neatly stacked business documents, a handwritten ledger and a fountain pen, softly lit by morning window light, a faint golden glow suggesting data and connection, shallow depth of field, elegant and calm, navy and gold accents, no text, no logos, photorealistic, vertical 4:5

**案B：町工場の熟練の手元**
> Close-up of an experienced Japanese craftsman's hands working at a small manufacturing workshop, warm natural light, subtle golden bokeh, respectful and dignified mood, ivory and navy tones, no faces, no text, no logos, photorealistic, vertical 4:5

**案C：打ち合わせの手元**
> A calm consulting meeting at a wooden table, two people's hands over printed charts and a notebook, a laptop softly out of focus, warm ivory interior with navy and brass details, gentle daylight, professional and trustworthy, no readable text, no logos, photorealistic, vertical 4:5

### 2. プロフィール写真（重要）
- **ここだけは画像生成AIを使わず、ご本人の実際の写真をお使いください。** AIで作った顔写真を本人として載せると、会ったときに印象が違い、かえって信頼を損ねます。
- 撮り方の目安：上半身、紺かグレーのジャケット、背景は明るい壁や窓際、自然光。カメラは目線の高さ。スマホの「ポートレート」モードでも十分です
- 背景だけをAIで整えたい場合の指示例：
  > Replace the background with a softly blurred, warm ivory office interior with natural window light, keep the person exactly as is, professional portrait, vertical 4:5

## あると良い（追加すると見栄えが上がる画像）

| # | 使う場所 | ファイル名 | 比率 | 内容 |
|---|---|---|---|---|
| 3 | 支援内容「AI導入支援」 | `service-ai.jpg` | 横長 16:10 | AIを業務に取り入れる様子 |
| 4 | 支援内容「補助金活用支援」 | `service-subsidy.jpg` | 横長 16:10 | 計画づくり・投資判断 |
| 5 | 支援内容「経営戦略・事業計画」 | `service-strategy.jpg` | 横長 16:10 | 経営の方向性を描く |
| 6 | トップ画面の背景（うっすら敷く） | `hero-texture.jpg` | 横長 16:9（2,560×1,440px） | 抽象的な光と質感 |
| 7 | 浅草・台東区らしさ（地域の親しみ） | `asakusa.jpg` | 横長 16:9 | 浅草の街並み（夜明けなど） |

> 3〜7を使う場合は、画像が入る場所をサイト側に追加します。

**3. AI導入支援**
> A small Japanese office team reviewing a workflow on a tablet together, soft daylight, ivory and navy interior, subtle golden light lines suggesting automation, calm and modern, no readable screen text, no logos, photorealistic, 16:10

**4. 補助金活用支援**
> Overhead view of a business plan meeting: printed financial charts, a calculator, a fountain pen and a cup of tea on a walnut desk, warm light, navy folder and brass clip accents, organized and trustworthy, no readable text, photorealistic, 16:10

**5. 経営戦略・事業計画**
> A senior Japanese business owner seen from behind, looking out of a window over a city at dawn, thoughtful mood, warm golden light, ivory and navy palette, cinematic and dignified, no text, photorealistic, 16:10

**6. トップ画面の背景**
> Abstract background of soft warm ivory light with very subtle golden elliptical light trails, minimal, elegant, lots of empty space, high resolution, no objects, no text, 16:9

**7. 浅草・台東区**
> Quiet early-morning street in Asakusa, Tokyo, traditional low-rise buildings and soft dawn light, no people in focus, no signs or readable text, warm ivory and navy tones, elegant and calm, photorealistic, 16:9
> ※ 実在の寺社や商店の看板が写り込むと権利面で注意が必要です。看板が読めない構図にしてください。

## SNS共有用の画像
- `brand/ogp.png`（1200×630）はロゴと文字で作成済みです。写真入りにしたい場合は、1の画像ができてから作り直せます。

## 生成のコツ
- 同じ雰囲気で揃えるため、1枚目の指示文の後半（色・光・no text など）を全画像で共通にしてください
- 文字やロゴが紛れ込んだ画像は使わないでください（消すより作り直しが確実です）
- 利用する画像生成サービスの規約で、商用利用が認められているかを確認してください
