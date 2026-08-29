// Drag-and-drop / click-to-browse upload. Each file is POSTed to /ingest
// and its outcome shown (indexed + chunk count, stored, or failed).

import { useRef, useState } from 'react'
import { ingest } from '../api.js'

export default function UploadZone({ onIngested, project = "Default" }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [results, setResults] = useState([])

  async function handleFiles(fileList) {
    for (const file of fileList) {
      setResults((r) => [{ name: file.name, status: 'uploading…' }, ...r])
      try {
        const res = await ingest(file, project)
        setResults((r) => [
          {
            name: file.name,
            status:
              res.status === 'indexed'
                ? `indexed · ${res.chunks_indexed} chunk${res.chunks_indexed === 1 ? '' : 's'}`
                : `${res.status}${res.detail ? ` · ${res.detail}` : ''}`,
            ok: res.status === 'indexed',
          },
          ...r.filter((x) => x.name !== file.name),
        ])
      } catch (err) {
        setResults((r) => [
          { name: file.name, status: `failed · ${err.message}`, ok: false },
          ...r.filter((x) => x.name !== file.name),
        ])
      }
      onIngested()
    }
  }

  return (
    <section>
      <h2 className="section-title">Add files</h2>
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onClick={() => inputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
      >
        drop PDF · DOCX · audio · images here
        <span className="dropzone-hint">or click to browse</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.ogg"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {results.length > 0 && (
        <ul className="upload-results">
          {results.slice(0, 5).map((r) => (
            <li key={r.name} className={r.ok === false ? 'bad' : r.ok ? 'good' : ''}>
              <span className="upload-name">{r.name}</span>
              <span className="upload-status">{r.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
