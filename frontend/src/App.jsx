// Top-level layout and state.
//
//  ┌ header: brand + backend health dot ─────────────────────────┐
//  ├ sidebar ──────────┬ chat ─────────────┬ citation drawer ────┤
//  │ UploadZone        │ messages,         │ opens when a [n]    │
//  │ Library (files)   │ citation chips,   │ chip is clicked;    │
//  │                   │ question box      │ shows the source    │
//  └───────────────────┴───────────────────┴─────────────────────┘
//
// State lives here and flows down as props; components stay presentational.

import { useCallback, useEffect, useState } from 'react'
import { health, listFiles, deleteFile } from './api.js'
import UploadZone from './components/UploadZone.jsx'
import Library from './components/Library.jsx'
import Chat from './components/Chat.jsx'
import CitationDrawer from './components/CitationDrawer.jsx'

export default function App() {
  const [backendUp, setBackendUp] = useState(null)
  const [files, setFiles] = useState([])
  const [activeCitation, setActiveCitation] = useState(null)

  const refreshFiles = useCallback(() => {
    listFiles().then(setFiles).catch(() => setFiles([]))
  }, [])

  const handleDeleteFile = useCallback(async (fileId) => {
    try {
      await deleteFile(fileId)
      refreshFiles()
    } catch (e) {
      console.error("Failed to delete file:", e)
    }
  }, [refreshFiles])

  useEffect(() => {
    health().then(() => setBackendUp(true)).catch(() => setBackendUp(false))
    refreshFiles()
  }, [refreshFiles])

  return (
    <div className="app">
      <nav className="top-nav">
        <div className="nav-brand">
          <span className="brand">HEXA<span className="brand-accent">VERSE</span></span>
          <span className="tagline">multimodal retrieval · grounded answers · real citations</span>
        </div>
        <div className="nav-links">
          <a href="#" className="nav-link active">Dashboard</a>
          <a href="#" className="nav-link">Library</a>
          <a href="#" className="nav-link">Insights</a>
          <a href="#" className="nav-link">Settings</a>
        </div>
        <div className="nav-status">
          <span
            className={`health ${backendUp ? 'up' : backendUp === false ? 'down' : ''}`}
            title={backendUp ? 'backend connected' : 'backend unreachable — start it with: uv run uvicorn app.main:app'}
          >
            {backendUp ? 'Connected' : backendUp === false ? 'Offline' : 'Connecting…'}
          </span>
        </div>
      </nav>

      <div className="columns">
        <aside className="sidebar">
          <UploadZone onIngested={refreshFiles} />
          <Library files={files} onDelete={handleDeleteFile} />
        </aside>

        <main className="chat-column">
          <Chat onCite={setActiveCitation} />
        </main>

        {activeCitation && (
          <CitationDrawer
            citation={activeCitation}
            files={files}
            onClose={() => setActiveCitation(null)}
          />
        )}
      </div>
    </div>
  )
}
