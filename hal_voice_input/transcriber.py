import threading
from typing import Callable, Optional

import numpy as np

SAMPLE_RATE = 16000


class Transcriber:
    def __init__(self, on_error: Optional[Callable[[str], None]] = None) -> None:
        self._on_error = on_error or (lambda msg: print(f"[Transcriber] {msg}"))
        self._model = None
        self._model_size: str = "small"
        self._loading = False
        # モデルの読み書きを保護するロック（文字起こし中はモデル差し替え待機）
        self._lock = threading.Lock()

    @property
    def is_ready(self) -> bool:
        return self._model is not None and not self._loading

    @property
    def is_loading(self) -> bool:
        return self._loading

    def load_model(
        self,
        model_size: str = "small",
        compute_type: str = "int8",
        on_complete: Optional[Callable[[], None]] = None,
    ) -> None:
        self._model_size = model_size
        self._loading = True

        def _load() -> None:
            try:
                from faster_whisper import WhisperModel

                model = WhisperModel(
                    model_size,
                    device="cpu",
                    compute_type=compute_type,
                )
                with self._lock:
                    self._model = model
                print(f"[Transcriber] モデル '{model_size}' の読み込み完了。")
                if on_complete:
                    on_complete()
            except Exception as e:
                self._on_error(f"モデル読み込みに失敗しました ({model_size}): {e}")
            finally:
                self._loading = False

        threading.Thread(target=_load, daemon=True).start()

    def transcribe_async(
        self,
        audio_data: np.ndarray,
        language: str = "ja",
        vad_filter: bool = True,
        on_complete: Optional[Callable[[str], None]] = None,
    ) -> None:
        def _run() -> None:
            result = self.transcribe(audio_data, language=language, vad_filter=vad_filter)
            if on_complete:
                on_complete(result)

        threading.Thread(target=_run, daemon=True).start()

    def transcribe(
        self,
        audio_data: np.ndarray,
        language: str = "ja",
        vad_filter: bool = True,
    ) -> str:
        if not self.is_ready:
            self._on_error("モデルがまだ読み込まれていません。")
            return ""

        if audio_data is None or audio_data.size == 0:
            self._on_error("録音データが空です。")
            return ""

        try:
            with self._lock:
                segments, _info = self._model.transcribe(
                    audio_data,
                    language=language,
                    vad_filter=vad_filter,
                    beam_size=5,
                )
                # segments はジェネレータなのでロック内で消費する
                text = "".join(seg.text for seg in segments)
            return text.strip()
        except Exception as e:
            self._on_error(f"文字起こしに失敗しました: {e}")
            return ""
