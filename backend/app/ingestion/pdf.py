"""PDF text extraction, one unit per page (the page number becomes the
citation locator)."""

import pymupdf


def extract(path: str) -> list[dict]:
    units = []
    with pymupdf.open(path) as doc:
        for page_no, page in enumerate(doc, start=1):
            text = page.get_text().strip()
            # A page with (almost) no extractable text is likely scanned;
            # OCR for those arrives with the vision pipeline in Phase 3.
            if len(text) > 10:
                units.append({"text": text, "locator": {"page": page_no}})
    return units
