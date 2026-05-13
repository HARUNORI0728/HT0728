import sys
from typing import Optional

from PySide6.QtCore import QObject, Qt, QTimer, Signal
from PySide6.QtGui import QAction, QColor, QIcon, QPainter, QPixmap
from PySide6.QtWidgets import QApplication, QMenu, QSystemTrayIcon

from clipboard_manager import ClipboardManager
from config_manager import ConfigManager
from recorder import Recorder
from text_polisher import polish_text
from transcriber import Transcriber


# ---------------------------------------------------------------------------
# Qt シグナルハブ（スレッド間通信）
# ---------------------------------------------------------------------------

class _AppSignals(QObject):
    recording_started = Signal()
    recording_stopped = Signal()
    transcription_done = Signal(str)
    model_loaded = Signal()
    error_occurred = Signal(str)


# ---------------------------------------------------------------------------
# アイコン生成ヘルパー
# ---------------------------------------------------------------------------

def _make_icon(color: str, size: int = 22) -> QIcon:
    pixmap = QPixmap(size, size)
    pixmap.fill(Qt.GlobalColor.transparent)
    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.setBrush(QColor(color))
    painter.setPen(Qt.PenStyle.NoPen)
    painter.drawEllipse(1, 1, size - 2, size - 2)
    painter.end()
    return QIcon(pixmap)


# ---------------------------------------------------------------------------
# タスクトレイアプリ本体
# ---------------------------------------------------------------------------

