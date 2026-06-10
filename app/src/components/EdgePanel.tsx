import * as Y from 'yjs'
import { useGraph } from '../graph/useGraph'
import { updateEdge, removeEdge } from '../graph/doc'
import { getTemplate } from '../graph/templates'

interface Props { doc: Y.Doc; edgeId: string; onClose: () => void }

export function EdgePanel({ doc, edgeId, onClose }: Props) {
  const { edges, nodes, meta } = useGraph(doc)
  const edge = edges[edgeId]
  if (!edge) return null
  const template = getTemplate(meta.template)
  const from = nodes[edge.from]?.label ?? '?'
  const to = nodes[edge.to]?.label ?? '?'

  return (
    <aside className="node-panel">
      <div className="node-panel-header">
        <strong>{from} → {to}</strong>
        <button onClick={onClose} aria-label="Close panel">×</button>
      </div>
      <label>Type
        <select value={edge.type} onChange={e => updateEdge(doc, edgeId, { type: e.target.value })}>
          {template.edgeTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>
      <label>Label
        <input value={edge.label} onChange={e => updateEdge(doc, edgeId, { label: e.target.value })} />
      </label>
      <button className="danger" onClick={() => { removeEdge(doc, edgeId); onClose() }}>
        Delete edge
      </button>
    </aside>
  )
}
