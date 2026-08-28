"""Audio ingestion: speech-to-text with timestamps (faster-whisper, local).

Whisper returns many short segments (~5-15s each) with start/end times.
Those are too small to be good retrieval units, so consecutive segments are
merged until a word or duration budget is hit. The merged unit's locator
keeps the span's start_sec/end_sec — that's what lets a citation play the
audio from the exact moment.

Runs fully offline on CPU (int8). The model (~460MB for "small") downloads
to the local HF cache on first use.
"""

from functools import lru_cache

from faster_whisper import WhisperModel

from app.config import settings

# Merge whisper segments until either budget is hit. ~250 words keeps chunks
# comfortably under the text chunker's limit; 90s keeps cited spans short
# enough to be listenable.
MAX_WORDS = 250
MAX_SPAN_SECONDS = 90.0


@lru_cache(maxsize=1)
def _model() -> WhisperModel:
    return WhisperModel(settings.whisper_model, device="cpu", compute_type="int8")


def extract(path: str) -> list[dict]:
    # vad_filter skips silence, which both speeds transcription up and
    # avoids hallucinated text in quiet stretches.
    segments, _info = _model().transcribe(path, vad_filter=True)

    units: list[dict] = []
    texts: list[str] = []
    words = 0
    span_start: float | None = None
    span_end = 0.0

    def flush() -> None:
        nonlocal texts, words, span_start
        if texts:
            units.append(
                {
                    "text": " ".join(texts),
                    "locator": {
                        "start_sec": round(span_start, 2),
                        "end_sec": round(span_end, 2),
                    },
                }
            )
            texts, words, span_start = [], 0, None

    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        if span_start is None:
            span_start = seg.start
        texts.append(text)
        words += len(text.split())
        span_end = seg.end
        if words >= MAX_WORDS or (span_end - span_start) >= MAX_SPAN_SECONDS:
            flush()
    flush()
    return units
