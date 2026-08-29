"""API request/response schemas.

These Pydantic models are the contract between backend and frontend. The
frontend can be built against these shapes from day one — later phases only
change what fills them in, never the shapes themselves.
"""

from typing import Literal

from pydantic import BaseModel

Modality = Literal["pdf", "docx", "image", "audio", "text"]


class IngestResponse(BaseModel):
    file_id: str
    filename: str
    modality: Modality
    status: Literal["stored", "indexed", "failed"]
    detail: str | None = None
    chunks_indexed: int = 0


class Locator(BaseModel):
    """Points at the exact spot inside a source file that a chunk came from.

    Which fields are set depends on the modality:
      pdf/docx -> page, audio -> start_sec/end_sec, image -> image_id.
    """

    page: int | None = None
    start_sec: float | None = None
    end_sec: float | None = None
    image_id: str | None = None


class Citation(BaseModel):
    n: int  # citation number as it appears in the answer, e.g. [1]
    file_id: str
    source_file: str
    modality: Modality
    locator: Locator
    text: str  # the chunk text (or caption/transcript) that was cited
    score: float
    related_file_ids: list[str] = []  # cross-format links (Phase 4)


class QueryRequest(BaseModel):
    question: str
    top_k: int = 6
    project: str = "Default"
    model_choice: str | None = None


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    transcribed_question: str | None = None


class ImageGenerationResponse(BaseModel):
    image_url: str


class FileInfo(BaseModel):
    file_id: str
    filename: str
    modality: Modality
    uploaded_at: str
    project: str = "Default"


class ChunkInfo(BaseModel):
    """One indexed chunk of a file, in source order — used by the citation
    drawer to show a full transcript or all indexed passages of a document."""

    text: str
    locator: Locator
