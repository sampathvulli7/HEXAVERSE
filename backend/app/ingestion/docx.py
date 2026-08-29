"""DOCX text extraction.

Word files have no fixed pages, so paragraphs are grouped into ~250-word
blocks and the block number is used as the citation locator's "page".
"""

import docx as docx_lib

BLOCK_WORDS = 250


def extract(path: str) -> list[dict]:
    document = docx_lib.Document(path)
    units: list[dict] = []
    block: list[str] = []
    words = 0

    def flush() -> None:
        nonlocal block, words
        if block:
            units.append(
                {"text": "\n".join(block), "locator": {"page": len(units) + 1}}
            )
            block, words = [], 0

    for para in document.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        block.append(text)
        words += len(text.split())
        if words >= BLOCK_WORDS:
            flush()
    flush()
    return units
