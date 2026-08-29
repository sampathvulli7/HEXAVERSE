"""HEXAVERSE backend — multimodal RAG API.

Phase 0: skeleton with the final API surface. /ingest stores files and
detects modality (indexing arrives in Phases 1-3); /query returns a stub in
the final response shape so the frontend can be built against it now.
"""

from contextlib import asynccontextmanager
import io
import urllib.parse
from pathlib import Path

from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from pydantic import BaseModel
from gtts import gTTS

from qdrant_client.models import FieldCondition, Filter, MatchValue

from app import registry
from app.config import settings
from app.db import ensure_collections, get_client
from app.ingestion import image, pipeline
from app.query.answer import generate_answer
from app.query.retrieve import retrieve, retrieve_by_image
from app.models import (
    ChunkInfo,
    Citation,
    FileInfo,
    IngestResponse,
    Locator,
    QueryRequest,
    QueryResponse,
    ImageGenerationResponse,
)

class SynthesizeRequest(BaseModel):
    text: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_collections()
    yield


app = FastAPI(title="HEXAVERSE", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/docs")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/ingest", response_model=IngestResponse)
async def ingest(file: UploadFile) -> IngestResponse:
    modality = registry.detect_modality(file.filename or "")
    if modality is None:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.filename!r}. "
            f"Supported: {sorted(registry.EXTENSION_TO_MODALITY)}",
        )
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    record = registry.register_file(file.filename, modality, content)

    if modality not in pipeline.EXTRACTORS:
        return IngestResponse(
            file_id=record["file_id"],
            filename=record["filename"],
            modality=modality,
            status="stored",
            detail=f"Stored. Indexing for {modality!r} arrives in Phase 2 (audio) / 3 (image).",
        )
    try:
        chunks_indexed = pipeline.ingest_file(record)
    except Exception as exc:
        return IngestResponse(
            file_id=record["file_id"],
            filename=record["filename"],
            modality=modality,
            status="failed",
            detail=f"Stored, but indexing failed: {exc}",
        )
    return IngestResponse(
        file_id=record["file_id"],
        filename=record["filename"],
        modality=modality,
        status="indexed",
        chunks_indexed=chunks_indexed,
    )


def _citations(hits: list[dict]) -> list[Citation]:
    return [
        Citation(
            n=i,
            file_id=hit["file_id"],
            source_file=hit["source_file"],
            modality=hit["modality"],
            locator=Locator(**(hit.get("locator") or {})),
            text=hit["text"],
            score=hit["score"],
            related_file_ids=hit.get("related_file_ids") or [],
        )
        for i, hit in enumerate(hits, start=1)
    ]


@app.post("/query", response_model=QueryResponse)
def query(request: QueryRequest) -> QueryResponse:
    hits = retrieve(request.question, request.top_k)
    answer = generate_answer(request.question, hits)
    return QueryResponse(answer=answer, citations=_citations(hits))


@app.post("/query/image", response_model=QueryResponse)
async def query_by_image(
    file: UploadFile, question: str = Form(""), top_k: int = Form(6)
) -> QueryResponse:
    """Image-as-query: find stored content related to an uploaded image —
    visually similar images via CLIP, plus documents/transcripts related to
    what the image shows (via its generated caption)."""
    suffix = Path(file.filename or "q.png").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(status_code=415, detail="Query image must be png/jpg/webp.")
    tmp_path = settings.storage_dir / f"query_image{suffix}"
    tmp_path.write_bytes(await file.read())

    try:
        caption = image.caption_image(str(tmp_path))
    except Exception:
        caption = ""  # vision model down: CLIP-only search still works

    hits = retrieve_by_image(str(tmp_path), caption, top_k)
    effective_question = question.strip() or (
        "What is this image about, and what related information do the sources contain? "
        f"The image shows: {caption or '(no description available)'}"
    )
    answer = generate_answer(effective_question, hits)
    return QueryResponse(answer=answer, citations=_citations(hits))


from app.ingestion.audio import _model as whisper_model

