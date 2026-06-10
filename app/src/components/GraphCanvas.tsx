import { useCallback, useMemo } from 'react'
import * as Y from 'yjs'
import {
  ReactFlow, Background, Controls, type Node, type Edge,
  type NodeChange, type EdgeChange, type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useGraph } from '../graph/useGraph'
import { updateNode, removeNode, removeEdge, addEdge as addDocEdge } from '../graph/doc'
import { getTemplate } from '../graph/templates'

export type Selection = { kind: 'node' | 'edge'; id: string } | null

interface Props {
  doc: Y.Doc
  selection: Selection
  onSelect: (sel: Selection) => void
  matchIds: Set<string> | null   // search results; null = not searching
}

// Last-wins ordering from React Flow can emit [{A,true},{B,false}] when switching
// selection; prefer the positive selection so switching works in one click.
export function pickSelection(
  changes: Array<{ type: string; id: string; selected?: boolean }>,
  kind: 'node' | 'edge'
): { kind: 'node' | 'edge'; id: string } | null | undefined {
  const selects = changes.filter(c => c.type === 'select')
  if (selects.length === 0) return undefined  // no selection change in this batch
  const positive = selects.find(c => c.selected)
  return positive ? { kind, id: positive.id } : null
}

export function GraphCanvas({ doc, selection, onSelect, matchIds }: Props) {
  const { nodes, edges, meta } = useGraph(doc)

  const rfNodes: Node[] = useMemo(() =>
    Object.entries(nodes).map(([id, n]) => ({
      id,
      position: { x: n.x, y: n.y },
      data: { label: n.label },
      selected: selection?.kind === 'node' && selection.id === id,
      style: {
        background: n.color,
        borderRadius: 16,
        border: selection?.kind === 'node' && selection.id === id ? '2px solid #4a9eed' : '1px solid #00000022',
        padding: 8,
        opacity: matchIds && !matchIds.has(id) ? 0.25 : 1,
      },
    })), [nodes, selection, matchIds])

  const rfEdges: Edge[] = useMemo(() =>
    Object.entries(edges).map(([id, e]) => ({
      id, source: e.from, target: e.to, label: e.label || undefined,
      selected: selection?.kind === 'edge' && selection.id === id,
    })), [edges, selection])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const c of changes) {
      if (c.type === 'position' && c.position && !Number.isNaN(c.position.x) && !Number.isNaN(c.position.y)) {
        updateNode(doc, c.id, { x: c.position.x, y: c.position.y })
      } else if (c.type === 'remove') {
        removeNode(doc, c.id)
      }
    }
    const sel = pickSelection(changes as Array<{ type: string; id: string; selected?: boolean }>, 'node')
    if (sel !== undefined) onSelect(sel)
  }, [doc, onSelect])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const c of changes) if (c.type === 'remove') removeEdge(doc, c.id)
    const sel = pickSelection(changes as Array<{ type: string; id: string; selected?: boolean }>, 'edge')
    if (sel !== undefined) onSelect(sel)
  }, [doc, onSelect])

  const onConnect = useCallback((conn: Connection) => {
    if (!conn.source || !conn.target) return
    const defaultEdgeType = getTemplate(meta.template).edgeTypes[0].id
    addDocEdge(doc, { from: conn.source, to: conn.target, type: defaultEdgeType, label: '' })
  }, [doc, meta.template])

  return (
    <div style={{ width: '100%', height: '100%' }} data-testid="graph-canvas">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onPaneClick={() => onSelect(null)}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
