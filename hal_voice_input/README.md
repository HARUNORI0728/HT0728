# HAL Voice Input

Windows向けローカル完結型音声入力アプリ。  
ホットキーで録音を開始・停止し、ローカルの Whisper モデルで日本語文字起こしを行います。  
文字起こし結果はルールベースで整形され、クリップボードにコピーされます。  
音声データ・文字起こし内容は外部に一切送信しません。

---

## 機能一覧

| 機能 | 説明 |
|------|------|
| タスクトレイ常駐 | 起動後はタスクトレイに常駐 |
| グローバルホットキー | `Ctrl+Alt+Space` で録音開始 / 停止 |
| ローカル文字起こし | faster-whisper (CPU) による日本語文字起こし |
| テキスト整形 | フィラー除去・句点付与などルールベースで整形 |
| クリップボードコピー | 整形済みテキストを自動コピー |
| 自動貼り付け | アクティブ入力欄への `Ctrl+V` 送信（ON/OFF 可） |
| クリップボード自動クリア | 指定秒後にクリップボードを自動クリア（任意） |
| config.json 設定 | モデルサイズ・ホットキー等を設定ファイルで管理 |

---

## セットアップ方法

### 必要環境

- Windows 11
- Python 3.11 または 3.12

### 仮想環境の作成

```powershell
python -m venv venv
.\venv\Scripts\activate
```

### 依存パッケージのインストール

```powershell
pip install -r requirements.txt
```

> **注意**: `faster-whisper` は初回起動時にモデルをダウンロードします（インターネット接続が必要）。

---

## 実行方法

```powershell
cd hal_voice_input
python main.py
```

起動するとタスクトレイにアイコンが表示されます。

| アイコン色 | 状態 |
|-----------|------|
| グレー | モデル読み込み中 |
| 緑 | 準備完了 |
| 赤 | 録音中 |
| オレンジ | 文字起こし処理中 |

---

## exe 化方法

PowerShell スクリプトで PyInstaller によるビルドを実行します。

```powershell
cd hal_voice_input
.\build.ps1
```

ビルド完了後、`dist\HALVoiceInput\` フォルダ内に実行ファイル一式が生成されます。  
`dist\HALVoiceInput\HALVoiceInput.exe` を実行してください。

---

## config.json 設定項目

`config.json` は初回起動時に自動生成されます。  
手動で編集して設定を変更できます。

| キー | デフォルト | 型 | 説明 |
|------|-----------|-----|------|
| `model_size` | `"small"` | string | Whisper モデルサイズ。`tiny` / `base` / `small` / `medium` / `large-v3` |
| `hotkey` | `"ctrl+alt+space"` | string | 録音開始/停止ホットキー |
| `auto_paste` | `true` | bool | 文字起こし後に自動貼り付けするか |
| `language` | `"ja"` | string | 文字起こし言語コード |
| `vad_filter` | `true` | bool | 音声区間検出フィルターを使うか |
| `compute_type` | `"int8"` | string | 計算精度。`int8` / `float16` / `float32` |
| `clear_clipboard_after_seconds` | `0` | number | クリップボード自動クリアまでの秒数（0 で無効） |

### config.json 例

```json
{
  "model_size": "small",
  "hotkey": "ctrl+alt+space",
  "auto_paste": true,
  "language": "ja",
  "vad_filter": true,
  "compute_type": "int8",
  "clear_clipboard_after_seconds": 30
}
```

---

## 簡易テスト方法

### テキスト整形のテスト

```powershell
python -c "from text_polisher import polish_text; print(polish_text('えーあのですね、テストです'))"
# → テストです。
```

### 設定読み込みのテスト

```powershell
python -c "from config_manager import ConfigManager; c = ConfigManager(); print(c.config)"
```

### 録音・文字起こしの単体確認

```powershell
python -c "
import time, numpy as np
from recorder import Recorder
from transcriber import Transcriber

r = Recorder()
t = Transcriber()
t.load_model('base', on_complete=lambda: print('Model ready'))
time.sleep(10)  # モデル読み込み待ち
r.start()
print('録音中... 3秒後に停止')
time.sleep(3)
r.stop()
audio = r.get_audio_data()
print('音声サイズ:', audio.shape if audio is not None else 'None')
result = t.transcribe(audio)
print('文字起こし結果:', result)
"
```

---

## 注意事項

- **音声・文字起こし内容は外部に送信しません。** ローカル PC 内で完結しています。
- **モデルの初回ダウンロード時はインターネット接続が必要です。** HuggingFace Hub からモデルがダウンロードされます（`~/.cache/huggingface/` に保存）。
- **完全オフライン運用の場合**は、事前にモデルをローカルに配置し、`config.json` の `model_size` にローカルパスを指定してください。
- **社内 PC での利用前に**、以下の機能の利用可否を IT 部門に確認してください。
  - マイクの使用
  - グローバルホットキーの登録
  - クリップボードの読み書き
  - 自動キー入力（`Ctrl+V` 送信）
- **管理者権限が必要なウィンドウ**（UAC 昇格済みウィンドウなど）への自動貼り付けは動作しない場合があります。
