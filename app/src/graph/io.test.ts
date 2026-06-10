import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import { initGraphDoc, addNode, addEdge, getNodes, getEdges, getMeta } from './doc'
import { exportGraph, importGraph } from './io'

describe('graph io', () => {
  it('round-trips a graph through JSON', () => {
    const doc = new Y.Doc()
    initGraphDoc(doc, { title: 'web', template: 'friends', theme: 'light' })
    const a = addNode(doc, { label: 'a', type: 'person', x: 1, y: 2, color: '#fff', notes: 'hi', secret: 's3cret' })
    const b = addNode(doc, { label: 'b', type: 'person', x: 3, y: 4, color: '#fff', notes: '' })
    addEdge(doc, { from: a, to: b, type: 'knows', label: 'pals' })

    const json = exportGraph(doc)
    const doc2 = new Y.Doc()
    importGraph(doc2, json)

    expect(getMeta(doc2)).toEqual(getMeta(doc))
    expect(getNodes(doc2)).toEqual(getNodes(doc))
    expect(getEdges(doc2)).toEqual(getEdges(doc))
  })

  it('rejects malformed payloads', () => {
    const doc = new Y.Doc()
    expect(() => importGraph(doc, '{"not":"a graph"}')).toThrow(/invalid|version/i)
    expect(() => importGraph(doc, 'not json at all')).toThrow()
    expect(() => importGraph(doc, JSON.stringify({ version: 99, meta: {}, nodes: {}, edges: {} }))).toThrow(/version/i)
  })
})
