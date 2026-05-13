import sys
from pathlib import Path

from PySide6.QtWidgets import QApplication

from config_manager import ConfigManager
from app import HALVoiceApp


def main() -> None:
    app = QApplication(sys.argv)
    app.setApplicationName("HAL Voice Input")
    app.setQuitOnLastWindowClosed(False)

    config_path = Path(__file__).parent / "config.json"
    config = ConfigManager(config_path)

    hal = HALVoiceApp(config)

    sys.exit(hal.run())


if __name__ == "__main__":
    main()
