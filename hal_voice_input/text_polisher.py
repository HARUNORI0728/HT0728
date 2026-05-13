import re

# フィラー語のパターン（長いものを先に記述して誤マッチを防ぐ）
_FILLER_PATTERNS: list[str] = [
    r"えーっと",
    r"えっと",
    r"えー+",
    r"あのー+",
    r"あの",
    r"そのー+",
    r"その",
    r"まあ",
    r"なんか",
]

_FILLER_RE = re.compile("|".join(_FILLER_PATTERNS))

# 文末として扱う句読点・括弧類
_SENTENCE_ENDINGS = frozenset("。！？!?…」』）)}")


def _remove_fillers(text: str) -> str:
    return _FILLER_RE.sub("", text)


def _normalize_spaces(text: str) -> str:
    # 連続する全角・半角スペースを半角スペース1つに統一
    text = re.sub(r"[ 　]+", " ", text)
    return text.strip()


def _ensure_ending_punctuation(text: str) -> str:
    if not text:
        return text
    if text[-1] not in _SENTENCE_ENDINGS:
        text += "。"
    return text


def polish_text(text: str) -> str:
    """ルールベースでテキストを整形する。"""
    if not text:
        return text

    text = text.strip()
    text = _remove_fillers(text)
    text = _normalize_spaces(text)
    text = _ensure_ending_punctuation(text)

    return text
