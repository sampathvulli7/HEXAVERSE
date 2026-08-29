# HEXAVERSE

Multimodal RAG system: ingest PDFs, Word documents, images and audio
recordings; search them all **by meaning** in one place; get LLM answers
**grounded in the sources**, with numbered citations that open the original
page, image or audio timestamp.

Built for SIH — problem statement: *Multimodal RAG for cross-format document,
image and audio intelligence.*

**Jump to what you need:**

- [🚀 I just want to run it](#-quick-start) — install → running → first answer, step by step
- [💡 I want to understand how it works](#-how-it-works) — the concepts, no code
- [🏗 I want the full architecture](#-architecture-in-depth) — components, design decisions and why
- [🖥 Frontend docs](frontend/README.md) — the web UI: stack, components, citation flow
- [📖 API reference](#-api-reference) — endpoints and response shapes
- [🔧 Configuration](#-configuration) · [🩹 Troubleshooting](#-troubleshooting)
- [🗺 Roadmap](#-roadmap) · [🌿 Team workflow](#-team-workflow)

---

## 🚀 Quick start

No Docker, no database server, no API keys, no cloud — the vector DB runs
embedded, storage is a local folder, and every model runs on your machine.
Once the models are downloaded, everything works fully offline.

You need two tools installed once, and two terminals running while you work:

| what | why | port |
|---|---|---|
| **Terminal 1: backend** (FastAPI) | ingestion, search, answering — the brains | 8000 |
| **Terminal 2: frontend** (Vite) | the web app you actually use | **5173 ← open this one** |
| **Ollama** (runs as a background service) | serves the local LLM + vision model | 11434 |

### Step 1 — install the two tools (once)

[uv](https://docs.astral.sh/uv/) manages Python — it installs the right
Python version itself, so you don't need Python preinstalled:

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

[Node.js](https://nodejs.org) ≥ 20 for the frontend (`brew install node` on
macOS, installer from nodejs.org on Windows). Restart your terminal after
installing so both are on PATH.

### Step 2 — clone and start the backend (Terminal 1)

```bash
git clone https://github.com/sampathvulli7/HEXAVERSE.git
cd HEXAVERSE
git switch version_0        # active development branch
cd backend
uv sync                     # one-time, ~1 min: pinned Python 3.12 + all deps
uv run uvicorn app.main:app --reload
```

Leave it running. Sanity check: http://localhost:8000 opens the interactive
API explorer (Swagger UI).

### Step 3 — start the frontend (Terminal 2)

```bash
cd HEXAVERSE/frontend
npm install                 # one-time, ~30s
npm run dev
```

Open **http://localhost:5173**. The dot in the top-right should say
**backend: connected** — if it says offline, Terminal 1 isn't running.

### Step 4 — install Ollama and pull the two models (once, ~11GB total)

This powers generated answers and image captions. Without it the app still
retrieves and cites sources — it just shows a notice instead of a written
answer (graceful degradation, by design).

```bash
brew install ollama               # macOS; Windows/Linux: installer from ollama.com
ollama serve                      # leave running (or use the desktop app)
ollama pull qwen2.5:7b-instruct   # answering LLM (~4.7GB)
ollama pull qwen2.5vl:7b          # vision model for image captioning (~6GB)
```

Other one-time downloads happen automatically on first use: embedding model
(~200MB, first ingest), Whisper (~460MB, first audio), CLIP (~250MB, first
image). After that everything is instant except the first query of a session
(~15s to load the LLM into RAM).

### Step 5 — use it (a 3-minute tour)

1. **Upload** — drag a PDF, DOCX, image, or audio recording into the "Add
   files" box (or click it to browse). Watch the status: `indexed · N
   chunks` means it's searchable. Audio takes roughly its own duration to
   transcribe; images take ~10–30s to caption — both are one-time,
   ingest-only costs.
2. **Ask in plain language** — no keywords needed; meaning is what's
   matched. Things to try, mapped to what they exercise:

   | ask | what it shows off |
   |---|---|
   | "summarize what we know about X" | grounded answer synthesized across *all* formats |
   | "what was said in the call about X?" | audio search with timestamped citation |
   | "show me the email screenshot" | text→image search (CLIP + caption) |
   | "which sources mention the screenshot from 14:32?" | cross-referencing between modalities |
   | something your files don't cover | it says so instead of inventing an answer |

3. **Click any `[n]` citation chip** — the drawer opens with the exact cited
   passage, the original source (PDF at the cited page / audio playing from
   the cited second / full-size image), a **"Related across formats"** strip
   linking to connected files in other modalities, and a full
   transcript/passages view with clickable timestamps.
4. **Search by image** — click the 🖼 button, pick an image (optionally type
   a question first): you get visually similar stored images *plus*
   documents and audio about the same topic.

Prefer the raw API (scripts, curl, teammates building against it)? See the
[API reference](#-api-reference); quick smoke test:

```bash
curl http://localhost:8000/health
curl -F "file=@/path/to/some.pdf" http://localhost:8000/ingest
curl -X POST http://localhost:8000/query -H 'Content-Type: application/json' \
     -d '{"question": "what is this report about?"}'
```

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

### One question, traced end to end

Concretely, here's what happens in the ~10 seconds after you ask
*"what is the latest status of the water program?"*:

1. The question is embedded twice: by **bge** (to search document chunks,
   transcript segments and image captions) and by **CLIP's text encoder**
   (to search raw image pixels).
2. Qdrant returns the nearest chunks from both collections; the two ranked
   lists are merged by rank (RRF). Say the top hits are: a DOCX paragraph,
   an audio segment at 0:00–0:26, and a PDF page-2 chunk.
3. Those chunks are pasted into the LLM prompt as numbered sources —
   `[1] (meeting_notes.docx, page 1): …` — with the instruction *answer
   only from these sources, cite by number, say so if they don't contain
   the answer*.
4. The LLM writes: *"The permit delays have been resolved and construction
   begins in October [2]. The timeline had previously been pushed to Q3
   2025 [1]…"*
5. The backend maps each `[n]` back to its chunk's stored origin, so the
   response carries, for [2]: `review_call.wav, start_sec 0.0, end_sec
   25.9, related: [meeting_notes.docx, email_screenshot.png]`.
6. The UI renders the `[n]` as chips; clicking [2] opens the drawer with
   the transcript passage, the audio player seeked to 0:00, and the
   related-files strip.

Every piece of that flow is inspectable — nothing in the answer exists
without a source you can open.

---

## 🏗 Architecture in depth

*Read this if you're developing the system.*

### Components

```
┌───────────────────────── FRONTEND (Vite + React — built) ──────────────────────┐
│  Multi-tab Dashboard · Project Selector · Chat box · Answer w/ [n] chips        │
│  Citation drawer (PDF viewer/image lightbox/audio player) · Text-to-Speech    │
└──────────────────┬─────────────────────────────────┬───────────────────────────┘
                   │ POST /ingest                    │ POST /query
┌──────────────────▼─────────────────────────────────▼───────────────────────────┐
│                              BACKEND (FastAPI)                                   │
│                                                                                  │
│  INGESTION (app/ingestion/)                QUERY (app/query/)                    │
│   route by modality:                        1. embed question (bge + CLIP)       │
│    pdf.py    → PyMuPDF per page             2. filter by active Project          │
│    docx.py   → python-docx                  3. search text_chunks collection     │
│    audio.py  → faster-whisper               4. search image_clip collection      │
│    image.py  → vision-LLM caption + OCR     5. fuse ranked lists (RRF)           │
│   then: chunk → embed → add Project tag     6. build grounded prompt             │
│   → upsert payload                          7. call local LLM (Ollama)           │
│                                             8. map [n] citations to origins      │
│                                                                                  │
│  EXTRA CAPABILITIES:                                                             │
│   POST /synthesize    → Text-to-Speech using gTTS                                │
│   POST /query/audio   → Voice-as-query using faster-whisper                      │
│   POST /generate/image→ Stable Diffusion XL (via Hugging Face)                   │
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

- **Project Workspaces.** Every chunk stored in the vector database is tagged
  with a `project` string. Retrieval filters results at the database level using
  an O(1) payload index on `project`, ensuring that the LLM only answers from
  files within the active project. This guarantees absolute data isolation
  between different workspaces.

- **Provenance stored on every chunk = the citation system.** Each chunk's
  payload carries `{file_id, source_file, modality, project, locator}` where
  locator is `page` / `start_sec,end_sec` / `image_id`. When the LLM cites [2],
  the backend looks up chunk 2's payload and the frontend knows exactly what to
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

- **fastembed instead of sentence-transformers/PyTorch — for everything.**
  Text embeddings (`bge-base-en-v1.5`) *and* both CLIP encoders run through
  ONNX Runtime, so the project never installs PyTorch at all and `uv sync`
  stays fast. Note bge asymmetry: queries get a special prefix
  (`embed_query`), passages don't (`embed_passages`) — that's how the model
  was trained; mixing them up silently degrades retrieval quality.

- **Images are indexed twice, on purpose.** Each image's vision-LLM caption
  (with all visible text transcribed) goes into the bge text index — so
  "what did the email say?" finds it semantically. Its raw pixels go into
  the CLIP index — so "email screenshot" matches what it *looks like*, and
  an uploaded image can be the query. At query time both lists merge via
  Reciprocal Rank Fusion (rank-based, since scores from different spaces
  aren't comparable); an image found in *both* lists gets a natural boost
  and is deduplicated into one citation.

- **Audio chunks are merged Whisper segments, not raw ones.** Whisper emits
  ~5–15s segments — too small to retrieve well. `audio.py` merges consecutive
  segments until ~250 words or 90 seconds, keeping the merged span's
  start/end times as the locator: big enough for good retrieval, short
  enough that a cited span is actually listenable. Transcription accuracy
  is a config knob: `WHISPER_MODEL=medium` in `.env` for better accuracy,
  `base` for speed (default `small`).

- **Cross-format links are computed at ingest time, mutually.** When a chunk
  is indexed, its nearest chunks from *other* modalities (above
  `RELATED_MIN_SCORE`, default 0.55) become its `related_file_ids` — and it
  is added to theirs, so ingestion order doesn't matter: a PDF ingested
  first still learns about the call recording ingested last. Cost: one
  extra vector query per chunk. This is what connects an audio segment to
  the paragraph and screenshot it discusses. Tune via `RELATED_MIN_SCORE` /
  `RELATED_MAX_LINKS` in `.env`.

- **Multimodal Output & Voice Interaction.** The backend supports voice queries
  (`POST /query/audio`) which are transcribed with `faster-whisper` and fed directly
  into the RAG pipeline. It also supports text-to-speech (`POST /synthesize`) using
  `gTTS` to read answers aloud, and high-quality image generation via the Hugging
  Face Inference API (`POST /generate/image`) for creative tasks (prompted via
  `/imagine`).

- **Adding a modality is one module + one dict entry.** An extractor returns
  `[{"text": ..., "locator": {...}}]` units and registers itself in
  `EXTRACTORS` in [`pipeline.py`](backend/app/ingestion/pipeline.py).
  Chunking, embedding, indexing, retrieval and citations all operate on that
  shape and need no changes.

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
| [`backend/app/ingestion/image.py`](backend/app/ingestion/image.py) | vision-LLM caption + verbatim OCR of visible text (CLIP indexing lives in pipeline.py) |
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
| `POST /query` | `{"question": str, "top_k": int=8}` | `{answer, citations: [...]}` — searches all modalities (text index + CLIP image index, rank-fused) |
| `POST /query/image` | multipart `file` (+ optional `question`, `top_k`) | same shape — image-as-query: visually similar images (CLIP) + related documents/audio (via the image's generated caption) |
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

Defaults work out of the box — configure nothing and it runs. To override
per-machine, copy `backend/.env.example` to `backend/.env` and set only what
you need. The single source of truth for every setting and its default is
[`backend/app/config.py`](backend/app/config.py); the ones worth knowing:

| setting (in `.env`) | default | when you'd change it |
|---|---|---|
| `WHISPER_MODEL` | `small` | `medium` for better transcripts (slower), `base` for speed |
| `LLM_MODEL` | `qwen2.5:7b-instruct` | smaller machine → `qwen2.5:3b`; any Ollama model works |
| `VISION_MODEL` | `qwen2.5vl:7b` | smaller machine → `qwen2.5vl:3b` |
| `LLM_BASE_URL` | `http://localhost:11434/v1` | point at another machine's Ollama, or any OpenAI-compatible API (cloud adapter) |
| `RELATED_MIN_SCORE` | `0.55` | raise for fewer/stronger cross-format links, lower for more |
| `RELATED_MAX_LINKS` | `3` | max related files per chunk |
| `QDRANT_URL` | *(unset → embedded)* | set to a Qdrant server URL for multi-process/production use |
| `STORAGE_DIR` | `backend/storage` | move uploaded files + index elsewhere (e.g. bigger disk) |

Frontend: `VITE_API_URL` in `frontend/.env.local` points the UI at a backend
on another machine (see [frontend/README.md](frontend/README.md#run-it)).

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
- **An image's caption says "(uncaptioned image … vision model
  unavailable)"** — the vision LLM couldn't be reached during ingest. Pull
  it (`ollama pull qwen2.5vl:7b`), make sure `ollama serve` is running, and
  re-upload the image. The image is still findable via CLIP either way.
- **Image ingest takes ~10–30s per image** — that's the vision model writing
  the caption + transcribing visible text (ingest-time cost only; queries
  are unaffected). Pre-ingest demo images.
- **A citation shows no "Related across formats"** — links are computed
  during ingest, so content ingested *before* Phase 4 landed has none:
  re-upload those files. Also, links only form above the similarity
  threshold (`RELATED_MIN_SCORE`); unrelated files staying unlinked is the
  feature working, not a bug.

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
- [x] **Phase 3** — images: local vision-LLM captions + verbatim OCR into
      the text index, CLIP pixel index (via fastembed/ONNX — still no
      PyTorch), RRF fusion across both spaces, image-as-query endpoint
      (`POST /query/image`) with UI support (🖼 button, thumbnails)
- [x] **Phase 4** — cross-format links: every chunk stores `related_file_ids`
      pointing at strongly-similar content in *other* modalities (computed at
      ingest, linked mutually in both directions); citations carry them and
      the drawer shows a "Related across formats" strip
      (transcript ↔ paragraph ↔ screenshot)
- [x] **Phase 5** — Gold-standard Polish:
      - **Project isolation**: Separate vector indexes by project context
      - **Voice-as-query**: Speak to ask questions via microphone
      - **Text-to-speech**: The assistant reads its answers out loud
      - **Image Generation**: High quality SDXL image generation (`/imagine`) via HuggingFace
      - **Enhanced UI**: Modern dashboard with Library, active project selector, Settings, and Insights tabs
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
