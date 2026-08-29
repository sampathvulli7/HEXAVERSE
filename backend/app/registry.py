"""Registry of uploaded files.

Maps a generated file_id to the original filename, detected modality and
where the original is stored on disk — this is what lets a citation open the
real source file later. Backed by a single JSON file, which is plenty for a
hackathon-scale corpus.
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings
from app.models import Modality

EXTENSION_TO_MODALITY: dict[str, Modality] = {
    ".pdf": "pdf",
    ".docx": "docx",
    # legacy .doc needs a converter (e.g. LibreOffice) — deliberately
    # rejected for now so users get a clear "unsupported" message
    # instead of a confusing parse failure.
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".webp": "image",
    ".mp3": "audio",
    ".wav": "audio",
    ".m4a": "audio",
    ".ogg": "audio",
    ".txt": "text",
    ".md": "text",
}


def detect_modality(filename: str) -> Modality | None:
    return EXTENSION_TO_MODALITY.get(Path(filename).suffix.lower())


def _load() -> dict:
    if settings.registry_path.exists():
        return json.loads(settings.registry_path.read_text())
    return {}


def _save(registry: dict) -> None:
    settings.registry_path.write_text(json.dumps(registry, indent=2))


def register_file(filename: str, modality: Modality, content: bytes) -> dict:
    """Store the original bytes under a fresh file_id and record it."""
    file_id = uuid.uuid4().hex[:12]
    stored_path = settings.files_dir / f"{file_id}{Path(filename).suffix.lower()}"
    stored_path.write_bytes(content)

    registry = _load()
    registry[file_id] = {
        "file_id": file_id,
        "filename": filename,
        "modality": modality,
        "stored_path": str(stored_path),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    _save(registry)
    return registry[file_id]


def get_file(file_id: str) -> dict | None:
    return _load().get(file_id)


def list_files() -> list[dict]:
    return sorted(_load().values(), key=lambda f: f["uploaded_at"], reverse=True)
