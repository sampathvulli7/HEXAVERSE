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
from app.embeddings import clip_embed_image, embed_passages
from app.ingestion import audio, docx, image, pdf, textfile
from app.ingestion.chunking import chunk_units

EXTRACTORS = {
    "pdf": pdf.extract,
    "docx": docx.extract,
    "text": textfile.extract,
    "audio": audio.extract,
    "image": image.extract,
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

    # Images are indexed TWICE, deliberately: their caption above (bge text
    # space — semantic search over what the image is/says) and their raw
    # pixels here (CLIP space — direct text<->image and image<->image
    # matching). Same payload shape, so retrieval treats hits identically.
    if record["modality"] == "image":
        get_client().upsert(
            collection_name=settings.image_collection,
            points=[
                PointStruct(
                    id=uuid4().hex,
                    vector=clip_embed_image(record["stored_path"]),
                    payload={
                        "text": chunks[0]["text"],  # the caption
                        "modality": "image",
                        "file_id": record["file_id"],
                        "source_file": record["filename"],
                        "locator": {"image_id": record["file_id"]},
                    },
                )
            ],
        )

    return len(points)
