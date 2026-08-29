// All backend communication lives here — components never call fetch() directly.
import type { IngestedFile, Message, Citation, FileType } from './mockData';

const API = import.meta.env.VITE_API_URL || '/api'

async function json(response: Response) {
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

export const listProjects = () => fetch(`${API}/projects`).then(json)
export const createProject = (name: string) => fetch(`${API}/projects`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name })
}).then(json)

export const listFiles = (project = "Default") => {
  const url = project ? `${API}/files?project=${encodeURIComponent(project)}` : `${API}/files`;
  return fetch(url).then(json)
}

export const deleteFile = (fileId: string) => fetch(`${API}/files/${fileId}`, { method: 'DELETE' }).then(json)
export const fileUrl = (fileId: string) => `${API}/files/${fileId}`
export const fileChunks = (fileId: string) => fetch(`${API}/files/${fileId}/chunks`).then(json)

export function ingest(file: File, project = "Default") {
  const body = new FormData()
  body.append('file', file)
  body.append('project', project)
  return fetch(`${API}/ingest`, { method: 'POST', body }).then(json)
}

export async function ingestFilesMock(files: File[], project = "Default"): Promise<IngestedFile[]> {
  const results: IngestedFile[] = [];
  for (const f of files) {
    const res = await ingest(f, project);
    results.push({
      id: res.id,
      name: res.name,
      type: res.type,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`
    });
  }
  return results;
}

export function query(question: string, topK = 6, project = "Default", modelChoice = "qwen2.5:3b") {
  return fetch(`${API}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, top_k: topK, project, model_choice: modelChoice }),
  }).then(json)
}

// ---- backend response -> UI Message adapter --------------------------------
// The backend's QueryResponse (see backend/app/models.py) uses
// answer/citations[{n, file_id, source_file, modality, locator, text}].
// This is the ONE place that shape is translated to the UI's Message format —
// used by text, image and audio query paths alike.

const fmtTime = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const MODALITY_TO_TYPE: Record<string, FileType> = {
  pdf: 'pdf', docx: 'docx', text: 'docx', image: 'png', audio: 'mp3',
};

const MODALITY_TO_TOPIC: Record<string, string> = {
  pdf: 'Document', docx: 'Document', text: 'Note',
  image: 'Image', audio: 'Audio segment',
};

export function adaptQueryResponse(res: any): Message {
  const stamp = Date.now();
  const citations: Citation[] = (res.citations || []).map((c: any) => ({
    id: `cit-${stamp}-${c.n}`,
    number: c.n,
    fileId: c.file_id,
    sourceFile: c.source_file,
    sourceType: MODALITY_TO_TYPE[c.modality] ?? 'pdf',
    topicName: MODALITY_TO_TOPIC[c.modality] ?? 'Reference',
    page: c.locator?.page != null ? `Page ${c.locator.page}` : undefined,
    // audio/video citations carry the cited span as a mm:ss–mm:ss timestamp
    timestamp:
      c.locator?.start_sec != null
        ? `${fmtTime(c.locator.start_sec)}–${fmtTime(c.locator.end_sec ?? c.locator.start_sec)}`
        : undefined,
    snippet: c.text,
  }));

  return {
    id: `m-${stamp}`,
    role: 'ai',
    content: res.answer ?? '',
    citations,
    followUps: res.followups ?? [],
  };
}

export async function queryMock(text: string, project = "Default", modelChoice = "qwen2.5:3b"): Promise<Message> {
  const res = await query(text, 6, project, modelChoice);
  return adaptQueryResponse(res);
}

// Type-ahead completions for the search box (debounce on the caller side).
export const suggest = (q: string, project = "Default"): Promise<string[]> =>
  fetch(`${API}/suggest?q=${encodeURIComponent(q)}&project=${encodeURIComponent(project)}`)
    .then(json)
    .then((r) => r.suggestions ?? [])

export function queryByImage(file: File, question = '', project = "Default", modelChoice = "qwen2.5:3b") {
  const body = new FormData()
  body.append('file', file)
  body.append('question', question)
  body.append('project', project)
  body.append('model_choice', modelChoice)
  return fetch(`${API}/query/image`, { method: 'POST', body }).then(json)
}

export function queryByAudio(audioBlob: Blob, project = "Default", modelChoice = "qwen2.5:3b") {
  const body = new FormData()
  body.append('file', audioBlob, 'voice_query.webm')
  body.append('project', project)
  body.append('model_choice', modelChoice)
  return fetch(`${API}/query/audio`, { method: 'POST', body }).then(json)
}

export function generateImage(prompt: string) {
  return fetch(`${API}/generate/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: prompt, top_k: 1 }),
  }).then(json)
}

export function synthesizeUrl(text: string) {
  return fetch(`${API}/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  }).then(res => {
    if (!res.ok) throw new Error("TTS failed")
    return res.blob()
  }).then(blob => URL.createObjectURL(blob))
}
