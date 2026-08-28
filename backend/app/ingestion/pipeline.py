"""Ingestion pipeline: extract -> chunk -> embed -> index.

Adding a new modality = adding an extractor module that returns
[{"text": ..., "locator": {...}}] units and registering it in EXTRACTORS.
Everything downstream (chunking, embedding, indexing, retrieval, citations)
already works on that shape.
"""

from uuid import uuid4

from qdrant_client.models import PointStruct

from app.config import settings
from app.db import get_client
from app.embeddings import embed_passages
from app.ingestion import audio, docx, pdf, textfile
from app.ingestion.chunking import chunk_units

EXTRACTORS = {
    "pdf": pdf.extract,
    "docx": docx.extract,
    "text": textfile.extract,
    "audio": audio.extract,
    # "image": Phase 3 (vision caption + CLIP)
}


def ingest_file(record: dict) -> int:
    """Index a registered file into the text collection. Returns chunk count."""
    extractor = EXTRACTORS.get(record["modality"])
    if extractor is None:
        return 0

    units = extractor(record["stored_path"])
    chunks = chunk_units(units)
    if not chunks:
        return 0

    vectors = embed_passages([c["text"] for c in chunks])
    points = [
        PointStruct(
            id=uuid4().hex,
            vector=vector,
            payload={
                "text": chunk["text"],
                "modality": record["modality"],
                "file_id": record["file_id"],
                "source_file": record["filename"],
                "locator": chunk["locator"],
            },
        )
        for chunk, vector in zip(chunks, vectors)
    ]
    get_client().upsert(collection_name=settings.text_collection, points=points)
    return len(points)
