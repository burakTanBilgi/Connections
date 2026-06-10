import { useState } from 'react'
import * as Y from 'yjs'
import { useGraph } from '../graph/useGraph'
import { updateNode, removeNode } from '../graph/doc'
import { getTemplate } from '../graph/templates'

interface Props { doc: Y.Doc; nodeId: string; onClose: () => void }

export function NodePanel({ doc, nodeId, onClose }: Props) {
  const { nodes, meta } = useGraph(doc)
  const [showSecret, setShowSecret] = useState(false)
  const node = nodes[nodeId]
  if (!node) return null
  const template = getTemplate(meta.template)

  const set = (patch: Parameters<typeof updateNode>[2]) => updateNode(doc, nodeId, patch)

  return (
    <aside className="node-panel">
      <div className="node-panel-header">
        <strong>Node</strong>
        <button onClick={onClose} aria-label="Close panel">×</button>
      </div>

      <label>Label
        <input value={node.label} onChange={e => set({ label: e.target.value })} />
      </label>

      <label>Type
        <select
          value={node.type}
          onChange={e => {
            const t = template.nodeTypes.find(n => n.id === e.target.value)
            set({ type: e.target.value, color: t?.color ?? node.color })
          }}
        >
          {template.nodeTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </label>

      <label>Color
        <input type="color" value={node.color} onChange={e => set({ color: e.target.value })} />
      </label>

      <label>Notes
        <textarea value={node.notes} onChange={e => set({ notes: e.target.value })} rows={4} />
      </label>

      <div className="secret-row">
        <span>Secret</span>
        {showSecret ? (
          <>
            <input value={node.secret ?? ''} onChange={e => set({ secret: e.target.value })} />
            <button onClick={() => setShowSecret(false)}>Hide</button>
          </>
        ) : (
          <button onClick={() => setShowSecret(true)}>Show</button>
        )}
      </div>

      <button className="danger" onClick={() => { removeNode(doc, nodeId); onClose() }}>
        Delete node
      </button>
    </aside>
  )
}
