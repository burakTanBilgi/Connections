import { useState } from 'react'
import { listGraphs, createGraph } from '../graph/registry'
import { TemplateModal } from './TemplateModal'

interface Props { onOpenGraph: (id: string) => void }

export function HomePage({ onOpenGraph }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [graphs, setGraphs] = useState(listGraphs())

  const handleCreate = (title: string, templateId: string) => {
    const entry = createGraph(title, templateId)
    setGraphs(listGraphs())
    setModalOpen(false)
    onOpenGraph(entry.id)
  }

  return (
    <main className="home">
      <h1>Connections</h1>
      <ul className="graph-list">
        {graphs.map(g => (
          <li key={g.id}>
            <button className="graph-row" onClick={() => onOpenGraph(g.id)}>
              <span>{g.title}</span>
              <small>{g.template}</small>
            </button>
          </li>
        ))}
      </ul>
      <button className="new-graph" onClick={() => setModalOpen(true)}>+ New graph</button>
      {modalOpen && <TemplateModal onCreate={handleCreate} onClose={() => setModalOpen(false)} />}
    </main>
  )
}
