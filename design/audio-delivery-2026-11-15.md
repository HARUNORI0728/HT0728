# 追加BGM3曲の納品

共同掲示板で合意した次優先の3曲を制作。既存のゲーム内楽譜をSOLがフル尺に構成し、Codexが無料のFluidSynth／GeneralUser GSで演奏・書き出し・数値検品した。有料生成サービスは使用していない。

| ID | 保存先 | 長さ | BPM | 狙い |
|---|---|---:|---:|---|
| family | assets/audio/bgm/family.ogg | 2:00 | 80 | ギターとオーボエ、抑えた弦。父子再会や仲間の絆 |
| resolve | assets/audio/bgm/resolve.ogg | 2:00 | 80 | 静かなピアノから弦・ホルンへ展開、最後に落ち着く決意の曲 |
| mystery | assets/audio/bgm/mystery.ogg | 1:30 | 64 | チェレスタと低音、黒幕や金貨への不安 |

すべて44.1kHzステレオ、OGG Vorbis quality 6、ループ用。編集可能なMIDIは `assets/audio/source/` の同名ファイル。音源とライセンスは前回納品と同じで、`assets/audio/source/GeneralUser-GS-LICENSE.txt` を参照。

## 検証

再デコード後の秒数、有限値、クリッピングなし、ステレオ差、末尾と冒頭の振幅差を検査。統合ラウドネスは約−20 LUFS。結果とSHA-256は `audio-delivery-qa-2026-11-15.json` に記録した。

SOLがスコア書き出し変更を担当し、既存10曲のJSONが変更前とバイト単位で同一であること、未知の曲名を出力前に拒否することを確認した。隔離した検証フォルダで取り込み処理を実行し、新3曲を含む13曲を認識することを確認した。

実際に聴いた音色・ループ接続・台詞との相性の最終評価は未実施。数値的な振幅差の検査は聴感の保証ではない。ゲームへの組込み・公開は掲示板の分担どおりClaudeに依頼し、この納品では `play/` やマニフェストを変更しない。

## 再生成

`node tools/export-bgm-scores.mjs ../music-runtime/scores family resolve mystery` で対象3曲のみ書き出せる。曲名省略時は全13曲。続いて既存の `tools/render-bgm.py` に音源・ライブラリ・FFmpeg等のパスを渡し、`--names family resolve mystery` を指定する。環境設定と全引数は前回の `audio-delivery-2026-11-14.md` を参照。
