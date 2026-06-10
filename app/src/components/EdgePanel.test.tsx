import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as Y from 'yjs'
import { initGraphDoc, addNode, addEdge, getEdges } from '../graph/doc'
import { EdgePanel } from './EdgePanel'

function setup() {
  const doc = new Y.Doc()
  initGraphDoc(doc, { title: 't', template: 'accounts', theme: 'light' })
  const aId = addNode(doc, { label: 'gmail', type: 'email', x: 0, y: 0, color: '#b2f2bb', notes: '' })
  const bId = addNode(doc, { label: 'GitHub', type: 'account', x: 100, y: 0, color: '#a5d8ff', notes: '' })
  const eId = addEdge(doc, { from: aId, to: bId, type: 'uses', label: '' })
  return { doc, aId, bId, eId }
}

describe('EdgePanel', () => {
  it('offers the template edge types in the type select', () => {
    const { doc, eId } = setup()
    render(<EdgePanel doc={doc} edgeId={eId} onClose={vi.fn()} />)
    const select = screen.getByLabelText(/type/i) as HTMLSelectElement
    const values = Array.from(select.options).map(o => o.value)
    expect(values.sort()).toEqual(['recovers', 'uses'])
  })

  it('typing in Label updates the edge label in the doc', async () => {
    const { doc, eId } = setup()
    render(<EdgePanel doc={doc} edgeId={eId} onClose={vi.fn()} />)
    const input = screen.getByLabelText(/label/i)
    await userEvent.clear(input)
    await userEvent.type(input, 'main')
    expect(getEdges(doc)[eId].label).toBe('main')
  })

  it('Delete edge button removes the edge and calls onClose', async () => {
    const { doc, eId } = setup()
    const onClose = vi.fn()
    render(<EdgePanel doc={doc} edgeId={eId} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /delete edge/i }))
    expect(Object.keys(getEdges(doc))).toHaveLength(0)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
