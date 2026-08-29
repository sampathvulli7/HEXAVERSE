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
import { health, listFiles, deleteFile, listProjects, createProject } from './api.js'
import UploadZone from './components/UploadZone.jsx'
import Library from './components/Library.jsx'
import Chat from './components/Chat.jsx'
import CitationDrawer from './components/CitationDrawer.jsx'

export default function App() {
  const [backendUp, setBackendUp] = useState(null)
  const [files, setFiles] = useState([])
  const [activeCitation, setActiveCitation] = useState(null)
  const [activeTab, setActiveTab] = useState('Dashboard')
  
  const [projects, setProjects] = useState(['Default'])
  const [activeProject, setActiveProject] = useState('Default')
  const [newProjectName, setNewProjectName] = useState('')

  const refreshProjects = useCallback(() => {
    listProjects().then(setProjects).catch(console.error)
  }, [])

  const refreshFiles = useCallback(() => {
    listFiles(activeProject).then(setFiles).catch(() => setFiles([]))
  }, [activeProject])

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
    refreshProjects()
  }, [refreshProjects])

  useEffect(() => {
    refreshFiles()
  }, [activeProject, refreshFiles])

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    await createProject(newProjectName.trim())
    setNewProjectName('')
    refreshProjects()
    setActiveProject(newProjectName.trim())
  }

  return (
    <div className="app">
      <nav className="top-nav">
        <div className="nav-brand">
          <span className="brand">HEXA<span className="brand-accent">VERSE</span></span>
          <span className="tagline">multimodal retrieval · grounded answers · real citations</span>
        </div>
        <div className="nav-links">
          {['Dashboard', 'Library', 'Insights', 'Settings'].map(tab => (
            <a 
              key={tab} 
              href="#" 
              className={`nav-link ${activeTab === tab ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); setActiveTab(tab); }}
            >
              {tab}
            </a>
          ))}
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

      {activeTab === 'Dashboard' && (
        <div className="columns">
          <aside className="sidebar">
            <div className="project-selector" style={{padding: '24px 24px 8px 24px'}}>
               <h3 style={{fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', opacity: 0.6}}>Active Project</h3>
               <select 
                 value={activeProject} 
                 onChange={e => setActiveProject(e.target.value)}
                 style={{width: '100%', padding: '10px', marginBottom: '12px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', cursor: 'pointer'}}
               >
                 {projects.map(p => <option key={p} value={p}>{p}</option>)}
               </select>
               <form onSubmit={handleCreateProject} style={{display: 'flex', gap: '8px'}}>
                 <input 
                   type="text" 
                   value={newProjectName} 
                   onChange={e => setNewProjectName(e.target.value)} 
                   placeholder="New Project..."
                   style={{flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', outline: 'none'}}
                 />
                 <button type="submit" style={{padding: '8px 12px', borderRadius: '6px', background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>+</button>
               </form>
            </div>
            <UploadZone onIngested={refreshFiles} project={activeProject} />
            <Library files={files} onDelete={handleDeleteFile} />
          </aside>
          <main className="chat-column">
            <Chat onCite={setActiveCitation} project={activeProject} />
          </main>
          {activeCitation && (
            <CitationDrawer
              citation={activeCitation}
              files={files}
              onClose={() => setActiveCitation(null)}
            />
          )}
        </div>
      )}

      {activeTab === 'Library' && (
        <div className="page-layout">
          <h1>Full Document Library</h1>
          <p className="muted">Manage all your ingested knowledge sources.</p>
          <div className="page-card library-card">
            <div className="project-selector" style={{padding: '0 0 16px 0', borderBottom: '1px solid var(--border)'}}>
               <h3 style={{fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', opacity: 0.6}}>Active Project</h3>
               <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                 <select 
                   value={activeProject} 
                   onChange={e => setActiveProject(e.target.value)}
                   style={{width: '250px', padding: '10px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', cursor: 'pointer'}}
                 >
                   {projects.map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
                 <form onSubmit={handleCreateProject} style={{display: 'flex', gap: '8px'}}>
                   <input 
                     type="text" 
                     value={newProjectName} 
                     onChange={e => setNewProjectName(e.target.value)} 
                     placeholder="New Project..."
                     style={{width: '200px', padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)', outline: 'none'}}
                   />
                   <button type="submit" style={{padding: '8px 12px', borderRadius: '6px', background: 'var(--accent)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold'}}>Create</button>
                 </form>
               </div>
            </div>
            <UploadZone onIngested={refreshFiles} project={activeProject} />
            <Library files={files} onDelete={handleDeleteFile} />
          </div>
        </div>
      )}

      {activeTab === 'Insights' && (
        <div className="page-layout">
          <h1>Insights & Analytics</h1>
          <div className="page-card">
            <h3>Usage Dashboard</h3>
            <p className="muted">Coming soon! Here you'll see graphs of your queries, top cited documents, and retrieval accuracy metrics.</p>
          </div>
        </div>
      )}

      {activeTab === 'Settings' && (
        <div className="page-layout">
          <h1>System Settings</h1>
          <div className="page-card">
            <h3>Configuration</h3>
            <p className="muted">Adjust your LLM models, vector chunk sizes, and API keys here.</p>
            <div style={{marginTop: "1rem", opacity: 0.5}}>
              <label style={{display: "block", marginBottom: "0.5rem"}}>LLM Base URL</label>
              <input type="text" disabled value="http://localhost:11434/v1" className="chat-input" style={{marginBottom: "1rem", padding: "0.5rem"}}/>
              <label style={{display: "block", marginBottom: "0.5rem"}}>Hugging Face Token</label>
              <input type="password" disabled value="****************" className="chat-input" style={{padding: "0.5rem"}}/>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
