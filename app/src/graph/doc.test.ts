import { describe, it, expect } from 'vitest'
import * as Y from 'yjs'
import {
  initGraphDoc, addNode, updateNode, removeNode,
  addEdge, updateEdge, removeEdge, getNodes, getEdges, getMeta, setMeta,
} from './doc'

function fresh() {
  const doc = new Y.Doc()
  initGraphDoc(doc, { title: 'test', template: 'friends', theme: 'light' })
  return doc
}

describe('graph doc', () => {
  it('initializes meta', () => {
    const doc = fresh()
    expect(getMeta(doc)).toEqual({ title: 'test', template: 'friends', theme: 'light' })
  })

  it('adds and reads a node', () => {
    const doc = fresh()
    const id = addNode(doc, { label: 'zoe', type: 'person', x: 10, y: 20, color: '#a5d8ff', notes: '' })
    const nodes = getNodes(doc)
    expect(nodes[id].label).toBe('zoe')
    expect(nodes[id].x).toBe(10)
  })

  it('updates a single field without clobbering others', () => {
    const doc = fresh()
    const id = addNode(doc, { label: 'zoe', type: 'person', x: 10, y: 20, color: '#a5d8ff', notes: '' })
    updateNode(doc, id, { x: 99 })
    expect(getNodes(doc)[id].label).toBe('zoe')
    expect(getNodes(doc)[id].x).toBe(99)
  })

  it('removing a node removes its edges too', () => {
    const doc = fresh()
    const a = addNode(doc, { label: 'a', type: 'person', x: 0, y: 0, color: '#fff', notes: '' })
    const b = addNode(doc, { label: 'b', type: 'person', x: 0, y: 0, color: '#fff', notes: '' })
    const e = addEdge(doc, { from: a, to: b, type: 'knows', label: '' })
    removeNode(doc, a)
    expect(getNodes(doc)[a]).toBeUndefined()
    expect(getEdges(doc)[e]).toBeUndefined()
  })

  it('edge CRUD works and setMeta merges', () => {
    const doc = fresh()
    const a = addNode(doc, { label: 'a', type: 'person', x: 0, y: 0, color: '#fff', notes: '' })
    const b = addNode(doc, { label: 'b', type: 'person', x: 0, y: 0, color: '#fff', notes: '' })
    const e = addEdge(doc, { from: a, to: b, type: 'knows', label: '' })
    updateEdge(doc, e, { label: 'best friends' })
    expect(getEdges(doc)[e].label).toBe('best friends')
    removeEdge(doc, e)
    expect(getEdges(doc)[e]).toBeUndefined()
    setMeta(doc, { theme: 'dark' })
    expect(getMeta(doc).title).toBe('test')
    expect(getMeta(doc).theme).toBe('dark')
  })

  it('two docs converge via update exchange (CRDT sanity)', () => {
    const d1 = fresh()
    const d2 = new Y.Doc()
    Y.applyUpdate(d2, Y.encodeStateAsUpdate(d1))
    addNode(d1, { label: 'from d1', type: 'person', x: 0, y: 0, color: '#fff', notes: '' })
    addNode(d2, { label: 'from d2', type: 'person', x: 0, y: 0, color: '#fff', notes: '' })
    Y.applyUpdate(d2, Y.encodeStateAsUpdate(d1))
    Y.applyUpdate(d1, Y.encodeStateAsUpdate(d2))
    expect(Object.keys(getNodes(d1)).length).toBe(2)
    expect(getNodes(d1)).toEqual(getNodes(d2))
  })

  it('concurrent edits to different fields of the same node both survive', () => {
    const d1 = fresh()
    const id = addNode(d1, { label: 'zoe', type: 'person', x: 10, y: 20, color: '#a5d8ff', notes: '' })
    const d2 = new Y.Doc()
    Y.applyUpdate(d2, Y.encodeStateAsUpdate(d1))

    updateNode(d1, id, { x: 999 })          // peer 1 moves the node
    updateNode(d2, id, { label: 'zoey' })   // peer 2 renames it concurrently

    Y.applyUpdate(d2, Y.encodeStateAsUpdate(d1))
    Y.applyUpdate(d1, Y.encodeStateAsUpdate(d2))

    for (const d of [d1, d2]) {
      expect(getNodes(d)[id].x).toBe(999)
      expect(getNodes(d)[id].label).toBe('zoey')
    }
  })
})
