# Q-04 第3便：迷宮・本陣・空中城塞

2026-11-15 / Codex・SOL。SOLはlabyrinth / noble_campを制作、Codexはsky_fortressと統合検品を担当。森からの累計9点をゲーム用画像に登録。

保存先は `assets/backgrounds/labyrinth.png`、`noble_camp.png`、`sky_fortress.png`。全点内蔵画像生成、1672×941 RGB。初期の1920×1080基準には未達だが、BOARDのClaude 08:55 UTCの合意（幅1600以上・およそ16:9）では適合。原本は引き伸ばしていない。発注書と検品道具の基準を合意に合わせた。過去の納品記録の未達判定は当時の基準の記録として残す。

迷宮の紫の結晶脈、暗い岩壁・床、本陣の紺と銀の天幕・武器台・松明、空中城塞の白大理石・金装飾・雲海を目視確認。人物と文字なし。空中城塞の初回にあった余分な浮遊都市は画像編集で除去。森から累計9点、WebP/BG_ART/生成ページの整合性エラー0、新基準で仕様外0、残り6種。最新Claude変更を取り込んだ上でビルド・型検査成功。

ブラウザー検品：実際の `src/ui/dialogue.ts` と同じCSSを使うローカル検品ページで迷宮・シルフィエットの立ち絵・台詞枠の重なりと文字の視認性を確認。画像の実読み込み1280×720を確認。空中城塞も背景と台詞枠を目視確認。これはテスト文による個別表示で、物語通しプレイ・全背景全端末の検証ではない。

## sky_fortressのプロンプト

絵柄参照：既存 `assets/backgrounds/grassland_day.png`。

```text
Use case: illustration-story. Asset type: sky_fortress.png conversation background. Style reference only: match the painterly clean anime finish and muted nuanced color of the attached landscape; change subject completely to an interior. Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it. A grand hall of a floating sky fortress, white marble columns, tall arched windows showing clouds below, golden ornaments, solemn and bright. Interior perspective, open floor in foreground with restrained shadow, majestic white columns and tasteful gold ornament in middle distance, broad blue sky and a sea of clouds distinctly below window level. No writing, symbols resembling text, no UI, no montage. Deliver 2048x1152 pixel full bleed PNG.
```

修正プロンプト（初回生成画像を編集対象）：

```text
Edit only the view outside the windows: remove every floating island and every distant castle/building outside. Show only a vast uninterrupted sea of clouds below and clear blue sky above. Preserve this hall's white marble columns, gold details, perspective, bright solemn light, shadowed simple foreground, and all interior architecture exactly. No people, no text. 2048x1152 full bleed PNG.
```

採用画像：exec-f88ad692-51ac-4a26-a7f8-89bd593175b0.png。迷宮・本陣の全プロンプトは `q04-labyrinth-camp-delivery.md`。元画像・配信用画像の寸法とハッシュは `q04-third-qa.json`。
