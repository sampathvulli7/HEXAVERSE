"""Vector database setup.

Uses Qdrant in embedded mode: the DB runs inside this Python process and
persists to `storage/qdrant/` — no server or Docker needed. Setting
QDRANT_URL in .env switches to a real Qdrant server with no other code
changes.

Two collections, because vectors are only comparable within the space of the
model that produced them:
  - text_chunks: bge text embeddings of EVERY modality's text form
    (document chunks, audio transcript segments, image captions)
  - image_clip:  CLIP embeddings of raw image pixels (searchable with
    CLIP-encoded text queries or query images)
"""

from functools import lru_cache

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PayloadSchemaType

from app.config import settings


@lru_cache(maxsize=1)
def get_client() -> QdrantClient:
    if settings.qdrant_url:
        return QdrantClient(url=settings.qdrant_url)
    return QdrantClient(path=str(settings.qdrant_path))


def ensure_collections() -> None:
    """Create the collections if they don't exist. Safe to call on every startup."""
    client = get_client()
    wanted = {
        settings.text_collection: settings.text_embedding_dim,
        settings.image_collection: settings.clip_dim,
    }
    existing = {c.name for c in client.get_collections().collections}
    for name, dim in wanted.items():
        if name not in existing:
            client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
            )
            # Create payload indexes for O(1) filtering
            client.create_payload_index(name, "file_id", PayloadSchemaType.KEYWORD)
            client.create_payload_index(name, "modality", PayloadSchemaType.KEYWORD)
            client.create_payload_index(name, "chunk_index", PayloadSchemaType.INTEGER)
            client.create_payload_index(name, "project", PayloadSchemaType.KEYWORD)
