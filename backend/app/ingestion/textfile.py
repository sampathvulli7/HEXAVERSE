"""Plain text / markdown extraction (mainly useful for notes and testing)."""

from pathlib import Path


def extract(path: str) -> list[dict]:
    text = Path(path).read_text(encoding="utf-8", errors="replace").strip()
    return [{"text": text, "locator": {}}] if text else []