@app.post("/query/audio", response_model=QueryResponse)
async def query_by_audio(
    file: UploadFile, top_k: int = Form(6)
) -> QueryResponse:
    """Voice-as-query: transcribe uploaded audio, then perform semantic search."""
    suffix = Path(file.filename or "q.wav").suffix.lower()
    tmp_path = settings.storage_dir / f"query_audio{suffix}"
    tmp_path.write_bytes(await file.read())

    segments, _ = whisper_model().transcribe(str(tmp_path), vad_filter=True)
    question = " ".join([seg.text.strip() for seg in segments]).strip()
    
    if not question:
        raise HTTPException(status_code=400, detail="No speech detected.")
        
    hits = retrieve(question, top_k)
    answer = generate_answer(question, hits)
    return QueryResponse(answer=answer, citations=_citations(hits), transcribed_question=question)


@app.post("/synthesize")
def synthesize(request: SynthesizeRequest) -> StreamingResponse:
    """Text-to-speech endpoint for the assistant's grounded answers."""
    # Clean the text of [n] citation markers before speaking
    import re
    clean_text = re.sub(r'\[\d+\]', '', request.text)
    
    tts = gTTS(text=clean_text, lang='en', slow=False)
    fp = io.BytesIO()
    tts.write_to_fp(fp)
    fp.seek(0)
    return StreamingResponse(fp, media_type="audio/mpeg")


@app.post("/generate/image", response_model=ImageGenerationResponse)
async def generate_image_endpoint(request: QueryRequest) -> ImageGenerationResponse:
    """Generates an image from a text prompt using Hugging Face Inference API."""
    if not settings.hf_api_token:
        raise HTTPException(
            status_code=401, 
            detail="HF_API_TOKEN is not set in backend/.env. Please add it to use Text-to-Image."
        )
    
    api_url = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"
    headers = {"Authorization": f"Bearer {settings.hf_api_token}"}
    payload = {"inputs": request.question}
    
    import httpx
    import base64
    
    async with httpx.AsyncClient() as client:
        resp = await client.post(api_url, headers=headers, json=payload, timeout=60.0)
        
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Image generation failed: {resp.text}")
        
    img_b64 = base64.b64encode(resp.content).decode("utf-8")
    content_type = resp.headers.get("content-type", "image/jpeg")
    
    return ImageGenerationResponse(image_url=f"data:{content_type};base64,{img_b64}")


@app.get("/files")
def files() -> list[FileInfo]:
    return [FileInfo(**f) for f in registry.list_files()]


@app.get("/files/{file_id}")
def get_file(file_id: str) -> FileResponse:
    record = registry.get_file(file_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Unknown file_id")
    return FileResponse(record["stored_path"], filename=record["filename"])


@app.get("/files/{file_id}/chunks", response_model=list[ChunkInfo])
def get_file_chunks(file_id: str) -> list[ChunkInfo]:
    """All indexed chunks of one file, in source order — e.g. the full
    transcript of an audio file, or every indexed passage of a document."""
    if registry.get_file(file_id) is None:
        raise HTTPException(status_code=404, detail="Unknown file_id")
    points, _ = get_client().scroll(
        collection_name=settings.text_collection,
        scroll_filter=Filter(
            must=[FieldCondition(key="file_id", match=MatchValue(value=file_id))]
        ),
        limit=1000,
        with_payload=True,
    )
    chunks = [
        ChunkInfo(text=p.payload["text"], locator=Locator(**(p.payload.get("locator") or {})))
        for p in points
    ]
    chunks.sort(key=lambda c: (c.locator.page or 0, c.locator.start_sec or 0.0))
    return chunks


@app.delete("/files/{file_id}")
def delete_file(file_id: str) -> dict:
    """Delete a file from the vector DB, the registry, and disk."""
    if registry.get_file(file_id) is None:
        raise HTTPException(status_code=404, detail="Unknown file_id")
    
    client = get_client()
    selector = Filter(must=[FieldCondition(key="file_id", match=MatchValue(value=file_id))])
    
    client.delete(collection_name=settings.text_collection, points_selector=selector)
    client.delete(collection_name=settings.image_collection, points_selector=selector)
    
    registry.delete_file(file_id)
    return {"status": "deleted"}
