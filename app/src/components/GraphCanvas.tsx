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

interface Props {
  doc: Y.Doc
  selectedNodeId: string | null
  onSelectNode: (id: string | null) => void
  matchIds: Set<string> | null   // search results; null = not searching
}

export function GraphCanvas({ doc, selectedNodeId, onSelectNode, matchIds }: Props) {
  const { nodes, edges, meta } = useGraph(doc)

  const rfNodes: Node[] = useMemo(() =>
    Object.entries(nodes).map(([id, n]) => ({
      id,
      position: { x: n.x, y: n.y },
      data: { label: n.label },
      selected: id === selectedNodeId,
      style: {
        background: n.color,
        borderRadius: 16,
        border: id === selectedNodeId ? '2px solid #4a9eed' : '1px solid #00000022',
        padding: 8,
        opacity: matchIds && !matchIds.has(id) ? 0.25 : 1,
      },
    })), [nodes, selectedNodeId, matchIds])

  const rfEdges: Edge[] = useMemo(() =>
    Object.entries(edges).map(([id, e]) => ({
      id, source: e.from, target: e.to, label: e.label || undefined,
    })), [edges])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const c of changes) {
      if (c.type === 'position' && c.position && !Number.isNaN(c.position.x)) {
        updateNode(doc, c.id, { x: c.position.x, y: c.position.y })
      } else if (c.type === 'remove') {
        removeNode(doc, c.id)
      } else if (c.type === 'select') {
        onSelectNode(c.selected ? c.id : null)
      }
    }
  }, [doc, onSelectNode])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const c of changes) if (c.type === 'remove') removeEdge(doc, c.id)
  }, [doc])

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
        onPaneClick={() => onSelectNode(null)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
