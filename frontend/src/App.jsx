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
import { health, listFiles } from './api.js'
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

  useEffect(() => {
    health().then(() => setBackendUp(true)).catch(() => setBackendUp(false))
    refreshFiles()
  }, [refreshFiles])

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">HEXA<span className="brand-accent">VERSE</span></span>
        <span className="tagline">multimodal retrieval · grounded answers · real citations</span>
        <span
          className={`health ${backendUp ? 'up' : backendUp === false ? 'down' : ''}`}
          title={backendUp ? 'backend connected' : 'backend unreachable — start it with: uv run uvicorn app.main:app'}
        >
          {backendUp ? 'backend: connected' : backendUp === false ? 'backend: offline' : 'backend: …'}
        </span>
      </header>

      <div className="columns">
        <aside className="sidebar">
          <UploadZone onIngested={refreshFiles} />
          <Library files={files} />
        </aside>

        <main className="chat-column">
          <Chat onCite={setActiveCitation} />
        </main>

        {activeCitation && (
          <CitationDrawer
            citation={activeCitation}
            onClose={() => setActiveCitation(null)}
          />
        )}
      </div>
    </div>
  )
}
