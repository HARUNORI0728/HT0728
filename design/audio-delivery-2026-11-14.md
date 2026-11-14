# 無料音源による優先BGM10曲の納品

追加の有料生成サービスは使用していない。既存の `src/audio/songs.ts` の主題・和声・旋律を
フル尺用に構成し、GeneralUser GS 2.0.3 の楽器サンプルを FluidSynth 2.6.2 で演奏した。
生演奏の録音ではなく、SoundFontによるゲーム音楽アレンジ。

## 納品ファイル

すべて `assets/audio/bgm/<名前>.ogg`。44,100 Hz、ステレオ、Vorbis quality 6。
発注書で許可されているOGGを選び、ループ時のエンコーダ遅延・末尾パディングを避けた。

| 名前 | 長さ | BPM | 再生 |
|---|---:|---:|---|
| title | 2:00 | 87 | ループ |
| camp | 2:00 | 96 | ループ |
| map_dawn | 2:30 | 115.2 | ループ |
| map_enemy | 1:30 | 106.67 | ループ |
| boss | 2:00 | 144 | ループ |
| crisis | 2:00 | 144 | ループ |
| sad | 2:00 | 64 | ループ |
| daily | 1:30 | 106.67 | ループ |
| victory | 0:08 | 120 | 終止・余韻あり、ループなし |
| defeat | 0:08 | 112.5 | 終止・余韻あり、ループなし |

テンポは小節・フレーズを途中で切らず指定尺に合わせるため微調整した。
`defeat` は8秒内に終止後の余韻を入れるため、音符部分を6.4秒へ短縮した。
繰り返しごとに強弱を変え、高いメロディは音程関係を保ったままトラック全体をオクターブ移動。
8曲のループBGMは2周目の演奏を取り出し、前周のリリース・リバーブを冒頭へ引き継ぐ。
末尾1 msのサンプル差のみ補正し、曲全体のフェードアウトは行わない。

## 編集・再生成

- `assets/audio/source/*.mid`: 編集用の演奏データ。時間位置を保存するためMIDI上は120 BPMの時間軸。
  実際の曲テンポは上表およびスコア書き出しスクリプトを参照。
- `tools/export-bgm-scores.mjs`: 元の楽譜を読み、フル尺用の構成・強弱・音域を指定する。
- `tools/render-bgm.py`: 楽器割り当て、演奏、音量測定、OGG書き出し、音声検品。
- 元のゲーム内シンセと楽譜は変更していない。

必要環境: Node.js 24、Python 3.14、numpy 2.5.4、FluidSynth 2.6.2共有ライブラリ、
GeneralUser GS 2.0.3、FFmpeg（libvorbis対応。本納品では9.0.2）。音源・実行バイナリはリポジトリに同梱しない。

```sh
node tools/export-bgm-scores.mjs ../music-runtime/scores
python tools/render-bgm.py --scores ../music-runtime/scores --soundfont PATH/GeneralUser-GS.sf2 --library PATH/libfluidsynth-3.dll --ffmpeg PATH/ffmpeg.exe --output assets/audio/bgm --sources assets/audio/source --qa ../music-runtime/qa
```

一部だけ再生成する場合は `--names title camp` のように曲名を指定する。
実行環境のPythonからnumpyを読み込めるようにしておく。
音源のSHA-256は検品JSONに記録した。音源の更新・演奏ライブラリの違いで音は変わりうる。

## 検品

`audio-delivery-qa-2026-11-14.json` に納品ファイルの検品値とSHA-256を保存。

- OGGを再デコードし、全曲で指定秒数・44.1 kHz・ステレオを確認。
- 曲ごとに一定のゲインを適用。再デコード後の統合ラウドネスは約−20 LUFS。
- 全曲のピークは0 dBFS未満。NaN・無限大・クリッピングなし。
- ループ8曲の末尾と冒頭の振幅差、ジングル2曲の終端余韻を数値検査。
- 既存の `tools/build-audio.mjs` を隔離した検証用フォルダで実行し、10曲すべてを検出・コピーすることを確認。
- スクリプトの構文検査を実施。実聴による音色・バランスの最終評価は未実施。

ゲーム用の `play/` とマニフェストの更新は納品範囲に含めていない。
通常のビルド時に既存の音楽取り込み処理がこれらのファイルを認識する。

## 音源の出典

GeneralUser GS: S. Christian Collins制作。
作者の[公式ページ](https://www.schristiancollins.com/generaluser)と
[公式リポジトリ](https://github.com/mrbumpy409/GeneralUser-GS)を参照。
制作への無償利用が認められており、取得時のライセンス全文を
`assets/audio/source/GeneralUser-GS-LICENSE.txt` に保存した。
FluidSynthは[公式プロジェクト](https://github.com/FluidSynth/fluidsynth)の配布物を使用。

## 未納品

残りの音楽14曲（短いジングル3曲を含む）、背景11枚、イベント絵8枚。
背景の優先6枚は前便で納品済み。