class HALVoiceApp:
    def __init__(self, config: ConfigManager) -> None:
        self.config = config
        self.signals = _AppSignals()

        self.recorder = Recorder(on_error=self._emit_error)
        self.transcriber = Transcriber(on_error=self._emit_error)
        self.clipboard = ClipboardManager(on_error=self._emit_error)

        self._hotkey_listener = None
        self._model_actions: dict[str, QAction] = {}

        self._icon_ready = _make_icon("#27ae60")       # 緑: 準備完了
        self._icon_recording = _make_icon("#e74c3c")   # 赤: 録音中
        self._icon_loading = _make_icon("#95a5a6")      # グレー: 読み込み中
        self._icon_processing = _make_icon("#e67e22")  # オレンジ: 処理中

        self._setup_tray()
        self._connect_signals()
        self._load_model()
        self._setup_hotkey()

    # ------------------------------------------------------------------
    # 初期化
    # ------------------------------------------------------------------

    def _setup_tray(self) -> None:
        self._tray = QSystemTrayIcon(self._icon_loading)
        self._tray.setToolTip("HAL Voice Input - モデル読み込み中...")

        menu = QMenu()

        # 録音トグル
        self._action_record = QAction("録音開始 (Ctrl+Alt+Space)")
        self._action_record.triggered.connect(self._toggle_recording)
        menu.addAction(self._action_record)

        menu.addSeparator()

        # 自動貼り付けトグル
        self._action_auto_paste = QAction("自動貼り付け")
        self._action_auto_paste.setCheckable(True)
        self._action_auto_paste.setChecked(self.config.get("auto_paste", True))
        self._action_auto_paste.triggered.connect(self._on_auto_paste_toggled)
        menu.addAction(self._action_auto_paste)

        # モデルサイズサブメニュー
        model_menu = QMenu("モデルサイズ")
        current_model = self.config.get("model_size", "small")
        for size in ("tiny", "base", "small", "medium", "large-v3"):
            act = QAction(size)
            act.setCheckable(True)
            act.setChecked(size == current_model)
            act.triggered.connect(lambda _checked, s=size: self._on_model_changed(s))
            model_menu.addAction(act)
            self._model_actions[size] = act
        menu.addMenu(model_menu)

        menu.addSeparator()

        action_quit = QAction("終了")
        action_quit.triggered.connect(self._quit)
        menu.addAction(action_quit)

        self._tray.setContextMenu(menu)
        self._tray.show()

    def _connect_signals(self) -> None:
        self.signals.recording_started.connect(self._on_recording_started)
        self.signals.recording_stopped.connect(self._on_recording_stopped)
        self.signals.transcription_done.connect(self._on_transcription_done)
        self.signals.model_loaded.connect(self._on_model_loaded)
        self.signals.error_occurred.connect(self._on_error)

    def _load_model(self) -> None:
        model_size = self.config.get("model_size", "small")
        compute_type = self.config.get("compute_type", "int8")
        self.transcriber.load_model(
            model_size=model_size,
            compute_type=compute_type,
            on_complete=lambda: self.signals.model_loaded.emit(),
        )

    def _setup_hotkey(self) -> None:
        hotkey_str = self.config.get("hotkey", "ctrl+alt+space")
        pynput_key = _to_pynput_hotkey(hotkey_str)
        try:
            from pynput import keyboard

            self._hotkey_listener = keyboard.GlobalHotKeys(
                {pynput_key: self._on_hotkey_pressed}
            )
            self._hotkey_listener.daemon = True
            self._hotkey_listener.start()
            print(f"[App] ホットキー登録完了: {hotkey_str}")
        except Exception as e:
            self._emit_error(f"ホットキー登録に失敗しました ({hotkey_str}): {e}")

    # ------------------------------------------------------------------
    # ホットキーハンドラ（pynput スレッドから呼ばれる）
    # ------------------------------------------------------------------

    def _on_hotkey_pressed(self) -> None:
        if self.recorder.is_recording:
            self._stop_recording()
        else:
            self._start_recording()

    def _start_recording(self) -> None:
        if not self.transcriber.is_ready:
            self._emit_error("モデルがまだ読み込まれていません。しばらくお待ちください。")
            return
        if self.recorder.start():
            self.signals.recording_started.emit()

    def _stop_recording(self) -> None:
        if not self.recorder.stop():
            return

        self.signals.recording_stopped.emit()

        audio_data = self.recorder.get_audio_data()
        if audio_data is None or audio_data.size == 0:
            self._emit_error("録音データが空です。マイクを確認してください。")
            return

        self.transcriber.transcribe_async(
            audio_data,
            language=self.config.get("language", "ja"),
            vad_filter=self.config.get("vad_filter", True),
            on_complete=lambda text: self.signals.transcription_done.emit(text),
        )

    # ------------------------------------------------------------------
    # Qt スロット（メインスレッドで実行される）
    # ------------------------------------------------------------------

    def _toggle_recording(self) -> None:
        self._on_hotkey_pressed()

    def _on_auto_paste_toggled(self, checked: bool) -> None:
        self.config.set("auto_paste", checked)
        state = "ON" if checked else "OFF"
        self._notify(f"自動貼り付け {state}")

    def _on_model_changed(self, model_size: str) -> None:
        self.config.set("model_size", model_size)
        for size, act in self._model_actions.items():
            act.setChecked(size == model_size)
        self._tray.setIcon(self._icon_loading)
        self._tray.setToolTip(f"HAL Voice Input - モデル読み込み中... ({model_size})")
        self._load_model()

    def _on_recording_started(self) -> None:
        self._tray.setIcon(self._icon_recording)
        self._tray.setToolTip("HAL Voice Input - 録音中...")
        self._action_record.setText("録音停止 (Ctrl+Alt+Space)")
        self._notify("録音開始", duration_ms=1500)

    def _on_recording_stopped(self) -> None:
        self._tray.setIcon(self._icon_processing)
        self._tray.setToolTip("HAL Voice Input - 文字起こし中...")
        self._action_record.setText("文字起こし中...")
        self._action_record.setEnabled(False)

    def _on_transcription_done(self, raw_text: str) -> None:
        self._action_record.setText("録音開始 (Ctrl+Alt+Space)")
        self._action_record.setEnabled(True)
        self._tray.setIcon(self._icon_ready)
        model_size = self.config.get("model_size", "small")
        self._tray.setToolTip(f"HAL Voice Input - 準備完了 ({model_size})")

        if not raw_text:
            self._notify("文字起こし結果が空です（音声が短すぎた可能性があります）")
            return

        polished = polish_text(raw_text)
        if not polished:
            self._notify("整形後のテキストが空です")
            return

        if not self.clipboard.copy(polished):
            return

        preview = polished[:40] + "…" if len(polished) > 40 else polished
        self._notify(f"コピー完了: {preview}")

        if self.config.get("auto_paste", True):
            self.clipboard.paste()

        clear_sec = self.config.get("clear_clipboard_after_seconds", 0)
        if clear_sec and clear_sec > 0:
            self.clipboard.schedule_clear(float(clear_sec))

    def _on_model_loaded(self) -> None:
        model_size = self.config.get("model_size", "small")
        self._tray.setIcon(self._icon_ready)
        self._tray.setToolTip(f"HAL Voice Input - 準備完了 ({model_size})")
        self._notify(f"モデル読み込み完了 ({model_size})")

    def _on_error(self, message: str) -> None:
        print(f"[Error] {message}")
        self._tray.showMessage(
            "HAL Voice Input - エラー",
            message,
            QSystemTrayIcon.MessageIcon.Critical,
            4000,
        )

    # ------------------------------------------------------------------
    # ユーティリティ
    # ------------------------------------------------------------------

    def _notify(self, message: str, duration_ms: int = 2500) -> None:
        self._tray.showMessage(
            "HAL Voice Input",
            message,
            QSystemTrayIcon.MessageIcon.Information,
            duration_ms,
        )

    def _emit_error(self, message: str) -> None:
        # pynput / sounddevice スレッドから呼ばれることがあるため Signal 経由で発行
        self.signals.error_occurred.emit(message)

    def _quit(self) -> None:
        if self._hotkey_listener:
            try:
                self._hotkey_listener.stop()
            except Exception:
                pass
        if self.recorder.is_recording:
            self.recorder.stop()
        self.clipboard.cancel_clear()
        QApplication.instance().quit()

    def run(self) -> int:
        return QApplication.instance().exec()


# ---------------------------------------------------------------------------
# ホットキー文字列変換
# ---------------------------------------------------------------------------

def _to_pynput_hotkey(hotkey_str: str) -> str:
    """'ctrl+alt+space' -> '<ctrl>+<alt>+<space>' 形式に変換する。"""
    _MAP = {
        "ctrl": "<ctrl>",
        "alt": "<alt>",
        "shift": "<shift>",
        "space": "<space>",
        "enter": "<enter>",
        "tab": "<tab>",
        "esc": "<esc>",
        "escape": "<esc>",
        "f1": "<f1>", "f2": "<f2>", "f3": "<f3>", "f4": "<f4>",
        "f5": "<f5>", "f6": "<f6>", "f7": "<f7>", "f8": "<f8>",
        "f9": "<f9>", "f10": "<f10>", "f11": "<f11>", "f12": "<f12>",
    }
    parts = [p.strip().lower() for p in hotkey_str.split("+")]
    converted = [_MAP.get(p, p if len(p) == 1 else f"<{p}>") for p in parts]
    return "+".join(converted)
