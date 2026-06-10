import * as Y from 'yjs'
import type { NodeData, EdgeData, GraphMeta } from '../types'

// Layout: doc.getMap('nodes') : id -> Y.Map(node fields)
//         doc.getMap('edges') : id -> Y.Map(edge fields)
//         doc.getMap('meta')  : title/template/theme
// Per-field Y.Maps so concurrent edits to different fields merge cleanly.

const newId = () => crypto.randomUUID()

function toYMap(obj: Record<string, unknown>): Y.Map<unknown> {
  const m = new Y.Map()
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) m.set(k, v)
  return m
}

export function initGraphDoc(doc: Y.Doc, meta: GraphMeta): void {
  doc.transact(() => {
    const m = doc.getMap('meta')
    for (const [k, v] of Object.entries(meta)) m.set(k, v)
  })
}

export function addNode(doc: Y.Doc, node: NodeData): string {
  const id = newId()
  doc.transact(() => doc.getMap('nodes').set(id, toYMap({ ...node })))
  return id
}

export function updateNode(doc: Y.Doc, id: string, patch: Partial<NodeData>): void {
  doc.transact(() => {
    const n = doc.getMap('nodes').get(id) as Y.Map<unknown> | undefined
    if (!n) return
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) n.set(k, v)
  })
}

export function removeNode(doc: Y.Doc, id: string): void {
  doc.transact(() => {
    doc.getMap('nodes').delete(id)
    const edges = doc.getMap('edges')
    const toDelete: string[] = []
    for (const [eid, e] of edges.entries()) {
      const em = e as Y.Map<unknown>
      if (em.get('from') === id || em.get('to') === id) toDelete.push(eid)
    }
    for (const eid of toDelete) edges.delete(eid)
  })
}

export function addEdge(doc: Y.Doc, edge: EdgeData): string {
  const id = newId()
  doc.transact(() => doc.getMap('edges').set(id, toYMap({ ...edge })))
  return id
}

export function updateEdge(doc: Y.Doc, id: string, patch: Partial<EdgeData>): void {
  doc.transact(() => {
    const e = doc.getMap('edges').get(id) as Y.Map<unknown> | undefined
    if (!e) return
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) e.set(k, v)
  })
}

export function removeEdge(doc: Y.Doc, id: string): void {
  doc.transact(() => doc.getMap('edges').delete(id))
}

export function getNodes(doc: Y.Doc): Record<string, NodeData> {
  return doc.getMap('nodes').toJSON() as Record<string, NodeData>
}

export function getEdges(doc: Y.Doc): Record<string, EdgeData> {
  return doc.getMap('edges').toJSON() as Record<string, EdgeData>
}

export function getMeta(doc: Y.Doc): GraphMeta {
  return doc.getMap('meta').toJSON() as GraphMeta
}

export function setMeta(doc: Y.Doc, patch: Partial<GraphMeta>): void {
  doc.transact(() => {
    const m = doc.getMap('meta')
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) m.set(k, v)
  })
}

export function addNodeWithId(doc: Y.Doc, id: string, node: NodeData): void {
  doc.transact(() => doc.getMap('nodes').set(id, toYMap({ ...node })))
}

export function addEdgeWithId(doc: Y.Doc, id: string, edge: EdgeData): void {
  doc.transact(() => doc.getMap('edges').set(id, toYMap({ ...edge })))
}

export function clearGraphContent(doc: Y.Doc): void {
  doc.transact(() => {
    const nodes = doc.getMap('nodes')
    const edges = doc.getMap('edges')
    for (const k of [...nodes.keys()]) nodes.delete(k)
    for (const k of [...edges.keys()]) edges.delete(k)
  })
}
