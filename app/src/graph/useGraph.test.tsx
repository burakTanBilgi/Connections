import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import * as Y from 'yjs'
import { initGraphDoc, addNode } from './doc'
import { useGraph } from './useGraph'

describe('useGraph', () => {
  it('reflects doc state and re-renders on changes', () => {
    const doc = new Y.Doc()
    initGraphDoc(doc, { title: 't', template: 'blank', theme: 'light' })
    const { result } = renderHook(() => useGraph(doc))
    expect(Object.keys(result.current.nodes)).toHaveLength(0)

    let id = ''
    act(() => {
      id = addNode(doc, { label: 'n1', type: 'node', x: 5, y: 6, color: '#abc', notes: '' })
    })
    expect(result.current.nodes[id].label).toBe('n1')
    expect(result.current.meta.title).toBe('t')
  })
})
