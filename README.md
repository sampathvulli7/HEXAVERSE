# HEXAVERSE

Multimodal RAG system: ingest PDFs, Word documents, images and audio
recordings; search them all **by meaning** in one place; get LLM answers
**grounded in the sources**, with numbered citations that open the original
page, image or audio timestamp.

Built for SIH — problem statement: *Multimodal RAG for cross-format document,
image and audio intelligence.*

**Jump to what you need:**

- [🚀 I just want to run it](#-quick-start) — setup in ~2 minutes
- [💡 I want to understand how it works](#-how-it-works) — the concepts, no code
- [🏗 I want the full architecture](#-architecture-in-depth) — components, design decisions and why
- [🖥 Frontend docs](frontend/README.md) — the web UI: stack, components, citation flow
- [📖 API reference](#-api-reference) — endpoints and response shapes
- [🔧 Configuration](#-configuration) · [🩹 Troubleshooting](#-troubleshooting)
- [🗺 Roadmap](#-roadmap) · [🌿 Team workflow](#-team-workflow)

---

## 🚀 Quick start

The only prerequisite is [uv](https://docs.astral.sh/uv/) — it installs the
correct Python version itself, so you do **not** need Python preinstalled.

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Then:

```bash
git clone https://github.com/sampathvulli7/HEXAVERSE.git
cd HEXAVERSE
git switch version_0        # active development branch
cd backend
uv sync                     # creates .venv with pinned Python 3.12 + all deps
uv run uvicorn app.main:app --reload
```

Open **http://localhost:8000** — you'll land on the interactive API explorer
(Swagger UI), where you can upload files and run queries from the browser.

**For generated answers** (retrieval works without this), install
[Ollama](https://ollama.com/download) and pull the LLM (~4.7GB, one-time):

```bash
brew install ollama          # macOS; Windows/Linux: installer from ollama.com
ollama serve                 # leave running (or use the desktop app)
ollama pull qwen2.5:7b-instruct
```

If Ollama isn't running, `/query` still returns the retrieved sources with a
notice instead of a generated answer — the system degrades gracefully.

One-time model downloads happen on first use, then everything is instant:
the first `/ingest` fetches the embedding model (~200MB), the first *audio*
ingest fetches the Whisper speech-to-text model (~460MB), and the first
`/query` loads the LLM into RAM (~15s).

Smoke test from a terminal:

```bash
curl http://localhost:8000/health
curl -F "file=@/path/to/some.pdf" http://localhost:8000/ingest
curl -X POST http://localhost:8000/query -H 'Content-Type: application/json' \
     -d '{"question": "what is this report about?"}'
```

### The web UI

With the backend running, start the frontend (needs [Node.js](https://nodejs.org) ≥ 20):

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — upload files, ask questions, click
citations to open sources (PDF at the cited page, audio playing from the
cited second). Full frontend docs: [`frontend/README.md`](frontend/README.md).

No Docker, no database server, no API keys needed — the vector DB runs
embedded, storage is a local folder, and (from Phase 1) the LLM runs locally
via Ollama. Everything works offline.

---

## 💡 How it works

*Read this if you want to understand the system without touching code.*

### The problem

An office accumulates PDFs, Word files, email screenshots, and recorded
calls. Finding anything is hard for three reasons: normal search matches
**keywords, not meaning** ("international development funding" won't find a
report that says "fiscal assistance to partner nations"); every format is a
**silo** (you can't Ctrl+F a phone call or a screenshot); and even after
finding documents, a human still has to **read them** to extract the answer.

### The three ideas that fix it

**1. Embeddings — meaning becomes geometry.** An embedding model is a neural
network that converts text into a list of numbers (a vector) — think of it as
a *coordinate in a space of meanings*. It's trained so similar meanings land
close together. Search then becomes: convert everything to coordinates,
convert the question to a coordinate, return the nearest neighbors. That's
semantic search, and a **vector database** (we use Qdrant) is a database
specialized for exactly this.

**2. Normalize every format to text.** Audio becomes a transcript
(speech-to-text with Whisper). Images get an AI-written description plus any
text visible in them (a local vision model). PDFs/DOCX get their text
extracted. Once everything is text, **one embedding model puts all formats in
the same searchable space** — this is the "shared vector space" from the
problem statement. Images additionally get a second index via **CLIP**, a
model trained on 400M image–caption pairs so that images and *short text
queries* share a coordinate space directly — letting "email screenshot" as a
text query match raw pixels, and letting an uploaded image act as a query.

**3. RAG — retrieval-augmented generation.** LLMs hallucinate when asked
about documents they've never seen. So we never ask the LLM the question
directly: we first *retrieve* the most relevant chunks, paste them into the
prompt as numbered sources, and instruct it to **answer only from those
sources, citing by number**. The LLM becomes a reading-comprehension engine
over our data — and every claim in the answer is traceable to a source.

### The one mental picture to keep

Every file, whatever its format, is broken into **chunks**, and every chunk
is stored as the same three-part record:

| part | what it is | what it enables |
|---|---|---|
| text | the passage / transcript segment / image description | the LLM can read it |
| vector | its coordinate in meaning-space | semantic search finds it |
| origin | file + page / timestamp / image id | citations open the real source |

Ingestion produces these records, retrieval finds the nearest ones,
answering quotes them with their origins attached. Every phase of the
roadmap is just teaching the system to produce this record from one more
file format.

```
upload ──► extract / transcribe / caption ──► chunk ──► embed ──► Qdrant
question ──► embed ──► nearest chunks ──► LLM (grounded prompt) ──► answer + [1][2] citations
```

---

## 🏗 Architecture in depth

*Read this if you're developing the system.*

### Components

```
┌───────────────────────── FRONTEND (Vite + React — built) ──────────────────────┐
│  Upload zone · chat box · answer with [n] citation chips · citation drawer      │
│  (PDF page viewer / image lightbox / audio player seeked to timestamp)          │
└──────────────────┬─────────────────────────────────┬───────────────────────────┘
                   │ POST /ingest                    │ POST /query
┌──────────────────▼─────────────────────────────────▼───────────────────────────┐
│                              BACKEND (FastAPI)                                   │
│                                                                                  │
│  INGESTION (app/ingestion/)                QUERY (app/query/)                    │
│   route by modality:                        1. embed question (bge + CLIP)       │
│    pdf.py    → PyMuPDF per page             2. search text_chunks collection     │
│    docx.py   → python-docx                  3. search image_clip collection      │
│    audio.py  → faster-whisper (timestamps)  4. fuse ranked lists (RRF)           │
│    image.py  → vision-LLM caption + OCR     5. build grounded prompt             │
│                + CLIP pixel embedding       6. call local LLM (Ollama)           │
│   then: chunk → embed → upsert              7. map [n] citations to origins      │
└──────────┬──────────────────────────────────────────┬───────────────────────────┘
           │                                          │
┌──────────▼──────────────────┐        ┌──────────────▼─────────────────────┐
│ Qdrant (embedded, no Docker)│        │ Local models                        │
│  text_chunks  (768-d, bge)  │        │  bge-base-en-v1.5  text embeddings  │
│    (via fastembed/ONNX, no torch)   │
│  image_clip   (512-d, CLIP) │        │  CLIP ViT-B/32     image embeddings │
│ + storage/files/ originals  │        │  faster-whisper    speech-to-text   │
│ + registry.json bookkeeping │        │  Ollama: qwen2.5:7b (LLM),          │
│                             │        │          qwen2.5vl:7b (vision)      │
└─────────────────────────────┘        └────────────────────────────────────┘
```

### Design decisions and why

- **Two vector collections, not one.** Vectors are only comparable within
  the space of the model that produced them — bge's 768-d text space and
  CLIP's 512-d space are unrelated coordinate systems. So `text_chunks`
  holds bge embeddings of *every* modality's text form (the unified index),
  and `image_clip` holds CLIP embeddings of raw pixels (direct text↔image
  matching). Queries search both and merge results by rank (Reciprocal Rank
  Fusion), since raw scores across spaces aren't comparable.

- **Embedded Qdrant instead of a DB server.** `qdrant-client` in local mode
  runs the DB inside the Python process, persisting to `storage/qdrant/`.
  Zero infrastructure for teammates; setting `QDRANT_URL` in `.env` switches
  to a real Qdrant server with no code changes (see `app/db.py`).

- **Provenance stored on every chunk = the citation system.** Each chunk's
  payload carries `{file_id, source_file, modality, locator}` where locator
  is `page` / `start_sec,end_sec` / `image_id`. When the LLM cites [2], the
  backend looks up chunk 2's payload and the frontend knows exactly what to
  open. Citations aren't a feature bolted on later — they fall out of
  storing origin from day one.

- **Offline-first, cloud-optional.** All models run locally (government
  data never leaves the machine — a core requirement of the problem
  statement's context). The LLM is called through an OpenAI-compatible
  client pointed at Ollama; changing `LLM_BASE_URL`/`LLM_MODEL` in `.env`
  swaps in any cloud provider with zero code changes.

- **API shapes frozen in Phase 0.** `app/models.py` is the
  backend↔frontend contract. `/query` returned the final response shape
  from the first commit (stubbed), so frontend work never waits on backend
  intelligence.

- **uv with pinned Python 3.12.** The lockfile (`uv.lock`) plus
  `.python-version` means every teammate gets a byte-identical environment,
  including the interpreter. 3.12 (not newest) because ML wheels
  (PyTorch etc.) lag the latest Python.

- **fastembed instead of sentence-transformers.** Text embeddings run the
  same `bge-base-en-v1.5` model but through ONNX Runtime — no ~2GB PyTorch
  dependency, so `uv sync` stays fast. PyTorch enters only in Phase 3 when
  CLIP needs it. Note bge asymmetry: queries get a special prefix
  (`embed_query`), passages don't (`embed_passages`) — that's how the model
  was trained; mixing them up silently degrades retrieval quality.

- **Audio chunks are merged Whisper segments, not raw ones.** Whisper emits
  ~5–15s segments — too small to retrieve well. `audio.py` merges consecutive
  segments until ~250 words or 90 seconds, keeping the merged span's
  start/end times as the locator: big enough for good retrieval, short
  enough that a cited span is actually listenable. Transcription accuracy
  is a config knob: `WHISPER_MODEL=medium` in `.env` for better accuracy,
  `base` for speed (default `small`).

- **Adding a modality is one module + one dict entry.** An extractor returns
  `[{"text": ..., "locator": {...}}]` units and registers itself in
  `EXTRACTORS` in [`pipeline.py`](backend/app/ingestion/pipeline.py).
  Chunking, embedding, indexing, retrieval and citations all operate on that
  shape and need no changes. Phase 2 (audio) = writing `audio.py`.

### Code map

| path | responsibility |
|---|---|
| [`backend/app/main.py`](backend/app/main.py) | FastAPI app, endpoint definitions |
| [`backend/app/config.py`](backend/app/config.py) | **all** settings, env-overridable — never hardcode elsewhere |
| [`backend/app/models.py`](backend/app/models.py) | API schemas = frontend contract |
| [`backend/app/db.py`](backend/app/db.py) | Qdrant client + collection creation |
| [`backend/app/registry.py`](backend/app/registry.py) | file_id → original file bookkeeping |
| [`backend/app/embeddings.py`](backend/app/embeddings.py) | bge text embeddings (cached model, passage/query split) |
| [`backend/app/ingestion/pipeline.py`](backend/app/ingestion/pipeline.py) | extract → chunk → embed → index orchestration; `EXTRACTORS` registry |
| [`backend/app/ingestion/pdf.py`](backend/app/ingestion/pdf.py) / [`docx.py`](backend/app/ingestion/docx.py) / [`textfile.py`](backend/app/ingestion/textfile.py) | per-format extractors → `{text, locator}` units |
| [`backend/app/ingestion/audio.py`](backend/app/ingestion/audio.py) | Whisper speech-to-text → timestamped units (start_sec/end_sec locators) |
| [`backend/app/ingestion/chunking.py`](backend/app/ingestion/chunking.py) | 350-word chunks, 50 overlap, never across page boundaries |
| [`backend/app/query/retrieve.py`](backend/app/query/retrieve.py) | embed question → nearest chunks from Qdrant |
| [`backend/app/query/answer.py`](backend/app/query/answer.py) | grounded prompt, Ollama call, offline fallback |
| `backend/storage/` | originals, vector DB, registry (gitignored, auto-created) |

---

## 📖 API reference

Interactive version at `http://localhost:8000/docs` (auto-generated).

| Endpoint | Body | Returns |
|---|---|---|
| `GET /health` | — | `{"status": "ok"}` |
| `POST /ingest` | multipart `file` | `{file_id, filename, modality, status, chunks_indexed}` |
| `POST /query` | `{"question": str, "top_k": int=8}` | `{answer, citations: [...]}` |
| `GET /files` | — | list of ingested files |
| `GET /files/{file_id}` | — | the original file (bytes) |
| `GET /files/{file_id}/chunks` | — | all indexed chunks of one file, in source order — the full transcript of an audio file (with timestamps) or every indexed passage of a document |

`POST /ingest` status values: **`indexed`** (extracted, chunked, embedded,
searchable — `chunks_indexed` says how many chunks), **`stored`** (saved but
not yet searchable — audio/images until Phases 2–3), **`failed`** (saved but
extraction/indexing errored; see `detail`).

A citation object (see [`app/models.py`](backend/app/models.py) for the
authoritative version):

```json
{
  "n": 1,
  "file_id": "35803d0d9d5a",
  "source_file": "report_2024.pdf",
  "modality": "pdf",
  "locator": {"page": 14, "start_sec": null, "end_sec": null, "image_id": null},
  "text": "the retrieved passage…",
  "score": 0.82,
  "related_file_ids": []
}
```

Supported upload types: `.pdf .docx .png .jpg .jpeg .webp .mp3 .wav
.m4a .ogg .txt .md`

---

## 🔧 Configuration

Defaults work out of the box. To override per-machine, copy
`backend/.env.example` to `backend/.env` — options include the Qdrant server
URL, LLM/vision model names, Ollama URL, and the storage directory. The
single source of truth for every setting and its default is
`backend/app/config.py`.

---

## 🩹 Troubleshooting

- **`localhost:8000` shows `{"detail":"Not Found"}`** — you're on an old
  version; `git pull`. The root now redirects to `/docs`. The 404 actually
  means the server *is* running; the API lives at specific paths.
- **`uv: command not found` after install** — restart your terminal (the
  installer edits your shell profile).
- **Port already in use** — a previous server is still running:
  `pkill -f "uvicorn app.main"` (macOS/Linux) then start again.
- **Qdrant "already accessed by another instance"** — embedded Qdrant allows
  one process; kill duplicate servers (same command as above).
- **Windows: activation/permission errors** — no activation needed; always
  run via `uv run …` from the `backend/` folder.
- **Answer starts with `[LLM unavailable: …]`** — retrieval worked, but the
  LLM couldn't be reached. Start it with `ollama serve`, and make sure the
  model is pulled: `ollama pull qwen2.5:7b-instruct`.
- **First `/ingest` or `/query` is slow** — one-time costs: the first ingest
  downloads the embedding model (~200MB); the first query loads the LLM into
  RAM (~15s). Subsequent calls are fast. Pre-warm both before a demo.
- **A PDF indexes 0 chunks** — it's likely a scanned/image-only PDF with no
  extractable text; OCR for those lands in Phase 3 (vision pipeline).
- **Audio transcript has wrong words** — Whisper `small` (the default)
  trades some accuracy for speed; set `WHISPER_MODEL=medium` in
  `backend/.env` and re-ingest. Retrieval is often fine anyway (embeddings
  match meaning, not exact words), but transcripts shown to users look
  better with `medium`.
- **Audio ingest is slow** — transcription is roughly real-time on CPU with
  `small`; long recordings take a while. Pre-ingest demo audio in advance.

---

## 🗺 Roadmap

- [x] **Phase 0** — skeleton: API surface, config system, storage, vector
      DB wiring, stub query
- [x] **Phase 1** — text RAG end-to-end: PDF/DOCX/TXT extraction, chunking,
      bge embeddings (fastembed/ONNX — no PyTorch), retrieval, grounded
      cited answers via Ollama, graceful degradation when LLM is offline
- [x] **Phase 2** — audio: local Whisper transcription (faster-whisper),
      segments merged into timestamped chunks (start/end second locators →
      play-from-citation), full-transcript endpoint
      (`/files/{id}/chunks`); answers now synthesize across audio + docs
- [ ] **Phase 3** — images: vision-LLM captions + OCR into the text index,
      CLIP index for text↔image search, image-as-query
- [ ] **Phase 4** — cross-format links (transcript ↔ paragraph ↔ screenshot)
- [ ] **Phase 5** — demo dataset, hardening, one-command startup
- [x] Frontend (Vite + React): chat with citation chips, drag-and-drop
      upload, library, citation drawer (PDF-at-page / audio-at-timestamp /
      full transcripts) — see [`frontend/README.md`](frontend/README.md);
      image thumbnails & related-files strip land with Phases 3–4

---

## 🌿 Team workflow

- Active development happens on **`version_0`**; `main` stays stable.
- Runtime data (`backend/storage/`, `.env`) is gitignored — never commit
  uploaded files or secrets. Commit `uv.lock` (it *is* the reproducible
  environment).
- Adding a dependency: `cd backend && uv add <package>` (updates
  `pyproject.toml` + lockfile together), then commit both.
