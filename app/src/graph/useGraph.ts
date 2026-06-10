import { useSyncExternalStore, useCallback, useRef } from 'react'
import * as Y from 'yjs'
import type { NodeData, EdgeData, GraphMeta } from '../types'
import { getNodes, getEdges, getMeta } from './doc'

export interface GraphState {
  nodes: Record<string, NodeData>
  edges: Record<string, EdgeData>
  meta: GraphMeta
}

export function useGraph(doc: Y.Doc): GraphState {
  const cache = useRef<GraphState | null>(null)
  const version = useRef(0)
  const lastVersion = useRef(-1)

  const subscribe = useCallback((onChange: () => void) => {
    const handler = () => { version.current++; onChange() }
    doc.on('update', handler)
    return () => doc.off('update', handler)
  }, [doc])

  const getSnapshot = useCallback((): GraphState => {
    if (lastVersion.current !== version.current || cache.current === null) {
      cache.current = { nodes: getNodes(doc), edges: getEdges(doc), meta: getMeta(doc) }
      lastVersion.current = version.current
    }
    return cache.current
  }, [doc])

  return useSyncExternalStore(subscribe, getSnapshot)
}
