"""Cross-modal retrieval.

A question is searched in BOTH vector spaces:
  1. bge text space  -> document chunks, transcript segments, image captions
  2. CLIP space      -> raw image pixels (via CLIP's matching text encoder)

Scores from different embedding spaces aren't comparable, so the two ranked
lists are merged with Reciprocal Rank Fusion (RRF): each hit contributes
1/(K + rank) per list it appears in — rank position matters, raw scores
don't. An image found by both its caption and its pixels is deduplicated
(strong signal: both lists agree) and its contributions sum, boosting it.

An image can also BE the query (image-as-query): its pixels search the CLIP
collection and its caption searches the text collection — same fusion.
"""

from app.config import settings
from app.db import get_client
from app.embeddings import clip_embed_image, clip_embed_text, embed_query

RRF_K = 60


def _search(collection: str, vector: list[float], limit: int) -> list[dict]:
    result = get_client().query_points(
        collection_name=collection, query=vector, limit=limit, with_payload=True
    )
    return [{"point_id": str(p.id), "score": p.score, **p.payload} for p in result.points]


def _fuse(ranked_lists: list[list[dict]], top_k: int) -> list[dict]:
    fused: dict[str, dict] = {}
    for hits in ranked_lists:
        for rank, hit in enumerate(hits, start=1):
            # One image = one logical result, even when found in both spaces.
            key = (
                f"img:{hit['file_id']}" if hit["modality"] == "image"
                else hit["point_id"]
            )
            entry = fused.setdefault(key, {**hit, "rrf": 0.0})
            entry["rrf"] += 1.0 / (RRF_K + rank)
    ranked = sorted(fused.values(), key=lambda h: h["rrf"], reverse=True)[:top_k]
    # Report the fused score as the citation score (relative relevance).
    for hit in ranked:
        hit["score"] = hit.pop("rrf")
    return ranked


def retrieve(question: str, top_k: int) -> list[dict]:
    """Text question -> fused hits across documents, audio and images."""
    text_hits = _search(settings.text_collection, embed_query(question), top_k)
    image_hits = _search(settings.image_collection, clip_embed_text(question), top_k)
    return _fuse([text_hits, image_hits], top_k)


def retrieve_by_image(image_path: str, caption: str, top_k: int) -> list[dict]:
    """Image query -> visually similar images (CLIP) + semantically related
    documents/transcripts (via the image's generated caption)."""
    image_hits = _search(settings.image_collection, clip_embed_image(image_path), top_k)
    text_hits = _search(settings.text_collection, embed_query(caption), top_k) if caption else []
    return _fuse([image_hits, text_hits], top_k)