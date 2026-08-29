import { useRef, useState } from 'react'
import { query, queryByImage, queryByAudio, generateImage, synthesizeUrl, fileUrl } from '../api.js'

function AnswerText({ text, citations, onCite }) {
  const parts = text.split(/(\[\d+\])/g)
  return (
    <p className="answer-text">
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/)
        if (!m) return <span key={i}>{part}</span>
        const cite = citations.find((c) => c.n === Number(m[1]))
        if (!cite) return <span key={i}>{part}</span>
        return (
          <button key={i} className="cite-chip" onClick={() => onCite(cite)}>
            {cite.n}
          </button>
        )
      })}
    </p>
  )
}

function SourcesRow({ citations, onCite }) {
  if (!citations.length) return null
  return (
    <div className="sources-row">
      {citations.map((c) => (
        <button key={c.n} className="source-card" onClick={() => onCite(c)}>
          {c.modality === 'image' && (
            <img className="source-thumb" src={fileUrl(c.file_id)} alt="" />
          )}
          <span className="source-n">[{c.n}]</span>
          <span className="source-file">{c.source_file}</span>
          <span className="source-loc">
            {c.locator.page != null && `p. ${c.locator.page}`}
            {c.locator.start_sec != null &&
              `${fmt(c.locator.start_sec)}–${fmt(c.locator.end_sec)}`}
            {c.modality === 'image' && 'image'}
          </span>
        </button>
      ))}
    </div>
  )
}

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function AssistantMessage({ msg, onCite }) {
  const [playing, setPlaying] = useState(false)

  async function playTTS() {
    try {
      setPlaying(true)
      const url = await synthesizeUrl(msg.text)
      const audio = new Audio(url)
      audio.onended = () => setPlaying(false)
      audio.play()
    } catch (err) {
      console.error(err)
      setPlaying(false)
    }
  }

  return (
    <div className="msg assistant">
      {msg.image_url ? (
        <img src={msg.image_url} alt="Generated" className="generated-image" style={{maxWidth: '100%', borderRadius: '14px'}} />
      ) : (
        <>
          <div className="answer-header" style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '-20px'}}>
             <button className="tts-btn" onClick={playTTS} disabled={playing} title="Read aloud">
               {playing ? '🔊' : '🔈'}
             </button>
          </div>
          <AnswerText text={msg.text} citations={msg.citations || []} onCite={onCite} />
          <SourcesRow citations={msg.citations || []} onCite={onCite} />
        </>
      )}
    </div>
  )
}


export default function Chat({ onCite }) {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [recording, setRecording] = useState(false)
  const bottomRef = useRef(null)
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  async function run(label, request) {
    setMessages((m) => [...m, { role: 'user', text: label }])
    setBusy(true)
    try {
      const res = await request()
      if (res.transcribed_question) {
         setMessages((m) => {
            const newM = [...m]
            newM[newM.length - 1].text = `🎙️ ${res.transcribed_question}`
            return newM
         })
      }
      
      if (res.image_url) {
        setMessages((m) => [...m, { role: 'assistant', image_url: res.image_url }])
      } else {
        setMessages((m) => [...m, { role: 'assistant', text: res.answer, citations: res.citations }])
      }
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: `Error: ${err.message}`, citations: [] }])
    } finally {
      setBusy(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  function ask(e) {
    e?.preventDefault()
    const q = question.trim()
    if (!q || busy) return
    setQuestion('')
    
    if (q.startsWith('/imagine ')) {
        const prompt = q.replace('/imagine ', '').trim()
        run(`🎨 /imagine ${prompt}`, () => generateImage(prompt))
    } else {
        run(q, () => query(q))
    }
  }

  function askWithImage(file) {
    if (!file || busy) return
    const q = question.trim()
    setQuestion('')
    run(q ? `[Image: ${file.name}] — ${q}` : `[Image: ${file.name}]`, () => queryByImage(file, q))
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data)
        }

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          run('🎙️ (Listening...)', () => queryByAudio(audioBlob))
          stream.getTracks().forEach(track => track.stop())
        }

        mediaRecorder.start()
        setRecording(true)
      } catch (err) {
        console.error("Microphone access denied", err)
      }
    }
  }

  const imageInputRef = useRef(null)

  return (
    <div className={`chat ${messages.length === 0 ? 'hero-mode' : 'chat-mode'}`}>
      <div className="messages">
        {messages.length === 0 && (
          <div className="hero-titles">
            <h1>Ask your files anything.</h1>
            <p>
              Upload reports, meeting notes, recorded calls or screenshots on
              the left — then ask in plain language. Use <b>/imagine [prompt]</b> to generate images.
            </p>
          </div>
        )}
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="msg user">{msg.text}</div>
          ) : (
            <AssistantMessage key={i} msg={msg} onCite={onCite} />
          ),
        )}
        {busy && <div className="msg assistant thinking">retrieving sources &amp; writing grounded answer…</div>}
        <div ref={bottomRef} />
      </div>

      <div className="search-container">
        <form className="ask-bar" onSubmit={ask}>
          <button
            type="button"
            className="image-query-btn"
            title="Search by image — finds similar images and related documents/audio"
            disabled={busy}
            onClick={() => imageInputRef.current.click()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
          
          <input
            ref={imageInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            hidden
            onChange={(e) => {
              askWithImage(e.target.files[0])
              e.target.value = ''
            }}
          />
          <input
            className="main-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={recording ? 'Listening...' : 'Ask anything, or try /imagine a dog in space...'}
            disabled={busy || recording}
            autoFocus
          />
          <button
            type="button"
            className={`mic-btn ${recording ? 'recording' : ''}`}
            onClick={toggleRecording}
            disabled={busy}
            title="Voice query"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={recording ? "#ef4444" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          </button>
          <button type="submit" disabled={busy || recording || (!question.trim() && !recording)}>Ask</button>
        </form>
        {messages.length === 0 && (
          <div className="hero-actions">
            <span className="hero-chip" onClick={() => setQuestion("Summarize the most recent uploads")}>Summarize recent uploads</span>
            <span className="hero-chip" onClick={() => setQuestion("/imagine A highly detailed cyberpunk city")}>Generate Image</span>
            <span className="hero-chip" onClick={() => setQuestion("Extract key action items")}>Extract action items</span>
          </div>
        )}
      </div>
    </div>
  )
}
