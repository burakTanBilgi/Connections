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

  it('replaces existing content on import (no merge)', () => {
    const doc = new Y.Doc()
    initGraphDoc(doc, { title: 'old', template: 'blank', theme: 'light' })
    addNode(doc, { label: 'leftover', type: 'node', x: 0, y: 0, color: '#fff', notes: '' })

    const src = new Y.Doc()
    initGraphDoc(src, { title: 'new', template: 'friends', theme: 'dark' })
    const a = addNode(src, { label: 'only-me', type: 'person', x: 1, y: 1, color: '#fff', notes: '' })

    importGraph(doc, exportGraph(src))
    const nodes = getNodes(doc)
    expect(Object.keys(nodes)).toEqual([a])
    expect(nodes[a].label).toBe('only-me')
    expect(getMeta(doc).title).toBe('new')
  })

  it('rejects arrays for nodes/edges', () => {
    const doc = new Y.Doc()
    expect(() => importGraph(doc, JSON.stringify({ version: 1, meta: { title: 't', template: 'blank', theme: 'light' }, nodes: [], edges: {} }))).toThrow(/invalid/i)
  })
})
