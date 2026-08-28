# HEXAVERSE

Multimodal RAG system: ingest PDFs, Word documents, images and audio
recordings; search them all **by meaning** in one place; get LLM answers
**grounded in the sources**, with numbered citations that open the original
page, image or audio timestamp.

Built for SIH — problem statement: *Multimodal RAG for cross-format document,
image and audio intelligence.*

## How it works (one paragraph)

Every uploaded file is broken into **chunks** — a few paragraphs of a PDF, a
~30-second span of an audio transcript, an AI-written description of an
image. Each chunk is stored with (1) its text, (2) an **embedding** (a vector
that encodes its meaning, enabling semantic search) and (3) its **origin**
(file + page / timestamp / image id — this powers citations). A question is
embedded the same way, the nearest chunks are retrieved from the vector DB,
and a local LLM writes an answer using *only* those chunks, citing them by
number.

```
upload ──► extract/transcribe/caption ──► chunk ──► embed ──► Qdrant
question ──► embed ──► nearest chunks ──► LLM (grounded) ──► answer + citations
```

## Repo layout

```
backend/
  app/
    main.py        # FastAPI app: /ingest, /query, /files endpoints
    config.py      # ALL settings (env-overridable) — no hardcoded values elsewhere
    db.py          # Qdrant (embedded mode) + collection setup
    models.py      # API schemas = the backend/frontend contract
    registry.py    # file_id -> original file bookkeeping
    ingestion/     # per-modality pipelines (filled in Phases 1-3)
    query/         # retrieval + grounded answering (filled in Phase 1)
  storage/         # uploaded originals + vector DB (gitignored, auto-created)
  pyproject.toml   # dependencies (managed by uv)
  .env.example     # per-machine config template
frontend/          # web UI (Vite + React) — coming soon
```

## Backend: run it

Prerequisite: [uv](https://docs.astral.sh/uv/) (installs and pins Python
itself — you do **not** need the right Python preinstalled).

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
# Windows (PowerShell)
# powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Then:

```bash
cd backend
uv sync                     # creates .venv with pinned Python + deps (~1 min)
uv run uvicorn app.main:app --reload
```

The API is now at `http://localhost:8000` — interactive docs at
`http://localhost:8000/docs`.

Quick smoke test:

```bash
curl http://localhost:8000/health
curl -F "file=@/path/to/some.pdf" http://localhost:8000/ingest
curl -X POST http://localhost:8000/query -H 'Content-Type: application/json' \
     -d '{"question": "what is this report about?"}'
```

## API surface

| Endpoint | What it does |
|---|---|
| `GET /health` | liveness check |
| `POST /ingest` (multipart `file`) | store + index an uploaded file, returns `file_id` |
| `POST /query` `{question, top_k}` | grounded answer + numbered citations |
| `GET /files` | list ingested files |
| `GET /files/{file_id}` | download/view the original (used by citation links) |

Response shapes live in [`backend/app/models.py`](backend/app/models.py) —
treat that file as the frontend contract.

## Configuration

Copy `backend/.env.example` to `backend/.env` and override what you need.
Defaults work out of the box: embedded Qdrant (no Docker required), storage
under `backend/storage/`.

## Roadmap (build phases)

- [x] **Phase 0** — skeleton: API surface, config, storage, vector DB wiring
- [ ] **Phase 1** — text RAG end-to-end: PDF/DOCX extraction, chunking,
      embeddings (bge), retrieval, grounded LLM answers via Ollama
- [ ] **Phase 2** — audio: Whisper transcription, timestamped chunks,
      play-from-citation
- [ ] **Phase 3** — images: vision-LLM captions + OCR into the text index,
      CLIP index for direct text↔image search, image-as-query
- [ ] **Phase 4** — cross-format links (transcript ↔ paragraph ↔ screenshot)
- [ ] **Phase 5** — demo dataset, hardening, one-command startup

## Branches

Active development happens on `version_0`; `main` stays stable.
