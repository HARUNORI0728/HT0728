# フィットア奪還戦記

『無職転生』の非公式ファンゲーム（個人で遊ぶ用。公開・配布はしない）。ブラウザで動くターン制タクティクスRPG。現在は第1章が遊べる。

- `play/index.html` — ビルド済みのゲーム（この1ファイルをブラウザで開けば遊べる）
- `src/` — ソース（`data.ts` データ、`logic.ts` ルール、`main.ts` 画面と進行、`sprites.ts` ドット絵）
- `design/world.md` — 世界観・キャラ・システムの設定書
- `design/portrait-prompts.md` — 立ち絵の発注プロンプト
- `art-samples/` — 画風サンプル

```
npm install
npm run check   # 型チェック
npm run build   # play/index.html を生成
```
