// All backend communication lives here — components never call fetch()
// directly. The response shapes mirror backend/app/models.py (the contract).
//
// Base URL: '/api' by default, which the Vite dev server proxies to
// http://localhost:8000 (see vite.config.js). To point at a backend on
// another machine, create frontend/.env.local with e.g.
//   VITE_API_URL=http://192.168.1.20:8000

const API = import.meta.env.VITE_API_URL || '/api'

async function json(response) {
  if (!response.ok) {
    let detail = response.statusText
    try {
      detail = (await response.json()).detail || detail
    } catch { /* non-JSON error body */ }
    throw new Error(detail)
  }
  return response.json()
}

export const health = () => fetch(`${API}/health`).then(json)

export const listFiles = () => fetch(`${API}/files`).then(json)

// URL of the original file (PDF viewer, <img>, <audio> all point here).
export const fileUrl = (fileId) => `${API}/files/${fileId}`

// All indexed chunks of a file, in source order (full transcript / passages).
export const fileChunks = (fileId) =>
  fetch(`${API}/files/${fileId}/chunks`).then(json)

export function ingest(file) {
  const body = new FormData()
  body.append('file', file)
  return fetch(`${API}/ingest`, { method: 'POST', body }).then(json)
}

export function query(question, topK = 6) {
  return fetch(`${API}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, top_k: topK }),
  }).then(json)
}
