// Source navigation: opens when a citation is clicked and shows
//   1. the exact chunk that grounded the claim,
//   2. the original source, positioned at the cited spot —
//      PDF page / audio seeked to the cited second / full-size image,
//   3. on demand, everything indexed from that file (full transcript with
//      clickable timestamps, or every passage of a document).

import { useEffect, useRef, useState } from 'react'
import { fileUrl, fileChunks } from '../api.js'

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function locatorLabel(citation) {
  const { locator, modality } = citation
  if (locator.page != null) return `page ${locator.page}`
  if (locator.start_sec != null) return `${fmt(locator.start_sec)} – ${fmt(locator.end_sec)}`
  if (modality === 'image') return 'image'
  return 'whole file'
}

export default function CitationDrawer({ citation, onClose }) {
  const audioRef = useRef(null)
  const [chunks, setChunks] = useState(null) // null = not loaded yet

  // Seek the audio player to the cited moment whenever the citation changes.
  useEffect(() => {
    setChunks(null)
    if (audioRef.current && citation.locator.start_sec != null) {
      audioRef.current.currentTime = citation.locator.start_sec
    }
  }, [citation])

  const src = fileUrl(citation.file_id)
  const isAudio = citation.modality === 'audio'

  return (
    <aside className="drawer">
      <div className="drawer-head">
        <div>
          <div className="drawer-file">{citation.source_file}</div>
          <div className="drawer-meta">
            [{citation.n}] · {citation.modality} · {locatorLabel(citation)} ·
            relevance {citation.score.toFixed(2)}
          </div>
        </div>
        <button className="drawer-close" onClick={onClose} aria-label="close">✕</button>
      </div>

      <div className="drawer-body">
        <h3 className="drawer-label">Cited passage</h3>
        <blockquote className="cited-text">{citation.text}</blockquote>

        <h3 className="drawer-label">Original source</h3>
        {citation.modality === 'pdf' && (
          <iframe
            className="pdf-frame"
            title="source PDF"
            src={`${src}#page=${citation.locator.page ?? 1}`}
          />
        )}
        {citation.modality === 'image' && (
          <img className="image-frame" src={src} alt={citation.source_file} />
        )}
        {isAudio && (
          <audio
            ref={audioRef}
            className="audio-player"
            src={src}
            controls
            onLoadedMetadata={(e) => {
              if (citation.locator.start_sec != null)
                e.target.currentTime = citation.locator.start_sec
            }}
          />
        )}
        {(citation.modality === 'docx' || citation.modality === 'text') && (
          <a className="download-link" href={src} download>
            ⬇ download {citation.source_file}
          </a>
        )}

        {chunks === null ? (
          <button
            className="load-chunks"
            onClick={() => fileChunks(citation.file_id).then(setChunks)}
          >
            {isAudio ? 'Show full transcript' : 'Show all indexed passages'}
          </button>
        ) : (
          <>
            <h3 className="drawer-label">
              {isAudio ? 'Full transcript' : 'All indexed passages'}
            </h3>
            <ul className="chunk-list">
              {chunks.map((chunk, i) => (
                <li key={i}>
                  {chunk.locator.start_sec != null ? (
                    <button
                      className="chunk-loc seekable"
                      title="play from here"
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = chunk.locator.start_sec
                          audioRef.current.play()
                        }
                      }}
                    >
                      ▶ {fmt(chunk.locator.start_sec)}
                    </button>
                  ) : (
                    <span className="chunk-loc">
                      {chunk.locator.page != null ? `p. ${chunk.locator.page}` : '·'}
                    </span>
                  )}
                  <span className="chunk-text">{chunk.text}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </aside>
  )
}
