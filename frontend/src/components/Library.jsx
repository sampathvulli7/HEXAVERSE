// The list of everything ingested, newest first, with modality badges.

const MODALITY_ICON = { pdf: '📄', docx: '📝', text: '🗒', image: '🖼', audio: '🎙' }

export default function Library({ files }) {
  return (
    <section className="library">
      <h2 className="section-title">Library · {files.length}</h2>
      {files.length === 0 ? (
        <p className="muted">Nothing ingested yet.</p>
      ) : (
        <ul className="file-list">
          {files.map((f) => (
            <li key={f.file_id} title={f.filename}>
              <span className="file-icon">{MODALITY_ICON[f.modality] ?? '📎'}</span>
              <span className="file-name">{f.filename}</span>
              <span className="file-modality">{f.modality}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
