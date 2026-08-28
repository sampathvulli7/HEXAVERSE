"""Split extracted units into retrieval-sized chunks.

Chunks never cross unit (= page/block) boundaries, so every chunk maps to
exactly one locator — that's what keeps citations precise. Oversized units
are split by words with overlap, so a sentence cut at a boundary still
appears whole in the neighbouring chunk.
"""

MAX_WORDS = 350
OVERLAP_WORDS = 50


def chunk_units(units: list[dict]) -> list[dict]:
    chunks = []
    for unit in units:
        words = unit["text"].split()
        if len(words) <= MAX_WORDS:
            chunks.append(unit)
            continue
        step = MAX_WORDS - OVERLAP_WORDS
        for start in range(0, len(words), step):
            piece = " ".join(words[start : start + MAX_WORDS])
            chunks.append({"text": piece, "locator": unit["locator"]})
            if start + MAX_WORDS >= len(words):
                break
    return chunks
