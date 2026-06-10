import * as Y from 'yjs'
import type { NodeData, EdgeData, GraphMeta } from '../types'
import { initGraphDoc, addNodeWithId, addEdgeWithId, getNodes, getEdges, getMeta } from './doc'

export interface GraphExport {
  version: 1
  meta: GraphMeta
  nodes: Record<string, NodeData>
  edges: Record<string, EdgeData>
}

export function exportGraph(doc: Y.Doc): string {
  const payload: GraphExport = {
    version: 1,
    meta: getMeta(doc),
    nodes: getNodes(doc),
    edges: getEdges(doc),
  }
  return JSON.stringify(payload, null, 2)
}

export function importGraph(doc: Y.Doc, json: string): void {
  const data = JSON.parse(json) as Partial<GraphExport>
  if (data.version !== 1) throw new Error(`Unsupported version: ${data.version}`)
  if (!data.meta || typeof data.nodes !== 'object' || typeof data.edges !== 'object' || !data.nodes || !data.edges) {
    throw new Error('Invalid graph file')
  }
  initGraphDoc(doc, data.meta as GraphMeta)
  doc.transact(() => {
    for (const [id, n] of Object.entries(data.nodes!)) addNodeWithId(doc, id, n)
    for (const [id, e] of Object.entries(data.edges!)) addEdgeWithId(doc, id, e)
  })
}
