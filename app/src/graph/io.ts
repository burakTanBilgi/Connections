import * as Y from 'yjs'
import type { NodeData, EdgeData, GraphMeta } from '../types'
import { initGraphDoc, addNodeWithId, addEdgeWithId, getNodes, getEdges, getMeta, clearGraphContent } from './doc'
import { TEMPLATES } from './templates'

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

function validateImport(data: Partial<GraphExport>): asserts data is GraphExport {
  if (data.version !== 1) throw new Error(`Unsupported version: ${data.version}`)
  if (
    !data.meta || !data.nodes || !data.edges ||
    typeof data.nodes !== 'object' || typeof data.edges !== 'object' ||
    Array.isArray(data.nodes) || Array.isArray(data.edges)
  ) {
    throw new Error('Invalid graph file')
  }
  const { meta, nodes } = data
  if (typeof meta.title !== 'string') throw new Error('Invalid graph file: meta.title must be a string')
  if (meta.theme !== 'light' && meta.theme !== 'dark') throw new Error('Invalid graph file: meta.theme must be light or dark')
  const knownTemplateIds = TEMPLATES.map(t => t.id)
  if (!knownTemplateIds.includes(meta.template)) throw new Error(`Invalid graph file: unknown template '${meta.template}'`)
  for (const [id, n] of Object.entries(nodes)) {
    const node = n as NodeData
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
      throw new Error(`Invalid graph file: node '${id}' has non-finite coordinates`)
    }
  }
}

export function importGraph(doc: Y.Doc, json: string): void {
  const data = JSON.parse(json) as Partial<GraphExport>
  // Validate BEFORE mutating so a bad file never leaves the doc in a partial state.
  validateImport(data)
  // Replace semantics, atomically: clear existing content, then write the
  // imported graph in the same transaction (nested transacts fold into this one).
  doc.transact(() => {
    clearGraphContent(doc)
    initGraphDoc(doc, data.meta as GraphMeta)
    for (const [id, n] of Object.entries(data.nodes!)) addNodeWithId(doc, id, n)
    for (const [id, e] of Object.entries(data.edges!)) addEdgeWithId(doc, id, e)
  })
}
