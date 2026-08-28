"""HEXAVERSE backend — multimodal RAG API.

Phase 0: skeleton with the final API surface. /ingest stores files and
detects modality (indexing arrives in Phases 1-3); /query returns a stub in
the final response shape so the frontend can be built against it now.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse

from app import registry
from app.config import settings
from app.db import ensure_collections
from app.ingestion import pipeline
from app.query.answer import generate_answer
from app.query.retrieve import retrieve
from app.models import (
    Citation,
    FileInfo,
    IngestResponse,
    Locator,
    QueryRequest,
    QueryResponse,
)


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


@app.post("/query", response_model=QueryResponse)
def query(request: QueryRequest) -> QueryResponse:
    hits = retrieve(request.question, request.top_k)
    answer = generate_answer(request.question, hits)
    citations = [
        Citation(
            n=i,
            file_id=hit["file_id"],
            source_file=hit["source_file"],
            modality=hit["modality"],
            locator=Locator(**(hit.get("locator") or {})),
            text=hit["text"],
            score=hit["score"],
        )
        for i, hit in enumerate(hits, start=1)
    ]
    return QueryResponse(answer=answer, citations=citations)


@app.get("/files")
def files() -> list[FileInfo]:
    return [FileInfo(**f) for f in registry.list_files()]


@app.get("/files/{file_id}")
def get_file(file_id: str) -> FileResponse:
    record = registry.get_file(file_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Unknown file_id")
    return FileResponse(record["stored_path"], filename=record["filename"])
