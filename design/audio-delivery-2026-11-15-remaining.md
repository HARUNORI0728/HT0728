# 残り11曲のBGM・ジングル納品

発注書の残り11曲を既存のゲーム内楽譜から構成し、FluidSynth 2.6.2とGeneralUser GS 2.0.3で演奏した。この納品で発注書の音楽24曲がそろう。音源の利用条件は `assets/audio/source/GeneralUser-GS-LICENSE.txt` を参照。

| ID | 場面 | 長さ | BPM | 編成・構成 |
|---|---|---:|---:|---|
| `prologue` | 序章 | 2:00 | 64 | 疎らなピアノに弦と薄い雨音。雨音にはGMの波音を使用 |
| `comedy` | コメディ | 1:30 | 106.67 | チューバ、木琴、クラリネット。短く切ったフレーズと間 |
| `map_resolve` | 4〜7章の自軍フェイズ | 2:30 | 128 | 弦の旋律、低い金管、ティンパニ |
| `romance` | 恋愛支援・告白 | 2:00 | 72 | 3拍子。ピアノの旋律をヴァイオリンとハープが引き継ぐ |
| `orsted` | オルステッドとの対峙 | 2:00 | 48 | 低いホルンと持続低音、高い弦と重い打音 |
| `final_boss` | 最終ボス | 2:30 | 140.80 | 短調のオルガンと金管から弦が浮かび、終盤の主題を長調で提示 |
| `ending` | エンディング・後日談 | 2:30 | 72 | ピアノ、フルート、弦で主題を静かに再現 |
| `map_final` | 8〜10章の自軍フェイズ | 2:30 | 128 | 金管と弦の主題をスネアとティンパニで支える行進曲 |
| `levelup` | レベルアップ | 0:03 | 150 | ハープとグロッケンの上行、金管の和音 |
| `classchange` | クラスチェンジ | 0:06 | 100 | ハープの上行に続く金管と弦の着地 |
| `support` | 支援ランク上昇 | 0:04 | 120 | チェレスタとハープで短く結ぶ |

各曲の44.1 kHzステレオOGG Vorbis（quality 6）は `assets/audio/bgm/`、編集用の同名MIDIは `assets/audio/source/` に収録。BGM8曲にはループ範囲のタグを設定し、ジングル3曲には曲ごとの余韻を確保した。

## 検証

再デコード後の尺とステレオを全曲で確認。統合ラウドネスは−20.25〜−19.95 LUFS、最大トゥルーピークは−4.33 dBTP、ループ境界の左右いずれかでの最大振幅差は0.00236、ジングル終端10 msの最大振幅は0.00074だった。OGGとMIDIのSHA-256および測定値は `audio-delivery-qa-2026-11-15-remaining.json` に記録した。

既存13曲の再書き出しスコアは従来とバイト単位で一致。隔離フォルダで既存の取り込み処理を実行し、全24曲のコピーとマニフェストへの登録を確認した。実聴による音色・ループ接続・台詞との相性の最終評価は未実施。

## 再生成

```sh
node tools/export-bgm-scores.mjs ../music-runtime/scores-remaining prologue comedy map_resolve romance orsted final_boss ending map_final levelup classchange support
python tools/render-bgm.py --scores ../music-runtime/scores-remaining --soundfont PATH/GeneralUser-GS.sf2 --library PATH/libfluidsynth-3.dll --ffmpeg PATH/ffmpeg.exe --output assets/audio/bgm --sources assets/audio/source --qa ../music-runtime/qa-remaining --names prologue comedy map_resolve romance orsted final_boss ending map_final levelup classchange support
```

実行環境の詳細は `audio-delivery-2026-11-14.md` の再生成手順を参照。書き出し時に曲名を省略すると24曲すべてのスコアを書き出す。
