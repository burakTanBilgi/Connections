import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'

export interface OpenGraph {
  doc: Y.Doc
  ready: Promise<void>
  close: () => Promise<void>
}

// One IndexedDB database per graph: "connections-<graphId>"
export function openGraphDoc(graphId: string): OpenGraph {
  const doc = new Y.Doc()
  const persistence = new IndexeddbPersistence(`connections-${graphId}`, doc)
  const ready = new Promise<void>(resolve => persistence.once('synced', () => resolve()))
  const close = async () => {
    await ready
    await persistence.destroy() // stops the binding; does NOT clear stored data
    doc.destroy()
  }
  return { doc, ready, close }
}
