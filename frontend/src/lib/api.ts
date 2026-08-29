// All backend communication lives here — components never call fetch() directly.
import type { IngestedFile, Message, Citation } from './mockData';

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

export async function queryMock(text: string, project = "Default", modelChoice = "qwen2.5:3b"): Promise<Message> {
  const res = await query(text, 6, project, modelChoice);
  // Adapt real backend response to Karthik's Message format
  const citations: Citation[] = (res.citations || []).map((c: any, index: number) => ({
    id: c.id,
    number: index + 1,
    fileId: c.file_id,
    sourceFile: c.file_name,
    sourceType: c.file_type as any,
    topicName: "Reference", // Could extract from snippet or LLM if needed
    page: c.page ? `Page ${c.page}` : undefined,
    timestamp: c.timestamp,
    snippet: c.text_snippet
  }));

  return {
    id: `m-${Date.now()}`,
    role: 'ai',
    content: res.text,
    citations
  };
}

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
