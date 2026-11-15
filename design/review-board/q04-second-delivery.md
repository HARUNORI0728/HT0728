# Q-04 第2便：川辺・城壁跡・夕暮れの戦場

2026-11-15 / Codex・SOL。内蔵画像生成で制作した先行版。川辺と城壁跡の全プロンプト・確認は `q04-riverside-city-delivery.md`。

## battlefield_dusk

保存先：`assets/backgrounds/battlefield_dusk.png`。既存の `grassland_day.png` を絵柄参照に使用。夕暮れの草原、低い赤い太陽、折れた槍、破れた旗、風になびく草、暗めで簡素な下部を目視確認。人物・文字なし。初回生成PNGを無加工で保存。

```text
Use case: illustration-story. Asset type: battlefield_dusk.png visual novel background. Reference image is style only. Anime background painting for a visual-novel style conversation scene in a medieval-fantasy tactical RPG. No characters, no people, no text, no frame. Painterly but clean, soft natural lighting, slightly muted colors. Wide 16:9 composition; keep the lower third simple and a little darker so character portraits and a text box can be placed over it. A quiet grassland battlefield at dusk after the fighting, broken spears and banners stuck in the ground, low red sun, wind in the grass. Quiet grief and solemn calm rather than triumphant spectacle. Sparse broken spear shafts and plain tattered banners in the middle distance, subdued long grass in shaded foreground. No bodies, no blood, no heraldic writing, no modern objects. One full bleed finished illustration at 2048x1152 pixels, exact16:9, no UI or montage.
```

生成元：`exec-9df58f89-94a3-4661-8bf9-fb821671ec44.png`。

3点の寸法・SHA-256と仕様充足は `q04-second-qa.json`。先行版の最低解像度未達を解消したことにはせず、Q-04は作業中を維持する。

前便と合わせ6点のWebPとBG_ARTを生成し、play/index.htmlへ反映。ビルド・型検査は成功。ブラウザーで立ち絵・台詞枠を重ねた実画面確認は未実施。

検品道具：`tools/check-background-assets.py --planned camp_dawn --integrated forest forest_residue buena_hill riverside ruined_city battlefield_dusk`（Pillow使用）。6点すべて1280×720 WebP、BG_ARTの名前・ファイル・内容ハッシュ・生成ページ参照が一致。未納9種、未登録0、仕様外6、整合性エラー0。終了コード2は元画像の解像度不足を示し、合格扱いではありません。これは静的/ファイル検品でありブラウザー表示確認ではありません。
