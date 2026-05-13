import threading
import time
from typing import Callable, Optional

import pyperclip


class ClipboardManager:
    def __init__(self, on_error: Optional[Callable[[str], None]] = None) -> None:
        self._on_error = on_error or (lambda msg: print(f"[Clipboard] {msg}"))
        self._last_copied: Optional[str] = None
        self._clear_timer: Optional[threading.Timer] = None

    def copy(self, text: str) -> bool:
        try:
            pyperclip.copy(text)
            self._last_copied = text
            return True
        except Exception as e:
            self._on_error(f"クリップボードへのコピーに失敗しました: {e}")
            return False

    def paste(self) -> bool:
        try:
            import pyautogui

            # クリップボードへの書き込みが確定するまで少し待つ
            time.sleep(0.15)
            pyautogui.hotkey("ctrl", "v")
            return True
        except Exception as e:
            self._on_error(f"自動貼り付けに失敗しました: {e}")
            return False

    def schedule_clear(self, seconds: float) -> None:
        if seconds <= 0:
            return

        # 前回のタイマーをキャンセル
        self.cancel_clear()

        copied_text = self._last_copied

        def _clear() -> None:
            try:
                current = pyperclip.paste()
                # ユーザーが別の内容をコピーしていた場合はクリアしない
                if current == copied_text:
                    pyperclip.copy("")
                    self._last_copied = None
            except Exception as e:
                self._on_error(f"クリップボードのクリアに失敗しました: {e}")

        self._clear_timer = threading.Timer(seconds, _clear)
        self._clear_timer.daemon = True
        self._clear_timer.start()

    def cancel_clear(self) -> None:
        if self._clear_timer and self._clear_timer.is_alive():
            self._clear_timer.cancel()
            self._clear_timer = None
