import { useState } from 'react'
import { TEMPLATES } from '../graph/templates'

interface Props {
  onCreate: (title: string, templateId: string) => void
  onClose: () => void
}

export function TemplateModal({ onCreate, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [title, setTitle] = useState('')

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Pick a template" onClick={e => e.stopPropagation()}>
        <h2>Pick a template</h2>
        <div className="template-cards">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              className={`template-card ${selected === t.id ? 'selected' : ''}`}
              onClick={() => setSelected(t.id)}
            >
              <strong>{t.name}</strong>
              <p>{t.description}</p>
            </button>
          ))}
        </div>
        {selected && (
          <form onSubmit={e => { e.preventDefault(); if (title.trim()) onCreate(title.trim(), selected) }}>
            <label>Name
              <input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="My graph" />
            </label>
            <button type="submit" disabled={!title.trim()}>Create</button>
          </form>
        )}
      </div>
    </div>
  )
}
