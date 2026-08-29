"""Central configuration.

Every tunable value (paths, model names, service URLs) lives here and can be
overridden per-machine via a `backend/.env` file — never hardcode these
elsewhere in the codebase. See `.env.example` for the template.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    # --- storage ---
    storage_dir: Path = BACKEND_DIR / "storage"

    # --- vector DB ---
    # Embedded Qdrant persists to a local folder. To use a Qdrant server
    # instead (e.g. in deployment), set qdrant_url and it takes precedence.
    qdrant_url: str | None = None
    text_collection: str = "text_chunks"
    image_collection: str = "image_clip"

    # --- models (used from Phase 1 onward) ---
    text_embedding_model: str = "BAAI/bge-base-en-v1.5"
    text_embedding_dim: int = 768
    # CLIP runs via fastembed/ONNX too — the two model names below are the
    # image and text encoders of the SAME CLIP, so their vectors share a space.
    clip_image_model: str = "Qdrant/clip-ViT-B-32-vision"
    clip_text_model: str = "Qdrant/clip-ViT-B-32-text"
    clip_dim: int = 512
    whisper_model: str = "small"  # speech-to-text; "base" is faster, "medium" more accurate
    llm_base_url: str = "http://localhost:11434/v1"  # Ollama (OpenAI-compatible)
    llm_model: str = "qwen2.5:3b"
    llm_api_key: str = "lm-studio"
    nvidia_api_key: str | None = None
    nvidia_llm_model: str = "meta/llama-3.2-11b-vision-instruct"
    vision_model: str = "qwen2.5vl:7b"
    hf_api_token: str | None = None

    # --- cross-format links (Phase 4) ---
    # A new chunk links to its nearest chunks from OTHER modalities when
    # their similarity clears the threshold. Links are stored both ways.
    related_max_links: int = 3
    related_min_score: float = 0.55

    # --- API ---
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    @property
    def files_dir(self) -> Path:
        return self.storage_dir / "files"

    @property
    def qdrant_path(self) -> Path:
        return self.storage_dir / "qdrant"

    @property
    def registry_path(self) -> Path:
        return self.storage_dir / "registry.json"


settings = Settings()
settings.files_dir.mkdir(parents=True, exist_ok=True)
