"""PDF text extraction, one unit per page (the page number becomes the
citation locator)."""

import io
import pymupdf
import pytesseract
from PIL import Image


def extract(path: str) -> list[dict]:
    units = []
    with pymupdf.open(path) as doc:
        for page_no, page in enumerate(doc, start=1):
            text = page.get_text().strip()
            
            # A page with (almost) no extractable text is likely scanned;
            # use OCR as a fallback.
            if len(text) < 50:
                try:
                    pix = page.get_pixmap(dpi=150)
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    ocr_text = pytesseract.image_to_string(img).strip()
                    if len(ocr_text) > len(text):
                        text = ocr_text
                except Exception as e:
                    print(f"OCR failed for page {page_no} of {path}: {e}")

            if len(text) > 10:
                units.append({"text": text, "locator": {"page": page_no}})
    return units
