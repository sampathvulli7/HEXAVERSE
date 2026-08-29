"""Text embeddings (bge-base-en-v1.5 via fastembed/ONNX — no PyTorch needed).

Passages and queries are embedded differently on purpose: bge was trained to
match a *prefixed* query against unprefixed passages, and fastembed's
query_embed() applies that prefix. Always use embed_passages() at ingestion
time and embed_query() at query time.
"""

from functools import lru_cache

from fastembed import ImageEmbedding, TextEmbedding

from app.config import settings


@lru_cache(maxsize=1)
def _model() -> TextEmbedding:
    # First call downloads the model (~200MB) to the local HF cache.
    return TextEmbedding(model_name=settings.text_embedding_model)


def embed_passages(texts: list[str]) -> list[list[float]]:
    return [v.tolist() for v in _model().embed(texts)]


def embed_query(text: str) -> list[float]:
    return next(_model().query_embed(text)).tolist()


# --- CLIP (image <-> short text, one shared 512-d space) -------------------
# Two encoders of the same CLIP model: images through the vision encoder,
# queries through the text encoder — their outputs are directly comparable.
# NOTE: CLIP's text encoder truncates at ~77 tokens; it's for short visual
# queries ("email screenshot"), not paragraphs — that's bge's job.


@lru_cache(maxsize=1)
def _clip_image_model() -> ImageEmbedding:
    return ImageEmbedding(model_name=settings.clip_image_model)


@lru_cache(maxsize=1)
def _clip_text_model() -> TextEmbedding:
    return TextEmbedding(model_name=settings.clip_text_model)


def clip_embed_image(path: str) -> list[float]:
    return next(_clip_image_model().embed([path])).tolist()


def clip_embed_text(text: str) -> list[float]:
    return next(_clip_text_model().embed([text])).tolist()

