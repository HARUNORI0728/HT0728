import threading
from typing import Callable, Optional

import numpy as np
import sounddevice as sd

SAMPLE_RATE = 16000
CHANNELS = 1
DTYPE = "float32"


class Recorder:
    def __init__(self, on_error: Optional[Callable[[str], None]] = None) -> None:
        self._on_error = on_error or (lambda msg: print(f"[Recorder] {msg}"))
        self._recording = False
        self._audio_chunks: list[np.ndarray] = []
        self._stream: Optional[sd.InputStream] = None
        self._lock = threading.Lock()

    @property
    def is_recording(self) -> bool:
        return self._recording

    def start(self) -> bool:
        if self._recording:
            return False
        try:
            with self._lock:
                self._audio_chunks = []
            self._stream = sd.InputStream(
                samplerate=SAMPLE_RATE,
                channels=CHANNELS,
                dtype=DTYPE,
                callback=self._audio_callback,
            )
            self._stream.start()
            self._recording = True
            return True
        except Exception as e:
            self._on_error(f"録音開始に失敗しました: {e}")
            return False

    def stop(self) -> bool:
        if not self._recording:
            return False
        self._recording = False
        try:
            if self._stream:
                self._stream.stop()
                self._stream.close()
                self._stream = None
            return True
        except Exception as e:
            self._on_error(f"録音停止に失敗しました: {e}")
            return False

    def get_audio_data(self) -> Optional[np.ndarray]:
        with self._lock:
            if not self._audio_chunks:
                return None
            audio = np.concatenate(self._audio_chunks, axis=0).flatten()
            return audio

    def _audio_callback(
        self,
        indata: np.ndarray,
        frames: int,
        time_info: object,
        status: sd.CallbackFlags,
    ) -> None:
        if not self._recording:
            return
        if status:
            print(f"[Recorder] PortAudio status: {status}")
        with self._lock:
            self._audio_chunks.append(indata.copy())
