"""Type-ahead search suggestions (Google-style query completion).

Called on every keystroke, so it must be fast: no LLM, no embedding — just
ranked string matching over two candidate pools:

  1. past queries from this backend session (what autocomplete is really
     made of — recorded by /query), and
  2. short sentences mined from the indexed chunks of the active project
     (so suggestions reflect what the corpus can actually answer), cached
     and refreshed every CACHE_TTL seconds.

Ranking: candidates that START with the typed text (true completion) beat
candidates that merely contain all typed words; past queries beat corpus
sentences; shorter beats longer.
"""

import re
import time
from collections import deque

from qdrant_client.models import FieldCondition, Filter, MatchValue

from app.config import settings
from app.db import get_client

_recent_queries: deque[str] = deque(maxlen=200)
_cache: dict = {"key": None, "at": 0.0, "sentences": []}
CACHE_TTL_SECONDS = 20.0
MAX_CORPUS_SENTENCES = 5000


def record_query(question: str) -> None:
    q = question.strip()
    if q and (not _recent_queries or _recent_queries[-1].lower() != q.lower()):
        _recent_queries.append(q)


def _corpus_sentences(project: str) -> list[str]:
    now = time.time()
    if _cache["key"] == project and now - _cache["at"] < CACHE_TTL_SECONDS:
        return _cache["sentences"]

    sentences: list[str] = []
    offset = None
    while True:
        points, offset = get_client().scroll(
            collection_name=settings.text_collection,
            scroll_filter=Filter(
                must=[FieldCondition(key="project", match=MatchValue(value=project))]
            ),
            limit=256,
            with_payload=True,
            offset=offset,
        )
        for point in points:
            for sentence in re.split(r"(?<=[.!?])\s+|\n+", point.payload.get("text", "")):
                sentence = sentence.strip().strip('"')
                if 3 <= len(sentence.split()) <= 14:
                    sentences.append(sentence)
        if offset is None or len(sentences) >= MAX_CORPUS_SENTENCES:
            break

    _cache.update(key=project, at=now, sentences=sentences)
    return sentences


def suggest(query: str, project: str = "Default", limit: int = 5) -> list[str]:
    typed = query.strip().lower()
    if len(typed) < 2:
        return []
    typed_words = typed.split()

    scored: list[tuple[int, str]] = []
    seen: set[str] = set()

    def consider(candidate: str, base_score: int) -> None:
        cand = candidate.strip().rstrip(".")
        lower = cand.lower()
        if not cand or lower in seen or lower == typed:
            return
        if lower.startswith(typed):
            score = base_score + 3  # true completion of what's being typed
        elif all(w in lower for w in typed_words):
            score = base_score + 1  # contains every typed word somewhere
        else:
            return
        seen.add(lower)
        scored.append((score, cand))

    for past in _recent_queries:
        consider(past, 2)
    for sentence in _corpus_sentences(project):
        consider(sentence, 0)

    scored.sort(key=lambda item: (-item[0], len(item[1])))
    return [c if len(c) <= 80 else c[:77] + "…" for _, c in scored[:limit]]
