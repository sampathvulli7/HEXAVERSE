// The conversation: question box, message list, and answers whose [n]
// citation markers are rendered as clickable chips (the heart of citation
// transparency — every claim links to its source).

import { useRef, useState } from 'react'
import { query } from '../api.js'

// Split answer text on [n] markers and turn each into a chip that opens the
// citation drawer. "[1][3]" style runs are handled since each [n] matches.
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

export default function Chat({ onCite }) {
  const [messages, setMessages] = useState([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef(null)

  async function ask(e) {
    e.preventDefault()
    const q = question.trim()
    if (!q || busy) return
    setQuestion('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setBusy(true)
    try {
      const res = await query(q)
      setMessages((m) => [...m, { role: 'assistant', text: res.answer, citations: res.citations }])
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: `Error: ${err.message}`, citations: [] }])
    } finally {
      setBusy(false)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }

  return (
    <div className="chat">
      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <h1>Ask your files anything.</h1>
            <p>
              Upload reports, meeting notes, recorded calls or screenshots on
              the left — then ask in plain language. Answers cite their
              sources; click a citation to open the original.
            </p>
          </div>
        )}
        {messages.map((msg, i) =>
          msg.role === 'user' ? (
            <div key={i} className="msg user">{msg.text}</div>
          ) : (
            <div key={i} className="msg assistant">
              <AnswerText text={msg.text} citations={msg.citations} onCite={onCite} />
              <SourcesRow citations={msg.citations} onCite={onCite} />
            </div>
          ),
        )}
        {busy && <div className="msg assistant thinking">retrieving sources &amp; writing grounded answer…</div>}
        <div ref={bottomRef} />
      </div>

      <form className="ask-bar" onSubmit={ask}>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='e.g. "what is the latest status of the water program?"'
          disabled={busy}
        />
        <button type="submit" disabled={busy || !question.trim()}>Ask</button>
      </form>
    </div>
  )
}
