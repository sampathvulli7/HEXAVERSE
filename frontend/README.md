# HEXAVERSE Frontend

The unified query interface: a chat where answers carry numbered citations,
and every citation opens the original source — the PDF at the cited page,
the audio seeked to the cited second, the image, the transcript.

**Jump to:**

- [Run it](#run-it)
- [Stack & why](#stack--why)
- [How it connects to the backend](#how-it-connects-to-the-backend)
- [Component map](#component-map)
- [The citation flow (the important part)](#the-citation-flow-the-important-part)
- [Styling](#styling)
- [Extending it](#extending-it)

---

## Run it

Prerequisite: [Node.js](https://nodejs.org) ≥ 20 (`brew install node` on
macOS, installer on Windows). Then:

```bash
cd frontend
npm install     # one-time, ~30s
npm run dev     # starts on http://localhost:5173
```

The backend must be running too (see the [root README](../README.md#-quick-start)):

```bash
cd backend && uv run uvicorn app.main:app --reload
```

Open **http://localhost:5173**. The health dot in the top-right tells you
whether the backend is reachable.

To use a backend on a **different machine** (e.g. one teammate hosts it),
create `frontend/.env.local`:

```
VITE_API_URL=http://192.168.1.20:8000
```

(Then add that origin to `cors_origins` in `backend/app/config.py` or via
`backend/.env`.)

## Stack & why

- **Vite + React, plain JavaScript (JSX)** — fast dev server with hot
  reload, and the stack the team already knows. No TypeScript to keep the
  onboarding cost at zero; the API contract is enforced by the backend's
  Pydantic schemas instead.
- **No UI framework, one hand-written CSS file** — the whole design is
  ~300 lines in [`src/styles.css`](src/styles.css) using CSS custom
  properties (design tokens). Nothing to learn, nothing to fight, and the
  bundle stays tiny.
- **No state library** — all state lives in `App.jsx` with `useState` and
  flows down as props. At this app's size, Redux/Zustand would be pure
  overhead.

## How it connects to the backend

All HTTP calls live in **[`src/api.js`](src/api.js)** — components never
call `fetch` directly. In development, requests go to `/api/*`, which the
Vite dev server **proxies** to `http://localhost:8000` (configured in
[`vite.config.js`](vite.config.js)). That means the browser only ever talks
to one origin — no CORS setup needed to develop.

```
browser ──► http://localhost:5173/api/query ──(vite proxy)──► http://localhost:8000/query
```

The response shapes are defined by `backend/app/models.py` — treat that file
as the source of truth. If the backend adds a field, `api.js` needs no
change; components can just start using it.

## Component map

```
src/
  main.jsx                     entry point, mounts <App/>
  api.js                       ALL backend calls (query/ingest/files/chunks/health)
  styles.css                   design tokens + every style
  App.jsx                      layout + shared state (files, active citation)
  components/
    UploadZone.jsx             drag-and-drop / click upload → POST /ingest,
                               per-file status (indexed · N chunks / failed)
    Library.jsx                list of ingested files with modality badges
    Chat.jsx                   question box + 🖼 image-as-query button,
                               messages, AnswerText (renders [n] as clickable
                               chips), SourcesRow (citation cards, image
                               thumbnails)
    CitationDrawer.jsx         the source viewer (see next section)
```

Layout (three columns, responsive — drawer overlays below 1100px, columns
stack below 760px):

```
┌ topbar: brand · tagline · backend health dot ───────────────────────┐
├ sidebar ──────────┬ chat ──────────────────┬ citation drawer ───────┤
│ UploadZone        │ answers with [n] chips │ cited passage           │
│ Library           │ + source cards         │ original source viewer  │
│                   │ question box           │ full transcript/passages│
└───────────────────┴────────────────────────┴─────────────────────────┘
```

## The citation flow (the important part)

This is the feature the problem statement calls "citation transparency &
source navigation", end to end:

1. `/query` returns `{answer, citations}` — the answer text contains `[1]`,
   `[2]` markers; each citation object carries `file_id`, `modality`, a
   `locator` (page / start_sec+end_sec / image_id) and the exact chunk text.
2. `Chat.jsx` splits the answer on `[n]` and renders each marker as a chip;
   clicking a chip (or a source card) sets `activeCitation` in `App.jsx`.
3. `CitationDrawer.jsx` renders by modality, using the locator:
   - **pdf** → `<iframe src="/api/files/{id}#page=N">` (browser's PDF viewer
     opens at the cited page)
   - **audio** → `<audio>` with `currentTime = start_sec` (plays from the
     cited moment)
   - **image** → full-size `<img>`
   - **docx/text** → cited text + download link (browsers can't render docx)
4. "Show full transcript / all indexed passages" calls
   `GET /files/{id}/chunks`; for audio, every transcript row has a ▶ button
   that seeks the player to that row's timestamp.

## Styling

Everything derives from the design tokens at the top of
[`src/styles.css`](src/styles.css) (`--bg`, `--accent`, `--radius`, …).
Change the palette there and the whole app follows. Class names are
component-scoped by convention (`.drawer-*`, `.cite-chip`, `.source-card`);
there is no CSS framework and no build-time CSS tooling.

## Extending it

- ~~Image results (Phase 3)~~ **done** — image citations render thumbnails
  in `SourcesRow` and full-size in the drawer.
- ~~Image-as-query (Phase 3)~~ **done** — the 🖼 button in the ask bar sends
  the picked image (plus any typed question) to `POST /query/image`; the
  response shape is the same `{answer, citations}`, so nothing else changed.
- **Cross-format links (Phase 4):** `citations[].related_file_ids` is
  already in the contract — render a "Related across formats" strip in the
  drawer that looks files up in the library list.
- **Production build:** `npm run build` outputs static files in `dist/`;
  serve them from anywhere (or mount them in FastAPI) and set
  `VITE_API_URL` at build time.
