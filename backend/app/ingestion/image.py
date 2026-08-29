"""Image ingestion, part 1 of 2: caption + OCR via a local vision LLM.

The caption goes into the TEXT index like any other chunk — so a query like
"email screenshot" or a question about text visible in the image finds it
through the normal semantic path. (Part 2, CLIP pixel indexing, happens in
pipeline.py because it writes to the second collection.)

If the vision model is unavailable, we degrade to a filename-based
placeholder caption so ingestion never hard-fails — the image is still
findable via CLIP; the placeholder is marked so it can be re-captioned later.
"""

import base64
import mimetypes
from pathlib import Path

from openai import OpenAI

from app.config import settings

CAPTION_PROMPT = (
    "Describe this image in 2-4 sentences for a search index. "
    "State what kind of image it is (photo, screenshot, chart, scan...) and "
    "what it shows. If it is a screenshot, name the application or content. "
    "Then transcribe ALL text visible in the image, verbatim."
)


def caption_image(path: str) -> str:
    data = base64.b64encode(Path(path).read_bytes()).decode()
    mime = mimetypes.guess_type(path)[0] or "image/png"
    client = OpenAI(base_url=settings.llm_base_url, api_key=settings.llm_api_key)
    response = client.chat.completions.create(
        model=settings.vision_model,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": CAPTION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{data}"},
                    },
                ],
            }
        ],
        temperature=0.1,
    )
    return (response.choices[0].message.content or "").strip()


def extract(path: str) -> list[dict]:
    image_id = Path(path).stem  # files are stored as {file_id}{ext}
    try:
        text = caption_image(path)
    except Exception:
        text = f"(uncaptioned image: {Path(path).name} — vision model unavailable)"
    if not text:
        return []
    return [{"text": text, "locator": {"image_id": image_id}}]
