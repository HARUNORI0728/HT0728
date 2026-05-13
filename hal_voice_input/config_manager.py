import json
from pathlib import Path
from typing import Any

DEFAULT_CONFIG: dict[str, Any] = {
    "model_size": "small",
    "hotkey": "ctrl+alt+space",
    "auto_paste": True,
    "language": "ja",
    "vad_filter": True,
    "compute_type": "int8",
    "clear_clipboard_after_seconds": 0,
}

_VALID_MODEL_SIZES = {"tiny", "base", "small", "medium", "large", "large-v2", "large-v3"}
_VALID_COMPUTE_TYPES = {"int8", "float16", "float32"}


class ConfigManager:
    def __init__(self, config_path: Path = Path("config.json")) -> None:
        self.config_path = config_path
        self.config = self._load()

    def _load(self) -> dict[str, Any]:
        if not self.config_path.exists():
            self._save(DEFAULT_CONFIG)
            return DEFAULT_CONFIG.copy()
        try:
            with open(self.config_path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
            return self._validate(loaded)
        except Exception as e:
            print(f"[Config] 設定ファイルの読み込みに失敗しました: {e}。デフォルト値を使用します。")
            return DEFAULT_CONFIG.copy()

    def _validate(self, raw: dict) -> dict[str, Any]:
        cfg = DEFAULT_CONFIG.copy()

        if raw.get("model_size") in _VALID_MODEL_SIZES:
            cfg["model_size"] = raw["model_size"]

        if isinstance(raw.get("hotkey"), str) and raw["hotkey"].strip():
            cfg["hotkey"] = raw["hotkey"].strip()

        if isinstance(raw.get("auto_paste"), bool):
            cfg["auto_paste"] = raw["auto_paste"]

        if isinstance(raw.get("language"), str) and raw["language"].strip():
            cfg["language"] = raw["language"].strip()

        if isinstance(raw.get("vad_filter"), bool):
            cfg["vad_filter"] = raw["vad_filter"]

        if raw.get("compute_type") in _VALID_COMPUTE_TYPES:
            cfg["compute_type"] = raw["compute_type"]

        clear_sec = raw.get("clear_clipboard_after_seconds", 0)
        if isinstance(clear_sec, (int, float)) and clear_sec >= 0:
            cfg["clear_clipboard_after_seconds"] = clear_sec

        return cfg

    def _save(self, config: dict[str, Any]) -> None:
        try:
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[Config] 設定ファイルの保存に失敗しました: {e}")

    def get(self, key: str, default: Any = None) -> Any:
        return self.config.get(key, default)

    def set(self, key: str, value: Any) -> None:
        self.config[key] = value
        self._save(self.config)

    def reload(self) -> None:
        self.config = self._load()
