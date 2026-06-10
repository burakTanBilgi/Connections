import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as Y from 'yjs'
import { initGraphDoc, addNode } from '../graph/doc'
import { GraphCanvas } from './GraphCanvas'

// React Flow needs ResizeObserver; stub it for jsdom.
beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as never
})

describe('GraphCanvas', () => {
  it('renders nodes from the doc', () => {
    const doc = new Y.Doc()
    initGraphDoc(doc, { title: 't', template: 'friends', theme: 'light' })
    addNode(doc, { label: 'zoe', type: 'person', x: 100, y: 100, color: '#a5d8ff', notes: '' })
    render(<GraphCanvas doc={doc} onSelectNode={vi.fn()} selectedNodeId={null} matchIds={null} />)
    expect(screen.getByText('zoe')).toBeInTheDocument()
  })
})
