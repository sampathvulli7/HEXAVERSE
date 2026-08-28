"""Semantic retrieval: embed the question, return the nearest chunks."""

from app.config import settings
from app.db import get_client
from app.embeddings import embed_query


def retrieve(question: str, top_k: int) -> list[dict]:
    result = get_client().query_points(
        collection_name=settings.text_collection,
        query=embed_query(question),
        limit=top_k,
        with_payload=True,
    )
    return [{"score": p.score, **p.payload} for p in result.points]
