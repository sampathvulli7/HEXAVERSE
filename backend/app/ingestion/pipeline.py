"""Ingestion pipeline: extract -> chunk -> embed -> index.

Adding a new modality = adding an extractor module that returns
[{"text": ..., "locator": {...}}] units and registering it in EXTRACTORS.
Everything downstream (chunking, embedding, indexing, retrieval, citations)
already works on that shape.
"""

from uuid import uuid4

from qdrant_client.models import FieldCondition, Filter, MatchValue, PointStruct

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


def _link_across_formats(points: list[PointStruct], record: dict) -> None:
    """Cross-format links: for each new chunk, find strongly-similar chunks
    from OTHER modalities and store the connection on BOTH sides — so a
    transcript segment knows about the paragraph and screenshot it relates
    to, and they know about it, regardless of ingestion order.
    """
    client = get_client()
    other_modalities = Filter(
        must_not=[
            FieldCondition(key="modality", match=MatchValue(value=record["modality"]))
        ]
    )
    for point in points:
        neighbors = client.query_points(
            collection_name=settings.text_collection,
            query=point.vector,
            query_filter=other_modalities,
            limit=settings.related_max_links,
            score_threshold=settings.related_min_score,
            with_payload=True,
        ).points
        if not neighbors:
            continue

        related = sorted({n.payload["file_id"] for n in neighbors})
        client.set_payload(
            collection_name=settings.text_collection,
            payload={"related_file_ids": related},
            points=[point.id],
        )
        # ...and the reverse direction, one neighbor at a time.
        for n in neighbors:
            back_links = set(n.payload.get("related_file_ids") or [])
            if record["file_id"] not in back_links:
                back_links.add(record["file_id"])
                client.set_payload(
                    collection_name=settings.text_collection,
                    payload={"related_file_ids": sorted(back_links)},
                    points=[n.id],
                )


def ingest_file(record: dict) -> int:
    """Index a registered file into the text collection. Returns chunk count."""
    extractor = EXTRACTORS.get(record["modality"])
    if extractor is None:
        return 0

    try:
        units = extractor(record["stored_path"])
        chunks = chunk_units(units)
    except Exception as e:
        print(f"[ERROR] Extraction failed for {record['filename']} ({record['modality']}): {e}")
        return 0

    if not chunks:
        print(f"[WARN] No text could be extracted from {record['filename']}")
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
                "chunk_index": i,
            },
        )
        for i, (chunk, vector) in enumerate(zip(chunks, vectors))
    ]
    get_client().upsert(collection_name=settings.text_collection, points=points)
    _link_across_formats(points, record)

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
